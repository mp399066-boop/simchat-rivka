import { NextRequest, NextResponse } from 'next/server';
import { withFailureAlert } from '@/lib/cronAlert';
import { runDailyTzintuk } from '@/lib/tzintuk';

/**
 * GET /api/cron/tzintuk/tomorrow — the evening before (vercel.json).
 * GET /api/cron/tzintuk/today    — the morning of the delivery.
 * Called by Vercel Cron with "Authorization: Bearer <CRON_SECRET>".
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const when = req.nextUrl.pathname.split('/').pop();
  if (when !== 'today' && when !== 'tomorrow') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const summary = await runDailyTzintuk(when === 'today' ? 0 : 1);
  console.log(`[cron tzintuk ${when}]`, JSON.stringify(summary));
  return NextResponse.json(summary);
}

export const GET = withFailureAlert('צינתוק ליולדות', handle);
