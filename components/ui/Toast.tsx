"use client";
import { useEffect, useState } from "react";
export function Toast({ message, kind="info", onDismiss }: { message: string; kind?: "info"|"success"|"error"; onDismiss?: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDismiss?.(); }, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  if (!visible) return null;
  const bg = kind === "success" ? "bg-emerald-600" : kind === "error" ? "bg-red-600" : "bg-zinc-900";
  return <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${bg}`}>{message}</div>;
}
