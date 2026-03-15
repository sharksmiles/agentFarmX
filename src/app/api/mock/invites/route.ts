import { NextResponse } from 'next/server';
import { MOCK_INVITES } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json(MOCK_INVITES);
}
