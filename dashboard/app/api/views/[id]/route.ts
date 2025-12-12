import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get a single view
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const view = await prisma.savedView.findUnique({
      where: { id: params.id },
    })

    if (!view) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(view)
  } catch (error) {
    console.error('Error fetching saved view:', error)
    return NextResponse.json(
      { error: 'Failed to fetch saved view' },
      { status: 500 }
    )
  }
}

// PUT - Update a saved view
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, filters, columns, columnOrder, sortKey, sortDir, isDefault } = body

    // Check if view exists
    const existingView = await prisma.savedView.findUnique({
      where: { id: params.id },
    })

    if (!existingView) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      )
    }

    // If this view is being set as default, unset any existing default
    if (isDefault && !existingView.isDefault) {
      await prisma.savedView.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    }

    const view = await prisma.savedView.update({
      where: { id: params.id },
      data: {
        name: name?.trim() ?? existingView.name,
        description: description !== undefined ? description?.trim() || null : existingView.description,
        filters: filters ?? existingView.filters,
        columns: columns ?? existingView.columns,
        columnOrder: columnOrder ?? existingView.columnOrder,
        sortKey: sortKey !== undefined ? sortKey : existingView.sortKey,
        sortDir: sortDir !== undefined ? sortDir : existingView.sortDir,
        isDefault: isDefault ?? existingView.isDefault,
      },
    })

    return NextResponse.json(view)
  } catch (error) {
    console.error('Error updating saved view:', error)
    return NextResponse.json(
      { error: 'Failed to update saved view' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a saved view
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if view exists
    const existingView = await prisma.savedView.findUnique({
      where: { id: params.id },
    })

    if (!existingView) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      )
    }

    await prisma.savedView.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved view:', error)
    return NextResponse.json(
      { error: 'Failed to delete saved view' },
      { status: 500 }
    )
  }
}
