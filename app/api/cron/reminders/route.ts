import { NextRequest, NextResponse } from 'next/server';
import { withFailureAlert } from '@/lib/cronAlert';
import { runDailyReminders, siteUrl } from '@/lib/reminders';

/**
 * GET /api/cron/reminders — daily (vercel.json), the evening before.
 * Called by Vercel Cron with "Authorization: Bearer <CRON_SECRET>".
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await runDailyReminders(siteUrl(req.nextUrl.origin));
  console.log('[cron reminders]', JSON.stringify(summary));
  return NextResponse.json(summary);
}

export const GET = withFailureAlert('תזכורות יום לפני המשלוח', handle);
