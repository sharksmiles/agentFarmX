import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Sell prices for different items
const SELL_PRICES = {
  crop: {
    Apple: 10,
    Wheat: 5,
    Corn: 8,
    Tomato: 7,
  },
};

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

    // Find inventory item
    const inventoryItem = await prisma.inventory.findUnique({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType,
          itemId,
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Item not found in inventory' },
        { status: 404 }
      );
    }

    if (inventoryItem.quantity < quantity) {
      return NextResponse.json(
        { error: 'Insufficient quantity' },
        { status: 400 }
      );
    }

    // Calculate sell price
    let sellPrice = 0;
    if (itemType === 'crop' && itemId in SELL_PRICES.crop) {
      sellPrice = SELL_PRICES.crop[itemId as keyof typeof SELL_PRICES.crop] * quantity;
    } else {
      return NextResponse.json(
        { error: 'Item cannot be sold' },
        { status: 400 }
      );
    }

    // Sell item
    const [updatedInventory, updatedUser, transaction] = await prisma.$transaction([
      prisma.inventory.update({
        where: { id: inventoryItem.id },
        data: {
          quantity: inventoryItem.quantity - quantity,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: sellPrice },
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'earn',
          category: 'sell',
          amount: sellPrice,
          description: `Sold ${quantity}x ${itemId}`,
        },
      }),
    ]);

    return NextResponse.json({
      inventory: updatedInventory,
      user: updatedUser,
      sellPrice,
      transaction,
    });
  } catch (error) {
    console.error('POST /api/inventory/sell error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
