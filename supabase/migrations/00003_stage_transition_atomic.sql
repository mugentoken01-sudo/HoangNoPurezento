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
