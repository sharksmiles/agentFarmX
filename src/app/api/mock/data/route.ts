import { NextResponse } from 'next/server';
import { MOCK_USER, MOCK_GAME_STATS } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json({
    user: MOCK_USER,
    gameStats: MOCK_GAME_STATS
  });
}
