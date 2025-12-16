// CSV generation utilities

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

// Escape CSV values properly
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    // Escape quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

// Format price for CSV
function formatPrice(priceRaw: any, currency: string | null): string {
  if (priceRaw == null) return ''
  const value = typeof priceRaw === 'object' ? Number(priceRaw) : priceRaw
  if (currency) {
    return `${currency} ${value}`
  }
  return String(value)
}

// Format date for CSV
function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

// Column definitions for CSV export
const CSV_COLUMNS = [
  { key: 'id', header: 'Product ID', getValue: (p: Product) => p.id },
  { key: 'name', header: 'Name', getValue: (p: Product) => p.rawName || p.modelName || '' },
  { key: 'description', header: 'Description', getValue: (p: Product) => p.rawDescription || '' },
  { key: 'price', header: 'Price', getValue: (p: Product) => formatPrice(p.priceRaw, p.currency) },
  { key: 'currency', header: 'Currency', getValue: (p: Product) => p.currency || '' },
  { key: 'model', header: 'Model', getValue: (p: Product) => p.modelName || '' },
  { key: 'storage', header: 'Storage', getValue: (p: Product) => p.storageGb || '' },
  { key: 'color', header: 'Color', getValue: (p: Product) => p.color || '' },
  { key: 'warranty', header: 'Warranty', getValue: (p: Product) => p.warranty || '' },
  { key: 'batteryHealth', header: 'Battery Health', getValue: (p: Product) => p.batteryHealth || '' },
  { key: 'availability', header: 'Availability', getValue: (p: Product) => p.availability || '' },
  { key: 'sellerName', header: 'Seller Name', getValue: (p: Product) => p.seller.name || '' },
  { key: 'sellerPhone', header: 'Seller Phone', getValue: (p: Product) => p.seller.phoneNumber },
  { key: 'sellerCity', header: 'Seller City', getValue: (p: Product) => p.seller.city || '' },
  { key: 'isActive', header: 'Is Active', getValue: (p: Product) => p.isActive ? 'Yes' : 'No' },
  { key: 'firstSeenAt', header: 'First Seen', getValue: (p: Product) => formatDate(p.firstSeenAt) },
  { key: 'lastSeenAt', header: 'Last Seen', getValue: (p: Product) => formatDate(p.lastSeenAt) },
  { key: 'lastModifiedAt', header: 'Last Modified', getValue: (p: Product) => formatDate(p.lastModifiedAt) },
  {
    key: 'productUrl',
    header: 'Product URL',
    getValue: (p: Product) => `https://web.whatsapp.com/product/${p.id}/${p.sellerPhone}`,
  },
]

// Generate CSV content from products
export function generateCSV(products: Product[]): string {
  // Header row
  const headers = CSV_COLUMNS.map((col) => col.header)
  const headerRow = headers.map(escapeCSVValue).join(',')

  // Data rows
  const dataRows = products.map((product) => {
    const values = CSV_COLUMNS.map((col) => escapeCSVValue(col.getValue(product)))
    return values.join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

// Download CSV file
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL object
  URL.revokeObjectURL(url)
}

// Generate filename with timestamp
export function generateCSVFilename(prefix: string = 'products'): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
  return `${prefix}_${timestamp}.csv`
}
