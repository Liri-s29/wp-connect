import { NextResponse } from 'next/server'
import { scraperService } from '@/lib/scraper-service'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await scraperService.startScraper('MANUAL')

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ runId: result.runId, message: 'Scraper started' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start scraper' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const stopped = scraperService.stopScraper()
    return NextResponse.json({ stopped })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop scraper' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    isRunning: scraperService.isRunning(),
    currentRunId: scraperService.getCurrentRunId(),
    currentStep: scraperService.getCurrentStep(),
  })
}
