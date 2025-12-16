'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Square, Trash2, RefreshCw, QrCode } from 'lucide-react'

interface ScraperOutput {
  type: 'stdout' | 'stderr' | 'status' | 'complete' | 'connected'
  data: string
  timestamp: Date
}

export default function AuthPage() {
  const [logs, setLogs] = useState<ScraperOutput[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [scraperStatus, setScraperStatus] = useState({ isRunning: false, currentRunId: null })
  const logsEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper/start')
      if (res.ok) {
        const status = await res.json()
        setScraperStatus(status)
      }
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }, [])

  const connectToStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/scraper/stream')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ScraperOutput
        setLogs((prev) => [...prev, { ...data, timestamp: new Date(data.timestamp) }])

        if (data.type === 'complete') {
          fetchStatus()
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      setTimeout(connectToStream, 3000)
    }
  }, [fetchStatus])

  useEffect(() => {
    connectToStream()
    fetchStatus()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [connectToStream, fetchStatus])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleStartScraper = async () => {
    try {
      const res = await fetch('/api/scraper/start', { method: 'POST' })
      if (res.ok) {
        fetchStatus()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch {
      alert('Failed to start scraper')
    }
  }

  const handleStopScraper = async () => {
    try {
      const res = await fetch('/api/scraper/start', { method: 'DELETE' })
      if (res.ok) {
        fetchStatus()
      }
    } catch {
      alert('Failed to stop scraper')
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  const getLogColor = (type: ScraperOutput['type']) => {
    switch (type) {
      case 'stderr':
        return 'text-red-400'
      case 'status':
        return 'text-blue-400'
      case 'complete':
        return 'text-green-400'
      case 'connected':
        return 'text-gray-400'
      default:
        return 'text-gray-200'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Extract QR code from logs
  const qrCodeData = useMemo(() => {
    const qrChars = ['▄', '█', '▀', '▌', '▐', '░', '▓', '▒', '■', '□']
    const allText = logs.map((l) => l.data).join('\n')
    const lines = allText.split('\n')

    // Find consecutive lines that look like QR code
    const qrLines: string[] = []
    let inQrBlock = false

    for (const line of lines) {
      const hasQrChars = qrChars.some((char) => line.includes(char))
      // QR codes typically have dense block characters
      const blockCharCount = (line.match(/[▄█▀▌▐░▓▒■□]/g) || []).length

      if (hasQrChars && blockCharCount > 10) {
        inQrBlock = true
        qrLines.push(line)
      } else if (inQrBlock && line.trim() === '') {
        // Allow one empty line within QR block
        if (qrLines.length > 0 && qrLines[qrLines.length - 1].trim() !== '') {
          qrLines.push(line)
        }
      } else if (inQrBlock && !hasQrChars) {
        // End of QR block
        break
      }
    }

    // Clean up trailing empty lines
    while (qrLines.length > 0 && qrLines[qrLines.length - 1].trim() === '') {
      qrLines.pop()
    }

    return qrLines.length > 5 ? qrLines.join('\n') : null
  }, [logs])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Authentication</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Start the scraper to authenticate with WhatsApp. Scan the QR code when prompted.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            ></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        {scraperStatus.isRunning ? (
          <>
            <span className="text-sm text-blue-600">
              Scraper running (Run #{scraperStatus.currentRunId})
            </span>
            <Button
              variant="destructive"
              onClick={handleStopScraper}
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </>
        ) : (
          <Button onClick={handleStartScraper} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Scraper
          </Button>
        )}

        <Button variant="outline" onClick={handleClearLogs} className="flex items-center gap-2">
          <Trash2 className="h-4 w-4" />
          Clear Logs
        </Button>

        <Button variant="outline" onClick={fetchStatus} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* QR Code Display */}
      {qrCodeData && (
        <div className="mb-4 p-6 bg-white border-2 border-green-500 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-700">Scan this QR Code with WhatsApp</span>
          </div>
          <div className="flex justify-center">
            <pre
              className="font-mono text-black leading-none"
              style={{
                fontSize: '8px',
                lineHeight: '8px',
                letterSpacing: '0px',
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
              }}
            >
              {qrCodeData}
            </pre>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
          </p>
        </div>
      )}

      {/* Terminal */}
      <div className="bg-gray-900 rounded-lg overflow-hidden flex flex-col flex-1 min-h-[300px]">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-gray-400 text-sm font-mono">scraper-output</span>
          <span className="text-gray-500 text-xs">{logs.length} lines</span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
          {logs.length === 0 ? (
            <div className="text-gray-500">
              No output yet. Start the scraper to see live logs here.
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 whitespace-pre-wrap">
                <span className="text-gray-500">[{formatTimestamp(log.timestamp)}]</span>{' '}
                <span className={getLogColor(log.type)}>
                  {log.data.split('\n').map((line, lineIndex) => (
                    <span key={lineIndex}>
                      {line}
                      {lineIndex < log.data.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  )
}
