"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="space-y-8">
      {/* Garden Hero Card */}
      <div className="rounded-3xl border border-[#dfd8c8] bg-[#ffffff] p-8 sm:p-10 shadow-[0_16px_40px_-18px_rgba(24,38,21,0.1),0_1px_3px_rgba(24,38,21,0.04)]">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-3.5 py-1 text-[11px] font-mono font-bold text-[#4a5944] uppercase tracking-wider">
            🌿 Hallmark Botanical Edition · Garden
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#182615]">
            {t("common.app_title")}
          </h1>
          <p className="mt-2.5 text-base leading-relaxed text-[#576750]">
            {t("common.app_subtitle")} — Hệ thống quản lý toàn diện quan hệ khách hàng doanh nghiệp, theo dõi phễu pipeline 7 giai đoạn, phân tích báo cáo tài chính và giám sát cảnh báo rủi ro tín dụng.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <Link
              href="/dashboard"
              className="rounded-full bg-[#265e2b] px-6 py-3 text-xs font-bold text-[#faf8f2] shadow-sm hover:bg-[#1d4821] transition"
            >
              📊 {t("nav.dashboard")} →
            </Link>
            <Link
              href="/customers"
              className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-6 py-3 text-xs font-bold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] transition"
            >
              🏢 {t("nav.customers")}
            </Link>
            <Link
              href="/pipeline"
              className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-6 py-3 text-xs font-bold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] transition"
            >
              🎯 {t("nav.pipeline")}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link
          href="/dashboard"
          className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs hover:border-[#bcc6b1] hover:shadow-[0_12px_30px_-15px_rgba(24,38,21,0.12)] transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2efe6] text-xl mb-4 group-hover:scale-105 transition-transform">
            📊
          </div>
          <h3 className="text-base font-serif font-bold text-[#182615] group-hover:text-[#265e2b] transition-colors">
            {t("nav.dashboard")}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#576750]">
            Theo dõi 4 widget vận hành: Follow-up hôm nay, Nhiệm vụ đến hạn, Phễu pipeline và Khách hàng tồn đọng.
          </p>
        </Link>

        <Link
          href="/customers"
          className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs hover:border-[#bcc6b1] hover:shadow-[0_12px_30px_-15px_rgba(24,38,21,0.12)] transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2efe6] text-xl mb-4 group-hover:scale-105 transition-transform">
            🏢
          </div>
          <h3 className="text-base font-serif font-bold text-[#182615] group-hover:text-[#265e2b] transition-colors">
            {t("nav.customers")}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#576750]">
            Hồ sơ 360° khách hàng doanh nghiệp, người liên hệ, ghi chú cuộc gọi, checklist thẩm định và BCTC.
          </p>
        </Link>

        <Link
          href="/pipeline"
          className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs hover:border-[#bcc6b1] hover:shadow-[0_12px_30px_-15px_rgba(24,38,21,0.12)] transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2efe6] text-xl mb-4 group-hover:scale-105 transition-transform">
            🎯
          </div>
          <h3 className="text-base font-serif font-bold text-[#182615] group-hover:text-[#265e2b] transition-colors">
            {t("nav.pipeline")}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#576750]">
            Bảng Kanban 7 giai đoạn tương tác mượt mà, hỗ trợ kéo thả và tự động sinh checklist thẩm định tín dụng.
          </p>
        </Link>
      </div>
    </div>
  );
}
