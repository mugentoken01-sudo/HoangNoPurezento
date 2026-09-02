# Financial Statement — Excel Template (mock removed)

Mock template đã được xóa theo yêu cầu (mục tiêu /goal: không dùng mock data).

- Parser vẫn hoạt động: `lib/parse-financial-excel.ts` — đọc header theo tên cột, `period` là bắt buộc.
- Để lấy lại file mẫu, chạy: `! node scripts/generate-template.mjs` (placeholder — đã thay bằng file rỗng, cần khôi phục logic gốc từ git history nếu muốn)
- Khuyến nghị: tự tạo file `.xlsx` 1 sheet, hàng 1 là header: `period, revenue, cogs, net_income, ebit, ebitda, interest_expense, total_assets, total_liabilities, total_equity, current_assets, current_liabilities, inventory, receivables, payables, cfo, total_debt, cash` — mỗi hàng sau là 1 kỳ. Thiếu `period` sẽ bị reject.
