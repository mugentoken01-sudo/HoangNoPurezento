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
