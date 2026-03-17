import { prisma } from '@/lib/prisma';
import { JWTService, SessionPayload, TokenResponse } from '@/lib/jwt';
import { GAME_CONSTANTS, GameService } from './gameService';

/**
 * 新手引导相关常量
 */
const ONBOARDING_CONSTANTS = {
  INITIAL_SEED_TYPE: 'Wheat',      // 初始种子类型
  INITIAL_SEED_COUNT: 5,          // 初始种子数量
  PRE_PLANTED_PLOT_INDEX: 0,      // 预种植地块索引（第一个地块）
  PRE_PLANTED_CROP: 'Wheat',      // 预种植作物类型
};

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
        // 获取初始作物的配置
        const initialCropConfig = await tx.cropConfig.findUnique({
          where: { cropType: ONBOARDING_CONSTANTS.PRE_PLANTED_CROP },
        });
        
        // 计算预种植作物的成熟时间（设置为已成熟，即 harvestAt 为当前时间）
        const now = new Date();
        const prePlantedHarvestAt = initialCropConfig 
          ? new Date(now.getTime() - 1000) // 设置为过去的时间，表示已成熟
          : now;
        const prePlantedPlantedAt = initialCropConfig
          ? new Date(now.getTime() - initialCropConfig.matureTime * 60 * 1000 - 1000)
          : new Date(now.getTime() - 6 * 60 * 1000); // 默认 6 分钟前种植

        user = await tx.user.create({
          data: {
            walletAddress: normalizedAddress,
            username: `X Layer-${normalizedAddress.slice(-4)}`,
            // 新用户直接设置 onboardingStep 为 1，避免前端再调用 API 更新
            onboardingStep: 1,
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
                    // 第一个地块预种植已成熟的作物，用于新手引导 Step 3
                    ...(i === ONBOARDING_CONSTANTS.PRE_PLANTED_PLOT_INDEX && initialCropConfig ? {
                      cropId: ONBOARDING_CONSTANTS.PRE_PLANTED_CROP,
                      plantedAt: prePlantedPlantedAt,
                      harvestAt: prePlantedHarvestAt,
                      growthStage: 4, // 成熟状态
                      lastWateredAt: prePlantedPlantedAt,
                      nextWateringDue: null, // 已成熟不需要浇水
                    } : {}),
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
                },
                // 添加初始种子库存
                {
                  itemType: 'crop',
                  itemId: ONBOARDING_CONSTANTS.INITIAL_SEED_TYPE,
                  quantity: ONBOARDING_CONSTANTS.INITIAL_SEED_COUNT,
                },
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
        
        // 为新用户创建默认的 Farmer 和 Raider Agent
        // 生成唯一的 SCA 地址（保持 42 字符长度）
        const farmerSca = `0xf${normalizedAddress.slice(3, 42)}`;  // 0xf + 39字符 = 42字符
        const raiderSca = `0xr${normalizedAddress.slice(3, 42)}`;  // 0xr + 39字符 = 42字符
        
        const defaultAgents = [
          {
            name: 'Farmer Bot',
            strategyType: 'farming',
            personality: 'balanced',
            aiModel: 'gpt-3.5-turbo',
            scaAddress: farmerSca,
            strategyConfig: {
              preferred_crops: ['Wheat', 'Corn'],
              auto_harvest: true,
              auto_replant: true,
              max_daily_gas_okb: 0.05,
              max_daily_spend_usdc: 10,
              emergency_stop_balance: 1,
            },
          },
          {
            name: 'Raider Bot',
            strategyType: 'raider',
            personality: 'aggressive',
            aiModel: 'gpt-3.5-turbo',
            scaAddress: raiderSca,
            strategyConfig: {
              radar_level: 2,
              max_daily_steals: 5,
              max_daily_gas_okb: 0.05,
              max_daily_spend_usdc: 10,
              emergency_stop_balance: 1,
            },
          },
        ];
        
        for (const agentData of defaultAgents) {
          await tx.agent.create({
            data: {
              userId: user.id,
              scaAddress: agentData.scaAddress,
              name: agentData.name,
              personality: agentData.personality,
              strategyType: agentData.strategyType,
              aiModel: agentData.aiModel,
              strategyConfig: agentData.strategyConfig,
              status: 'idle',
              isActive: false,
              temperature: 0.7,
            },
          });
        }
        
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
