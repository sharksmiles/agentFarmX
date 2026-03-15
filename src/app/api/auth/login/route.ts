import { NextRequest, NextResponse } from 'next/server';
import { SiweMessage } from 'siwe';
import { prisma } from '@/lib/prisma';
import { mapUserToFrontend } from '@/utils/func/userMapper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature } = body;

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Message and signature are required' },
        { status: 400 }
      );
    }

    // Verify SIWE message
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const walletAddress = siweMessage.address.toLowerCase();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        farmState: {
          include: {
            landPlots: true,
          },
        },
        inventory: true,
      },
    });

    if (!user) {
      // Create new user with farm state
      user = await prisma.user.create({
        data: {
          walletAddress,
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
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session token (simplified - in production use proper JWT)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        walletAddress: user.walletAddress,
        timestamp: Date.now(),
      })
    ).toString('base64');

    return NextResponse.json({
      user: mapUserToFrontend(user),
      sessionToken,
    });
  } catch (error) {
    console.error('POST /api/auth/login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
