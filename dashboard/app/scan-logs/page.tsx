import { getScanLogs } from '@/lib/queries'
import { ScanLogsView } from '@/components/scan-logs/scan-logs-view'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export default async function ScanLogsPage() {
  const logs = await getScanLogs()

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-12 w-64" />}>
        <ScanLogsView logs={logs} />
      </Suspense>
    </div>
  )
}

