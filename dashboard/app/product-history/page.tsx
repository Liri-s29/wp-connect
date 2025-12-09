import { getProductHistory } from '@/lib/queries'
import { ProductHistoryView } from '@/components/product-history/product-history-view'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export default async function ProductHistoryPage() {
  const history = await getProductHistory()

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-12 w-64" />}>
        <ProductHistoryView history={history} />
      </Suspense>
    </div>
  )
}

