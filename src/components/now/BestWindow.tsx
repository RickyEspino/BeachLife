// src/components/now/BestWindow.tsx
"use client";

interface BestWindowCore {
  start: Date | string;
  end: Date | string;
  score: number;
  reason: string;
}

export interface BestWindowProps {
  window: BestWindowCore | null;
  /** Optional display timezone (IANA), e.g. "America/New_York". If omitted, uses the browser's TZ. */
  displayTimeZone?: string;
}

export function BestWindow({ window, displayTimeZone }: BestWindowProps) {
  if (!window) return null;

  // --- helpers ---
  const toDate = (v: Date | string): Date => {
    if (v instanceof Date) return v;
    // Handle strings like "YYYY-MM-DDTHH:mm" (no Z): interpret as local *for display only*.
    // This matches the Open-Meteo `timezone` you requested when you built the times.
    // If your times are ISO with Z or offset, Date(...) will correctly parse it.
    return new Date(v);
  };

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      ...(displayTimeZone ? { timeZone: displayTimeZone } : {}),
    });

  const scoreColor = (score: number) => {
    if (score >= 80) return "bg-green-50 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-50 text-yellow-800 border-yellow-200";
    return "bg-gray-50 text-gray-800 border-gray-200";
  };

  const scorePill = (score: number) => {
    if (score >= 80) return { label: "Excellent", ring: "ring-green-200", pill: "bg-green-100 text-green-800" };
    if (score >= 60) return { label: "Good", ring: "ring-yellow-200", pill: "bg-yellow-100 text-yellow-800" };
    return { label: "Fair", ring: "ring-gray-200", pill: "bg-gray-100 text-gray-800" };
  };

  const start = toDate(window.start);
  const end = toDate(window.end);
  const { label, ring, pill } = scorePill(window.score);

  // Guard bad dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  return (
    <div
      className={`rounded-xl border p-4 ${scoreColor(window.score)} ring-1 ${ring}`}
      aria-label="Best beach activity window"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">Best Window</h3>
          <p className="text-sm opacity-90">
            {fmtTime(start)} – {fmtTime(end)}
          </p>
          <p className="text-xs opacity-80 capitalize mt-1">{window.reason}</p>
        </div>

        <div className="shrink-0 text-right">
          <div className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium border ${pill}`}>
            <span>{label}</span>
            <span aria-label="window score" title="Composite comfort score">
              {Math.round(window.score)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
