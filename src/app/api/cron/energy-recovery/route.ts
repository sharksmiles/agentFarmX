import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get energy recovery config
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'energy_recovery_rate' },
    });

    // Default: 1 energy every 5 minutes (300 seconds)
    const recoveryIntervalMinutes = (config?.value as any)?.intervalMinutes || 5;
    const now = new Date();

    // Find farms that need energy recovery
    // Note: Prisma doesn't support column-to-column comparison in 'where' directly.
    const farmStates = await prisma.farmState.findMany({
      where: {
        energy: { lt: 1000 }, // Assuming max energy is always < 1000
      },
      select: {
        id: true,
        userId: true,
        energy: true,
        maxEnergy: true,
        lastEnergyUpdate: true,
      },
    });

    console.log(`[Energy Recovery] Found ${farmStates.length} farms to check`);

    let updatedCount = 0;
    let totalEnergyRecovered = 0;

    // Batch update in chunks to avoid timeout
    const BATCH_SIZE = 100;
    for (let i = 0; i < farmStates.length; i += BATCH_SIZE) {
      const batch = farmStates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (farm) => {
          if (farm.energy >= farm.maxEnergy) {
            // If already at max, just keep lastEnergyUpdate current
            if (new Date(farm.lastEnergyUpdate).getTime() < now.getTime() - 60000) {
                await prisma.farmState.update({
                    where: { id: farm.id },
                    data: { lastEnergyUpdate: now }
                });
            }
            return;
          }

          const lastUpdate = new Date(farm.lastEnergyUpdate);
          const msPassed = now.getTime() - lastUpdate.getTime();
          const msPerEnergy = recoveryIntervalMinutes * 60 * 1000;
          
          const energyToRecover = Math.floor(msPassed / msPerEnergy);

          if (energyToRecover > 0) {
            const actualRecovery = Math.min(
              energyToRecover,
              farm.maxEnergy - farm.energy
            );

            // New last update should be the time when the last energy was actually recovered
            const newLastUpdate = new Date(lastUpdate.getTime() + actualRecovery * msPerEnergy);

            await prisma.farmState.update({
              where: { id: farm.id },
              data: {
                energy: Math.min(farm.energy + actualRecovery, farm.maxEnergy),
                lastEnergyUpdate: farm.energy + actualRecovery >= farm.maxEnergy ? now : newLastUpdate,
              },
            });

            updatedCount++;
            totalEnergyRecovered += actualRecovery;
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Energy Recovery] Completed in ${duration}ms. Updated ${updatedCount} farms, recovered ${totalEnergyRecovered} energy`
    );

    return NextResponse.json({
      success: true,
      updatedCount,
      totalEnergyRecovered,
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
