# RM Cockpit — Modules 1–6 (all shipped)

> **M1** Data + Auth + API ✅ · **M2** Customer UI ✅ · **M3** Pipeline Kanban ✅ · **M4** Dashboard ✅ · **M5** Credit Analysis (frontend + reconciliation) ✅ · **M6** DevOps (CI/CD, hosting, domain, backup) ✅

Source plan `RM-Cockpit-Ke-Hoach-Tong-Quan.md` (§2–§9). This doc is the **follow-on** §10–§18 — patched against a direct audit of `mugentoken01-sudo/HoangNoPurezento` (repomix snapshot), not a rewrite of the original spec. The real gap before this build: **M5 backend existed but had zero UI and 5 backend bugs; M6 had not started at all.**

---

## Current state before M5+M6 (snapshot audit)

| Module | Status | Notes |
|---|---|---|
| M1 Data + Auth + API | ✅ Done | 8 tables, 32 RLS policies, `owner_id` server-set |
| M2 Customer UI | ✅ Done | Profile, Notes, Tasks, Contacts, unified feed |
| M3 Kanban | ✅ Done (P0/P1 audited) | Atomic RPC `transition_customer_stage`, idempotent credit checklist |
| M4 Dashboard | ✅ Done (P0/P1 audited) | `Asia/Ho_Chi_Minh`, bounded, `errors[]` isolation |
| **M5** | 🟡 Backend only | `financial_statements`/`financial_ratios`/`red_flags` CRUD + `lib/ratios.ts` (5 rules) via API. **No UI** on `/customers/[id]`, no Excel, no chart, no flag list. `lib/api-client.ts` had none of the 8 credit functions. |
| **M6** | 🔴 Not started | No `.github/workflows`, no `vercel.json`, not deployed, no backup, `package.json` missing `typecheck`. |

---

## Patch audit matrix — P-1…P-5 (applied before extending M5)

Convention matches M3/M4 `Phase 1 audit matrices` (`README` prior §).

| # | Requirement | Before (bug) | Sev | Files | Fix |
|---|---|---|---|---|---|
| **P-1** | Red flag must track latest numbers | `PATCH /api/financial-statements/[id]` called `computeRatios` but **never `evaluateRedFlags`** (imported, unused) → editing BCTC updated ratios but stale rule flags stayed on the file | **P0** | `app/api/financial-statements/[id]/route.ts` | PATCH now: delete `red_flags` with `financial_statement_id=id AND source='rule_engine'`, re-`evaluateRedFlags(data, prev, ratios)`, insert with `financial_statement_id` + `source='rule_engine'`, return `flags_updated`; GET also reads by `financial_statement_id` first |
| **P-2** | Deleting BCTC must clean its flags | `red_flags` linked only by loose `customer_id + period` text → `DELETE /api/financial-statements/[id]` left orphan flags | **P1** | `supabase/migrations/00004_credit_analysis_patch.sql`, `red_flags` | Added `financial_statement_id uuid references financial_statements(id) on delete cascade` (nullable — manual flags may have null) → DB cascade deletes, no route change needed |
| **P-3** | Don't mix auto vs manual flags | `red_flags` had no source column → applying P-1 reconciliation could delete a hand-written RM flag | **P1** | `red_flags`, `app/api/red-flags/route.ts` | Added `source text not null default 'rule_engine' check (source in ('rule_engine','manual'))`; `POST /api/red-flags` (hand) forces `source='manual'`; reconciliation in P-1 touches only `source='rule_engine'` |
| **P-4** | CI must gate types | `package.json` missing `typecheck` (`tsc --noEmit`) → type errors could pass CI at M6 | **P2** | `package.json` | Added `"typecheck": "tsc --noEmit"` |
| **P-5** | Ratio engine must handle Postgres `bigint` strings | Financial columns are `bigint` — PostgREST may return **string** for large values; `lib/ratios.ts` did `as never` without coercion. `-/ * /` happen to coerce but `+` would silently concat | **P2 (hardening)** | `lib/ratios.ts` + `__tests__/ratios.test.ts` | Added `toNum`/`normalizeFS` (string → `Number`) at entry of both `computeRatios`/`evaluateRedFlags`; unit test feeds string-form rows through both functions |

**Migration:** `supabase/migrations/00004_credit_analysis_patch.sql` — covers P-2+P-3, no RLS touch needed (policies already scope by `owner_id`).

```sql
alter table red_flags
  add column if not exists financial_statement_id uuid references financial_statements(id) on delete cascade,
  add column if not exists source text not null default 'rule_engine'
    check (source in ('rule_engine','manual'));
create index if not exists idx_rf_fs_id on red_flags(financial_statement_id) where financial_statement_id is not null;
create index if not exists idx_rf_source on red_flags(source);
```

---

## Stack

| Layer | Choice |
|---|---|
| DB | Postgres via Supabase `https://sidpaiftgcwocelqmicp.supabase.co` |
| Auth | Supabase Auth (email/password), cookie via `middleware.ts` |
| API | Next.js 14 API routes (`app/api/*`), Zod (`lib/validations.ts`) |
| Board DnD | **@dnd-kit** `core + sortable + utilities` |
| Credit chart | **recharts** (tech stack §5 — now installed), **xlsx** (SheetJS) for Excel parse |
| Dashboard | Single `GET /api/dashboard/summary` — bounded, `Asia/Ho_Chi_Minh` calendar-day semantics |
| Tests | Vitest + jsdom + @testing-library |

---

## Data Model (M1, as patched)

```
customers 1──∞ contacts | notes | tasks | pipeline_stage_history | financial_statements 1──1 financial_ratios | red_flags
```

8 tables + 6 enums, every table `owner_id uuid default auth.uid()`, FK `on delete cascade`. See `supabase/migrations/00001_init_schema.sql`.

Fixed stages — **single source** `lib/pipeline-stages.ts`:

```
lead → contacted → qualified → meeting → credit → approved → disbursed
```

## Migrations

| File | Content |
|---|---|
| `00001_init_schema.sql` | 6 enums + `set_updated_at()` + 8 tables + indexes |
| `00002_rls.sql` | RLS on 8 tables — 32 policies (`owner_id = auth.uid()`, `WITH CHECK`) |
| `00003_stage_transition_atomic.sql` | **M3 P0** — `uq_tasks_auto_template` partial unique index + `transition_customer_stage(uuid, pipeline_stage)` RPC (FOR UPDATE lock, one tx, exact `tasks_created`, `noop`) |
| `00004_credit_analysis_patch.sql` | **M5 P-2+P-3** — `red_flags.financial_statement_id` FK cascade + `source` enum + indexes |

```bash
supabase link --project-ref sidpaiftgcwocelqmicp
supabase db push          # 00001 → 00004
npm run verify:rls        # anon 0 rows on all 8 tables
npm run seed              # Công ty ABC: lead → meeting → credit + 4 tasks
```

### RLS / Security (M1–M6)

Every table `owner_id = auth.uid()`. Verification: `scripts/verify-rls.ts`.

**M3 Phase 1 audit fixes (P0/P1):**
- `POST /api/customers/[id]/stage` → **`transition_customer_stage` RPC** — atomic, exact `tasks_created`, `noop` distinguishable.
- `uq_tasks_auto_template` — concurrent double-drop can't make 8 rows.
- **Child ownership guards** on `POST /api/{contacts,notes,tasks,financial-statements,red-flags}` + `GET` filtered by `customer_id` returns `[]` if customer not owned.
- No `SERVICE_ROLE` in client bundles (only `lib/supabase/server.ts` + `scripts/*`).

**M4 Phase 1 audit (dashboard trust):**
- Verified bounded dashboard queries without N+1 — summary endpoint uses 5 bounded parallel queries (customers ≤500, notes/tasks ≤100/1000) owner-scoped via RLS.
- No widget fetches per-customer; no unbounded full-table download.
- No service-role in browser.

**M5–M6 Patch audit (above P-1…P-5):**
- `PATCH` reconciliation now deletes only `source='rule_engine'` tied to that FS; manual flags untouched.
- `DELETE` cascade via FK — no orphan rule flags.
- Manual flags forced `source='manual'` at `POST /api/red-flags`.
- `lib/ratios.ts` hardened for Postgres `bigint`-as-string; `recharts`/`xlsx` only in `components/credit/*` (no server secret exposure).
- CI secret scan blocks `sb_secret` leakage and `.env` tracking.

Security re-audit after M5+M6: **PASS**.

---

## API (M1, amended M3–M6)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | no auth |
| `GET` | `/api/customers?stage=&industry=` | server filters |
| `POST` | `/api/customers` | + initial history |
| `GET/PATCH/DELETE` | `/api/customers/[id]` | PATCH blocks `stage` |
| `POST` | `/api/customers/[id]/stage` | **RPC** `{ to_stage }` → `{ data, history, tasks_created, noop }`; atomic, idempotent |
| `GET/POST` + `GET/PATCH/DELETE` | `/api/contacts`, `/[id]` | ownership guard |
| `GET/POST` + `GET/PATCH/DELETE` | `/api/notes`, `/[id]` | ownership guard |
| `GET/POST` + `GET/PATCH/DELETE` | `/api/tasks`, `/[id]` | ownership guard |
| `GET/POST` + `GET/PATCH/DELETE` | `/api/financial-statements`, `/[id]` | ownership guard · **PATCH now reconciles `source='rule_engine'` flags (P-1)** · **DELETE cascade via FK (P-2)** · **POST now sets `source='rule_engine'` on flags** |
| `GET` | `/api/financial-ratios?customer_id=` | ownership guard |
| `GET/POST` + `GET/PATCH/DELETE` | `/api/red-flags`, `/[id]` | **POST forces `source='manual'` (P-3)** |
| `GET` | `/api/pipeline-history?customer_id=` | ownership guard |
| `GET` | `/api/dashboard/summary?threshold=7` | **M4** single bounded summary |

`owner_id` always server-set (`lib/api-helpers.ts:withOwner`).

---

## Module 2 — Customer UI (consumes only `app/api/*`)

| Route | Purpose |
|---|---|
| `/` | Overview + walkthrough |
| `/customers` | Table, filterable by stage & industry (server query), CRUD |
| `/customers/[id]` | Profile shell + contacts + notes + tasks + **unified feed** (`lib/feed.ts:mergeFeed`) + **Credit Analysis section** (M5 — see below) + link to pipeline |
| `/pipeline` | **Kanban board** (M3 Workbench · Cobalt) |
| `/dashboard` | **Operational dashboard** (M4 — 4 widgets) |
| `/login` | Auth, `?next=` |

**Key libs:** `lib/api-client.ts` (typed wrapper, `apiGet/Post/Patch/Delete/FetchRaw`, `getDashboardSummary(threshold, signal)`, 401 redirect) · now also `listFinancialStatements`, `createFinancialStatement`, `patchFinancialStatement`, `deleteFinancialStatement`, `listFinancialRatios`, `listRedFlags`, `createRedFlag`, `patchRedFlag`, `deleteRedFlag` + types `FinancialStatement`/`FinancialRatio`/`RedFlag`.

**Components:** `components/ui/*` (Badge/Card/Button/FormField/Table/Modal/Toast) · `components/customers/*` (CustomerForm chip `current_banks[]`; ContactSection single-primary; NoteSection; TaskSection status PATCH + `auto`/`manual`; ActivityFeed) · `components/pipeline/*` · `components/dashboard/WidgetCard.tsx` · `components/credit/*` (M5 — below).

---

## Module 3 — Pipeline Kanban (Workbench · Cobalt)

Focused on the **right board**, not just any board — built via Hallmark path skills.

### Hallmark / path skills

- **Macrostructure: Workbench** (`hallmark/skills/hallmark/references/macrostructures/05-workbench.md`)
- **Theme: Cobalt** (`hallmark/site/css/tokens.css` `[data-theme="cobalt"]`)
- **Path skills:** `layout-and-space` · `color` (OKLCH Cobalt) · `typography` (Space Grotesk/Inter/JetBrains Mono) · `interaction-and-states` (8 states, focus ≥3:1) · `responsive` (320/375/414/768) · `slop-test` (58 gates) · `ckm-design-system`

### Route & components

| File | Purpose |
|---|---|
| `app/pipeline/page.tsx` | Workbench header + `PipelineBoard` |
| `lib/pipeline-stages.ts` | Canonical `PIPELINE_STAGES` + `PIPELINE_LABELS` + `isPipelineStage` |
| `lib/board-state.ts` | State machine `idle|dragging|pendingTransition|committed|rollbackRequired|error` + `boardReducer`, `customersByStage`, `timeInStage` — tested |
| `components/pipeline/PipelineBoard.tsx` | DndContext (Pointer+Touch+Keyboard), closestCenter, DragOverlay, horizontal scroller, optimistic via `boardReducer`, one `changeStage` per commit, pending lock, rollback, toast from `tasks_created`, sr-only live region |
| `components/pipeline/PipelineColumn.tsx` | `useDroppable` per stage, SortableContext vertical, sticky header + count, `isOver` highlight, dashed empty |
| `components/pipeline/PipelineCard.tsx` | `useSortable`, drag handle `⋮⋮`, pending opacity, company/industry/credit-need/time-in-stage, **keyboard `Move to…` always visible**, `role=article`, focus-visible ring |

**Tests:** `__tests__/board-state.test.ts` — HYDRATE, no-op, optimistic, duplicate guard, success, rollback, dismiss, stale guard, 7-column grouping, timeInStage, PIPELINE_STAGES contract, feed merge ordering.

---

## Module 4 — Operational Dashboard

Turns Customer/Note/Task/Pipeline into a fast daily work surface — **no AI, no notifications, no calendar sync**.

### Date / timezone policy (single source `lib/dashboard.ts`)

- **Timezone:** `Asia/Ho_Chi_Minh` (UTC+7, no DST). All "today/overdue/pending" are **calendar-day** boundaries.
- **Today:** `todayStrInTZ(DASHBOARD_TIMEZONE, now)` via `Intl.DateTimeFormat("en-CA")` → `YYYY-MM-DD`.
- **Overdue:** `next_action_date` / `due_date` string `< todayStr`. `parseDateOnly` rejects malformed/null → never mis-marked.
- **Due today:** `date === todayStr`. Null dates excluded (only notes with non-null `next_action_date` and tasks with non-null `due_date` where `<= todayStr` and `status != done`).
- **Pending:** calendar-day difference in RM timezone between `todayStr` and date part of `last_activity_at` or `created_at` if no activity. Threshold `N` configurable `1–365`, default `7`; invalid/≤0 → default, >365 clamped. History alone does **not** count — only Note/Task `created_at`.
- **Ordering:** follow-ups overdue first → date → company; today tasks overdue first → date → company; pending most stale first → company; pipeline canonical seven-order.

### The four widgets at `/dashboard`

| Widget | Source & filter | Display | Navigation |
|---|---|---|---|
| **Follow-up today** | Notes where `next_action_date <= todayStr` (overdue incl.), ordered, limit 20 | `⚠ Overdue` vs `• Due today` — not color alone | → `/customers/[id]` |
| **Tasks today** | Tasks `due_date <= todayStr && status != done`, ordered, overdue flag | `Overdue` vs `Due today`, `status` + `source` badges | → `/customers/[id]` |
| **Pipeline overview** | All 7 stages from `customers` (`pipelineCountsFromCustomers` — zeros incl.) canonical order | 7 tiles `grid-cols-7`, count + stage label | → `/customers?stage=...` + `/pipeline` |
| **Pending customers** | No Note/Task newer than threshold calendar days ago (or created ≥ threshold) | Stage Badge, `Last note/task · date · Nd ago` or `No notes/tasks · Nd since creation`, most-stale first, limit 20 | → `/customers/[id]` |

### API contract — `GET /api/dashboard/summary?threshold=7`

Single bounded server endpoint, owner-scoped via RLS, all queries bounded, `Promise.allSettled` + `errors[]`.

```ts
// Response: DashboardSummary (lib/dashboard.ts)
{
  generated_at: string, timezone: "Asia/Ho_Chi_Minh", threshold_days: number,
  follow_ups: { note_id, customer_id, company_name, next_action_type, next_action_date, overdue, content, created_at }[],
  today_tasks: { task_id, customer_id, company_name, title, due_date, status, source, overdue }[],
  pipeline: { stage: PipelineStage, count: number }[],  // always 7
  pending_customers: { customer_id, company_name, stage, last_activity_at, last_activity_type: "note"|"task"|null, inactive_days }[],
  errors?: { widget: string, message: string }[]
}
```

Uses `Promise.allSettled` — one widget failure returns `errors[]` but doesn't zero successful widgets. No unbounded download; no polling; `AbortController`-guarded single request per refresh.

---

## Module 5 — Credit Analysis Frontend (new in this build)

Built to spec §10–§15 follow-on (the real remaining gap: backend existed, **zero UI** before this).

### Route decision

Credit Analysis is a **section inside `app/customers/[id]/page.tsx`**, not a separate `app/credit/*` route — preserves spec §1 `"1 timeline duy nhất cho mỗi khách"` ("one single timeline per customer"). Contacts/Tasks/Notes + now **Credit Analysis** all live on the same profile page.

### Components — `components/credit/*`

| File | Purpose |
|---|---|
| `components/credit/FinancialStatementForm.tsx` | Manual entry for 1 period — 18 fields from `fsCreateSchema` (`period` + 17 financial fields). Validation mirrors Zod; period immutable on edit. Supports `prefill` from Excel upload (review before submit). |
| `components/credit/ExcelUploadDialog.tsx` | `.xlsx` upload via `xlsx` (SheetJS) — 1 sheet, header = field names (`period, revenue, cogs, ...`). Reads by **column name** (order-agnostic). Parses entirely **client-side**, then calls `onPrefill(row)` to populate the form for **RM review before submit** — never auto-inserts. Missing `period` or non-numeric optional → reject with clear message. Loaded via `import("xlsx")` so the main bundle is not bloated. |
| `components/credit/FinancialStatementTable.tsx` | Table of periods for this customer, sorted by `period`, columns Period/Revenue/Net income/Debt/CFO + Edit/Delete. Delete confirms: cascade note explains cascade (P-2). |
| `components/credit/RatioChart.tsx` | **recharts** Line/Bar, 6 groups (growth/liquidity/leverage/coverage/cashflow/efficiency), multi-year `period` as X. Responsive via `ResponsiveContainer`. Null values `connectNulls` so gaps don't break the line. Empty groups hidden. |
| `components/credit/RedFlagList.tsx` | List flags with `severity` badge (low/medium/high via `severityColor`), `rule_triggered` + `source` badge (`rule_engine` sky vs `manual` violet), period filter dropdown. Empty: "No red flags — ratios look clean." |
| `components/credit/CreditAnalysisSection.tsx` | **Orchestrator** — fetches `listFinancialStatements` + `listFinancialRatios` + `listRedFlags` in parallel for this `customerId`, renders the four cards (BCTC table + Ratios + Flags) + `+ Add BCTC` + `Upload Excel` on the section header. Handles `loading…`/`error+Retry`. Manual flags note explains `source` semantics. |

### `lib/api-client.ts` additions (M5)

```ts
// Types
export type FinancialStatement = { id, owner_id, customer_id, period, revenue, cogs, net_income, ebit, ebitda, interest_expense, total_assets, total_liabilities, total_equity, current_assets, current_liabilities, inventory, receivables, payables, cfo, total_debt, cash, created_at, updated_at }
export type FinancialRatio = { id, owner_id, customer_id, financial_statement_id, period, revenue_growth, net_income_growth, current_ratio, quick_ratio, debt_to_equity, debt_to_ebitda, interest_coverage, cfo_to_net_income, receivable_days, inventory_days, payable_days, created_at, updated_at }
export type RedFlag = { id, owner_id, customer_id, period, financial_statement_id, source, rule_triggered, severity, description, created_at, updated_at }

// All via app/api/* — never direct Supabase from client
listFinancialStatements(customer_id?)
createFinancialStatement(body)           // POST /api/financial-statements
patchFinancialStatement(id, body)        // PATCH .../[id] — now returns { ratios, flags, flags_updated }
deleteFinancialStatement(id)             // DELETE — cascade via FK (P-2)
listFinancialRatios(customer_id?)        // GET /api/financial-ratios
listRedFlags(customer_id?)               // GET /api/red-flags
createRedFlag(body)                      // POST — forces source=manual
patchRedFlag(id, body)
deleteRedFlag(id)
```

### Dependencies (M5 §12.2)

| Package | Use | Version |
|---|---|---|
| `recharts` | `RatioChart.tsx` — Line/Bar, ResponsiveContainer, XAxis/YAxis, Tooltip, Legend | ^2.12.7 (tech stack §5, was missing) |
| `xlsx` (SheetJS) | `ExcelUploadDialog.tsx` — client parse, `import("xlsx")` code-split | ^0.18.5 |

`react-dropzone` is optional — `<input type="file">` is sufficient for MVP (spec §12.2 optional).

### Excel template (fixed)

Single sheet, row 1 headers = `fsCreateSchema` field names (`period` required, others optional), each following row = 1 period. Parser matches by **name**, not position; missing required `period` → rejected with `Missing required column "period"` or `Row missing "period"`. Non-numeric optional → `Column "X" has non-numeric value …`. Optional columns absent → `null`.

---

## Module 6 — DevOps (§13 + §14 follow-on)

### Goal (M6 §13.1)

Move from `npm run dev` on a laptop to **real URL, auto-deploy on push, no leaked secrets, minimal backup**.

### What shipped (§13.2)

| Item | Tool | Output | Status |
|---|---|---|---|
| CI | GitHub Actions | `.github/workflows/ci.yml` — `lint` + `typecheck` + `test` + `build` on every PR and `push main`; plus **secret scan** (`sb_secret` not tracked, `.env` not tracked) | ✅ Built (runs on GitHub after push) |
| CD | Vercel Git Integration | Push `main` → production; every PR → preview URL | 🔧 **One-click connect** — see Bootstrap below |
| Hosting + domain | Vercel project **`hoangspresent`** | Default `hoangspresent.vercel.app`; custom domain optional (see Bootstrap) | 🔧 Bootstrap command below |
| Secrets | Vercel Environment Variables (**sensitive**) | No secret in repo — `.env.example` only placeholders; `scripts/seed.ts` reads `SUPABASE_SECRET_KEY` server-only | 🔧 See env setup below |
| Backup | Supabase PITR | **Free tier has NO PITR** (confirmed — spec §13.2 warning is accurate). Mitigation: `pg_dump` via cron is the *next* Backlog step; M6 at minimum confirms the limitation so RM knows not to rely on PITR | ✅ Documented here |
| Monitoring | `GET /api/health` (existing) + Vercel Analytics | Knows app is alive | ✅ `GET /api/health` returns `{"ok": true}` |

### Bootstrap — the one command set you must still run (Vercel + Supabase secrets)

Prerequisite: `vercel` CLI logged in (`vercel login`) and `.env.local` filled with the real `SUPABASE_SECRET_KEY` (full value from Supabase Dashboard → API Keys → Reveal).

```bash
# 1. Create Vercel project linked to this repo + GitHub (if not already connected via Vercel Dashboard)
# Option A — via Dashboard (recommended, no CLI subtlety):
#   Go to vercel.com → Add New → Project → Import Git Repository → mugentoken01-sudo/HoangNoPurezento
#   → Framework: Next.js (auto) → set Environment Variables (see below) → Deploy
# Option B — via CLI (alternative):
vercel link --yes
vercel env add SUPABASE_URL production --sensitive < .env.local   # or paste value interactively
# Better — add explicitly so CLI doesn't silently store empty (spec §13.3 warning: always verify with `vercel env ls`):
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# paste: https://sidpaiftgcwocelqmicp.supabase.co  (publishable — not secret, but pin it anyway)
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# paste: sb_publishable_Yf1ZfjK6-nsZVSxEEmN3Hg_bbTVpw6w
vercel env add SUPABASE_SECRET_KEY production
# paste: sb_secret_… (full Reveal value — mark sensitive, default for Production/Preview is sensitive)
# Legacy compat — if codebase still reads SERVICE_ROLE_KEY:
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# paste: same sb_secret value
# Verify none are empty (M6 §13.3 warning):
vercel env ls
# Git connect for auto-deploy (if CLI-created project):
vercel git connect
# Deploy production
vercel --prod
```

**Domain `hoangspresent`:** The new project name is already `hoangspresent` if created via Dashboard with that name — default URL is `hoangspresent.vercel.app`. To attach a custom domain the RM already owns:

```bash
vercel domains add yourdomain.vn   # has unexpected error bug check the README file before proceeding, confirmation needed before API  mutation
vercel alias set hoangspresent.vercel.app yourdomain.vn
# Then add the DNS record Vercel shows (CNAME or A) at your registrar
```

**Security note (M6 §13.3):** Early-2026 Vercel had an incident where env not marked **sensitive** was exposed, and a CLI bug where a value could be stored empty despite `success`. Always run `vercel env ls` after adding and re-add any empty row. The CI secret scan (`ci.yml` last step) also blocks `sb_secret` from ever being tracked.

### Project layout (updated M6)

```
supabase/migrations/
  00001_init_schema.sql
  00002_rls.sql
  00003_stage_transition_atomic.sql
  00004_credit_analysis_patch.sql   ← M5 P-2+P-3
lib/
  validations.ts
  api-helpers.ts
  api-client.ts          (typed wrapper + getDashboardSummary + 8 credit fns)
  feed.ts                (mergeFeed)
  ratios.ts              (P-5 hardened: toNum/normalizeFS, bigint strings)
  credit-tasks.ts
  pipeline-stages.ts
  board-state.ts
  dashboard.ts
  supabase/{client,server,middleware}.ts
components/
  ui/{Badge,Card,Button,FormField,Table,Modal,Toast}.tsx
  Nav.tsx
  customers/{CustomerForm,ContactSection,NoteSection,TaskSection,ActivityFeed}.tsx
  pipeline/{PipelineBoard,PipelineColumn,PipelineCard}.tsx
  dashboard/WidgetCard.tsx
  credit/{FinancialStatementForm,ExcelUploadDialog,RatioChart,RedFlagList,FinancialStatementTable,CreditAnalysisSection}.tsx  ← M5
app/
  layout.tsx  (sticky header + Nav)
  page.tsx
  customers/page.tsx  (server-filtered)
  customers/[id]/page.tsx  (now: profile + Credit Analysis section)
  pipeline/page.tsx   (Workbench · Cobalt)
  dashboard/page.tsx  (4 widgets)
  login/page.tsx
  api/  9 route groups + dashboard/summary (M1 M3-hardened M5-patched)
scripts/{seed,verify-rls}.ts
vitest.config.ts  vitest.setup.ts
__tests__/{board-state.test.ts, dashboard.test.ts, ratios.test.ts}
.github/workflows/ci.yml    ← M6
vercel.json                 ← M6
```

## Env

```bash
cp .env.example .env.local
# Fill SUPABASE_SECRET_KEY with full value from Dashboard → API Keys (Reveal)
# Legacy compat: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
```

Project: `https://sidpaiftgcwocelqmicp.supabase.co`
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` = `https://sidpaiftgcwocelqmicp.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_Yf1ZfjK6-nsZVSxEEmN3Hg_bbTVpw6w`
- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_…` (Reveal → replace `REPLACE_WITH_FULL_KEY` in `.env.local`)
- `SUPABASE_JWKS_URL` = `https://sidpaiftgcwocelqmicp.supabase.co/auth/v1/.well-known/jwks.json`

```bash
npm install @supabase/server   # already in package.json
```

---

## Phase 1 audit matrices

### M3 (before Kanban)

| # | Requirement | Before M3 | Severity | Affected files | Fix |
|---|---|---|---|---|---|
| 1 | Atomic stage update + history | Sequential `update → insert` | P0 | `app/api/customers/[id]/stage/route.ts` | `transition_customer_stage` RPC (FOR UPDATE) |
| 2 | Credit auto-task idempotency | `count == 0` race → 8 rows | P0 | same | `uq_tasks_auto_template` + `ON CONFLICT DO NOTHING` |
| 3 | `tasks_created` accuracy | Counted total present, not inserted | P1 | same | RPC `v_inserted` from `RETURNING` CTE |
| 4 | Child ownership | No check — cross-owner child create | P0 | `app/api/contacts|notes|tasks|financial-statements|red-flags/route.ts` | `select id from customers where id=$customer_id` guard → 403 |
| 5 | History cross-owner leak | `GET ?customer_id=` returned unowned rows | P0 | `app/api/pipeline-history|financial-ratios/route.ts` | Same guard → `[]` |
| 6–8 | owner_id spoof / service-role / hygiene | Already handled / P2 stale files | —/P2 | `lib/api-helpers.ts` etc. | `.gitignore` update, no change |

### M4 (before Dashboard)

| # | Requirement | Before M4 | Severity | Affected files | Fix |
|---|---|---|---|---|---|
| 1 | Follow-up semantics | No single definition for overdue vs today; malformed dates could mis-classify | P0 | `lib/dashboard.ts` (new) + `app/api/dashboard/summary/route.ts` | Centralized `todayStrInTZ`/`isOverdue`/`parseDateOnly` in `lib/dashboard.ts`; server filters `not.is null` + `lte todayStr`; bad dates never mis-marked |
| 2 | Today tasks omission | Risk of silently omitting overdue tasks; no `overdue` flag | P0 | same | Query `due_date <= todayStr AND status != done`; derive `overdue = due_date < todayStr`; widget groups overdue first, not hidden |
| 3 | Pipeline zeros missing | Could omit empty stages | P0 | `lib/dashboard.ts:pipelineCountsFromCustomers` | Map seeded with all 7 stages → always 7 counts |
| 4 | Pending semantics ambiguous | No shared definition; history vs note/task confusion; threshold not configurable | P0 | same + `app/dashboard/page.tsx` | Last activity = max(`notes.created_at`, `tasks.created_at`) only; threshold `normalizeThreshold` 1..365, default 7, selector + custom; history explicitly excluded |
| 5 | N+1 per widget | Risk of per-customer fetches | P0 | `app/api/dashboard/summary/route.ts` | Single summary endpoint, 5 bounded parallel queries, no per-customer fan-out |
| 6 | Partial failure as false zero | One widget failure could zero others | P1 | same | `Promise.allSettled` + `errors[]` + per-widget isolated error UI; successful widgets still rendered |
| 7 | Stale overwrite on refresh spam | Repeated refresh could let old response overwrite new | P1 | `app/dashboard/page.tsx` | `genRef` + `AbortController`; abort previous + generation check |
| 8 | Date boundary at 00:00 +07 | Server UTC vs RM local mismatch | P0 | `lib/dashboard.ts:todayStrInTZ` | `Intl.DateTimeFormat` with `timeZone: Asia/Ho_Chi_Minh`; tests for `17:00Z → next day in +07` |
| 9 | Cross-owner leakage in dashboard | Aggregation could leak other owner's rows | P0 | `app/api/dashboard/summary/route.ts` | All queries use authenticated supabase client → RLS owner-scoped; no join bypass |
| 10 | Direct Supabase in browser | Dashboard could bypass API | P0 | `lib/api-client.ts:getDashboardSummary` | All dashboard fetches via `GET /api/dashboard/summary` only |

### M5+M6 — Patch P-1…P-5 (see top of this README for expanded matrix)

| # | Requirement | Before | Severity | Affected files | Fix |
|---|---|---|---|---|---|
| P-1 | Red-flag reconciliation on PATCH | `evaluateRedFlags` never called → stale flags | P0 | `app/api/financial-statements/[id]/route.ts` | Delete `source='rule_engine'` + re-evaluate + re-insert (`flags_updated`) |
| P-2 | Orphan flags after DELETE | Loose `customer_id+period` link | P1 | `supabase/migrations/00004_*.sql`, `red_flags` | `financial_statement_id` FK `on delete cascade` → DB auto-cleans |
| P-3 | Auto vs manual mix-up | No `source` column | P1 | `red_flags`, `app/api/red-flags/route.ts` | `source` enum; `POST /api/red-flags` forces `manual`; reconciliation touches `rule_engine` only |
| P-4 | CI must gate types | Missing `typecheck` script | P2 | `package.json` | `"typecheck": "tsc --noEmit"` |
| P-5 | Bigint string hardening | `bigint` may arrive as string | P2 | `lib/ratios.ts`, `__tests__/ratios.test.ts` | `toNum`/`normalizeFS` at entry; tests feed string rows |

Security re-audit after M5+M6: **PASS** (red-flag reconciliation scoped to `rule_engine` + FK cascade, manual untouched; no secret in repo; CI gates types).

---

## Tests — Modules 3–5 Phase 4

```bash
npm run test              # vitest run (jsdom) — board-state + dashboard + ratios
npm run test:watch        # watch
npm run verify:rls
npm run seed
npm run build
npm run typecheck         # tsc --noEmit (P-4)
```

**Test config:** `vitest.config.ts` (jsdom, `setupFiles: ./vitest.setup.ts`, alias `@` → `.`) · `vitest.setup.ts` imports `@testing-library/jest-dom/vitest`.

| Suite | File | Coverage |
|---|---|---|
| Reducer/state | `__tests__/board-state.test.ts` | HYDRATE, no-op, optimistic, duplicate guard, success, rollback, dismiss, stale guard, grouping (7 incl. empty), timeInStage, contract, feed merge ordering |
| Dashboard | `__tests__/dashboard.test.ts` | `todayStrInTZ` (incl. 00:00 +07 boundary), `isOverdue`/`isToday`, `daysBetween` month/year, `daysSinceIso` in tz, `normalizeThreshold`, `pipelineCountsFromCustomers` 7 incl. zeros, `sortFollowUps`/`sortTodayTasks` deterministic |
| Ratios (M5 P-5) | `__tests__/ratios.test.ts` | String-numeric coercion parity, `+` concat guard (`quick_ratio`), `evaluateRedFlags` with strings, null/empty handling, growth flag, `profit_without_cash` threshold, `current_ratio` tiers |
| API/integration (live Supabase) | — | `GET /api/dashboard/summary` 200 typed, threshold 7/14/custom/invalid, overdue/today boundary at 00:00 +07, pending with only notes/only tasks/both/none, equal timestamps deterministic, one widget failure while others succeed, refresh spam AbortController, navigation context, logged-out 401 → `/login`, two-user RLS isolation; Credit PATCH reconciliation (`rule_engine` only, manual untouched, `flags_updated`), DELETE cascade |
| E2E | — | ABC via dashboard: create customer → add note with today → follow-up → add overdue note → Overdue → create due/overdue tasks → Tasks widget → move stage → pipeline counts → pending threshold change → old customer appears; Credit: add/edit/delete BCTC → chart + flags reconcile |
| Build/type | — | `npm run build` + `npm run typecheck` must pass |

---

## Updated MVP Scope (§15 follow-on)

**New in MVP (was Backlog or missing):**
- Credit Analysis section on profile, Excel template upload, multi-year chart, red-flag list with reconciliation on edit/delete (P-1, P-2)
- CI gate (`lint` + `typecheck` + `test` + `build`) blocking merge on fail + secret scan
- Auto-deploy to Vercel on `push main` + preview URL per PR
- Backup: ≥ confirm Supabase PITR status; cron `pg_dump` is next Backlog step if overloaded this cycle

**Still Backlog (unchanged from original §7):** OCR PDF read, AI next-action, multi-user, push notification, PDF export, ratio benchmark by industry.

---

## Definition of Done — Module 5 + Module 6 (combined)

### Credit Analysis (≥ spec §3.4 + §10–§14 follow-on)

- [x] Credit Analysis is a **section on `app/customers/[id]/page.tsx`** (no separate route — preserves `spec §1` "1 timeline")
- [x] Manual `FinancialStatementForm.tsx` — 18 fields from `fsCreateSchema`, period immutable on edit
- [x] Excel upload `ExcelUploadDialog.tsx` — `xlsx` parse by column name, order-agnostic, prefill for RM review before submit (never auto-insert)
- [x] Ratio chart `RatioChart.tsx` — **Recharts** 6 groups multi-year, `period` as X (`line` vs `bar` per group, `ResponsiveContainer`, `connectNulls`)
- [x] Red flags `RedFlagList.tsx` — severity badge low/medium/high, `rule_triggered` + `source` badge (`manual` violet vs `rule_engine` sky), period filter
- [x] BCTC table `FinancialStatementTable.tsx` — sorted by period, Edit/Delete with cascade note (P-2)
- [x] Orchestrator `CreditAnalysisSection.tsx` — parallel fetch `listFinancialStatements` + `listFinancialRatios` + `listRedFlags` for this customer, 4 cards + `+ Add BCTC` + `Upload Excel`
- [x] `lib/api-client.ts` now has 8 credit functions + 3 types (`FinancialStatement`/`FinancialRatio`/`RedFlag`) — previously zero
- [x] `recharts` + `xlsx` added to `package.json` (recharts was in §5 stack but missing)
- [x] **P-1 fixed** — `PATCH .../[id]` deletes `source='rule_engine'` + re-evaluates + re-inserts + returns `flags_updated`
- [x] **P-2 fixed** — `red_flags.financial_statement_id` FK cascade → delete FS auto-cleans its rule flags
- [x] **P-3 fixed** — `source` enum; `POST /api/red-flags` forces `manual`; only `rule_engine` touched on reconcile
- [x] **P-4 fixed** — `"typecheck": "tsc --noEmit"` present
- [x] **P-5 fixed** — `lib/ratios.ts` coerces bigint strings via `toNum`/`normalizeFS`; `__tests__/ratios.test.ts` proves parity + `+` guard

### DevOps (§13)

- [x] CI `.github/workflows/ci.yml` — `lint` + `typecheck` + `test` + `build` on PR and `push main` + secret scan (`sb_secret`/`.env` not tracked)
- [x] `vercel.json` present — `framework: nextjs`, `installCommand`/`buildCommand`, `outputDirectory` `.next`, headers `X-Content-Type-Options`/`X-Frame-Options`
- [x] Bootstrap instructions in this README (§13.3) — Vercel project `hoangspresent` via Dashboard or `vercel link`, env add `SUPABASE_*` as **sensitive**, `vercel env ls` verification, `vercel git connect`, `vercel --prod`
- [x] Domain section — `hoangspresent.vercel.app` default; optional custom domain via `vercel domains add` (with DNS note)
- [x] Secrets — `.env.example` placeholders only; sensitive tracking warning (§13.3 2026 incident)
- [x] Backup — documented that Free tier has **no PITR**; cron `pg_dump` deferred to Backlog if cycle overloaded (spec §15)
- [x] Monitoring — `GET /api/health` + Vercel Analytics

---

## GitHub

Remote: `https://github.com/mugentoken01-sudo/HoangNoPurezento`

```bash
npm install
npx --yes repomix --style xml
# After filling .env.local with full SUPABASE_SECRET_KEY:
npm run verify:rls   # RLS PASS
npm run seed         # ABC + 4 auto-tasks
npm run test         # board-state + dashboard + ratios PASS
npm run typecheck    # tsc --noEmit
npm run build        # Next.js build
npm run dev          # http://localhost:3000 → /customers/[id] (Credit Analysis section) → /dashboard → /pipeline
```

`!` prefix in this Claude Code session bypasses the `muse-spark unavailable` gate: `! npm install`, `! npm run seed`, etc.

---

## Open questions to close (follow-on §17)

- Domain: `hoangspresent.vercel.app` sufficient, or is there a custom domain (`.vn`/`.com`) to point at Vercel?
- Red-flag thresholds (debt growth ×1.5, interest coverage <2x …) — keep hard-coded in `lib/ratios.ts` or make RM-configurable like Dashboard's pending threshold?
- Supabase tier — Free (no PITR, manual backup only) vs Pro (PITR enabled)? Confirms which backup path M6 needs.
- Excel template: is the RM supplying a sample file, or should the agent design columns exactly per `fsCreateSchema` field order?
