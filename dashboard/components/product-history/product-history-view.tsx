'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ViewToggle } from '@/components/view-toggle'
import { DataTable } from '@/components/data-table'
import { CardGrid } from '@/components/card-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/pagination'
import { useSearchPagination } from '@/hooks/use-search-pagination'
import { useColumnOrder } from '@/hooks/use-column-order'

type ProductHistory = {
  historyId: number
  productId: string
  recordedAt: Date
  changeType: string
  snapshot: any
  product: {
    id: string
    rawName: string | null
    seller: {
      phoneNumber: string
      name: string | null
    }
  }
}

interface ProductHistoryViewProps {
  history: ProductHistory[]
}

type ProductHistoryColumnKey = 'historyId' | 'product' | 'seller' | 'changeType' | 'recordedAt'

const DEFAULT_COLUMN_ORDER: ProductHistoryColumnKey[] = [
  'historyId',
  'product',
  'seller',
  'changeType',
  'recordedAt',
]

export function ProductHistoryView({ history }: ProductHistoryViewProps) {
  const [view, setView] = useState<'table' | 'cards'>('table')

  // Column ordering
  const { reorderColumns, getOrderedColumns } = useColumnOrder<ProductHistoryColumnKey>({
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
    history,
    (item) => [
      item.productId,
      item.changeType,
      item.product.rawName || '',
      item.product.seller.name || '',
      item.product.seller.phoneNumber,
      JSON.stringify(item.snapshot),
    ],
    10
  )

  const allTableColumns = useMemo(
    () => [
      {
        key: 'historyId',
        header: 'ID',
        render: (item: ProductHistory) => item.historyId,
      },
      {
        key: 'product',
        header: 'Product',
        render: (item: ProductHistory) => item.product.rawName || item.productId.slice(0, 8),
      },
      {
        key: 'seller',
        header: 'Seller',
        render: (item: ProductHistory) => item.product.seller.name || item.product.seller.phoneNumber,
      },
      {
        key: 'changeType',
        header: 'Change Type',
        render: (item: ProductHistory) => (
          <Badge variant="outline">{item.changeType}</Badge>
        ),
      },
      {
        key: 'recordedAt',
        header: 'Recorded At',
        render: (item: ProductHistory) => new Date(item.recordedAt).toLocaleString(),
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
          title="Product History"
          description="View history of product changes"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredData.length}
          totalCount={history.length}
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
            renderCard={(item: ProductHistory) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    History #{item.historyId}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Product:</span>
                    <p className="font-medium">{item.product.rawName || item.productId.slice(0, 8)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Seller:</span>
                    <p className="font-medium">{item.product.seller.name || item.product.seller.phoneNumber}</p>
                  </div>
                  <div>
                    <Badge variant="outline">{item.changeType}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2">
                    Recorded: {new Date(item.recordedAt).toLocaleString()}
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
    </div>
  )
}

