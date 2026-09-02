# RM Cockpit — Kế hoạch tổng quan & Hướng triển khai kỹ thuật

*Tài liệu dùng để trình bày với CTO/team engineering để breakdown module.*

---

## 1. Concept — Đây là gì, nói đơn giản

RM Cockpit về bản chất là **một Mini-CRM chuyên biệt cho RM ngân hàng doanh nghiệp**, gộp 3 khái niệm quen thuộc thành một:

| Khái niệm quen thuộc | Vai trò trong RM Cockpit |
|---|---|
| **CRM** (như HubSpot, Pipedrive) | Lưu profile khách, người liên hệ, lịch sử tương tác |
| **Kanban pipeline** (như Trello, Linear) | Theo dõi deal đang ở giai đoạn nào, kéo thả để chuyển stage |
| **Công cụ phân tích tài chính** | Nhập số liệu BCTC → tính ratio → cảnh báo rủi ro tín dụng |

Điểm khác biệt so với CRM thông thường: **entity trung tâm không phải "deal" chung chung mà là "Customer" gắn liền với hồ sơ tín dụng** — nên Notes, Tasks, Pipeline stage, và BCTC đều xoay quanh và gắn chặt vào từng khách hàng cụ thể, tạo thành **một timeline duy nhất** cho mỗi khách từ Lead đến Disbursement.

**Nguyên tắc thiết kế:**
- MVP trước — không AI, không tự động hoá phức tạp. Mọi "gợi ý" ở giai đoạn này đều là **rule-based** (nếu-thì đơn giản), không phải machine learning.
- Single-user (1 RM dùng cho chính mình) ở MVP — không cần multi-user, phân quyền phức tạp.
- UI tối giản, nhanh, giống Linear/Notion — ưu tiên tốc độ nhập liệu hơn là hình thức hoành tráng.

---

## 2. Kiến trúc dữ liệu (Data Model)

Đây là phần quan trọng nhất để CTO hiểu hệ thống — mọi tính năng đều chỉ là "view" khác nhau trên cùng một bộ dữ liệu này.

| Entity | Mục đích | Field chính |
|---|---|---|
| **Customer** | Hồ sơ khách hàng | company_name, industry, revenue_reported, credit_need (loại vay + số tiền + mục đích), current_banks[], stage, status (active/lost/won), created_at |
| **Contact** | Người liên hệ tại DN khách | customer_id, name, title, phone, email, is_primary |
| **Note** | Ghi chú sau mỗi lần gọi/gặp | customer_id, content, created_at, next_action_type (call/meeting/email), next_action_date |
| **Task** | Việc cần làm | customer_id, title, due_date, status (todo/doing/done), source (manual / auto-từ-template) |
| **PipelineStageHistory** | Lịch sử chuyển stage | customer_id, from_stage, to_stage, changed_at *(để tính "khách nằm ở stage này bao lâu rồi")* |
| **FinancialStatement** | Số liệu BCTC theo năm/quý | customer_id, period, revenue, cogs, net_income, ebit, ebitda, interest_expense, total_assets, total_liabilities, total_equity, current_assets, current_liabilities, inventory, receivables, payables, cfo, total_debt, cash |
| **FinancialRatio** | Ratio tính toán (derived) | Tính từ FinancialStatement, có thể cache lại |
| **RedFlag** | Cảnh báo rủi ro | customer_id, period, rule_triggered, severity, description |

**Quan hệ:** 1 Customer → nhiều Contact, nhiều Note, nhiều Task, nhiều FinancialStatement (theo từng năm), nhiều RedFlag. Pipeline stage là 1 field trên Customer + có bảng lịch sử để track thời gian.

---

## 3. Spec chi tiết 4 module

### 3.1 Dashboard
**Widget bắt buộc ở MVP:**
- **Follow-up hôm nay** — list các Customer có `next_action_date` = hôm nay hoặc quá hạn (đỏ nếu quá hạn)
- **Task/meeting/call hôm nay** — gộp từ bảng Task có due_date = hôm nay
- **Pipeline tổng quan** — đếm số lượng khách theo từng stage (dạng funnel bar đơn giản)
- **Khách đang pending** — định nghĩa "pending" = không có Note/Task nào mới trong N ngày (N để RM tự chỉnh, mặc định gợi ý 7 hoặc 14 ngày) → liệt kê để nhắc RM đừng bỏ quên khách

> Toàn bộ dashboard chỉ là **query tổng hợp** từ Note/Task/Customer, không cần logic phức tạp.

### 3.2 Customers
- **Profile**: thông tin DN (ngành, doanh thu, nhu cầu vay, ngân hàng đang dùng), danh sách Contact
- **Notes + Timeline**: mỗi lần gọi/gặp → thêm 1 Note; hiển thị dạng timeline (mới nhất trên đầu), gộp chung với Task và lịch sử đổi stage → **thành 1 activity feed duy nhất cho khách đó**
- **Next action**: mỗi Note có field tuỳ chọn "Next action + ngày" — RM tự nhập tay (vì MVP không AI, hệ thống *không* tự đọc nội dung note để suy luận). Field này là nguồn cho widget "Follow-up hôm nay" ở Dashboard.

### 3.3 Pipeline (Kanban)
- 7 cột cố định: **Lead → Contacted → Qualified → Meeting → Credit → Approved → Disbursed**
- Kéo thả card giữa cột = update field `stage` + ghi 1 dòng vào `PipelineStageHistory`
- **Stage-triggered checklist** (rule-based, không phải AI): khi kéo khách vào cột **Credit**, hệ thống tự tạo sẵn 1 bộ Task mẫu:
  - Xin BCTC
  - Xin dư nợ
  - Kiểm tra TSBĐ
  - Chuẩn bị phương án hạn mức

  → Đây chính là cơ chế đứng sau ví dụ workflow bạn mô tả. Đơn giản là "nếu stage = Credit thì insert 4 task mẫu", không cần AI.

### 3.4 Credit Analysis
- **Input**: nhập tay hoặc upload file BCTC (nhiều năm) — gợi ý MVP nên bắt đầu bằng **form nhập tay** hoặc **upload Excel theo template cố định** (parse Excel dễ hơn nhiều so với đọc PDF tự do, nên để "upload PDF bất kỳ + tự trích số" vào Phase 2)
- **Ratio tự tính** (rule-based, công thức chuẩn kế toán/tín dụng — không phải AI):

| Nhóm | Ratio | Công thức |
|---|---|---|
| Tăng trưởng | Revenue growth, Net income growth | (Kỳ này - Kỳ trước) / Kỳ trước |
| Thanh khoản | Current ratio, Quick ratio | Current Assets / Current Liabilities |
| Đòn bẩy | Debt/Equity, Debt/EBITDA | Total Debt / Equity hoặc EBITDA |
| Khả năng trả lãi | Interest coverage | EBIT / Interest Expense |
| Dòng tiền | CFO/Net income, DSCR | CFO / Net Income; CFO / (Lãi + Gốc đến hạn) |
| Hiệu quả vận hành (quan trọng với ngành phân phối) | Receivable days, Inventory days, Payable days | Số dư × 365 / Doanh thu (hoặc COGS) |

- **Red flag rule engine** (if-then đơn giản, có ngưỡng RM tự chỉnh được):
  - Debt growth > Revenue growth × 1.5 lần → cảnh báo đòn bẩy tăng nhanh hơn quy mô
  - Net income dương nhưng CFO âm/giảm mạnh → cảnh báo chất lượng lợi nhuận (nghi công nợ phải thu tăng, ghi nhận DT sớm)
  - Current ratio < 1 hoặc giảm liên tục → cảnh báo thanh khoản
  - Interest coverage < 2x → cảnh báo khả năng trả lãi
  - Receivable days tăng đột biến → cảnh báo thu hồi công nợ chậm
- **Chart**: line/bar chart hiển thị xu hướng multi-year cho từng nhóm ratio
- **Output**: danh sách Red Flag kèm mức độ (low/medium/high) gắn ngay trên profile khách

---

## 4. Luồng nghiệp vụ mẫu — map ví dụ Công ty ABC vào hệ thống

1. Tạo **Customer** "Công ty ABC" — industry: Phân phối, revenue: 80 tỷ, credit_need: VLĐ 5 tỷ, current_banks: [BIDV] — stage mặc định: **Lead**
2. Gọi khách → thêm **Note**: nội dung ghi lại, tick `next_action_type = Follow-up`, `next_action_date = 04/09` → tự hiện trên Dashboard đúng ngày đó
3. Sau khi gặp → thêm **Note** mới, kéo card sang stage **Meeting** rồi **Credit** → hệ thống tự sinh 4 **Task**: Xin BCTC / Xin dư nợ / Kiểm tra TSBĐ / Chuẩn bị phương án hạn mức
4. Có BCTC → vào profile khách → tab **Credit Analysis** → nhập/upload số liệu → hệ thống tính ratio, vẽ chart, list red flag
5. RM tiếp tục kéo thả qua **Approved → Disbursed** khi hồ sơ hoàn tất

Toàn bộ 5 bước trên chỉ chạm vào **1 bảng Customer** và các bảng con liên kết — không có module nào tách rời.

---

## 5. Đề xuất công nghệ (Tech Stack)

Vì đây là tool cá nhân, MVP-first, không cần enterprise stack (không microservices, không Kubernetes):

| Layer | Đề xuất | Lý do |
|---|---|---|
| Frontend | Next.js (React) + TailwindCSS + shadcn/ui | Dựng UI kiểu Linear/Notion nhanh, có sẵn component đẹp |
| Backend/API | Next.js API routes (gộp chung với frontend) | Giảm số hệ thống cần quản lý ở giai đoạn 1 người dùng |
| Database | PostgreSQL (qua Supabase) | Dữ liệu quan hệ rõ ràng (Customer–Note–Task–BCTC), Supabase có sẵn Auth + Storage, free tier đủ MVP |
| File storage | Supabase Storage | Lưu file Excel/PDF BCTC upload |
| Auth | Supabase Auth (email/password) | Dù 1 user nhưng vẫn cần login vì dữ liệu nhạy cảm |
| Kéo thả Kanban | dnd-kit | Thư viện drag-drop nhẹ, phổ biến cho React |
| Chart | Recharts | Đủ dùng cho line/bar chart ratio |
| Hosting | Vercel (app) + Supabase (DB/storage) | Deploy nhanh, chi phí gần như 0 ở MVP |

---

## 6. Bảo mật & rủi ro cần lưu ý

⚠️ Đây là điểm CTO nên cân nhắc sớm: app sẽ chứa **dữ liệu khách hàng ngân hàng thật** (doanh thu, dư nợ, BCTC) — thuộc loại thông tin nhạy cảm/bảo mật nội bộ. Trước khi đưa dữ liệu thật lên:
- Kiểm tra chính sách nội bộ ngân hàng về việc dùng công cụ cá nhân/third-party cloud để lưu dữ liệu khách hàng
- Mã hoá dữ liệu at-rest, giới hạn quyền truy cập (login bắt buộc dù chỉ 1 user)
- Có cơ chế export/backup dữ liệu định kỳ, tránh phụ thuộc hoàn toàn vào 1 nhà cung cấp

---

## 7. MVP Scope vs Backlog (để tránh scope creep)

**MVP (bắt buộc để dùng được):**
- Customer CRUD + profile đầy đủ field
- Notes + next action (nhập tay)
- Pipeline Kanban 7 stage, kéo thả, stage-triggered checklist
- Task quản lý (manual + auto-từ-template)
- Dashboard: follow-up hôm nay, task hôm nay, pipeline overview, khách pending
- Credit Analysis: nhập tay/upload Excel theo template, tính ratio, chart, red-flag rule-based

**Backlog — chỉ làm sau khi đã dùng MVP thật:**
- AI đọc BCTC từ PDF scan tự động (OCR)
- AI gợi ý next action từ nội dung note (NLP)
- Đồng bộ email/calendar
- Multi-user, dashboard cấp quản lý
- Push notification nhắc việc
- Export báo cáo PDF cho hồ sơ tín dụng
- Benchmark ratio theo ngành

---

## 8. Chia module cho team (để CTO breakdown)

| Module | Nội dung | Team phù hợp | Effort ước tính |
|---|---|---|---|
| M1 | Data model + Backend API + Auth | Backend | M |
| M2 | Customer profile + Notes/Task (FE+BE) | Fullstack | M |
| M3 | Pipeline Kanban (drag-drop + stage logic) | Frontend | M |
| M4 | Dashboard (query tổng hợp + widget UI) | Fullstack | S–M |
| M5 | Credit Analysis (input/upload, ratio engine, chart, rule engine) | Fullstack (cần hiểu tài chính cơ bản) | L |
| M6 | DevOps (hosting, CI/CD, backup) | DevOps | S |

**Gợi ý timeline MVP (~6-8 tuần):**
- Tuần 1–2: M1 (data model, auth) + M2 (customer CRUD)
- Tuần 3–4: M3 (pipeline) + M4 (dashboard)
- Tuần 5–6: M5 (credit analysis) — module nặng nhất
- Tuần 7–8: polish UI, test, deploy, RM bắt đầu dùng thật

---

## 9. Câu hỏi cần chốt trước khi code

- "Pending" = bao nhiêu ngày không hoạt động? (mặc định đề xuất 7 hoặc 14 ngày, cho phép chỉnh)
- BCTC: nhập tay, upload Excel theo template, hay upload PDF tự do ngay từ MVP? (ảnh hưởng lớn đến effort M5 — nên **bắt đầu nhập tay hoặc Excel template**, để PDF tự do vào Phase 2)
- Dữ liệu khách thật lưu trên cloud third-party (Supabase) có được chấp thuận không, hay cần server nội bộ?
- 7 stage pipeline có cố định hay cần cho phép tuỳ biến sau này?
- Ngưỡng cảnh báo red-flag (vd: debt growth > revenue growth bao nhiêu %) — dùng số mặc định theo chuẩn ngành hay để RM tự set?

---

*Bước tiếp theo gợi ý: sau khi CTO review xong phần data model (mục 2) và tech stack (mục 5), có thể bóc tách mục 8 thành user story chi tiết cho từng module để giao việc.*
