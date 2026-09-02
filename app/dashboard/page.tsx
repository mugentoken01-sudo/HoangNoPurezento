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
      {/* Hallmark Garden Header Banner */}
      <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 sm:p-7 shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-3 py-0.5 text-[10px] font-mono font-bold tracking-wider text-[#4a5944] uppercase">
              🌿 {t("dashboard.badge")}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#182615]">
              {t("dashboard.title")}
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs sm:text-sm leading-relaxed text-[#576750]">
              {t("dashboard.subtitle")}{" "}
              <span className="font-mono text-xs rounded-md bg-[#f2efe6] border border-[#d4ccb8] px-1.5 py-0.5 text-[#2d3e29] font-medium">
                {DASHBOARD_TIMEZONE}
              </span>
              . {t("dashboard.due_today")}: <span className="font-semibold text-[#182615]">{todayStr}</span> · {t("dashboard.threshold_label")}{" "}
              <span className="font-semibold text-[#182615]">{threshold}d</span>
              {data?.generated_at && (
                <span className="text-[#7d8c76]"> · {formatDateTime(data.generated_at)}</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchSummary(threshold)}
              disabled={loading}
              className="text-xs font-semibold"
            >
              {loading ? t("common.refreshing") : t("common.refresh")}
            </Button>
          </div>
        </div>

        {/* Threshold filter control strip */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[#eee8db] pt-4 text-xs">
          <span className="font-semibold text-[#2d3e29]">{t("dashboard.threshold_label")}</span>
          <select
            aria-label="Pending threshold"
            value={String(threshold) === custom ? String(threshold) : String(threshold)}
            onChange={(e) => onThresholdChange(e.target.value)}
            className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3 py-1.5 text-xs text-[#182615] font-medium focus:border-[#265e2b] focus:outline-none"
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
            className="w-20 rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1.5 text-xs text-[#182615] font-medium focus:border-[#265e2b] focus:outline-none font-mono"
          />
          <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={onCustomApply}>
            {t("dashboard.threshold_apply")}
          </Button>
          <span className="text-[11px] text-[#7d8c76] font-mono">
            {t("dashboard.threshold_hint", { tz: DASHBOARD_TIMEZONE })}
          </span>
        </div>
      </div>

      {error && (
        <Card>
          <CardBody className="border-l-4 border-[#a13d28] bg-[#faedea] p-4">
            <p role="alert" className="text-xs font-semibold text-[#a13d28]">
              {error}
            </p>
            <Button variant="secondary" size="sm" className="mt-2 text-xs" onClick={() => fetchSummary(threshold)}>
              {t("common.retry")}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* 4 Operations Widgets Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
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
            <p className="text-xs leading-relaxed text-[#576750]">
              {t("dashboard.follow_ups_empty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.follow_ups.slice(0, 20).map((r) => (
                <li
                  key={r.note_id}
                  className={`rounded-xl border p-3.5 transition-all ${
                    r.overdue
                      ? "bg-[#fdf5e6] border-[#f2dcba] shadow-2xs"
                      : "bg-[#ffffff] border-[#dfd8c8] hover:border-[#bcc6b1]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          r.overdue
                            ? "bg-[#fdeed6] border-[#f2dcba] text-[#965a12]"
                            : "bg-[#f2efe6] border-[#d4ccb8] text-[#4a5944]"
                        }`}
                      >
                        <span aria-hidden="true">{r.overdue ? "⚠" : "•"}</span>{" "}
                        {r.overdue ? t("dashboard.overdue") : t("dashboard.due_today")}
                      </span>
                      <span className="text-xs text-[#576750] font-mono">
                        {formatDate(r.next_action_date)}
                      </span>
                    </div>
                    {r.next_action_type && <Badge value={r.next_action_type} />}
                  </div>
                  <Link
                    href={`/customers/${r.customer_id}`}
                    className="mt-2 block text-sm font-serif font-bold text-[#182615] hover:text-[#265e2b] hover:underline"
                  >
                    {r.company_name}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#41503b]">
                    {r.content}
                  </p>
                </li>
              ))}
              {data.follow_ups.length > 20 && (
                <li className="text-[11px] text-[#7d8c76] text-center pt-1 font-mono">
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
            <p className="text-xs leading-relaxed text-[#576750]">
              {t("dashboard.today_tasks_empty")}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.today_tasks.slice(0, 20).map((r) => (
                <li
                  key={r.task_id}
                  className={`rounded-xl border p-3.5 transition-all ${
                    r.overdue
                      ? "bg-[#faedea] border-[#f0c7be] shadow-2xs"
                      : "bg-[#ffffff] border-[#dfd8c8] hover:border-[#bcc6b1]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          r.overdue
                            ? "bg-[#faedea] border-[#f0c7be] text-[#a13d28]"
                            : "bg-[#f2efe6] border-[#d4ccb8] text-[#4a5944]"
                        }`}
                      >
                        {r.overdue ? t("dashboard.overdue") : t("dashboard.due_today")}
                      </span>
                      <span className="text-xs text-[#576750] font-mono">{formatDate(r.due_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge value={r.status} />
                      <Badge value={r.source} label={r.source === "auto_template" ? "Auto" : "Manual"} showDot={false} />
                    </div>
                  </div>
                  <Link
                    href={`/customers/${r.customer_id}`}
                    className="mt-2 block text-sm font-serif font-bold text-[#182615] hover:text-[#265e2b] hover:underline"
                  >
                    {r.company_name}{" "}
                    <span className="font-sans font-normal text-[#576750]">· {r.title}</span>
                  </Link>
                </li>
              ))}
              {data.today_tasks.length > 20 && (
                <li className="text-[11px] text-[#7d8c76] text-center pt-1 font-mono">
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
                      className="group rounded-xl border border-[#dfd8c8] bg-[#ffffff] p-2.5 text-center transition-all hover:border-[#265e2b] hover:bg-[#eaf1e8]/50 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b]"
                    >
                      <div className="text-[10px] font-bold tracking-tight text-[#576750] uppercase group-hover:text-[#265e2b] truncate font-mono" title={localizedStage}>
                        {localizedStage}
                      </div>
                      <div className="mt-1 text-lg font-serif font-bold tabular-nums text-[#182615] group-hover:text-[#265e2b]">
                        {count}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Link
                  href="/pipeline"
                  className="inline-flex items-center rounded-full bg-[#265e2b] px-4 py-2 text-xs font-semibold text-[#faf8f2] shadow-sm hover:bg-[#1d4821] transition"
                >
                  {t("dashboard.pipeline_open_button")}
                </Link>
                <Link
                  href="/customers"
                  className="inline-flex items-center rounded-full border border-[#dfd8c8] bg-[#ffffff] px-4 py-2 text-xs font-semibold text-[#2d3e29] shadow-2xs hover:bg-[#f5f1e8] transition"
                >
                  {t("dashboard.pipeline_all_customers")}
                </Link>
              </div>

              <p className="text-[11px] leading-relaxed text-[#7d8c76]">
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
            <p className="text-xs leading-relaxed text-[#576750]">
              {t("dashboard.pending_customers_empty", { threshold })}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.pending_customers.slice(0, 20).map((r) => (
                <li key={r.customer_id} className="rounded-xl border border-[#dfd8c8] bg-[#ffffff] p-3.5 shadow-2xs hover:border-[#bcc6b1] transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/customers/${r.customer_id}`}
                      className="text-sm font-serif font-bold text-[#182615] hover:text-[#265e2b] hover:underline"
                    >
                      {r.company_name}
                    </Link>
                    <Badge value={r.stage} />
                  </div>
                  <div className="mt-1.5 text-xs text-[#576750]">
                    {r.last_activity_at ? (
                      <>
                        {t("dashboard.last_activity")}{" "}
                        <span className="font-semibold text-[#2d3e29]">{r.last_activity_type}</span> ·{" "}
                        {formatDateTime(r.last_activity_at)} ·{" "}
                        <span className="font-bold text-[#182615] font-mono">
                          {r.inactive_days} {t("common.days_ago")}
                        </span>
                      </>
                    ) : (
                      <>
                        {t("dashboard.no_activity_yet")} ·{" "}
                        <span className="font-bold text-[#182615] font-mono">
                          {r.inactive_days} {t("common.days_since")}
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
              {data.pending_customers.length > 20 && (
                <li className="text-[11px] text-[#7d8c76] text-center pt-1 font-mono">
                  {t("dashboard.follow_ups_showing", { count: data.pending_customers.length })}
                </li>
              )}
            </ul>
          )}
        </WidgetCard>
      </div>

      {data?.errors && data.errors.length > 0 && (
        <Card>
          <CardBody className="border-l-4 border-[#b04e33] bg-[#fdf5e6] p-4">
            <p className="text-xs font-semibold text-[#965a12]">
              {t("dashboard.partial_data_warning")}
            </p>
            <ul className="mt-1.5 list-disc pl-5 text-xs text-[#965a12] space-y-0.5">
              {data.errors.map((e, i) => (
                <li key={i}>
                  <span className="font-semibold">{e.widget}</span>: {e.message}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <p className="text-center text-[11px] text-[#7d8c76] leading-relaxed max-w-xl mx-auto font-mono">
        {t("dashboard.footer_info", { threshold })}
      </p>
    </div>
  );
}
