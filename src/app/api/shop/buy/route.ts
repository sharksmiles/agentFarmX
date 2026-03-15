import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

// Crop seed prices (should match game config)
const CROP_PRICES: Record<string, number> = {
  Wheat: 10,
  Corn: 20,
  Potato: 30,
  Tomato: 40,
  Carrot: 50,
  Cucumber: 60,
  Celery: 70,
  Garlic: 80,
  Cabbage: 90,
  Apple: 100,
  Banana: 120,
  Pear: 140,
  Lemon: 160,
  Pumpkin: 180,
  Strawberry: 200,
  Pineapple: 250,
  Peach: 300,
  Watermelon: 350,
  Cherry: 400,
  Grapes: 450,
  Kiwi: 500,
  Eggplant: 550,
  Chilli: 600,
  Sugarcane: 650,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, quantities } = body;

    if (!userId || !quantities || typeof quantities !== 'object') {
      return NextResponse.json(
        { error: 'userId and quantities are required' },
        { status: 400 }
      );
    }

    // Calculate total cost
    let totalCost = 0;
    const invalidCrops: string[] = [];

    for (const [cropName, quantity] of Object.entries(quantities)) {
      if (typeof quantity !== 'number' || quantity <= 0) {
        continue;
      }

      const price = CROP_PRICES[cropName];
      if (!price) {
        invalidCrops.push(cropName);
        continue;
      }

      totalCost += price * quantity;
    }

    if (invalidCrops.length > 0) {
      return NextResponse.json(
        { error: `Invalid crops: ${invalidCrops.join(', ')}` },
        { status: 400 }
      );
    }

    if (totalCost === 0) {
      return NextResponse.json(
        { error: 'No valid items to purchase' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has enough coins
    if (user.farmCoins < totalCost) {
      console.warn(`[Shop API] Insufficient coins for user ${userId}: has ${user.farmCoins}, needs ${totalCost}`);
      return NextResponse.json(
        { 
          error: 'Insufficient coins',
          details: {
            required: totalCost,
            available: user.farmCoins,
            shortage: totalCost - user.farmCoins
          }
        },
        { status: 400 }
      );
    }

    // Process purchase in transaction
    const newBalance = user.farmCoins - totalCost;
    const operations: any[] = [];

    // Deduct coins
    operations.push(
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: newBalance,
        },
      })
    );

    // Add items to inventory
    for (const [cropName, quantity] of Object.entries(quantities)) {
      if (typeof quantity !== 'number' || quantity <= 0) {
        continue;
      }

      operations.push(
        prisma.inventory.upsert({
          where: {
            userId_itemType_itemId: {
              userId,
              itemType: 'crop',
              itemId: cropName,
            },
          },
          create: {
            userId,
            itemType: 'crop',
            itemId: cropName,
            quantity: quantity as number,
          },
          update: {
            quantity: {
              increment: quantity as number,
            },
          },
        })
      );
    }

    // Create transaction record
    operations.push(
      prisma.transaction.create({
        data: {
          userId,
          type: 'spend',
          category: 'shop',
          amount: totalCost,
          balance: newBalance,
          description: `Purchased seeds: ${Object.entries(quantities)
            .filter(([_, q]) => typeof q === 'number' && (q as number) > 0)
            .map(([crop, q]) => `${crop} x${q}`)
            .join(', ')}`,
        },
      })
    );

    await prisma.$transaction(operations);

    // Fetch updated user with relations
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
        inventory: true,
      },
    });

    if (!updatedUser) {
      throw new Error('User not found after update');
    }

    return NextResponse.json(mapUserToFrontend(updatedUser));
  } catch (error) {
    console.error('POST /api/shop/buy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
