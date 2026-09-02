"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  getCustomer, listContacts, listNotes, listTasks, listPipelineHistory,
  type Customer, type Contact, type Note, type Task, type PipelineHistory,
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

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<PipelineHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [c, co, n, t, h] = await Promise.all([
        getCustomer(id),
        listContacts(id),
        listNotes(id),
        listTasks(id),
        listPipelineHistory(id),
      ]);
      setCustomer(c); setContacts(co); setNotes(n); setTasks(t); setHistory(h);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string; status?: number })?.error ?? "Failed to load";
      const status = (e as { status?: number })?.status;
      if (status === 401) return;
      setErr(status === 404 ? "Customer not found" : msg);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) return <Card><CardBody><p className="text-sm text-zinc-500">Loading…</p></CardBody></Card>;
  if (err) return (
    <Card><CardBody>
      <p className="text-sm text-red-600">{err}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" onClick={loadAll}>Retry</Button>
        <Link href="/customers" className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50">← Back to list</Link>
      </div>
    </CardBody></Card>
  );
  if (!customer) return null;

  return (
    <div className="space-y-5">
      <Link href="/customers" className="inline-flex items-center text-xs text-zinc-500 hover:underline">← All customers</Link>

      <Card>
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">{customer.company_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {customer.industry && <span>{customer.industry}</span>}
              {customer.revenue_reported != null && <span>· Revenue {Number(customer.revenue_reported).toLocaleString("vi-VN")} VND</span>}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge value={customer.stage} />
              <Badge value={customer.status} />
              {(customer.current_banks ?? []).map(b => (
                <span key={b} className="rounded-full bg-zinc-100 border px-2 py-0.5 text-xs">{b}</span>
              ))}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={()=>setShowEdit(true)}>Edit</Button>
        </CardHeader>
        <CardBody className="grid gap-2 text-sm sm:grid-cols-2">
          <div><span className="text-zinc-500">Credit need:</span> {[customer.credit_need_type, customer.credit_need_amount != null ? `${Number(customer.credit_need_amount).toLocaleString("vi-VN")} VND` : null].filter(Boolean).join(" · ") || "—"}</div>
          <div><span className="text-zinc-500">Purpose:</span> {customer.credit_need_purpose ?? "—"}</div>
          <div className="sm:col-span-2 text-xs text-zinc-400">Created {new Date(customer.created_at).toLocaleString("vi-VN")} · Updated {new Date(customer.updated_at).toLocaleString("vi-VN")}</div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Stage</span>
            <Badge value={customer.stage} />
            <span className="text-xs text-zinc-400">→ manage on the board</span>
          </div>
          <Link href="/pipeline" className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800">
            Open Pipeline →
          </Link>
        </CardBody>
      </Card>

      {/* Contacts + Tasks | Notes + Feed — 1 timeline per customer (spec §1) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card><CardBody><ContactSection customerId={customer.id} contacts={contacts} onReload={loadAll} /></CardBody></Card>
          <Card><CardBody><TaskSection customerId={customer.id} tasks={tasks} onReload={loadAll} /></CardBody></Card>
        </div>
        <div className="space-y-5">
          <NoteSection customerId={customer.id} onCreated={loadAll} />
          <Card>
            <CardHeader><h3 className="text-sm font-semibold">Activity feed</h3><p className="text-xs text-zinc-400">Notes + Tasks + Stage changes — merged reverse-chronologically via <code className="rounded bg-zinc-100 px-1">lib/feed.ts</code>.</p></CardHeader>
            <CardBody><ActivityFeed notes={notes} tasks={tasks} history={history} /></CardBody>
          </Card>
        </div>
      </div>

      {/* Credit Analysis — section on the same profile page, not a separate route (spec §1: "1 timeline duy nhất") */}
      <Card>
        <CardBody>
          <CreditAnalysisSection customerId={customer.id} />
        </CardBody>
      </Card>

      {showEdit && (
        <CustomerForm
          initial={customer}
          onClose={()=>setShowEdit(false)}
          onSaved={async ()=>{ setShowEdit(false); await loadAll(); }}
        />
      )}
    </div>
  );
}
