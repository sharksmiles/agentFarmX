import { prisma } from '@/lib/prisma';
import { JWTService, SessionPayload, TokenResponse } from '@/lib/jwt';
import { GAME_CONSTANTS, GameService } from './gameService';

/**
 * 认证服务
 * 处理用户认证、会话管理、Token刷新等
 */
export class AuthService {
  /**
   * 用户登录/注册
   * 通过SIWE验证后，创建或获取用户，返回Token
   */
  static async login(walletAddress: string): Promise<{
    user: any;
    tokens: TokenResponse;
    isNewUser: boolean;
  }> {
    const normalizedAddress = walletAddress.trim().toLowerCase();
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 查找或创建用户
      let user = await tx.user.findFirst({
        where: {
          walletAddress: {
            equals: normalizedAddress,
            mode: 'insensitive'
          }
        },
        include: {
          farmState: {
            include: {
              landPlots: true,
            },
          },
          inventory: true,
        },
      });

      let isNewUser = false;

      if (!user) {
        // 新用户注册
        user = await tx.user.create({
          data: {
            walletAddress: normalizedAddress,
            username: `X Layer-${normalizedAddress.slice(-4)}`,
            farmState: {
              create: {
                energy: GAME_CONSTANTS.BASE_MAX_ENERGY,
                maxEnergy: GAME_CONSTANTS.BASE_MAX_ENERGY,
                unlockedLands: GAME_CONSTANTS.DEFAULT_UNLOCKED_LANDS,
                landPlots: {
                  create: Array.from({ length: GAME_CONSTANTS.DEFAULT_UNLOCKED_LANDS }, (_, i) => ({
                    plotIndex: i,
                    isUnlocked: true,
                    growthStage: 0,
                  })),
                },
              },
            },
            inventory: {
              create: [
                {
                  itemType: 'boost',
                  itemId: 'daily_boost',
                  quantity: GAME_CONSTANTS.DAILY_BOOST_COUNT,
                }
              ]
            }
          },
          include: {
            farmState: {
              include: {
                landPlots: true,
              },
            },
            inventory: true,
          },
        });
        isNewUser = true;
      } else {
        // 老用户：处理每日重置和能量恢复
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 每日Boost重置
        let boostItem = user.inventory.find(i => i.itemType === 'boost');
        if (!boostItem) {
          const newBoost = await tx.inventory.create({
            data: {
              userId: user.id,
              itemType: 'boost',
              itemId: 'daily_boost',
              quantity: GAME_CONSTANTS.DAILY_BOOST_COUNT,
            }
          });
          user.inventory.push(newBoost);
        } else {
          const lastUpdateDay = new Date(
            boostItem.updatedAt.getFullYear(),
            boostItem.updatedAt.getMonth(),
            boostItem.updatedAt.getDate()
          );
          if (lastUpdateDay < today) {
            const updatedBoost = await tx.inventory.update({
              where: { id: boostItem.id },
              data: { quantity: GAME_CONSTANTS.DAILY_BOOST_COUNT }
            });
            const idx = user.inventory.findIndex(i => i.id === boostItem!.id);
            user.inventory[idx] = updatedBoost;
          }
        }

        // 能量恢复
        if (user.farmState) {
          const recoveryInterval = await GameService.getSystemConfig(
            'energy_recovery_rate',
            GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS,
            tx
          );
          const { newEnergy, newLastUpdate } = GameService.calculateRecoveredEnergy({
            currentEnergy: user.farmState.energy,
            maxEnergy: user.farmState.maxEnergy,
            lastUpdate: user.farmState.lastEnergyUpdate,
            recoveryIntervalMins: recoveryInterval
          });

          if (newEnergy !== user.farmState.energy) {
            const updatedFarmState = await tx.farmState.update({
              where: { id: user.farmState.id },
              data: {
                energy: newEnergy,
                lastEnergyUpdate: newLastUpdate
              },
              include: { landPlots: true }
            });
            user.farmState = updatedFarmState;
          }
        }

        // 更新最后登录时间
        await tx.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now }
        });
      }

      return { user, isNewUser };
    });

    // 生成Token
    const accessToken = await JWTService.createAccessToken(result.user.id, normalizedAddress);
    const refreshToken = await JWTService.createRefreshToken(result.user.id, 0);

    const tokens: TokenResponse = {
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60, // 7天（秒）
      tokenType: 'Bearer',
    };

    return {
      user: result.user,
      tokens,
      isNewUser: result.isNewUser,
    };
  }

  /**
   * 刷新Token
   */
  static async refreshToken(refreshToken: string): Promise<TokenResponse | null> {
    const payload = await JWTService.verifyRefreshToken(refreshToken);
    if (!payload) return null;

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, walletAddress: true },
    });

    if (!user) return null;

    // 生成新的Token
    const newAccessToken = await JWTService.createAccessToken(user.id, user.walletAddress);
    const newRefreshToken = await JWTService.createRefreshToken(user.id, payload.tokenVersion);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60,
      tokenType: 'Bearer',
    };
  }

  /**
   * 验证会话并获取用户信息
   */
  static async verifySession(token: string): Promise<SessionPayload | null> {
    return JWTService.verifyAccessToken(token);
  }

  /**
   * 获取当前用户完整信息
   */
  static async getCurrentUser(userId: string): Promise<any | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: {
          include: {
            landPlots: {
              orderBy: { plotIndex: 'asc' }
            }
          }
        },
        inventory: true,
        agents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * 验证用户对资源的所有权
   */
  static async verifyOwnership(
    userId: string,
    resourceType: 'farm' | 'agent' | 'inventory',
    resourceId: string
  ): Promise<boolean> {
    switch (resourceType) {
      case 'farm':
        const farmState = await prisma.farmState.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return farmState?.userId === userId;

      case 'agent':
        const agent = await prisma.agent.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return agent?.userId === userId;

      case 'inventory':
        const inventory = await prisma.inventory.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return inventory?.userId === userId;

      default:
        return false;
    }
  }
}
