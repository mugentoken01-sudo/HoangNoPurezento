import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Unified env: supports both legacy (NEXT_PUBLIC_*) and new (@supabase/server) naming
function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
}
function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
}
function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "";
}

export async function createClient() {
  const cookieStore = cookies();
  return createServerClient(getSupabaseUrl(), getAnonKey(), {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* called from Server Component — ignore */ }
      },
    },
  });
}

// Service-role client for seed / admin tasks — bypasses RLS intentionally
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
export function createServiceClient() {
  const url = getSupabaseUrl();
  const key = getServiceKey();
  if (!url || !key || key.includes("REPLACE_WITH")) {
    throw new Error("Missing Supabase URL/service key — fill .env.local with full SUPABASE_SECRET_KEY from Dashboard → API Keys");
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
