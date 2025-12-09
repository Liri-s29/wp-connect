import { getSellerMetrics } from '@/lib/queries'
import { SellerMetricsView } from '@/components/metrics/seller-metrics-view'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export default async function MetricsPage() {
  const metrics = await getSellerMetrics()

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-12 w-64" />}>
        <SellerMetricsView metrics={metrics} />
      </Suspense>
    </div>
  )
}

