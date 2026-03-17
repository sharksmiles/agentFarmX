import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// 新手引导奖励金额
const ONBOARDING_REWARD = 500;

// GET /api/onboarding - Get current user's onboarding step
export const GET = withAuth(async (
  request: NextRequest,
  context: { auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingStep: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({ onboarding_step: user.onboardingStep });
  } catch (error) {
    return internalErrorResponse(error);
  }
});

// PATCH /api/onboarding - Update onboarding step
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { auth: AuthContext }
) => {
  try {
    const userId = context.auth.userId;
    const body = await request.json();
    const { step } = body;

    if (typeof step !== 'number' || step < 0 || step > 5) {
      return errorResponse('Invalid step value. Must be 0-5', 400);
    }

    // 获取当前用户的 onboarding step
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingStep: true, farmCoins: true },
    });

    if (!currentUser) {
      return errorResponse('User not found', 404);
    }

    const previousStep = currentUser.onboardingStep;

    // 使用事务更新 onboarding step 并发放奖励
    const user = await prisma.$transaction(async (tx) => {
      // 当从 step 0/1 更新到 step 2 时，发放新手奖励
      if ((previousStep === 0 || previousStep === 1) && step === 2) {
        // 更新用户金币和 onboarding step
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { 
            onboardingStep: step,
            farmCoins: { increment: ONBOARDING_REWARD }
          },
          select: { onboardingStep: true, farmCoins: true },
        });

        // 记录交易
        await tx.transaction.create({
          data: {
            userId,
            type: 'reward',
            category: 'onboarding',
            amount: ONBOARDING_REWARD,
            balance: updatedUser.farmCoins,
            description: 'New player welcome reward from Papa doge',
          }
        });

        return updatedUser;
      }

      // 其他情况只更新 onboarding step
      return await tx.user.update({
        where: { id: userId },
        data: { onboardingStep: step },
        select: { onboardingStep: true },
      });
    });

    return successResponse({ onboarding_step: user.onboardingStep });
  } catch (error) {
    return internalErrorResponse(error);
  }
});
