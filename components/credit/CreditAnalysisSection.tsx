"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listFinancialStatements,
  listFinancialRatios,
  listRedFlags,
  deleteFinancialStatement,
  createRedFlag,
  draftCommentaryAI,
  type FinancialStatement,
  type FinancialRatio,
  type RedFlag,
  type DraftCommentaryAIResult,
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
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";

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
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const [showManualFlag, setShowManualFlag] = useState(false);
  const [flagPeriod, setFlagPeriod] = useState("");
  const [flagDesc, setFlagDesc] = useState("");
  const [flagSeverity, setFlagSeverity] = useState<"low" | "medium" | "high">("medium");
  const [flagSubmitting, setFlagSubmitting] = useState(false);
  const [flagErr, setFlagErr] = useState<string | null>(null);

  // AI commentary state — never auto-saves ratios/flags
  const [commentaryFsId, setCommentaryFsId] = useState<string>("");
  const [commentary, setCommentary] = useState<DraftCommentaryAIResult | null>(null);
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryErr, setCommentaryErr] = useState<string | null>(null);

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
      if (fs.length && !commentaryFsId) setCommentaryFsId(fs[0].id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? t("common.error");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [customerId, t, commentaryFsId]);

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

  async function onDraftCommentary() {
    if (!commentaryFsId) {
      setCommentaryErr("Chọn một kỳ BCTC trước");
      return;
    }
    setCommentaryLoading(true);
    setCommentaryErr(null);
    setCommentary(null);
    try {
      const res = await draftCommentaryAI({ financial_statement_id: commentaryFsId });
      setCommentary(res);
    } catch (ex: unknown) {
      const apiErr = ex as { error?: string; status?: number };
      if (apiErr.status === 429) {
        setCommentaryErr(apiErr.error ?? "System AI quota exceeded (10/day)");
      } else {
        setCommentaryErr(apiErr.error ?? "Failed to draft commentary");
      }
    } finally {
      setCommentaryLoading(false);
    }
  }

  const sourceLabel: Record<string, string> = { gemini_byok: "BYOK", gemini_system: "System AI", heuristic: "Heuristic" };
  const sourceColor: Record<string, string> = {
    gemini_byok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gemini_system: "bg-sky-50 text-sky-700 border-sky-200",
    heuristic: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };

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

      <RedFlagThresholdControl onChanged={load} />

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

      {/* AI Commentary Draft — narrates ratios/flags only, never computes them */}
      <Card>
        <CardHeader>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            AI Commentary Draft
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Drafts a narrative paragraph from already-computed ratios/red flags. Source labeled (BYOK / System AI / Heuristic). Never alters ratios or moves pipeline.
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kỳ BCTC</label>
              <select
                value={commentaryFsId}
                onChange={(e) => setCommentaryFsId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Chọn kỳ —</option>
                {statements.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.period}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#576750] hover:bg-[#f5f1e8] transition cursor-pointer"
                title="Cấu hình Google Gemini API Key / Configure AI Key"
              >
                <span>🔑</span>
                <span>AI Key</span>
              </button>
              <Button size="sm" onClick={onDraftCommentary} disabled={commentaryLoading || !commentaryFsId} className="h-9">
                {commentaryLoading ? "…" : "✨ Draft commentary"}
              </Button>
            </div>
          </div>

          {commentaryErr && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {commentaryErr}
            </p>
          )}

          {commentary && (
            <div className="rounded-xl border bg-white p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${sourceColor[commentary.source] ?? sourceColor.heuristic}`}>
                  {sourceLabel[commentary.source] ?? commentary.source}
                </span>
                {commentary.fallback_reason && (
                  <span className="text-[11px] text-zinc-400">fallback: {commentary.fallback_reason.slice(0,120)}</span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{commentary.draft}</p>
              <p className="text-[11px] text-zinc-400">Ratios/flags are from the rule engine — AI only narrates, never recomputes. This draft is narrative text only.</p>
            </div>
          )}
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

      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
      />
    </div>
  );
}
