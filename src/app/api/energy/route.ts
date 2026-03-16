import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GameService, GAME_CONSTANTS } from '@/services/gameService';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * GET /api/energy - 获取用户能量状态
 * 需要认证：验证用户身份，只能查看自己的能量
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;

    // Use GameService to sync stamina before returning
    const syncResult = await GameService.syncUserStamina(userId);

    if (!syncResult) {
      return NextResponse.json(
        { success: false, error: 'Farm state not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const { energy, maxEnergy, lastEnergyUpdate } = syncResult;

    // Get recovery interval for response info
    const recoveryIntervalMinutes = await GameService.getEnergyRecoveryInterval();
    const msPerEnergy = recoveryIntervalMinutes * 60 * 1000;

    return NextResponse.json({
      success: true,
      data: {
        energy,
        maxEnergy,
        recoveryRate: 1 / recoveryIntervalMinutes, // energy per minute
        nextRecoveryAt: energy < maxEnergy 
          ? new Date(new Date(lastEnergyUpdate).getTime() + msPerEnergy) 
          : null,
      },
    });
  } catch (error) {
    console.error('GET /api/energy error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
