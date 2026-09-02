import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { I18nProvider } from "@/lib/i18n";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RM Cockpit — Commercial Banking & Credit Operations",
  description: "Enterprise CRM and Credit Risk Intelligence Platform for Relationship Managers (Garden Theme)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="garden">
      <body className="min-h-screen bg-[#f7f4ed] text-[#182615] antialiased selection:bg-[#265e2b] selection:text-[#faf8f2]">
        <I18nProvider>
          <header className="sticky top-0 z-40 border-b border-[#dfd8c8]/90 bg-[#f7f4ed]/90 backdrop-blur-md shadow-[0_1px_3px_0_rgba(24,38,21,0.03)]">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-2.5 group">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#265e2b] text-[#faf8f2] font-serif font-bold text-base shadow-sm group-hover:bg-[#1d4821] transition-colors">
                    RM
                  </div>
                  <div>
                    <span className="text-base font-serif font-semibold tracking-tight text-[#182615] block leading-tight">
                      RM Cockpit
                    </span>
                    <span className="text-[10px] text-[#576750] font-mono tracking-wider uppercase hidden sm:block">
                      Botanical Banking Almanac
                    </span>
                  </div>
                </Link>
              </div>

              <Nav />
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8 pb-20">{children}</main>
        </I18nProvider>
      </body>
    </html>
  );
}
