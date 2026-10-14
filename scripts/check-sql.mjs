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
    ('gone@test.local', 'volunteer', false);
`);

/** Runs `sql` as `role` with the given JWT e-mail; returns the first cell, or 'denied'. */
async function as(role, email, sql) {
  const claims = email ? JSON.stringify({ email }) : '';
  await db.exec(`reset role; select set_config('request.jwt.claims', '${claims}', false); set role ${role};`);
  try {
    const r = await db.query(sql);
    return r.rows.length ? Object.values(r.rows[0])[0] : 0;
  } catch { return 'denied'; }
  finally { await db.exec('reset role'); }
}

const expect = [
  // who,                 role,            email,                 authorized, admin, rows of authorized_users
  ['not signed in',       'anon',          null,                  'denied', 'denied', 0],
  ['outside Google acct', 'authenticated', 'someone@gmail.com',   false,    false,    0],
  ['deactivated user',    'authenticated', 'gone@test.local',     false,    false,    0],
  ['volunteer',           'authenticated', 'vol@test.local',      true,     false,    0],
  ['admin (odd casing)',  'authenticated', ' Admin@Test.Local ',  true,     true,     0],
];
console.log('Access matrix:');
for (const [who, role, email, ...want] of expect) {
  const got = [
    await as(role, email, 'select public.is_authorized_user()'),
    await as(role, email, 'select public.is_admin_user()'),
    await as(role, email, 'select count(*)::int from authorized_users'),
  ];
  if (JSON.stringify(got) === JSON.stringify(want)) console.log(`  ✓ ${who}`);
  else fail(`${who}: expected [is_authorized, is_admin, authorized_users rows] = ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
}

await db.close();
if (failed) { console.error('\ncheck:sql FAILED'); process.exit(1); }
console.log('\ncheck:sql passed');
