"use client";
export function FormField({ label, hint, error, children, required }: { label: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-700">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && !error && <span className="block text-xs text-zinc-400">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 bg-white ${props.className ?? ""}`} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 bg-white ${props.className ?? ""}`} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 bg-white ${props.className ?? ""}`} />;
}
