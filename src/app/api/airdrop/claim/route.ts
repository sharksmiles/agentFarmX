import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, airdropId } = body;

    if (!userId || !airdropId) {
      return NextResponse.json(
        { error: 'userId and airdropId are required' },
        { status: 400 }
      );
    }

    // Check if already claimed
    const existingClaim = await prisma.socialAction.findFirst({
      where: {
        fromUserId: userId,
        actionType: 'airdrop_claim',
      },
    });

    if (existingClaim) {
      const metadata = existingClaim.metadata as any;
      if (metadata?.airdropId === airdropId) {
        return NextResponse.json(
          { error: 'Airdrop already claimed' },
          { status: 400 }
        );
      }
    }

    // Get airdrop details
    const airdropConfig = await prisma.systemConfig.findUnique({
      where: { key: 'active_airdrops' },
    });

    const airdrops = (airdropConfig?.value as any)?.airdrops || [];
    const airdrop = airdrops.find((a: any) => a.id === airdropId);

    if (!airdrop) {
      return NextResponse.json(
        { error: 'Airdrop not found' },
        { status: 404 }
      );
    }

    const amount = parseInt(airdrop.amount) || 100;

    // Claim airdrop
    const [claim, updatedUser] = await prisma.$transaction([
      prisma.socialAction.create({
        data: {
          fromUserId: userId,
          toUserId: userId, // Self-action
          actionType: 'airdrop_claim',
          metadata: {
            airdropId,
            amount,
            token: airdrop.token,
            claimedAt: new Date().toISOString(),
            txHash: `0x${Math.random().toString(16).substring(2, 66)}`, // Mock tx hash
          },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: amount },
        },
      }),
    ]);

    return NextResponse.json({
      claim,
      user: updatedUser,
      amount,
      txHash: (claim.metadata as any)?.txHash,
    });
  } catch (error) {
    console.error('POST /api/airdrop/claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
