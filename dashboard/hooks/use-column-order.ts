'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { arrayMove } from '@dnd-kit/sortable'

interface UseColumnOrderOptions<T extends string> {
  defaultOrder: T[]
  storageKey?: string
  syncWithUrl?: boolean
}

export function useColumnOrder<T extends string>({
  defaultOrder,
  storageKey,
  syncWithUrl = true,
}: UseColumnOrderOptions<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialize from URL or default
  const [columnOrder, setColumnOrder] = useState<T[]>(() => {
    if (syncWithUrl) {
      const urlOrder = searchParams.get('columnOrder')
      if (urlOrder) {
        const parsed = urlOrder.split(',').filter(Boolean) as T[]
        // Validate that all columns exist in default order
        const validColumns = parsed.filter((col) => defaultOrder.includes(col))
        if (validColumns.length > 0) {
          return validColumns
        }
      }
    }
    return defaultOrder
  })

  // Update URL when column order changes
  const updateURL = useCallback(
    (newOrder: T[]) => {
      if (!syncWithUrl) return

      const params = new URLSearchParams(searchParams.toString())

      // Check if order is same as default
      const isDefault =
        newOrder.length === defaultOrder.length &&
        newOrder.every((col, idx) => col === defaultOrder[idx])

      if (isDefault) {
        params.delete('columnOrder')
      } else {
        params.set('columnOrder', newOrder.join(','))
      }

      const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newURL, { scroll: false })
    },
    [pathname, router, searchParams, defaultOrder, syncWithUrl]
  )

  // Reorder columns (called from drag-and-drop)
  const reorderColumns = useCallback(
    (activeId: string, overId: string) => {
      setColumnOrder((current) => {
        const oldIndex = current.indexOf(activeId as T)
        const newIndex = current.indexOf(overId as T)

        if (oldIndex === -1 || newIndex === -1) return current

        const newOrder = arrayMove(current, oldIndex, newIndex)
        updateURL(newOrder)
        return newOrder
      })
    },
    [updateURL]
  )

  // Set column order directly
  const setOrder = useCallback(
    (newOrder: T[]) => {
      setColumnOrder(newOrder)
      updateURL(newOrder)
    },
    [updateURL]
  )

  // Reset to default order
  const resetOrder = useCallback(() => {
    setColumnOrder(defaultOrder)
    updateURL(defaultOrder)
  }, [defaultOrder, updateURL])

  // Get ordered columns from a source array
  const getOrderedColumns = useCallback(
    <C extends { key: string }>(columns: C[]): C[] => {
      const columnMap = new Map(columns.map((col) => [col.key, col]))
      return columnOrder
        .map((key) => columnMap.get(key))
        .filter((col): col is C => col !== undefined)
    },
    [columnOrder]
  )

  return {
    columnOrder,
    reorderColumns,
    setOrder,
    resetOrder,
    getOrderedColumns,
  }
}
