-- RM Cockpit — Module 1: Core Schema
-- 7 tables + enums + owner_id + indexes + FK cascades
-- Design decision: ENUM vs lookup table — ENUM chosen for MVP because
-- the 7 pipeline stages are FIXED (spec §3.3) and task_status/severity have
-- <5 values each. Lookup table would add JOIN overhead with no flexibility gain
-- at this stage. If stages become configurable (spec §9 open question), migrate
-- to a pipeline_stages lookup table in Module 3.

-- ─── Extensions ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── ENUMs ───────────────────────────────────────────────────────────────
do $$ begin create type pipeline_stage as enum (
  'lead','contacted','qualified','meeting','credit','approved','disbursed'
); exception when duplicate_object then null; end $$;

do $$ begin create type customer_status as enum ('active','lost','won');
  exception when duplicate_object then null; end $$;

do $$ begin create type next_action_type as enum ('call','meeting','email');
  exception when duplicate_object then null; end $$;

do $$ begin create type task_status as enum ('todo','doing','done');
  exception when duplicate_object then null; end $$;

do $$ begin create type task_source as enum ('manual','auto_template');
  exception when duplicate_object then null; end $$;

do $$ begin create type flag_severity as enum ('low','medium','high');
  exception when duplicate_object then null; end $$;

-- ─── Helper: updated_at trigger ────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ─── customers ─────────────────────────────────────────────────────────
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  company_name text not null,
  industry text,
  revenue_reported bigint,                          -- VND, e.g. 80000000000 = 80B
  credit_need_type text,                            -- e.g. 'VLĐ', 'DA', 'BL'
  credit_need_amount bigint,
  credit_need_purpose text,
  current_banks text[] default '{}',
  stage pipeline_stage not null default 'lead',
  status customer_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_owner on customers(owner_id);
create index if not exists idx_customers_stage on customers(stage);
create index if not exists idx_customers_status on customers(status);
drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();

-- ─── contacts ──────────────────────────────────────────────────────────
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  title text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_customer on contacts(customer_id);
create index if not exists idx_contacts_owner on contacts(owner_id);
drop trigger if exists trg_contacts_updated on contacts;
create trigger trg_contacts_updated before update on contacts
  for each row execute function set_updated_at();

-- ─── notes ─────────────────────────────────────────────────────────────
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  content text not null,
  next_action_type next_action_type,
  next_action_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notes_customer on notes(customer_id);
create index if not exists idx_notes_owner on notes(owner_id);
create index if not exists idx_notes_next_action_date on notes(next_action_date) where next_action_date is not null;
drop trigger if exists trg_notes_updated on notes;
create trigger trg_notes_updated before update on notes
  for each row execute function set_updated_at();

-- ─── tasks ─────────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  title text not null,
  due_date date,
  status task_status not null default 'todo',
  source task_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_customer on tasks(customer_id);
create index if not exists idx_tasks_owner on tasks(owner_id);
create index if not exists idx_tasks_due on tasks(due_date) where due_date is not null;
create index if not exists idx_tasks_status on tasks(status);
drop trigger if exists trg_tasks_updated on tasks;
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();

-- ─── pipeline_stage_history ────────────────────────────────────────────
create table if not exists pipeline_stage_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  from_stage pipeline_stage,
  to_stage pipeline_stage not null,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_psh_customer on pipeline_stage_history(customer_id);
create index if not exists idx_psh_owner on pipeline_stage_history(owner_id);
create index if not exists idx_psh_changed on pipeline_stage_history(changed_at);

-- ─── financial_statements ──────────────────────────────────────────────
create table if not exists financial_statements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  period text not null,                             -- e.g. '2023', '2023-Q4', '2024-H1'
  revenue bigint,
  cogs bigint,
  net_income bigint,
  ebit bigint,
  ebitda bigint,
  interest_expense bigint,
  total_assets bigint,
  total_liabilities bigint,
  total_equity bigint,
  current_assets bigint,
  current_liabilities bigint,
  inventory bigint,
  receivables bigint,
  payables bigint,
  cfo bigint,
  total_debt bigint,
  cash bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, period)
);
create index if not exists idx_fs_customer on financial_statements(customer_id);
create index if not exists idx_fs_owner on financial_statements(owner_id);
drop trigger if exists trg_fs_updated on financial_statements;
create trigger trg_fs_updated before update on financial_statements
  for each row execute function set_updated_at();

-- ─── financial_ratios (derived / cached) ───────────────────────────────
-- Design decision: on-write (compute when FS is inserted/updated) — chosen for MVP
-- because ratios are read-heavy (dashboard + credit tab every view) and write-rare
-- (1 FS per year/quarter). On-read would recompute every page load.
-- A DB trigger or API-layer compute both work; we do API-layer so the logic is
-- testable in TypeScript and the table doubles as an audit cache.
create table if not exists financial_ratios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  financial_statement_id uuid not null references financial_statements(id) on delete cascade,
  period text not null,
  -- growth (requires previous period — nullable if no prior)
  revenue_growth numeric,
  net_income_growth numeric,
  -- liquidity
  current_ratio numeric,
  quick_ratio numeric,
  -- leverage
  debt_to_equity numeric,
  debt_to_ebitda numeric,
  -- coverage
  interest_coverage numeric,
  -- cash flow
  cfo_to_net_income numeric,
  -- efficiency
  receivable_days numeric,
  inventory_days numeric,
  payable_days numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(financial_statement_id)
);
create index if not exists idx_fr_customer on financial_ratios(customer_id);
create index if not exists idx_fr_fs on financial_ratios(financial_statement_id);
create index if not exists idx_fr_owner on financial_ratios(owner_id);
drop trigger if exists trg_fr_updated on financial_ratios;
create trigger trg_fr_updated before update on financial_ratios
  for each row execute function set_updated_at();

-- ─── red_flags ─────────────────────────────────────────────────────────
create table if not exists red_flags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  customer_id uuid not null references customers(id) on delete cascade,
  period text,
  rule_triggered text not null,                     -- machine key, e.g. 'debt_growth_gt_revenue'
  severity flag_severity not null default 'medium',
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rf_customer on red_flags(customer_id);
create index if not exists idx_rf_owner on red_flags(owner_id);
create index if not exists idx_rf_severity on red_flags(severity);
drop trigger if exists trg_rf_updated on red_flags;
create trigger trg_rf_updated before update on red_flags
  for each row execute function set_updated_at();
-- RM Cockpit — Module 1: Row-Level Security
-- Every table: owner_id = auth.uid(). Service role bypasses RLS by design.
-- owner_id is server-enforced: WITH CHECK ensures inserts/updates cannot spoof.

-- Enable RLS on all 7 tables + financial_ratios (8 total)
alter table customers               enable row level security;
alter table contacts                enable row level security;
alter table notes                   enable row level security;
alter table tasks                   enable row level security;
alter table pipeline_stage_history  enable row level security;
alter table financial_statements    enable row level security;
alter table financial_ratios        enable row level security;
alter table red_flags               enable row level security;

-- Helper macro expanded per table: 4 policies each (SELECT/INSERT/UPDATE/DELETE)
-- Customers
drop policy if exists customers_select_own on customers;
create policy customers_select_own on customers for select using (owner_id = auth.uid());
drop policy if exists customers_insert_own on customers;
create policy customers_insert_own on customers for insert with check (owner_id = auth.uid());
drop policy if exists customers_update_own on customers;
create policy customers_update_own on customers for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists customers_delete_own on customers;
create policy customers_delete_own on customers for delete using (owner_id = auth.uid());

-- Contacts
drop policy if exists contacts_select_own on contacts;
create policy contacts_select_own on contacts for select using (owner_id = auth.uid());
drop policy if exists contacts_insert_own on contacts;
create policy contacts_insert_own on contacts for insert with check (owner_id = auth.uid());
drop policy if exists contacts_update_own on contacts;
create policy contacts_update_own on contacts for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists contacts_delete_own on contacts;
create policy contacts_delete_own on contacts for delete using (owner_id = auth.uid());

-- Notes
drop policy if exists notes_select_own on notes;
create policy notes_select_own on notes for select using (owner_id = auth.uid());
drop policy if exists notes_insert_own on notes;
create policy notes_insert_own on notes for insert with check (owner_id = auth.uid());
drop policy if exists notes_update_own on notes;
create policy notes_update_own on notes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists notes_delete_own on notes;
create policy notes_delete_own on notes for delete using (owner_id = auth.uid());

-- Tasks
drop policy if exists tasks_select_own on tasks;
create policy tasks_select_own on tasks for select using (owner_id = auth.uid());
drop policy if exists tasks_insert_own on tasks;
create policy tasks_insert_own on tasks for insert with check (owner_id = auth.uid());
drop policy if exists tasks_update_own on tasks;
create policy tasks_update_own on tasks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists tasks_delete_own on tasks;
create policy tasks_delete_own on tasks for delete using (owner_id = auth.uid());

-- Pipeline stage history
drop policy if exists psh_select_own on pipeline_stage_history;
create policy psh_select_own on pipeline_stage_history for select using (owner_id = auth.uid());
drop policy if exists psh_insert_own on pipeline_stage_history;
create policy psh_insert_own on pipeline_stage_history for insert with check (owner_id = auth.uid());
drop policy if exists psh_update_own on pipeline_stage_history;
create policy psh_update_own on pipeline_stage_history for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists psh_delete_own on pipeline_stage_history;
create policy psh_delete_own on pipeline_stage_history for delete using (owner_id = auth.uid());

-- Financial statements
drop policy if exists fs_select_own on financial_statements;
create policy fs_select_own on financial_statements for select using (owner_id = auth.uid());
drop policy if exists fs_insert_own on financial_statements;
create policy fs_insert_own on financial_statements for insert with check (owner_id = auth.uid());
drop policy if exists fs_update_own on financial_statements;
create policy fs_update_own on financial_statements for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists fs_delete_own on financial_statements;
create policy fs_delete_own on financial_statements for delete using (owner_id = auth.uid());

-- Financial ratios
drop policy if exists fr_select_own on financial_ratios;
create policy fr_select_own on financial_ratios for select using (owner_id = auth.uid());
drop policy if exists fr_insert_own on financial_ratios;
create policy fr_insert_own on financial_ratios for insert with check (owner_id = auth.uid());
drop policy if exists fr_update_own on financial_ratios;
create policy fr_update_own on financial_ratios for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists fr_delete_own on financial_ratios;
create policy fr_delete_own on financial_ratios for delete using (owner_id = auth.uid());

-- Red flags
drop policy if exists rf_select_own on red_flags;
create policy rf_select_own on red_flags for select using (owner_id = auth.uid());
drop policy if exists rf_insert_own on red_flags;
create policy rf_insert_own on red_flags for insert with check (owner_id = auth.uid());
drop policy if exists rf_update_own on red_flags;
create policy rf_update_own on red_flags for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists rf_delete_own on red_flags;
create policy rf_delete_own on red_flags for delete using (owner_id = auth.uid());
-- RM Cockpit Module 3 — Phase 1 audit fix (P0/P1)
-- Atomic stage transition + idempotent Credit checklist via single transactional RPC.
-- Replaces the check-then-insert race in app/api/customers/[id]/stage/route.ts.
-- Also protects child ownership (contacts/notes/tasks under own customer) via helper.

-- ── 1) Ensure tasks idempotency guard at DB level ─────────────────────────
-- Unique on (customer_id, title) where source = 'auto_template' prevents
-- concurrent double-insert from producing 8 rows. Insert uses ON CONFLICT DO NOTHING.
create unique index if not exists uq_tasks_auto_template
  on tasks(customer_id, title) where source = 'auto_template';

-- ── 2) Atomic transition function ─────────────────────────────────────────
-- Performs in one transaction:
--   a) Lock & verify ownership of customer row (FOR UPDATE)
--   b) No-op early return if already in target stage (no history row)
--   c) Update customers.stage
--   d) Insert exactly one pipeline_stage_history row
--   e) If to_stage = 'credit', insert 4 template tasks idempotently; return how many actually inserted
-- RLS is still enforced by caller (API verifies via requireUser + row ownership check),
-- but function also checks auth.uid() = owner_id to prevent cross-owner if called directly.
create or replace function transition_customer_stage(
  p_customer_id uuid,
  p_to_stage pipeline_stage
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid := auth.uid();
  v_from pipeline_stage;
  v_history_id uuid;
  v_inserted int := 0;
  v_is_noop boolean := false;
begin
  if v_owner is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Lock customer row and verify ownership
  select stage into v_from
  from customers
  where id = p_customer_id and owner_id = v_owner
  for update;

  if not found then
    raise exception 'Customer not found or not owned by caller' using errcode = '42501';
  end if;

  if v_from = p_to_stage then
    -- No-op: distinguish from real transition in response
    return jsonb_build_object(
      'noop', true,
      'from_stage', v_from,
      'to_stage', p_to_stage,
      'history_id', null,
      'tasks_created', 0
    );
  end if;

  -- Update stage
  update customers set stage = p_to_stage, updated_at = now()
  where id = p_customer_id;

  -- Insert history (exactly one row per real transition)
  insert into pipeline_stage_history (customer_id, owner_id, from_stage, to_stage)
  values (p_customer_id, v_owner, v_from, p_to_stage)
  returning id into v_history_id;

  -- Credit checklist — idempotent via ON CONFLICT DO NOTHING on uq_tasks_auto_template
  if p_to_stage = 'credit' then
    with inserted as (
      insert into tasks (customer_id, owner_id, title, source, status)
      values
        (p_customer_id, v_owner, 'Xin BCTC — Request financial statements', 'auto_template', 'todo'),
        (p_customer_id, v_owner, 'Xin dư nợ — Request outstanding debt info', 'auto_template', 'todo'),
        (p_customer_id, v_owner, 'Kiểm tra TSBĐ — Check collateral', 'auto_template', 'todo'),
        (p_customer_id, v_owner, 'Chuẩn bị phương án hạn mức — Prepare credit limit proposal', 'auto_template', 'todo')
      on conflict (customer_id, title) where source = 'auto_template' do nothing
      returning id
    )
    select count(*) into v_inserted from inserted;
  end if;

  return jsonb_build_object(
    'noop', false,
    'from_stage', v_from,
    'to_stage', p_to_stage,
    'history_id', v_history_id,
    'tasks_created', v_inserted
  );
end;
$$;

revoke all on function transition_customer_stage(uuid, pipeline_stage) from public;
grant execute on function transition_customer_stage(uuid, pipeline_stage) to authenticated;

-- Helper note for Phase 1 audit: child ownership is enforced in API layer (see updated routes)
-- via: select id from customers where id = $customer_id and owner_id = auth.uid()
-- No direct DB trigger needed; API fails fast with 403/404 if ownership mismatch.
-- RM Cockpit — M5+M6 Patch (P-2 + P-3)
-- Gộp 2 cột mới cho red_flags để reconciliation + cascade dọn flag mồ côi
-- Không đụng RLS (policy hiện tại theo owner_id đã bao trọn 2 cột mới)
-- Idempotent: if not exists

alter table red_flags
  add column if not exists financial_statement_id uuid references financial_statements(id) on delete cascade,
  add column if not exists source text not null default 'rule_engine'
    check (source in ('rule_engine','manual'));

create index if not exists idx_rf_fs_id on red_flags(financial_statement_id) where financial_statement_id is not null;
create index if not exists idx_rf_source on red_flags(source);
