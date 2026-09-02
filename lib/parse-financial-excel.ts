// RM Cockpit — M5 Phase 5.2: Pure Excel parser for financial statements
// No I/O, no Supabase/fetch — takes ArrayBuffer, returns rows + errors

export type ParsedFSRow = {
  period: string;
  revenue: number | null;
  cogs: number | null;
  net_income: number | null;
  ebit: number | null;
  ebitda: number | null;
  interest_expense: number | null;
  total_assets: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  current_assets: number | null;
  current_liabilities: number | null;
  inventory: number | null;
  receivables: number | null;
  payables: number | null;
  cfo: number | null;
  total_debt: number | null;
  cash: number | null;
};

export type ParseResult = {
  rows: ParsedFSRow[];
  errors: string[];
};

const ALLOWED_COLS = [
  "period","revenue","cogs","net_income","ebit","ebitda","interest_expense",
  "total_assets","total_liabilities","total_equity","current_assets","current_liabilities",
  "inventory","receivables","payables","cfo","total_debt","cash"
] as const;

const REQUIRED_COL = "period";

function toIntOrNull(v: unknown, col: string, period: string): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) throw new Error(`Column "${col}" has non-numeric value "${v}" (period=${period})`);
  return Math.trunc(n);
}

export async function parseFinancialExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["No sheet found"] };
  const sheet = wb.Sheets[sheetName];
  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
  if (!json.length) return { rows: [], errors: ["Sheet is empty"] };

  const headers = Object.keys(json[0] ?? {}).map(h => String(h).trim().toLowerCase());
  if (!headers.includes(REQUIRED_COL)) {
    return { rows: [], errors: [`Missing required column "${REQUIRED_COL}". Headers found: ${headers.join(", ")}`] };
  }

  const rows: ParsedFSRow[] = [];
  const errors: string[] = [];

  for (let i = 0; i < json.length; i++) {
    const raw = json[i];
    const lower: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) lower[String(k).trim().toLowerCase()] = v;
    const period = String(lower[REQUIRED_COL] ?? "").trim();
    if (!period) {
      errors.push(`Row ${i + 2}: missing "${REQUIRED_COL}"`);
      continue;
    }
    try {
      const row: ParsedFSRow = { period } as ParsedFSRow;
      for (const col of ALLOWED_COLS) {
        if (col === "period") continue;
        const v = lower[col];
        (row as Record<string, unknown>)[col] = toIntOrNull(v, col, period);
      }
      rows.push(row);
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return { rows, errors };
}

// Synchronous helper for testing with already-parsed JSON rows
export function parseFinancialRows(json: Record<string, unknown>[]): ParseResult {
  if (!json.length) return { rows: [], errors: ["Sheet is empty"] };
  const headers = Object.keys(json[0] ?? {}).map(h => String(h).trim().toLowerCase());
  if (!headers.includes(REQUIRED_COL)) {
    return { rows: [], errors: [`Missing required column "${REQUIRED_COL}". Headers found: ${headers.join(", ")}`] };
  }
  const rows: ParsedFSRow[] = [];
  const errors: string[] = [];
  for (let i = 0; i < json.length; i++) {
    const raw = json[i];
    const lower: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) lower[String(k).trim().toLowerCase()] = v;
    const period = String(lower[REQUIRED_COL] ?? "").trim();
    if (!period) { errors.push(`Row ${i + 2}: missing "${REQUIRED_COL}"`); continue; }
    try {
      const row: ParsedFSRow = { period } as ParsedFSRow;
      for (const col of ALLOWED_COLS) {
        if (col === "period") continue;
        (row as Record<string, unknown>)[col] = toIntOrNull(lower[col], col, period);
      }
      rows.push(row);
    } catch (e: unknown) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  return { rows, errors };
}
