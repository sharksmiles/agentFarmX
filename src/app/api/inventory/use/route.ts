import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Use item (decrease quantity)
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventoryItem.id },
      data: {
        quantity: inventoryItem.quantity - quantity,
      },
    });

    // Apply item effect based on type
    let effect = null;
    if (itemType === 'energy_pack') {
      // Restore energy
      const farmState = await prisma.farmState.findUnique({
        where: { userId },
      });

      if (farmState) {
        const energyRestore = itemId === 'small' ? 20 : itemId === 'large' ? 50 : 100;
        effect = await prisma.farmState.update({
          where: { id: farmState.id },
          data: {
            energy: Math.min(farmState.energy + energyRestore, farmState.maxEnergy),
          },
        });
      }
    }

    return NextResponse.json({
      inventory: updatedInventory,
      effect,
    });
  } catch (error) {
    console.error('POST /api/inventory/use error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
