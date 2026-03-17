import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';
import { withAuth, AuthContext } from '@/middleware/auth';

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

    const user = await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: step },
      select: { onboardingStep: true },
    });

    return successResponse({ onboarding_step: user.onboardingStep });
  } catch (error) {
    return internalErrorResponse(error);
  }
});
