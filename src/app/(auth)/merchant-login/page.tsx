// src/app/(auth)/merchant-login/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function MerchantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const nextPath = "/merchant/onboarding";
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath
            )}`
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setStatus("error");
      setMessage(msg);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Merchant sign in</h1>
        <p className="text-sm text-gray-500 mb-6">We’ll email you a magic link.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              placeholder="owner@business.com"
            />
          </label>

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-lg bg-black text-white py-2.5 font-medium disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Email me a magic link"}
          </button>
        </form>

        {status === "error" && message && (
          <div className="mt-4 text-sm text-red-600">{message}</div>
        )}
      </div>
    </div>
  );
}
