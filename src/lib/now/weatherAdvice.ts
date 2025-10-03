import type { BeachWeatherSnapshot } from "./beachScore";

export interface AdviceChip {
  id: string;
  label: string;
  level: "positive" | "info" | "warn" | "caution";
}

export function buildWeatherAdvice(w: BeachWeatherSnapshot): AdviceChip[] {
  const chips: AdviceChip[] = [];
  // UV advice removed
  if (w.precipProb >= 40) chips.push({ id: "umbrella", label: "Bring umbrella", level: "caution" });
  if (w.tempC >= 30) chips.push({ id: "hydrate", label: "Hydrate often", level: "warn" });
  if (w.windKph >= 25) chips.push({ id: "wind", label: "Windy — secure items", level: "info" });
  // Removed Low UV window chip per design request.
  return chips;
}
