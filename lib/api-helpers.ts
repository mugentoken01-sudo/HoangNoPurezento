import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export function error(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase, error: error?.message ?? "Unauthorized" };
  return { user, supabase, error: null };
}

export function zodError(e: { issues: { path: (string|number)[]; message: string }[] }) {
  return error("Validation failed", 400, e.issues.map(i => ({ path: i.path.join("."), message: i.message })));
}

// Strip owner_id from client payload — server sets it from auth.uid()
export function withOwner<T extends Record<string, unknown>>(body: T, ownerId: string): T & { owner_id: string } {
  const { owner_id: _ignored, ...rest } = body as Record<string, unknown>;
  return { ...(rest as T), owner_id: ownerId };
}
