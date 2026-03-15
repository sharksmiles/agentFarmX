import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: {
          include: {
            landPlots: {
              orderBy: { plotIndex: 'asc' },
            },
          },
        },
        inventory: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate energy recovery since last update
    const now = new Date();
    const farmState = user.farmState;
    if (farmState) {
      if (farmState.energy < farmState.maxEnergy) {
        const lastUpdate = new Date(farmState.lastEnergyUpdate);
        const msPassed = now.getTime() - lastUpdate.getTime();
        
        // Get energy recovery rate
        const config = await prisma.systemConfig.findUnique({
          where: { key: 'energy_recovery_rate' },
        });
        const recoveryIntervalMinutes = (config?.value as any)?.intervalMinutes || 5;
        const msPerEnergy = recoveryIntervalMinutes * 60 * 1000;

        const energyToRecover = Math.floor(msPassed / msPerEnergy);

        if (energyToRecover > 0) {
          const actualRecovery = Math.min(
            energyToRecover,
            farmState.maxEnergy - farmState.energy
          );
          
          const newLastUpdate = new Date(lastUpdate.getTime() + actualRecovery * msPerEnergy);

          const updatedFarmState = await prisma.farmState.update({
            where: { id: farmState.id },
            data: {
              energy: Math.min(farmState.energy + actualRecovery, farmState.maxEnergy),
              lastEnergyUpdate: farmState.energy + actualRecovery >= farmState.maxEnergy ? now : newLastUpdate,
            },
          });
          // Update the object in memory for mapping
          user.farmState = {
            ...farmState,
            ...updatedFarmState
          };
        }
      } else {
        // If energy is already full, keep lastEnergyUpdate current
        if (new Date(farmState.lastEnergyUpdate).getTime() < now.getTime() - 60000) {
          const updatedFarmState = await prisma.farmState.update({
            where: { id: farmState.id },
            data: { lastEnergyUpdate: now },
          });
          user.farmState = {
            ...farmState,
            ...updatedFarmState
          };
        }
      }
    }

    const mappedUser = mapUserToFrontend(user);

    return NextResponse.json({ farmState: mappedUser.farm_stats });
  } catch (error) {
    console.error('GET /api/farm/state error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
