import { NextResponse } from 'next/server';
import { MOCK_RAFFLES } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json(MOCK_RAFFLES);
}
