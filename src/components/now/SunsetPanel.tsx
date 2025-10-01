"use client";

import { useEffect, useState } from "react";

interface SunsetPanelProps {
  sunsetTime: Date;
  quality: {
    score: number;
    label: string;
    timeUntil: string;
  };
}

export function SunsetPanel({ sunsetTime, quality }: SunsetPanelProps) {
  const [timeUntil, setTimeUntil] = useState(quality.timeUntil);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const msUntil = sunsetTime.getTime() - now.getTime();
      
      if (msUntil < 0) {
        setTimeUntil("Set");
        return;
      }
      
      const hoursUntil = msUntil / (1000 * 60 * 60);
      if (hoursUntil < 1) {
        const minutesUntil = Math.round(msUntil / (1000 * 60));
        setTimeUntil(`${minutesUntil}m`);
      } else {
        const hours = Math.floor(hoursUntil);
        const minutes = Math.round((hoursUntil - hours) * 60);
        setTimeUntil(`${hours}h ${minutes}m`);
      }
    };

    const interval = setInterval(updateCountdown, 60000); // Update every minute
    updateCountdown(); // Initial update

    return () => clearInterval(interval);
  }, [sunsetTime]);

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return "text-orange-600";
    if (score >= 0.5) return "text-amber-600";
    return "text-gray-600";
  };

  return (
    <div className="rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🌅</span>
          <div>
            <h3 className="font-semibold text-gray-900">Sunset</h3>
            <p className="text-sm text-gray-600">
              in <span className="font-medium">{timeUntil}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${getQualityColor(quality.score)}`}>
            {quality.label}
          </p>
          <p className="text-xs text-gray-500">
            {sunsetTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </p>
        </div>
      </div>
    </div>
  );
}