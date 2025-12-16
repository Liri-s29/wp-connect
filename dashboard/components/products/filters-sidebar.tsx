'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MultiSelectFilter,
  RangeFilterControl,
  TimespanFilter,
  NonEmptyFilter,
  ProductFilters,
  DEFAULT_FILTERS,
  FilterOptions,
  hasActiveFilters,
} from './filter-controls'

interface FiltersSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: ProductFilters
  onFiltersChange: (filters: ProductFilters) => void
  filterOptions: FilterOptions | null
}

// Series shortcuts - maps series name to model prefixes
const SERIES_GROUPS: Record<string, string[]> = {
  'Series 13-17': ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 16', 'iPhone 17', 'iPhone Air'],
  'Series 13': ['iPhone 13'],
  'Series 14': ['iPhone 14'],
  'Series 15': ['iPhone 15'],
  'Series 16': ['iPhone 16'],
  'Series 17': ['iPhone 17', 'iPhone Air'],
}

// Get models that belong to a series
function getModelsForSeries(seriesKey: string, allModels: string[]): string[] {
  const prefixes = SERIES_GROUPS[seriesKey]
  if (!prefixes) return []
  return allModels.filter((model) =>
    prefixes.some((prefix) => model.startsWith(prefix))
  )
}

export function FiltersSidebar({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  filterOptions,
}: FiltersSidebarProps) {
  // Local state for editing (to allow cancel)
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters)

  // Sync local filters when prop changes or sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters)
    }
  }, [open, filters])

  const handleApply = () => {
    onFiltersChange(localFilters)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalFilters(filters)
    onOpenChange(false)
  }

  const handleClearAll = () => {
    setLocalFilters(DEFAULT_FILTERS)
  }

  const updateFilter = <K extends keyof ProductFilters>(
    key: K,
    value: ProductFilters[K]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }))
  }

  const allModels = filterOptions?.models || []

  // Create series options at the top
  const seriesOptions = Object.keys(SERIES_GROUPS).map((series) => ({
    value: `__series__${series}`,
    label: `📱 ${series}`,
  }))

  // Individual model options
  const individualModelOptions = allModels.map((m) => ({
    value: m,
    label: m,
  }))

  // Combined options: series first, then individual models
  const modelOptions = [...seriesOptions, ...individualModelOptions]

  // Custom handler for model selection that expands series
  const handleModelSelection = (selected: string[]) => {
    const expandedModels: string[] = []
    const regularModels: string[] = []

    for (const value of selected) {
      if (value.startsWith('__series__')) {
        const seriesKey = value.replace('__series__', '')
        const seriesModels = getModelsForSeries(seriesKey, allModels)
        expandedModels.push(...seriesModels)
      } else {
        regularModels.push(value)
      }
    }

    // Combine and deduplicate
    const uniqueModels = [...new Set([...regularModels, ...expandedModels])]
    updateFilter('models', uniqueModels)
  }

  const colorOptions = (filterOptions?.colors || []).map((c) => ({
    value: c,
    label: c,
  }))

  const warrantyOptions = (filterOptions?.warranties || []).map((w) => ({
    value: w,
    label: w,
  }))

  const sellerOptions = (filterOptions?.sellers || []).map((s) => ({
    value: s.phone,
    label: s.name || s.phone,
  }))

  const priceRange = filterOptions?.priceRange || { min: 0, max: 200000 }
  const storageRange = filterOptions?.storageRange || { min: 0, max: 1024 }
  const batteryRange = filterOptions?.batteryRange || { min: 0, max: 100 }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[400px] flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {hasActiveFilters(localFilters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-muted-foreground"
              >
                Clear All
              </Button>
            )}
          </div>
          <SheetDescription>
            Filter products by various criteria
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Active Products Filter */}
            <TimespanFilter
              label="Active Products"
              value={localFilters.activeInDays}
              onChange={(value) => updateFilter('activeInDays', value)}
            />

            <Separator />

            {/* Non-Empty Columns Filter */}
            <NonEmptyFilter
              selected={localFilters.nonEmptyColumns}
              onChange={(value) => updateFilter('nonEmptyColumns', value)}
            />

            <Separator />

            {/* Model Filter */}
            <MultiSelectFilter
              label="Model"
              options={modelOptions}
              selected={localFilters.models}
              onChange={handleModelSelection}
              placeholder="All models"
              searchPlaceholder="Search models..."
            />

            <Separator />

            {/* Price Range Filter */}
            <RangeFilterControl
              label="Price Range"
              min={priceRange.min}
              max={priceRange.max}
              step={1000}
              value={localFilters.priceRange}
              onChange={(value) => updateFilter('priceRange', value)}
              formatValue={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />

            <Separator />

            {/* Storage Range Filter */}
            <RangeFilterControl
              label="Storage (GB)"
              min={storageRange.min}
              max={storageRange.max}
              step={8}
              value={localFilters.storageRange}
              onChange={(value) => updateFilter('storageRange', value)}
              unit=" GB"
            />

            <Separator />

            {/* Battery Health Filter */}
            <RangeFilterControl
              label="Battery Health (%)"
              min={batteryRange.min}
              max={batteryRange.max}
              step={1}
              value={localFilters.batteryRange}
              onChange={(value) => updateFilter('batteryRange', value)}
              unit="%"
            />

            <Separator />

            {/* Color Filter */}
            <MultiSelectFilter
              label="Color"
              options={colorOptions}
              selected={localFilters.colors}
              onChange={(value) => updateFilter('colors', value)}
              placeholder="All colors"
              searchPlaceholder="Search colors..."
            />

            <Separator />

            {/* Warranty Filter */}
            <MultiSelectFilter
              label="Warranty"
              options={warrantyOptions}
              selected={localFilters.warranties}
              onChange={(value) => updateFilter('warranties', value)}
              placeholder="All warranties"
              searchPlaceholder="Search warranties..."
            />

            <Separator />

            {/* Seller Filter */}
            <MultiSelectFilter
              label="Seller"
              options={sellerOptions}
              selected={localFilters.sellers}
              onChange={(value) => updateFilter('sellers', value)}
              placeholder="All sellers"
              searchPlaceholder="Search sellers..."
            />
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
