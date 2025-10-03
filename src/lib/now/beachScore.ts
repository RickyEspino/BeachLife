export interface BeachWeatherSnapshot {
  tempC: number; // air temperature
  uv: number; // UV index
  precipProb: number; // 0-100
  windKph: number; // wind speed
  cloudCover: number; // 0-100
}

export function computeBeachScore(w: BeachWeatherSnapshot): { score: number; factors: Record<string, number> } {
  // Score components (0..1) then weighted
  // Ideal temp 23-29C; degrade outside
  const tempIdealMin = 23;
  const tempIdealMax = 29;
  let tempComponent: number;
  if (w.tempC >= tempIdealMin && w.tempC <= tempIdealMax) tempComponent = 1;
  else {
    const dist = Math.min(Math.abs(w.tempC - tempIdealMin), Math.abs(w.tempC - tempIdealMax));
    tempComponent = Math.max(0, 1 - dist / 15); // degrade per 15C delta
  }

  // UV: sweet spot moderate <8, penalize extremes >10 or very low (<2) a bit
  let uvComponent = 1;
  if (w.uv > 10) uvComponent = 0.4;
  else if (w.uv > 8) uvComponent = 0.7;
  else if (w.uv < 2) uvComponent = 0.6;

  // Precip probability low is good
  const precipComponent = w.precipProb <= 20 ? 1 : w.precipProb >= 80 ? 0 : 1 - (w.precipProb - 20) / 60;

  // Wind moderate (<26 kph) good; above degrade
  const windComponent = w.windKph <= 26 ? 1 : Math.max(0, 1 - (w.windKph - 26) / 40);

  // Cloud cover: 0.15-0.45 nice (15%-45%) else degrade softly
  const cc = w.cloudCover / 100;
  let cloudComponent: number;
  if (cc >= 0.15 && cc <= 0.45) cloudComponent = 1;
  else if (cc < 0.15) cloudComponent = Math.max(0.4, 1 - (0.15 - cc) * 2);
  else cloudComponent = Math.max(0.4, 1 - (cc - 0.45) * 1.5);

  // weights (restore UV weight, rebalance others)
  const weights = { temp: 0.25, uv: 0.15, precip: 0.25, wind: 0.2, cloud: 0.15 } as const;
  const score =
    tempComponent * weights.temp +
    uvComponent * weights.uv +
    precipComponent * weights.precip +
    windComponent * weights.wind +
    cloudComponent * weights.cloud;

  return {
    score: Math.round(score * 100),
    factors: {
      temp: tempComponent,
      uv: uvComponent,
      precip: precipComponent,
      wind: windComponent,
      cloud: cloudComponent,
    },
  };
}
