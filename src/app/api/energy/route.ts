import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/energy - Get energy status
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

    const farmState = await prisma.farmState.findUnique({
      where: { userId },
      select: {
        energy: true,
        maxEnergy: true,
        lastEnergyUpdate: true,
      },
    });

    if (!farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Calculate energy recovery since last update
    const now = new Date();
    const lastUpdate = new Date(farmState.lastEnergyUpdate);
    const minutesPassed = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
    const energyRecovered = Math.min(minutesPassed, farmState.maxEnergy - farmState.energy);

    const currentEnergy = Math.min(farmState.energy + energyRecovered, farmState.maxEnergy);

    return NextResponse.json({
      energy: currentEnergy,
      maxEnergy: farmState.maxEnergy,
      recoveryRate: 1, // 1 energy per minute
      nextRecoveryAt: currentEnergy < farmState.maxEnergy 
        ? new Date(now.getTime() + 60000) 
        : null,
    });
  } catch (error) {
    console.error('GET /api/energy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
