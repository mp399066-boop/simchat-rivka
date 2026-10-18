/**
 * npm run set-password -- <email> [password]
 *
 * Sets (or resets) the login password of a manager. Without a password a
 * random one is generated and printed. Only e-mails of managers (admin in
 * authorized_users) are accepted — the list is what grants access; this only
 * sets the password. Creates the Supabase Auth account if it doesn't exist.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */

import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing Supabase env vars (run with --env-file=.env.local)');
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run set-password -- <email> [password]');
  process.exit(1);
}

// Easy to type on a phone: letters (no look-alikes) and digits.
const ABC = 'abcdefghjkmnpqrstuvwxyz23456789';
const password = process.argv[3] ?? Array.from({ length: 10 }, () => ABC[randomInt(ABC.length)]).join('');
if (password.length < 8) {
  console.error('Password must be at least 8 characters');
  process.exit(1);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: rows, error: e1 } = await service.from('authorized_users')
  .select('id').ilike('email', email).eq('role', 'admin');
if (e1) { console.error('authorized_users:', e1.message); process.exit(1); }
if (!rows?.length) { console.error(`${email} is not a manager in authorized_users`); process.exit(1); }

let existing = null;
for (let page = 1; !existing; page++) {
  const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) { console.error('listUsers:', error.message); process.exit(1); }
  existing = data.users.find(u => u.email?.toLowerCase() === email) ?? null;
  if (data.users.length < 1000) break;
}

const { error } = existing
  ? await service.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
  : await service.auth.admin.createUser({ email, password, email_confirm: true });
if (error) { console.error('set password:', error.message); process.exit(1); }

console.log(`${existing ? 'Updated' : 'Created'} ${email}  password: ${password}`);
