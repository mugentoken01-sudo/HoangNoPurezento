"use client";
import { useState } from "react";
import { createNote } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Textarea, Select, Input, FormField } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";

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
      onCreated();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? t("common.error");
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5 rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h4 className="text-sm font-bold text-slate-900 tracking-tight">
          {t("customer_detail.add_note")}
        </h4>
      </div>

      <FormField label={t("customer_detail.note_content")} required>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={t("customer_detail.note_content_placeholder")}
        />
      </FormField>

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
        <p className="rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-medium">
          {err}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit" size="sm" disabled={submitting} className="text-xs font-semibold">
          {submitting ? t("common.saving") : t("customer_detail.add_note")}
        </Button>
      </div>
    </form>
  );
}
