import type { BeachWeatherSnapshot } from "./beachScore";

export interface AdviceChip {
  id: string;
  label: string;
  level: "positive" | "info" | "warn" | "caution";
}

export function buildWeatherAdvice(w: BeachWeatherSnapshot): AdviceChip[] {
  const chips: AdviceChip[] = [];
  if (w.uv >= 5) chips.push({ id: "sunscreen", label: "Wear sunscreen", level: "warn" });
  if (w.precipProb >= 40) chips.push({ id: "umbrella", label: "Bring umbrella", level: "caution" });
  if (w.tempC >= 30) chips.push({ id: "hydrate", label: "Hydrate often", level: "warn" });
  if (w.windKph >= 25) chips.push({ id: "wind", label: "Windy — secure items", level: "info" });
  if (w.uv < 4 && w.tempC > 15) chips.push({ id: "lowuv", label: "Low UV window", level: "positive" });
  return chips;
}
