import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENERGY_PACKS = {
  small: { energy: 10, cost: 500, dailyLimit: 10 },
  large: { energy: 50, cost: 2000, dailyLimit: 5 },
  full: { energy: 0, cost: 100, dailyLimit: 3 }, // Cost per energy point, calculated dynamically
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pack } = body;

    if (!userId || !pack) {
      return NextResponse.json(
        { error: 'userId and pack are required' },
        { status: 400 }
      );
    }

    if (!(pack in ENERGY_PACKS)) {
      return NextResponse.json(
        { error: 'Invalid pack type' },
        { status: 400 }
      );
    }

    const packInfo = ENERGY_PACKS[pack as keyof typeof ENERGY_PACKS];

    // Get user and farm state
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: true,
      },
    });

    if (!user || !user.farmState) {
      return NextResponse.json(
        { error: 'User or farm state not found' },
        { status: 404 }
      );
    }

    // Check daily purchase limit
    const today = new Date().toISOString().split('T')[0];
    const purchaseKey = `energy_purchase_${userId}_${pack}_${today}`;
    
    const purchaseRecord = await prisma.systemConfig.findUnique({
      where: { key: purchaseKey },
    });

    const purchaseCount = (purchaseRecord?.value as any)?.count || 0;
    const dailyLimit = packInfo.dailyLimit;

    if (purchaseCount >= dailyLimit) {
      console.warn(`[Energy API] Daily limit reached for user ${userId}, pack ${pack}: ${purchaseCount}/${dailyLimit}`);
      return NextResponse.json(
        { 
          error: 'Daily purchase limit reached',
          details: {
            pack,
            limit: dailyLimit,
            purchased: purchaseCount,
            resetsAt: new Date(new Date(today).getTime() + 24 * 60 * 60 * 1000).toISOString()
          }
        },
        { status: 429 }
      );
    }

    // Calculate actual cost and energy for 'full' pack
    let actualCost = packInfo.cost;
    let actualEnergy = packInfo.energy;

    if (pack === 'full') {
      const energyNeeded = user.farmState.maxEnergy - user.farmState.energy;
      actualCost = energyNeeded * packInfo.cost; // 100 coins per energy point
      actualEnergy = energyNeeded;
    }

    // Check if user has enough coins
    if (user.farmCoins < actualCost) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    // Buy energy pack and update purchase count
    const newBalance = user.farmCoins - actualCost;
    const [updatedUser, updatedFarmState, transaction, _] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: newBalance,
        },
      }),
      prisma.farmState.update({
        where: { id: user.farmState.id },
        data: {
          energy: Math.min(
            user.farmState.energy + actualEnergy,
            user.farmState.maxEnergy
          ),
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'spend',
          category: 'energy',
          amount: actualCost,
          balance: newBalance,
          description: `Bought ${pack} energy pack (+${actualEnergy} energy)`,
        },
      }),
      // Update daily purchase count
      prisma.systemConfig.upsert({
        where: { key: purchaseKey },
        create: {
          key: purchaseKey,
          value: { count: 1, lastPurchase: new Date().toISOString() },
        },
        update: {
          value: { count: purchaseCount + 1, lastPurchase: new Date().toISOString() },
        },
      }),
    ]);

    return NextResponse.json({
      user: updatedUser,
      farmState: updatedFarmState,
      energyGained: actualEnergy,
      transaction,
      dailyPurchases: {
        count: purchaseCount + 1,
        limit: dailyLimit,
        remaining: dailyLimit - purchaseCount - 1,
      },
    });
  } catch (error) {
    console.error('POST /api/energy/buy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
