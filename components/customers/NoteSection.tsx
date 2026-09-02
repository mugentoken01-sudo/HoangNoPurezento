"use client";
import { useState } from "react";
import { createNote, parseNoteAI, type ParseNoteAIResult } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Textarea, Select, Input, FormField } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";
import { ApiKeyModal } from "@/components/settings/ApiKeyModal";

export function NoteSection({
  customerId,
  onCreated,
}: {
  customerId: string;
  onCreated: () => void;
}) {
  const { t, dict } = useI18n();
  const [content, setContent] = useState("");
  const [next_action_type, setType] = useState("");
  const [next_action_date, setDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // AI suggestion state — never auto-saves
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ParseNoteAIResult | null>(null);

  async function onAISuggest() {
    if (!content.trim()) {
      setAiError("Enter note content first");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiSuggestion(null);
    try {
      const res = await parseNoteAI(content, customerId);
      setAiSuggestion(res);
    } catch (e: unknown) {
      const apiErr = e as { error?: string; details?: { reset_at?: string }; status?: number };
      if (apiErr.status === 429) {
        const resetAt = apiErr.details?.reset_at ? new Date(apiErr.details.reset_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "";
        setAiError(`System AI quota exceeded (10/day). Resets at ${resetAt || "00:00 Asia/Ho_Chi_Minh tomorrow"}. Using heuristic fallback — try again tomorrow or add a personal key in Settings.`);
      } else {
        setAiError(apiErr.error ?? "AI suggestion failed — using heuristic fallback");
      }
    } finally {
      setAiLoading(false);
    }
  }

  function onAccept() {
    if (!aiSuggestion) return;
    if (aiSuggestion.next_action_type) setType(aiSuggestion.next_action_type);
    if (aiSuggestion.next_action_date) setDate(aiSuggestion.next_action_date);
    setAiError(null);
  }

  function onDiscard() {
    setAiSuggestion(null);
    setAiError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setErr(t("customer_detail.note_content") + " is required");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await createNote({
        customer_id: customerId,
        content: content.trim(),
        next_action_type: next_action_type || null,
        next_action_date: next_action_date || null,
      });
      setContent("");
      setType("");
      setDate("");
      setAiSuggestion(null);
      setAiError(null);
      onCreated();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? t("common.error");
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const sourceLabel: Record<string, string> = {
    gemini_byok: "BYOK",
    gemini_system: "System AI",
    heuristic: "Heuristic",
  };
  const sourceColor: Record<string, string> = {
    gemini_byok: "bg-emerald-50 text-emerald-700 border-emerald-200",
    gemini_system: "bg-sky-50 text-sky-700 border-sky-200",
    heuristic: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-5 sm:p-6 shadow-2xs">
      <div className="flex items-center justify-between border-b border-[#eee8db] pb-3.5">
        <h4 className="text-sm font-serif font-bold text-[#182615] tracking-tight">
          {t("customer_detail.add_note")}
        </h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#576750] hover:bg-[#f5f1e8] transition cursor-pointer"
            title="Cấu hình Google Gemini API Key / Configure AI Key"
          >
            <span>🔑</span>
            <span className="text-[11px]">AI Key</span>
          </button>
          <button
            type="button"
            onClick={onAISuggest}
            disabled={aiLoading || !content.trim()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd8c8] bg-[#f7f4ed] px-3 py-1 text-xs font-semibold text-[#2d3e29] hover:bg-[#eee8db] disabled:opacity-50 transition cursor-pointer"
          >
            <span aria-hidden="true">{aiLoading ? "…" : "✨"}</span> AI suggest
          </button>
        </div>
      </div>

      <FormField label={t("customer_detail.note_content")} required>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={t("customer_detail.note_content_placeholder")}
        />
      </FormField>

      {/* AI suggestion — explicit Accept/Edit/Discard, never auto-save */}
      {(aiSuggestion || aiError) && (
        <div className="rounded-xl border border-[#dfd8c8] bg-[#faf8f3]/80 p-3.5 space-y-2.5">
          {aiError && (
            <p role="alert" className="text-xs text-[#965a12] bg-[#fdf5e6] border border-[#f2dcba] rounded-lg px-3 py-2">
              {aiError}
            </p>
          )}
          {aiSuggestion && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${sourceColor[aiSuggestion.source] ?? sourceColor.heuristic}`}>
                  {sourceLabel[aiSuggestion.source] ?? aiSuggestion.source}
                </span>
                <span className="rounded-full bg-[#ffffff] border border-[#dfd8c8] px-2 py-0.5 text-[11px] text-[#576750] font-mono">
                  confidence: {aiSuggestion.confidence}
                </span>
                {aiSuggestion.fallback_reason && (
                  <span className="text-[11px] text-[#7d8c76]">fallback: {aiSuggestion.fallback_reason.slice(0,80)}</span>
                )}
              </div>
              <div className="text-xs text-[#182615]">
                Suggested: <span className="font-semibold">{aiSuggestion.next_action_type ?? "—"}</span>
                {" · "}
                <span className="font-semibold">{aiSuggestion.next_action_date ?? "—"}</span>
              </div>
              <p className="text-[11px] text-[#576750]">AI extracts next_action only — never computes ratios or moves pipeline. Click Accept to apply to the form, then Save.</p>
              <div className="flex gap-2 pt-1">
                <Button type="button" size="sm" onClick={onAccept} className="text-xs cursor-pointer">Accept</Button>
                <Button type="button" size="sm" variant="secondary" onClick={onDiscard} className="text-xs cursor-pointer">Discard</Button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label={t("customer_detail.note_action_type")}>
          <Select value={next_action_type} onChange={(e) => setType(e.target.value)}>
            <option value="">— {t("common.none")} —</option>
            {Object.entries(dict.action_types).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t("customer_detail.note_action_date")}>
          <Input
            type="date"
            value={next_action_date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>
      </div>

      {err && (
        <p role="alert" className="rounded-xl bg-[#faedea] border border-[#f0c7be] p-3 text-xs font-semibold text-[#a13d28]">
          {err}
        </p>
      )}

      <div className="flex justify-end pt-2 border-t border-[#eee8db]">
        <Button type="submit" size="sm" disabled={submitting} className="text-xs font-semibold cursor-pointer">
          {submitting ? t("common.saving") : t("customer_detail.add_note")}
        </Button>
      </div>

      <ApiKeyModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
      />
    </form>
  );
}
