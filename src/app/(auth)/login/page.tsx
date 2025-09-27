// src/app/(auth)/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("sending");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      // Send users back to /auth/callback which will then redirect to /onboarding.
      const nextPath = "/onboarding";
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

      // ✅ Go to a dedicated confirmation page
      router.push(`/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message ?? "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">
          We’ll email you a secure magic link to sign in.
        </p>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring"
              placeholder="you@example.com"
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

        {/* Only show errors here */}
        {status === "error" && message && (
          <div className="mt-4 text-sm text-red-600">{message}</div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          By continuing you agree to receive a one-time sign-in link at the email
          provided.
        </div>
      </div>
    </div>
  );
}
