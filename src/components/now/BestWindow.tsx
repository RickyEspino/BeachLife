interface BestWindowProps {
  window: {
    start: Date;
    end: Date;
    score: number;
    reason: string;
  } | null;
}

export function BestWindow({ window }: BestWindowProps) {
  if (!window) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Fair";
  };

  return (
    <div className={`rounded-xl border p-4 ${getScoreColor(window.score)}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Best Window</h3>
          <p className="text-sm opacity-90">
            {formatTime(window.start)} – {formatTime(window.end)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium opacity-75">
            {getScoreLabel(window.score)}
          </div>
          <div className="text-xs opacity-70 capitalize">
            {window.reason}
          </div>
        </div>
      </div>
    </div>
  );
}