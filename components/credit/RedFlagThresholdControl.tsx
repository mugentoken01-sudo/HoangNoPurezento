"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/FormField";
import {
  loadThresholds,
  saveThresholds,
  normalizeThresholds,
  DEFAULT_THRESHOLDS,
  type RedFlagThresholds,
} from "@/lib/red-flag-thresholds";
import { useI18n } from "@/lib/i18n";

export function RedFlagThresholdControl({
  onChanged,
}: {
  onChanged?: (t: RedFlagThresholds) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<RedFlagThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    setV(loadThresholds());
  }, []);

  function set<K extends keyof RedFlagThresholds>(key: K, raw: string) {
    const n = Number(raw);
    setV((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : prev[key] }));
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
    <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] shadow-2xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Cấu hình ngưỡng rủi ro / Toggle threshold settings"
        className="w-full flex items-center justify-between px-5 py-3.5 text-xs font-serif font-bold text-[#182615] hover:bg-[#faf8f3] transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">⚙️</span>
          <span>{t("credit.thresholds_title")}</span>
          <span className="font-sans font-normal text-[#576750] hidden sm:inline">
            — {t("credit.thresholds_desc")}
          </span>
        </div>
        <span className="text-xs text-[#7d8c76] font-mono">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-[#eee8db] bg-[#faf8f3]/80 p-5 space-y-4">
          <p className="text-xs text-[#576750] leading-relaxed">
            {t("credit.thresholds_desc")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <FormField label={t("credit.threshold_debt_growth")}>
              <Input
                type="number"
                step={0.1}
                value={String(v.debtGrowthMultiplier)}
                onChange={(e) => set("debtGrowthMultiplier", e.target.value)}
                className="bg-white font-mono text-xs"
              />
            </FormField>
            <FormField label={t("credit.threshold_ic_low")}>
              <Input
                type="number"
                step={0.1}
                value={String(v.interestCoverageLow)}
                onChange={(e) => set("interestCoverageLow", e.target.value)}
                className="bg-white font-mono text-xs"
              />
            </FormField>
            <FormField label={t("credit.threshold_cr_critical")}>
              <Input
                type="number"
                step={0.1}
                value={String(v.currentRatioCritical)}
                onChange={(e) => set("currentRatioCritical", e.target.value)}
                className="bg-white font-mono text-xs"
              />
            </FormField>
            <FormField label={t("credit.threshold_cr_low")}>
              <Input
                type="number"
                step={0.1}
                value={String(v.currentRatioLow)}
                onChange={(e) => set("currentRatioLow", e.target.value)}
                className="bg-white font-mono text-xs"
              />
            </FormField>
            <FormField label={t("credit.threshold_receivable_spike")}>
              <Input
                type="number"
                step={0.05}
                value={String(v.receivableSpike)}
                onChange={(e) => set("receivableSpike", e.target.value)}
                className="bg-white font-mono text-xs"
              />
            </FormField>
          </div>
          <div className="flex gap-2.5 pt-2 border-t border-[#eee8db]">
            <Button size="sm" onClick={save} className="text-xs font-semibold cursor-pointer">
              {t("credit.threshold_save")}
            </Button>
            <Button size="sm" variant="secondary" onClick={reset} className="text-xs cursor-pointer">
              {t("credit.threshold_reset")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
