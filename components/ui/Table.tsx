"use client";
export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-sm">{children}</table></div>;
}
export function Th({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-xs font-medium text-zinc-500 bg-zinc-50 border-b ${className}`}>{children}</th>;
}
export function Td({ children, className="" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 border-b last:border-0 ${className}`}>{children}</td>;
}
