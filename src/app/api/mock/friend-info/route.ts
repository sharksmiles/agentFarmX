import { NextResponse } from 'next/server';
import { MOCK_FRIEND_INFO } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json(MOCK_FRIEND_INFO);
}
