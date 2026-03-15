import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

const WATER_ENERGY_COST = 1;
const WATER_BOOST_MULTIPLIER = 1.1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, plotIndex } = body;

    if (!userId || plotIndex === undefined) {
      return NextResponse.json(
        { error: 'userId and plotIndex are required' },
        { status: 400 }
      );
    }

    // Get farm state
    const farmState = await prisma.farmState.findUnique({
      where: { userId },
      include: {
        landPlots: true,
      },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Check energy and handle recovery
    const now = new Date();
    let currentEnergy = farmState.energy;
    let lastEnergyUpdate = new Date(farmState.lastEnergyUpdate);

    if (currentEnergy < farmState.maxEnergy) {
      const msPassed = now.getTime() - lastEnergyUpdate.getTime();
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'energy_recovery_rate' },
      });
      const recoveryIntervalMinutes = (config?.value as any)?.intervalMinutes || 5;
      const msPerEnergy = recoveryIntervalMinutes * 60 * 1000;
      
      const energyToRecover = Math.floor(msPassed / msPerEnergy);
      if (energyToRecover > 0) {
        const actualRecovery = Math.min(energyToRecover, farmState.maxEnergy - currentEnergy);
        currentEnergy += actualRecovery;
        lastEnergyUpdate = new Date(lastEnergyUpdate.getTime() + actualRecovery * msPerEnergy);
      }
    }

    if (currentEnergy < WATER_ENERGY_COST) {
      return NextResponse.json(
        { error: 'Insufficient energy' },
        { status: 400 }
      );
    }

    // Water the crop
    await prisma.$transaction([
      prisma.landPlot.update({
        where: { id: plot.id },
        data: {
          boostMultiplier: plot.boostMultiplier * WATER_BOOST_MULTIPLIER,
          boostExpireAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          lastWateredAt: new Date(),
          nextWateringDue: new Date(Date.now() + 10 * 60 * 1000), // Next watering in 10 minutes
        } as any,
      }),
      prisma.farmState.update({
        where: { id: farmState.id },
        data: {
          energy: currentEnergy - WATER_ENERGY_COST,
          lastEnergyUpdate: currentEnergy - WATER_ENERGY_COST >= farmState.maxEnergy ? now : lastEnergyUpdate,
        },
      }),
    ]);

    // Fetch updated user with relations
    const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            farmState: {
                include: {
                    landPlots: true
                }
            },
            inventory: true
        }
    });

    if (!updatedUser) {
        throw new Error('User not found after update');
    }

    return NextResponse.json(mapUserToFrontend(updatedUser));

  } catch (error) {
    console.error('POST /api/farm/water error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
