/**
 * node --env-file=.env.local scripts/check-live-access.mjs
 *
 * Checks the access rules on the REAL Supabase project (scripts/check-sql.mjs
 * does the same on a throwaway local Postgres). It creates temporary test
 * accounts (*@check.simchat-rivka.test) and test mothers, signs in as each
 * one, checks what it can see and do, and deletes everything it created —
 * also when a check fails. Real data is never read or changed.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
 * SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error('Missing Supabase env vars (run with --env-file=.env.local)');
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, opts);
const TAG = randomBytes(4).toString('hex');
const PEOPLE = {
  admin:     { email: `admin-${TAG}@check.simchat-rivka.test`, role: 'admin' },
  volunteer: { email: `vol-${TAG}@check.simchat-rivka.test`,   role: 'volunteer' },
  other:     { email: `other-${TAG}@check.simchat-rivka.test`, role: 'volunteer' },
  outsider:  { email: `out-${TAG}@check.simchat-rivka.test`,   role: null },
};

let failed = false;
const ok = (cond, msg) => { console.log(cond ? '  ✓' : '  ✗', msg); if (!cond) failed = true; };

const created = { authIds: [], userRowIds: [], motherIds: [] };

async function signIn(email, password) {
  const client = createClient(url, anonKey, opts);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for test account: ${error.message}`);
  return client;
}

try {
  // ── Setup ─────────────────────────────────────────────────────────────────
  const clients = {};
  for (const [key, p] of Object.entries(PEOPLE)) {
    const password = randomBytes(18).toString('base64url');
    const { data, error } = await service.auth.admin.createUser({ email: p.email, password, email_confirm: true });
    if (error) throw new Error(`createUser: ${error.message}`);
    created.authIds.push(data.user.id);
    if (p.role) {
      const { data: row, error: e2 } = await service.from('authorized_users')
        .insert({ email: p.email, role: p.role, full_name: `בדיקה ${key}` }).select('id').single();
      if (e2) throw new Error(`authorized_users insert: ${e2.message}`);
      created.userRowIds.push(row.id);
      p.rowId = row.id;
    }
    clients[key] = await signIn(p.email, password);
  }

  // ── Manager ───────────────────────────────────────────────────────────────
  console.log('Manager:');
  const { data: m1, error: e1 } = await clients.admin.from('mothers')
    .insert({ full_name: `בדיקה ${TAG} משובצת`, delivery_volunteer_id: PEOPLE.volunteer.rowId }).select('id').single();
  ok(!e1 && m1, 'adds a mother');
  if (m1) created.motherIds.push(m1.id);
  const { data: m2 } = await clients.admin.from('mothers')
    .insert({ full_name: `בדיקה ${TAG} לא משובצת` }).select('id').single();
  if (m2) created.motherIds.push(m2.id);
  const { data: edited } = await clients.admin.from('mothers').update({ notes: 'x' }).in('id', created.motherIds).select('id');
  ok(edited?.length === 2, 'edits mothers');
  const { error: s1 } = await clients.admin.rpc('set_delivery_status', { p_mother_id: m2?.id, p_status: 'ready' });
  ok(!s1, 'changes any delivery status');

  // ── Assigned volunteer ────────────────────────────────────────────────────
  console.log('Assigned volunteer:');
  const { data: seen } = await clients.volunteer.from('mothers').select('id').in('id', created.motherIds);
  ok(seen?.length === 1 && seen[0].id === m1?.id, 'sees only the mother assigned to her');
  const { data: vEdit } = await clients.volunteer.from('mothers').update({ notes: 'hack' }).eq('id', m1?.id).select('id');
  ok(!vEdit?.length, 'cannot edit the row directly');
  const { error: vIns } = await clients.volunteer.from('mothers').insert({ full_name: `בדיקה ${TAG} hack` });
  ok(!!vIns, 'cannot add mothers');
  const { error: vOut } = await clients.volunteer.rpc('set_delivery_status', { p_mother_id: m1?.id, p_status: 'delivered' });
  ok(!vOut, 'marks her delivery as delivered');
  const { error: vCancel } = await clients.volunteer.rpc('set_delivery_status', { p_mother_id: m1?.id, p_status: 'cancelled' });
  ok(!!vCancel, 'cannot cancel a delivery');
  const { error: vOther } = await clients.volunteer.rpc('set_delivery_status', { p_mother_id: m2?.id, p_status: 'delivered' });
  ok(!!vOther, "cannot change someone else's delivery");
  const { data: vUsers } = await clients.volunteer.from('authorized_users').select('id');
  ok(!vUsers?.length, 'cannot read the user list');

  // ── Others ────────────────────────────────────────────────────────────────
  console.log('Other volunteer / outsider / signed out:');
  const { data: oSeen } = await clients.other.from('mothers').select('id').in('id', created.motherIds);
  ok(!oSeen?.length, 'another volunteer sees none of them');
  const { data: xSeen } = await clients.outsider.from('mothers').select('id').in('id', created.motherIds);
  ok(!xSeen?.length, 'a signed-in Google account that is not on the list sees nothing');
  const anon = createClient(url, anonKey, opts);
  const { data: aSeen } = await anon.from('mothers').select('id').in('id', created.motherIds);
  ok(!aSeen?.length, 'signed out sees nothing');
  const { data: delivered } = await service.from('mothers').select('delivery_status, delivered_at').eq('id', m1?.id).single();
  ok(delivered?.delivery_status === 'delivered' && !!delivered?.delivered_at, 'delivery time recorded');
} catch (e) {
  ok(false, `setup/run error: ${e.message}`);
} finally {
  // ── Cleanup — always ──────────────────────────────────────────────────────
  if (created.motherIds.length) {
    const { error } = await service.from('mothers').delete().in('id', created.motherIds);
    if (error) console.error('  ! cleanup mothers failed:', error.message);
  }
  if (created.userRowIds.length) {
    const { error } = await service.from('authorized_users').delete().in('id', created.userRowIds);
    if (error) console.error('  ! cleanup authorized_users failed:', error.message);
  }
  for (const id of created.authIds) {
    const { error } = await service.auth.admin.deleteUser(id);
    if (error) console.error('  ! cleanup auth user failed:', error.message);
  }
  const { data: left } = await service.from('authorized_users').select('id').like('email', '%@check.simchat-rivka.test');
  console.log(left?.length ? `  ! ${left.length} test rows left behind` : 'Cleanup: all test data removed');
}

if (failed) { console.error('\ncheck-live-access FAILED'); process.exit(1); }
console.log('\ncheck-live-access passed');
