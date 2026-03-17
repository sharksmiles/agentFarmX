import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user's invite code from SystemConfig
    const inviteConfig = await prisma.systemConfig.findUnique({
      where: { key: `invite_code_${userId}` },
    });

    let inviteCode = (inviteConfig?.value as any)?.code;

    if (!inviteCode) {
      // Generate invite code
      inviteCode = `INV${userId.substring(0, 8).toUpperCase()}`;
      await prisma.systemConfig.create({
        data: {
          key: `invite_code_${userId}`,
          value: { code: inviteCode },
        },
      });
    }

    // Get invite stats from social actions
    const invites = await prisma.socialAction.findMany({
      where: {
        fromUserId: userId,
        actionType: 'invite',
      },
    });

    return NextResponse.json({
      inviteCode,
      totalInvites: invites.length,
      invites,
    });
  } catch (error) {
    console.error('GET /api/invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
