"use client";
import { Button } from "@/components/ui/Button";
import type { FinancialStatement } from "@/lib/api-client";

export function FinancialStatementTable({
  statements,
  onEdit,
  onDelete,
}: {
  statements: FinancialStatement[];
  onEdit: (fs: FinancialStatement) => void;
  onDelete: (fs: FinancialStatement) => void;
}) {
  if (!statements.length) return <p className="text-sm text-zinc-500">No BCTC periods yet — add manually or upload Excel.</p>;

  const sorted = [...statements].sort((a, b) => a.period.localeCompare(b.period));

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left text-xs text-zinc-500">
            <th className="px-3 py-2 border-b">Period</th>
            <th className="px-3 py-2 border-b text-right">Revenue</th>
            <th className="px-3 py-2 border-b text-right">Net income</th>
            <th className="px-3 py-2 border-b text-right">Debt</th>
            <th className="px-3 py-2 border-b text-right">CFO</th>
            <th className="px-3 py-2 border-b text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(fs => (
            <tr key={fs.id} className="hover:bg-zinc-50">
              <td className="px-3 py-2 border-b font-mono font-medium">{fs.period}</td>
              <td className="px-3 py-2 border-b text-right tabular-nums">{fs.revenue != null ? Number(fs.revenue).toLocaleString("vi-VN") : "—"}</td>
              <td className="px-3 py-2 border-b text-right tabular-nums">{fs.net_income != null ? Number(fs.net_income).toLocaleString("vi-VN") : "—"}</td>
              <td className="px-3 py-2 border-b text-right tabular-nums">{fs.total_debt != null ? Number(fs.total_debt).toLocaleString("vi-VN") : "—"}</td>
              <td className="px-3 py-2 border-b text-right tabular-nums">{fs.cfo != null ? Number(fs.cfo).toLocaleString("vi-VN") : "—"}</td>
              <td className="px-3 py-2 border-b">
                <div className="flex justify-end gap-1">
                  <button onClick={() => onEdit(fs)} className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50">Edit</button>
                  <button onClick={() => onDelete(fs)} className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
