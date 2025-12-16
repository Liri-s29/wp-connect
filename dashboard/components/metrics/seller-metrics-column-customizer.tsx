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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

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
}

const ALL_COLUMNS: ColumnDefinition[] = [
  { key: 'seller_name', label: 'Seller Name', group: 'basic' },
  { key: 'seller_contact', label: 'Contact', group: 'basic' },
  { key: 'city', label: 'City', group: 'basic' },
  { key: 'phones_last_week', label: 'Phones Last Week', group: 'metrics' },
  { key: 'active_avg_listings_week', label: 'Active Avg/Week', group: 'metrics' },
  { key: 'product_info_score', label: 'Product Info Score', group: 'metrics' },
  { key: 'avg_image_count', label: 'Avg Image Count', group: 'metrics' },
  { key: 'avg_listings_week', label: 'Avg Listing/Week', group: 'metrics' },
  { key: 'current_active_inventory', label: 'Active (3 days)', group: 'metrics' },
  { key: 'total_phones', label: 'Total Phones', group: 'metrics' },
  { key: 'seller_url', label: 'Seller URL', group: 'links' },
]

const DEFAULT_VISIBLE_COLUMNS: SellerMetricColumnKey[] = ALL_COLUMNS.map((col) => col.key)

interface SellerMetricsColumnCustomizerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visibleColumns: SellerMetricColumnKey[]
  onColumnsChange: (columns: SellerMetricColumnKey[]) => void
}

export function SellerMetricsColumnCustomizer({
  open,
  onOpenChange,
  visibleColumns,
  onColumnsChange,
}: SellerMetricsColumnCustomizerProps) {
  const [localColumns, setLocalColumns] = useState<Set<SellerMetricColumnKey>>(
    new Set(visibleColumns)
  )

  useEffect(() => {
    if (open) {
      setLocalColumns(new Set(visibleColumns))
    }
  }, [open, visibleColumns])

  const handleApply = () => {
    const orderedColumns = ALL_COLUMNS
      .filter((col) => localColumns.has(col.key))
      .map((col) => col.key)
    onColumnsChange(orderedColumns)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalColumns(new Set(visibleColumns))
    onOpenChange(false)
  }

  const handleReset = () => {
    setLocalColumns(new Set(DEFAULT_VISIBLE_COLUMNS))
  }

  const handleSelectAll = () => {
    setLocalColumns(new Set(ALL_COLUMNS.map((col) => col.key)))
  }

  const handleDeselectAll = () => {
    setLocalColumns(new Set())
  }

  const toggleColumn = (key: SellerMetricColumnKey) => {
    setLocalColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const basicColumns = ALL_COLUMNS.filter((col) => col.group === 'basic')
  const metricsColumns = ALL_COLUMNS.filter((col) => col.group === 'metrics')
  const linksColumns = ALL_COLUMNS.filter((col) => col.group === 'links')

  const renderColumnGroup = (
    title: string,
    columns: ColumnDefinition[]
  ) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
      <div className="space-y-2">
        {columns.map((column) => (
          <div key={column.key} className="flex items-center space-x-2">
            <Checkbox
              id={column.key}
              checked={localColumns.has(column.key)}
              onCheckedChange={() => toggleColumn(column.key)}
            />
            <Label
              htmlFor={column.key}
              className="text-sm font-normal cursor-pointer"
            >
              {column.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[350px] sm:max-w-[350px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Customize Columns</SheetTitle>
          <SheetDescription>
            Select which columns to display in the table
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-2 py-3">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            Deselect All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>

        <Separator />

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {renderColumnGroup('Basic Information', basicColumns)}
            <Separator />
            {renderColumnGroup('Performance Metrics', metricsColumns)}
            <Separator />
            {renderColumnGroup('Links', linksColumns)}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
            disabled={localColumns.size === 0}
          >
            Apply ({localColumns.size} columns)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
