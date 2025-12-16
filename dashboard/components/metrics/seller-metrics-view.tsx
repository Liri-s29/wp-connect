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
import { Button } from '@/components/ui/button'
import { ExternalLink, Phone, MapPin, Columns3 } from 'lucide-react'
import { SellerMetricsColumnCustomizer } from './seller-metrics-column-customizer'
import type { SellerMetric } from '@/lib/queries'

interface SellerMetricsViewProps {
  metrics: SellerMetric[]
}

type FilterType = 'all' | 'valid' | 'invalid'

type SellerMetricColumnKey =
  | 'seller_name'
  | 'seller_contact'
  | 'city'
  | 'phones_last_week'
  | 'active_avg_listings_week'
  | 'product_info_score'
  | 'avg_image_count'
  | 'avg_listings_week'
  | 'current_active_inventory'
  | 'total_phones'
  | 'seller_url'

type ColumnDefinition = {
  key: SellerMetricColumnKey
  label: string
  group: 'basic' | 'metrics' | 'links'
  defaultVisible: boolean
}

const ALL_COLUMNS: ColumnDefinition[] = [
  { key: 'seller_name', label: 'Seller Name', group: 'basic', defaultVisible: true },
  { key: 'seller_contact', label: 'Contact', group: 'basic', defaultVisible: true },
  { key: 'city', label: 'City', group: 'basic', defaultVisible: true },
  { key: 'phones_last_week', label: 'Phones Last Week', group: 'metrics', defaultVisible: true },
  { key: 'active_avg_listings_week', label: 'Active Avg/Week', group: 'metrics', defaultVisible: true },
  { key: 'product_info_score', label: 'Product Info Score', group: 'metrics', defaultVisible: true },
  { key: 'avg_image_count', label: 'Avg Image Count', group: 'metrics', defaultVisible: true },
  { key: 'avg_listings_week', label: 'Avg Listing/Week', group: 'metrics', defaultVisible: true },
  { key: 'current_active_inventory', label: 'Active (3 days)', group: 'metrics', defaultVisible: true },
  { key: 'total_phones', label: 'Total Phones', group: 'metrics', defaultVisible: true },
  { key: 'seller_url', label: 'Seller URL', group: 'links', defaultVisible: true },
]

const DEFAULT_VISIBLE_COLUMNS: SellerMetricColumnKey[] = ALL_COLUMNS
  .filter((col) => col.defaultVisible)
  .map((col) => col.key)

const DEFAULT_COLUMN_ORDER: SellerMetricColumnKey[] = [
  'seller_name',
  'seller_contact',
  'city',
  'phones_last_week',
  'active_avg_listings_week',
  'product_info_score',
  'avg_image_count',
  'avg_listings_week',
  'current_active_inventory',
  'total_phones',
  'seller_url',
]

export function SellerMetricsView({ metrics }: SellerMetricsViewProps) {
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [filter, setFilter] = useState<FilterType>('all')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<SellerMetricColumnKey[]>(DEFAULT_VISIBLE_COLUMNS)

  const filteredByValidity = metrics.filter((m) => {
    if (filter === 'valid') return m.is_valid
    if (filter === 'invalid') return !m.is_valid
    return true
  })

  // Column ordering
  const { reorderColumns, getOrderedColumns } = useColumnOrder<SellerMetricColumnKey>({
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
    filteredByValidity,
    (metric) => [
      metric.seller_phone,
      metric.seller_name || '',
      metric.city || '',
      metric.total_phones.toString(),
      metric.product_info_score.toString(),
      metric.phones_last_week.toString(),
    ],
    10
  )

  const validCount = metrics.filter((m) => m.is_valid).length
  const invalidCount = metrics.filter((m) => !m.is_valid).length

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4.8) return 'default'
    if (score >= 3) return 'secondary'
    return 'destructive'
  }

  const getScoreLabel = (score: number) => {
    return `${score.toFixed(1)}/6`
  }

  const allTableColumns = useMemo(
    () => [
      {
        key: 'seller_name',
        header: 'Seller Name',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.seller_name || '',
        render: (metric: SellerMetric) => metric.seller_name || '-',
      },
      {
        key: 'seller_contact',
        header: 'Contact',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.seller_phone,
        render: (metric: SellerMetric) => (
          <span className="font-mono text-sm">{metric.seller_phone}</span>
        ),
      },
      {
        key: 'city',
        header: 'City',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.city || '',
        render: (metric: SellerMetric) => metric.city || '-',
      },
      {
        key: 'phones_last_week',
        header: 'Phones Last Week',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.phones_last_week,
        render: (metric: SellerMetric) => metric.phones_last_week,
      },
      {
        key: 'active_avg_listings_week',
        header: 'Active Avg/Week',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.active_avg_listings_week,
        render: (metric: SellerMetric) => metric.active_avg_listings_week.toFixed(1),
      },
      {
        key: 'product_info_score',
        header: 'Product Info Score',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.product_info_score,
        render: (metric: SellerMetric) => (
          <Badge variant={getScoreBadgeVariant(metric.product_info_score)}>
            {getScoreLabel(metric.product_info_score)}
          </Badge>
        ),
      },
      {
        key: 'avg_image_count',
        header: 'Avg Images',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.avg_image_count,
        render: (metric: SellerMetric) => metric.avg_image_count.toFixed(1),
      },
      {
        key: 'avg_listings_week',
        header: 'Avg Listing/Week',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.avg_listings_week,
        render: (metric: SellerMetric) => metric.avg_listings_week.toFixed(1),
      },
      {
        key: 'current_active_inventory',
        header: 'Active (3 days)',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.current_active_inventory,
        render: (metric: SellerMetric) => metric.current_active_inventory,
      },
      {
        key: 'total_phones',
        header: 'Total Phones',
        sortable: true,
        sortValue: (metric: SellerMetric) => metric.total_phones,
        render: (metric: SellerMetric) => metric.total_phones,
      },
      {
        key: 'seller_url',
        header: 'Seller URL',
        render: (metric: SellerMetric) =>
          metric.catalogue_url ? (
            <a
              href={metric.catalogue_url}
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
    ],
    []
  )

  const tableColumns = useMemo(() => {
    const visibleCols = allTableColumns.filter((col) =>
      visibleColumns.includes(col.key as SellerMetricColumnKey)
    )
    return getOrderedColumns(visibleCols)
  }, [allTableColumns, visibleColumns, getOrderedColumns])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Seller Metrics"
          description="View aggregated seller performance metrics"
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredData.length}
          totalCount={metrics.length}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setColumnsOpen(true)}
          >
            <Columns3 className="h-4 w-4" />
            Columns
          </Button>
          <ViewToggle value={view} onValueChange={setView} />
        </div>
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
            renderCard={(metric: SellerMetric) => (
              <Card className={!metric.is_valid ? 'border-destructive/50' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {metric.seller_name || 'Unknown Seller'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span className="font-mono">{metric.seller_phone}</span>
                  </div>
                  {metric.city && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{metric.city}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Product Info Score</span>
                      <div>
                        <Badge variant={getScoreBadgeVariant(metric.product_info_score)}>
                          {getScoreLabel(metric.product_info_score)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Phones Last Week</span>
                      <p className="text-lg font-semibold">{metric.phones_last_week}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Active (3 days)</span>
                      <p className="text-lg font-semibold">{metric.current_active_inventory}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Total Phones</span>
                      <p className="text-lg font-semibold">{metric.total_phones}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Active Avg/Week: {metric.active_avg_listings_week.toFixed(1)}
                    </span>
                    {metric.catalogue_url && (
                      <a
                        href={metric.catalogue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Catalog
                      </a>
                    )}
                  </div>

                  {metric.last_scan_date && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      Last scan: {new Date(metric.last_scan_date).toLocaleDateString()}
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

      <SellerMetricsColumnCustomizer
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
    </div>
  )
}
