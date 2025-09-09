"use client";

import { useState } from "react";

export default function RedeemForm() {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/voucher/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("Redeemed ✅");
        setCode("");
      } else {
        setMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={redeem} className="flex gap-2">
      <input
        className="flex-1 rounded-xl bg-transparent border border-white/10 p-3 font-mono"
        placeholder="Voucher code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
      />
      <button
        disabled={loading}
        className="rounded-xl bg-seafoam px-4 py-2 font-semibold"
      >
        {loading ? "Redeeming…" : "Redeem"}
      </button>
      {msg && <div className="self-center text-sm text-white/70 ml-3">{msg}</div>}
    </form>
  );
}
