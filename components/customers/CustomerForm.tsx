"use client";
import { useState } from "react";
import { createCustomer, updateCustomer, type Customer } from "@/lib/api-client";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { useI18n } from "@/lib/i18n";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

const STATUSES = ["active", "inactive", "lost", "won"] as const;

type Props = { initial: Customer | null; onClose: () => void; onSaved: () => void };

export function CustomerForm({ initial, onClose, onSaved }: Props) {
  const { t, dict } = useI18n();
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
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!company_name.trim()) e.company_name = t("customers.form_company_name") + " is required";
    if (company_name.length > 255) e.company_name = "Max 255 chars";
    if (revenue_reported && (!/^\d+$/.test(revenue_reported) || Number(revenue_reported) < 0)) {
      e.revenue_reported = "Must be a non-negative integer";
    }
    if (credit_need_amount && (!/^\d+$/.test(credit_need_amount) || Number(credit_need_amount) < 0)) {
      e.credit_need_amount = "Must be a non-negative integer";
    }
    setFieldErrs(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setErr(null);
    const banks = banksInput.split(",").map((s) => s.trim()).filter(Boolean);
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
        // stage via generic PATCH is blocked — omit stage on edit
        const { stage: _s, ...patchBody } = body;
        const res = await updateCustomer(initial!.id, patchBody);
        if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Update failed");
      } else {
        const res = await createCustomer(body);
        if (!res.ok) throw new Error((res.json as { error?: string }).error ?? "Create failed");
      }
      onSaved();
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? t("customers.modal_edit_title") : t("customers.modal_create_title")}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField label={t("customers.form_company_name")} required error={fieldErrs.company_name}>
          <Input
            value={company_name}
            onChange={(e) => setCompany(e.target.value)}
            placeholder={t("customers.form_company_name_placeholder")}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t("customers.form_industry")}>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder={t("customers.form_industry_placeholder")}
            />
          </FormField>
          <FormField label={t("customers.form_revenue")} error={fieldErrs.revenue_reported}>
            <Input
              value={revenue_reported}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder={t("customers.form_revenue_placeholder")}
              inputMode="numeric"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t("customers.form_credit_type")}>
            <Input
              value={credit_need_type}
              onChange={(e) => setNeedType(e.target.value)}
              placeholder="VLĐ / DA / Bảo lãnh"
            />
          </FormField>
          <FormField label={t("customers.form_credit_amount")} error={fieldErrs.credit_need_amount}>
            <Input
              value={credit_need_amount}
              onChange={(e) => setNeedAmount(e.target.value)}
              placeholder="10000000000"
              inputMode="numeric"
            />
          </FormField>
        </div>

        <FormField label={t("customers.form_credit_purpose")}>
          <Input
            value={credit_need_purpose}
            onChange={(e) => setNeedPurpose(e.target.value)}
            placeholder={t("customers.form_credit_purpose_placeholder")}
          />
        </FormField>

        <FormField label={t("customers.form_banks")} hint={t("customers.form_banks_hint")}>
          <Input
            value={banksInput}
            onChange={(e) => setBanksInput(e.target.value)}
            placeholder="Vietcombank, BIDV, MBBank"
          />
          {banksInput.trim() && (
            <div className="mt-2 flex flex-wrap gap-1">
              {banksInput.split(",").map((s) => s.trim()).filter(Boolean).map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-2.5 py-0.5 text-xs font-semibold text-[#4a5944] font-mono"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label={t("customers.form_status")}>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "active" ? t("customers.form_status_active") : s === "inactive" ? t("customers.form_status_inactive") : s}
                </option>
              ))}
            </Select>
          </FormField>

          {!isEdit && (
            <FormField label={t("customers.filter_stage")}>
              <Select value={stage} onChange={(e) => setStage(e.target.value)}>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {dict.stages[s] ?? s}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        {err && (
          <p role="alert" className="rounded-xl bg-[#faedea] border border-[#f0c7be] px-3.5 py-2.5 text-xs font-semibold text-[#a13d28]">
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#eee8db]">
          <Button type="button" variant="secondary" onClick={onClose} className="cursor-pointer">
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting} className="cursor-pointer">
            {submitting ? t("common.saving") : isEdit ? t("common.save") : t("common.create")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
