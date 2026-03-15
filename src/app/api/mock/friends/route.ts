import { NextResponse } from 'next/server';
import { MOCK_FRIENDS } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json({
    friends: MOCK_FRIENDS
  });
}
