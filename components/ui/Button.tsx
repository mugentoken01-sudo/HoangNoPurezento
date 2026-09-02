"use client";
export function Button({ children, variant="primary", size="md", className="", ...props }: { children: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"; size?: "sm"|"md"; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string,string> = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800",
    secondary: "border bg-white hover:bg-zinc-50",
    ghost: "hover:bg-zinc-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<string,string> = { sm: "h-7 px-2.5 text-xs", md: "h-9 px-4" };
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
}
