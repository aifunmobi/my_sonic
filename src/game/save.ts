/** Persistent progress and scores in localStorage. */
export interface LevelBest {
  score: number;
  time: number; // frames
  rings: number;
  perfect: boolean;
}

export interface SaveData {
  version: 1;
  unlocked: number; // number of levels unlocked (>= 1)
  best: Record<number, LevelBest>;
  bestRun: number;
  runs: number;
  muted: boolean;
  music: boolean;
  totalRings: number;
  totalEnemies: number;
}

const KEY = "my_sonic.save.v1";

const DEFAULT: SaveData = {
  version: 1,
  unlocked: 1,
  best: {},
  bestRun: 0,
  runs: 0,
  muted: false,
  music: true,
  totalRings: 0,
  totalEnemies: 0,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT, best: {} };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...DEFAULT, ...parsed, best: parsed.best ?? {} };
  } catch {
    return { ...DEFAULT, best: {} };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode etc.) */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
