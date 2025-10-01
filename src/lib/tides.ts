// Tide data utilities - ready for real API integration

export interface TideData {
  time: string; // ISO datetime
  height: number; // in meters
  type: 'high' | 'low';
}

export interface TidePhase {
  current: 'rising' | 'falling';
  nextTide: TideData;
  phase: 'low' | 'mid-rising' | 'high' | 'mid-falling';
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

// Mock tide data - in production this would integrate with NOAA or similar API
export function getTodaysTides(): TideData[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  return [
    {
      time: `${todayStr}T06:23:00.000Z`,
      height: 0.3,
      type: 'low'
    },
    {
      time: `${todayStr}T12:45:00.000Z`,
      height: 1.8,
      type: 'high'
    },
    {
      time: `${todayStr}T18:56:00.000Z`,
      height: 0.2,
      type: 'low'
    },
    {
      time: `${todayStr}T23:30:00.000Z`,
      height: 1.9,
      type: 'high'
    }
  ];
}

export function getCurrentTidePhase(): TidePhase {
  const tides = getTodaysTides();
  const now = new Date();
  
  // Find next tide
  const nextTide = tides.find(tide => new Date(tide.time) > now) || tides[0];
  
  // Determine current phase
  let current: 'rising' | 'falling' = 'rising';
  let phase: TidePhase['phase'] = 'mid-rising';
  let quality: TidePhase['quality'] = 'fair';
  
  // Simple logic - in real app this would be more sophisticated
  const lastTide = tides.find(tide => new Date(tide.time) <= now);
  if (lastTide && nextTide) {
    current = lastTide.type === 'low' ? 'rising' : 'falling';
    
    // Estimate phase based on time between tides
    const lastTime = new Date(lastTide.time).getTime();
    const nextTime = new Date(nextTide.time).getTime();
    const nowTime = now.getTime();
    const progress = (nowTime - lastTime) / (nextTime - lastTime);
    
    if (current === 'rising') {
      if (progress < 0.3) phase = 'low';
      else if (progress > 0.7) phase = 'high';
      else phase = 'mid-rising';
    } else {
      if (progress < 0.3) phase = 'high';
      else if (progress > 0.7) phase = 'low';
      else phase = 'mid-falling';
    }
    
    // Quality scoring (simplified)
    if (phase === 'mid-rising' || phase === 'mid-falling') quality = 'good';
    else if (phase === 'high') quality = 'excellent';
    else quality = 'fair';
  }
  
  return {
    current,
    nextTide,
    phase,
    quality
  };
}

export function getTideAdvice(phase: TidePhase): string[] {
  const advice: string[] = [];
  
  switch (phase.phase) {
    case 'low':
      advice.push('Great for tide pooling');
      advice.push('Best beach walking conditions');
      break;
    case 'mid-rising':
      advice.push('Good for surfing');
      advice.push('Waves getting bigger');
      break;
    case 'high':
      advice.push('Peak surf conditions');
      advice.push('Deep water activities');
      break;
    case 'mid-falling':
      advice.push('Good fishing conditions');
      advice.push('Waves still decent');
      break;
  }
  
  // Time until next tide
  const minutesUntil = Math.floor((new Date(phase.nextTide.time).getTime() - new Date().getTime()) / (1000 * 60));
  if (minutesUntil < 120) {
    advice.push(`${phase.nextTide.type} tide in ${Math.floor(minutesUntil / 60)}h ${minutesUntil % 60}m`);
  }
  
  return advice;
}