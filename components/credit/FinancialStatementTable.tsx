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
      <p className="text-xs text-[#576750] py-4 text-center">
        {t("credit.no_bctc_yet")}
      </p>
    );
  }

  const sorted = [...statements].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <div className="overflow-hidden rounded-xl border border-[#dfd8c8] bg-[#ffffff] shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#eee8db] bg-[#faf8f3]/90 text-[11px] font-mono font-bold tracking-wider text-[#576750] uppercase">
              <th className="px-4 py-3">{t("credit.period")}</th>
              <th className="px-4 py-3 text-right">{t("credit.revenue")} (VND)</th>
              <th className="px-4 py-3 text-right">{t("credit.net_income")} (VND)</th>
              <th className="px-4 py-3 text-right">{t("credit.total_debt")} (VND)</th>
              <th className="px-4 py-3 text-right">{t("credit.cfo")} (VND)</th>
              <th className="px-4 py-3 text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eee8db] font-mono">
            {sorted.map((fs) => (
              <tr key={fs.id} className="transition-colors hover:bg-[#faf8f3]/80">
                <td className="px-4 py-3 font-bold text-[#182615]">{fs.period}</td>
                <td className="px-4 py-3 text-right text-[#182615] tabular-nums">
                  {fs.revenue != null ? formatNumber(fs.revenue) : t("common.empty_dash")}
                </td>
                <td className="px-4 py-3 text-right text-[#182615] tabular-nums">
                  {fs.net_income != null ? formatNumber(fs.net_income) : t("common.empty_dash")}
                </td>
                <td className="px-4 py-3 text-right text-[#182615] tabular-nums">
                  {fs.total_debt != null ? formatNumber(fs.total_debt) : t("common.empty_dash")}
                </td>
                <td className="px-4 py-3 text-right text-[#182615] tabular-nums">
                  {fs.cfo != null ? formatNumber(fs.cfo) : t("common.empty_dash")}
                </td>
                <td className="px-4 py-3 text-right font-sans">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEdit(fs)}
                      className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#2d3e29] hover:bg-[#f7f4ed] hover:border-[#bcc6b1] transition cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(fs)}
                      className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#a13d28] hover:bg-[#faedea] hover:border-[#f0c7be] transition cursor-pointer"
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
