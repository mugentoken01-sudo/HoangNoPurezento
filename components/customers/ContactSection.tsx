"use client";
import { useState } from "react";
import { createContact, patchContact, deleteContact, type Contact } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, Select, FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

export function ContactSection({ customerId, contacts, onReload }: { customerId: string; contacts: Contact[]; onReload: () => void }) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [is_primary, setIsPrimary] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function openCreate() {
    setEditing(null); setName(""); setTitle(""); setPhone(""); setEmail(""); setIsPrimary(false); setErr(null); setShow(true);
  }
  function openEdit(c: Contact) {
    setEditing(c); setName(c.name); setTitle(c.title ?? ""); setPhone(c.phone ?? ""); setEmail(c.email ?? ""); setIsPrimary(c.is_primary); setErr(null); setShow(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required"); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr("Invalid email"); return; }
    setSubmitting(true); setErr(null);
    try {
      if (editing) {
        await patchContact(editing.id, { name: name.trim(), title: title.trim() || null, phone: phone.trim() || null, email: email.trim() || null, is_primary });
        // single-primary UX enforcement: if this one is now primary, unset others client-side via API
        if (is_primary) {
          await Promise.all(contacts.filter(c => c.id !== editing.id && c.is_primary).map(c => patchContact(c.id, { is_primary: false })));
        }
      } else {
        const res = await createContact({ customer_id: customerId, name: name.trim(), title: title.trim() || null, phone: phone.trim() || null, email: email.trim() || null, is_primary });
        if (is_primary) {
          await Promise.all(contacts.filter(c => c.is_primary).map(c => patchContact(c.id, { is_primary: false })));
        }
      }
      setShow(false); onReload();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed");
    } finally { setSubmitting(false); }
  }

  async function onDelete(c: Contact) {
    if (!confirm(`Delete contact "${c.name}"? This cannot be undone.`)) return;
    try { await deleteContact(c.id); onReload(); } catch (ex: unknown) { alert((ex as { error?: string })?.error ?? "Delete failed"); }
  }

  async function togglePrimary(c: Contact) {
    const next = !c.is_primary;
    try {
      await patchContact(c.id, { is_primary: next });
      if (next) await Promise.all(contacts.filter(x => x.id !== c.id && x.is_primary).map(x => patchContact(x.id, { is_primary: false })));
      onReload();
    } catch (ex: unknown) { alert((ex as { error?: string })?.error ?? "Update failed"); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Contacts</h3>
        <Button size="sm" variant="secondary" onClick={openCreate}>+ Add contact</Button>
      </div>

      {contacts.length === 0 && <p className="text-sm text-zinc-500">No contacts yet.</p>}
      <ul className="space-y-2">
        {contacts.map(c => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.name}</span>
                {c.is_primary && <span className="rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800">Primary</span>}
                {c.title && <span className="text-xs text-zinc-500">· {c.title}</span>}
              </div>
              <div className="text-xs text-zinc-500 truncate">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={()=>togglePrimary(c)} title="Toggle primary" className={`rounded-md border px-2 py-1 text-xs ${c.is_primary ? "bg-amber-50 border-amber-200" : "hover:bg-zinc-50"}`}>
                {c.is_primary ? "★ Primary" : "☆ Make primary"}
              </button>
              <button onClick={()=>openEdit(c)} className="rounded-md border px-2 py-1 text-xs hover:bg-zinc-50">Edit</button>
              <button onClick={()=>onDelete(c)} className="rounded-md border px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-zinc-400">Single-primary is enforced in the UI only. Backend does not enforce unique primary — flagged as Module 1 backlog (see README).</p>

      {show && (
        <Modal open onClose={()=>setShow(false)} title={editing ? "Edit contact" : "Add contact"}>
          <form onSubmit={onSubmit} className="space-y-3">
            <FormField label="Name" required><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Nguyễn Văn A" /></FormField>
            <FormField label="Title"><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Purchasing Manager" /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Phone"><Input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="090..." /></FormField>
              <FormField label="Email"><Input value={email} onChange={e=>setEmail(e.target.value)} placeholder="a@company.vn" /></FormField>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={is_primary} onChange={e=>setIsPrimary(e.target.checked)} /> Primary contact
            </label>
            {err && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={()=>setShow(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : editing ? "Save" : "Create"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
