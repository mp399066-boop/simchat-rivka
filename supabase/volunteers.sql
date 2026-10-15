-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — stage 5: the volunteers list.
--
-- authorized_users becomes the team list: everyone who cooks or delivers,
-- also volunteers who never sign in (e.g. a kosher phone) — those have no
-- e-mail. Access is unchanged: it still goes only by an e-mail that matches
-- the signed-in Google account, so a row without e-mail grants no access.
--
-- Idempotent: safe to run again. Run order: supabase/README.md
-- ════════════════════════════════════════════════════════════════════════════

alter table public.authorized_users alter column email drop not null;

alter table public.authorized_users add column if not exists city        text;
alter table public.authorized_users add column if not exists can_deliver boolean not null default true;
alter table public.authorized_users add column if not exists can_cook    boolean not null default true;
alter table public.authorized_users add column if not exists notes       text;

-- A manager must be able to sign in.
alter table public.authorized_users drop constraint if exists authorized_users_admin_email_check;
alter table public.authorized_users
  add constraint authorized_users_admin_email_check check (role <> 'admin' or email is not null);

-- Someone has to be identifiable: a name or an e-mail.
alter table public.authorized_users drop constraint if exists authorized_users_identity_check;
alter table public.authorized_users
  add constraint authorized_users_identity_check
  check (email is not null or length(trim(coalesce(full_name, ''))) > 0);
