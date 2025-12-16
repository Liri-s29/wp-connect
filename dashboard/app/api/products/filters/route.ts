import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch distinct values from the database
    const [models, colors, warranties, conditions, sellers, priceStats, storageStats, batteryStats] =
      await Promise.all([
        // Distinct model names (excluding nulls)
        prisma.product.findMany({
          where: { modelName: { not: null } },
          select: { modelName: true },
          distinct: ['modelName'],
          orderBy: { modelName: 'asc' },
        }),

        // Distinct colors (excluding nulls)
        prisma.product.findMany({
          where: { color: { not: null } },
          select: { color: true },
          distinct: ['color'],
          orderBy: { color: 'asc' },
        }),

        // Distinct warranties (excluding nulls)
        prisma.product.findMany({
          where: { warranty: { not: null } },
          select: { warranty: true },
          distinct: ['warranty'],
          orderBy: { warranty: 'asc' },
        }),

        // Distinct conditions (excluding nulls)
        prisma.product.findMany({
          where: { condition: { not: null } },
          select: { condition: true },
          distinct: ['condition'],
          orderBy: { condition: 'asc' },
        }),

        // Sellers list
        prisma.seller.findMany({
          select: { phoneNumber: true, name: true },
          orderBy: { name: 'asc' },
        }),

        // Price range (min/max)
        prisma.product.aggregate({
          _min: { priceRaw: true },
          _max: { priceRaw: true },
          where: { priceRaw: { not: null } },
        }),

        // Storage values for range
        prisma.product.findMany({
          where: { storageGb: { not: null } },
          select: { storageGb: true },
          distinct: ['storageGb'],
        }),

        // Battery health values for range
        prisma.product.findMany({
          where: { batteryHealth: { not: null } },
          select: { batteryHealth: true },
          distinct: ['batteryHealth'],
        }),
      ])

    // Parse storage values to get numeric range
    const storageValues = storageStats
      .map((s) => {
        const match = s.storageGb?.match(/(\d+)/i)
        return match ? Number(match[1]) : null
      })
      .filter((v): v is number => v !== null)

    // Parse battery values to get numeric range
    const batteryValues = batteryStats
      .map((b) => {
        const match = b.batteryHealth?.match(/(\d+)/i)
        return match ? Number(match[1]) : null
      })
      .filter((v): v is number => v !== null)

    const response = {
      models: models.map((m) => m.modelName).filter(Boolean) as string[],
      colors: colors.map((c) => c.color).filter(Boolean) as string[],
      warranties: warranties.map((w) => w.warranty).filter(Boolean) as string[],
      conditions: conditions.map((c) => c.condition).filter(Boolean) as string[],
      sellers: sellers.map((s) => ({
        phone: s.phoneNumber,
        name: s.name,
      })),
      priceRange: {
        min: priceStats._min.priceRaw ? Number(priceStats._min.priceRaw) : 0,
        max: priceStats._max.priceRaw ? Number(priceStats._max.priceRaw) : 200000,
      },
      storageRange: {
        min: storageValues.length > 0 ? Math.min(...storageValues) : 0,
        max: storageValues.length > 0 ? Math.max(...storageValues) : 1024,
      },
      batteryRange: {
        min: batteryValues.length > 0 ? Math.min(...batteryValues) : 0,
        max: batteryValues.length > 0 ? Math.max(...batteryValues) : 100,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching filter options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    )
  }
}
