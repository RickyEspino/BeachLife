"use client";
import React from "react";
import type { AdviceChip } from "@/lib/now/weatherAdvice";

interface AdviceChipsProps {
  advice: AdviceChip[];
}

const levelStyles: Record<AdviceChip["level"], string> = {
  positive: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  caution: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const AdviceChips: React.FC<AdviceChipsProps> = ({ advice }) => {
  if (!advice.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {advice.map((a) => (
        <span
          key={a.id}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1 ${levelStyles[a.level]}`}
        >
          {a.label}
        </span>
      ))}
    </div>
  );
};
