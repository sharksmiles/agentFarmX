import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, AuthContext } from '@/middleware/auth';

/**
 * GET /api/inventory - 获取用户库存
 * 需要认证：验证用户身份，只能查看自己的库存
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;

    const inventory = await prisma.inventory.findMany({
      where: { userId },
      orderBy: [
        { itemType: 'asc' },
        { itemId: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: { inventory } });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/inventory - 添加物品到库存
 * 需要认证：验证用户身份，只能添加到自己的库存
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { params: Record<string, string>; auth: AuthContext }
) => {
  try {
    const body = await request.json();
    const { itemType, itemId, quantity = 1 } = body;
    const userId = context.auth.userId;

    if (!itemType || !itemId) {
      return NextResponse.json(
        { success: false, error: 'itemType and itemId are required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // 验证数量有效
    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be positive', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // Upsert inventory item
    const inventory = await prisma.inventory.upsert({
      where: {
        userId_itemType_itemId: {
          userId,
          itemType,
          itemId,
        },
      },
      create: {
        userId,
        itemType,
        itemId,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });

    return NextResponse.json({ success: true, data: { inventory } });
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
});
