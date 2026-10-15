/**
 * npm run check:sql
 *
 * Builds the whole database from supabase/*.sql on a throwaway in-process
 * Postgres (PGlite), in the documented order (supabase/README.md), TWICE —
 * then checks the access rules. Catches, before anything reaches Supabase:
 *   • a file that fails on a clean database (wrong order, missing dependency)
 *   • a file that fails when re-run (not idempotent)
 *   • a policy that lets any signed-in account in (`using (true)`)
 *   • a public table without RLS
 *   • the expected access matrix: anon / outsider / volunteer / admin
 *
 * Supabase-only pieces (auth.jwt(), roles) are stubbed minimally.
 */

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SQL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase');

// Run order — keep in sync with supabase/README.md.
const FILES = [
  'schema.sql',
  'mothers.sql',
  'menu.sql',
  'prep-and-reminders.sql',
  'volunteers.sql',
  'workflow.sql',
];

const SUPABASE_STUBS = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
  grant usage on schema auth to anon, authenticated;
`;

// PGlite ships without extensions like pgcrypto; gen_random_uuid() is built in.
const load = f => readFileSync(path.join(SQL_DIR, f), 'utf8').replace(/create extension[^;]*;/gi, '');

let failed = false;
const fail = msg => { console.error('  ✗', msg); failed = true; };

const db = new PGlite();
await db.exec(SUPABASE_STUBS);

for (const round of [1, 2]) {
  console.log(round === 1 ? 'Clean install:' : 'Re-run (idempotency):');
  for (const f of FILES) {
    try { await db.exec(load(f)); console.log('  ✓', f); }
    catch (e) { fail(`${f}: ${e.message}`); }
  }
}

const menu = await db.query(`select count(*)::int as n from menu_items`);
if (menu.rows[0].n === 7) console.log('  ✓ the fixed menu (7 items) seeded once after two runs');
else fail(`expected 7 menu items after two runs, got ${menu.rows[0].n}`);

const admins = await db.query(`select count(*)::int as n from authorized_users where role = 'admin'`);
if (admins.rows[0].n === 1) console.log('  ✓ exactly one seeded admin after two runs');
else fail(`expected 1 seeded admin after two runs, got ${admins.rows[0].n}`);

console.log('Policies:');
const open = await db.query(`
  select schemaname || '.' || tablename || ' → ' || policyname as p
  from pg_policies
  where schemaname = 'public' and (qual = 'true' or with_check = 'true')`);
if (open.rows.length) open.rows.forEach(r => fail(`open to every signed-in account: ${r.p}`));
else console.log('  ✓ no policy is open to every signed-in account');

const noRls = await db.query(`
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
if (noRls.rows.length) noRls.rows.forEach(r => fail(`RLS disabled on public.${r.relname}`));
else console.log('  ✓ RLS enabled on every public table');

// ── Access matrix ───────────────────────────────────────────────────────────
await db.exec(`
  grant usage on schema public to anon, authenticated;
  grant all on all tables in schema public to anon, authenticated;
  insert into authorized_users (email, role, is_active) values
    ('admin@test.local', 'admin', true), ('vol@test.local', 'volunteer', true),
    ('gone@test.local', 'volunteer', false), ('vol2@test.local', 'volunteer', true);
  insert into mothers (full_name, delivery_volunteer_id)
    select 'משובצת', id from authorized_users where email = 'vol@test.local';
  insert into mothers (full_name) values ('לא משובצת');
  -- prep: one task of the assigned mother goes to the OTHER volunteer (vol2), one is unassigned
  insert into prep_tasks (mother_id, menu_item_id, assignee_id)
    select m.id, i.id, u.id from mothers m, menu_items i, authorized_users u
    where m.full_name = 'משובצת' and i.name = 'קופסת ירקות' and u.email = 'vol2@test.local';
  insert into prep_tasks (mother_id, menu_item_id)
    select m.id, i.id from mothers m, menu_items i where m.full_name = 'משובצת' and i.name = 'מפיות';
  insert into confirm_tokens (mother_id) select id from mothers;
`);
// IDs are looked up here, as the owner — a lookup inside a check would run
// under the tested role, where RLS can hide the row and mask the result.
const idOf = async sql => `'${(await db.query(sql)).rows[0].id}'::uuid`;
const VOL2_TASK = await idOf(`select t.id from prep_tasks t join menu_items i on i.id = t.menu_item_id where i.name = 'קופסת ירקות'`);
const FREE_TASK = await idOf(`select t.id from prep_tasks t join menu_items i on i.id = t.menu_item_id where i.name = 'מפיות'`);
const ASSIGNED   = await idOf(`select id from mothers where full_name = 'משובצת'`);
const UNASSIGNED = await idOf(`select id from mothers where full_name = 'לא משובצת'`);

/**
 * Runs `sql` as `role` with the given JWT e-mail, inside a transaction that
 * is rolled back (so one check never changes the data for the next).
 * Returns the first cell, 0 when there are no rows, or 'denied' on error.
 */
async function as(role, email, sql) {
  const claims = email ? JSON.stringify({ email }) : '';
  await db.exec(`begin; select set_config('request.jwt.claims', '${claims}', true); set local role ${role};`);
  try {
    const r = await db.query(sql);
    return r.rows.length ? Object.values(r.rows[0])[0] : 0;
  } catch { return 'denied'; }
  finally { await db.exec('rollback'); }
}

/** Number of rows a statement changed (via a writable CTE), or 'denied'. */
const changed = (stmt) => `with x as (${stmt} returning 1) select count(*)::int from x`;

const CHECKS = {
  is_authorized:       'select public.is_authorized_user()',
  is_admin:            'select public.is_admin_user()',
  users_rows:          'select count(*)::int from authorized_users',
  mothers_seen:        'select count(*)::int from mothers',
  mother_insert:       changed(`insert into mothers (full_name) values ('חדשה')`),
  mother_edit:         changed(`update mothers set notes = 'x'`),
  mother_delete:       changed('delete from mothers'),
  deliver_assigned:    `select 'ok' from public.set_delivery_status(${ASSIGNED}, 'delivered')`,
  deliver_unassigned:  `select 'ok' from public.set_delivery_status(${UNASSIGNED}, 'delivered')`,
  cancel_assigned:     `select 'ok' from public.set_delivery_status(${ASSIGNED}, 'cancelled')`,
  menu_seen:           'select count(*)::int from menu_items',
  menu_edit:           changed('update menu_items set stock = 5'),
  prep_seen:           'select count(*)::int from prep_tasks',
  my_prep:             'select count(*)::int from public.my_prep_tasks()',
  prep_done_own:       `select 'ok' from public.set_prep_done(${VOL2_TASK}, true)`,
  prep_done_free:      `select 'ok' from public.set_prep_done(${FREE_TASK}, true)`,
  tokens_seen:         'select count(*)::int from confirm_tokens',
};

const D = 'denied';
const expect = [
  // who,                  role,            email,                 is_auth, is_admin, users, seen, ins, edit, del, deliver(a), deliver(u), cancel(a), menu seen, menu edit, prep seen, my prep, done own, done free, tokens
  ['not signed in',        'anon',          null,                  D,     D,     0, 0, D, 0, 0, D,    D,    D,    0, 0, 0, D, D,    D,    0],
  ['outside Google acct',  'authenticated', 'someone@gmail.com',   false, false, 0, 0, D, 0, 0, D,    D,    D,    0, 0, 0, 0, D,    D,    0],
  ['deactivated user',     'authenticated', 'gone@test.local',     false, false, 0, 0, D, 0, 0, D,    D,    D,    0, 0, 0, 0, D,    D,    0],
  ['assigned volunteer',   'authenticated', 'vol@test.local',      true,  false, 0, 1, D, 0, 0, 'ok', D,    D,    7, 0, 0, 0, D,    D,    0],
  ['prep volunteer',       'authenticated', 'vol2@test.local',     true,  false, 0, 0, D, 0, 0, D,    D,    D,    7, 0, 1, 1, 'ok', D,    0],
  ['admin (odd casing)',   'authenticated', ' Admin@Test.Local ',  true,  true,  0, 2, 1, 2, 2, 'ok', 'ok', 'ok', 7, 7, 2, 0, 'ok', 'ok', 0],
];
console.log('Access matrix:');
for (const [who, role, email, ...want] of expect) {
  const got = [];
  for (const sql of Object.values(CHECKS)) got.push(await as(role, email, sql));
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`  ✓ ${who}`);
  else fail(`${who}: [${Object.keys(CHECKS)}]
      expected ${JSON.stringify(want)}
      got      ${JSON.stringify(got)}`);
}

// delivered_at follows the status
await db.exec(`update mothers set delivery_status = 'delivered' where full_name = 'משובצת'`);
const d1 = (await db.query(`select delivered_at is not null as v from mothers where full_name = 'משובצת'`)).rows[0].v;
await db.exec(`update mothers set delivery_status = 'out' where full_name = 'משובצת'`);
const d2 = (await db.query(`select delivered_at is null as v from mothers where full_name = 'משובצת'`)).rows[0].v;
if (d1 && d2) console.log('  ✓ delivered_at is set on delivery and cleared when the status goes back');
else fail('delivered_at does not follow delivery_status');

// Volunteers without e-mail (no sign-in): allowed, but never grant access.
await db.exec(`insert into authorized_users (full_name, role) values ('בלי מייל', 'volunteer')`);
const noMail = [
  await as('authenticated', '', 'select public.is_authorized_user()'),
  await as('authenticated', null, 'select public.is_authorized_user()'),
];
if (noMail.every(v => v === false)) console.log('  ✓ a volunteer without e-mail grants no access (empty / missing e-mail claim)');
else fail(`a row without e-mail matched a sign-in: ${noMail}`);
let adminNoMail = 'inserted';
try { await db.exec(`insert into authorized_users (full_name, role) values ('מנהלת בלי מייל', 'admin')`); }
catch { adminNoMail = 'rejected'; }
let nobody = 'inserted';
try { await db.exec(`insert into authorized_users (role) values ('volunteer')`); }
catch { nobody = 'rejected'; }
if (adminNoMail === 'rejected' && nobody === 'rejected') console.log('  ✓ a manager must have e-mail; a row needs a name or an e-mail');
else fail(`manager without e-mail: ${adminNoMail}; row without name/e-mail: ${nobody}`);

// A new delivery date clears the reminder and the confirmation.
await db.exec(`update mothers set delivery_date = '2030-01-01', reminder_sent_at = now(), confirmed_at = now(), confirm_response = 'ok' where full_name = 'משובצת'`);
await db.exec(`update mothers set delivery_date = '2030-01-02' where full_name = 'משובצת'`);
const reset = (await db.query(`select reminder_sent_at is null and confirmed_at is null and confirm_response is null as v from mothers where full_name = 'משובצת'`)).rows[0].v;
if (reset) console.log('  ✓ changing the delivery date clears the reminder and the confirmation');
else fail('reminder/confirmation not cleared on a new delivery date');

// Stock: a packed meal takes its items off the stock exactly once, and gives
// them back when the status goes back. The volunteer path (RPC) counts too.
const stockOf = async () => (await db.query(`select stock from menu_items where name = 'פשטידה'`)).rows[0].stock;
await db.exec(`update menu_items set stock = 10; update mothers set delivery_status = 'planned', stock_used = false`);
const s0 = await stockOf();
await db.exec(`update mothers set delivery_status = 'ready' where full_name = 'משובצת'`);
const s1 = await stockOf();
await db.exec(`update mothers set delivery_status = 'out' where full_name = 'משובצת'`);
await db.exec(`update mothers set delivery_status = 'delivered' where full_name = 'משובצת'`);
const s2 = await stockOf();
await db.exec(`update mothers set delivery_status = 'planned' where full_name = 'משובצת'`);
const s3 = await stockOf();
await db.exec(`begin; select set_config('request.jwt.claims', '{"email":"vol@test.local"}', true); set local role authenticated;
  select public.set_delivery_status(${ASSIGNED}, 'delivered'); commit;`);
const s4 = await stockOf();
if ([s0, s1, s2, s3, s4].join() === '10,8,8,10,8') console.log('  ✓ stock: -2 quiches when packed, once; back when unpacked; also via a volunteer');
else fail(`stock sequence expected 10,8,8,10,8 got ${[s0, s1, s2, s3, s4]}`);

// Made-fresh items: ticking a preparation adds to "already made", packing
// takes it off (never below 0), and the meal moves to "preparing".
const veg = async () => (await db.query(`select stock from menu_items where name = 'קופסת ירקות'`)).rows[0].stock;
const statusOf = async () => (await db.query(`select delivery_status from mothers where full_name = 'משובצת'`)).rows[0].delivery_status;
const asAdmin = sql => db.exec(`begin; select set_config('request.jwt.claims', '{"email":"admin@test.local"}', true); set local role authenticated; ${sql}; commit;`);
await db.exec(`update mothers set delivery_status = 'planned' where full_name = 'משובצת'; update prep_tasks set done = false; update menu_items set stock = 0 where name = 'קופסת ירקות'`);
const v0 = await veg();
await asAdmin(`select public.set_prep_done(${VOL2_TASK}, true)`);
const v1 = await veg(); const st1 = await statusOf();
await asAdmin(`select public.set_prep_done(${VOL2_TASK}, true)`);          // double tap: no change
const v2 = await veg();
await db.exec(`update mothers set delivery_status = 'ready' where full_name = 'משובצת'`);   // packed
const v3 = await veg();
await db.exec(`update mothers set delivery_status = 'delivered' where full_name = 'משובצת'`);
await asAdmin(`select public.set_prep_done(${VOL2_TASK}, false)`);         // after packing: stock untouched
const v4 = await veg();
await db.exec(`update menu_items set stock = 0 where name = 'קופסת ירקות'; update mothers set delivery_status = 'planned', stock_used = false where full_name = 'משובצת'`);
await db.exec(`update mothers set delivery_status = 'ready' where full_name = 'משובצת'`);   // packed without ticking
const v5 = await veg();
await db.exec(`update mothers set delivery_status = 'planned' where full_name = 'משובצת'`); // un-packed: no made-up count
const v6 = await veg();
const seq = [v0, v1, st1, v2, v3, v4, v5, v6].join();
if (seq === '0,1,preparing,1,0,0,0,0') console.log('  ✓ fresh items: ✓ adds to "already made", packing takes it off (not below 0), un-packing adds nothing, meal → preparing');
else fail(`fresh-item sequence expected 0,1,preparing,1,0,0,0,0 got ${seq}`);

await db.close();
if (failed) { console.error('\ncheck:sql FAILED'); process.exit(1); }
console.log('\ncheck:sql passed');
