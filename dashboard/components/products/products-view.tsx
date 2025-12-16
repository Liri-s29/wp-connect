'use client'

import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ViewToggle } from '@/components/view-toggle'
import { DataTable } from '@/components/data-table'
import { CardGrid } from '@/components/card-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/pagination'
import { useSearchPagination } from '@/hooks/use-search-pagination'
import { useProductFilters } from '@/hooks/use-product-filters'
import { useSavedViews, SavedView } from '@/hooks/use-saved-views'
import { useColumnOrder } from '@/hooks/use-column-order'
import { SellerDetailsModal } from '@/components/seller-details-modal'
import { FiltersSidebar } from './filters-sidebar'
import { ColumnCustomizer } from './column-customizer'
import { ActiveFiltersBar } from './active-filters-bar'
import { SavedViewsDropdown } from './saved-views-dropdown'
import { SaveViewDialog } from './save-view-dialog'
import { CSVExportDropdown } from './csv-export-dropdown'
import {
  FilterOptions,
  ColumnKey,
  ALL_COLUMNS,
  DEFAULT_VISIBLE_COLUMNS,
  hasActiveFilters,
  countActiveFilters,
} from './filter-controls/filter-types'
import { ExternalLink, Filter, Columns3 } from 'lucide-react'

type Product = {
  id: string
  sellerPhone: string
  rawName: string | null
  rawDescription: string | null
  priceRaw: any
  currency: string | null
  availability: string | null
  imageCount: number | null
  modelName: string | null
  storageGb: string | null
  color: string | null
  warranty: string | null
  batteryHealth: string | null
  condition: string | null
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [saveViewOpen, setSaveViewOpen] = useState(false)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [currentViewId, setCurrentViewId] = useState<string | null>(null)

  // Custom hooks
  const {
    filters,
    visibleColumns,
    sortKey,
    sortDir,
    filteredData: filterAppliedData,
    updateFilters,
    updateColumns,
    applyViewConfig,
    getCurrentViewConfig,
    resetAll,
  } = useProductFilters(products)

  const {
    views,
    isLoading: viewsLoading,
    saveView,
    deleteView,
    setDefaultView,
    getDefaultView,
  } = useSavedViews()

  // Column ordering
  const {
    columnOrder,
    reorderColumns,
    setOrder: setColumnOrder,
    getOrderedColumns,
  } = useColumnOrder<ColumnKey>({
    defaultOrder: DEFAULT_VISIBLE_COLUMNS,
  })

  // Fetch filter options on mount
  useEffect(() => {
    fetch('/api/products/filters')
      .then((res) => res.json())
      .then(setFilterOptions)
      .catch(console.error)
  }, [])

  // Load default view on mount
  useEffect(() => {
    if (!viewsLoading) {
      const defaultView = getDefaultView()
      if (defaultView) {
        handleSelectView(defaultView)
      }
    }
  }, [viewsLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Search and pagination (applied after custom filters)
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedData,
    filteredData: searchFilteredData,
    handlePageChange,
    handleItemsPerPageChange,
  } = useSearchPagination(
    filterAppliedData,
    (product) => [
      product.id,
      product.rawName || '',
      product.rawDescription || '',
      product.modelName || '',
      product.storageGb || '',
      product.color || '',
      product.warranty || '',
      product.batteryHealth || '',
      product.condition || '',
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

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleSellerClick = (seller: Product['seller']) => {
    setSelectedSeller(seller)
    setModalOpen(true)
  }

  const handleSelectView = (view: SavedView) => {
    setCurrentViewId(view.id)
    applyViewConfig({
      filters: view.filters,
      columns: view.columns,
      sortKey: view.sortKey,
      sortDir: view.sortDir as 'asc' | 'desc' | null,
    })
    // Apply column order from saved view
    if (view.columnOrder && view.columnOrder.length > 0) {
      setColumnOrder(view.columnOrder)
    }
  }

  const handleSaveView = async (data: {
    name: string
    description?: string
    isDefault: boolean
  }) => {
    const config = getCurrentViewConfig()
    const newView = await saveView({
      name: data.name,
      description: data.description,
      filters: config.filters,
      columns: config.columns,
      columnOrder: columnOrder,
      sortKey: config.sortKey,
      sortDir: config.sortDir,
      isDefault: data.isDefault,
    })
    if (newView) {
      setCurrentViewId(newView.id)
    }
  }

  // All column definitions
  const allTableColumns = useMemo(
    () => [
      {
        key: 'name' as const,
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
        key: 'description' as const,
        header: 'Description',
        render: (product: Product) => (
          <span className="max-w-[200px] truncate block" title={product.rawDescription || '-'}>
            {product.rawDescription ? product.rawDescription.slice(0, 50) + (product.rawDescription.length > 50 ? '...' : '') : '-'}
          </span>
        ),
      },
      {
        key: 'price' as const,
        header: 'Price',
        sortable: true,
        sortValue: (product: Product) => product.priceRaw != null ? Number(product.priceRaw) : null,
        render: (product: Product) => formatPrice(product.priceRaw, product.currency),
      },
      {
        key: 'model' as const,
        header: 'Model',
        sortable: true,
        sortValue: (product: Product) => product.modelName || '',
        render: (product: Product) => product.modelName || '-',
      },
      {
        key: 'storage' as const,
        header: 'Storage',
        sortable: true,
        sortValue: (product: Product) => product.storageGb || '',
        render: (product: Product) => product.storageGb || '-',
      },
      {
        key: 'color' as const,
        header: 'Color',
        sortable: true,
        sortValue: (product: Product) => product.color || '',
        render: (product: Product) => product.color || '-',
      },
      {
        key: 'warranty' as const,
        header: 'Warranty',
        render: (product: Product) => product.warranty || '-',
      },
      {
        key: 'batteryHealth' as const,
        header: 'Battery',
        sortable: true,
        sortValue: (product: Product) => product.batteryHealth || '',
        render: (product: Product) => product.batteryHealth || '-',
      },
      {
        key: 'condition' as const,
        header: 'Condition',
        sortable: true,
        sortValue: (product: Product) => product.condition || '',
        render: (product: Product) => product.condition || '-',
      },
      {
        key: 'imageCount' as const,
        header: 'Images',
        sortable: true,
        sortValue: (product: Product) => product.imageCount ?? 0,
        render: (product: Product) => product.imageCount ?? '-',
      },
      {
        key: 'seller' as const,
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
        key: 'sellerCity' as const,
        header: 'Seller City',
        sortable: true,
        sortValue: (product: Product) => product.seller.city || '',
        render: (product: Product) => product.seller.city || '-',
      },
      {
        key: 'sellerCatalogUrl' as const,
        header: 'Catalog URL',
        render: (product: Product) =>
          product.seller.catalogueUrl ? (
            <a
              href={product.seller.catalogueUrl}
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
        key: 'link' as const,
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
      {
        key: 'availability' as const,
        header: 'Availability',
        render: (product: Product) => product.availability || '-',
      },
      {
        key: 'lastModifiedAt' as const,
        header: 'Last Modified',
        sortable: true,
        sortValue: (product: Product) => product.lastModifiedAt ? new Date(product.lastModifiedAt).getTime() : 0,
        render: (product: Product) => formatDate(product.lastModifiedAt),
      },
      {
        key: 'firstSeenAt' as const,
        header: 'First Seen',
        sortable: true,
        sortValue: (product: Product) => product.firstSeenAt ? new Date(product.firstSeenAt).getTime() : 0,
        render: (product: Product) => formatDate(product.firstSeenAt),
      },
    ],
    []
  )

  // Filter and order columns based on visibility and order
  const tableColumns = useMemo(() => {
    const visibleCols = allTableColumns.filter((col) => visibleColumns.includes(col.key as ColumnKey))
    return getOrderedColumns(visibleCols)
  }, [allTableColumns, visibleColumns, getOrderedColumns])

  const activeFiltersCount = countActiveFilters(filters)

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Products"
            description="View and manage all products"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchFilteredData.length}
            totalCount={products.length}
          />
          <ViewToggle value={view} onValueChange={setView} />
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <SavedViewsDropdown
            views={views}
            currentViewId={currentViewId}
            onSelectView={handleSelectView}
            onSaveNewView={() => setSaveViewOpen(true)}
            onDeleteView={deleteView}
            onSetDefaultView={setDefaultView}
            isLoading={viewsLoading}
          />

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setColumnsOpen(true)}
          >
            <Columns3 className="h-4 w-4" />
            Columns
          </Button>

          <div className="flex-1" />

          <CSVExportDropdown
            filteredData={searchFilteredData}
            allData={products}
          />
        </div>
      </div>

      {/* Active Filters Bar */}
      <ActiveFiltersBar
        filters={filters}
        onFiltersChange={updateFilters}
        onSaveView={() => setSaveViewOpen(true)}
      />

      {/* Data Display */}
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
            totalItems={searchFilteredData.length}
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
                    {product.condition && (
                      <div>
                        <span className="text-muted-foreground">Condition:</span>
                        <p className="font-medium">{product.condition}</p>
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
            totalItems={searchFilteredData.length}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}

      {/* Modals */}
      <SellerDetailsModal
        seller={selectedSeller}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      <FiltersSidebar
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onFiltersChange={updateFilters}
        filterOptions={filterOptions}
      />

      <ColumnCustomizer
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={updateColumns}
      />

      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        onSave={handleSaveView}
        currentConfig={getCurrentViewConfig()}
      />
    </div>
  )
}
