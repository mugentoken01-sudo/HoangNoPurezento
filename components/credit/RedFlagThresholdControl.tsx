"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import { loadThresholds, saveThresholds, normalizeThresholds, DEFAULT_THRESHOLDS, type RedFlagThresholds } from "@/lib/red-flag-thresholds";

export function RedFlagThresholdControl({ onChanged }: { onChanged?: (t: RedFlagThresholds) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<RedFlagThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => { setV(loadThresholds()); }, []);

  function set<K extends keyof RedFlagThresholds>(key: K, raw: string) {
    const n = Number(raw);
    setV(prev => ({ ...prev, [key]: Number.isFinite(n) ? n : prev[key] }));
  }

  function save() {
    const normalized = normalizeThresholds(v);
    setV(normalized);
    saveThresholds(normalized);
    onChanged?.(normalized);
    setOpen(false);
  }
  function reset() {
    saveThresholds(DEFAULT_THRESHOLDS);
    setV(DEFAULT_THRESHOLDS);
    onChanged?.(DEFAULT_THRESHOLDS);
  }

  return (
    <div className="rounded-lg border bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-zinc-50"
      >
        <span>Red-flag thresholds <span className="font-normal text-zinc-500">— RM chỉnh được như pending threshold</span></span>
        <span className="text-xs text-zinc-400">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="border-t px-3 py-3 space-y-3">
          <p className="text-xs text-zinc-500">Điều chỉnh ngưỡng rule engine — lưu ở trình duyệt (localStorage), gửi kèm khi tạo/sửa BCTC để server tính lại flag với ngưỡng mới. Mặc định giống spec gốc.</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Debt × revenue" hint="debt_growth > revenue × X (mặc định 1.5)">
              <Input type="number" step={0.1} value={String(v.debtGrowthMultiplier)} onChange={e => set("debtGrowthMultiplier", e.target.value)} />
            </FormField>
            <FormField label="Interest coverage <" hint="coverage < X (mặc định 2)">
              <Input type="number" step={0.1} value={String(v.interestCoverageLow)} onChange={e => set("interestCoverageLow", e.target.value)} />
            </FormField>
            <FormField label="Current ratio critical <" hint="high nếu < X (mặc định 1)">
              <Input type="number" step={0.1} value={String(v.currentRatioCritical)} onChange={e => set("currentRatioCritical", e.target.value)} />
            </FormField>
            <FormField label="Current ratio low <" hint="medium nếu < X (mặc định 1.2)">
              <Input type="number" step={0.1} value={String(v.currentRatioLow)} onChange={e => set("currentRatioLow", e.target.value)} />
            </FormField>
            <FormField label="Receivable spike >" hint="tăng > X (0.30 = 30%)">
              <Input type="number" step={0.05} value={String(v.receivableSpike)} onChange={e => set("receivableSpike", e.target.value)} />
            </FormField>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}>Save</Button>
            <Button size="sm" variant="secondary" onClick={reset}>Reset defaults</Button>
          </div>
        </div>
      )}
    </div>
  );
}
