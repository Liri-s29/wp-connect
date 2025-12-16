import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const runs = await prisma.scraperRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(runs)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch runs' },
      { status: 500 }
    )
  }
}
