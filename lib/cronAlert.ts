import { connection, NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { esc, frame, isMailConfigured, sendMail } from '@/lib/mail';

/**
 * Wraps a scheduled task: when it throws or answers 5xx, the managers get an
 * e-mail. (Same Gmail account as the reminders — if Gmail itself is down, the
 * failure is still in the Vercel logs.) 401 does not alert.
 */
export function withFailureAlert(name: string, handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Request time only. With Cache Components the build tries to prerender
    // GET handlers and stops them by throwing — that must happen out here,
    // not inside the try below, where it would look like a failure.
    await connection();
    let res: NextResponse;
    let reason = '';
    try {
      res = await handler(req);
      if (res.status >= 500) reason = `HTTP ${res.status}`;
    } catch (e) {
      reason = (e as Error).message;
      console.error(`[cron ${name}] failed:`, reason);
      res = NextResponse.json({ error: 'failed' }, { status: 500 });
    }
    if (reason) await alertManagers(name, reason);
    return res;
  };
}

async function alertManagers(name: string, reason: string) {
  if (!isMailConfigured()) return;
  try {
    const { data } = await createServerClient().from('authorized_users')
      .select('email').eq('role', 'admin').eq('is_active', true);
    for (const { email } of data ?? []) {
      await sendMail({
        to: email,
        subject: `שמחת רבקה – תקלה במשימה האוטומטית "${name}"`,
        html: frame('תקלה במשימה אוטומטית', `<p>המשימה <strong>${esc(name)}</strong> לא הצליחה לרוץ.</p>
          <p style="color:#7D6873;font-size:14px">פרטים טכניים: ${esc(reason)}</p>`),
        text: `המשימה "${name}" לא הצליחה לרוץ. ${reason}`,
      });
    }
  } catch (e) {
    console.error('[cronAlert] could not alert:', (e as Error).message);
  }
}
