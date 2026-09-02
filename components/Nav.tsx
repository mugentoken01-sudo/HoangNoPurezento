"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ApiKeyModal, getCustomGeminiKey } from "@/components/settings/ApiKeyModal";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useI18n();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    function updateKeyStatus() {
      setHasApiKey(Boolean(getCustomGeminiKey()));
    }
    updateKeyStatus();
    window.addEventListener("gemini-key-updated", updateKeyStatus);
    window.addEventListener("storage", updateKeyStatus);
    return () => {
      window.removeEventListener("gemini-key-updated", updateKeyStatus);
      window.removeEventListener("storage", updateKeyStatus);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email);
    });
  }, [pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const links = [
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/customers", label: t("nav.customers") },
    { href: "/pipeline", label: t("nav.pipeline") },
    { href: "/settings", label: t("nav.settings") ?? "Settings" },
  ];

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login") {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] transition-colors cursor-pointer"
          title="Toggle Language"
          aria-label="Chuyển đổi ngôn ngữ / Switch Language"
        >
          <span>{lang === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
          <span className="text-[10px] text-[#576750] font-mono">({lang.toUpperCase()})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <nav className="hidden md:flex items-center gap-1" aria-label="Desktop Navigation">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
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

      <div className="hidden md:block h-4 w-[1px] bg-[#dfd8c8]" aria-hidden="true" />

      <div className="hidden md:flex items-center gap-2">
        <button
          type="button"
          onClick={() => setApiKeyModalOpen(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] ${
            hasApiKey
              ? "border-[#c0dec0] bg-[#edf5ed] text-[#1b4e20] hover:bg-[#e2efe2]"
              : "border-[#dfd8c8] bg-[#ffffff] text-[#576750] hover:bg-[#f5f1e8]"
          }`}
          title="Cấu hình Google Gemini AI Key / Configure AI Key"
        >
          <span aria-hidden="true">{hasApiKey ? "🟢" : "🔑"}</span>
          <span>AI Key</span>
          {hasApiKey && <span className="text-[10px] font-mono text-[#265e2b] font-bold">BYOK</span>}
        </button>

        <button
          type="button"
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-2.5 py-1 text-xs font-semibold text-[#182615] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] transition-colors cursor-pointer"
          title="Chuyển đổi ngôn ngữ / Switch Language"
          aria-label={`Ngôn ngữ hiện tại: ${lang.toUpperCase()}. Bấm để chuyển.`}
        >
          <span aria-hidden="true">{lang === "vi" ? "🇻🇳" : "🇬🇧"}</span>
          <span className="font-mono text-[11px]">{lang.toUpperCase()}</span>
        </button>

        {userEmail && (
          <span
            className="hidden lg:inline-block max-w-[140px] truncate text-xs text-[#576750] font-mono"
            title={userEmail}
          >
            {userEmail}
          </span>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-[#dfd8c8] bg-[#ffffff] px-3 py-1 text-xs font-semibold text-[#576750] shadow-2xs hover:bg-[#faedea] hover:text-[#a13d28] hover:border-[#f0c7be] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a13d28] transition-colors cursor-pointer"
        >
          {t("nav.sign_out")}
        </button>
      </div>

      <div className="flex md:hidden items-center gap-2">
        <button
          type="button"
          onClick={() => setApiKeyModalOpen(true)}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold shadow-2xs ${
            hasApiKey
              ? "border-[#c0dec0] bg-[#edf5ed] text-[#1b4e20]"
              : "border-[#dfd8c8] bg-[#ffffff] text-[#576750]"
          }`}
          aria-label="Cấu hình AI Key"
        >
          <span aria-hidden="true">🔑</span>
          <span className="text-[10px] font-bold">{hasApiKey ? "BYOK" : "Key"}</span>
        </button>

        <button
          type="button"
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="inline-flex items-center gap-1 rounded-full border border-[#dfd8c8] bg-[#ffffff] px-2 py-1 text-xs font-semibold text-[#182615] shadow-2xs"
          aria-label="Switch Language"
        >
          <span aria-hidden="true">{lang === "vi" ? "🇻🇳" : "🇬🇧"}</span>
          <span className="font-mono text-[10px]">{lang.toUpperCase()}</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-expanded={mobileMenuOpen}
          aria-label="Mở menu điều hướng / Toggle navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfd8c8] bg-[#ffffff] text-[#182615] shadow-2xs hover:bg-[#f5f1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] cursor-pointer"
        >
          <span className="text-base font-bold">{mobileMenuOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[60px] z-50 border-b border-[#dfd8c8] bg-[#f7f4ed]/98 backdrop-blur-lg px-4 py-5 shadow-lg md:hidden animate-in slide-in-from-top-2 duration-150"
          role="navigation"
          aria-label="Mobile Navigation"
        >
          <div className="space-y-2">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#265e2b] text-[#faf8f2]"
                      : "bg-[#ffffff] border border-[#dfd8c8] text-[#182615] hover:bg-[#eee8db]"
                  }`}
                >
                  <span>{l.label}</span>
                  <span>→</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setApiKeyModalOpen(true);
              }}
              className="w-full flex items-center justify-between rounded-xl border border-[#dfd8c8] bg-[#ffffff] px-4 py-3 text-sm font-semibold text-[#182615] hover:bg-[#eee8db] transition"
            >
              <span className="flex items-center gap-2">
                <span>🔑</span>
                <span>{lang === "vi" ? "Cấu hình Gemini AI Key" : "Configure Gemini AI Key"}</span>
              </span>
              <span className="text-xs font-mono text-[#265e2b] font-bold">
                {hasApiKey ? "BYOK (Active)" : "None"}
              </span>
            </button>

            <div className="pt-3 border-t border-[#dfd8c8] flex flex-col gap-2">
              {userEmail && (
                <div className="px-1 text-xs text-[#576750] font-mono truncate">
                  RM: {userEmail}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full rounded-xl border border-[#f0c7be] bg-[#faedea] px-4 py-2.5 text-xs font-bold text-[#a13d28] hover:bg-[#f7ded7] text-center transition"
              >
                {t("nav.sign_out")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />
    </div>
  );
}
