interface TidePanelProps {
  phase: {
    current: 'rising' | 'falling';
    nextTide: {
      time: string;
      height: number;
      type: 'high' | 'low';
    };
    phase: 'low' | 'mid-rising' | 'high' | 'mid-falling';
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  };
  advice: string[];
}

export function TidePanel({ phase, advice }: TidePanelProps) {
  const getPhaseIcon = () => {
    switch (phase.phase) {
      case 'low': return '🌊';
      case 'mid-rising': return '📈';
      case 'high': return '🌊🌊';
      case 'mid-falling': return '📉';
      default: return '🌊';
    }
  };

  const getQualityColor = () => {
    switch (phase.quality) {
      case 'excellent': return 'text-emerald-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatNextTide = () => {
    const nextTime = new Date(phase.nextTide.time);
    const now = new Date();
    const minutesUntil = Math.floor((nextTime.getTime() - now.getTime()) / (1000 * 60));
    
    if (minutesUntil < 60) {
      return `${minutesUntil}m`;
    } else {
      const hours = Math.floor(minutesUntil / 60);
      const mins = minutesUntil % 60;
      return `${hours}h ${mins}m`;
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{getPhaseIcon()}</span>
          <div>
            <h3 className="font-semibold text-gray-900">Tides</h3>
            <p className="text-sm text-gray-600 capitalize">
              {phase.phase.replace('-', ' ')} • {phase.current}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-medium ${getQualityColor()}`}>
            {phase.quality}
          </p>
          <p className="text-xs text-gray-500">
            {phase.nextTide.type} in {formatNextTide()}
          </p>
        </div>
      </div>
      
      {advice.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {advice.slice(0, 2).map((tip, index) => (
            <span
              key={index}
              className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700"
            >
              {tip}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}