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
    <Card className="flex flex-col border border-[#dfd8c8] bg-[#ffffff] shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)]">
      <CardHeader className="flex items-center justify-between gap-2 border-b border-[#eee8db] bg-[#faf8f3]/80 px-5 py-4">
        <h3 className="text-sm font-serif font-bold tracking-tight text-[#182615] flex items-center gap-2">
          <span>{title}</span>
          {typeof count === "number" && (
            <span
              className="inline-flex items-center rounded-full border border-[#d4ccb8] bg-[#f2efe6] px-2.5 py-0.5 text-xs font-mono font-bold text-[#2d3e29]"
              aria-label={`${count} items`}
            >
              {count}
            </span>
          )}
          {stale && (
            <span className="rounded-full border border-[#f2dcba] bg-[#fdf5e6] px-2 py-0.5 text-[10px] font-mono text-[#965a12]">
              {t("common.stale")}
            </span>
          )}
        </h3>
        {action && <div>{action}</div>}
      </CardHeader>
      <CardBody className="flex-1 p-5">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading">
            <div className="h-4 w-3/4 animate-pulse rounded bg-[#eee8db]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[#eee8db]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#f5f1e8]" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-[#f0c7be] bg-[#faedea] p-4 text-xs text-[#a13d28]">
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
