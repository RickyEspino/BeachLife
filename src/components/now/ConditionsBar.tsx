"use client";
import React from "react";

export interface ConditionsBarProps {
  tempC: number;
  condition?: string;
  windKph: number;
  beachScore: number; // 0-100
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-teal-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export const ConditionsBar: React.FC<ConditionsBarProps> = ({ tempC, condition, windKph, beachScore }) => {
  const tempF = Math.round((tempC * 9) / 5 + 32);
  const windMph = Math.round(windKph * 0.621371);
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-3 text-sm">
      <div className="flex items-baseline gap-1 font-semibold">
        <span className="text-2xl">{tempF}°</span>
        <span className="text-xs text-gray-500">F</span>
      </div>
      {condition && <div className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">{condition}</div>}
      <div className="flex items-center gap-1">
        <span className="font-medium">Wind</span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{windMph} mph</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Beach score</span>
        <div className="relative h-2 w-24 rounded-full bg-gray-200 overflow-hidden">
          <div className={`h-full ${scoreColor(beachScore)} transition-all`} style={{ width: `${beachScore}%` }} />
        </div>
        <span className="text-sm font-semibold tabular-nums">{beachScore}</span>
      </div>
    </div>
  );
};
