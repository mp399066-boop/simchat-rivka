import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getAdminUser, normalizeEmail } from '@/lib/auth';
import { cleanText, isRole } from '@/lib/users';

const COLUMNS = 'id, email, full_name, phone, role, is_active, created_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

/** The target row's e-mail, or a ready error response. */
async function loadTarget(id: string) {
  if (!UUID.test(id)) return { res: NextResponse.json({ error: 'לא נמצא' }, { status: 404 }) };
  const { data, error } = await createServerClient()
    .from('authorized_users').select('email').eq('id', id).maybeSingle();
  if (error) {
    console.error('[admin/users/:id] DB error:', error.message);
    return { res: NextResponse.json({ error: 'הפעולה נכשלה' }, { status: 500 }) };
  }
  if (!data) return { res: NextResponse.json({ error: 'לא נמצא' }, { status: 404 }) };
  return { email: normalizeEmail(data.email) };
}

/* PATCH /api/admin/users/[id] — update name, phone, role or is_active */
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const target = await loadTarget(id);
  if (target.res) return target.res;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if ('full_name' in body) updates.full_name = cleanText(body.full_name);
  if ('phone' in body)     updates.phone     = cleanText(body.phone, 30);
  if ('role' in body) {
    if (!isRole(body.role)) return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 });
    updates.role = body.role;
  }
  if ('is_active' in body) updates.is_active = Boolean(body.is_active);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'אין מה לעדכן' }, { status: 400 });
  }
  // The manager can't lock herself out (and leave nobody to manage users).
  if (target.email === admin.email && (updates.role === 'volunteer' || updates.is_active === false)) {
    return NextResponse.json({ error: 'אי אפשר להסיר הרשאת ניהול מהחשבון שלך' }, { status: 400 });
  }

  const { data, error } = await createServerClient()
    .from('authorized_users').update(updates).eq('id', id).select(COLUMNS).single();
  if (error) {
    console.error('[PATCH /api/admin/users/:id] DB error:', error.message);
    return NextResponse.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
  return NextResponse.json(data);
}

/* DELETE /api/admin/users/[id] — remove an authorized user */
export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const target = await loadTarget(id);
  if (target.res) return target.res;
  if (target.email === admin.email) {
    return NextResponse.json({ error: 'אי אפשר למחוק את החשבון שלך' }, { status: 400 });
  }

  const { error } = await createServerClient().from('authorized_users').delete().eq('id', id);
  if (error) {
    console.error('[DELETE /api/admin/users/:id] DB error:', error.message);
    return NextResponse.json({ error: 'המחיקה נכשלה' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
