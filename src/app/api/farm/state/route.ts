import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { GameService, GAME_CONSTANTS } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/farm/state - 获取农场当前状态
 * 需要认证：从Token中获取用户ID
 * 重构说明：移除了 GET 请求中的数据库写入副作用。
 * 能量恢复逻辑改为“内存计算”，仅用于返回给前端展示，实际能量扣除时会再次精确计算。
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId; // 从认证上下文获取用户ID

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

    if (!user || !user.farmState) {
      return notFoundResponse('User or farm state not found');
    }

    // 内存中计算当前能量（不写入数据库）
    const recoveryInterval = await GameService.getSystemConfig('energy_recovery_rate', GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS);
    const { newEnergy } = GameService.calculateRecoveredEnergy({
      currentEnergy: user.farmState.energy,
      maxEnergy: user.farmState.maxEnergy,
      lastUpdate: user.farmState.lastEnergyUpdate,
      recoveryIntervalMins: recoveryInterval
    });

    // 临时更新对象用于映射返回
    user.farmState.energy = newEnergy;

    const mappedUser = mapUserToFrontend(user);
    return successResponse({ farmState: mappedUser.farm_stats });
  } catch (error) {
    return internalErrorResponse(error);
  }
});
