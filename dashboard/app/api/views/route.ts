import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List all saved views
export async function GET() {
  try {
    const views = await prisma.savedView.findMany({
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json(views)
  } catch (error) {
    console.error('Error fetching saved views:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved views' },
      { status: 500 }
    )
  }
}

// POST - Create a new saved view
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, filters, columns, columnOrder, sortKey, sortDir, isDefault } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'View name is required' },
        { status: 400 }
      )
    }

    // If this view is set as default, unset any existing default
    if (isDefault) {
      await prisma.savedView.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const view = await prisma.savedView.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        filters: filters || {},
        columns: columns || [],
        columnOrder: columnOrder || [],
        sortKey: sortKey || null,
        sortDir: sortDir || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(view, { status: 201 })
  } catch (error) {
    console.error('Error creating saved view:', error)
    return NextResponse.json(
      { error: 'Failed to create saved view' },
      { status: 500 }
    )
  }
}
