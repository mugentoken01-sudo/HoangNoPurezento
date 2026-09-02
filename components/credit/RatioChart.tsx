"use client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { FinancialRatio } from "@/lib/api-client";

type Props = { ratios: FinancialRatio[] };

type Group = {
  key: string;
  label: string;
  keys: (keyof FinancialRatio)[];
  type: "line" | "bar";
};

const GROUPS: Group[] = [
  { key: "growth", label: "Growth", keys: ["revenue_growth", "net_income_growth"], type: "line" },
  { key: "liquidity", label: "Liquidity", keys: ["current_ratio", "quick_ratio"], type: "line" },
  { key: "leverage", label: "Leverage", keys: ["debt_to_equity", "debt_to_ebitda"], type: "bar" },
  { key: "coverage", label: "Interest coverage", keys: ["interest_coverage"], type: "line" },
  { key: "cashflow", label: "Cash flow", keys: ["cfo_to_net_income"], type: "bar" },
  { key: "efficiency", label: "Efficiency (days)", keys: ["receivable_days", "inventory_days", "payable_days"], type: "line" },
];

const COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#ea580c", "#0891b2"];

function toChartData(ratios: FinancialRatio[], keys: (keyof FinancialRatio)[]) {
  const sorted = [...ratios].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map(r => {
    const row: Record<string, unknown> = { period: r.period };
    for (const k of keys) row[k as string] = r[k] ?? null;
    return row;
  });
}

export function RatioChart({ ratios }: Props) {
  if (!ratios.length) return <p className="text-sm text-zinc-500">No ratio data — add at least one BCTC period to see charts.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {GROUPS.map((g, gi) => {
        const data = toChartData(ratios, g.keys);
        // Skip group if all values null
        const hasAny = data.some(row => g.keys.some(k => row[k as string] != null));
        if (!hasAny) return null;
        return (
          <div key={g.key} className="rounded-lg border bg-white p-3">
            <h4 className="text-xs font-semibold tracking-wide text-zinc-700">{g.label}</h4>
            <div className="mt-2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                {g.type === "line" ? (
                  <LineChart data={data as never}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={48} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {g.keys.map((k, idx) => (
                      <Line
                        key={k as string}
                        type="monotone"
                        dataKey={k as string}
                        stroke={COLORS[(gi + idx) % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                        name={k as string}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={data as never}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={48} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {g.keys.map((k, idx) => (
                      <Bar key={k as string} dataKey={k as string} fill={COLORS[(gi + idx) % COLORS.length]} name={k as string} />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
