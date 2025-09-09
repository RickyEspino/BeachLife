"use client";

import { useRef, useState } from "react";
import { QrScanner } from "@yudiel/react-qr-scanner";

type State = "idle" | "processing" | "success" | "error" | "duplicate";

export default function ScanPage() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string>("");
  const lockRef = useRef(false); // anti double-tap lock

  async function handleDecode(text: string) {
    if (lockRef.current) return;           // UI guard
    lockRef.current = true;
    setState("processing"); setMessage("");

    try {
      const res = await fetch("/api/earn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: text }),
      });
      const data = await res.json();

      if (data.ok) {
        setState("success");
        setMessage(`+${data.awarded} points! New balance: ${data.balance}`);
      } else if (data.error === "DUPLICATE") {
        setState("duplicate");
        setMessage("Already credited for this QR.");
      } else {
        setState("error");
        setMessage(`Failed: ${data.error ?? "Unknown"}`);
      }
    } catch (e: any) {
      setState("error");
      setMessage(e?.message ?? "Network error");
    } finally {
      // small delay before releasing to avoid rapid rescans
      setTimeout(() => { lockRef.current = false; }, 1200);
    }
  }

  return (
    <div className="grid gap-4 p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Scan to Earn</h1>

      <div className="rounded-2xl overflow-hidden border border-white/10">
        <QrScanner
          onDecode={handleDecode}
          onError={() => {}}
          constraints={{ facingMode: "environment" }}
          containerStyle={{ width: "100%", height: 320, background: "black" }}
        />
      </div>

      {state !== "idle" && (
        <div className={`rounded-xl p-3 ${
          state === "success" ? "bg-green-600/20 border border-green-500/40" :
          state === "duplicate" ? "bg-yellow-600/20 border border-yellow-500/40" :
          state === "processing" ? "bg-blue-600/20 border border-blue-500/40" :
          "bg-red-600/20 border border-red-500/40"
        }`}>
          <p className="font-medium">{message || (state === "processing" ? "Processing…" : "")}</p>
        </div>
      )}

      <p className="text-white/60 text-sm">
        Tip: Ensure camera permission is allowed in your browser. If scanning is sluggish,
        increase ambient light and keep the code steady within the frame.
      </p>
    </div>
  );
}
