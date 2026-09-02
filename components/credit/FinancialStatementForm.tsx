"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import type { FinancialStatement } from "@/lib/api-client";
import { createFinancialStatement, patchFinancialStatement } from "@/lib/api-client";
import type { RedFlagThresholds } from "@/lib/red-flag-thresholds";
import { useI18n } from "@/lib/i18n";

const FIELD_KEYS: { key: string; i18nKey: string; hint?: string }[] = [
  { key: "period", i18nKey: "credit.period", hint: "VD: 2023, 2024" },
  { key: "revenue", i18nKey: "credit.revenue" },
  { key: "cogs", i18nKey: "credit.cogs" },
  { key: "net_income", i18nKey: "credit.net_income" },
  { key: "ebit", i18nKey: "credit.ebit" },
  { key: "ebitda", i18nKey: "credit.ebitda" },
  { key: "interest_expense", i18nKey: "credit.interest_expense" },
  { key: "total_assets", i18nKey: "credit.total_assets" },
  { key: "total_liabilities", i18nKey: "credit.total_liabilities" },
  { key: "total_equity", i18nKey: "credit.total_equity" },
  { key: "current_assets", i18nKey: "credit.current_assets" },
  { key: "current_liabilities", i18nKey: "credit.current_liabilities" },
  { key: "inventory", i18nKey: "credit.inventory" },
  { key: "receivables", i18nKey: "credit.receivables" },
  { key: "payables", i18nKey: "credit.payables" },
  { key: "cfo", i18nKey: "credit.cfo" },
  { key: "total_debt", i18nKey: "credit.total_debt" },
  { key: "cash", i18nKey: "credit.cash" },
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
  const { t } = useI18n();
  const isEdit = !!initial;

  const getInitial = (k: string) => {
    if (prefill && prefill[k] != null) return String(prefill[k]);
    if (initial && (initial as Record<string, unknown>)[k] != null) {
      return String((initial as Record<string, unknown>)[k]);
    }
    return "";
  };

  const [values, setValues] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const f of FIELD_KEYS) m[f.key] = getInitial(f.key);
    return m;
  });

  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setVal(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.period.trim()) {
      setErr(t("credit.period") + " is required");
      return;
    }
    setSubmitting(true);
    setErr(null);

    const body: Record<string, unknown> = {
      customer_id: customerId,
      period: values.period.trim(),
    };

    for (const f of FIELD_KEYS) {
      if (f.key === "period") continue;
      const n = toNumOrNull(values[f.key]);
      if (values[f.key].trim() && n === null) {
        setErr(`${t(f.i18nKey)}: must be an integer`);
        setSubmitting(false);
        return;
      }
      body[f.key] = n;
    }

    if (thresholds) (body as Record<string, unknown>)._thresholds = thresholds;

    const finalBody: Record<string, unknown> = isEdit
      ? {
          ...Object.fromEntries(
            Object.entries(body).filter(([k]) => k !== "customer_id" && k !== "period")
          ),
          _thresholds: thresholds,
        }
      : body;

    if (isEdit) {
      const toSend = { ...finalBody } as Record<string, unknown>;
      if (thresholds) toSend._thresholds = thresholds;
      try {
        const res = await patchFinancialStatement(initial!.id, toSend);
        if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Update failed");
        onSaved();
      } catch (ex: unknown) {
        const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed";
        setErr(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await createFinancialStatement(finalBody);
      if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Create failed");
      onSaved();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Create failed";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? `${t("common.edit")} BCTC · ${initial?.period}` : t("credit.add_bctc")}
    >
      <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FIELD_KEYS.map((f) => {
            const isPeriod = f.key === "period";
            return (
              <FormField
                key={f.key}
                label={t(f.i18nKey)}
                hint={f.hint}
                required={isPeriod}
              >
                <Input
                  value={values[f.key]}
                  onChange={(e) => setVal(f.key, e.target.value)}
                  disabled={isEdit && isPeriod}
                  placeholder={isPeriod ? "2024" : "0"}
                  inputMode={isPeriod ? "text" : "numeric"}
                  className="font-mono text-xs"
                />
              </FormField>
            );
          })}
        </div>

        {err && (
          <p role="alert" className="rounded-xl bg-[#faedea] border border-[#f0c7be] p-3 text-xs font-semibold text-[#a13d28]">
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#eee8db]">
          <Button type="button" variant="secondary" onClick={onClose} className="cursor-pointer">
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting} className="cursor-pointer">
            {submitting ? t("common.saving") : isEdit ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
