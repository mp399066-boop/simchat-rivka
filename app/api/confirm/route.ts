/**
 * PUBLIC route (no login) — the mother answers her reminder e-mail.
 * Access is by the secret random token in her link (confirm_tokens, a UUID —
 * 122 random bits). Only her first name (a couple / family: the name), the
 * delivery date and the kind of meal are returned.
 * The token "demo" is the manager's sample e-mail: answers, records nothing.
 *
 *   GET  /api/confirm?t=<token>               → { firstName, deliveryDate, response, meal, title, plural }
 *   POST /api/confirm { t, response, note }   → records the answer
 */

import { NextRequest, NextResponse } from 'next/server';
import { infoOf, type Category } from '@/lib/categories';
import { createServerClient } from '@/lib/supabaseServer';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A function, not a shared object: a Response body can be sent only once.
const notFound = () => NextResponse.json({ error: 'הקישור אינו תקף' }, { status: 404 });

async function motherIdFor(token: string): Promise<string | null> {
  const { data, error } = await createServerClient()
    .from('confirm_tokens').select('mother_id').eq('token', token).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.mother_id ?? null;
}

export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') ?? '';
  if (t === 'demo') return NextResponse.json({ firstName: 'רחל', deliveryDate: null, response: null, demo: true });
  if (!UUID.test(t)) return notFound();
  try {
    const id = await motherIdFor(t);
    if (!id) return notFound();
    const { data, error } = await createServerClient().from('mothers')
      .select('category, full_name, delivery_date, confirm_response').eq('id', id).single();
    if (error || !data) return notFound();
    const info = infoOf(data as { category?: Category });
    return NextResponse.json({
      firstName: info.plural ? data.full_name.trim() : data.full_name.trim().split(/\s+/)[0],
      deliveryDate: data.delivery_date,
      response: data.confirm_response,
      meal: info.plural ? 'הארוחה' : 'ארוחת הבוקר',
      title: info.plural ? info.meal : 'ארוחת בוקר ליולדת',
      plural: info.plural,
    });
  } catch (e) {
    console.error('[confirm GET] failed:', (e as Error).message);
    return NextResponse.json({ error: 'תקלה זמנית, נסי שוב' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const t = typeof body?.t === 'string' ? body.t : '';
  const response = body?.response;
  if (response !== 'ok' && response !== 'change') return NextResponse.json({ error: 'תשובה לא תקינה' }, { status: 400 });
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) || null : null;
  if (t === 'demo') return NextResponse.json({ ok: true, demo: true });
  if (!UUID.test(t)) return notFound();
  try {
    const id = await motherIdFor(t);
    if (!id) return notFound();
    const { error } = await createServerClient().from('mothers').update({
      confirmed_at: new Date().toISOString(), confirm_response: response, confirm_note: note,
    }).eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[confirm POST] failed:', (e as Error).message);
    return NextResponse.json({ error: 'השמירה נכשלה, נסי שוב' }, { status: 500 });
  }
}
