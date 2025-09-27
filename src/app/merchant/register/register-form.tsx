"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { merchantId: string };

export default function RegisterForm({ merchantId }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");

  const setQuick = (v: number) => setAmount(String(v.toFixed(2)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dollars = parseFloat((amount || "0").replace(/[^0-9.]/g, ""));
    const cents = Math.round((isNaN(dollars) ? 0 : dollars) * 100);

    const res = await fetch("/merchant/register/create", {
      method: "POST",
      body: JSON.stringify({ merchantId, amount_cents: cents }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const msg = await res.text();
      alert(msg || "Failed to create claim code");
      return;
    }
    const { code } = await res.json();
    router.push(`/merchant/claim/${code}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium">Amount (USD)</span>
        <input
          inputMode="decimal"
          pattern="[0-9.]*"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring text-2xl font-semibold"
        />
      </label>

      {/* Quick buttons for mobile */}
      <div className="grid grid-cols-4 gap-2">
        {[5, 10, 20, 50].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setQuick(n)}
            className="rounded-lg border px-3 py-2 font-medium"
          >
            ${n}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-black text-white py-3 font-medium"
      >
        Generate claim QR
      </button>

      <p className="text-xs text-gray-500">
        Conversion: <strong>$1 = 1 point</strong>.
      </p>
    </form>
  );
}
