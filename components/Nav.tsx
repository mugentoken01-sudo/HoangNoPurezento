"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/", label: "Overview" },
  { href: "/customers", label: "Customers" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="flex items-center gap-1">
      {links.map(l => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        const stubbed = (l.href === "/pipeline" || l.href === "/dashboard");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-1.5 text-sm ${active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"} ${stubbed ? "opacity-60" : ""}`}
            title={stubbed ? "Stub — Module 3/4 will build this" : undefined}
          >
            {l.label}{stubbed && <span className="ml-1 text-[10px] opacity-60">soon</span>}
          </Link>
        );
      })}
      <button
        onClick={async () => { const s = createClient(); await s.auth.signOut(); router.push("/login"); router.refresh(); }}
        className="ml-2 rounded-md border px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
      >
        Sign out
      </button>
    </nav>
  );
}
