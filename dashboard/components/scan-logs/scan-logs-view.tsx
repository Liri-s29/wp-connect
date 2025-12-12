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

type ScanLog = {
  id: number
  sellerPhone: string
  scanTime: Date
  productsFound: number
  productsNew: number
  productsUpdated: number
  seller: {
    phoneNumber: string
    name: string | null
    city: string | null
  }
}

interface ScanLogsViewProps {
  logs: ScanLog[]
}

type ScanLogColumnKey = 'id' | 'seller' | 'scanTime' | 'productsFound' | 'productsNew' | 'productsUpdated'

const DEFAULT_COLUMN_ORDER: ScanLogColumnKey[] = [
  'id',
  'seller',
  'scanTime',
  'productsFound',
  'productsNew',
  'productsUpdated',
]

export function ScanLogsView({ logs }: ScanLogsViewProps) {
  const [view, setView] = useState<'table' | 'cards'>('table')

  // Column ordering
  const { reorderColumns, getOrderedColumns } = useColumnOrder<ScanLogColumnKey>({
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
    logs,
    (log) => [
      log.sellerPhone,
      log.seller.name || '',
      log.seller.city || '',
      log.productsFound.toString(),
      log.productsNew.toString(),
      log.productsUpdated.toString(),
    ],
    10
  )

  const allTableColumns = useMemo(
    () => [
      {
        key: 'id',
        header: 'ID',
        render: (log: ScanLog) => log.id,
      },
      {
        key: 'seller',
        header: 'Seller',
        render: (log: ScanLog) => log.seller.name || log.seller.phoneNumber,
      },
      {
        key: 'scanTime',
        header: 'Scan Time',
        render: (log: ScanLog) => new Date(log.scanTime).toLocaleString(),
      },
      {
        key: 'productsFound',
        header: 'Found',
        render: (log: ScanLog) => log.productsFound,
      },
      {
        key: 'productsNew',
        header: 'New',
        render: (log: ScanLog) => log.productsNew,
      },
      {
        key: 'productsUpdated',
        header: 'Updated',
        render: (log: ScanLog) => log.productsUpdated,
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
          title="Scan Logs"
          description="View scan history and statistics"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredData.length}
          totalCount={logs.length}
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
            renderCard={(log: ScanLog) => (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Scan #{log.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Seller:</span>
                    <p className="font-medium">{log.seller.name || log.seller.phoneNumber}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <span className="text-xs text-muted-foreground">Found</span>
                      <p className="text-lg font-semibold">{log.productsFound}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">New</span>
                      <p className="text-lg font-semibold">{log.productsNew}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Updated</span>
                      <p className="text-lg font-semibold">{log.productsUpdated}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2">
                    {new Date(log.scanTime).toLocaleString()}
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

