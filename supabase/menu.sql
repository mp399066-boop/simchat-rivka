-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — stage 3: the fixed menu, stock, and automatic stock use.
--
-- menu_items: what goes into every meal and how many of each (per_meal), and
-- how many are on hand (stock). When a meal is packed (status ready / out /
-- delivered) its items come off the stock automatically; if the status goes
-- back (planned / preparing / cancelled) they are returned.
--
-- Access: every authorized user may read the menu; only the manager edits it.
-- Idempotent: safe to run again. Run order: supabase/README.md
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  details     text,                         -- e.g. what goes into the veggie box
  unit        text not null default 'יח׳',
  per_meal    integer not null default 1,   -- how many go into one meal
  stock       integer not null default 0,   -- on hand now (negative = missing)
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.menu_items drop constraint if exists menu_items_per_meal_check;
alter table public.menu_items add constraint menu_items_per_meal_check check (per_meal >= 0);
alter table public.menu_items drop constraint if exists menu_items_name_check;
alter table public.menu_items add constraint menu_items_name_check check (length(trim(name)) > 0);

create or replace function public.menu_items_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch
  before update on public.menu_items
  for each row execute function public.menu_items_touch();

-- ── Access rules ────────────────────────────────────────────────────────────
alter table public.menu_items enable row level security;

drop policy if exists menu_items_read on public.menu_items;
create policy menu_items_read on public.menu_items
  for select to authenticated
  using ((select public.is_authorized_user()));

drop policy if exists menu_items_admin on public.menu_items;
create policy menu_items_admin on public.menu_items
  for all to authenticated
  using ((select public.is_admin_user()))
  with check ((select public.is_admin_user()));

-- ── The fixed menu (only when the table is still empty) ─────────────────────
insert into public.menu_items (name, details, unit, per_meal, sort_order)
select v.name, v.details, v.unit, v.per_meal, v.sort_order
from (values
  ('לחמניות / בייגלס', null,                                                  'יח׳',   4, 10),
  ('קופסת ירקות',      'מלפפון, עגבנייה, בצל, פלפל, זיתים וגרעיני חמנייה',     'קופסה', 1, 20),
  ('פשטידה',           null,                                                  'יח׳',   2, 30),
  ('קינוח בכוס',       null,                                                  'כוס',   2, 40),
  ('מטבלים / גבינות',  null,                                                  'יח׳',   2, 50),
  ('סכו״ם',            null,                                                  'סט',    2, 60),
  ('מפיות',            null,                                                  'יח׳',   4, 70)
) as v(name, details, unit, per_meal, sort_order)
where not exists (select 1 from public.menu_items);

-- ── Automatic stock use ─────────────────────────────────────────────────────
-- stock_used marks a meal whose items were taken off the stock, so each meal
-- is counted exactly once, whatever order the statuses change in.
alter table public.mothers add column if not exists stock_used boolean not null default false;

-- SECURITY DEFINER: a volunteer marking "delivered" (via set_delivery_status)
-- or the manager changing a status may move stock without editing the menu.
-- (A trigger function cannot be called directly, so no EXECUTE grant is needed.)
create or replace function public.mothers_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  packed boolean := new.delivery_status in ('ready', 'out', 'delivered');
begin
  if packed and not new.stock_used then
    update public.menu_items set stock = stock - per_meal where is_active;
    new.stock_used := true;
  elsif not packed and new.stock_used then
    update public.menu_items set stock = stock + per_meal where is_active;
    new.stock_used := false;
  end if;
  return new;
end;
$$;


drop trigger if exists mothers_stock on public.mothers;
create trigger mothers_stock
  before insert or update of delivery_status on public.mothers
  for each row execute function public.mothers_stock();
