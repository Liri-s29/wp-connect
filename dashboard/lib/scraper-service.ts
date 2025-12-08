import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { prisma } from './prisma'
import * as cron from 'node-cron'

type ScraperStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'AUTH_REQUIRED' | 'ENRICHING' | 'PROCESSING' | 'ENRICHMENT_FAILED' | 'PROCESSING_FAILED'
type TriggerType = 'MANUAL' | 'SCHEDULED'
type PipelineStep = 'IDLE' | 'SCRAPING' | 'ENRICHING' | 'PROCESSING'

interface ScraperOutput {
  type: 'stdout' | 'stderr' | 'status' | 'complete'
  data: string
  timestamp: Date
}

type OutputCallback = (output: ScraperOutput) => void

class ScraperService {
  private currentRunId: number | null = null
  private outputBuffer: string[] = []
  private listeners: Set<OutputCallback> = new Set()
  private scheduledTask: cron.ScheduledTask | null = null
  private pipelineStep: PipelineStep = 'IDLE'
  private abortRequested: boolean = false

  isRunning(): boolean {
    return this.pipelineStep !== 'IDLE'
  }

  getCurrentStep(): PipelineStep {
    return this.pipelineStep
  }

  getCurrentRunId(): number | null {
    return this.currentRunId
  }

  subscribe(callback: OutputCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private broadcast(output: ScraperOutput) {
    this.listeners.forEach((cb) => cb(output))
  }

  /**
   * Runs a command and streams output to listeners
   * Returns a promise that resolves with exit code and output
   */
  private runCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<{ code: number; output: string }> {
    return new Promise((resolve) => {
      const commandOutput: string[] = []

      const childProcess = spawn(command, args, {
        cwd,
        shell: true,
        env: { ...process.env },
      })

      childProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        commandOutput.push(text)
        this.outputBuffer.push(text)
        this.broadcast({
          type: 'stdout',
          data: text,
          timestamp: new Date(),
        })
      })

      childProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString()
        commandOutput.push(`[ERROR] ${text}`)
        this.outputBuffer.push(`[ERROR] ${text}`)
        this.broadcast({
          type: 'stderr',
          data: text,
          timestamp: new Date(),
        })
      })

      childProcess.on('close', (code) => {
        resolve({ code: code ?? 1, output: commandOutput.join('') })
      })

      childProcess.on('error', (error) => {
        this.broadcast({
          type: 'stderr',
          data: `Process error: ${error.message}`,
          timestamp: new Date(),
        })
        resolve({ code: 1, output: commandOutput.join('') })
      })
    })
  }

  async startScraper(triggerType: TriggerType): Promise<{ runId: number; error?: string }> {
    if (this.isRunning()) {
      return { runId: -1, error: `Pipeline is already running (step: ${this.pipelineStep})` }
    }

    // Create a new run record
    const run = await prisma.scraperRun.create({
      data: {
        status: 'RUNNING',
        triggerType,
      },
    })

    this.currentRunId = run.id
    this.outputBuffer = []
    this.abortRequested = false

    const scraperPath = path.resolve(process.cwd(), '../gpt')

    // Start the full pipeline asynchronously
    this.runFullPipeline(run.id, scraperPath)

    return { runId: run.id }
  }

  /**
   * Runs the full pipeline: Scrape → Enrich → Process
   */
  private async runFullPipeline(runId: number, scraperPath: string): Promise<void> {
    let finalStatus: ScraperStatus = 'COMPLETED'
    let errorMessage: string | null = null

    try {
      // ===== STEP 1: SCRAPING =====
      this.pipelineStep = 'SCRAPING'
      this.broadcast({
        type: 'status',
        data: `\n${'='.repeat(50)}\n[STEP 1/3] Starting scraper (Run #${runId})...\n${'='.repeat(50)}\n`,
        timestamp: new Date(),
      })

      const scrapeResult = await this.runCommand('npm', ['start'], scraperPath)

      // Check if auth was required
      if (scrapeResult.output.includes('scan QR code') || scrapeResult.output.includes('QR code')) {
        finalStatus = 'AUTH_REQUIRED'
        errorMessage = 'WhatsApp authentication required'
        return
      }

      if (scrapeResult.code !== 0) {
        finalStatus = 'FAILED'
        errorMessage = `Scraping failed with exit code ${scrapeResult.code}`
        return
      }

      if (this.abortRequested) {
        finalStatus = 'FAILED'
        errorMessage = 'Pipeline aborted by user'
        return
      }

      // ===== STEP 2: ENRICHMENT =====
      this.pipelineStep = 'ENRICHING'
      this.broadcast({
        type: 'status',
        data: `\n${'='.repeat(50)}\n[STEP 2/3] Starting LLM enrichment...\n${'='.repeat(50)}\n`,
        timestamp: new Date(),
      })

      await prisma.scraperRun.update({
        where: { id: runId },
        data: { status: 'ENRICHING' },
      })

      const enrichResult = await this.runCommand('npm', ['run', 'enrich'], scraperPath)

      if (enrichResult.code !== 0) {
        finalStatus = 'ENRICHMENT_FAILED'
        errorMessage = `Enrichment failed with exit code ${enrichResult.code}`
        return
      }

      if (this.abortRequested) {
        finalStatus = 'FAILED'
        errorMessage = 'Pipeline aborted by user'
        return
      }

      // ===== STEP 3: DATABASE PROCESSING =====
      this.pipelineStep = 'PROCESSING'
      this.broadcast({
        type: 'status',
        data: `\n${'='.repeat(50)}\n[STEP 3/3] Updating database...\n${'='.repeat(50)}\n`,
        timestamp: new Date(),
      })

      await prisma.scraperRun.update({
        where: { id: runId },
        data: { status: 'PROCESSING' },
      })

      const processResult = await this.runCommand('npm', ['run', 'processor'], scraperPath)

      if (processResult.code !== 0) {
        finalStatus = 'PROCESSING_FAILED'
        errorMessage = `Database processing failed with exit code ${processResult.code}`
        return
      }

      // All steps completed successfully
      finalStatus = 'COMPLETED'
    } catch (error) {
      finalStatus = 'FAILED'
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
    } finally {
      // Parse stats from full output
      const fullOutput = this.outputBuffer.join('')
      const sellersMatch = fullOutput.match(/(\d+) seller\(s\)/)
      const productsMatch = fullOutput.match(/Saved (\d+) products/)

      await prisma.scraperRun.update({
        where: { id: runId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          output: fullOutput,
          errorMessage,
          sellersProcessed: sellersMatch ? parseInt(sellersMatch[1]) : 0,
          productsScraped: productsMatch ? parseInt(productsMatch[1]) : 0,
        },
      })

      this.broadcast({
        type: 'status',
        data: `\n${'='.repeat(50)}\nPipeline finished with status: ${finalStatus}\n${'='.repeat(50)}\n`,
        timestamp: new Date(),
      })

      this.broadcast({
        type: 'complete',
        data: finalStatus,
        timestamp: new Date(),
      })

      // Reset state
      this.pipelineStep = 'IDLE'
      this.currentRunId = null
      this.abortRequested = false
    }
  }

  stopScraper(): boolean {
    if (this.isRunning()) {
      this.abortRequested = true
      this.broadcast({
        type: 'status',
        data: '\n⚠️ Abort requested. Pipeline will stop after current step completes.\n',
        timestamp: new Date(),
      })
      return true
    }
    return false
  }

  async initScheduler() {
    try {
      // Get or create scheduler config
      let config = await prisma.schedulerConfig.findUnique({ where: { id: 1 } })

      if (!config) {
        config = await prisma.schedulerConfig.create({
          data: {
            id: 1,
            enabled: false,
            cronExpr: '0 9,21 * * *', // 9am and 9pm
          },
        })
      }

      if (config.enabled && cron.validate(config.cronExpr)) {
        this.startScheduler(config.cronExpr)
      }
    } catch (error) {
      // Database might not be initialized yet (during build or first run)
      console.log('Scheduler init skipped - database not ready:', (error as Error).message)
    }
  }

  startScheduler(cronExpr: string) {
    if (this.scheduledTask) {
      this.scheduledTask.stop()
    }

    if (!cron.validate(cronExpr)) {
      console.error('Invalid cron expression:', cronExpr)
      return
    }

    this.scheduledTask = cron.schedule(cronExpr, async () => {
      console.log('Scheduled scraper run starting...')
      await this.startScraper('SCHEDULED')
    })

    console.log(`Scheduler started with cron: ${cronExpr}`)
  }

  stopScheduler() {
    if (this.scheduledTask) {
      this.scheduledTask.stop()
      this.scheduledTask = null
    }
  }

  async updateSchedulerConfig(enabled: boolean, cronExpr: string) {
    await prisma.schedulerConfig.upsert({
      where: { id: 1 },
      update: { enabled, cronExpr },
      create: { id: 1, enabled, cronExpr },
    })

    if (enabled && cron.validate(cronExpr)) {
      this.startScheduler(cronExpr)
    } else {
      this.stopScheduler()
    }
  }

  async getSchedulerConfig() {
    try {
      const config = await prisma.schedulerConfig.findUnique({ where: { id: 1 } })
      return config || { id: 1, enabled: false, cronExpr: '0 9,21 * * *' }
    } catch {
      // Database might not be initialized yet
      return { id: 1, enabled: false, cronExpr: '0 9,21 * * *' }
    }
  }
}

// Singleton instance
export const scraperService = new ScraperService()

// Initialize scheduler on module load (server-side only)
if (typeof window === 'undefined') {
  scraperService.initScheduler().catch(console.error)
}
