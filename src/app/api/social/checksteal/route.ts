import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Check Steal Success Rate
 * Calculates the success rate for stealing a crop from a friend
 * Based on multiple factors as defined in PRD Section 10.4
 */

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

    // Get user and friend data
    const [user, friend] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { farmState: true },
      }),
      prisma.user.findUnique({
        where: { id: friendId },
        include: {
          farmState: {
            include: {
              landPlots: true,
            },
          },
        },
      }),
    ]);

    if (!user || !friend) {
      return NextResponse.json(
        { error: 'User or friend not found' },
        { status: 404 }
      );
    }

    if (!user.farmState || !friend.farmState) {
      return NextResponse.json(
        { error: 'Farm state not found' },
        { status: 404 }
      );
    }

    // Find the target plot
    const targetPlot = friend.farmState.landPlots.find(
      (plot) => plot.plotIndex === plotIndex
    );

    if (!targetPlot || !targetPlot.cropId) {
      return NextResponse.json(
        { error: 'No crop found on this plot' },
        { status: 400 }
      );
    }

    // Check if crop is mature
    if (!targetPlot.harvestAt || new Date() < targetPlot.harvestAt) {
      return NextResponse.json(
        { error: 'Crop is not mature yet' },
        { status: 400 }
      );
    }

    // Calculate success rate factors
    const baseSuccessRate = 15; // 15% base rate

    // Level difference factor (higher level = better chance)
    const levelDiff = user.level - friend.level;
    const levelFactor = levelDiff * 2; // +2% per level difference

    // Online status (if friend was active in last 60 seconds)
    const isOnline = friend.lastLoginAt && 
      (Date.now() - friend.lastLoginAt.getTime()) < 60000;
    const onlineFactor = isOnline ? -10 : 0; // -10% if online

    // Crop maturity factor (how long it's been mature)
    const matureTime = targetPlot.harvestAt ? 
      (Date.now() - targetPlot.harvestAt.getTime()) / (1000 * 60 * 60) : 0;
    const cropLevelFactor = Math.min(matureTime * 2, 10); // +2% per hour, max +10%

    // Invite advantage (if user invited the friend)
    const inviteFactor = friend.invitedBy === user.inviteCode ? 5 : 0; // +5% if invited

    // Friendship penalty (friends are harder to steal from)
    // TODO: Check actual friendship status from a friends table
    const friendshipFactor = -5; // -5% penalty for friends

    // New farmer protection (users under level 5)
    const newFarmerFactor = friend.level < 5 ? -15 : 0; // -15% if new farmer

    // Recidivist penalty (check recent steal attempts on same user)
    const recentSteals = await prisma.socialAction.count({
      where: {
        fromUserId: userId,
        toUserId: friendId,
        actionType: 'steal',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });
    const recidivistFactor = recentSteals > 0 ? -5 * recentSteals : 0; // -5% per recent steal

    // Calculate final success rate
    const finalSuccessRate = Math.max(
      0,
      Math.min(
        100,
        baseSuccessRate +
          levelFactor +
          onlineFactor +
          cropLevelFactor +
          inviteFactor +
          friendshipFactor +
          newFarmerFactor +
          recidivistFactor
      )
    );

    // Calculate rewards and costs
    const stealingCost = 100; // 100 coins + 1 energy
    const energyCost = 1;

    // Estimate earnings based on crop type (simplified)
    const cropEarnings = 50; // Base earnings
    const stealingEarning = Math.floor(cropEarnings * 0.5); // 50% of crop value
    const stealingExp = 10; // Base experience

    // Check if user has enough resources
    if (user.farmCoins < stealingCost) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    if (user.farmState.energy < energyCost) {
      return NextResponse.json(
        { error: 'Insufficient energy' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success_rate_details: {
        base_success_rate: `${baseSuccessRate}%`,
        online: `${onlineFactor}%`,
        crop_level_diff: `${cropLevelFactor.toFixed(1)}%`,
        level_diff: `${levelFactor}%`,
        invite_diff: `${inviteFactor}%`,
        friendship_diff: `${friendshipFactor}%`,
        recidivist: `${recidivistFactor}%`,
        new_farmer: `${newFarmerFactor}%`,
        final_success_rate: finalSuccessRate,
      },
      stealing_earning: `${stealingEarning}`,
      stealing_exp: `${stealingExp}`,
      stealing_cost: `${stealingCost}`,
      stealing_crop_name: targetPlot.cropId,
      crop_id: targetPlot.id,
      plotIndex: targetPlot.plotIndex,
    });
  } catch (error) {
    console.error('POST /api/social/checksteal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
