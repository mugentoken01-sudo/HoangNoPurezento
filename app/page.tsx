"use client";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            Enterprise Banking Solution
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t("common.app_title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t("common.app_subtitle")} — Phân hệ quản lý toàn diện quan hệ khách hàng doanh nghiệp, theo dõi phễu pipeline 7 giai đoạn, phân tích báo cáo tài chính và giám sát cảnh báo rủi ro tín dụng.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
            >
              📊 {t("nav.dashboard")} →
            </Link>
            <Link
              href="/customers"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition"
            >
              🏢 {t("nav.customers")}
            </Link>
            <Link
              href="/pipeline"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 transition"
            >
              🎯 {t("nav.pipeline")}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800 text-lg mb-3">
            📊
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("nav.dashboard")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Theo dõi 4 widget vận hành: Follow-up hôm nay, Nhiệm vụ đến hạn, Phễu pipeline và Khách hàng tồn đọng.
          </p>
        </Link>

        <Link
          href="/customers"
          className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800 text-lg mb-3">
            🏢
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("nav.customers")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Hồ sơ 360° khách hàng doanh nghiệp, người liên hệ, ghi chú cuộc gọi, checklist thẩm định và BCTC.
          </p>
        </Link>

        <Link
          href="/pipeline"
          className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800 text-lg mb-3">
            🎯
          </div>
          <h3 className="text-sm font-bold text-slate-900">{t("nav.pipeline")}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Bảng Kanban 7 giai đoạn tương tác mượt mà, hỗ trợ kéo thả và tự động sinh checklist thẩm định tín dụng.
          </p>
        </Link>
      </div>
    </div>
  );
}
