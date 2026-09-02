"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n";

type ParsedRow = Record<string, string | number | null> & { period: string };

const REQUIRED_COL = "period";
const ALLOWED_COLS = [
  "period",
  "revenue",
  "cogs",
  "net_income",
  "ebit",
  "ebitda",
  "interest_expense",
  "total_assets",
  "total_liabilities",
  "total_equity",
  "current_assets",
  "current_liabilities",
  "inventory",
  "receivables",
  "payables",
  "cfo",
  "total_debt",
  "cash",
];

export function ExcelUploadDialog({ onPrefill }: { onPrefill: (row: ParsedRow) => void }) {
  const { t, formatNumber } = useI18n();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setLoading(true);
    setRows([]);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error("No sheet found in workbook");
      const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
      if (!json.length) throw new Error("Sheet is empty");

      const headers = Object.keys(json[0] ?? {}).map((h) => String(h).trim().toLowerCase());
      if (!headers.includes(REQUIRED_COL)) {
        throw new Error(`Missing required column "${REQUIRED_COL}". Headers found: ${headers.join(", ")}`);
      }

      const parsed: ParsedRow[] = json.map((r) => {
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
            if (!Number.isFinite(n)) throw new Error(`Column "${col}" has non-numeric value "${v}" (period=${period})`);
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
      e.target.value = "";
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="text-xs h-8">
        {t("credit.upload_excel")}
      </Button>

      {open && (
        <Modal
          open
          onClose={() => {
            setOpen(false);
            setRows([]);
            setErr(null);
          }}
          title={t("credit.excel_dialog_title")}
        >
          <div className="space-y-4">
            <p className="text-xs text-[#576750] leading-relaxed">
              {t("credit.excel_dialog_desc")}
            </p>

            <label className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-[#dfd8c8] bg-[#faf8f3]/60 p-5 text-center cursor-pointer hover:border-[#265e2b] hover:bg-[#eaf5eb]/30 transition-all">
              <span className="text-xs font-semibold text-[#182615]">
                <span aria-hidden="true" className="mr-1">📁</span> {t("credit.excel_choose_file")}
              </span>
              <input type="file" accept=".xlsx,.xls" onChange={onFile} className="text-xs mx-auto text-[#576750]" />
            </label>

            {loading && (
              <p className="text-xs font-semibold text-[#576750] text-center animate-pulse">
                {t("common.loading")}
              </p>
            )}

            {err && (
              <p role="alert" className="rounded-xl bg-[#faedea] border border-[#f0c7be] p-3 text-xs text-[#a13d28] font-semibold">
                {err}
              </p>
            )}

            {rows.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold text-[#182615]">
                  {t("credit.excel_upload_success", { count: rows.length })}
                </p>
                <div className="max-h-60 overflow-auto rounded-xl border border-[#dfd8c8]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[#faf8f3] border-b border-[#eee8db]">
                      <tr>
                        <th className="px-3.5 py-2.5 text-left font-mono font-bold text-[#576750] uppercase">{t("credit.period")}</th>
                        <th className="px-3.5 py-2.5 text-right font-mono font-bold text-[#576750] uppercase">{t("credit.revenue")}</th>
                        <th className="px-3.5 py-2.5 text-right font-mono font-bold text-[#576750] uppercase">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eee8db]">
                      {rows.map((r) => (
                        <tr key={r.period} className="hover:bg-[#faf8f3]/80">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-[#182615]">{r.period}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-[#182615]">
                            {r.revenue != null ? formatNumber(typeof r.revenue === "number" ? r.revenue : Number(r.revenue)) : t("common.empty_dash")}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                onPrefill(r);
                                setOpen(false);
                              }}
                              className="h-7 text-xs font-semibold cursor-pointer"
                            >
                              {t("credit.excel_prefill_btn")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
