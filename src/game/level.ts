import type { Decor, LevelData, RingSpawn, Segment } from "./types";

const G = 880; // baseline ground y

function ringRow(x: number, y: number, n: number, gap = 32): RingSpawn[] {
  const out: RingSpawn[] = [];
  for (let i = 0; i < n; i++) out.push({ x: x + i * gap, y });
  return out;
}

function ringArc(cx: number, top: number, n: number, spread: number, height: number): RingSpawn[] {
  const out: RingSpawn[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const dx = (t - 0.5) * spread;
    const dy = height * (1 - Math.pow((t - 0.5) * 2, 2));
    out.push({ x: cx + dx, y: top - dy });
  }
  return out;
}

function ringLoopInside(cx: number, cy: number, r: number): RingSpawn[] {
  const out: RingSpawn[] = [];
  const rr = r - 44;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.5 + (i / 6) * Math.PI; // right side over the top to left side
    out.push({ x: cx + Math.sin(a) * rr, y: cy + Math.cos(a) * rr });
  }
  return out;
}

const segments: Segment[] = [
  { x: 0, w: 800, kind: "flat", y: G },
  { x: 800, w: 300, kind: "hill", y: G, h: 120 },
  { x: 1100, w: 400, kind: "flat", y: G },
  { x: 1500, w: 200, kind: "slope", y: G, y2: 760 },
  { x: 1700, w: 400, kind: "flat", y: 760 },
  { x: 2100, w: 200, kind: "slope", y: 760, y2: G },
  { x: 2300, w: 600, kind: "flat", y: G },
  { x: 2900, w: 240, kind: "gap", y: G },
  { x: 3140, w: 460, kind: "flat", y: G },
  { x: 3600, w: 200, kind: "hill", y: G, h: 150 },
  { x: 3800, w: 500, kind: "flat", y: G },
  { x: 4300, w: 300, kind: "slope", y: G, y2: 720 },
  { x: 4600, w: 400, kind: "flat", y: 720 },
  { x: 5000, w: 100, kind: "gap", y: 720 },
  { x: 5100, w: 400, kind: "flat", y: 720 },
  { x: 5500, w: 300, kind: "slope", y: 720, y2: G },
  { x: 5800, w: 700, kind: "flat", y: G },
  { x: 6500, w: 300, kind: "hill", y: G, h: 100 },
  { x: 6800, w: 400, kind: "flat", y: G },
  { x: 7200, w: 300, kind: "gap", y: G },
  { x: 7500, w: 600, kind: "flat", y: G },
  { x: 8100, w: 300, kind: "slope", y: G, y2: 800 },
  { x: 8400, w: 1800, kind: "flat", y: 800 },
];

export const LEVEL_1: LevelData = {
  name: "EMERALD COAST",
  act: 1,
  width: 10200,
  height: 1080,
  start: { x: 120, y: G - 20 },
  segments,
  platforms: [
    { x: 2960, y: 820, w: 120, h: 24, solid: false },
    { x: 3300, y: 816, w: 64, h: 64, solid: true },
    { x: 3364, y: 752, w: 64, h: 128, solid: true },
    { x: 4700, y: 460, w: 140, h: 24, solid: false },
    { x: 4900, y: 380, w: 120, h: 24, solid: false },
    { x: 5250, y: 560, w: 140, h: 24, solid: false, move: { dx: 0, dy: 90, period: 200 } },
    { x: 7260, y: 860, w: 120, h: 24, solid: false, move: { dx: 140, dy: 0, period: 240 } },
    { x: 7650, y: 600, w: 120, h: 24, solid: false },
    { x: 8600, y: 620, w: 160, h: 24, solid: false },
  ],
  rings: [
    ...ringRow(300, G - 40, 5),
    ...ringArc(950, G - 200, 7, 260, 90),
    ...ringRow(1200, G - 160, 4),
    ...ringRow(1750, 760 - 40, 6),
    ...ringLoopInside(2600, 770, 110),
    ...ringRow(2980, 820 - 40, 3),
    ...ringRow(3372, 752 - 40, 2),
    ...ringArc(3700, G - 240, 7, 260, 80),
    ...ringRow(3900, G - 40, 6),
    ...ringRow(4620, 720 - 40, 4),
    ...ringRow(4720, 460 - 40, 4),
    ...ringRow(4910, 380 - 40, 3),
    ...ringArc(5050, 720 - 120, 5, 160, 60),
    ...ringRow(5270, 560 - 40, 4),
    ...ringLoopInside(6150, 750, 130),
    ...ringArc(6650, G - 200, 7, 260, 70),
    ...ringRow(6950, G - 40, 5),
    ...ringRow(7280, 860 - 40, 3),
    ...ringRow(7670, 600 - 40, 3),
    ...ringRow(8000, G - 120, 5),
    ...ringRow(8620, 620 - 40, 5),
    ...ringRow(8450, 800 - 40, 6),
  ],
  enemies: [
    { kind: "buzzer", x: 1300, y: 740, range: 200 },
    { kind: "crawler", x: 1950, y: 760, range: 110 },
    { kind: "crawler", x: 3490, y: G, range: 50 },
    { kind: "buzzer", x: 4400, y: 640, range: 100 },
    { kind: "crawler", x: 5300, y: 720, range: 120 },
    { kind: "buzzer", x: 6950, y: 700, range: 180 },
    { kind: "crawler", x: 7900, y: G, range: 100 },
    { kind: "buzzer", x: 8000, y: 700, range: 200 },
    { kind: "buzzer", x: 8650, y: 700, range: 150 },
  ],
  springs: [
    { x: 4650, y: 720 },
    { x: 5550, y: 720 - 20 },
    { x: 7560, y: G },
  ],
  spikes: [
    { x: 1990, y: 760, w: 64 },
    { x: 3540, y: G, w: 64 },
    { x: 7700, y: G, w: 96 },
  ],
  monitors: [
    { x: 500, y: G, kind: "ring" },
    { x: 3396, y: 752, kind: "shield" },
    { x: 5400, y: 720, kind: "ring" },
    { x: 7710, y: 600, kind: "life" },
  ],
  checkpoints: [
    { x: 4000, y: G },
    { x: 6900, y: G },
  ],
  loops: [
    { cx: 2600, cy: 770, r: 110 },
    { cx: 6150, cy: 750, r: 130 },
  ],
  decor: [],
  goal: { x: 8900, y: 800 },
};

/** Returns ground y at x, or null over a gap. */
export function groundAt(level: LevelData, x: number): number | null {
  const segs = level.segments;
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
  return last.kind === "slope" ? (last.y2 ?? last.y) : last.y;
}

/** Slope angle (radians) of the ground at x; positive = descending to the right. */
export function groundAngle(level: LevelData, x: number): number {
  const a = groundAt(level, x - 4);
  const b = groundAt(level, x + 4);
  if (a === null || b === null) return 0;
  return Math.atan2(b - a, 8);
}

/** Populate decoration using ground heights so trees sit on the terrain. */
export function buildLevel(base: LevelData): LevelData {
  const decor: Decor[] = [];
  const palms = [180, 640, 1250, 1450, 2350, 3250, 3900, 4200, 5900, 6420, 6850, 7900, 8500, 9200, 9450];
  const bushes = [420, 1160, 1820, 2450, 3200, 4100, 4750, 5200, 5950, 6350, 7000, 7650, 8300, 8700, 9350];
  const flowers = [260, 560, 1380, 1780, 2500, 3230, 3950, 4880, 5150, 6050, 6300, 6980, 7820, 8560, 9100, 9500];
  const totems = [2800, 4260, 6480, 8420];
  for (const x of palms) {
    const y = groundAt(base, x);
    if (y !== null) decor.push({ kind: "palm", x, y, scale: 0.9 + ((x * 7) % 5) * 0.08 });
  }
  for (const x of bushes) {
    const y = groundAt(base, x);
    if (y !== null) decor.push({ kind: "bush", x, y });
  }
  for (const x of flowers) {
    const y = groundAt(base, x);
    if (y !== null) decor.push({ kind: "flower", x, y });
  }
  for (const x of totems) {
    const y = groundAt(base, x);
    if (y !== null) decor.push({ kind: "totem", x, y });
  }
  return { ...base, decor };
}

export function formatTime(frames: number): string {
  const totalSeconds = Math.floor(frames / 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Classic time bonus table (seconds elapsed -> bonus). */
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
