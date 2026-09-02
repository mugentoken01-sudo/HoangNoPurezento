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
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variants: Record<string, string> = {
    primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950 border border-transparent",
    secondary: "bg-white text-slate-800 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100",
    outline: "bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-100/60 active:bg-slate-100",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200/70 border border-transparent",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 border border-transparent",
  };

  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-9 px-4 text-sm gap-2",
    lg: "h-11 px-5 text-base gap-2.5",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
