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
    console.log('[Crop Maturity] Starting...');

    // Find all plots that are planted
    const activePlots = await prisma.landPlot.findMany({
      where: {
        cropId: { not: null },
        harvestAt: { not: null }, // 确保有收获时间
      },
    });

    console.log(`[Crop Maturity] Checking ${activePlots.length} active plots for stage updates`);

    let updatedCount = 0;

    // Batch process to avoid timeout
    const BATCH_SIZE = 100;
    for (let i = 0; i < activePlots.length; i += BATCH_SIZE) {
      const batch = activePlots.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (plot) => {
          try {
            const newStage = GameService.calculateGrowthStage(plot);
            
            if (newStage !== plot.growthStage) {
              await prisma.landPlot.update({
                where: { id: plot.id },
                data: { growthStage: newStage },
              });
              updatedCount++;
            }
          } catch (plotError) {
            console.error(`[Crop Maturity] Error updating plot ${plot.id}:`, plotError);
          }
        })
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Crop Maturity] Completed in ${duration}ms. Updated ${updatedCount} plots`
    );

    return NextResponse.json({
      success: true,
      updatedCount,
      duration,
    });
  } catch (error) {
    console.error('[Crop Maturity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
