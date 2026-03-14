import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get active raffles from SystemConfig
    const raffleConfig = await prisma.systemConfig.findUnique({
      where: { key: 'active_raffles' },
    });

    const raffles = (raffleConfig?.value as any)?.raffles || [
      {
        id: 1,
        name: 'Weekly Raffle',
        description: 'Win up to 1000 coins!',
        ticketPrice: 10,
        maxTickets: 100,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        prizes: [500, 300, 200],
        status: 'active',
      },
    ];

    // Get participant counts from RaffleEntry
    const raffleCounts = await prisma.raffleEntry.groupBy({
      by: ['raffleId'],
      _count: {
        userId: true,
      },
    });

    const rafflesWithCounts = raffles.map((raffle: any) => {
      const count = raffleCounts.find((c) => c.raffleId === raffle.id.toString());
      return {
        ...raffle,
        participants: count?._count.userId || 0,
      };
    });

    return NextResponse.json({ raffles: rafflesWithCounts });
  } catch (error) {
    console.error('GET /api/raffle error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
