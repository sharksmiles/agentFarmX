import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/inventory - Get user inventory
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const inventory = await prisma.inventory.findMany({
      where: { userId },
      orderBy: [
        { itemType: 'asc' },
        { itemId: 'asc' },
      ],
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Add item to inventory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, itemType, itemId, quantity = 1 } = body;

    if (!userId || !itemType || !itemId) {
      return NextResponse.json(
        { error: 'userId, itemType, and itemId are required' },
        { status: 400 }
      );
    }

    // Upsert inventory item
    const inventory = await prisma.inventory.upsert({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType,
          itemId,
        },
      },
      create: {
        userId,
        itemType,
        itemId,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
