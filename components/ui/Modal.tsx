"use client";
import React, { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-[#182615]/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-2xl border border-[#dfd8c8] bg-[#ffffff] shadow-[0_20px_50px_-20px_rgba(24,38,21,0.2),0_1px_3px_rgba(24,38,21,0.06)] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#eee8db] bg-[#faf8f3]/90 px-5 py-3.5 sticky top-0 z-10">
          <h3 className="text-sm sm:text-base font-serif font-bold text-[#182615] tracking-tight truncate pr-2">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại / Close dialog"
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-[#576750] hover:bg-[#eee8db] hover:text-[#182615] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

