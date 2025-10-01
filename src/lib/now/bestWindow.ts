/**
 * Calculate the best time window for beach activities
 * based on weather conditions throughout the day
 */

export interface TimeWindow {
  start: Date;
  end: Date;
  score: number;
  reason: string;
}

export interface HourlyCondition {
  time: string; // ISO format
  tempC: number;
  uv: number;
  precipProb: number;
  windKph: number;
  cloudCover: number;
}

export function computeBestWindow(
  hourlyData: HourlyCondition[],
  currentTime: Date = new Date()
): TimeWindow | null {
  if (!hourlyData || hourlyData.length === 0) return null;

  const windowSize = 3; // 3-hour windows
  const windows: TimeWindow[] = [];

  // Only consider future hours
  const futureHours = hourlyData.filter(hour => {
    const hourTime = new Date(hour.time);
    return hourTime > currentTime;
  });

  if (futureHours.length < windowSize) return null;

  // Calculate scores for each possible 3-hour window
  for (let i = 0; i <= futureHours.length - windowSize; i++) {
    const windowHours = futureHours.slice(i, i + windowSize);
    const startTime = new Date(windowHours[0].time);
    const endTime = new Date(windowHours[windowSize - 1].time);
    endTime.setHours(endTime.getHours() + 1); // End of last hour

    // Calculate average conditions for this window
    const avgTemp = windowHours.reduce((sum, h) => sum + h.tempC, 0) / windowSize;
    const avgUV = windowHours.reduce((sum, h) => sum + h.uv, 0) / windowSize;
    const avgPrecip = windowHours.reduce((sum, h) => sum + h.precipProb, 0) / windowSize;
    const avgWind = windowHours.reduce((sum, h) => sum + h.windKph, 0) / windowSize;
    const avgCloud = windowHours.reduce((sum, h) => sum + h.cloudCover, 0) / windowSize;

    // Score this window (0-100)
    let score = 0;
    const reasons: string[] = [];

    // Temperature scoring (ideal 20-28°C)
    if (avgTemp >= 20 && avgTemp <= 28) {
      score += 30;
      reasons.push("perfect temp");
    } else if (avgTemp >= 15 && avgTemp <= 32) {
      score += 20;
      reasons.push("good temp");
    } else {
      score += 5;
    }

    // UV scoring (moderate UV preferred, avoid extreme)
    if (avgUV >= 3 && avgUV <= 7) {
      score += 25;
      reasons.push("moderate UV");
    } else if (avgUV < 3) {
      score += 15;
      reasons.push("low UV");
    } else if (avgUV > 10) {
      score += 5; // Very high UV is not ideal
    } else {
      score += 10;
    }

    // Precipitation scoring
    if (avgPrecip < 10) {
      score += 25;
      reasons.push("dry");
    } else if (avgPrecip < 30) {
      score += 15;
      reasons.push("mostly dry");
    } else {
      score += 5;
    }

    // Wind scoring (light breeze preferred)
    if (avgWind >= 5 && avgWind <= 20) {
      score += 15;
      reasons.push("nice breeze");
    } else if (avgWind < 5) {
      score += 10;
      reasons.push("calm");
    } else if (avgWind > 30) {
      score += 3; // Too windy
    } else {
      score += 8;
    }

    // Cloud cover scoring (some clouds for comfort)
    if (avgCloud >= 20 && avgCloud <= 60) {
      score += 5;
      reasons.push("partial shade");
    } else if (avgCloud < 20) {
      score += 3;
    } else {
      score += 2;
    }

    const reason = reasons.slice(0, 2).join(" + ");
    
    windows.push({
      start: startTime,
      end: endTime,
      score,
      reason: reason || "decent conditions"
    });
  }

  // Return the best window
  return windows.reduce((best, current) => 
    current.score > best.score ? current : best
  );
}