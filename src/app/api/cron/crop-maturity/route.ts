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
    console.log('[Crop Maturity] Starting...');

    const now = new Date();

    // Find crops that are ready to harvest
    const maturePlots = await prisma.landPlot.findMany({
      where: {
        cropId: { not: null },
        harvestAt: { lte: now },
        growthStage: { lt: 4 },
      },
      select: {
        id: true,
        cropId: true,
        harvestAt: true,
        farmStateId: true,
      },
    });

    console.log(`[Crop Maturity] Found ${maturePlots.length} crops ready to mature`);

    let updatedCount = 0;

    // Update growth stage to mature (4)
    const BATCH_SIZE = 100;
    for (let i = 0; i < maturePlots.length; i += BATCH_SIZE) {
      const batch = maturePlots.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (plot) => {
          await prisma.landPlot.update({
            where: { id: plot.id },
            data: { growthStage: 4 },
          });
          updatedCount++;
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
