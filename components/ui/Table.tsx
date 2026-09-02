"use client";
import React from "react";

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-[#dfd8c8] bg-[#ffffff] shadow-2xs ${className}`}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3.5 text-left text-[11px] font-mono font-bold tracking-wider text-[#576750] uppercase bg-[#faf8f3]/80 border-b border-[#eee8db] ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 border-b border-[#eee8db] text-[#182615] last:border-0 ${className}`}>{children}</td>;
}

