export function timeOfDayGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function buildGreeting(username: string | undefined, date = new Date()) {
  const base = timeOfDayGreeting(date);
  const name = username ? `, ${username}` : "";
  return `${base}${name}`;
}
