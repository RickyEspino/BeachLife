// src/components/Header.tsx
import Link from "next/link";
import AdminNavLink from "@/components/AdminNavLink";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur bg-black/30 border-b border-white/10">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold">🌴 BeachLife</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/merchants" className="hover:underline">Merchants</Link>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <Link href="/settings" className="hover:underline">Settings</Link>
          {/* Only shows for admins */}
          {/* @ts-expect-error Async Server Component */}
          <AdminNavLink />
          <Link
            href="/login"
            className="rounded-lg bg-seafoam px-3 py-1.5 font-semibold"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
