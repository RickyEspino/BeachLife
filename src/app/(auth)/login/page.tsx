// src/app/(auth)/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      const nextPath = "/onboarding";
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath
            )}`
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      router.push(`/check-email?email=${encodeURIComponent(trimmed)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setStatus("error");
      setMessage(msg);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <main className="relative min-h-dvh p-6 bg-[url('/img/backgrounds/waves.png')] bg-cover bg-center bg-no-repeat">
      {/* overlay for contrast */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none z-0" />

      {/* center wrapper */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] items-center justify-center">
        {/* glass card */}
        <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl">
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-white">Sign in</h1>
            <p className="mt-1 text-sm text-white/80">
              We’ll email you a secure magic link to sign in.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <label className="block">
                <span className="text-sm font-medium text-white">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    mt-1 w-full rounded-lg border border-white/30
                    bg-white/10 text-white placeholder-white/60
                    px-3 py-2 outline-none
                    focus:ring-2 focus:ring-emerald-400/60 focus:border-transparent
                  "
                  placeholder="you@example.com"
                />
              </label>

              <button
                type="submit"
                disabled={status === "sending"}
                className="
                  w-full rounded-lg bg-emerald-500 text-white py-2.5 font-medium
                  hover:bg-emerald-400 transition disabled:opacity-60
                  focus:outline-none focus:ring-2 focus:ring-emerald-400/60
                "
              >
                {status === "sending" ? "Sending…" : "Email me a magic link"}
              </button>
            </form>

            {status === "error" && message && (
              <div className="mt-4 text-sm text-red-300">{message}</div>
            )}

            {/* helper text */}
            <p className="mt-6 text-xs text-white/70">
              By continuing, you agree to the{" "}
              <Link
                className="underline underline-offset-4 hover:text-emerald-300"
                href="/terms"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                className="underline underline-offset-4 hover:text-emerald-300"
                href="/privacy"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* bottom-right hint link (optional) */}
      <div className="absolute right-6 bottom-5 z-10">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm font-semibold italic text-white underline underline-offset-4 hover:underline-offset-2 hover:text-emerald-300 transition"
        >
          Back to home
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:-translate-x-1"
          >
            ←
          </span>
        </Link>
      </div>
    </main>
  );
}
