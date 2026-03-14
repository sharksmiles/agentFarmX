import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get or create invite code
    const inviteConfig = await prisma.systemConfig.findUnique({
      where: { key: `invite_code_${userId}` },
    });

    let inviteCode = (inviteConfig?.value as any)?.code;

    if (!inviteCode) {
      inviteCode = `INV${userId.substring(0, 8).toUpperCase()}`;
      await prisma.systemConfig.create({
        data: {
          key: `invite_code_${userId}`,
          value: { code: inviteCode },
        },
      });
    }

    return NextResponse.json({ inviteCode });
  } catch (error) {
    console.error('GET /api/invite/code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
