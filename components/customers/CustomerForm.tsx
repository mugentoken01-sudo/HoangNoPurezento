"use client";
import { useState } from "react";
import { createCustomer, updateCustomer, type Customer } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Textarea, Select } from "@/components/ui/FormField";

const STAGES = ["lead","contacted","qualified","meeting","credit","approved","disbursed"] as const;
const STATUSES = ["active","lost","won"] as const;

type Props = { initial: Customer | null; onClose: () => void; onSaved: () => void };

export function CustomerForm({ initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [company_name, setCompany] = useState(initial?.company_name ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [revenue_reported, setRevenue] = useState(initial?.revenue_reported?.toString() ?? "");
  const [credit_need_type, setNeedType] = useState(initial?.credit_need_type ?? "");
  const [credit_need_amount, setNeedAmount] = useState(initial?.credit_need_amount?.toString() ?? "");
  const [credit_need_purpose, setNeedPurpose] = useState(initial?.credit_need_purpose ?? "");
  const [banksInput, setBanksInput] = useState((initial?.current_banks ?? []).join(", "));
  const [stage, setStage] = useState(initial?.stage ?? "lead");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrs, setFieldErrs] = useState<Record<string,string>>({});

  function validate(): boolean {
    const e: Record<string,string> = {};
    if (!company_name.trim()) e.company_name = "Company name is required";
    if (company_name.length > 255) e.company_name = "Max 255 chars";
    if (revenue_reported && (!/^\d+$/.test(revenue_reported) || Number(revenue_reported) < 0)) e.revenue_reported = "Must be a non-negative integer";
    if (credit_need_amount && (!/^\d+$/.test(credit_need_amount) || Number(credit_need_amount) < 0)) e.credit_need_amount = "Must be a non-negative integer";
    setFieldErrs(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true); setErr(null);
    const banks = banksInput.split(",").map(s=>s.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      company_name: company_name.trim(),
      industry: industry.trim() || null,
      revenue_reported: revenue_reported ? Number(revenue_reported) : null,
      credit_need_type: credit_need_type.trim() || null,
      credit_need_amount: credit_need_amount ? Number(credit_need_amount) : null,
      credit_need_purpose: credit_need_purpose.trim() || null,
      current_banks: banks,
      stage: stage as string,
      status: status as string,
    };
    try {
      if (isEdit) {
        // stage via PATCH is blocked — so omit stage on edit, use StageControl instead
        const { stage: _s, ...patchBody } = body;
        const res = await updateCustomer(initial!.id, patchBody);
        if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Update failed");
      } else {
        const res = await createCustomer(body);
        if (!res.ok) throw new Error((res.json as { error?: string }).error ?? JSON.stringify((res.json as { details?: unknown }).details ?? res.json));
      }
      onSaved();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed";
      setErr(msg);
    } finally { setSubmitting(false); }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit customer" : "New customer"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label="Company name" required error={fieldErrs.company_name}>
          <Input value={company_name} onChange={e=>setCompany(e.target.value)} placeholder="Công ty ABC" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Industry">
            <Input value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="Phân phối" />
          </FormField>
          <FormField label="Revenue reported (VND)" hint="e.g. 80000000000" error={fieldErrs.revenue_reported}>
            <Input value={revenue_reported} onChange={e=>setRevenue(e.target.value)} placeholder="80000000000" inputMode="numeric" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Credit need type">
            <Input value={credit_need_type} onChange={e=>setNeedType(e.target.value)} placeholder="VLĐ" />
          </FormField>
          <FormField label="Credit need amount (VND)" error={fieldErrs.credit_need_amount}>
            <Input value={credit_need_amount} onChange={e=>setNeedAmount(e.target.value)} placeholder="5000000000" inputMode="numeric" />
          </FormField>
        </div>
        <FormField label="Credit need purpose">
          <Input value={credit_need_purpose} onChange={e=>setNeedPurpose(e.target.value)} placeholder="Bổ sung vốn lưu động" />
        </FormField>
        <FormField label="Current banks" hint="Comma-separated — rendered as chips">
          <Input value={banksInput} onChange={e=>setBanksInput(e.target.value)} placeholder="BIDV, Vietcombank" />
          {banksInput.trim() && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {banksInput.split(",").map(s=>s.trim()).filter(Boolean).map(b=>(
                <span key={b} className="rounded-full bg-zinc-100 border px-2 py-0.5 text-xs">{b}</span>
              ))}
            </div>
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Stage">
            <Select value={stage} onChange={e=>setStage(e.target.value)} disabled={isEdit} >
              {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
            </Select>
            {isEdit && <span className="text-xs text-zinc-400">Change stage via the Stage control on the profile page (Module 3 will replace it with Kanban).</span>}
          </FormField>
          <FormField label="Status">
            <Select value={status} onChange={e=>setStatus(e.target.value)}>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
        </div>
        {err && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save" : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}
