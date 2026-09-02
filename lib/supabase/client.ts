import { createBrowserClient } from "@supabase/ssr";

function getUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
}
function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
}

export function createClient() {
  return createBrowserClient(getUrl(), getAnonKey());
}
