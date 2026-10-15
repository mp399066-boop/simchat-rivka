import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getAdminUser, normalizeEmail } from '@/lib/auth';
import { fetchAll } from '@/lib/fetchAll';
import { parsePerson, USER_COLUMNS as COLUMNS, type AuthorizedUser } from '@/lib/users';

/* GET /api/admin/users — all authorized users (manager only) */
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerClient();
  const { data, error } = await fetchAll<AuthorizedUser>((from, to) =>
    supabase.from('authorized_users').select(COLUMNS)
      .order('created_at').order('id').range(from, to));

  if (error) {
    console.error('[GET /api/admin/users] DB error:', error.message);
    return NextResponse.json({ error: 'טעינת הרשימה נכשלה' }, { status: 500 });
  }
  return NextResponse.json(data);
}

/* POST /api/admin/users — add a person to the team (manager only) */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = parsePerson(await req.json().catch(() => null), normalizeEmail);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('authorized_users')
    .insert({ ...parsed.data, is_active: true })
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'המייל הזה כבר קיים ברשימה' }, { status: 409 });
    console.error('[POST /api/admin/users] DB error:', error.message);
    return NextResponse.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
