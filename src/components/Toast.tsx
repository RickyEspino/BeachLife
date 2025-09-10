"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type ToastProps = {
  kind?: "success" | "error" | "info";
  children: React.ReactNode;
  onClose?: () => void;
  duration?: number; // auto-close after N ms
};

export default function Toast({ kind = "info", children, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!onClose) return;
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const base =
    "fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg text-white animate-fade-in-up";
  const kindClasses =
    kind === "success"
      ? "bg-green-600"
      : kind === "error"
      ? "bg-red-600"
      : "bg-shell";

  return (
    <div className={`${base} ${kindClasses}`}>
      <span className="text-sm font-medium">{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 rounded-full p-1 hover:bg-white/20"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
