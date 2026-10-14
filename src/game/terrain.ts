import type { Segment } from "./types";

/** Ground y at x for a segment list, or null over a gap. */
export function groundAtSegs(segs: Segment[], x: number): number | null {
  if (segs.length === 0) return null;
  if (x < segs[0].x) return segs[0].y;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (x >= s.x && x < s.x + s.w) {
      const t = (x - s.x) / s.w;
      switch (s.kind) {
        case "flat":
          return s.y;
        case "slope":
          return s.y + ((s.y2 ?? s.y) - s.y) * t;
        case "hill":
          return s.y - ((s.h ?? 0) * (1 - Math.cos(2 * Math.PI * t))) / 2;
        case "gap":
          return null;
      }
    }
  }
  const last = segs[segs.length - 1];
  return last.kind === "slope" ? (last.y2 ?? last.y) : last.kind === "gap" ? null : last.y;
}

export function groundAngleSegs(segs: Segment[], x: number): number {
  const a = groundAtSegs(segs, x - 3);
  const b = groundAtSegs(segs, x + 3);
  if (a === null || b === null) return 0;
  return Math.atan2(b - a, 6);
}

export function formatTime(frames: number): string {
  const totalSeconds = Math.floor(frames / 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Classic time bonus table. */
export function timeBonus(frames: number): number {
  const s = frames / 60;
  if (s < 30) return 50000;
  if (s < 45) return 10000;
  if (s < 60) return 5000;
  if (s < 90) return 4000;
  if (s < 120) return 3000;
  if (s < 180) return 2000;
  if (s < 240) return 1000;
  if (s < 300) return 500;
  return 0;
}
