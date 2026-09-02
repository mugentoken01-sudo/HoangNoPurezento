"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import type { FinancialStatement } from "@/lib/api-client";
import { createFinancialStatement, patchFinancialStatement } from "@/lib/api-client";
import type { RedFlagThresholds } from "@/lib/red-flag-thresholds";

const FIELDS: { key: string; label: string; hint?: string }[] = [
  { key: "period", label: "Period *", hint: "e.g. 2023, 2023-Q4" },
  { key: "revenue", label: "Revenue" },
  { key: "cogs", label: "COGS" },
  { key: "net_income", label: "Net income" },
  { key: "ebit", label: "EBIT" },
  { key: "ebitda", label: "EBITDA" },
  { key: "interest_expense", label: "Interest expense" },
  { key: "total_assets", label: "Total assets" },
  { key: "total_liabilities", label: "Total liabilities" },
  { key: "total_equity", label: "Total equity" },
  { key: "current_assets", label: "Current assets" },
  { key: "current_liabilities", label: "Current liabilities" },
  { key: "inventory", label: "Inventory" },
  { key: "receivables", label: "Receivables" },
  { key: "payables", label: "Payables" },
  { key: "cfo", label: "CFO" },
  { key: "total_debt", label: "Total debt" },
  { key: "cash", label: "Cash" },
];

function toNumOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function FinancialStatementForm({
  customerId,
  initial,
  prefill,
  thresholds,
  onClose,
  onSaved,
}: {
  customerId: string;
  initial?: FinancialStatement | null;
  prefill?: Record<string, string | number | null>;
  thresholds?: RedFlagThresholds;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const getInitial = (k: string) => {
    if (prefill && prefill[k] != null) return String(prefill[k]);
    if (initial && (initial as Record<string, unknown>)[k] != null) return String((initial as Record<string, unknown>)[k]);
    return "";
  };
  const [values, setValues] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const f of FIELDS) m[f.key] = getInitial(f.key);
    return m;
  });
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setVal(key: string, v: string) {
    setValues(prev => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.period.trim()) { setErr("Period is required"); return; }
    setSubmitting(true); setErr(null);
    const body: Record<string, unknown> = { customer_id: customerId, period: values.period.trim() };
    for (const f of FIELDS) {
      if (f.key === "period") continue;
      const n = toNumOrNull(values[f.key]);
      if (values[f.key].trim() && n === null) { setErr(`${f.label}: must be an integer`); setSubmitting(false); return; }
      body[f.key] = n;
    }
    // RM-tunable thresholds — like Dashboard pending threshold, RM chỉnh qua UI
    if (thresholds) (body as Record<string, unknown>)._thresholds = thresholds;
    // PATCH schema omits customer_id/period — strip them for edit
    const finalBody: Record<string, unknown> = isEdit
      ? { ...Object.fromEntries(Object.entries(body).filter(([k]) => k !== "customer_id" && k !== "period")), _thresholds: thresholds }
      : body;
    if (isEdit) {
      // re-add period-less payload + thresholds for server to re-evaluate flags with RM tuning
      const toSend = { ...finalBody } as Record<string, unknown>;
      // keep thresholds even on edit
      if (thresholds) toSend._thresholds = thresholds;
      try {
        const res = await patchFinancialStatement(initial!.id, toSend);
        if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Update failed");
        onSaved();
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed";
        setErr(msg);
      } finally { setSubmitting(false); }
      return;
    }
    try {
      await createFinancialStatement(body);
      onSaved();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed";
      setErr(msg);
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? `Edit BCTC — ${initial?.period}` : "Add BCTC period"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => (
            <FormField key={f.key} label={f.label} hint={f.hint} required={f.key === "period"}>
              <Input
                value={values[f.key] ?? ""}
                onChange={e => setVal(f.key, e.target.value)}
                placeholder={f.key === "period" ? "2023" : "—"}
                inputMode={f.key === "period" ? "text" : "numeric"}
                disabled={isEdit && f.key === "period"}
              />
            </FormField>
          ))}
        </div>
        {isEdit && <p className="text-[11px] text-zinc-400">Period is immutable — delete and recreate if the period label is wrong.</p>}
        {err && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}
