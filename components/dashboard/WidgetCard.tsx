"use client";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function WidgetCard({
  title,
  count,
  children,
  loading,
  error,
  empty,
  onRetry,
  stale,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  stale?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
          {title}
          {typeof count === "number" && (
            <span className="rounded-full border bg-zinc-50 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-600" aria-label={`${count} items`}>
              {count}
            </span>
          )}
          {stale && <span className="rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[11px] text-amber-800">stale</span>}
        </h3>
      </CardHeader>
      <CardBody className="flex-1">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading">
            <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>Failed to load {title.toLowerCase()}: {error}</p>
            {onRetry && <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>Retry</Button>}
          </div>
        ) : empty ? (
          children
        ) : (
          children
        )}
      </CardBody>
    </Card>
  );
}
