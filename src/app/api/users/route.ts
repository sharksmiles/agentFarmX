import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/users - Get user by wallet address
// 重构说明：移除了自动注册和库存更新的副作用，保持 GET 幂等性
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddressRaw = searchParams.get('walletAddress');

    if (!walletAddressRaw) {
      return errorResponse('walletAddress is required', 400);
    }

    const walletAddress = walletAddressRaw.trim().toLowerCase();

    // 简单高效查询
    const user = await prisma.user.findFirst({
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
        agents: true,
      },
    });

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse(mapUserToFrontend(user));
  } catch (error) {
    return internalErrorResponse(error);
  }
}

// POST /api/users - Create new user
// 重构说明：引入事务支持，确保用户与初始资产创建的原子性
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress: walletAddressRaw, username, avatar } = body;

    if (!walletAddressRaw) {
      return errorResponse('walletAddress is required', 400);
    }

    const walletAddress = walletAddressRaw.trim().toLowerCase();

    // 检查是否存在
    const existing = await prisma.user.findFirst({
      where: { 
        walletAddress: {
          equals: walletAddress,
          mode: 'insensitive'
        }
      },
    });

    if (existing) {
      return errorResponse('User already exists', 409);
    }

    // 在事务中创建用户及其初始状态
    const user = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          walletAddress,
          username: username || `X Layer-${walletAddress.slice(-4)}`,
          avatar,
          farmState: {
            create: {
              energy: 100,
              maxEnergy: 100,
              unlockedLands: 6,
              landPlots: {
                create: Array.from({ length: 6 }, (_, i) => ({
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
                quantity: 3,
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
    });

    return successResponse(mapUserToFrontend(user), 201);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
