// src/app/(auth)/check-email/page.tsx
"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import { ResendMagicLink } from "@/components/ResendMagicLink";

function CheckEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [dots, setDots] = useState(".");
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const d = setInterval(() => setDots((p) => (p.length >= 3 ? "." : p + ".")), 500);
    const t = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4000);
    return () => { clearInterval(d); clearInterval(t); };
  }, []);

  // gentle session poll; remove if your callback already redirects
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) router.replace("/onboarding");
    };
    const i = setInterval(check, 3000);
    check();
    return () => { mounted = false; clearInterval(i); };
  }, [router]);

  return (
    <main className="relative min-h-dvh p-6">
      <div className="absolute inset-0 bg-black/25 pointer-events-none z-0" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl">
          <div className="p-6 text-center">
            {/* Spinner ring (kept small for a11y hint) */}
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-white/40 flex items-center justify-center">
              <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4A4 4 0 0 0 8 12H4z" />
              </svg>
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-white">Check your email {dots}</h1>
            <p className="mt-2 text-sm text-white/80">
              {email ? <>We sent a secure magic link to <span className="font-medium text-white">{email}</span>.</> : <>We sent a secure magic link to your inbox.</>}
              {" "}Open it on this device to finish signing in.
            </p>

            {/* 🌊 Beach-themed loader */}
            <BeachLoader />

            <p className="mt-4 text-xs text-white/70">{TIPS[tipIndex]}</p>

            <div className="mt-6 space-y-3">
              {email ? (
                <ResendMagicLink email={email} />
              ) : (
                <Link href="/login" className="inline-block rounded-lg border border-white/30 px-4 py-2 text-white/90 hover:bg-white/10">
                  Go back to login
                </Link>
              )}

              <div className="text-xs text-white/60">
                Not you?{" "}
                <Link href="/login" className="underline underline-offset-4 hover:text-emerald-300">
                  Use a different email
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-6 bottom-5 z-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-semibold italic text-white underline underline-offset-4 hover:underline-offset-2 hover:text-emerald-300 transition"
        >
          Back to home
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:-translate-x-1">←</span>
        </Link>
      </div>

      {/* Keyframes for shimmer/float/swim */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
        @keyframes swim {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .reduce-motion\\:static { animation: none !important; transform: none !important; }
        }
      `}</style>
    </main>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<main className="relative min-h-dvh p-6 flex items-center justify-center text-white">Loading…</main>}>
      <CheckEmailInner />
    </Suspense>
  );
}

function BeachLoader() {
  // Use emojis now; swap for <img src="/img/icons/shell.svg" /> later if you want
  const icons = ["🦀", "🐚", "🌊", "☀️", "🏝️"];

  return (
    <div className="mt-6">
      {/* “lane” they swim across */}
      <div className="relative mx-auto h-12 w-full overflow-hidden rounded-full bg-white/10">
        {/* multiple swimmers with staggered delays */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2">
          {icons.map((icon, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="mx-4 inline-block text-xl text-white/90"
              style={{
                animation: `swim 4.5s ${i * 0.25}s linear infinite, float 2.2s ${i * 0.2}s ease-in-out infinite`,
              }}
            >
              {icon}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-white/70">
        Waiting for your click… if it’s taking a while, try <span className="font-medium">Resend</span> below.
      </p>
    </div>
  );
}

const TIPS = [
  "Tip: Check your Spam/Promotions folder.",
  "If you requested the link on mobile, open it on the same device.",
  "Still waiting? Tap ‘Resend’ and try again.",
  "Gmail can batch similar emails—search for “BeachLife”.",
];
