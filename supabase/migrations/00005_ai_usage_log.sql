-- RM Cockpit Module 5 — AI usage tracking (BYOK bypass, system daily cap 10, atomic)
-- RLS owner-scoped, following Module 1 pattern. Calendar day in Asia/Ho_Chi_Minh.

create table if not exists ai_usage_log (
  owner_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  count int not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, usage_date)
);

alter table ai_usage_log enable row level security;

drop policy if exists ai_usage_log_owner_all on ai_usage_log;
create policy ai_usage_log_owner_all on ai_usage_log
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index if not exists idx_ai_usage_log_owner_date on ai_usage_log(owner_id, usage_date);

-- Atomic increment-and-check: returns { allowed boolean, count int, cap int }
-- Mirrors Module 3 stage-transition RPC discipline — no read-then-write race.
create or replace function increment_ai_usage(p_owner_id uuid, p_date date, p_cap int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into ai_usage_log(owner_id, usage_date, count)
  values (p_owner_id, p_date, 1)
  on conflict (owner_id, usage_date) do update
    set count = ai_usage_log.count + 1, updated_at = now()
  returning count into v_count;

  -- If we just exceeded cap, revert the increment and deny
  if v_count > p_cap then
    update ai_usage_log set count = count - 1, updated_at = now()
    where owner_id = p_owner_id and usage_date = p_date;
    return jsonb_build_object('allowed', false, 'count', v_count - 1, 'cap', p_cap);
  end if;

  return jsonb_build_object('allowed', true, 'count', v_count, 'cap', p_cap);
end;
$$;

revoke all on function increment_ai_usage(uuid, date, int) from public;
grant execute on function increment_ai_usage(uuid, date, int) to authenticated;

-- Keep updated_at trigger consistent with Module 1
drop trigger if exists trg_ai_usage_log_updated on ai_usage_log;
create trigger trg_ai_usage_log_updated before update on ai_usage_log
  for each row execute function set_updated_at();
