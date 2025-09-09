"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<any>(null);

  // Check session on load
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });
  }, [supabase]);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      alert(error.message);
    } else {
      alert("Check your email for the magic link.");
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  }

  if (user) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-soft text-center">
          <h2 className="text-2xl font-bold mb-4">Welcome back, {user.email} 🌊</h2>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full rounded-xl bg-seafoam p-3 font-semibold mb-3"
          >
            Go to Dashboard
          </button>
          <button
            onClick={signOut}
            className="w-full rounded-xl bg-red-500 p-3 font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-[var(--card)] p-6 shadow-soft">
        <h1 className="text-2xl font-bold mb-4">Welcome to BeachLife</h1>

        <form onSubmit={signInWithEmail} className="space-y-3">
          <input
            type="email"
            required
            className="w-full rounded-xl bg-transparent border border-white/10 p-3"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-sunset p-3 font-semibold"
          >
            Continue with Email
          </button>
        </form>

        <div className="my-4 text-center text-white/60">or</div>

        <button
          onClick={signInWithGoogle}
          className="w-full rounded-xl bg-seafoam p-3 font-semibold"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
