"use client";
import React from "react";

export function FormField({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-semibold text-[#2d3e29]">
        {label}
        {required && <span className="text-[#a13d28]"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-[#576750] leading-relaxed">{hint}</span>}
      {error && <span role="alert" className="block text-xs font-semibold text-[#a13d28]">{error}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-2 text-sm text-[#182615] placeholder:text-[#a2ad9d] outline-none transition-all focus:border-[#265e2b] focus:ring-2 focus:ring-[#265e2b]/15 disabled:bg-[#f7f4ed] disabled:opacity-60 ${
        props.className ?? ""
      }`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-2 text-sm text-[#182615] placeholder:text-[#a2ad9d] outline-none transition-all focus:border-[#265e2b] focus:ring-2 focus:ring-[#265e2b]/15 disabled:bg-[#f7f4ed] disabled:opacity-60 ${
        props.className ?? ""
      }`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-[#dfd8c8] bg-[#ffffff] px-3.5 py-2 text-sm font-medium text-[#182615] outline-none transition-all focus:border-[#265e2b] focus:ring-2 focus:ring-[#265e2b]/15 disabled:bg-[#f7f4ed] disabled:opacity-60 ${
        props.className ?? ""
      }`}
    />
  );
}

