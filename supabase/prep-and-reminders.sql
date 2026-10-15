-- ════════════════════════════════════════════════════════════════════════════
-- שמחת רבקה — stage 4: who prepares what, and e-mail reminders.
--
-- prep_tasks: one row per meal × menu item — who prepares it and whether it
--   is done. The manager assigns; a volunteer sees and ticks only her own
--   tasks (my_prep_tasks / set_prep_done), without the mother's address/phone.
--
-- Reminders: the day before a delivery the server e-mails the mother (if she
--   has an address), the volunteers and the manager. The mother confirms
--   through a link with a secret token (confirm_tokens — server only).
--
-- Idempotent: safe to run again. Run order: supabase/README.md
-- ════════════════════════════════════════════════════════════════════════════

-- ── Mothers: e-mail, reminder and confirmation ──────────────────────────────
alter table public.mothers add column if not exists email            text;
alter table public.mothers add column if not exists reminder_sent_at timestamptz;
alter table public.mothers add column if not exists confirmed_at     timestamptz;
alter table public.mothers add column if not exists confirm_response text;
alter table public.mothers add column if not exists confirm_note     text;

alter table public.mothers drop constraint if exists mothers_confirm_response_check;
alter table public.mothers
  add constraint mothers_confirm_response_check check (confirm_response in ('ok', 'change'));

-- A new delivery date needs a new reminder and a new confirmation.
create or replace function public.mothers_reminder_reset()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.delivery_date is distinct from old.delivery_date then
    new.reminder_sent_at := null;
    new.confirmed_at     := null;
    new.confirm_response := null;
    new.confirm_note     := null;
  end if;
  return new;
end;
$$;

drop trigger if exists mothers_reminder_reset on public.mothers;
create trigger mothers_reminder_reset
  before update of delivery_date on public.mothers
  for each row execute function public.mothers_reminder_reset();

-- Secret link tokens. Server only: RLS on, no policy — a volunteer who can
-- read a mother's row must not be able to confirm in her name.
create table if not exists public.confirm_tokens (
  mother_id  uuid primary key references public.mothers (id) on delete cascade,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create unique index if not exists confirm_tokens_token_key on public.confirm_tokens (token);
alter table public.confirm_tokens enable row level security;

-- ── Preparation tasks ───────────────────────────────────────────────────────
create table if not exists public.prep_tasks (
  id           uuid primary key default gen_random_uuid(),
  mother_id    uuid not null references public.mothers (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  assignee_id  uuid references public.authorized_users (id) on delete set null,
  done         boolean not null default false,
  done_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (mother_id, menu_item_id)
);

create index if not exists prep_tasks_assignee_idx on public.prep_tasks (assignee_id);

create or replace function public.prep_tasks_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.done_at := case when new.done then coalesce(new.done_at, now()) else null end;
  return new;
end;
$$;

drop trigger if exists prep_tasks_touch on public.prep_tasks;
create trigger prep_tasks_touch
  before insert or update on public.prep_tasks
  for each row execute function public.prep_tasks_touch();

alter table public.prep_tasks enable row level security;

drop policy if exists prep_tasks_admin on public.prep_tasks;
create policy prep_tasks_admin on public.prep_tasks
  for all to authenticated
  using ((select public.is_admin_user()))
  with check ((select public.is_admin_user()));

drop policy if exists prep_tasks_assignee_read on public.prep_tasks;
create policy prep_tasks_assignee_read on public.prep_tasks
  for select to authenticated
  using (assignee_id = (select public.current_authorized_user_id()));

-- A volunteer's own open tasks, with what she needs to know (no address/phone).
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
    and m.delivery_status not in ('delivered', 'cancelled')
  order by m.delivery_date nulls last, m.full_name, i.sort_order;
$$;

revoke all on function public.my_prep_tasks() from public, anon;
grant execute on function public.my_prep_tasks() to authenticated;

-- Tick / untick a task: its assignee or the manager.
create or replace function public.set_prep_done(p_task_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.prep_tasks t
     set done = p_done
   where t.id = p_task_id
     and (public.is_admin_user() or t.assignee_id = public.current_authorized_user_id());
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.set_prep_done(uuid, boolean) from public, anon;
grant execute on function public.set_prep_done(uuid, boolean) to authenticated;
