import { groundAtSegs } from "../terrain";
import type {
  BossArena,
  Checkpoint,
  Decor,
  DecorKind,
  EnemyKind,
  EnemySpawn,
  LevelData,
  Loop,
  Monitor,
  MonitorKind,
  Platform,
  RingSpawn,
  Segment,
  SpikeStrip,
  Spring,
  Theme,
} from "../types";

/**
 * Tiny builder that lays terrain left to right and places objects relative to
 * the terrain height so levels stay consistent when tweaked.
 */
export class LevelBuilder {
  x = 0;
  y: number;
  segments: Segment[] = [];
  platforms: Platform[] = [];
  rings: RingSpawn[] = [];
  enemies: EnemySpawn[] = [];
  springs: Spring[] = [];
  spikes: SpikeStrip[] = [];
  monitors: Monitor[] = [];
  checkpoints: Checkpoint[] = [];
  loops: Loop[] = [];
  decor: Decor[] = [];
  boss?: BossArena;

  constructor(startY: number) {
    this.y = startY;
  }

  // ---- terrain ----
  flat(w: number) {
    this.segments.push({ x: this.x, w, kind: "flat", y: this.y });
    this.x += w;
    return this;
  }
  slope(w: number, toY: number) {
    this.segments.push({ x: this.x, w, kind: "slope", y: this.y, y2: toY });
    this.y = toY;
    this.x += w;
    return this;
  }
  hill(w: number, h: number) {
    this.segments.push({ x: this.x, w, kind: "hill", y: this.y, h });
    this.x += w;
    return this;
  }
  gap(w: number) {
    this.segments.push({ x: this.x, w, kind: "gap", y: this.y });
    this.x += w;
    return this;
  }

  gy(x: number): number {
    const y = groundAtSegs(this.segments, x);
    if (y === null) throw new Error(`no ground at ${x}`);
    return y;
  }

  // ---- objects ----
  ringRow(x: number, n: number, height = 28, gap = 20, y?: number) {
    for (let i = 0; i < n; i++) {
      const rx = x + i * gap;
      const gy = y ?? groundAtSegs(this.segments, rx);
      if (gy === null) continue;
      this.rings.push({ x: rx, y: gy - height });
    }
    return this;
  }
  ringArc(cx: number, n: number, spread: number, base: number, height: number) {
    const gy = this.gy(cx);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const dx = (t - 0.5) * spread;
      const dy = height * (1 - Math.pow((t - 0.5) * 2, 2));
      this.rings.push({ x: cx + dx, y: gy - base - dy });
    }
    return this;
  }
  ringsAt(list: [number, number][]) {
    for (const [x, y] of list) this.rings.push({ x, y });
    return this;
  }
  ringLoop(cx: number, cy: number, r: number, n = 7) {
    const rr = r - 30;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 0.5 + (i / (n - 1)) * Math.PI;
      this.rings.push({ x: cx + Math.sin(a) * rr, y: cy + Math.cos(a) * rr });
    }
    return this;
  }
  enemy(kind: EnemyKind, x: number, range: number, opts: { height?: number; shoots?: boolean; y?: number } = {}) {
    let y: number;
    if (opts.y !== undefined) y = opts.y;
    else if (kind === "buzzer") y = this.gy(x) - (opts.height ?? 70);
    else if (kind === "spikeball") y = this.gy(x) - (opts.height ?? 60);
    else y = this.gy(x);
    this.enemies.push({ kind, x, y, range, shoots: opts.shoots });
    return this;
  }
  /** Fish that leaps out of a gap. x must be inside the gap; y is the water line. */
  chopper(x: number, waterY: number) {
    this.enemies.push({ kind: "chopper", x, y: waterY, range: 0 });
    return this;
  }
  spring(x: number, strong = true, y?: number) {
    this.springs.push({ x, y: y ?? this.gy(x), strong });
    return this;
  }
  spikesAt(x: number, w: number, y?: number) {
    this.spikes.push({ x, y: y ?? this.gy(x), w });
    return this;
  }
  monitor(x: number, kind: MonitorKind, y?: number) {
    this.monitors.push({ x, y: y ?? this.gy(x), kind });
    return this;
  }
  checkpoint(x: number) {
    this.checkpoints.push({ x, y: this.gy(x) });
    return this;
  }
  loop(cx: number, r: number) {
    const cy = this.gy(cx) - r;
    this.loops.push({ cx, cy, r });
    this.ringLoop(cx, cy, r);
    return this;
  }
  platform(x: number, y: number, w: number, opts: { h?: number; solid?: boolean; move?: Platform["move"]; crumble?: boolean } = {}) {
    this.platforms.push({ x, y, w, h: opts.h ?? 16, solid: opts.solid ?? false, move: opts.move, crumble: opts.crumble });
    return this;
  }
  block(x: number, y: number, w: number, h: number) {
    this.platforms.push({ x, y, w, h, solid: true });
    return this;
  }
  deco(kind: DecorKind, x: number, opts: { scale?: number; front?: boolean; y?: number } = {}) {
    const gy = opts.y ?? groundAtSegs(this.segments, x);
    if (gy === null) return this;
    this.decor.push({ kind, x, y: gy, scale: opts.scale, front: opts.front });
    return this;
  }
  /** Sprinkle decoration along the level where ground exists. */
  autoDecor(kinds: DecorKind[], spacing: number, seed = 1) {
    let s = seed;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let x = spacing / 2; x < this.x; x += spacing * (0.6 + rnd() * 0.8)) {
      const gy = groundAtSegs(this.segments, x);
      if (gy === null) continue;
      if (this.loops.some((l) => Math.abs(l.cx - x) < l.r + 40)) continue;
      if (this.boss && x > this.boss.x - 40 && x < this.boss.x + this.boss.w + 40) continue;
      const kind = kinds[Math.floor(rnd() * kinds.length)];
      this.decor.push({ kind, x, y: gy, scale: 0.85 + rnd() * 0.35 });
    }
    return this;
  }
  bossArena(x: number, w: number) {
    this.boss = { x, w, y: this.gy(x + w / 2) };
    return this;
  }

  build(meta: { index: number; name: string; act: number; theme: Theme; height: number; start: [number, number]; goal: number; music: number }): LevelData {
    return {
      index: meta.index,
      name: meta.name,
      act: meta.act,
      theme: meta.theme,
      width: this.x,
      height: meta.height,
      start: { x: meta.start[0], y: meta.start[1] },
      segments: this.segments,
      platforms: this.platforms,
      rings: this.rings,
      enemies: this.enemies,
      springs: this.springs,
      spikes: this.spikes,
      monitors: this.monitors,
      checkpoints: this.checkpoints,
      loops: this.loops,
      decor: this.decor,
      goal: { x: meta.goal, y: this.gy(meta.goal) },
      boss: this.boss,
      music: meta.music,
    };
  }
}
