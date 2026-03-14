import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, ticketCount = 1 } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const ticketPrice = 10; // Default ticket price
    const totalCost = ticketPrice * ticketCount;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.farmCoins < totalCost) {
      return NextResponse.json(
        { error: 'Insufficient coins' },
        { status: 400 }
      );
    }

    // Create raffle entries
    const entries = [];
    for (let i = 0; i < ticketCount; i++) {
      const entry = await prisma.raffleEntry.create({
        data: {
          userId,
          raffleId: params.id,
          ticketNumber: Math.floor(Math.random() * 1000000),
        },
      });
      entries.push(entry);
    }

    // Deduct coins
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        farmCoins: user.farmCoins - totalCost,
      },
    });

    return NextResponse.json({
      entries,
      user: updatedUser,
      totalCost,
    });
  } catch (error) {
    console.error('POST /api/raffle/[id]/enter error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
