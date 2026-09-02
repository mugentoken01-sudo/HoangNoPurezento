"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getDashboardSummary } from "@/lib/api-client";
import { DASHBOARD_TIMEZONE, DEFAULT_THRESHOLD_DAYS, normalizeThreshold, todayStrInTZ } from "@/lib/dashboard";
import type { DashboardSummary } from "@/lib/dashboard";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { t, formatDate, formatDateTime, dict } = useI18n();
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD_DAYS);
  const [custom, setCustom] = useState<string>(String(DEFAULT_THRESHOLD_DAYS));
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSummary = useCallback(async (tDays: number) => {
    const gen = ++genRef.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    setStale(!!data);
    try {
      const res = await getDashboardSummary(tDays, ac.signal);
      if (gen !== genRef.current) return;
      setData(res);
      setStale(false);
      setError(null);
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === "AbortError") return;
      if (gen !== genRef.current) return;
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? t("common.error");
      if (!data) setError(msg);
      else setStale(true);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, [data, t]);

  useEffect(() => {
    fetchSummary(threshold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threshold]);

  const todayStr = todayStrInTZ(DASHBOARD_TIMEZONE, new Date());
  const pipelineErrors = data?.errors?.filter(e => e.widget === "pipeline") ?? [];
  const followErrors = data?.errors?.filter(e => e.widget.startsWith("follow")) ?? [];
  const todayErrors = data?.errors?.filter(e => e.widget.startsWith("today")) ?? [];
  const pendingErrors = data?.errors?.filter(e => e.widget.startsWith("pending")) ?? [];

  const onThresholdChange = (v: string) => {
    if (v === "custom") return;
    const n = normalizeThreshold(v);
    setThreshold(n);
    setCustom(String(n));
  };

  const onCustomApply = () => {
    const n = normalizeThreshold(custom);
    setThreshold(n);
    setCustom(String(n));
  };

  return (
    <div className="space-y-6">
      {/* Hallmark Header Banner */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-700 uppercase">
              {t("dashboard.badge")}
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-slate-600">
              {t("dashboard.subtitle")}{" "}
              <span className="font-mono text-xs rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 font-medium">
                {DASHBOARD_TIMEZONE}
              </span>
              . {t("dashboard.due_today")}: <span className="font-semibold text-slate-800">{todayStr}</span> · {t("dashboard.threshold_label")}{" "}
              <span className="font-semibold text-slate-800">{threshold}d</span>
              {data?.generated_at && (
                <span className="text-slate-400"> · {formatDateTime(data.generated_at)}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchSummary(threshold)}
              disabled={loading}
              className="text-xs font-semibold shadow-xs"
            >
              {loading ? t("common.refreshing") : t("common.refresh")}
            </Button>
          </div>
        </div>

        {/* Threshold filter control strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4 text-xs">
          <span className="font-medium text-slate-700">{t("dashboard.threshold_label")}</span>
          <select
            aria-label="Pending threshold"
            value={String(threshold) === custom ? String(threshold) : String(threshold)}
            onChange={(e) => onThresholdChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
          >
            <option value="7">{t("dashboard.threshold_7d")}</option>
            <option value="14">{t("dashboard.threshold_14d")}</option>
            <option value="30">{t("dashboard.threshold_30d")}</option>
            <option value="custom">{t("dashboard.threshold_custom")}</option>
          </select>
          <input
            aria-label="Custom threshold days"
            type="number"
            min={1}
            max={365}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-20 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none font-mono"
          />
          <Button variant="secondary" size="sm" className="h-7 text-xs" onClick={onCustomApply}>
            {t("dashboard.threshold_apply")}
          </Button>
          <span className="text-[11px] text-slate-400">
            {t("dashboard.threshold_hint", { tz: DASHBOARD_TIMEZONE })}
          </span>
        </div>
      </div>

      {error && (
        <Card>
          <CardBody className="border-l-4 border-red-500 bg-red-50/50 p-4">
            <p role="alert" className="text-xs font-semibold text-red-700">
              {error}
            </p>
            <Button variant="secondary" size="sm" className="mt-2 text-xs" onClick={() => fetchSummary(threshold)}>
              {t("common.retry")}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* 4 Operations Widgets Grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Widget 1: Follow-up today */}
        <WidgetCard
          title={t("dashboard.follow_ups_title")}
          count={data?.follow_ups.length}
          loading={loading && !data}
          error={followErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
          empty={!!data && data.follow_ups.length === 0}
        >
          {!data ? null : data.follow_ups.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              {t("dashboard.follow_ups_empty")}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.follow_ups.slice(0, 20).map((r) => (
                <li
                  key={r.note_id}
                  className={`rounded-lg border p-3 transition-colors ${
                    r.overdue ? "bg-amber-50/70 border-amber-200/90" : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          r.overdue
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : "bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span aria-hidden="true">{r.overdue ? "⚠" : "•"}</span>{" "}
                        {r.overdue ? t("dashboard.overdue") : t("dashboard.due_today")}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {formatDate(r.next_action_date)}
                      </span>
                    </div>
                    {r.next_action_type && <Badge value={r.next_action_type} />}
                  </div>
                  <Link
                    href={`/customers/${r.customer_id}`}
                    className="mt-1.5 block text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline"
                  >
                    {r.company_name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {r.content}
                  </p>
                </li>
              ))}
              {data.follow_ups.length > 20 && (
                <li className="text-[11px] text-slate-400 text-center pt-1">
                  {t("dashboard.follow_ups_showing", { count: data.follow_ups.length })}
                </li>
              )}
            </ul>
          )}
        </WidgetCard>

        {/* Widget 2: Tasks today */}
        <WidgetCard
          title={t("dashboard.today_tasks_title")}
          count={data?.today_tasks.length}
          loading={loading && !data}
          error={todayErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
          empty={!!data && data.today_tasks.length === 0}
        >
          {!data ? null : data.today_tasks.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              {t("dashboard.today_tasks_empty")}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.today_tasks.slice(0, 20).map((r) => (
                <li
                  key={r.task_id}
                  className={`rounded-lg border p-3 transition-colors ${
                    r.overdue ? "bg-rose-50/70 border-rose-200/90" : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          r.overdue
                            ? "bg-rose-100 border-rose-300 text-rose-800"
                            : "bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        {r.overdue ? t("dashboard.overdue") : t("dashboard.due_today")}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{formatDate(r.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge value={r.status} />
                      <Badge value={r.source} label={r.source === "auto_template" ? "Auto" : "Manual"} showDot={false} />
                    </div>
                  </div>
                  <Link
                    href={`/customers/${r.customer_id}`}
                    className="mt-1.5 block text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline"
                  >
                    {r.company_name}{" "}
                    <span className="font-normal text-slate-600">· {r.title}</span>
                  </Link>
                </li>
              ))}
              {data.today_tasks.length > 20 && (
                <li className="text-[11px] text-slate-400 text-center pt-1">
                  {t("dashboard.follow_ups_showing", { count: data.today_tasks.length })}
                </li>
              )}
            </ul>
          )}
        </WidgetCard>

        {/* Widget 3: Pipeline overview */}
        <WidgetCard
          title={t("dashboard.pipeline_overview_title")}
          loading={loading && !data}
          error={pipelineErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
        >
          {!data ? null : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {PIPELINE_STAGES.map((s) => {
                  const count = data.pipeline.find((p) => p.stage === s)?.count ?? 0;
                  const localizedStage = dict.stages[s] ?? s;
                  return (
                    <Link
                      key={s}
                      href={`/customers?stage=${s}`}
                      aria-label={`${localizedStage} — ${count}`}
                      className="group rounded-lg border border-slate-200/90 bg-white p-2.5 text-center transition-all hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <div className="text-[10px] font-bold tracking-tight text-slate-500 uppercase group-hover:text-blue-700 truncate" title={localizedStage}>
                        {localizedStage}
                      </div>
                      <div className="mt-1 text-lg font-bold tabular-nums text-slate-900 group-hover:text-blue-700">
                        {count}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href="/pipeline"
                  className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition"
                >
                  {t("dashboard.pipeline_open_button")}
                </Link>
                <Link
                  href="/customers"
                  className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                >
                  {t("dashboard.pipeline_all_customers")}
                </Link>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                {t("dashboard.pipeline_footnote")}
              </p>
            </div>
          )}
        </WidgetCard>

        {/* Widget 4: Pending customers */}
        <WidgetCard
          title={t("dashboard.pending_customers_title", { threshold })}
          count={data?.pending_customers.length}
          loading={loading && !data}
          error={pendingErrors[0]?.message ?? null}
          onRetry={() => fetchSummary(threshold)}
          stale={stale}
          empty={!!data && data.pending_customers.length === 0}
        >
          {!data ? null : data.pending_customers.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              {t("dashboard.pending_customers_empty", { threshold })}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {data.pending_customers.slice(0, 20).map((r) => (
                <li key={r.customer_id} className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/customers/${r.customer_id}`}
                      className="text-sm font-bold text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {r.company_name}
                    </Link>
                    <Badge value={r.stage} />
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500">
                    {r.last_activity_at ? (
                      <>
                        {t("dashboard.last_activity")}{" "}
                        <span className="font-semibold text-slate-700">{r.last_activity_type}</span> ·{" "}
                        {formatDateTime(r.last_activity_at)} ·{" "}
                        <span className="font-bold text-slate-800 font-mono">
                          {r.inactive_days} {t("common.days_ago")}
                        </span>
                      </>
                    ) : (
                      <>
                        {t("dashboard.no_activity_yet")} ·{" "}
                        <span className="font-bold text-slate-800 font-mono">
                          {r.inactive_days} {t("common.days_since")}
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
              {data.pending_customers.length > 20 && (
                <li className="text-[11px] text-slate-400 text-center pt-1">
                  {t("dashboard.follow_ups_showing", { count: data.pending_customers.length })}
                </li>
              )}
            </ul>
          )}
        </WidgetCard>
      </div>

      {data?.errors && data.errors.length > 0 && (
        <Card>
          <CardBody className="border-l-4 border-amber-500 bg-amber-50/50 p-4">
            <p className="text-xs font-semibold text-amber-900">
              {t("dashboard.partial_data_warning")}
            </p>
            <ul className="mt-1.5 list-disc pl-5 text-xs text-amber-800 space-y-0.5">
              {data.errors.map((e, i) => (
                <li key={i}>
                  <span className="font-semibold">{e.widget}</span>: {e.message}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <p className="text-center text-[11px] text-slate-400 leading-relaxed max-w-xl mx-auto">
        {t("dashboard.footer_info", { threshold })}
      </p>
    </div>
  );
}
