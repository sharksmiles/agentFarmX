import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse, notFoundResponse } from '@/utils/api/response';

// 不同物品的出售价格配置 (建议后续移至数据库 CropConfig)
const SELL_PRICES: Record<string, Record<string, number>> = {
  crop: {
    Apple: 10, Wheat: 5, Corn: 8, Tomato: 7, Potato: 7,
    Carrot: 7, Strawberry: 7, Pineapple: 7, Watermelon: 7,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, itemType, itemId, quantity = 1 } = body;

    if (!userId || !itemType || !itemId) {
      return errorResponse('userId, itemType, and itemId are required', 400);
    }

    // 在单个事务中执行出售逻辑
    const result = await prisma.$transaction(async (tx) => {
      // 1. 获取库存物品并校验
      const inventoryItem = await tx.inventory.findUnique({
        where: {
          userId_itemType_itemId: { userId, itemType, itemId },
        },
      });

      if (!inventoryItem) throw new Error('Item not found in inventory');
      if (inventoryItem.quantity < quantity) throw new Error('Insufficient quantity');

      // 2. 计算出售价格
      let sellPrice = 0;
      if (itemType === 'crop' && SELL_PRICES.crop[itemId]) {
        sellPrice = SELL_PRICES.crop[itemId] * quantity;
      } else {
        throw new Error('Item cannot be sold');
      }

      // 3. 执行扣除库存与增加金币
      await tx.inventory.update({
        where: { id: inventoryItem.id },
        data: { quantity: { decrement: quantity } },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { farmCoins: { increment: sellPrice } },
      });

      // 4. 记录交易记录
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'earn',
          category: 'sell',
          amount: sellPrice,
          balance: updatedUser.farmCoins,
          description: `Sold ${quantity}x ${itemId}`,
        },
      });

      return {
        inventory: { ...inventoryItem, quantity: inventoryItem.quantity - quantity },
        user: updatedUser,
        sellPrice,
        transaction,
      };
    });

    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'Item not found in inventory') return notFoundResponse(error.message);
    if (error.message === 'Insufficient quantity' || error.message === 'Item cannot be sold') {
      return errorResponse(error.message, 400);
    }
    return internalErrorResponse(error);
  }
}
