import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get raffle winners from SystemConfig
    const winnersConfig = await prisma.systemConfig.findUnique({
      where: { key: `raffle_winners_${params.id}` },
    });

    const winners = (winnersConfig?.value as any)?.winners || [];

    // Get winner details
    const winnerDetails = await Promise.all(
      winners.map(async (winner: any) => {
        const user = await prisma.user.findUnique({
          where: { id: winner.userId },
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        });
        return {
          ...winner,
          user,
        };
      })
    );

    return NextResponse.json({ winners: winnerDetails });
  } catch (error) {
    console.error('GET /api/raffle/[id]/winners error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
