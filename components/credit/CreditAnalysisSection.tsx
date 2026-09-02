"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listFinancialStatements,
  listFinancialRatios,
  listRedFlags,
  deleteFinancialStatement,
  createRedFlag,
  type FinancialStatement,
  type FinancialRatio,
  type RedFlag,
} from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";
import { FinancialStatementForm } from "./FinancialStatementForm";
import { FinancialStatementTable } from "./FinancialStatementTable";
import { ExcelUploadDialog } from "./ExcelUploadDialog";
import { RatioChart } from "./RatioChart";
import { RedFlagList } from "./RedFlagList";
import { RedFlagThresholdControl } from "./RedFlagThresholdControl";
import { useI18n } from "@/lib/i18n";

export function CreditAnalysisSection({ customerId }: { customerId: string }) {
  const { t } = useI18n();
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [periodFilter, setPeriodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinancialStatement | null>(null);
  const [prefill, setPrefill] = useState<Record<string, string | number | null> | undefined>(undefined);

  // Manual Red Flag modal state
  const [showManualFlag, setShowManualFlag] = useState(false);
  const [flagPeriod, setFlagPeriod] = useState("");
  const [flagDesc, setFlagDesc] = useState("");
  const [flagSeverity, setFlagSeverity] = useState<"low" | "medium" | "high">("medium");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagErr, setFlagErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [fs, r, f] = await Promise.all([
        listFinancialStatements(customerId),
        listFinancialRatios(customerId),
        listRedFlags(customerId),
      ]);
      setStatements(fs);
      setRatios(r as FinancialRatio[]);
      setFlags(f as RedFlag[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? t("common.error");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [customerId, t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate(pref?: Record<string, string | number | null>) {
    setEditing(null);
    setPrefill(pref);
    setShowForm(true);
  }

  function openEdit(fs: FinancialStatement) {
    setEditing(fs);
    setPrefill(undefined);
    setShowForm(true);
  }

  async function onDelete(fs: FinancialStatement) {
    if (!confirm(`${t("common.confirm_delete")} BCTC ${fs.period}? ${t("common.confirm_delete_desc")}`)) return;
    try {
      await deleteFinancialStatement(fs.id);
      await load();
    } catch (e: unknown) {
      alert((e as { error?: string })?.error ?? t("common.error"));
    }
  }

  async function onSaveManualFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!flagDesc.trim()) {
      setFlagErr("Description is required");
      return;
    }
    setFlagSubmitting(true);
    setFlagErr(null);
    try {
      await createRedFlag({
        customer_id: customerId,
        rule_triggered: "MANUAL_OBSERVATION",
        severity: flagSeverity,
        description: flagDesc.trim(),
        period: flagPeriod.trim() || null,
        source: "manual",
      });
      setShowManualFlag(false);
      setFlagDesc("");
      setFlagPeriod("");
      await load();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? t("common.error");
      setFlagErr(msg);
    } finally {
      setFlagSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-r-transparent" />
        <p className="mt-2 text-xs font-medium text-slate-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="border-l-4 border-red-500 bg-red-50/50 p-4 rounded-lg">
        <p className="text-xs font-semibold text-red-700">{err}</p>
        <Button variant="secondary" size="sm" className="mt-2 text-xs" onClick={load}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {t("credit.title")}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("credit.bctc_table_subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => openCreate()} className="text-xs font-semibold h-8">
            {t("credit.add_bctc")}
          </Button>
          <ExcelUploadDialog onPrefill={(row) => openCreate(row as Record<string, string | number | null>)} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowManualFlag(true)}
            className="text-xs h-8"
          >
            {t("credit.manual_flag_button")}
          </Button>
        </div>
      </div>

      {/* Threshold configuration slider box */}
      <RedFlagThresholdControl onChanged={load} />

      {/* BCTC List */}
      <Card>
        <CardHeader>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {t("credit.bctc_table_title")}
          </h4>
        </CardHeader>
        <CardBody className="p-4">
          <FinancialStatementTable statements={statements} onEdit={openEdit} onDelete={onDelete} />
        </CardBody>
      </Card>

      {/* Ratios 6 Groups Charts */}
      <Card>
        <CardHeader>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {t("credit.ratios_chart_title")}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">{t("credit.ratios_chart_subtitle")}</p>
        </CardHeader>
        <CardBody className="p-4">
          <RatioChart ratios={ratios} />
        </CardBody>
      </Card>

      {/* Red Flags Intelligence */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {t("credit.red_flags_title")}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">{t("credit.red_flags_subtitle")}</p>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          <RedFlagList flags={flags} periodFilter={periodFilter} onFilterChange={setPeriodFilter} />
        </CardBody>
      </Card>

      {showForm && (
        <FinancialStatementForm
          customerId={customerId}
          initial={editing}
          prefill={prefill}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
            setPrefill(undefined);
          }}
          onSaved={async () => {
            setShowForm(false);
            setEditing(null);
            setPrefill(undefined);
            await load();
          }}
        />
      )}

      {showManualFlag && (
        <Modal
          open
          onClose={() => setShowManualFlag(false)}
          title={t("credit.manual_flag_button")}
        >
          <form onSubmit={onSaveManualFlag} className="space-y-3.5">
            <FormField label="Kỳ / Niên độ (tùy chọn)" hint="VD: 2024">
              <Input
                value={flagPeriod}
                onChange={(e) => setFlagPeriod(e.target.value)}
                placeholder="2024"
              />
            </FormField>
            <FormField label="Mức độ nghiêm trọng (Severity)">
              <Select
                value={flagSeverity}
                onChange={(e) => setFlagSeverity(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">{t("credit.severity_low")}</option>
                <option value="medium">{t("credit.severity_medium")}</option>
                <option value="high">{t("credit.severity_high")}</option>
              </Select>
            </FormField>
            <FormField label="Mô tả rủi ro quan sát thực địa *" required>
              <Textarea
                rows={3}
                value={flagDesc}
                onChange={(e) => setFlagDesc(e.target.value)}
                placeholder="VD: Nhà xưởng tạm dừng hoạt động 1 dây chuyền sản xuất; nợ thuế chưa thanh toán…"
              />
            </FormField>

            {flagErr && (
              <p className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs font-medium text-red-700">
                {flagErr}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setShowManualFlag(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={flagSubmitting}>
                {flagSubmitting ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
