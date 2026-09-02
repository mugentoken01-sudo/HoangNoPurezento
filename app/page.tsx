import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">RM Cockpit — Module 2 Live</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Module 1 (Data + Auth + API) is live on Supabase. Module 2 adds the full Customer UI — list, profile, contacts, notes, unified feed, and tasks — all on top of <code className="rounded bg-zinc-100 px-1 py-0.5">app/api/*</code>. No direct Supabase queries from the client.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/customers" className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white">→ Customers</Link>
          <Link href="/pipeline" className="rounded-md border bg-white px-4 py-2 text-sm">Pipeline (M3 stub)</Link>
          <Link href="/dashboard" className="rounded-md border bg-white px-4 py-2 text-sm">Dashboard (M4 stub)</Link>
          <a href="/api/health" className="rounded-md border px-4 py-2 text-sm">GET /api/health</a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Customers", href: "/customers", desc: "List · filter by stage/industry · create/edit" },
          { title: "Contacts", href: "/customers", desc: "Per-customer contacts on profile (is_primary)" },
          { title: "Notes", href: "/customers", desc: "Note form + next_action → feed" },
          { title: "Tasks", href: "/customers", desc: "Manual create + status toggle · auto badge" },
          { title: "Activity Feed", href: "/customers", desc: "Notes + Tasks + Stage — one timeline (lib/feed.ts)" },
          { title: "Stage Control", href: "/customers", desc: "Stopgap dropdown → POST /stage (M3 → Kanban)" },
          { title: "Financial Statements", href: "/api/financial-statements", desc: "BCTC per period (API, M5 UI later)" },
          { title: "Pipeline History", href: "/api/pipeline-history", desc: "Stage transitions (merged into feed)" },
        ].map((c) => (
          <a key={c.title} href={c.href} className="rounded-lg border bg-white p-4 hover:bg-zinc-50">
            <div className="text-sm font-medium">{c.title}</div>
            <div className="text-xs text-zinc-500">{c.desc}</div>
            <div className="mt-2 text-xs font-mono text-zinc-400">{c.href}</div>
          </a>
        ))}
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h3 className="text-sm font-semibold">Module 2 walkthrough (click-through, no curl)</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-600">
          <li><Link href="/customers" className="underline">Create customer</Link> “Công ty ABC” (Phân phối, 80B, VLĐ 5B, BIDV)</li>
          <li>Open profile → add contact (is_primary) · add note with next_action</li>
          <li>Stage control: Lead → Meeting → Credit — verify 4 auto-tasks appear in both task list and feed</li>
          <li>Toggle a task to done — updates without reload (optimistic → refetch)</li>
          <li>Reload — everything persists; log out → <code className="rounded bg-zinc-100 px-1">/customers</code> redirects to <code className="rounded bg-zinc-100 px-1">/login</code></li>
        </ol>
      </section>
    </div>
  );
}
