"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, [pathname]);

  const links = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/customers", label: t("nav.customers") },
    { href: "/pipeline", label: t("nav.pipeline") },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // If on login page, don't show internal navigation links
  if (pathname === "/login") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          title="Toggle Language"
        >
          <span>{lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
          <span className="text-[10px] text-slate-400 font-mono">({lang.toUpperCase()})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <nav className="flex items-center gap-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="h-4 w-[1px] bg-slate-200" aria-hidden="true" />

      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
          title="Chuyển đổi ngôn ngữ / Switch Language"
        >
          <span aria-hidden="true">{lang === "vi" ? "🇻🇳" : "🇬🇧"}</span>
          <span className="font-semibold">{lang.toUpperCase()}</span>
        </button>

        {/* User / Sign Out */}
        {userEmail && (
          <span className="hidden lg:inline-block max-w-[140px] truncate text-xs text-slate-500 font-mono" title={userEmail}>
            {userEmail}
          </span>
        )}

        <button
          onClick={handleSignOut}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-red-600 transition-colors"
        >
          {t("nav.sign_out")}
        </button>
      </div>
    </div>
  );
}
