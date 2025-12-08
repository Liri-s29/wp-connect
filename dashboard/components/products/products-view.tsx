'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ViewToggle } from '@/components/view-toggle'
import { DataTable } from '@/components/data-table'
import { CardGrid } from '@/components/card-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/pagination'
import { useSearchPagination } from '@/hooks/use-search-pagination'
import { SellerDetailsModal } from '@/components/seller-details-modal'
import { ExternalLink } from 'lucide-react'

type Product = {
  id: string
  sellerPhone: string
  rawName: string | null
  rawDescription: string | null
  priceRaw: any
  currency: string | null
  availability: string | null
  modelName: string | null
  storageGb: string | null
  color: string | null
  warranty: string | null
  batteryHealth: string | null
  isActive: boolean
  firstSeenAt: Date
  lastSeenAt: Date
  lastModifiedAt: Date | null
  seller: {
    phoneNumber: string
    name: string | null
    city: string | null
    catalogueUrl?: string | null
  }
}

interface ProductsViewProps {
  products: Product[]
}

export function ProductsView({ products }: ProductsViewProps) {
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [selectedSeller, setSelectedSeller] = useState<Product['seller'] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedData,
    filteredData,
    handlePageChange,
    handleItemsPerPageChange,
  } = useSearchPagination(
    products,
    (product) => [
      product.id,
      product.rawName || '',
      product.rawDescription || '',
      product.modelName || '',
      product.storageGb || '',
      product.color || '',
      product.warranty || '',
      product.batteryHealth || '',
      product.seller.name || '',
      product.seller.phoneNumber,
    ],
    10
  )

  const formatPrice = (priceRaw: any, currency: string | null) => {
    if (priceRaw == null) return '-'
    const value = typeof priceRaw === 'object' ? Number(priceRaw) : priceRaw
    if (currency) {
      try {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: currency,
        }).format(value)
      } catch {
        return `${currency} ${value}`
      }
    }
    return String(value)
  }

  const handleSellerClick = (seller: Product['seller']) => {
    setSelectedSeller(seller)
    setModalOpen(true)
  }

  const tableColumns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (product: Product) => product.rawName || product.modelName || '',
      render: (product: Product) => (
        <span className="max-w-[200px] truncate block" title={product.rawName || product.modelName || '-'}>
          {product.rawName || product.modelName || '-'}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (product: Product) => (
        <span className="max-w-[200px] truncate block" title={product.rawDescription || '-'}>
          {product.rawDescription ? product.rawDescription.slice(0, 50) + (product.rawDescription.length > 50 ? '...' : '') : '-'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      sortValue: (product: Product) => product.priceRaw != null ? Number(product.priceRaw) : null,
      render: (product: Product) => formatPrice(product.priceRaw, product.currency),
    },
    {
      key: 'model',
      header: 'Model',
      sortable: true,
      sortValue: (product: Product) => product.modelName || '',
      render: (product: Product) => product.modelName || '-',
    },
    {
      key: 'storage',
      header: 'Storage',
      sortable: true,
      sortValue: (product: Product) => product.storageGb || '',
      render: (product: Product) => product.storageGb || '-',
    },
    {
      key: 'color',
      header: 'Color',
      sortable: true,
      sortValue: (product: Product) => product.color || '',
      render: (product: Product) => product.color || '-',
    },
    {
      key: 'warranty',
      header: 'Warranty',
      render: (product: Product) => product.warranty || '-',
    },
    {
      key: 'batteryHealth',
      header: 'Battery',
      sortable: true,
      sortValue: (product: Product) => product.batteryHealth || '',
      render: (product: Product) => product.batteryHealth || '-',
    },
    {
      key: 'seller',
      header: 'Seller',
      sortable: true,
      sortValue: (product: Product) => product.seller.name || product.seller.phoneNumber,
      render: (product: Product) => (
        <Button
          variant="link"
          className="p-0 h-auto text-blue-600"
          onClick={() => handleSellerClick(product.seller)}
        >
          {product.seller.name || product.seller.phoneNumber}
        </Button>
      ),
    },
    {
      key: 'link',
      header: 'Product URL',
      render: (product: Product) => (
        <a
          href={`https://web.whatsapp.com/product/${product.id}/${product.sellerPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Products"
          description="View and manage all products"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredData.length}
          totalCount={products.length}
        />
        <ViewToggle value={view} onValueChange={setView} />
      </div>

      {view === 'table' ? (
        <>
          <DataTable data={paginatedData} columns={tableColumns} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      ) : (
        <>
          <CardGrid
            data={paginatedData}
            renderCard={(product: Product) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {product.rawName || product.modelName || 'Unnamed Product'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Seller:</span>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-blue-600 block"
                      onClick={() => handleSellerClick(product.seller)}
                    >
                      {product.seller.name || product.seller.phoneNumber}
                    </Button>
                  </div>

                  {product.rawDescription && (
                    <div>
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm">{product.rawDescription.slice(0, 100)}...</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="font-medium">{formatPrice(product.priceRaw, product.currency)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {product.modelName && (
                      <div>
                        <span className="text-muted-foreground">Model:</span>
                        <p className="font-medium">{product.modelName}</p>
                      </div>
                    )}
                    {product.storageGb && (
                      <div>
                        <span className="text-muted-foreground">Storage:</span>
                        <p className="font-medium">{product.storageGb}</p>
                      </div>
                    )}
                    {product.color && (
                      <div>
                        <span className="text-muted-foreground">Color:</span>
                        <p className="font-medium">{product.color}</p>
                      </div>
                    )}
                    {product.warranty && (
                      <div>
                        <span className="text-muted-foreground">Warranty:</span>
                        <p className="font-medium">{product.warranty}</p>
                      </div>
                    )}
                    {product.batteryHealth && (
                      <div>
                        <span className="text-muted-foreground">Battery:</span>
                        <p className="font-medium">{product.batteryHealth}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <a
                      href={`https://web.whatsapp.com/product/${product.id}/${product.sellerPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open product
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}
          />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}

      <SellerDetailsModal
        seller={selectedSeller}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
