"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listFinancialStatements,
  listFinancialRatios,
  listRedFlags,
  deleteFinancialStatement,
  type FinancialStatement,
  type FinancialRatio,
  type RedFlag,
} from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { FinancialStatementForm } from "./FinancialStatementForm";
import { FinancialStatementTable } from "./FinancialStatementTable";
import { ExcelUploadDialog } from "./ExcelUploadDialog";
import { RatioChart } from "./RatioChart";
import { RedFlagList } from "./RedFlagList";
import { RedFlagThresholdControl } from "./RedFlagThresholdControl";
import { loadThresholds } from "@/lib/red-flag-thresholds";

export function CreditAnalysisSection({ customerId }: { customerId: string }) {
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [periodFilter, setPeriodFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinancialStatement | null>(null);
  const [prefill, setPrefill] = useState<Record<string, string | number | null> | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
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
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Failed to load credit data";
      setErr(msg);
    } finally { setLoading(false); }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

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
    if (!confirm(`Delete BCTC period "${fs.period}"? Ratios and its auto red flags will also be deleted (manual flags remain).`)) return;
    try {
      await deleteFinancialStatement(fs.id);
      await load();
    } catch (e: unknown) {
      alert((e as { error?: string })?.error ?? "Delete failed");
    }
  }

  if (loading) return <Card><CardBody><p className="text-sm text-zinc-500">Loading credit analysis…</p></CardBody></Card>;
  if (err) return <Card><CardBody><p className="text-sm text-red-600">{err}</p><Button variant="secondary" size="sm" className="mt-2" onClick={load}>Retry</Button></CardBody></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Credit Analysis</h3>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openCreate()}>+ Add BCTC</Button>
          <ExcelUploadDialog onPrefill={(row) => openCreate(row as Record<string, string | number | null>)} />
        </div>
      </div>

      <RedFlagThresholdControl onChanged={load} />

      <Card>
        <CardHeader><h4 className="text-xs font-semibold tracking-wide">BCTC — Financial Statements</h4><p className="text-xs text-zinc-400">Sorted by period. Edit reconciles ratios + auto flags (manual preserved) — P-1. Delete cascades — P-2. Thresholds from the control above apply on next create/edit.</p></CardHeader>
        <CardBody><FinancialStatementTable statements={statements} onEdit={openEdit} onDelete={onDelete} /></CardBody>
      </Card>

      <Card>
        <CardHeader><h4 className="text-xs font-semibold tracking-wide">Ratios — 6 groups (Recharts, multi-year)</h4></CardHeader>
        <CardBody><RatioChart ratios={ratios} /></CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h4 className="text-xs font-semibold tracking-wide">Red Flags</h4>
          <p className="text-xs text-zinc-400">Auto (rule_engine) vs manual — P-3. Filter by period. 5 rules: debt_growth_gt_revenue, profit_without_cash, current_ratio_below_1/low, interest_coverage_lt_2, receivable_days_spike. Thresholds are RM-tunable above.</p>
        </CardHeader>
        <CardBody><RedFlagList flags={flags} periodFilter={periodFilter} onFilterChange={setPeriodFilter} /></CardBody>
      </Card>

      <Card>
        <CardBody>
          <p className="text-xs text-zinc-500">Manual flags via <code className="rounded bg-zinc-100 px-1">POST /api/red-flags</code> (source=manual). Reconciliation only touches <code className="rounded bg-zinc-100 px-1">rule_engine</code>. Chart + flags update after each BCTC save.</p>
        </CardBody>
      </Card>

      {showForm && (
        <FinancialStatementForm
          customerId={customerId}
          initial={editing}
          prefill={prefill}
          thresholds={loadThresholds()}
          onClose={() => { setShowForm(false); setEditing(null); setPrefill(undefined); }}
          onSaved={async () => { setShowForm(false); setEditing(null); setPrefill(undefined); await load(); }}
        />
      )}
    </div>
  );
}
