import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';
import { getAdminUser, normalizeEmail } from '@/lib/auth';
import { fetchAll } from '@/lib/fetchAll';
import { cleanText, isEmail, isRole, type AuthorizedUser } from '@/lib/users';

const COLUMNS = 'id, email, full_name, phone, role, is_active, created_at';

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

/* POST /api/admin/users — add an authorized user (manager only) */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const email = normalizeEmail(typeof body?.email === 'string' ? body.email : '');
  const role = body?.role ?? 'volunteer';

  if (!isEmail(email)) return NextResponse.json({ error: 'כתובת המייל אינה תקינה' }, { status: 400 });
  if (!isRole(role))   return NextResponse.json({ error: 'תפקיד לא חוקי' }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('authorized_users')
    .insert({
      email,
      role,
      full_name: cleanText(body?.full_name),
      phone:     cleanText(body?.phone, 30),
      is_active: true,
    })
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'המייל הזה כבר קיים ברשימה' }, { status: 409 });
    console.error('[POST /api/admin/users] DB error:', error.message);
    return NextResponse.json({ error: 'השמירה נכשלה' }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
