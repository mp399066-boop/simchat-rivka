-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — core schema: who may use the system.
--
-- Idempotent: safe to run again at any time (Supabase SQL Editor).
-- Run order for all files: supabase/README.md
-- ════════════════════════════════════════════════════════════════════════════

-- ── Authorized users ────────────────────────────────────────────────────────
-- Any Google account can sign in to Supabase Auth. Signing in is NOT access:
-- only an active row here (matched by e-mail) grants access to any data.
--   admin     — the organization's manager: everything, incl. managing users
--   volunteer — prepares / delivers meals
create table if not exists public.authorized_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  full_name  text,
  phone      text,
  role       text not null default 'volunteer',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.authorized_users drop constraint if exists authorized_users_role_check;
alter table public.authorized_users
  add constraint authorized_users_role_check check (role in ('admin', 'volunteer'));

-- One row per address, whatever the casing / stray spaces.
create unique index if not exists authorized_users_email_key
  on public.authorized_users (lower(trim(email)));

-- The allow-list itself is never exposed through the API: RLS on, no policy.
-- Only server code (service role) reads or changes it.
alter table public.authorized_users enable row level security;

-- ── Access checks used by every policy ──────────────────────────────────────
-- SECURITY DEFINER so they can read authorized_users (which has no policy);
-- empty search_path so nothing can be shadowed.
create or replace function public.is_authorized_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.authorized_users au
    where lower(trim(au.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      and au.is_active
  );
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.authorized_users au
    where lower(trim(au.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      and au.is_active
      and au.role = 'admin'
  );
$$;

revoke all on function public.is_authorized_user() from public, anon;
revoke all on function public.is_admin_user()      from public, anon;
grant execute on function public.is_authorized_user() to authenticated;
grant execute on function public.is_admin_user()      to authenticated;

-- ── First manager ───────────────────────────────────────────────────────────
-- Without one admin nobody could add users. Further users are added in the
-- app (ניהול משתמשות). Never overwrites an existing row.
insert into public.authorized_users (email, full_name, role)
values ('mp399066@gmail.com', 'מנהלת', 'admin')
on conflict ((lower(trim(email)))) do nothing;
