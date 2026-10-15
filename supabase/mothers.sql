-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — stage 2: new mothers (יולדות) and their one-time delivery.
--
-- Each mother gets exactly ONE breakfast delivery, so the delivery lives on
-- the mother's row (date, status, delivering volunteer).
--
-- Access:
--   admin     — everything
--   volunteer — reads only the mothers she is assigned to deliver to, and
--               changes only their delivery status (set_delivery_status()).
--
-- Idempotent: safe to run again. Run order: supabase/README.md
-- ════════════════════════════════════════════════════════════════════════════

-- ── Who is the signed-in user (row id in authorized_users) ──────────────────
create or replace function public.current_authorized_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select au.id
  from public.authorized_users au
  where lower(trim(au.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    and au.is_active
  limit 1;
$$;

revoke all on function public.current_authorized_user_id() from public, anon;
grant execute on function public.current_authorized_user_id() to authenticated;

-- ── Mothers ─────────────────────────────────────────────────────────────────
create table if not exists public.mothers (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null,
  phone                 text,
  address               text,          -- street and number
  city                  text,
  address_notes         text,          -- floor, apartment, entrance code…
  birth_date            date,          -- the baby's birth date
  notes                 text,
  delivery_date         date,          -- null = not scheduled yet
  delivery_status       text not null default 'planned',
  delivery_volunteer_id uuid references public.authorized_users (id) on delete set null,
  delivered_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.mothers drop constraint if exists mothers_delivery_status_check;
alter table public.mothers
  add constraint mothers_delivery_status_check
  check (delivery_status in ('planned', 'preparing', 'ready', 'out', 'delivered', 'cancelled'));

alter table public.mothers drop constraint if exists mothers_full_name_check;
alter table public.mothers
  add constraint mothers_full_name_check check (length(trim(full_name)) > 0);

create index if not exists mothers_delivery_date_idx      on public.mothers (delivery_date);
create index if not exists mothers_delivery_volunteer_idx on public.mothers (delivery_volunteer_id);

-- updated_at; delivered_at follows the status (set on "delivered", cleared otherwise)
create or replace function public.mothers_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.delivery_status = 'delivered' then
    new.delivered_at := coalesce(new.delivered_at, now());
  else
    new.delivered_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists mothers_touch on public.mothers;
create trigger mothers_touch
  before insert or update on public.mothers
  for each row execute function public.mothers_touch();

-- ── Access rules ────────────────────────────────────────────────────────────
alter table public.mothers enable row level security;

drop policy if exists mothers_admin on public.mothers;
create policy mothers_admin on public.mothers
  for all to authenticated
  using ((select public.is_admin_user()))
  with check ((select public.is_admin_user()));

drop policy if exists mothers_assigned_volunteer_read on public.mothers;
create policy mothers_assigned_volunteer_read on public.mothers
  for select to authenticated
  using (delivery_volunteer_id = (select public.current_authorized_user_id()));

-- ── Volunteer status updates ────────────────────────────────────────────────
-- A volunteer may not edit the row (no update policy) — only move the status
-- of a delivery assigned to her. The manager may move any.
create or replace function public.set_delivery_status(p_mother_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('planned', 'preparing', 'ready', 'out', 'delivered', 'cancelled') then
    raise exception 'invalid status' using errcode = '22023';
  end if;

  update public.mothers m
     set delivery_status = p_status
   where m.id = p_mother_id
     and (
       public.is_admin_user()
       or (m.delivery_volunteer_id = public.current_authorized_user_id()
           and p_status in ('out', 'delivered'))
     );

  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.set_delivery_status(uuid, text) from public, anon;
grant execute on function public.set_delivery_status(uuid, text) to authenticated;
