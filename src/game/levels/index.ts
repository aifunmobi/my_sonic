import type { LevelData } from "../types";
import { buildLevel1 } from "./level1";
import { buildLevel2 } from "./level2";
import { buildLevel3 } from "./level3";
import { buildLevel4 } from "./level4";
import { buildLevel5 } from "./level5";

const builders = [buildLevel1, buildLevel2, buildLevel3, buildLevel4, buildLevel5];

export const LEVEL_COUNT = builders.length;

export function buildLevel(index: number): LevelData {
  const i = Math.max(0, Math.min(builders.length - 1, index));
  return builders[i]();
}

export const LEVEL_NAMES = ["EMERALD COAST", "SUNSET BAY", "MOSSY RUINS", "MAGMA CAVERN", "SKY FORTRESS"];
