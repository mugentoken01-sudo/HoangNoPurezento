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

const COLORS = ["#265e2b", "#b04e33", "#965a12", "#1e3a8a", "#41503b", "#059669"];

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
      <p className="text-xs text-[#576750] py-4 text-center">
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
            className="rounded-xl border border-[#dfd8c8] bg-[#ffffff] p-4 sm:p-5 shadow-2xs"
          >
            <h4 className="text-xs font-serif font-bold text-[#182615] tracking-tight">{g.labelKey}</h4>
            <div className="mt-3.5 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                {g.type === "line" ? (
                  <LineChart data={data as never} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee8db" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#576750" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#576750" }} width={44} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#dfd8c8",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#182615",
                        boxShadow: "0 4px 12px rgba(24,38,21,0.08)",
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
                  <BarChart data={data as never} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee8db" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#576750" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#576750" }} width={44} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#dfd8c8",
                        borderRadius: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#182615",
                        boxShadow: "0 4px 12px rgba(24,38,21,0.08)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                    {g.keys.map((item, idx) => (
                      <Bar
                        key={item.key as string}
                        dataKey={item.key as string}
                        fill={COLORS[(gi + idx) % COLORS.length]}
                        name={item.labelKey}
                        radius={[3, 3, 0, 0]}
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
