/**
 * Estimate sunset quality based on cloud cover and other conditions
 */
export interface SunsetQuality {
  score: number; // 0-1
  label: string;
  timeUntil: string;
}

export function estimateSunsetQuality(
  cloudCover: number,
  sunsetTime: Date
): SunsetQuality {
  const now = new Date();
  const msUntil = sunsetTime.getTime() - now.getTime();
  const hoursUntil = msUntil / (1000 * 60 * 60);
  
  // Format time until sunset
  let timeUntil: string;
  if (msUntil < 0) {
    timeUntil = "Set";
  } else if (hoursUntil < 1) {
    const minutesUntil = Math.round(msUntil / (1000 * 60));
    timeUntil = `${minutesUntil}m`;
  } else {
    const hours = Math.floor(hoursUntil);
    const minutes = Math.round((hoursUntil - hours) * 60);
    timeUntil = `${hours}h ${minutes}m`;
  }

  // Quality scoring based on cloud cover
  let score: number;
  let label: string;

  if (cloudCover < 20) {
    score = 0.3;
    label = "Clear but muted";
  } else if (cloudCover >= 20 && cloudCover <= 60) {
    score = 0.9;
    label = "Vivid likely";
  } else if (cloudCover > 60 && cloudCover <= 85) {
    score = 0.6;
    label = "Nice colors";
  } else {
    score = 0.2;
    label = "Overcast";
  }

  return { score, label, timeUntil };
}

// Calculate sunset time using a simplified formula
export function calculateSunset(lat: number, lon: number, date: Date = new Date()): Date {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  
  // Simplified sunrise equation (approximation)
  const P = Math.asin(0.39795 * Math.cos(0.98563 * (dayOfYear - 173) * Math.PI / 180));
  const a = (Math.sin(-0.83 * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.sin(P)) / (Math.cos(lat * Math.PI / 180) * Math.cos(P));
  
  if (Math.abs(a) > 1) {
    // Polar day/night
    return new Date(date.getTime() + 12 * 60 * 60 * 1000); // Default to noon + 12h
  }
  
  const hourAngle = Math.acos(a);
  const sunsetHours = 12 + (hourAngle * 180 / Math.PI) / 15 - lon / 15;
  
  const sunsetDate = new Date(date);
  sunsetDate.setHours(Math.floor(sunsetHours), Math.round((sunsetHours % 1) * 60), 0, 0);
  
  return sunsetDate;
}