import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No session token provided' },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.substring(7);

    // Decode session token
    let session;
    try {
      session = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    } catch {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 401 }
      );
    }

    // Verify session is not expired (24 hours)
    const sessionAge = Date.now() - session.timestamp;
    if (sessionAge > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        level: true,
        experience: true,
        farmCoins: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user,
      expiresAt: new Date(session.timestamp + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
