import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GameService } from '@/services/gameService';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Energy Recovery] Starting...');

    // Find farms that need energy recovery (energy < maxEnergy)
    // Prisma does not support comparing two columns directly in 'where' using standard syntax.
    // Fetch all potentially under-energy farms and filter in service layer logic.
    const farmStates = await prisma.farmState.findMany({
      where: {
        energy: { lt: 1000 }, // Assume maxEnergy is always <= 1000
      },
      select: {
        userId: true,
        energy: true,
        maxEnergy: true,
      },
    });

    // Only process those truly below max
    const farmsToSync = farmStates.filter(f => f.energy < f.maxEnergy);

    console.log(`[Energy Recovery] Found ${farmsToSync.length} farms truly needing recovery`);

    let updatedCount = 0;

    // Batch process to avoid timeout
    const BATCH_SIZE = 50;
    for (let i = 0; i < farmsToSync.length; i += BATCH_SIZE) {
      const batch = farmsToSync.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (farm) => {
          const result = await GameService.syncUserStamina(farm.userId);
          if (result && result.recovered > 0) {
            updatedCount++;
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Energy Recovery] Completed in ${duration}ms. Updated ${updatedCount} farms`
    );

    return NextResponse.json({
      success: true,
      updatedCount,
      duration,
    });
  } catch (error) {
    console.error('[Energy Recovery] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
