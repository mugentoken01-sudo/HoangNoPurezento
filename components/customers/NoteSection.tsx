"use client";
import { useState } from "react";
import { createNote } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Textarea, Select, Input, FormField } from "@/components/ui/FormField";

export function NoteSection({ customerId, onCreated }: { customerId: string; onCreated: () => void }) {
  const [content, setContent] = useState("");
  const [next_action_type, setType] = useState("");
  const [next_action_date, setDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) { setErr("Content is required"); return; }
    setSubmitting(true); setErr(null);
    try {
      await createNote({
        customer_id: customerId,
        content: content.trim(),
        next_action_type: next_action_type || null,
        next_action_date: next_action_date || null,
      });
      setContent(""); setType(""); setDate(""); onCreated();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Failed";
      setErr(msg);
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-white p-4">
      <h4 className="text-sm font-semibold">Add note</h4>
      <FormField label="Content" required>
        <Textarea value={content} onChange={e=>setContent(e.target.value)} rows={3} placeholder="Ghi chú sau cuộc gọi / gặp…" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Next action">
          <Select value={next_action_type} onChange={e=>setType(e.target.value)}>
            <option value="">— none —</option>
            <option value="call">Call</option>
            <option value="meeting">Meeting</option>
            <option value="email">Email</option>
          </Select>
        </FormField>
        <FormField label="Next action date">
          <Input type="date" value={next_action_date} onChange={e=>setDate(e.target.value)} />
        </FormField>
      </div>
      {err && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</p>}
      <Button type="submit" size="sm" disabled={submitting}>{submitting ? "Saving…" : "Add note"}</Button>
    </form>
  );
}
