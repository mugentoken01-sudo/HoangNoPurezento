"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Botanical Hero Card */}
      <section
        aria-labelledby="hero-heading"
        className="rounded-3xl border border-[#dfd8c8] bg-[#ffffff] p-6 sm:p-10 shadow-[0_16px_40px_-18px_rgba(24,38,21,0.1),0_1px_3px_rgba(24,38,21,0.04)]"
      >
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-3.5 py-1 text-[11px] font-mono font-bold text-[#4a5944] uppercase tracking-wider">
            <span aria-hidden="true">🌿</span> Hallmark Botanical Edition · Garden
          </span>
          <h1 id="hero-heading" className="mt-4 text-2xl sm:text-4xl font-serif font-bold tracking-tight text-[#182615] leading-tight">
            {t("common.app_title")}
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#576750]">
            {t("common.app_subtitle")} — Hệ thống quản lý toàn diện quan hệ khách hàng doanh nghiệp, theo dõi phễu pipeline 7 giai đoạn, phân tích báo cáo tài chính và giám sát cảnh báo rủi ro tín dụng.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-[#265e2b] px-6 py-3 text-xs sm:text-sm font-bold text-[#faf8f2] shadow-sm hover:bg-[#1d4821] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 transition active:scale-[0.98]"
            >
              <span className="mr-1.5" aria-hidden="true">📊</span> {t("nav.dashboard")} →
            </Link>
            <Link
              href="/customers"
              className="inline-flex items-center justify-center rounded-full border border-[#dfd8c8] bg-[#ffffff] px-6 py-3 text-xs sm:text-sm font-bold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 transition active:scale-[0.98]"
            >
              <span className="mr-1.5" aria-hidden="true">🏢</span> {t("nav.customers")}
            </Link>
            <Link
              href="/pipeline"
              className="inline-flex items-center justify-center rounded-full border border-[#dfd8c8] bg-[#ffffff] px-6 py-3 text-xs sm:text-sm font-bold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 transition active:scale-[0.98]"
            >
              <span className="mr-1.5" aria-hidden="true">🎯</span> {t("nav.pipeline")}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard"
          className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs hover:border-[#bcc6b1] hover:shadow-[0_12px_30px_-15px_rgba(24,38,21,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2efe6] text-xl mb-4 group-hover:scale-105 transition-transform" aria-hidden="true">
            📊
          </div>
          <h2 className="text-base font-serif font-bold text-[#182615] group-hover:text-[#265e2b] transition-colors">
            {t("nav.dashboard")}
          </h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#576750]">
            Theo dõi 4 widget vận hành: Follow-up hôm nay, Nhiệm vụ đến hạn, Phễu pipeline và Khách hàng tồn đọng.
          </p>
        </Link>

        <Link
          href="/customers"
          className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs hover:border-[#bcc6b1] hover:shadow-[0_12px_30px_-15px_rgba(24,38,21,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2efe6] text-xl mb-4 group-hover:scale-105 transition-transform" aria-hidden="true">
            🏢
          </div>
          <h2 className="text-base font-serif font-bold text-[#182615] group-hover:text-[#265e2b] transition-colors">
            {t("nav.customers")}
          </h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#576750]">
            Hồ sơ 360° khách hàng doanh nghiệp, người liên hệ, ghi chú cuộc gọi, checklist thẩm định và BCTC.
          </p>
        </Link>

        <Link
          href="/pipeline"
          className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 shadow-2xs hover:border-[#bcc6b1] hover:shadow-[0_12px_30px_-15px_rgba(24,38,21,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 transition-all group sm:col-span-2 lg:col-span-1"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f2efe6] text-xl mb-4 group-hover:scale-105 transition-transform" aria-hidden="true">
            🎯
          </div>
          <h2 className="text-base font-serif font-bold text-[#182615] group-hover:text-[#265e2b] transition-colors">
            {t("nav.pipeline")}
          </h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#576750]">
            Bảng Kanban 7 giai đoạn tương tác mượt mà, hỗ trợ kéo thả và tự động sinh checklist thẩm định tín dụng.
          </p>
        </Link>
      </div>
    </div>
  );
}

