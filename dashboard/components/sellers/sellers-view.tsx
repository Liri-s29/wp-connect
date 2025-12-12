'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ViewToggle } from '@/components/view-toggle'
import { DataTable } from '@/components/data-table'
import { CardGrid } from '@/components/card-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination } from '@/components/pagination'
import { useSearchPagination } from '@/hooks/use-search-pagination'
import { useColumnOrder } from '@/hooks/use-column-order'
import { ExternalLink, Phone, MapPin, Calendar } from 'lucide-react'
import type { Seller } from '@prisma/client'

interface SellersViewProps {
  sellers: Seller[]
}

type SellerColumnKey = 'phoneNumber' | 'name' | 'city' | 'catalogueUrl' | 'createdAt'

const DEFAULT_COLUMN_ORDER: SellerColumnKey[] = [
  'phoneNumber',
  'name',
  'city',
  'catalogueUrl',
  'createdAt',
]

export function SellersView({ sellers }: SellersViewProps) {
  const [view, setView] = useState<'table' | 'cards'>('table')

  // Column ordering
  const { reorderColumns, getOrderedColumns } = useColumnOrder<SellerColumnKey>({
    defaultOrder: DEFAULT_COLUMN_ORDER,
  })

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
    sellers,
    (seller) => [
      seller.phoneNumber,
      seller.name || '',
      seller.city || '',
    ],
    10
  )

  const allTableColumns = useMemo(
    () => [
      {
        key: 'phoneNumber',
        header: 'Phone Number',
        sortable: true,
        sortValue: (seller: Seller) => seller.phoneNumber,
        render: (seller: Seller) => (
          <span className="font-mono">{seller.phoneNumber}</span>
        ),
      },
      {
        key: 'name',
        header: 'Name',
        sortable: true,
        sortValue: (seller: Seller) => seller.name || '',
        render: (seller: Seller) => seller.name || '-',
      },
      {
        key: 'city',
        header: 'City',
        sortable: true,
        sortValue: (seller: Seller) => seller.city || '',
        render: (seller: Seller) => seller.city || '-',
      },
      {
        key: 'catalogueUrl',
        header: 'Catalog URL',
        render: (seller: Seller) =>
          seller.catalogueUrl ? (
            <a
              href={seller.catalogueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          ) : (
            '-'
          ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        sortValue: (seller: Seller) => new Date(seller.createdAt),
        render: (seller: Seller) =>
          new Date(seller.createdAt).toLocaleDateString(),
      },
    ],
    []
  )

  const tableColumns = useMemo(
    () => getOrderedColumns(allTableColumns),
    [allTableColumns, getOrderedColumns]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Sellers"
          description="Manage and view all sellers in the system"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredData.length}
          totalCount={sellers.length}
        />
        <ViewToggle value={view} onValueChange={setView} />
      </div>

      {view === 'table' ? (
        <>
          <DataTable
            data={paginatedData}
            columns={tableColumns}
            onColumnReorder={reorderColumns}
          />
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
            renderCard={(seller: Seller) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{seller.name || 'Unnamed Seller'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{seller.phoneNumber}</span>
                  </div>
                  {seller.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{seller.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {new Date(seller.createdAt).toLocaleDateString()}</span>
                  </div>
                  {seller.catalogueUrl && (
                    <div className="pt-2 border-t">
                      <a
                        href={seller.catalogueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Catalog
                      </a>
                    </div>
                  )}
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
    </div>
  )
}
