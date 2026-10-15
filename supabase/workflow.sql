-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — stage 6: workflow fixes after reviewing real use.
--
-- One count per item, everywhere: menu_items.stock is what is on hand —
--   freezer = in the freezer, buy = bought, prepare = already made (fresh).
--
--  • Ticking a preparation task ✓ ("veggie box for Rachel is made") adds that
--    meal's amount to the item's stock; unticking takes it off again. Only
--    while the meal is not packed yet — packing takes the meal's items off.
--  • Packing a meal (status ready/out/delivered) takes its items off the
--    stock, as before; made-fresh items never go below 0 (if they were made
--    without being ticked, there is simply nothing to subtract). Un-packing
--    gives back only freezer / bought items — for made-fresh items we can't
--    know how much packing really took, and a made-up "already made" count
--    is worse than a low one.
--  • my_prep_tasks() (a volunteer's own list — unused while volunteers don't
--    sign in) lists made-fresh items only.
--  • Ticking the first preparation moves a planned meal to "preparing".
--
-- Replaces functions from menu.sql / prep-and-reminders.sql (create or
-- replace). Idempotent. Run order: supabase/README.md — after those files.
-- ════════════════════════════════════════════════════════════════════════════

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
     where is_active;
    new.stock_used := true;
  elsif not packed and new.stock_used then
    update public.menu_items set stock = stock + per_meal where is_active and source <> 'prepare';
    new.stock_used := false;
  end if;
  return new;
end;
$$;

-- A volunteer's own open tasks — fresh items only.
create or replace function public.my_prep_tasks()
returns table (
  task_id uuid, done boolean, item_name text, unit text, per_meal integer,
  mother_name text, delivery_date date, delivery_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.done, i.name, i.unit, i.per_meal,
         m.full_name, m.delivery_date, m.delivery_status
  from public.prep_tasks t
  join public.menu_items i on i.id = t.menu_item_id
  join public.mothers m    on m.id = t.mother_id
  where t.assignee_id = public.current_authorized_user_id()
    and i.source = 'prepare'
    and m.delivery_status not in ('delivered', 'cancelled')
  order by m.delivery_date nulls last, m.full_name, i.sort_order;
$$;

revoke all on function public.my_prep_tasks() from public, anon;
grant execute on function public.my_prep_tasks() to authenticated;

-- Tick / untick a task (its assignee or the manager). Keeps the item's
-- "already made" stock in step, and moves a planned meal to "preparing".
create or replace function public.set_prep_done(p_task_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mother uuid;
  v_item   uuid;
  v_was    boolean;
  v_packed boolean;
begin
  select t.mother_id, t.menu_item_id, t.done, m.stock_used
    into v_mother, v_item, v_was, v_packed
    from public.prep_tasks t join public.mothers m on m.id = t.mother_id
   where t.id = p_task_id
     and (public.is_admin_user() or t.assignee_id = public.current_authorized_user_id());
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_was = p_done then
    return;   -- nothing changes (e.g. a double tap)
  end if;

  update public.prep_tasks set done = p_done where id = p_task_id;

  if not v_packed then
    update public.menu_items
       set stock = case when p_done then stock + per_meal else greatest(0, stock - per_meal) end
     where id = v_item and source = 'prepare';
  end if;

  if p_done then
    update public.mothers set delivery_status = 'preparing'
     where id = v_mother and delivery_status = 'planned';
  end if;
end;
$$;

revoke all on function public.set_prep_done(uuid, boolean) from public, anon;
grant execute on function public.set_prep_done(uuid, boolean) to authenticated;
