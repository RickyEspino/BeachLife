"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IssueVoucherButton({ merchantId }:{ merchantId: string }) {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const router = useRouter();

  async function issue() {
    setLoading(true);
    try {
      const res = await fetch("/api/voucher/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ merchantId }),
      });
      const data = await res.json();
      if (data.ok) {
        setCode(data.code);
        // optional: go to voucher page
        router.push(`/vouchers/${data.code}`);
      } else {
        alert(`Could not issue: ${data.error}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={issue}
      disabled={loading}
      className="mt-3 rounded-xl bg-sunset px-4 py-2 font-semibold"
    >
      {loading ? "Issuing…" : (code ? "Issued!" : "Get voucher")}
    </button>
  );
}

