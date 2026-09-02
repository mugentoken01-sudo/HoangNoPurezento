"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// Lightweight xlsx import — only loaded when dialog opens (code-split via dynamic import)
type ParsedRow = Record<string, string | number | null> & { period: string };

const REQUIRED_COL = "period";
const ALLOWED_COLS = ["period","revenue","cogs","net_income","ebit","ebitda","interest_expense","total_assets","total_liabilities","total_equity","current_assets","current_liabilities","inventory","receivables","payables","cfo","total_debt","cash"];

export function ExcelUploadDialog({ onPrefill }: { onPrefill: (row: ParsedRow) => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setLoading(true); setRows([]);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error("No sheet found");
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
      if (!json.length) throw new Error("Sheet is empty");
      // Validate header: must have period
      const headers = Object.keys(json[0] ?? {}).map(h => String(h).trim().toLowerCase());
      if (!headers.includes(REQUIRED_COL)) throw new Error(`Missing required column "${REQUIRED_COL}". Headers found: ${headers.join(", ")}`);
      const parsed: ParsedRow[] = json.map(r => {
        const lower: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) lower[String(k).trim().toLowerCase()] = v;
        const period = String(lower[REQUIRED_COL] ?? "").trim();
        if (!period) throw new Error(`Row missing "${REQUIRED_COL}"`);
        const out: ParsedRow = { period } as ParsedRow;
        for (const col of ALLOWED_COLS) {
          if (col === "period") continue;
          const v = lower[col];
          if (v == null || v === "") out[col] = null;
          else {
            const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
            if (!Number.isFinite(n)) throw new Error(`Column "${col}" has non-numeric value "${v}" (row period=${period})`);
            out[col] = Math.trunc(n);
          }
        }
        return out;
      });
      setRows(parsed);
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setLoading(false);
      // reset input so same file can be re-selected
      e.target.value = "";
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Upload Excel</Button>
      {open && (
        <Modal open onClose={() => { setOpen(false); setRows([]); setErr(null); }} title="Upload Excel — BCTC template">
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              1 sheet, header row = field names (<code className="rounded bg-zinc-100 px-1">{ALLOWED_COLS.join(", ")}</code>). Each row is one period.
              File is parsed locally and <strong>prefills the form for review</strong> — nothing is inserted until you confirm.
            </p>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium">Choose .xlsx file</span>
              <input type="file" accept=".xlsx,.xls" onChange={onFile} className="text-sm" />
            </label>
            {loading && <p className="text-xs text-zinc-500">Parsing…</p>}
            {err && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</p>}
            {rows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">{rows.length} row(s) parsed — click to prefill form:</p>
                <div className="max-h-64 overflow-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-50">
                      <tr><th className="px-2 py-1 text-left border-b">Period</th><th className="px-2 py-1 text-left border-b">Revenue</th><th className="px-2 py-1 text-left border-b">Action</th></tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.period} className="border-b last:border-0 hover:bg-zinc-50">
                          <td className="px-2 py-1 font-mono">{r.period}</td>
                          <td className="px-2 py-1">{r.revenue ?? "—"}</td>
                          <td className="px-2 py-1"><Button size="sm" onClick={() => { onPrefill(r); setOpen(false); }}>Prefill</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-zinc-400">Template order doesn’t matter — columns are matched by name. Missing optional columns → null.</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
