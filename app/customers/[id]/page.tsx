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
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#265e2b] border-r-transparent" />
          <p className="mt-2 text-xs font-medium text-[#576750]">{t("common.loading")}</p>
        </CardBody>
      </Card>
    );
  }

  if (err) {
    return (
      <Card>
        <CardBody className="border-l-4 border-[#a13d28] bg-[#faedea] p-6">
          <p className="text-sm font-semibold text-[#a13d28]">{err}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={loadAll}>
              {t("common.retry")}
            </Button>
            <Link
              href="/customers"
              className="inline-flex items-center rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#2d3e29] hover:bg-[#f5f1e8]"
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
        className="inline-flex items-center text-xs font-mono font-semibold text-[#576750] hover:text-[#265e2b] transition"
      >
        {t("customer_detail.all_customers")}
      </Link>

      {/* Hallmark Garden Customer Header 360 Card */}
      <div className="rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-6 sm:p-7 shadow-[0_10px_30px_-15px_rgba(24,38,21,0.08),0_1px_3px_rgba(24,38,21,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#182615]">
                {customer.company_name}
              </h1>
              <Badge value={customer.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#576750]">
              {customer.industry && (
                <span className="font-semibold bg-[#f2efe6] border border-[#d4ccb8] px-2.5 py-0.5 rounded-full text-[#4a5944]">
                  {customer.industry}
                </span>
              )}
              {customer.revenue_reported != null && (
                <span className="font-mono text-[#182615]">
                  · DT: <strong>{formatCurrency(customer.revenue_reported)}</strong>
                </span>
              )}
              <span className="text-[#7d8c76] font-mono">
                · {t("common.created_at")}: {formatDateTime(customer.created_at)}
              </span>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#f7f4ed] border border-[#dfd8c8] rounded-full px-3 py-1 text-xs">
                <span className="text-[#576750] font-medium">{t("customer_detail.stage_label")}</span>
                <Badge value={customer.stage} />
              </div>

              {(customer.current_banks ?? []).map((b) => (
                <span
                  key={b}
                  className="rounded-full bg-[#f2efe6] border border-[#d4ccb8] px-2.5 py-1 text-xs font-medium text-[#4a5944]"
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
              className="text-xs font-semibold"
            >
              {t("common.edit")}
            </Button>
            <Link
              href="/pipeline"
              className="inline-flex items-center rounded-full bg-[#265e2b] px-4 py-2 text-xs font-semibold text-[#faf8f2] shadow-sm hover:bg-[#1d4821] transition"
            >
              {t("customer_detail.open_pipeline")}
            </Link>
          </div>
        </div>

        {/* Credit Need Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#eee8db] pt-4 text-xs">
          <div>
            <span className="font-mono font-bold text-[#576750] uppercase tracking-wider block text-[10px] mb-0.5">
              {t("customer_detail.credit_need")}
            </span>
            <span className="text-[#182615] font-semibold text-sm font-serif">
              {[
                customer.credit_need_type,
                customer.credit_need_amount != null ? formatCurrency(customer.credit_need_amount) : null,
              ]
                .filter(Boolean)
                .join(" · ") || t("common.empty_dash")}
            </span>
          </div>

          <div>
            <span className="font-mono font-bold text-[#576750] uppercase tracking-wider block text-[10px] mb-0.5">
              {t("customer_detail.purpose")}
            </span>
            <span className="text-[#2d3e29] font-medium">
              {customer.credit_need_purpose ?? t("common.empty_dash")}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="flex overflow-x-auto border-b border-[#dfd8c8] gap-1 text-xs font-semibold text-[#576750]" role="tablist" aria-label="Customer profile tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            activeTab === "overview"
              ? "border-[#265e2b] text-[#265e2b] font-bold"
              : "border-transparent hover:text-[#182615] hover:border-[#bcc6b1]"
          }`}
        >
          <span aria-hidden="true" className="mr-1">📋</span> {t("nav.overview")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "contacts"}
          onClick={() => setActiveTab("contacts")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            activeTab === "contacts"
              ? "border-[#265e2b] text-[#265e2b] font-bold"
              : "border-transparent hover:text-[#182615] hover:border-[#bcc6b1]"
          }`}
        >
          <span aria-hidden="true" className="mr-1">👥</span> {t("customer_detail.tab_contacts")} ({contacts.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "notes"}
          onClick={() => setActiveTab("notes")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            activeTab === "notes"
              ? "border-[#265e2b] text-[#265e2b] font-bold"
              : "border-transparent hover:text-[#182615] hover:border-[#bcc6b1]"
          }`}
        >
          <span aria-hidden="true" className="mr-1">📝</span> {t("customer_detail.tab_notes")} ({notes.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tasks"}
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            activeTab === "tasks"
              ? "border-[#265e2b] text-[#265e2b] font-bold"
              : "border-transparent hover:text-[#182615] hover:border-[#bcc6b1]"
          }`}
        >
          <span aria-hidden="true" className="mr-1">✅</span> {t("customer_detail.tab_tasks")} ({tasks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "feed"}
          onClick={() => setActiveTab("feed")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            activeTab === "feed"
              ? "border-[#265e2b] text-[#265e2b] font-bold"
              : "border-transparent hover:text-[#182615] hover:border-[#bcc6b1]"
          }`}
        >
          <span aria-hidden="true" className="mr-1">⏱️</span> {t("customer_detail.tab_feed")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "financials"}
          onClick={() => setActiveTab("financials")}
          className={`px-4 py-2.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            activeTab === "financials"
              ? "border-[#265e2b] text-[#265e2b] font-bold"
              : "border-transparent hover:text-[#182615] hover:border-[#bcc6b1]"
          }`}
        >
          <span aria-hidden="true" className="mr-1">📊</span> {t("customer_detail.tab_financials")}
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
                  <h3 className="text-sm font-serif font-bold text-[#182615] tracking-tight">
                    {t("customer_detail.feed_title")}
                  </h3>
                  <p className="text-xs text-[#576750] mt-0.5">
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
              <h3 className="text-sm font-serif font-bold text-[#182615] tracking-tight">
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
            <h3 className="text-sm font-serif font-bold text-[#182615] tracking-tight">
              {t("customer_detail.feed_title")}
            </h3>
            <p className="text-xs text-[#576750] mt-0.5">
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
