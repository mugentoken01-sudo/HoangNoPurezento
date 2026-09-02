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
      <div className="w-full max-w-md rounded-xl border border-slate-200/90 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm">
              RM
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                {t("auth.login_title")}
              </h1>
              <span className="text-[11px] text-slate-500 font-medium tracking-wide">
                Commercial Banking Platform
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLang(lang === "vi" ? "en" : "vi")}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <span>{lang === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}</span>
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {t("auth.login_subtitle")}
        </p>

        {/* Tab switcher */}
        <div className="mt-6 flex rounded-lg bg-slate-100 p-1 border border-slate-200/60">
          <button
            type="button"
            onClick={() => { setMode("signin"); setMsg(null); setMsgKind(null); }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              !isSignup
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("auth.signin_tab")}
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setMsg(null); setMsgKind(null); }}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
              isSignup
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("auth.signup_tab")}
          </button>
        </div>

        <form onSubmit={isSignup ? onSignUp : onSignIn} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t("auth.email_label")}
            </label>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              placeholder={t("auth.email_placeholder")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t("auth.password_label")}
            </label>
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
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
              className={`text-xs rounded-md border px-3 py-2.5 leading-relaxed ${
                msgKind === "error"
                  ? "text-red-700 bg-red-50 border-red-200"
                  : "text-emerald-700 bg-emerald-50 border-emerald-200"
              }`}
            >
              {msg}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 text-sm font-semibold"
          >
            {loading ? (isSignup ? t("auth.creating_account") : t("auth.signing_in")) : isSignup ? t("auth.signup_button") : t("auth.signin_button")}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500">
            {isSignup ? t("auth.already_have_account") : t("auth.no_account")}{" "}
            <button
              type="button"
              onClick={() => { setMode(isSignup ? "signin" : "signup"); setMsg(null); setMsgKind(null); }}
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              {isSignup ? t("auth.signin_link") : t("auth.create_link")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
