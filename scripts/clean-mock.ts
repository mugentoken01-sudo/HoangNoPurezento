// Xóa toàn bộ mock data đã seed — chạy 1 lần sau khi xóa code mock
// Yêu cầu: .env.local có NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (hoặc SUPABASE_SERVICE_ROLE_KEY)
// Chạy: ! npx tsx --env-file=.env.local scripts/clean-mock.ts
// Hoặc: ! npm run clean:mock  (sau khi thêm script)

try { (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.(".env.local"); } catch {}

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";

if (!url || !key || key.includes("REPLACE_WITH") || key.includes("••••")) {
  console.error("Thiếu URL/key — điền SUPABASE_SECRET_KEY đầy đủ vào .env.local (Dashboard → API Keys → Reveal)");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("── Clean mock data ──");

  // Tìm tất cả customer tên "Công ty ABC" (mock chính)
  const { data: mocks } = await admin.from("customers").select("id, company_name").eq("company_name", "Công ty ABC");
  const ids = (mocks ?? []).map(r => r.id);

  if (ids.length === 0) {
    console.log("Không tìm thấy customer 'Công ty ABC' — DB đã sạch mock (hoặc chưa từng seed).");
  } else {
    console.log(`Tìm thấy ${ids.length} mock customer(s):`, ids);
    // Nhờ FK on delete cascade, xóa customers sẽ kéo theo contacts/notes/tasks/pipeline_stage_history/financial_statements/ratios/red_flags
    const { error } = await admin.from("customers").delete().in("id", ids);
    if (error) throw error;
    console.log(`✓ Đã xóa ${ids.length} customer 'Công ty ABC' + toàn bộ dữ liệu liên quan (cascade)`);
  }

  // Dọn thêm nếu có red_flag/statement nào còn sót với period mẫu (phòng khi customer đã bị xóa tay trước đó)
  const { count: orphanFlags } = await admin.from("red_flags").select("id", { count: "exact", head: true }).eq("period", "2023");
  console.log(`Red flags period=2023 còn lại: ${orphanFlags ?? 0} (0 là sạch)`);

  // Xóa user seed rm@demo.local nếu bạn muốn DB trắng hoàn toàn — mặc định KHÔNG xóa để tránh mất tài khoản test
  // Bỏ comment 3 dòng dưới nếu muốn xóa luôn user mock:
  // const { data: users } = await admin.auth.admin.listUsers();
  // const mockUser = users.users.find(u => u.email === "rm@demo.local");
  // if (mockUser) { await admin.auth.admin.deleteUser(mockUser.id); console.log("✓ Đã xóa user rm@demo.local"); }

  console.log("\nXong. DB sạch mock — chỉ còn data do bạn tạo qua UI.");
}

main().catch(e => { console.error(e); process.exit(1); });
