"use client";

import * as React from "react";

type ToastProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  variant?: "success" | "error" | "info";
  durationMs?: number; // auto-close
};

export default function Toast({
  open,
  onClose,
  title,
  description,
  variant = "info",
  durationMs = 2500,
}: ToastProps) {
  const [show, setShow] = React.useState(open);

  React.useEffect(() => setShow(open), [open]);

  React.useEffect(() => {
    if (!show || !durationMs) return;
    const t = setTimeout(() => {
      setShow(false);
      onClose?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [show, durationMs, onClose]);

  if (!show) return null;

  const bg =
    variant === "success"
      ? "bg-green-600"
      : variant === "error"
      ? "bg-red-600"
      : "bg-slate-800";

  return (
    <div className="fixed inset-x-0 top-3 z-[9999] flex justify-center px-4">
      <div className={`flex items-start gap-3 text-white shadow-lg rounded-xl px-4 py-3 ${bg}`}>
        <div>
          {title && <div className="font-semibold">{title}</div>}
          {description && <div className="text-sm opacity-90">{description}</div>}
        </div>
        <button
          aria-label="Close"
          onClick={() => {
            setShow(false);
            onClose?.();
          }}
          className="ml-1 text-white/90 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
