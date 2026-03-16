import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GameService, GAME_CONSTANTS } from '@/services/gameService';

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

    // Use GameService to sync stamina before returning
    const syncResult = await GameService.syncUserStamina(userId);

    if (!syncResult) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    const { energy, maxEnergy, lastEnergyUpdate } = syncResult;

    // Get recovery interval for response info
    const recoveryIntervalMinutes = await GameService.getEnergyRecoveryInterval();
    const msPerEnergy = recoveryIntervalMinutes * 60 * 1000;

    return NextResponse.json({
      energy,
      maxEnergy,
      recoveryRate: 1 / recoveryIntervalMinutes, // energy per minute
      nextRecoveryAt: energy < maxEnergy 
        ? new Date(new Date(lastEnergyUpdate).getTime() + msPerEnergy) 
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
