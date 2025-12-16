// Filter types for the products table
// This modular design allows easy addition/removal of filter columns

export type RangeFilterValue = {
  min: number | null
  max: number | null
}

export type TimespanFilterValue = number | null // Days (3, 5, 7, 14, etc.)

// Columns that can be filtered for non-empty values
export type NonEmptyFilterableColumn =
  | 'modelName'
  | 'storageGb'
  | 'color'
  | 'warranty'
  | 'batteryHealth'
  | 'condition'
  | 'priceRaw'
  | 'rawDescription'

export const NON_EMPTY_FILTERABLE_COLUMNS: { key: NonEmptyFilterableColumn; label: string }[] = [
  { key: 'modelName', label: 'Model' },
  { key: 'storageGb', label: 'Storage' },
  { key: 'color', label: 'Color' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'batteryHealth', label: 'Battery Health' },
  { key: 'condition', label: 'Condition' },
  { key: 'priceRaw', label: 'Price' },
  { key: 'rawDescription', label: 'Description' },
]

export type ProductFilters = {
  // Multi-select filters
  models: string[]
  colors: string[]
  warranties: string[]
  sellers: string[]

  // Range filters (slider)
  priceRange: RangeFilterValue
  storageRange: RangeFilterValue
  batteryRange: RangeFilterValue
  imageCountRange: RangeFilterValue

  // Time-based filter
  activeInDays: TimespanFilterValue

  // Boolean filters
  isActive: boolean | null

  // Non-empty column filters
  nonEmptyColumns: NonEmptyFilterableColumn[]
}

export const DEFAULT_FILTERS: ProductFilters = {
  models: [],
  colors: [],
  warranties: [],
  sellers: [],
  priceRange: { min: null, max: null },
  storageRange: { min: null, max: null },
  batteryRange: { min: null, max: null },
  imageCountRange: { min: null, max: null },
  activeInDays: null,
  isActive: null,
  nonEmptyColumns: [],
}

// Filter options fetched from DB
export type FilterOptions = {
  models: string[]
  colors: string[]
  warranties: string[]
  conditions: string[]
  sellers: { phone: string; name: string | null }[]
  priceRange: { min: number; max: number }
  storageRange: { min: number; max: number }
  batteryRange: { min: number; max: number }
  imageCountRange: { min: number; max: number }
}

// Column definitions for products table
export type ColumnKey =
  | 'name'
  | 'description'
  | 'price'
  | 'model'
  | 'storage'
  | 'color'
  | 'warranty'
  | 'batteryHealth'
  | 'condition'
  | 'imageCount'
  | 'seller'
  | 'sellerCity'
  | 'sellerCatalogUrl'
  | 'link'
  | 'lastModifiedAt'
  | 'firstSeenAt'
  | 'availability'

export type ColumnDefinition = {
  key: ColumnKey
  label: string
  group: 'basic' | 'device' | 'metadata'
  defaultVisible: boolean
}

export const ALL_COLUMNS: ColumnDefinition[] = [
  { key: 'name', label: 'Name', group: 'basic', defaultVisible: true },
  { key: 'description', label: 'Description', group: 'basic', defaultVisible: true },
  { key: 'price', label: 'Price', group: 'basic', defaultVisible: true },
  { key: 'model', label: 'Model', group: 'device', defaultVisible: true },
  { key: 'storage', label: 'Storage', group: 'device', defaultVisible: true },
  { key: 'color', label: 'Color', group: 'device', defaultVisible: true },
  { key: 'warranty', label: 'Warranty', group: 'device', defaultVisible: true },
  { key: 'batteryHealth', label: 'Battery Health', group: 'device', defaultVisible: true },
  { key: 'condition', label: 'Condition', group: 'device', defaultVisible: true },
  { key: 'imageCount', label: 'Image Count', group: 'device', defaultVisible: true },
  { key: 'seller', label: 'Seller', group: 'basic', defaultVisible: true },
  { key: 'sellerCity', label: 'Seller City', group: 'basic', defaultVisible: false },
  { key: 'sellerCatalogUrl', label: 'Catalog URL', group: 'basic', defaultVisible: false },
  { key: 'link', label: 'Product URL', group: 'basic', defaultVisible: true },
  { key: 'availability', label: 'Availability', group: 'metadata', defaultVisible: false },
  { key: 'lastModifiedAt', label: 'Last Modified', group: 'metadata', defaultVisible: false },
  { key: 'firstSeenAt', label: 'First Seen', group: 'metadata', defaultVisible: false },
]

export const DEFAULT_VISIBLE_COLUMNS: ColumnKey[] = ALL_COLUMNS
  .filter((col) => col.defaultVisible)
  .map((col) => col.key)

// Active products time options
export const ACTIVE_TIME_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
]

// Helper to check if filters are active (different from defaults)
export function hasActiveFilters(filters: ProductFilters): boolean {
  return (
    filters.models.length > 0 ||
    filters.colors.length > 0 ||
    filters.warranties.length > 0 ||
    filters.sellers.length > 0 ||
    filters.priceRange.min !== null ||
    filters.priceRange.max !== null ||
    filters.storageRange.min !== null ||
    filters.storageRange.max !== null ||
    filters.batteryRange.min !== null ||
    filters.batteryRange.max !== null ||
    filters.imageCountRange.min !== null ||
    filters.imageCountRange.max !== null ||
    filters.activeInDays !== null ||
    filters.isActive !== null ||
    filters.nonEmptyColumns.length > 0
  )
}

// Count active filters
export function countActiveFilters(filters: ProductFilters): number {
  let count = 0
  if (filters.models.length > 0) count++
  if (filters.colors.length > 0) count++
  if (filters.warranties.length > 0) count++
  if (filters.sellers.length > 0) count++
  if (filters.priceRange.min !== null || filters.priceRange.max !== null) count++
  if (filters.storageRange.min !== null || filters.storageRange.max !== null) count++
  if (filters.batteryRange.min !== null || filters.batteryRange.max !== null) count++
  if (filters.imageCountRange.min !== null || filters.imageCountRange.max !== null) count++
  if (filters.activeInDays !== null) count++
  if (filters.isActive !== null) count++
  if (filters.nonEmptyColumns.length > 0) count += filters.nonEmptyColumns.length
  return count
}
