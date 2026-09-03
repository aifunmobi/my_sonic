export type SegmentKind = "flat" | "slope" | "hill" | "gap";

export interface Segment {
  x: number;
  w: number;
  kind: SegmentKind;
  y: number;
  y2?: number;
  h?: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  solid: boolean;
  move?: { dx: number; dy: number; period: number; phase?: number };
  /** Falls away shortly after being stood on (later levels). */
  crumble?: boolean;
}

export interface RingSpawn {
  x: number;
  y: number;
}

export type EnemyKind = "crawler" | "buzzer" | "crab" | "chopper" | "spikeball";

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
  range: number;
  /** buzzer/crab: fires projectiles when true */
  shoots?: boolean;
}

export interface Spring {
  x: number;
  y: number;
  strong: boolean; // red = strong, yellow = weak
}

export interface SpikeStrip {
  x: number;
  y: number;
  w: number;
}

export type MonitorKind = "ring" | "shield" | "life" | "speed" | "invincible";

export interface Monitor {
  x: number;
  y: number;
  kind: MonitorKind;
}

export interface Checkpoint {
  x: number;
  y: number;
}

export interface Loop {
  cx: number;
  cy: number;
  r: number;
}

export type DecorKind = "palm" | "flower" | "bush" | "totem" | "column" | "ruinwall" | "crystal" | "lavaburst" | "antenna" | "pipe" | "umbrella" | "rock" | "torch";

export interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  scale?: number;
  /** Draw behind terrain (default) or in front */
  front?: boolean;
}

export interface BossArena {
  /** Left edge of the locked camera arena */
  x: number;
  w: number;
  /** Ground y in the arena */
  y: number;
}

export interface Theme {
  id: string;
  sky: [string, string, string];
  sun?: { color: string; x: number; y: number; r: number };
  stars?: boolean;
  farLayer: "mountains" | "ruins" | "cave" | "clouds" | "dunes";
  farColor: string;
  midLayer: "ocean" | "lava" | "hills" | "cityline" | "sea";
  midColor: string;
  midColor2: string;
  ground: [string, string];
  groundEdge: string;
  grass: [string, string];
  loop: [string, string];
  block: [string, string];
  water: [string, string];
  waterDeadly: boolean;
  fog?: string;
}

export interface LevelData {
  index: number;
  name: string;
  act: number;
  theme: Theme;
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
  boss?: BossArena;
  music: number;
}
