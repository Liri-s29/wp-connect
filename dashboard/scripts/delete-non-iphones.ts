import { PrismaClient } from '@prisma/client'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Load environment variables
loadEnv({ path: resolve(process.cwd(), '.env.local') })
loadEnv()

const prisma = new PrismaClient()

interface EnrichedProduct {
  id: string
  modelName: string | null
}

async function main() {
  // Read the enriched products file
  const enrichedPath = resolve(__dirname, '../../gpt/products.enriched.json')
  const enrichedData: EnrichedProduct[] = JSON.parse(readFileSync(enrichedPath, 'utf-8'))

  // Get IDs of products to DELETE (EXCLUDE or null modelName)
  const idsToDelete = enrichedData
    .filter((p) => p.modelName === 'EXCLUDE' || p.modelName === null)
    .map((p) => p.id)

  console.log(`Found ${idsToDelete.length} products to delete (non-iPhone models)`)
  console.log(`Keeping ${enrichedData.length - idsToDelete.length} iPhone products`)

  if (idsToDelete.length === 0) {
    console.log('No products to delete.')
    return
  }

  // First, delete related product history entries
  console.log('\nDeleting product history entries...')
  const historyDeleteResult = await prisma.productHistory.deleteMany({
    where: {
      productId: {
        in: idsToDelete,
      },
    },
  })
  console.log(`Deleted ${historyDeleteResult.count} history entries`)

  // Then delete the products
  console.log('\nDeleting products...')
  const productDeleteResult = await prisma.product.deleteMany({
    where: {
      id: {
        in: idsToDelete,
      },
    },
  })
  console.log(`Deleted ${productDeleteResult.count} products`)

  // Show remaining products count
  const remainingCount = await prisma.product.count()
  console.log(`\nRemaining products in database: ${remainingCount}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
