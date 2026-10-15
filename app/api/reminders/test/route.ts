import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { isMailConfigured, sendMail } from '@/lib/mail';
import { israelDate } from '@/lib/dates';
import { motherMail, siteUrl } from '@/lib/reminders';

/**
 * POST /api/reminders/test — sends the manager herself a sample of the
 * mother's reminder (demo link, nothing is recorded). Also tells the page
 * whether e-mail is set up at all (GET).
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ configured: isMailConfigured(), to: admin.email });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isMailConfigured()) return NextResponse.json({ error: 'שליחת מיילים עוד לא הוגדרה' }, { status: 400 });

  const mail = motherMail({ full_name: 'רחל (דוגמה)', delivery_date: israelDate(1) }, `${siteUrl(req.nextUrl.origin)}/confirm?t=demo`);
  const { error } = await sendMail({ to: admin.email, ...mail, subject: `[דוגמה] ${mail.subject}` });
  if (error) return NextResponse.json({ error: 'השליחה נכשלה – כדאי לבדוק את סיסמת האפליקציה' }, { status: 500 });
  return NextResponse.json({ ok: true, to: admin.email });
}
