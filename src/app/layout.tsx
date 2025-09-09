import "./globals.css";
import Link from "next/link";

export const metadata = { title: "BeachLife", description: "Lifestyle + Rewards" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
          <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold">🌴 BeachLife</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/settings" className="hover:underline">Settings</Link>
              <Link href="/login" className="rounded-lg bg-seafoam px-3 py-1.5 font-semibold">Sign in</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
