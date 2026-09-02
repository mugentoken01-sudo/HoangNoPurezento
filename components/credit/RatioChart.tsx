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
import { useI18n } from "@/lib/i18n";

type Props = { ratios: FinancialRatio[] };

type GroupDef = {
  key: string;
  labelKey: string;
  keys: { key: keyof FinancialRatio; labelKey: string }[];
  type: "line" | "bar";
};

const GROUPS: GroupDef[] = [
  {
    key: "growth",
    labelKey: "Tăng trưởng Doanh thu & Lợi nhuận",
    keys: [
      { key: "revenue_growth", labelKey: "Tăng trưởng DT (%)" },
      { key: "net_income_growth", labelKey: "Tăng trưởng LNST (%)" },
    ],
    type: "line",
  },
  {
    key: "liquidity",
    labelKey: "Khả năng Thanh toán (Thanh khoản)",
    keys: [
      { key: "current_ratio", labelKey: "Current Ratio (CR)" },
      { key: "quick_ratio", labelKey: "Quick Ratio (QR)" },
    ],
    type: "line",
  },
  {
    key: "leverage",
    labelKey: "Đòn bẩy Tài chính & Nợ vay",
    keys: [
      { key: "debt_to_equity", labelKey: "D/E (Nợ/VCSH)" },
      { key: "debt_to_ebitda", labelKey: "Debt / EBITDA" },
    ],
    type: "bar",
  },
  {
    key: "coverage",
    labelKey: "Khả năng Chi trả Lãi vay",
    keys: [{ key: "interest_coverage", labelKey: "Interest Coverage (ICR)" }],
    type: "line",
  },
  {
    key: "cashflow",
    labelKey: "Chất lượng Lợi nhuận & Dòng tiền",
    keys: [{ key: "cfo_to_net_income", labelKey: "CFO / LNST" }],
    type: "bar",
  },
  {
    key: "efficiency",
    labelKey: "Hiệu quả Hoạt động (Vòng quay ngày)",
    keys: [
      { key: "receivable_days", labelKey: "DSO (Ngày thu tiền)" },
      { key: "inventory_days", labelKey: "DIO (Ngày tồn kho)" },
      { key: "payable_days", labelKey: "DPO (Ngày trả nợ)" },
    ],
    type: "line",
  },
];

const COLORS = ["#2563eb", "#dc2626", "#059669", "#7c3aed", "#ea580c", "#0891b2"];

function toChartData(ratios: FinancialRatio[], keys: (keyof FinancialRatio)[]) {
  const sorted = [...ratios].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((r) => {
    const row: Record<string, unknown> = { period: r.period };
    for (const k of keys) row[k as string] = r[k] ?? null;
    return row;
  });
}

export function RatioChart({ ratios }: Props) {
  const { t } = useI18n();

  if (!ratios.length) {
    return (
      <p className="text-xs text-slate-500 py-3 text-center">
        {t("credit.no_bctc_yet")}
      </p>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {GROUPS.map((g, gi) => {
        const dataKeys = g.keys.map((k) => k.key);
        const data = toChartData(ratios, dataKeys);
        const hasAny = data.some((row) => dataKeys.some((k) => row[k as string] != null));
        if (!hasAny) return null;

        return (
          <div
            key={g.key}
            className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-2xs"
          >
            <h4 className="text-xs font-bold text-slate-800 tracking-tight">{g.labelKey}</h4>
            <div className="mt-3 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                {g.type === "line" ? (
                  <LineChart data={data as never}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    {g.keys.map((item, idx) => (
                      <Line
                        key={item.key as string}
                        type="monotone"
                        dataKey={item.key as string}
                        stroke={COLORS[(gi + idx) % COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3.5, strokeWidth: 1.5 }}
                        connectNulls
                        name={item.labelKey}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <BarChart data={data as never}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    {g.keys.map((item, idx) => (
                      <Bar
                        key={item.key as string}
                        dataKey={item.key as string}
                        fill={COLORS[(gi + idx) % COLORS.length]}
                        name={item.labelKey}
                        radius={[2, 2, 0, 0]}
                      />
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
