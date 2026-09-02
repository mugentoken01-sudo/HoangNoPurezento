"use client";
import React from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

export function WidgetCard({
  title,
  count,
  children,
  loading,
  error,
  empty,
  onRetry,
  stale,
  action,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  stale?: boolean;
  action?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <Card className="flex flex-col border border-slate-200/90 shadow-sm transition-all duration-150">
      <CardHeader className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-5 py-3.5">
        <h3 className="text-sm font-semibold tracking-tight text-slate-900 flex items-center gap-2">
          {title}
          {typeof count === "number" && (
            <span
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700 shadow-xs"
              aria-label={`${count} items`}
            >
              {count}
            </span>
          )}
          {stale && (
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
              {t("common.stale")}
            </span>
          )}
        </h3>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardBody className="flex-1 p-5">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            <p className="font-semibold">{t("common.error")}: {error}</p>
            {onRetry && (
              <Button variant="secondary" size="sm" className="mt-2.5 text-xs" onClick={onRetry}>
                {t("common.retry")}
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
}
