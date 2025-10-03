import { NextResponse } from 'next/server';

// This endpoint has been removed in favor of lifecycle endpoints:
// POST /api/crab-battle/start  and POST /api/crab-battle/finish
// Return 410 Gone so any lingering legacy client updates its flow.
export async function POST() {
  return NextResponse.json({ error: 'gone', message: 'Use /api/crab-battle/start then /api/crab-battle/finish' }, { status: 410 });
}
