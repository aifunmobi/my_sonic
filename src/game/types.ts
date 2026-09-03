export type SegmentKind = "flat" | "slope" | "hill" | "gap";

export interface Segment {
  x: number;
  w: number;
  kind: SegmentKind;
  y: number; // ground y at start (ignored for gap)
  y2?: number; // slope: ground y at end
  h?: number; // hill: bump height (positive = upward)
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean; // solid blocks stop walls/head; non-solid are one-way from above
  move?: { dx: number; dy: number; period: number; phase?: number };
}

export interface RingSpawn {
  x: number;
  y: number;
}

export type EnemyKind = "crawler" | "buzzer";

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
  range: number;
}

export interface Spring {
  x: number;
  y: number; // y of the spring top surface
}

export interface SpikeStrip {
  x: number;
  y: number; // y of the spike tips
  w: number;
}

export type MonitorKind = "ring" | "shield" | "life";

export interface Monitor {
  x: number;
  y: number; // bottom of the monitor
  kind: MonitorKind;
}

export interface Checkpoint {
  x: number;
  y: number; // ground y at the post
}

export interface Loop {
  cx: number;
  cy: number;
  r: number; // radius of the running surface
}

export type DecorKind = "palm" | "flower" | "bush" | "totem";

export interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  scale?: number;
}

export interface LevelData {
  name: string;
  act: number;
  width: number;
  height: number;
  start: { x: number; y: number };
  segments: Segment[];
  platforms: Platform[];
  rings: RingSpawn[];
  enemies: EnemySpawn[];
  springs: Spring[];
  spikes: SpikeStrip[];
  monitors: Monitor[];
  checkpoints: Checkpoint[];
  loops: Loop[];
  decor: Decor[];
  goal: { x: number; y: number };
}
