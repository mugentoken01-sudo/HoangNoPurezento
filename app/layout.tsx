import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { I18nProvider } from "@/lib/i18n";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RM Cockpit — Commercial Banking & Credit Operations",
  description: "Enterprise CRM and Credit Risk Intelligence Platform for Relationship Managers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-slate-900 selection:text-white">
        <I18nProvider>
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-semibold text-sm shadow-sm group-hover:bg-blue-600 transition-colors">
                    RM
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
                      RM Cockpit
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase hidden sm:block">
                      Banking CRM · Credit Risk
                    </span>
                  </div>
                </Link>
              </div>

              <Nav />
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-16">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
