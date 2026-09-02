// RM Cockpit — Module 2-5: Typed API client (all access via app/api/*, never Supabase directly)
import type { DashboardSummary } from "./dashboard";

export type ApiError = { error: string; details?: unknown; status: number };

async function handle401(status: number) {
  if (status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
  }
}

export async function apiFetchRaw<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; json: T & { error?: string; details?: unknown; history?: unknown; tasks_created?: number; ratios?: unknown; flags?: unknown; flags_created?: number; flags_updated?: number }; status: number }> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } } as RequestInit);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) await handle401(res.status);
  return { ok: res.ok, json, status: res.status };
}

export async function apiGet<T>(path: string): Promise<T> {
  const { ok, json, status } = await apiFetchRaw<{ data: T }>(path);
  if (!ok) throw { error: (json as { error?: string }).error ?? "Request failed", details: (json as { details?: unknown }).details, status } as ApiError;
  return (json as { data: T }).data;
}
export async function apiPost<T>(path: string, body: unknown): Promise<{ data: T } & Record<string, unknown>> {
  const { ok, json, status } = await apiFetchRaw<{ data: T }>(path, { method: "POST", body: JSON.stringify(body) });
  if (!ok) throw { error: (json as { error?: string }).error ?? "Request failed", details: (json as { details?: unknown }).details, status } as ApiError;
  return json as { data: T } & Record<string, unknown>;
}
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const { ok, json, status } = await apiFetchRaw<{ data: T }>(path, { method: "PATCH", body: JSON.stringify(body) });
  if (!ok) throw { error: (json as { error?: string }).error ?? "Request failed", details: (json as { details?: unknown }).details, status } as ApiError;
  return (json as { data: T }).data;
}
export async function apiDelete(path: string): Promise<void> {
  const { ok, json, status } = await apiFetchRaw(path, { method: "DELETE" });
  if (!ok) throw { error: (json as { error?: string }).error ?? "Request failed", status } as ApiError;
}

// ─── Types ───────────────────────────────────────────────────────────────
export type Customer = {
  id: string; owner_id: string; company_name: string; industry: string | null;
  revenue_reported: number | null; credit_need_type: string | null; credit_need_amount: number | null;
  credit_need_purpose: string | null; current_banks: string[] | null; stage: string; status: string;
  created_at: string; updated_at: string;
};
export type Contact = { id: string; customer_id: string; owner_id: string; name: string; title: string | null; phone: string | null; email: string | null; is_primary: boolean; created_at: string; updated_at: string };
export type Note = { id: string; customer_id: string; owner_id: string; content: string; next_action_type: string | null; next_action_date: string | null; created_at: string; updated_at: string };
export type Task = { id: string; customer_id: string; owner_id: string; title: string; due_date: string | null; status: string; source: string; created_at: string; updated_at: string };
export type PipelineHistory = { id: string; customer_id: string; owner_id: string; from_stage: string | null; to_stage: string; changed_at: string; created_at: string };

export type FinancialStatement = {
  id: string; owner_id: string; customer_id: string; period: string;
  revenue: number | null; cogs: number | null; net_income: number | null; ebit: number | null; ebitda: number | null;
  interest_expense: number | null; total_assets: number | null; total_liabilities: number | null; total_equity: number | null;
  current_assets: number | null; current_liabilities: number | null; inventory: number | null; receivables: number | null;
  payables: number | null; cfo: number | null; total_debt: number | null; cash: number | null;
  created_at: string; updated_at: string;
};
export type FinancialRatio = {
  id: string; owner_id: string; customer_id: string; financial_statement_id: string; period: string;
  revenue_growth: number | null; net_income_growth: number | null; current_ratio: number | null; quick_ratio: number | null;
  debt_to_equity: number | null; debt_to_ebitda: number | null; interest_coverage: number | null;
  cfo_to_net_income: number | null; receivable_days: number | null; inventory_days: number | null; payable_days: number | null;
  created_at: string; updated_at: string;
};
export type RedFlag = {
  id: string; owner_id: string; customer_id: string; period: string | null; financial_statement_id: string | null;
  source: string; rule_triggered: string; severity: string; description: string;
  created_at: string; updated_at: string;
};

// ─── Customers ───────────────────────────────────────────────────────────
export const listCustomers = (params?: { stage?: string; industry?: string }) => {
  const q = new URLSearchParams();
  if (params?.stage) q.set("stage", params.stage);
  if (params?.industry) q.set("industry", params.industry);
  const suffix = q.toString() ? `?${q}` : "";
  return apiGet<Customer[]>(`/api/customers${suffix}`);
};
export const getCustomer = (id: string) => apiGet<Customer>(`/api/customers/${id}`);
export const createCustomer = (body: Record<string, unknown>) => apiPost<Customer>("/api/customers", body);
export const updateCustomer = (id: string, body: Record<string, unknown>) => apiFetchRaw<{ data: Customer }>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteCustomer = (id: string) => apiDelete(`/api/customers/${id}`);
export const changeStage = (id: string, to_stage: string) => apiFetchRaw<{ data: Customer; history: PipelineHistory; tasks_created: number }>(`/api/customers/${id}/stage`, { method: "POST", body: JSON.stringify({ to_stage }) });

// ─── Contacts / Notes / Tasks / History ──────────────────────────────────
export const listContacts = (customer_id?: string) => apiGet<Contact[]>(customer_id ? `/api/contacts?customer_id=${customer_id}` : "/api/contacts");
export const createContact = (body: Record<string, unknown>) => apiPost<Contact>("/api/contacts", body);
export const patchContact = (id: string, body: Record<string, unknown>) => apiPatch<Contact>(`/api/contacts/${id}`, body);
export const deleteContact = (id: string) => apiDelete(`/api/contacts/${id}`);

export const listNotes = (customer_id?: string) => apiGet<Note[]>(customer_id ? `/api/notes?customer_id=${customer_id}` : "/api/notes");
export const createNote = (body: Record<string, unknown>) => apiPost<Note>("/api/notes", body);
export const deleteNote = (id: string) => apiDelete(`/api/notes/${id}`);

export const listTasks = (customer_id?: string) => apiGet<Task[]>(customer_id ? `/api/tasks?customer_id=${customer_id}` : "/api/tasks");
export const createTask = (body: Record<string, unknown>) => apiPost<Task>("/api/tasks", body);
export const patchTask = (id: string, body: Record<string, unknown>) => apiPatch<Task>(`/api/tasks/${id}`, body);
export const removeTask = (id: string) => apiDelete(`/api/tasks/${id}`);

export const listPipelineHistory = (customer_id?: string) => apiGet<PipelineHistory[]>(customer_id ? `/api/pipeline-history?customer_id=${customer_id}` : "/api/pipeline-history");

// ─── Financial Statements / Ratios / Red Flags (M5) ─────────────────────
export const listFinancialStatements = (customer_id?: string) => apiGet<FinancialStatement[]>(customer_id ? `/api/financial-statements?customer_id=${customer_id}` : "/api/financial-statements");
export const createFinancialStatement = (body: Record<string, unknown>) => apiPost<FinancialStatement>("/api/financial-statements", body);
export const patchFinancialStatement = (id: string, body: Record<string, unknown>) => apiFetchRaw<{ data: FinancialStatement; ratios?: FinancialRatio; flags?: RedFlag[]; flags_updated?: number }>(`/api/financial-statements/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteFinancialStatement = (id: string) => apiDelete(`/api/financial-statements/${id}`);

export const listFinancialRatios = (customer_id?: string) => apiGet<FinancialRatio[]>(customer_id ? `/api/financial-ratios?customer_id=${customer_id}` : "/api/financial-ratios");
export const listRedFlags = (customer_id?: string) => apiGet<RedFlag[]>(customer_id ? `/api/red-flags?customer_id=${customer_id}` : "/api/red-flags");
export const createRedFlag = (body: Record<string, unknown>) => apiPost<RedFlag>("/api/red-flags", body);
export const patchRedFlag = (id: string, body: Record<string, unknown>) => apiPatch<RedFlag>(`/api/red-flags/${id}`, body);
export const deleteRedFlag = (id: string) => apiDelete(`/api/red-flags/${id}`);

// ─── Dashboard (Module 4) — single summary endpoint, no N+1 ──────────────
export const getDashboardSummary = async (threshold?: number, signal?: AbortSignal): Promise<DashboardSummary> => {
  const q = threshold ? `?threshold=${threshold}` : "";
  const res = await fetch(`/api/dashboard/summary${q}`, { signal });
  if (!res.ok) {
    await handle401(res.status);
    const j = await res.json().catch(() => ({}));
    throw { error: (j as { error?: string }).error ?? res.statusText, status: res.status } as ApiError;
  }
  return res.json() as Promise<DashboardSummary>;
};
