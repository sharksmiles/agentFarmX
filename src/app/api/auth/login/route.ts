import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { GAME_CONSTANTS, GameService } from '@/services/gameService';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return errorResponse('Message and signature are required', 400);
    }

    // 验证 SIWE 签名
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return errorResponse('Invalid signature', 401);
    }

    const walletAddress = siweMessage.address.trim().toLowerCase();
    const now = new Date();

    // 在单个事务中处理用户初始化、登录更新和每日重置
    const user = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findFirst({
        where: { 
          walletAddress: {
            equals: walletAddress,
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

      if (!user) {
        // 新用户注册逻辑
        user = await tx.user.create({
          data: {
            walletAddress,
            username: `X Layer-${walletAddress.slice(-4)}`,
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
      } else {
        // 老用户登录逻辑：处理每日重置和能量恢复
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // 1. 处理每日 Boost 重置
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
          const lastUpdateDay = new Date(boostItem.updatedAt.getFullYear(), boostItem.updatedAt.getMonth(), boostItem.updatedAt.getDate());
          if (lastUpdateDay < today) {
            const updatedBoost = await tx.inventory.update({
              where: { id: boostItem.id },
              data: { quantity: GAME_CONSTANTS.DAILY_BOOST_COUNT }
            });
            const idx = user.inventory.findIndex(i => i.id === boostItem!.id);
            user.inventory[idx] = updatedBoost;
          }
        }

        // 2. 处理能量恢复逻辑 (追溯计算)
        if (user.farmState) {
          const recoveryInterval = await GameService.getSystemConfig('energy_recovery_rate', GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS, tx);
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

        // 3. 更新最后登录时间
        await tx.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now }
        });
      }

      return user;
    });

    // 生成会话 Token (建议生产环境使用 JWT)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        walletAddress: user.walletAddress,
        timestamp: now.getTime(),
      })
    ).toString('base64');

    return successResponse({
      user: mapUserToFrontend(user),
      sessionToken,
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
