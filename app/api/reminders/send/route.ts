import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { sendMotherReminder, siteUrl } from '@/lib/reminders';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /api/reminders/send { motherId } — send the reminder to one mother now (manager). */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const motherId = typeof body?.motherId === 'string' ? body.motherId : '';
  if (!UUID.test(motherId)) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });

  try {
    const { error } = await sendMotherReminder(motherId, siteUrl(req.nextUrl.origin));
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[reminders/send] failed:', (e as Error).message);
    return NextResponse.json({ error: 'השליחה נכשלה' }, { status: 500 });
  }
}
