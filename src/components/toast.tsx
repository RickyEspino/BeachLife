// src/components/Toast.tsx
"use client";

import * as React from "react";

export default function Toast({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), 2000);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[1000]">
      <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 shadow-lg px-4 py-3">
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
