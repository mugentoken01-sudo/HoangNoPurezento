"use client";
import React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline" | "terracotta";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#265e2b] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variants: Record<string, string> = {
    primary:
      "bg-[#265e2b] text-[#faf8f2] shadow-sm hover:bg-[#1d4821] active:bg-[#153618] border border-transparent rounded-[var(--radius-btn,0.4375rem)] font-semibold",
    terracotta:
      "bg-[#b04e33] text-[#faf8f2] shadow-sm hover:bg-[#943f27] active:bg-[#78321e] border border-transparent rounded-[var(--radius-btn,0.4375rem)] font-semibold",
    secondary:
      "bg-[#ffffff] text-[#182615] border border-[#dfd8c8] shadow-2xs hover:bg-[#f5f1e8] hover:border-[#bcc6b1] active:bg-[#eee8db] rounded-[var(--radius-btn,0.4375rem)]",
    outline:
      "bg-transparent text-[#2d3e29] border border-[#dfd8c8] hover:bg-[#f5f1e8] active:bg-[#eee8db] rounded-[var(--radius-btn,0.4375rem)]",
    ghost:
      "bg-transparent text-[#2d3e29] hover:bg-[#f0ebe0] active:bg-[#e6decb] border border-transparent rounded-[var(--radius-btn,0.4375rem)]",
    danger:
      "bg-[#a13d28] text-[#faf8f2] shadow-sm hover:bg-[#86301d] active:bg-[#6b2516] border border-transparent rounded-[var(--radius-btn,0.4375rem)] font-semibold",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2.5",
  };

  return (
    <button className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
