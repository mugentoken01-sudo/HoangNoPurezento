"use client";
import type { FinancialStatement } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";

export function FinancialStatementTable({
  statements,
  onEdit,
  onDelete,
}: {
  statements: FinancialStatement[];
  onEdit: (fs: FinancialStatement) => void;
  onDelete: (fs: FinancialStatement) => void;
}) {
  const { t, formatNumber } = useI18n();

  if (!statements.length) {
    return (
      <p className="text-xs text-slate-500 py-3 text-center">
        {t("credit.no_bctc_yet")}
      </p>
    );
  }

  const sorted = [...statements].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              <th className="px-3.5 py-2.5">{t("credit.period")}</th>
              <th className="px-3.5 py-2.5 text-right">{t("credit.revenue")} (VND)</th>
              <th className="px-3.5 py-2.5 text-right">{t("credit.net_income")} (VND)</th>
              <th className="px-3.5 py-2.5 text-right">{t("credit.total_debt")} (VND)</th>
              <th className="px-3.5 py-2.5 text-right">{t("credit.cfo")} (VND)</th>
              <th className="px-3.5 py-2.5 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {sorted.map((fs) => (
              <tr key={fs.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-3.5 py-2.5 font-bold text-slate-900">{fs.period}</td>
                <td className="px-3.5 py-2.5 text-right text-slate-800 tabular-nums">
                  {fs.revenue != null ? formatNumber(fs.revenue) : t("common.empty_dash")}
                </td>
                <td className="px-3.5 py-2.5 text-right text-slate-800 tabular-nums">
                  {fs.net_income != null ? formatNumber(fs.net_income) : t("common.empty_dash")}
                </td>
                <td className="px-3.5 py-2.5 text-right text-slate-800 tabular-nums">
                  {fs.total_debt != null ? formatNumber(fs.total_debt) : t("common.empty_dash")}
                </td>
                <td className="px-3.5 py-2.5 text-right text-slate-800 tabular-nums">
                  {fs.cfo != null ? formatNumber(fs.cfo) : t("common.empty_dash")}
                </td>
                <td className="px-3.5 py-2.5 text-right font-sans">
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => onEdit(fs)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => onDelete(fs)}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
