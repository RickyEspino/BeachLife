// src/app/scan/page.tsx
"use client";

import { useRef, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

type State = "idle" | "processing" | "success" | "error" | "duplicate";

export default function ScanPage() {
  const [state, setState] = useState<State>("idle");
  const lastHash = useRef<string | null>(null);

  async function handleScan(result: string) {
    // Debounce & idempotency guard
    if (state === "processing") return;
    setState("processing");

    try {
      // Parse QR payload (expecting JSON with merchantId, hash, points, etc.)
      let payload: any;
      try {
        payload = JSON.parse(result);
      } catch {
        payload = { raw: result };
      }

      // Anti-double-scan by qr_hash (if present), otherwise by raw
      const hash = payload?.hash ?? result;
      if (lastHash.current === hash) {
        setState("duplicate");
        return;
      }

      const res = await fetch("/api/earn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      const data = await res.json();
      if (data?.ok) {
        lastHash.current = hash;
        setState("success");
      } else if (data?.error === "DUPLICATE") {
        setState("duplicate");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      // allow another scan after a short delay unless it was duplicate
      if (state !== "duplicate") {
        setTimeout(() => setState("idle"), 1200);
      }
    }
  }

  return (
    <div className="p-6 grid gap-4">
      <h1 className="text-2xl font-bold">Scan QR</h1>

      <div className="rounded-2xl overflow-hidden border border-white/10">
        <Scanner
          onScan={(results) => {
            // lib can return string or array; normalize to string
            const text =
              Array.isArray(results) ? results[0]?.rawValue ?? "" : String(results);
            if (text) handleScan(text);
          }}
          onError={() => {
            if (state !== "processing") setState("error");
          }}
          components={{ finder: true }} // show default finder
          constraints={{ facingMode: "environment" }}
        />
      </div>

      <Status state={state} />
    </div>
  );
}

function Status({ state }: { state: State }) {
  const base = "inline-block px-3 py-1 rounded-xl text-sm";
  if (state === "processing")
    return <span className={`${base} bg-white/10`}>Processing…</span>;
  if (state === "success")
    return <span className={`${base} bg-seafoam/20 border border-seafoam/40`}>Points added ✅</span>;
  if (state === "duplicate")
    return <span className={`${base} bg-white/10 border border-white/20`}>Already scanned</span>;
  if (state === "error")
    return <span className={`${base} bg-white/10 border border-white/20`}>Scan failed</span>;
  return <span className="text-white/60 text-sm">Point your camera at a BeachLife QR.</span>;
}
