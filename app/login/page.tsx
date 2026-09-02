"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else router.push("/");
    setLoading(false);
  }

  async function onSignUp() {
    setLoading(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(error ? error.message : "Check your email to confirm, then sign in.");
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
      <h2 className="text-lg font-semibold">Sign in — RM Cockpit</h2>
      <p className="mt-1 text-xs text-zinc-500">Supabase Auth · email / password. RLS enforces owner_id = auth.uid().</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="w-full rounded-md border px-3 py-2 text-sm" placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        {msg && <p className="text-xs text-amber-600">{msg}</p>}
        <button disabled={loading} className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50">
          {loading ? "…" : "Sign in"}
        </button>
        <button type="button" onClick={onSignUp} className="w-full rounded-md border px-4 py-2 text-sm">Create account</button>
      </form>
      <p className="mt-4 text-xs text-zinc-400">Seed creates <code>rm@demo.local / Demo1234!</code> automatically.</p>
    </div>
  );
}
