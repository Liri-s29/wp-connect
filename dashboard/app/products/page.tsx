import { getProducts } from '@/lib/queries'
import { ProductsView } from '@/components/products/products-view'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-12 w-64" />}>
        <ProductsView products={products} />
      </Suspense>
    </div>
  )
}

