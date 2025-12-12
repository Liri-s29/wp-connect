'use client'

import { useState, useCallback, useEffect } from 'react'
import { ProductFilters, ColumnKey } from '@/components/products/filter-controls/filter-types'

export type SavedView = {
  id: string
  name: string
  description: string | null
  filters: ProductFilters
  columns: ColumnKey[]
  columnOrder: ColumnKey[]
  sortKey: string | null
  sortDir: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all views
  const fetchViews = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/views')
      if (!response.ok) throw new Error('Failed to fetch views')
      const data = await response.json()
      setViews(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch views')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchViews()
  }, [fetchViews])

  // Create a new view
  const saveView = useCallback(
    async (viewData: {
      name: string
      description?: string
      filters: ProductFilters
      columns: ColumnKey[]
      columnOrder?: ColumnKey[]
      sortKey?: string | null
      sortDir?: 'asc' | 'desc' | null
      isDefault?: boolean
    }): Promise<SavedView | null> => {
      try {
        const response = await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(viewData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save view')
        }

        const newView = await response.json()
        await fetchViews() // Refresh list
        return newView
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save view')
        return null
      }
    },
    [fetchViews]
  )

  // Update an existing view
  const updateView = useCallback(
    async (
      id: string,
      viewData: Partial<{
        name: string
        description: string | null
        filters: ProductFilters
        columns: ColumnKey[]
        columnOrder: ColumnKey[]
        sortKey: string | null
        sortDir: 'asc' | 'desc' | null
        isDefault: boolean
      }>
    ): Promise<SavedView | null> => {
      try {
        const response = await fetch(`/api/views/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(viewData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update view')
        }

        const updatedView = await response.json()
        await fetchViews() // Refresh list
        return updatedView
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update view')
        return null
      }
    },
    [fetchViews]
  )

  // Delete a view
  const deleteView = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/views/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete view')
        }

        await fetchViews() // Refresh list
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete view')
        return false
      }
    },
    [fetchViews]
  )

  // Set a view as default
  const setDefaultView = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await updateView(id, { isDefault: true })
      return result !== null
    },
    [updateView]
  )

  // Get the default view
  const getDefaultView = useCallback((): SavedView | null => {
    return views.find((v) => v.isDefault) || null
  }, [views])

  return {
    views,
    isLoading,
    error,
    saveView,
    updateView,
    deleteView,
    setDefaultView,
    getDefaultView,
    refreshViews: fetchViews,
  }
}
