"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"error" | "success" | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setMsgKind(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg(error.message);
      setMsgKind("error");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setMsgKind(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMsg(error.message);
      setMsgKind("error");
      setLoading(false);
      return;
    }
    if (data.session) {
      setMsg(t("auth.account_created_auto"));
      setMsgKind("success");
      router.push("/dashboard");
      router.refresh();
      setLoading(false);
      return;
    }
    if (data.user && !data.session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInErr && signInData.session) {
        setMsg(t("auth.account_created_auto"));
        setMsgKind("success");
        router.push("/dashboard");
        router.refresh();
        setLoading(false);
        return;
      }
      setMsg(t("auth.email_confirm_warning"));
      setMsgKind(signInErr ? "error" : "success");
      setMode("signin");
      setLoading(false);
      return;
    }
    setMsg(t("auth.account_created_manual"));
    setMsgKind("success");
    setMode("signin");
    setLoading(false);
  }

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#dfd8c8] bg-[#ffffff] p-8 shadow-[0_16px_40px_-18px_rgba(24,38,21,0.12),0_1px_3px_rgba(24,38,21,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#265e2b] text-[#faf8f2] font-serif font-bold text-lg shadow-sm">
              RM
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold tracking-tight text-[#182615] leading-tight">
                {t("auth.login_title")}
              </h1>
              <span className="text-[11px] text-[#576750] font-mono tracking-wider">
                GARDEN · WORKBENCH
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd8c8] bg-[#f7f4ed] px-2.5 py-1 text-xs font-semibold text-[#2d3e29] hover:bg-[#eee8db] transition"
          >
            <span>{lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}</span>
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#576750]">
          {t("auth.login_subtitle")}
        </p>

        {/* Tab switcher */}
        <div className="mt-6 flex rounded-full bg-[#f2efe6] p-1 border border-[#dfd8c8]/80">
          <button
            type="button"
            onClick={() => { setMode("signin"); setMsg(null); setMsgKind(null); }}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
              !isSignup
                ? "bg-[#ffffff] text-[#182615] shadow-xs border border-[#dfd8c8]/50"
                : "text-[#576750] hover:text-[#182615]"
            }`}
          >
            {t("auth.signin_tab")}
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setMsg(null); setMsgKind(null); }}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
              isSignup
                ? "bg-[#ffffff] text-[#182615] shadow-xs border border-[#dfd8c8]/50"
                : "text-[#576750] hover:text-[#182615]"
            }`}
          >
            {t("auth.signup_tab")}
          </button>
        </div>

        <form onSubmit={isSignup ? onSignUp : onSignIn} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-[#2d3e29] mb-1.5">
              {t("auth.email_label")}
            </label>
            <input
              id="auth-email"
              className="w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-2.5 text-sm text-[#182615] placeholder:text-[#a2ad9d] focus:border-[#265e2b] focus:outline-none focus:ring-3 focus:ring-[#265e2b]/15 transition"
              placeholder={t("auth.email_placeholder")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-[#2d3e29] mb-1.5">
              {t("auth.password_label")}
            </label>
            <input
              id="auth-password"
              className="w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-2.5 text-sm text-[#182615] placeholder:text-[#a2ad9d] focus:border-[#265e2b] focus:outline-none focus:ring-3 focus:ring-[#265e2b]/15 transition"
              placeholder={t("auth.password_placeholder")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
          </div>

          {msg && (
            <div
              role="alert"
              className={`text-xs rounded-lg border p-3 leading-relaxed font-medium ${
                msgKind === "error"
                  ? "text-[#a13d28] bg-[#faedea] border-[#f0c7be]"
                  : "text-[#1b6325] bg-[#eaf5eb] border-[#bde0c1]"
              }`}
            >
              {msg}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 text-sm font-semibold cursor-pointer"
          >
            {loading ? (isSignup ? t("auth.creating_account") : t("auth.signing_in")) : isSignup ? t("auth.signup_button") : t("auth.signin_button")}
          </Button>
        </form>

        <div className="mt-6 border-t border-[#eee8db] pt-4 text-center">
          <p className="text-xs text-[#576750]">
            {isSignup ? t("auth.already_have_account") : t("auth.no_account")}{" "}
            <button
              type="button"
              onClick={() => { setMode(isSignup ? "signin" : "signup"); setMsg(null); setMsgKind(null); }}
              className="font-semibold text-[#265e2b] hover:text-[#1d4821] hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] rounded px-1"
            >
              {isSignup ? t("auth.signin_link") : t("auth.create_link")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
