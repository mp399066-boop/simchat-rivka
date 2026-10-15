import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getAdminUser, normalizeEmail } from '@/lib/auth';
import { parsePerson, USER_COLUMNS as COLUMNS } from '@/lib/users';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

/** The target row's e-mail and role, or a ready error response. */
async function loadTarget(id: string) {
  if (!UUID.test(id)) return { res: NextResponse.json({ error: 'לא נמצא' }, { status: 404 }) };
  const { data, error } = await createServerClient()
    .from('authorized_users').select('email, role').eq('id', id).maybeSingle();
  if (error) {
    console.error('[admin/users/:id] DB error:', error.message);
    return { res: NextResponse.json({ error: 'הפעולה נכשלה' }, { status: 500 }) };
  }
  if (!data) return { res: NextResponse.json({ error: 'לא נמצא' }, { status: 404 }) };
  return { email: data.email ? normalizeEmail(data.email) : null, role: data.role as string };
}

/* PATCH /api/admin/users/[id] — update details, role or is_active */
export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const target = await loadTarget(id);
  if (target.res) return target.res;

  const body = await req.json().catch(() => ({}));
  const parsed = parsePerson(body, normalizeEmail, true);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const updates: Record<string, unknown> = parsed.data;
  if ('is_active' in body) updates.is_active = Boolean(body.is_active);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'אין מה לעדכן' }, { status: 400 });
  }
  // The manager can't lock herself out (and leave nobody to manage users).
  const isSelf = target.email === admin.email;
  if (isSelf && (updates.role === 'volunteer' || updates.is_active === false || ('email' in updates && updates.email !== admin.email))) {
    return NextResponse.json({ error: 'אי אפשר להסיר את הגישה מהחשבון שלך' }, { status: 400 });
  }
  const finalRole = (updates.role as string | undefined) ?? target.role;
  const finalEmail = 'email' in updates ? updates.email : target.email;
  if (finalRole === 'admin' && !finalEmail) {
    return NextResponse.json({ error: 'למנהלת חייב להיות מייל כדי להיכנס למערכת' }, { status: 400 });
  }

  const { data, error } = await createServerClient()
    .from('authorized_users').update(updates).eq('id', id).select(COLUMNS).single();
  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'המייל הזה כבר קיים ברשימה' }, { status: 409 });
    if (error.code === '23514') return NextResponse.json({ error: 'יש למלא שם או מייל' }, { status: 400 });
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
