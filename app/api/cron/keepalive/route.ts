import { NextRequest, NextResponse } from 'next/server';
import { touchKeepalive } from '@/lib/storage';

// GET /api/cron/keepalive - Called daily by Vercel Cron (see vercel.json)
export async function GET(request: NextRequest) {
  // Vercel sends "Authorization: Bearer $CRON_SECRET" on cron invocations
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const value = await touchKeepalive();
    return NextResponse.json({ ok: true, value });
  } catch (error) {
    console.error('Keepalive failed:', error);
    return NextResponse.json({ error: 'Keepalive failed' }, { status: 500 });
  }
}
