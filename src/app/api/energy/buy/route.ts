import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ENERGY_PACKS = {
  small: { energy: 20, cost: 50 },
  large: { energy: 50, cost: 100 },
  full: { energy: 100, cost: 150 },
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

    // Check if user has enough coins
    if (user.farmCoins < packInfo.cost) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    // Buy energy pack
    const [updatedUser, updatedFarmState, transaction] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: user.farmCoins - packInfo.cost,
        },
      }),
      prisma.farmState.update({
        where: { id: user.farmState.id },
        data: {
          energy: Math.min(
            user.farmState.energy + packInfo.energy,
            user.farmState.maxEnergy
          ),
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'spend',
          category: 'energy',
          amount: packInfo.cost,
          description: `Bought ${pack} energy pack (+${packInfo.energy} energy)`,
        },
      }),
    ]);

    return NextResponse.json({
      user: updatedUser,
      farmState: updatedFarmState,
      energyGained: packInfo.energy,
      transaction,
    });
  } catch (error) {
    console.error('POST /api/energy/buy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
