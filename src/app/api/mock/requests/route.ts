import { NextResponse } from 'next/server';
import { MOCK_FRIEND_REQUESTS } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json({
    friendRequests: MOCK_FRIEND_REQUESTS
  });
}
