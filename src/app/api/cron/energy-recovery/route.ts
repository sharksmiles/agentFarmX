import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GameService } from '@/services/gameService';

export const maxDuration = 60;

/**
 * GET /api/cron/energy-recovery
 * 能量恢复Cron任务
 * 优化版本：使用原生SQL批量更新，提高效率
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Cron Secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('[Energy Recovery] Starting...');

    // 获取能量恢复配置
    const recoveryConfig = await GameService.getSystemConfig('energy_recovery_rate', {
      intervalMinutes: 5,
      rate: 1
    });
    
    const intervalMinutes = recoveryConfig.intervalMinutes || 5;
    const rate = recoveryConfig.rate || 1;

    // 使用原生SQL批量更新能量
    // 这比逐个查询和更新更高效
    const result = await prisma.$executeRaw`
      UPDATE farm_states 
      SET 
        energy = LEAST(
          energy + FLOOR(
            EXTRACT(EPOCH FROM (NOW() - last_energy_update)) / ${intervalMinutes * 60}
          ) * ${rate},
          max_energy
        ),
        last_energy_update = NOW()
      WHERE energy < max_energy
        AND last_energy_update < NOW() - INTERVAL '1 minute'
    `;

    const duration = Date.now() - startTime;
    console.log(
      `[Energy Recovery] Completed in ${duration}ms. Updated ${result} farms`
    );

    return NextResponse.json({
      success: true,
      updatedCount: result,
      duration,
      intervalMinutes,
      rate,
    });
  } catch (error) {
    console.error('[Energy Recovery] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
