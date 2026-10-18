-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — stage 7: categories — יולדות, חתונות, שמחות.
--
-- Every meal belongs to one category, and so does every menu item:
--   birth   — a new mother (יולדת)          — the existing rows
--   wedding — a young couple (זוג צעיר)
--   simcha  — another celebration (בר מצווה, ברית, ...)
-- Each category has its own menu and stock; packing a meal takes only its own
-- category's items off the stock, and a meal's checklist (prep_tasks) holds
-- only items of its category.
--
-- `mothers` keeps its name (it holds every recipient: a mother, a couple, a
-- family); `birth_date` is the date of the event (birth / wedding / simcha).
-- A row's category never changes after it is added (its stock and checklist
-- belong to that category) — to move one, delete it and add it again.
--
-- Existing rows become 'birth'. Replaces mothers_stock() from workflow.sql.
-- Idempotent. Run order: supabase/README.md — after workflow.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── The category column ─────────────────────────────────────────────────────
alter table public.mothers    add column if not exists category text not null default 'birth';
alter table public.menu_items add column if not exists category text not null default 'birth';

alter table public.mothers drop constraint if exists mothers_category_check;
alter table public.mothers
  add constraint mothers_category_check check (category in ('birth', 'wedding', 'simcha'));
alter table public.menu_items drop constraint if exists menu_items_category_check;
alter table public.menu_items
  add constraint menu_items_category_check check (category in ('birth', 'wedding', 'simcha'));

create index if not exists mothers_category_idx    on public.mothers (category);
create index if not exists menu_items_category_idx on public.menu_items (category);

-- What is celebrated, for a simcha (e.g. "בר מצווה"). Optional.
alter table public.mothers add column if not exists occasion text;

-- ── A row's category is fixed ───────────────────────────────────────────────
create or replace function public.mothers_category_fixed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.category is distinct from old.category then
    raise exception 'category cannot change' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists mothers_category_fixed on public.mothers;
create trigger mothers_category_fixed
  before update of category on public.mothers
  for each row execute function public.mothers_category_fixed();

-- ── Packing takes only the meal's own category off the stock ────────────────
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
    update public.menu_items
       set stock = case when source = 'prepare' then greatest(0, stock - per_meal) else stock - per_meal end
     where is_active and category = new.category;
    new.stock_used := true;
  elsif not packed and new.stock_used then
    update public.menu_items set stock = stock + per_meal
     where is_active and source <> 'prepare' and category = new.category;
    new.stock_used := false;
  end if;
  return new;
end;
$$;

-- ── A checklist line must be an item of the meal's category ─────────────────
create or replace function public.prep_tasks_same_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.mothers m join public.menu_items i on i.id = new.menu_item_id
    where m.id = new.mother_id and m.category = i.category
  ) then
    raise exception 'menu item of another category' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists prep_tasks_same_category on public.prep_tasks;
create trigger prep_tasks_same_category
  before insert or update of mother_id, menu_item_id on public.prep_tasks
  for each row execute function public.prep_tasks_same_category();
