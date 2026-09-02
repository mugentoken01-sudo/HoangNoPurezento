"use client";
import React, { useEffect, useState } from "react";

export function Toast({
  message,
  kind = "info",
  onDismiss,
}: {
  message: string;
  kind?: "info" | "success" | "error";
  onDismiss?: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!visible) return null;

  const styles =
    kind === "success"
      ? "bg-[#eaf5eb] border-[#bde0c1] text-[#1b6325]"
      : kind === "error"
      ? "bg-[#faedea] border-[#f0c7be] text-[#a13d28]"
      : "bg-[#ffffff] border-[#dfd8c8] text-[#182615]";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-[0_12px_30px_-10px_rgba(24,38,21,0.18)] animate-in fade-in slide-in-from-bottom-2 duration-200 ${styles}`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        aria-label="Đóng thông báo / Close notification"
        className="text-xs font-bold opacity-70 hover:opacity-100 transition-opacity ml-1 cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}

