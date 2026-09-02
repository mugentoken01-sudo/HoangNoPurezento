import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = { title: "RM Cockpit", description: "RM Cockpit — Module 1 & 2: CRM for banking RMs" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-6">
              <span className="text-sm font-semibold tracking-tight">RM Cockpit</span>
              <Nav />
            </div>
            <span className="hidden text-xs text-zinc-400 sm:block">Module 2 — Customer UI</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
