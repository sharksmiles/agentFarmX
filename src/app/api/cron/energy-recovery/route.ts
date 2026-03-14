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

    const recoveryRate = (config?.value as any)?.rate || 1; // Default: 1 energy per minute
    const now = new Date();

    // Find farms that need energy recovery
    const farmStates = await prisma.farmState.findMany({
      where: {
        energy: { lt: prisma.farmState.fields.maxEnergy },
      },
      select: {
        id: true,
        userId: true,
        energy: true,
        maxEnergy: true,
        lastEnergyUpdate: true,
      },
    });

    console.log(`[Energy Recovery] Found ${farmStates.length} farms to update`);

    let updatedCount = 0;
    let totalEnergyRecovered = 0;

    // Batch update in chunks to avoid timeout
    const BATCH_SIZE = 100;
    for (let i = 0; i < farmStates.length; i += BATCH_SIZE) {
      const batch = farmStates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (farm) => {
          const lastUpdate = new Date(farm.lastEnergyUpdate);
          const minutesPassed = Math.floor(
            (now.getTime() - lastUpdate.getTime()) / 60000
          );

          if (minutesPassed < 1) return;

          const energyToRecover = Math.min(
            minutesPassed * recoveryRate,
            farm.maxEnergy - farm.energy
          );

          if (energyToRecover > 0) {
            await prisma.farmState.update({
              where: { id: farm.id },
              data: {
                energy: Math.min(farm.energy + energyToRecover, farm.maxEnergy),
                lastEnergyUpdate: now,
              },
            });

            updatedCount++;
            totalEnergyRecovered += energyToRecover;
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
