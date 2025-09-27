"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browserClient";

export function ResendMagicLink({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const onResend = async () => {
    setStatus("sending");
    setMsg("");
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setStatus("error");
        setMsg(error.message);
        return;
      }
      setStatus("sent");
      setMsg("Magic link re-sent. Check your inbox!");
    } catch (e: any) {
      setStatus("error");
      setMsg(e?.message ?? "Something went wrong.");
    }
  };

  return (
    <div className="mt-8">
      <button
        onClick={onResend}
        disabled={status === "sending"}
        className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 font-medium disabled:opacity-60"
      >
        {status === "sending" ? "Resending…" : "Resend link"}
      </button>

      {msg && (
        <div
          className={`mt-3 text-sm ${
            status === "error" ? "text-red-600" : "text-emerald-600"
          }`}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
