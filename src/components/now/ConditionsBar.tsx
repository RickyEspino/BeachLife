"use client";
import React from "react";

export interface ConditionsBarProps {
  tempC: number;
  condition?: string;
  windKph: number;
  windDirDeg?: number; // degrees
  humidity?: number; // %
  aqi?: number; // US AQI
  pollenLevel?: string; // Low/Moderate/High
  beachScore: number; // 0-100
}

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-teal-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function dirLabel(deg?: number) {
  if (deg == null || isNaN(deg)) return undefined;
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

function aqiBadge(aqi?: number) {
  if (aqi == null) return { label: "AQI —", className: "bg-gray-100 text-gray-600" };
  if (aqi <= 50) return { label: `AQI ${aqi}`, className: "bg-emerald-500 text-white" };
  if (aqi <= 100) return { label: `AQI ${aqi}`, className: "bg-amber-500 text-white" };
  if (aqi <= 150) return { label: `AQI ${aqi}`, className: "bg-orange-500 text-white" };
  if (aqi <= 200) return { label: `AQI ${aqi}`, className: "bg-red-500 text-white" };
  return { label: `AQI ${aqi}`, className: "bg-purple-600 text-white" };
}

export const ConditionsBar: React.FC<ConditionsBarProps> = ({ tempC, condition, windKph, windDirDeg, humidity, aqi, pollenLevel, beachScore }) => {
  const tempF = Math.round((tempC * 9) / 5 + 32);
  const windMph = Math.round(windKph * 0.621371);
  const windDir = dirLabel(windDirDeg);
  const aqiInfo = aqiBadge(aqi);
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-3 text-sm">
      <div className="flex items-baseline gap-1 font-semibold">
        <span className="text-2xl text-black">{tempF}°</span>
        <span className="text-xs text-gray-500">F</span>
      </div>
      {condition && <div className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">{condition}</div>}
      <div className="flex items-center gap-1">
        <span className="font-medium text-black">Wind</span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{windMph} mph{windDir && <span className="ml-1 text-xs text-gray-500">{windDir}</span>}</span>
      </div>
      {humidity != null && (
        <div className="flex items-center gap-1">
          <span className="font-medium text-black">Hum</span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{Math.round(humidity)}%</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        <span className="font-medium text-black">Air</span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${aqiInfo.className}`}>{aqiInfo.label}</span>
      </div>
      {pollenLevel && (
        <div className="flex items-center gap-1">
          <span className="font-medium">Pollen</span>
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{pollenLevel}</span>
        </div>
      )}
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
