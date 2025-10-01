import type { StreakData } from "@/lib/now/streak";
import { getStreakBadge } from "@/lib/now/streak";

interface StreakCardProps {
  streak: StreakData;
}

export function StreakCard({ streak }: StreakCardProps) {
  const badge = getStreakBadge(streak.current);
  
  const CircularProgress = ({ progress, size = 60 }: { progress: number; size?: number }) => {
    const radius = (size - 8) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="text-teal-500 transition-all duration-500 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{streak.current}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 to-emerald-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Beach Streak</h3>
          <p className="text-sm text-gray-600">{streak.motivation}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{badge.emoji}</span>
          <div className="text-right">
            <p className={`text-xs font-medium ${badge.color}`}>{badge.title}</p>
            <p className="text-xs text-gray-500">Level</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CircularProgress progress={streak.progress} size={60} />
          <div className="space-y-1">
            <div className="text-xs text-gray-600">
              Next milestone: <span className="font-medium">{streak.nextMilestone} days</span>
            </div>
            <div className="text-xs text-gray-500">
              Longest: {streak.longest} • This week: {streak.thisWeek}
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{streak.current} days</span>
          <span>{streak.nextMilestone} days</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${streak.progress * 100}%` }}
          />
        </div>
      </div>

      {streak.current > 0 && (
        <div className="mt-3 flex justify-center">
          <button className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            View streak history →
          </button>
        </div>
      )}
    </div>
  );
}