"use client";
import { useState } from "react";
import { createContact, patchContact, deleteContact, type Contact } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input, FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { useI18n } from "@/lib/i18n";

export function ContactSection({
  customerId,
  contacts,
  onReload,
}: {
  customerId: string;
  contacts: Contact[];
  onReload: () => void;
}) {
  const { t } = useI18n();
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
    setEditing(null);
    setName("");
    setTitle("");
    setPhone("");
    setEmail("");
    setIsPrimary(false);
    setErr(null);
    setShow(true);
  }

  function openEdit(c: Contact) {
    setEditing(c);
    setName(c.name);
    setTitle(c.title ?? "");
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setIsPrimary(c.is_primary);
    setErr(null);
    setShow(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr(t("customer_detail.contact_name") + " is required");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Invalid email format");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      if (editing) {
        await patchContact(editing.id, {
          name: name.trim(),
          title: title.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          is_primary,
        });
        if (is_primary) {
          await Promise.all(
            contacts.filter((c) => c.id !== editing.id && c.is_primary).map((c) => patchContact(c.id, { is_primary: false }))
          );
        }
      } else {
        await createContact({
          customer_id: customerId,
          name: name.trim(),
          title: title.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          is_primary,
        });
        if (is_primary) {
          await Promise.all(
            contacts.filter((c) => c.is_primary).map((c) => patchContact(c.id, { is_primary: false }))
          );
        }
      }
      setShow(false);
      onReload();
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : (ex as { error?: string })?.error ?? "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(c: Contact) {
    if (!confirm(`${t("common.confirm_delete")} "${c.name}"?`)) return;
    try {
      await deleteContact(c.id);
      onReload();
    } catch (ex: unknown) {
      alert((ex as { error?: string })?.error ?? t("common.error"));
    }
  }

  async function togglePrimary(c: Contact) {
    const next = !c.is_primary;
    try {
      await patchContact(c.id, { is_primary: next });
      if (next) {
        await Promise.all(
          contacts.filter((x) => x.id !== c.id && x.is_primary).map((x) => patchContact(x.id, { is_primary: false }))
        );
      }
      onReload();
    } catch (ex: unknown) {
      alert((ex as { error?: string })?.error ?? t("common.error"));
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-serif font-bold text-[#182615] tracking-tight">
          {t("customer_detail.contacts_title")}
        </h3>
        <Button size="sm" variant="secondary" onClick={openCreate} className="text-xs h-8 cursor-pointer">
          {t("customer_detail.add_contact")}
        </Button>
      </div>

      {contacts.length === 0 && (
        <p className="text-xs text-[#576750] py-3">{t("customer_detail.contacts_empty")}</p>
      )}

      <ul className="space-y-2">
        {contacts.map((c) => (
          <li
            key={c.id}
            className={`flex items-center justify-between rounded-xl border p-3.5 transition-colors ${
              c.is_primary ? "border-[#f2dcba] bg-[#fdf5e6]/60 shadow-2xs" : "border-[#dfd8c8] bg-[#ffffff] shadow-2xs"
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-serif font-bold text-[#182615]">{c.name}</span>
                {c.is_primary && (
                  <span className="rounded-full bg-[#fdeed6] border border-[#f2dcba] px-2 py-0.5 text-[10px] font-bold text-[#965a12] font-mono">
                    ★ {t("customer_detail.primary_badge")}
                  </span>
                )}
                {c.title && <span className="text-xs text-[#576750]">· {c.title}</span>}
              </div>
              <div className="mt-1 text-xs text-[#576750] truncate font-mono">
                {[c.phone, c.email].filter(Boolean).join(" · ") || t("common.empty_dash")}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => togglePrimary(c)}
                title="Toggle primary contact"
                aria-label="Toggle primary contact"
                className={`rounded-lg border px-2 py-1 text-xs font-medium transition cursor-pointer ${
                  c.is_primary
                    ? "bg-[#fdf5e6] border-[#f2dcba] text-[#965a12]"
                    : "bg-[#ffffff] border-[#dfd8c8] text-[#576750] hover:bg-[#f7f4ed]"
                }`}
              >
                {c.is_primary ? "★" : "☆"}
              </button>
              <button
                type="button"
                onClick={() => openEdit(c)}
                className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#2d3e29] hover:bg-[#f7f4ed] hover:border-[#bcc6b1] transition cursor-pointer"
              >
                {t("common.edit")}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c)}
                className="rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#a13d28] hover:bg-[#faedea] hover:border-[#f0c7be] transition cursor-pointer"
              >
                {t("common.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {show && (
        <Modal
          open
          onClose={() => setShow(false)}
          title={editing ? t("common.edit") : t("customer_detail.add_contact")}
        >
          <form onSubmit={onSubmit} className="space-y-3.5">
            <FormField label={t("customer_detail.contact_name")} required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </FormField>
            <FormField label={t("customer_detail.contact_title")}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Giám đốc Tài chính (CFO)"
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label={t("customer_detail.contact_phone")}>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                />
              </FormField>
              <FormField label={t("customer_detail.contact_email")}>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cfo@company.vn"
                  type="email"
                />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-[#2d3e29] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={is_primary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded border-[#dfd8c8] text-[#265e2b] focus:ring-[#265e2b]"
              />{" "}
              {t("customer_detail.contact_is_primary")}
            </label>

            {err && (
              <p role="alert" className="rounded-xl bg-[#faedea] border border-[#f0c7be] p-2.5 text-xs font-semibold text-[#a13d28]">
                {err}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#eee8db]">
              <Button type="button" variant="secondary" onClick={() => setShow(false)} className="cursor-pointer">
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting} className="cursor-pointer">
                {submitting ? t("common.saving") : editing ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
