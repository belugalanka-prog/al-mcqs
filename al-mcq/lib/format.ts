export const CHOICES = ["A", "B", "C", "D", "E"] as const;
export type Choice = (typeof CHOICES)[number];

export function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function pct(n: number, d: number) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

export function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
