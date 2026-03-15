import { NextResponse } from 'next/server';
import { MOCK_SEARCH_RESULTS } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json({
    searchResults: MOCK_SEARCH_RESULTS
  });
}
