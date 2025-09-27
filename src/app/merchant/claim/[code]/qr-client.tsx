"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

type Props = {
  data: string;                 // URL encoded in QR (customer claim link)
  code: string;                 // token code to poll status
  expiresAt: string;            // ISO timestamp when token expires
  redirectAfter?: string;       // where the merchant is sent after redeem/expire
};

export default function QR({ data, code, expiresAt, redirectAfter = "/merchant/register" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  // Render QR
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data, { margin: 1, width: 240 });
  }, [data]);

  // Countdown
  useEffect(() => {
    const i = setInterval(() => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, diff));
    }, 250);
    return () => clearInterval(i);
  }, [expiresAt]);

  // Poll redemption status every 1.2s, redirect when redeemed or expired
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/merchant/claim/${code}/status`, { cache: "no-store" });
        if (!res.ok) throw new Error("status fetch failed");
        const json = await res.json();
        if (json.redeemed || Date.now() >= new Date(expiresAt).getTime()) {
          if (!stop) router.replace(redirectAfter);
          return;
        }
      } catch {
        // ignore transient errors
      }
      if (!stop) setTimeout(poll, 1200);
    };
    poll();
    return () => { stop = true; };
  }, [code, expiresAt, redirectAfter, router]);

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded-lg border" />
      <div className="mt-2 text-sm text-gray-600">
        Expires in <span className="font-medium">{secondsLeft}s</span>
      </div>
    </div>
  );
}
