import { getSellers } from '@/lib/queries'
import { SellersView } from '@/components/sellers/sellers-view'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export default async function SellersPage() {
  const sellers = await getSellers()

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-12 w-64" />}>
        <SellersView sellers={sellers} />
      </Suspense>
    </div>
  )
}

