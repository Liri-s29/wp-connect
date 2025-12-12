'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUpDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  render: (item: T) => React.ReactNode
  sortable?: boolean
  sortValue?: (item: T) => string | number | Date | null | undefined
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading?: boolean
  onColumnReorder?: (activeId: string, overId: string) => void
}

type SortDirection = 'asc' | 'desc' | null

interface SortableTableHeadProps {
  column: Column<any>
  sortKey: string | null
  sortDirection: SortDirection
  onSort: (key: string) => void
  getSortIcon: (key: string) => React.ReactNode
  isDraggable: boolean
}

function SortableTableHead({
  column,
  sortKey,
  sortDirection,
  onSort,
  getSortIcon,
  isDraggable,
}: SortableTableHeadProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(
        'whitespace-nowrap',
        isDragging && 'opacity-50 bg-muted z-50'
      )}
    >
      <div className="flex items-center gap-1">
        {isDraggable && (
          <button
            className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-muted rounded touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
        {column.sortable ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-1 h-8 data-[state=open]:bg-accent"
            onClick={() => onSort(column.key)}
          >
            {column.header}
            {getSortIcon(column.key)}
          </Button>
        ) : (
          <span className="px-1">{column.header}</span>
        )}
      </div>
    </TableHead>
  )
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  onColumnReorder,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data

    const column = columns.find((c) => c.key === sortKey)
    if (!column?.sortValue) return data

    return [...data].sort((a, b) => {
      const aVal = column.sortValue!(a)
      const bVal = column.sortValue!(b)

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime()
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }, [data, sortKey, sortDirection, columns])

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-1 h-3 w-3" />
    if (sortDirection === 'asc') return <ArrowUp className="ml-1 h-3 w-3" />
    if (sortDirection === 'desc') return <ArrowDown className="ml-1 h-3 w-3" />
    return <ArrowUpDown className="ml-1 h-3 w-3" />
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && onColumnReorder) {
      onColumnReorder(active.id as string, over.id as string)
    }
  }

  const columnIds = columns.map((col) => col.key)
  const isDraggable = !!onColumnReorder

  const renderTableContent = () => (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          {isDraggable ? (
            <SortableContext
              items={columnIds}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((col) => (
                <SortableTableHead
                  key={col.key}
                  column={col}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  getSortIcon={getSortIcon}
                  isDraggable={isDraggable}
                />
              ))}
            </SortableContext>
          ) : (
            columns.map((col) => (
              <TableHead key={col.key} className="whitespace-nowrap">
                {col.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.header}
                    {getSortIcon(col.key)}
                  </Button>
                ) : (
                  col.header
                )}
              </TableHead>
            ))
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-center py-8 text-muted-foreground"
            >
              No data available
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((item, index) => (
            <TableRow key={index}>
              {columns.map((col) => (
                <TableCell key={col.key} className="whitespace-nowrap">
                  {col.render(item)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="border rounded-md overflow-hidden w-full">
      <div className="overflow-x-auto">
        {isDraggable ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {renderTableContent()}
          </DndContext>
        ) : (
          renderTableContent()
        )}
      </div>
    </div>
  )
}
