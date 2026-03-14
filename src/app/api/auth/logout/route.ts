import { NextResponse } from 'next/server';

export async function POST() {
  // In a real implementation, you would invalidate the session token
  // For now, just return success
  return NextResponse.json({ success: true });
}
