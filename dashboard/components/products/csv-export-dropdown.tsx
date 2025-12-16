'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Download, FileSpreadsheet } from 'lucide-react'
import { generateCSV, downloadCSV, generateCSVFilename } from '@/lib/csv-utils'

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

interface CSVExportDropdownProps {
  filteredData: Product[]
  allData: Product[]
}

export function CSVExportDropdown({ filteredData, allData }: CSVExportDropdownProps) {
  const handleExportFiltered = () => {
    const csv = generateCSV(filteredData)
    const filename = generateCSVFilename('products_filtered')
    downloadCSV(csv, filename)
  }

  const handleExportAll = () => {
    const csv = generateCSV(allData)
    const filename = generateCSVFilename('products_all')
    downloadCSV(csv, filename)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportFiltered}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download View ({filteredData.length} rows)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportAll}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Download All ({allData.length} rows)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
