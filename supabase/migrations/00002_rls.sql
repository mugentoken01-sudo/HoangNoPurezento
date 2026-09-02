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
