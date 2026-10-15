# Database (Supabase) SQL files

There is no migration runner: each file is pasted into the Supabase SQL Editor
by hand. Every file is therefore **idempotent** — safe to run again at any time.

## Run order (fresh install)

| # | File | What it adds |
|---|------|--------------|
| 1 | `schema.sql` | `authorized_users`, the access-check functions, the first admin |
| 2 | `mothers.sql` | `mothers` (new mothers + their one-time delivery), `set_delivery_status()` |
| 3 | `menu.sql` | `menu_items` (fixed menu + stock), automatic stock use when a meal is packed |

For an existing database, run only the new/changed file.

`npm run check:sql` builds all of the above on a throwaway local Postgres, twice,
and verifies the access rules. Run it after any SQL change. When adding a file,
add it to the table above **and** to `FILES` in `scripts/check-sql.mjs`.

## Rules for new SQL

- **Idempotent:** `create table if not exists`, `add column if not exists`,
  `create or replace function`, `drop trigger if exists` → `create trigger`,
  `drop policy if exists` → `create policy`.
- **Every new table gets RLS** with the authorized-user check — never
  `using (true)`:

  ```sql
  alter table my_table enable row level security;
  drop policy if exists my_table_authorized on my_table;
  create policy my_table_authorized on my_table
    for all to authenticated
    using ((select public.is_authorized_user()))
    with check ((select public.is_authorized_user()));
  ```

  Manager-only data: `public.is_admin_user()` instead. Server-only data: RLS
  on, no policy (the service role bypasses RLS).
- **Storage buckets are private.** Files are served through API routes with
  short-lived signed URLs, never public links.
