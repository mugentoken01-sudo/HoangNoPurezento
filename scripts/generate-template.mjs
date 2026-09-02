import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const headers = ["period","revenue","cogs","net_income","ebit","ebitda","interest_expense","total_assets","total_liabilities","total_equity","current_assets","current_liabilities","inventory","receivables","payables","cfo","total_debt","cash"];
const rows = [
  ["2023", 80000000000, 60000000000, 3200000000, 5000000000, 6500000000, 1800000000, 45000000000, 28000000000, 17000000000, 22000000000, 18000000000, 9000000000, 7000000000, 5000000000, 1100000000, 20000000000, 2000000000],
  ["2024", 92000000000, 68000000000, 4100000000, 6200000000, 8000000000, 1900000000, 52000000000, 31000000000, 21000000000, 26000000000, 19500000000, 10500000000, 8200000000, 5800000000, 2800000000, 22000000000, 3500000000],
];

const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
// Auto width
ws["!cols"] = headers.map(() => ({ wch: 16 }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "BCTC");

const outDir = path.join(process.cwd(), "docs");
fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "financial-statement-template.xlsx");
XLSX.writeFile(wb, out);
console.log(`Wrote ${out} — ${rows.length} example periods, headers: ${headers.join(", ")}`);
