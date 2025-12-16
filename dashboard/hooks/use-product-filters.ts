'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  ProductFilters,
  DEFAULT_FILTERS,
  ColumnKey,
  DEFAULT_VISIBLE_COLUMNS,
  NonEmptyFilterableColumn,
} from '@/components/products/filter-controls/filter-types'

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

// Parse URL params to filters
function parseFiltersFromURL(searchParams: URLSearchParams): Partial<ProductFilters> {
  const filters: Partial<ProductFilters> = {}

  const models = searchParams.get('models')
  if (models) filters.models = models.split(',').filter(Boolean)

  const colors = searchParams.get('colors')
  if (colors) filters.colors = colors.split(',').filter(Boolean)

  const warranties = searchParams.get('warranties')
  if (warranties) filters.warranties = warranties.split(',').filter(Boolean)

  const sellers = searchParams.get('sellers')
  if (sellers) filters.sellers = sellers.split(',').filter(Boolean)

  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')
  if (priceMin || priceMax) {
    filters.priceRange = {
      min: priceMin ? Number(priceMin) : null,
      max: priceMax ? Number(priceMax) : null,
    }
  }

  const storageMin = searchParams.get('storageMin')
  const storageMax = searchParams.get('storageMax')
  if (storageMin || storageMax) {
    filters.storageRange = {
      min: storageMin ? Number(storageMin) : null,
      max: storageMax ? Number(storageMax) : null,
    }
  }

  const batteryMin = searchParams.get('batteryMin')
  const batteryMax = searchParams.get('batteryMax')
  if (batteryMin || batteryMax) {
    filters.batteryRange = {
      min: batteryMin ? Number(batteryMin) : null,
      max: batteryMax ? Number(batteryMax) : null,
    }
  }

  const activeIn = searchParams.get('activeIn')
  if (activeIn) filters.activeInDays = Number(activeIn)

  const isActive = searchParams.get('isActive')
  if (isActive !== null) {
    filters.isActive = isActive === 'true' ? true : isActive === 'false' ? false : null
  }

  const nonEmpty = searchParams.get('nonEmpty')
  if (nonEmpty) {
    filters.nonEmptyColumns = nonEmpty.split(',').filter(Boolean) as NonEmptyFilterableColumn[]
  }

  return filters
}

// Serialize filters to URL params
function serializeFiltersToURL(filters: ProductFilters): Record<string, string> {
  const params: Record<string, string> = {}

  if (filters.models.length > 0) params.models = filters.models.join(',')
  if (filters.colors.length > 0) params.colors = filters.colors.join(',')
  if (filters.warranties.length > 0) params.warranties = filters.warranties.join(',')
  if (filters.sellers.length > 0) params.sellers = filters.sellers.join(',')

  if (filters.priceRange.min !== null) params.priceMin = String(filters.priceRange.min)
  if (filters.priceRange.max !== null) params.priceMax = String(filters.priceRange.max)

  if (filters.storageRange.min !== null) params.storageMin = String(filters.storageRange.min)
  if (filters.storageRange.max !== null) params.storageMax = String(filters.storageRange.max)

  if (filters.batteryRange.min !== null) params.batteryMin = String(filters.batteryRange.min)
  if (filters.batteryRange.max !== null) params.batteryMax = String(filters.batteryRange.max)

  if (filters.activeInDays !== null) params.activeIn = String(filters.activeInDays)

  if (filters.isActive !== null) params.isActive = String(filters.isActive)

  if (filters.nonEmptyColumns.length > 0) params.nonEmpty = filters.nonEmptyColumns.join(',')

  return params
}

// Parse columns from URL
function parseColumnsFromURL(searchParams: URLSearchParams): ColumnKey[] | null {
  const columns = searchParams.get('columns')
  if (columns) {
    return columns.split(',').filter(Boolean) as ColumnKey[]
  }
  return null
}

// Extract numeric value from storage string (e.g., "128GB" -> 128)
function parseStorageValue(storage: string | null): number | null {
  if (!storage) return null
  const match = storage.match(/(\d+)/i)
  return match ? Number(match[1]) : null
}

// Extract numeric value from battery health string (e.g., "85%" -> 85)
function parseBatteryValue(battery: string | null): number | null {
  if (!battery) return null
  const match = battery.match(/(\d+)/i)
  return match ? Number(match[1]) : null
}

export function useProductFilters(products: Product[]) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize state from URL params
  const [filters, setFilters] = useState<ProductFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...parseFiltersFromURL(searchParams),
  }))

  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => {
    return parseColumnsFromURL(searchParams) || DEFAULT_VISIBLE_COLUMNS
  })

  const [sortKey, setSortKey] = useState<string | null>(() => searchParams.get('sortKey'))
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(() => {
    const dir = searchParams.get('sortDir')
    return dir === 'asc' || dir === 'desc' ? dir : null
  })

  // Update URL when filters change
  const updateURL = useCallback(
    (
      newFilters: ProductFilters,
      newColumns: ColumnKey[],
      newSortKey: string | null,
      newSortDir: 'asc' | 'desc' | null
    ) => {
      const params = new URLSearchParams()

      // Add filter params
      const filterParams = serializeFiltersToURL(newFilters)
      Object.entries(filterParams).forEach(([key, value]) => {
        params.set(key, value)
      })

      // Add column params (only if different from default)
      const defaultColSet = new Set(DEFAULT_VISIBLE_COLUMNS)
      const newColSet = new Set(newColumns)
      const isDefault =
        defaultColSet.size === newColSet.size &&
        [...defaultColSet].every((col) => newColSet.has(col))
      if (!isDefault) {
        params.set('columns', newColumns.join(','))
      }

      // Add sort params
      if (newSortKey) params.set('sortKey', newSortKey)
      if (newSortDir) params.set('sortDir', newSortDir)

      // Update URL without scroll
      const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newURL, { scroll: false })
    },
    [pathname, router]
  )

  // Filter updaters
  const updateFilters = useCallback(
    (newFilters: ProductFilters) => {
      setFilters(newFilters)
      updateURL(newFilters, visibleColumns, sortKey, sortDir)
    },
    [visibleColumns, sortKey, sortDir, updateURL]
  )

  const updateColumns = useCallback(
    (newColumns: ColumnKey[]) => {
      setVisibleColumns(newColumns)
      updateURL(filters, newColumns, sortKey, sortDir)
    },
    [filters, sortKey, sortDir, updateURL]
  )

  const updateSort = useCallback(
    (key: string | null, dir: 'asc' | 'desc' | null) => {
      setSortKey(key)
      setSortDir(dir)
      updateURL(filters, visibleColumns, key, dir)
    },
    [filters, visibleColumns, updateURL]
  )

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    updateURL(DEFAULT_FILTERS, visibleColumns, sortKey, sortDir)
  }, [visibleColumns, sortKey, sortDir, updateURL])

  const resetColumns = useCallback(() => {
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    updateURL(filters, DEFAULT_VISIBLE_COLUMNS, sortKey, sortDir)
  }, [filters, sortKey, sortDir, updateURL])

  const resetAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)
    setSortKey(null)
    setSortDir(null)
    router.replace(pathname, { scroll: false })
  }, [pathname, router])

  // Apply filters to data
  const filteredData = useMemo(() => {
    return products.filter((product) => {
      // Model filter
      if (
        filters.models.length > 0 &&
        (!product.modelName || !filters.models.includes(product.modelName))
      ) {
        return false
      }

      // Color filter
      if (
        filters.colors.length > 0 &&
        (!product.color || !filters.colors.includes(product.color))
      ) {
        return false
      }

      // Warranty filter
      if (
        filters.warranties.length > 0 &&
        (!product.warranty || !filters.warranties.includes(product.warranty))
      ) {
        return false
      }

      // Seller filter
      if (
        filters.sellers.length > 0 &&
        !filters.sellers.includes(product.sellerPhone)
      ) {
        return false
      }

      // Price range filter
      const price = product.priceRaw ? Number(product.priceRaw) : null
      if (filters.priceRange.min !== null && (price === null || price < filters.priceRange.min)) {
        return false
      }
      if (filters.priceRange.max !== null && (price === null || price > filters.priceRange.max)) {
        return false
      }

      // Storage range filter
      const storage = parseStorageValue(product.storageGb)
      if (filters.storageRange.min !== null && (storage === null || storage < filters.storageRange.min)) {
        return false
      }
      if (filters.storageRange.max !== null && (storage === null || storage > filters.storageRange.max)) {
        return false
      }

      // Battery range filter
      const battery = parseBatteryValue(product.batteryHealth)
      if (filters.batteryRange.min !== null && (battery === null || battery < filters.batteryRange.min)) {
        return false
      }
      if (filters.batteryRange.max !== null && (battery === null || battery > filters.batteryRange.max)) {
        return false
      }

      // Active products filter (based on lastModifiedAt)
      if (filters.activeInDays !== null) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - filters.activeInDays)

        const modifiedAt = product.lastModifiedAt ? new Date(product.lastModifiedAt) : null
        if (!modifiedAt || modifiedAt < cutoffDate) {
          return false
        }
      }

      // isActive filter
      if (filters.isActive !== null && product.isActive !== filters.isActive) {
        return false
      }

      // Non-empty columns filter
      if (filters.nonEmptyColumns.length > 0) {
        for (const column of filters.nonEmptyColumns) {
          const value = product[column as keyof Product]
          if (value === null || value === undefined || value === '') {
            return false
          }
        }
      }

      return true
    })
  }, [products, filters])

  // Apply a complete view configuration (for saved views)
  const applyViewConfig = useCallback(
    (config: {
      filters: ProductFilters
      columns: ColumnKey[]
      sortKey?: string | null
      sortDir?: 'asc' | 'desc' | null
    }) => {
      setFilters(config.filters)
      setVisibleColumns(config.columns)
      if (config.sortKey !== undefined) setSortKey(config.sortKey)
      if (config.sortDir !== undefined) setSortDir(config.sortDir)
      updateURL(
        config.filters,
        config.columns,
        config.sortKey ?? sortKey,
        config.sortDir ?? sortDir
      )
    },
    [sortKey, sortDir, updateURL]
  )

  // Get current view config (for saving)
  const getCurrentViewConfig = useCallback(() => {
    return {
      filters,
      columns: visibleColumns,
      sortKey,
      sortDir,
    }
  }, [filters, visibleColumns, sortKey, sortDir])

  return {
    filters,
    visibleColumns,
    sortKey,
    sortDir,
    filteredData,
    updateFilters,
    updateColumns,
    updateSort,
    resetFilters,
    resetColumns,
    resetAll,
    applyViewConfig,
    getCurrentViewConfig,
  }
}
