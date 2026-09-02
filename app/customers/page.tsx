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
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-700 uppercase">
              {t("customers.badge")}
            </span>
            <h1 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {t("customers.title")}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 max-w-2xl">
              {t("customers.subtitle")}
            </p>
          </div>

          <Button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="text-xs font-semibold shadow-xs"
          >
            {t("customers.new_button")}
          </Button>
        </div>

        {/* Filter Controls Strip */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {t("common.search")}
            </label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("customers.search_placeholder")}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {t("customers.filter_stage")}
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
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
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              {t("customers.filter_industry")}
            </label>
            <div className="flex gap-2">
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t("customers.industry_placeholder")}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
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
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-r-transparent" />
            <p className="mt-2 text-xs font-medium text-slate-500">{t("common.loading")}</p>
          </CardBody>
        </Card>
      )}

      {err && (
        <Card>
          <CardBody className="border-l-4 border-red-500 bg-red-50/50 p-4">
            <p role="alert" className="text-xs font-semibold text-red-700">{err}</p>
            <Button variant="secondary" size="sm" className="mt-2 text-xs" onClick={load}>
              {t("common.retry")}
            </Button>
          </CardBody>
        </Card>
      )}

      {!loading && !err && filteredCustomers.length === 0 && (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 font-bold text-lg mb-3">
              🏢
            </div>
            <h3 className="text-sm font-bold text-slate-900">{t("customers.empty_title")}</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">{t("customers.empty_desc")}</p>
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
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-3.5">{t("customers.table_company")}</th>
                  <th className="px-4 py-3.5">{t("customers.table_industry")}</th>
                  <th className="px-4 py-3.5">{t("customers.table_stage")}</th>
                  <th className="px-4 py-3.5">{t("customers.table_status")}</th>
                  <th className="px-4 py-3.5">{t("customers.table_revenue")}</th>
                  <th className="px-4 py-3.5">{t("customers.table_banks")}</th>
                  <th className="px-4 py-3.5 text-right">{t("customers.table_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 hover:underline block"
                      >
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {c.industry ?? t("common.empty_dash")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge value={c.stage} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge value={c.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-700">
                      {c.revenue_reported != null ? formatCurrency(c.revenue_reported) : t("common.empty_dash")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {(c.current_banks ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(c.current_banks ?? []).map((b) => (
                            <span key={b} className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                              {b}
                            </span>
                          ))}
                        </div>
                      ) : (
                        t("common.empty_dash")
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                        >
                          {t("common.open")}
                        </Link>
                        <button
                          onClick={() => { setEditing(c); setShowForm(true); }}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => onDelete(c.id, c.company_name)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 hover:border-red-200 transition"
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
