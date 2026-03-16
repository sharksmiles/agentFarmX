import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

// 作物种子价格配置 (建议后续移至数据库 CropConfig)
const CROP_PRICES: Record<string, number> = {
  Wheat: 10, Corn: 20, Potato: 30, Tomato: 40, Carrot: 50,
  Cucumber: 60, Celery: 70, Garlic: 80, Cabbage: 90, Apple: 100,
  Banana: 120, Pear: 140, Lemon: 160, Pumpkin: 180, Strawberry: 200,
  Pineapple: 250, Peach: 300, Watermelon: 350, Cherry: 400, Grapes: 450,
  Kiwi: 500, Eggplant: 550, Chilli: 600, Sugarcane: 650,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, quantities } = body;

    if (!userId || !quantities || typeof quantities !== 'object') {
      return errorResponse('userId and quantities are required', 400);
    }

    // 1. 计算总价并校验作物有效性
    let totalCost = 0;
    const validPurchases: { cropName: string; quantity: number; price: number }[] = [];
    const invalidCrops: string[] = [];

    for (const [cropName, quantity] of Object.entries(quantities)) {
      if (typeof quantity !== 'number' || quantity <= 0) continue;

      const price = CROP_PRICES[cropName];
      if (!price) {
        invalidCrops.push(cropName);
        continue;
      }

      totalCost += price * quantity;
      validPurchases.push({ cropName, quantity, price });
    }

    if (invalidCrops.length > 0) {
      return errorResponse(`Invalid crops: ${invalidCrops.join(', ')}`, 400);
    }

    if (totalCost === 0) {
      return errorResponse('No valid items to purchase', 400);
    }

    // 2. 在单个事务中处理购买逻辑
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 获取最新用户数据
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new Error('User not found');

      // 校验余额
      if (user.farmCoins < totalCost) {
        throw new Error(`Insufficient coins. Need ${totalCost}, but have ${user.farmCoins}.`);
      }

      // 执行扣款
      const newBalance = user.farmCoins - totalCost;
      await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { decrement: totalCost } }
      });

      // 更新库存
      for (const purchase of validPurchases) {
        await tx.inventory.upsert({
          where: {
            userId_itemType_itemId: {
              userId,
              itemType: 'crop',
              itemId: purchase.cropName,
            },
          },
          create: {
            userId,
            itemType: 'crop',
            itemId: purchase.cropName,
            quantity: purchase.quantity,
          },
          update: {
            quantity: { increment: purchase.quantity },
          },
        });
      }

      // 记录交易记录
      await tx.transaction.create({
        data: {
          userId,
          type: 'spend',
          category: 'shop',
          amount: totalCost,
          balance: newBalance,
          description: `Purchased seeds: ${validPurchases.map(p => `${p.cropName} x${p.quantity}`).join(', ')}`,
        },
      });

      // 返回更新后的完整用户数据
      return await tx.user.findUnique({
        where: { id: userId },
        include: {
          farmState: { include: { landPlots: true } },
          inventory: true,
          agents: true
        }
      });
    });

    if (!updatedUser) throw new Error('User data corruption after shop purchase');

    return successResponse(mapUserToFrontend(updatedUser));
  } catch (error: any) {
    if (error.message === 'User not found') return notFoundResponse(error.message);
    if (error.message.startsWith('Insufficient coins') || error.message === 'No valid items to purchase') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
