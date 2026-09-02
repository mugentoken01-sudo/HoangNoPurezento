"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listCustomers, type Customer, deleteCustomer } from "@/lib/api-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { CustomerForm } from "@/components/customers/CustomerForm";

const STAGES = ["", "lead","contacted","qualified","meeting","credit","approved","disbursed"] as const;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const data = await listCustomers({ stage: stage || undefined, industry: industry || undefined });
      setCustomers(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { error?: string })?.error ?? "Failed to load";
      setErr(msg);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [stage, industry]);

  async function onDelete(id: string) {
    if (!confirm("Delete this customer? This will cascade to contacts/notes/tasks. This cannot be undone.")) return;
    try { await deleteCustomer(id); await load(); } catch (e: unknown) { alert((e as { error?: string })?.error ?? "Delete failed"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Customers</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ New customer</Button>
      </div>

      <Card>
        <CardBody className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600">Stage</span>
            <select value={stage} onChange={e=>setStage(e.target.value)} className="rounded-md border px-2 py-1.5 text-sm bg-white">
              {STAGES.map(s => <option key={s} value={s}>{s ? s : "All stages"}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600">Industry</span>
            <input value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="e.g. Phân phối" className="rounded-md border px-2 py-1.5 text-sm w-44" />
          </label>
          {(stage || industry) && <button onClick={()=>{setStage(""); setIndustry("");}} className="text-xs text-zinc-500 underline">Clear filters</button>}
        </CardBody>
      </Card>

      {loading && <Card><CardBody><p className="text-sm text-zinc-500">Loading…</p></CardBody></Card>}
      {err && <Card><CardBody><p className="text-sm text-red-600">{err}</p><Button variant="secondary" size="sm" className="mt-2" onClick={load}>Retry</Button></CardBody></Card>}
      {!loading && !err && customers.length === 0 && (
        <Card><CardBody><p className="text-sm text-zinc-500">No customers yet. Create the first one to reproduce the Công ty ABC scenario.</p></CardBody></Card>
      )}
      {!loading && !err && customers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-left text-xs text-zinc-500">
                <th className="px-3 py-2 border-b">Company</th>
                <th className="px-3 py-2 border-b">Industry</th>
                <th className="px-3 py-2 border-b">Stage</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Banks</th>
                <th className="px-3 py-2 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b"><Link href={`/customers/${c.id}`} className="font-medium hover:underline">{c.company_name}</Link></td>
                  <td className="px-3 py-2 border-b text-zinc-600">{c.industry ?? "—"}</td>
                  <td className="px-3 py-2 border-b"><Badge value={c.stage} /></td>
                  <td className="px-3 py-2 border-b"><Badge value={c.status} /></td>
                  <td className="px-3 py-2 border-b text-zinc-600">{(c.current_banks ?? []).join(", ") || "—"}</td>
                  <td className="px-3 py-2 border-b text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/customers/${c.id}`} className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50">Open</Link>
                      <button onClick={()=>{setEditing(c); setShowForm(true);}} className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50">Edit</button>
                      <button onClick={()=>onDelete(c.id)} className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CustomerForm
          initial={editing}
          onClose={()=>{ setShowForm(false); setEditing(null); }}
          onSaved={async ()=>{ setShowForm(false); setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}
