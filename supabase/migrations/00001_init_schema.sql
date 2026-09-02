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
