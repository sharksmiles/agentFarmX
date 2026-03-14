import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const INVITE_REWARD = 50; // Coins for successful invite

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, inviteCode } = body;

    if (!userId || !inviteCode) {
      return NextResponse.json(
        { error: 'userId and inviteCode are required' },
        { status: 400 }
      );
    }

    // Find the inviter by code
    const inviterConfig = await prisma.systemConfig.findFirst({
      where: {
        key: { startsWith: 'invite_code_' },
      },
    });

    if (!inviterConfig) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    const inviterId = inviterConfig.key.replace('invite_code_', '');

    if (inviterId === userId) {
      return NextResponse.json(
        { error: 'Cannot use your own invite code' },
        { status: 400 }
      );
    }

    // Check if already used an invite code
    const existingInvite = await prisma.socialAction.findFirst({
      where: {
        toUserId: userId,
        actionType: 'invite',
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Already used an invite code' },
        { status: 400 }
      );
    }

    // Create invite record and give rewards
    const [invite, inviterUser, inviteeUser] = await prisma.$transaction([
      prisma.socialAction.create({
        data: {
          fromUserId: inviterId,
          toUserId: userId,
          actionType: 'invite',
          metadata: {
            inviteCode,
            claimedAt: new Date().toISOString(),
          },
        },
      }),
      prisma.user.update({
        where: { id: inviterId },
        data: {
          farmCoins: { increment: INVITE_REWARD },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: INVITE_REWARD },
        },
      }),
    ]);

    return NextResponse.json({
      invite,
      reward: INVITE_REWARD,
      inviterUser,
      inviteeUser,
    });
  } catch (error) {
    console.error('POST /api/invite/claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
