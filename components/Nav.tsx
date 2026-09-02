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
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] transition-colors"
          title="Toggle Language"
        >
          <span>{lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
          <span className="text-[10px] text-[#576750] font-mono">({lang.toUpperCase()})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <nav className="flex items-center gap-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 ${
                active
                  ? "bg-[#265e2b] text-[#faf8f2] shadow-sm"
                  : "text-[#2d3e29] hover:bg-[#eee8db] hover:text-[#182615]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="h-4 w-[1px] bg-[#dfd8c8]" aria-hidden="true" />

      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] transition-colors"
          title="Chuyển đổi ngôn ngữ / Switch Language"
        >
          <span aria-hidden="true">{lang === "vi" ? "🇻🇳" : "🇬🇧"}</span>
          <span className="font-mono text-[11px]">{lang.toUpperCase()}</span>
        </button>

        {/* User / Sign Out */}
        {userEmail && (
          <span className="hidden lg:inline-block max-w-[140px] truncate text-xs text-[#576750] font-mono" title={userEmail}>
            {userEmail}
          </span>
        )}

        <button
          onClick={handleSignOut}
          className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1 text-xs font-semibold text-[#576750] shadow-2xs hover:bg-[#faedea] hover:text-[#a13d28] hover:border-[#f0c7be] transition-colors"
        >
          {t("nav.sign_out")}
        </button>
      </div>
    </div>
  );
}
