"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { listCustomers, type Customer, deleteCustomer } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { useI18n } from "@/lib/i18n";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";

export default function CustomersPage() {
  const { t, formatCurrency, dict } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listCustomers({
        stage: stage || undefined,
        industry: industry || undefined,
      });
      setCustomers(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? t("common.error");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [stage, industry, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: string, name: string) {
    if (!confirm(`${t("common.confirm_delete")} "${name}"? ${t("common.confirm_delete_desc")}`)) return;
    try {
      await deleteCustomer(id);
      await load();
    } catch (e: unknown) {
      alert((e as { error?: string })?.error ?? t("common.error"));
    }
  }

  const filteredCustomers = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(q) ||
      (c.industry && c.industry.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 sm:p-7 shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-3 py-0.5 text-[10px] font-mono font-bold tracking-wider text-[#4a5944] uppercase">
              🌿 {t("customers.badge")}
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#182615]">
              {t("customers.title")}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-[#576750] max-w-2xl">
              {t("customers.subtitle")}
            </p>
          </div>

          <Button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="text-xs font-semibold"
          >
            {t("customers.new_button")}
          </Button>
        </div>

        {/* Filter Controls Strip */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#eee8db] pt-4">
          <div>
            <label className="block text-[11px] font-mono font-bold text-[#576750] uppercase mb-1">
              {t("common.search")}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("customers.search_placeholder")}
              className="w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-1.5 text-xs text-[#182615] placeholder:text-[#a2ad9d] focus:border-[#265e2b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-[#576750] uppercase mb-1">
              {t("customers.filter_stage")}
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3 py-1.5 text-xs text-[#182615] font-medium focus:border-[#265e2b] focus:outline-none"
            >
              <option value="">{t("customers.all_stages")}</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {dict.stages[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-[#576750] uppercase mb-1">
              {t("customers.filter_industry")}
            </label>
            <div className="flex gap-2">
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t("customers.industry_placeholder")}
                className="w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-1.5 text-xs text-[#182615] placeholder:text-[#a2ad9d] focus:border-[#265e2b] focus:outline-none"
              />
              {(stage || industry || search) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStage(""); setIndustry(""); setSearch(""); }}
                  className="whitespace-nowrap text-xs h-8"
                >
                  {t("customers.clear_filters")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#265e2b] border-r-transparent" />
            <p className="mt-2 text-xs font-medium text-[#576750]">{t("common.loading")}</p>
          </CardBody>
        </Card>
      )}

      {err && (
        <Card>
          <CardBody className="border-l-4 border-[#a13d28] bg-[#faedea] p-4">
            <p role="alert" className="text-xs font-semibold text-[#a13d28]">{err}</p>
            <Button variant="secondary" size="sm" className="mt-2 text-xs" onClick={load}>
              {t("common.retry")}
            </Button>
          </CardBody>
        </Card>
      )}

      {!loading && !err && filteredCustomers.length === 0 && (
        <Card>
          <CardBody className="py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2efe6] text-[#4a5944] font-bold text-xl mb-3">
              🌿
            </div>
            <h3 className="text-base font-serif font-bold text-[#182615]">{t("customers.empty_title")}</h3>
            <p className="mt-1 text-xs text-[#576750] max-w-sm mx-auto">{t("customers.empty_desc")}</p>
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              size="sm"
              className="mt-4 text-xs"
            >
              {t("customers.new_button")}
            </Button>
          </CardBody>
        </Card>
      )}

      {!loading && !err && filteredCustomers.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[#dfd8c8] bg-[#ffffff] shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#eee8db] bg-[#faf8f3]/80 text-[11px] font-mono font-bold tracking-wider text-[#576750] uppercase">
                  <th className="px-5 py-4">{t("customers.table_company")}</th>
                  <th className="px-4 py-4">{t("customers.table_industry")}</th>
                  <th className="px-4 py-4">{t("customers.table_stage")}</th>
                  <th className="px-4 py-4">{t("customers.table_status")}</th>
                  <th className="px-4 py-4">{t("customers.table_revenue")}</th>
                  <th className="px-4 py-4">{t("customers.table_banks")}</th>
                  <th className="px-5 py-4 text-right">{t("customers.table_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee8db]">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[#faf8f3]/90">
                    <td className="px-5 py-4">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-serif font-bold text-base text-[#182615] hover:text-[#265e2b] hover:underline block leading-tight"
                      >
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-xs text-[#41503b]">
                      {c.industry ?? t("common.empty_dash")}
                    </td>
                    <td className="px-4 py-4">
                      <Badge value={c.stage} />
                    </td>
                    <td className="px-4 py-4">
                      <Badge value={c.status} />
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-[#182615]">
                      {c.revenue_reported != null ? formatCurrency(c.revenue_reported) : t("common.empty_dash")}
                    </td>
                    <td className="px-4 py-4 text-xs text-[#576750]">
                      {(c.current_banks ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(c.current_banks ?? []).map((b) => (
                            <span key={b} className="rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-2 py-0.5 text-[10px] font-medium text-[#4a5944]">
                              {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        t("common.empty_dash")
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1 text-xs font-semibold text-[#2d3e29] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] transition"
                        >
                          {t("common.open")}
                        </Link>
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1 text-xs font-semibold text-[#2d3e29] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] transition"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => onDelete(c.id, c.company_name)}
                          className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1 text-xs font-semibold text-[#a13d28] shadow-2xs hover:bg-[#faedea] hover:border-[#f0c7be] transition"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <CustomerForm
          initial={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={async () => { setShowForm(false); setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}
