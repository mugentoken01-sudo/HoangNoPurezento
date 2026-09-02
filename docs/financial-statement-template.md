# Financial Statement — Excel Template (mock removed per /goal)

Mock artifacts removed — parser remains live.

- `docs/financial-statement-template.xlsx` — removed (was 18.7 KB sample with 2023–2024 rows). The binary still on disk is a deprecated placeholder; delete via:
  `! Remove-Item -Force "C:\Users\Per\Downloads\vibecode4fun\docs\financial-statement-template.xlsx" -ErrorAction SilentlyContinue`
- `scripts/seed.ts` / `scripts/generate-template.mjs` — deprecated placeholders (replaced by `scripts/clean-mock.ts`).
- `lib/parse-financial-excel.ts` — pure `parseFinancialRows(json)` reads headers by **name**, `period` required. Used by `components/credit/ExcelUploadDialog.tsx` (`import("xlsx")` code-split, prefill for review — never auto-insert).

To recreate a template manually: single sheet, row 1 headers `period, revenue, cogs, net_income, ebit, ebitda, interest_expense, total_assets, total_liabilities, total_equity, current_assets, current_liabilities, inventory, receivables, payables, cfo, total_debt, cash` — each subsequent row is one period. Missing `period` is rejected.
