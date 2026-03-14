import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STEAL_SUCCESS_RATE = 0.6; // 60% success rate
const STEAL_AMOUNT = 0.2; // Steal 20% of crop value

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, friendId, plotIndex } = body;

    if (!userId || !friendId || plotIndex === undefined) {
      return NextResponse.json(
        { error: 'userId, friendId, and plotIndex are required' },
        { status: 400 }
      );
    }

    // Get friend's farm
    const friendFarm = await prisma.farmState.findUnique({
      where: { userId: friendId },
      include: { landPlots: true },
    });

    if (!friendFarm) {
      return NextResponse.json(
        { error: 'Friend farm not found' },
        { status: 404 }
      );
    }

    const plot = friendFarm.landPlots.find((p) => p.plotIndex === plotIndex);

    if (!plot || !plot.cropId || plot.growthStage < 4) {
      return NextResponse.json(
        { error: 'No mature crop to steal' },
        { status: 400 }
      );
    }

    // Random success check
    const success = Math.random() < STEAL_SUCCESS_RATE;
    let reward = 0;

    if (success) {
      // Calculate steal reward (20% of crop value)
      const cropValues: Record<string, number> = {
        Apple: 10,
        Wheat: 5,
        Corn: 8,
        Tomato: 7,
      };
      const baseValue = cropValues[plot.cropId] || 5;
      reward = Math.floor(baseValue * STEAL_AMOUNT * plot.boostMultiplier);

      // Give reward to stealer
      await prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: reward },
        },
      });
    }

    // Record steal attempt
    const socialAction = await prisma.socialAction.create({
      data: {
        fromUserId: userId,
        toUserId: friendId,
        actionType: 'steal',
        metadata: {
          plotIndex,
          success,
          reward,
          cropId: plot.cropId,
        },
      },
    });

    return NextResponse.json({
      success,
      reward,
      action: socialAction,
    });
  } catch (error) {
    console.error('POST /api/social/steal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
