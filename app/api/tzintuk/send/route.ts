import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { isTzintukConfigured, tzintukMother } from '@/lib/tzintuk';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/tzintuk/send — is a phone line connected? (manager) */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ configured: isTzintukConfigured() });
}

/** POST /api/tzintuk/send { motherId } — ring one mother now (manager). */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const motherId = typeof body?.motherId === 'string' ? body.motherId : '';
  if (!UUID.test(motherId)) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });

  try {
    const { error } = await tzintukMother(motherId);
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[tzintuk/send] failed:', (e as Error).message);
    return NextResponse.json({ error: 'הצינתוק נכשל' }, { status: 500 });
  }
}
