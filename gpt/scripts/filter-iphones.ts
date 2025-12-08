import * as fs from 'fs'
import * as path from 'path'

interface Product {
  id: string
  name: string
  description: string
  availability: string
  priceRaw: string
  priceFormatted: string
  currency: string
  productUrl: string
  sellerPhone: string
  sellerName?: string
  sellerCity?: string
  sellerCatalogueUrl?: string
}

// Strict iPhone detection
function isIPhone(product: Product): boolean {
  const name = product.name.toLowerCase()
  const desc = (product.description || '').toLowerCase()

  // Check if name contains iPhone variants
  const iphoneInName =
    /iphone|i\s*phone|i-phone/.test(name) ||
    /^iph\s*\d/.test(name) || // "Iph 11", "Iph 13"
    /^\d+\s*(pro|plus|max)?\s*\d*\s*gb/i.test(name) // "14 Pro 256gb" style

  // Also check description for iPhone mentions (seller sometimes puts model in desc)
  const iphoneInDesc = /iphone|i\s*phone/.test(desc)

  // Must have iPhone keyword somewhere
  if (!iphoneInName && !iphoneInDesc) return false

  // If name has iPhone, it's likely a phone (not accessory)
  if (iphoneInName) {
    // Exclude if name is PRIMARILY an accessory (name starts with accessory word)
    const accessoryStartPatterns = [
      /^case\b/,
      /^cover\b/,
      /^strap\b/,
      /^charger\b/,
      /^cable\b/,
      /^adapter\b/,
      /^screen\s*guard/,
      /^tempered/,
      /^protector/,
      /^airpod/,
      /^earbud/,
      /^tws\b/,
      /^speaker/,
      /^powerbank/,
      /^power\s*bank/,
    ]

    for (const pattern of accessoryStartPatterns) {
      if (pattern.test(name)) return false
    }

    return true
  }

  // If iPhone only in description, be more careful
  // This catches cases where name is just "14 Pro 256gb"
  if (iphoneInDesc) {
    // Name should look like a phone model
    const looksLikeModel =
      /^\d+\s*(pro|plus|max|mini)?/i.test(name) ||
      /^(xs|xr|se|x)\b/i.test(name) ||
      /pro\s*max/i.test(name)

    if (looksLikeModel) return true
  }

  return false
}

// Categorize why products were excluded
function categorizeExcluded(product: Product): string {
  const name = product.name.toLowerCase()

  if (/ipad/.test(name)) return 'iPad'
  if (/samsung|galaxy/.test(name)) return 'Samsung'
  if (/redmi|xiaomi|mi\s*\d/.test(name)) return 'Xiaomi/Redmi'
  if (/pixel/.test(name)) return 'Google Pixel'
  if (/oppo/.test(name)) return 'Oppo'
  if (/vivo/.test(name)) return 'Vivo'
  if (/realme/.test(name)) return 'Realme'
  if (/oneplus|one\s*plus/.test(name)) return 'OnePlus'
  if (/poco/.test(name)) return 'Poco'
  if (/iqoo/.test(name)) return 'iQOO'
  if (/nothing/.test(name)) return 'Nothing'
  if (/moto/.test(name)) return 'Motorola'
  if (/case|cover|protector|guard|glass/.test(name)) return 'Cases/Covers'
  if (/charger|cable|adapter|adaptor/.test(name)) return 'Chargers/Cables'
  if (/strap|band/.test(name)) return 'Straps/Bands'
  if (/airpod|earbud|tws|headphone|earphone/.test(name)) return 'Audio'
  if (/speaker/.test(name)) return 'Speakers'
  if (/powerbank|power\s*bank/.test(name)) return 'Powerbanks'
  if (/watch/.test(name)) return 'Watches'
  if (/tripod|stand|holder|mount/.test(name)) return 'Stands/Holders'
  if (/trimmer|shaver/.test(name)) return 'Grooming'
  if (/keyboard|mouse/.test(name)) return 'Peripherals'
  if (/game|controller/.test(name)) return 'Gaming'
  if (/light|lamp|led/.test(name)) return 'Lighting'
  if (/contact|address|price\s*list|update/.test(name)) return 'Non-product listings'

  return 'Other'
}

async function main() {
  const inputPath = path.resolve(__dirname, '../products.json')
  const outputPath = path.resolve(__dirname, '../products-filtered.json')

  if (!fs.existsSync(inputPath)) {
    console.error('products.json not found')
    process.exit(1)
  }

  const products: Product[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  console.log(`Loaded ${products.length} products`)

  // Filter to only iPhones
  const filtered = products.filter(isIPhone)
  const excluded = products.filter((p) => !isIPhone(p))

  // Categorize excluded
  const categories: Record<string, string[]> = {}
  for (const p of excluded) {
    const cat = categorizeExcluded(p)
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(p.name)
  }

  console.log('\n=== Filtering Results ===')
  console.log(`Total products: ${products.length}`)
  console.log(`iPhones kept: ${filtered.length}`)
  console.log(`Non-iPhones removed: ${excluded.length}`)

  console.log('\n=== Excluded by Category ===')
  const sortedCats = Object.entries(categories).sort((a, b) => b[1].length - a[1].length)
  for (const [cat, items] of sortedCats) {
    console.log(`\n${cat}: ${items.length}`)
    // Show first 3 examples
    items.slice(0, 3).forEach((name) => console.log(`  - ${name.substring(0, 60)}`))
  }

  // Write filtered output
  fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2))
  console.log(`\n✓ Filtered products saved to: products-filtered.json`)

  // Sample of kept iPhones
  console.log('\n=== Sample of kept iPhones ===')
  filtered.slice(0, 10).forEach((p) => {
    console.log(`  - ${p.name} | ${p.description?.substring(0, 30) || ''}`)
  })
}

main().catch(console.error)
