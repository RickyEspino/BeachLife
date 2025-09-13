// src/app/merchant/register/qr/[code]/qr-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

export default function QRClient({ data, expiresAt }: { data: string; expiresAt: number }) {
  const [png, setPng] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(data, { errorCorrectionLevel: "M", width: 256 }).then(setPng);
  }, [data]);

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const msLeft = Math.max(expiresAt - now, 0);
  const mm = Math.floor(msLeft / 60000);
  const ss = Math.floor((msLeft % 60000) / 1000)
    .toString()
    .padStart(2, "0");

  const expired = msLeft === 0;

  return (
    <div className="space-y-3">
      <div className={`inline-block rounded-2xl p-4 border ${expired ? "border-red-500/60" : "border-white/10"} bg-[var(--card)]`}>
        {png ? <img src={png} width={256} height={256} alt="QR code" /> : <div className="w-[256px] h-[256px] bg-white/5 animate-pulse rounded-xl" />}
      </div>
      <div className={`text-lg font-semibold ${expired ? "text-red-400" : "text-white/80"}`}>
        {expired ? "Expired" : `Expires in ${mm}:${ss}`}
      </div>
    </div>
  );
}
