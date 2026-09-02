"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getCustomer,
  listContacts,
  listNotes,
  listTasks,
  listPipelineHistory,
  type Customer,
  type Contact,
  type Note,
  type Task,
  type PipelineHistory,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { ContactSection } from "@/components/customers/ContactSection";
import { NoteSection } from "@/components/customers/NoteSection";
import { TaskSection } from "@/components/customers/TaskSection";
import { ActivityFeed } from "@/components/customers/ActivityFeed";
import { CreditAnalysisSection } from "@/components/credit/CreditAnalysisSection";
import { useI18n } from "@/lib/i18n";

type TabKey = "overview" | "contacts" | "notes" | "tasks" | "feed" | "financials";

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t, formatCurrency, formatDateTime } = useI18n();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<PipelineHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [c, co, n, tk, h] = await Promise.all([
        getCustomer(id),
        listContacts(id),
        listNotes(id),
        listTasks(id),
        listPipelineHistory(id),
      ]);
      setCustomer(c);
      setContacts(co);
      setNotes(n);
      setTasks(tk);
      setHistory(h);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string; status?: number })?.error ?? t("common.error");
      const status = (e as { status?: number })?.status;
      if (status === 401) return;
      setErr(status === 404 ? "Customer not found" : msg);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (loading) {
    return (
      <Card>
        <CardBody className="py-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-r-transparent" />
          <p className="mt-2 text-xs font-medium text-slate-500">{t("common.loading")}</p>
        </CardBody>
      </Card>
    );
  }

  if (err) {
    return (
      <Card>
        <CardBody className="border-l-4 border-red-500 bg-red-50/50 p-6">
          <p className="text-sm font-semibold text-red-700">{err}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={loadAll}>
              {t("common.retry")}
            </Button>
            <Link
              href="/customers"
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("customer_detail.all_customers")}
            </Link>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-blue-600 transition"
      >
        {t("customer_detail.all_customers")}
      </Link>

      {/* Hallmark Customer Header 360 Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {customer.company_name}
              </h1>
              <Badge value={customer.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              {customer.industry && (
                <span className="font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {customer.industry}
                </span>
              )}
              {customer.revenue_reported != null && (
                <span className="font-mono text-slate-700">
                  · DT: <strong>{formatCurrency(customer.revenue_reported)}</strong>
                </span>
              )}
              <span className="text-slate-400">
                · {t("common.created_at")}: {formatDateTime(customer.created_at)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1 text-xs">
                <span className="text-slate-500 font-medium">{t("customer_detail.stage_label")}</span>
                <Badge value={customer.stage} />
              </div>

              {(customer.current_banks ?? []).map((b) => (
                <span
                  key={b}
                  className="rounded-md bg-slate-100 border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  🏦 {b}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEdit(true)}
              className="text-xs font-semibold shadow-xs"
            >
              {t("common.edit")}
            </Button>
            <Link
              href="/pipeline"
              className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            >
              {t("customer_detail.open_pipeline")}
            </Link>
          </div>
        </div>

        {/* Credit Need Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-0.5">
              {t("customer_detail.credit_need")}
            </span>
            <span className="text-slate-800 font-medium">
              {[
                customer.credit_need_type,
                customer.credit_need_amount != null ? formatCurrency(customer.credit_need_amount) : null,
              ]
                .filter(Boolean)
                .join(" · ") || t("common.empty_dash")}
            </span>
          </div>

          <div>
            <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px] mb-0.5">
              {t("customer_detail.purpose")}
            </span>
            <span className="text-slate-800 font-medium">
              {customer.credit_need_purpose ?? t("common.empty_dash")}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-1 text-xs font-semibold text-slate-600">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          📋 {t("nav.overview")}
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "contacts"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          👥 {t("customer_detail.tab_contacts")} ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "notes"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          📝 {t("customer_detail.tab_notes")} ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "tasks"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          ✅ {t("customer_detail.tab_tasks")} ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "feed"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          ⏱️ {t("customer_detail.tab_feed")}
        </button>
        <button
          onClick={() => setActiveTab("financials")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
            activeTab === "financials"
              ? "border-slate-900 text-slate-900 font-bold"
              : "border-transparent hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          📊 {t("customer_detail.tab_financials")}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardBody>
                  <ContactSection customerId={customer.id} contacts={contacts} onReload={loadAll} />
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <TaskSection customerId={customer.id} tasks={tasks} onReload={loadAll} />
                </CardBody>
              </Card>
            </div>
            <div className="space-y-6">
              <NoteSection customerId={customer.id} onCreated={loadAll} />
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {t("customer_detail.feed_title")}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("customer_detail.feed_subtitle")}
                  </p>
                </CardHeader>
                <CardBody>
                  <ActivityFeed notes={notes} tasks={tasks} history={history} />
                </CardBody>
              </Card>
            </div>
          </div>

          <Card>
            <CardBody className="p-6">
              <CreditAnalysisSection customerId={customer.id} />
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === "contacts" && (
        <Card>
          <CardBody className="p-6">
            <ContactSection customerId={customer.id} contacts={contacts} onReload={loadAll} />
          </CardBody>
        </Card>
      )}

      {activeTab === "notes" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <NoteSection customerId={customer.id} onCreated={loadAll} />
          <Card>
            <CardHeader>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                {t("customer_detail.notes_title")}
              </h3>
            </CardHeader>
            <CardBody>
              <ActivityFeed notes={notes} tasks={[]} history={[]} />
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === "tasks" && (
        <Card>
          <CardBody className="p-6">
            <TaskSection customerId={customer.id} tasks={tasks} onReload={loadAll} />
          </CardBody>
        </Card>
      )}

      {activeTab === "feed" && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {t("customer_detail.feed_title")}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t("customer_detail.feed_subtitle")}
            </p>
          </CardHeader>
          <CardBody className="p-6">
            <ActivityFeed notes={notes} tasks={tasks} history={history} />
          </CardBody>
        </Card>
      )}

      {activeTab === "financials" && (
        <Card>
          <CardBody className="p-6">
            <CreditAnalysisSection customerId={customer.id} />
          </CardBody>
        </Card>
      )}

      {showEdit && (
        <CustomerForm
          initial={customer}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            await loadAll();
          }}
        />
      )}
    </div>
  );
}
