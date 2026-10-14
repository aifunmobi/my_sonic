/**
 * Loads pre-rendered parallax background layers (produced by
 * tools/blender/render_backgrounds.py) for a zone. When the files are
 * missing the renderer falls back to its procedural backdrop.
 */
export interface BgLayer {
  img: HTMLImageElement;
  rate: number;
}

export interface BgSet {
  width: number;
  height: number;
  scale: number;
  sky: BgLayer | null;
  layers: BgLayer[]; // far -> near
}

const sets = new Map<string, BgSet | null>();
const pending = new Set<string>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Returns the loaded set, null when known to be unavailable, undefined while loading. */
export function bgSet(zoneId: string): BgSet | null | undefined {
  if (sets.has(zoneId)) return sets.get(zoneId);
  if (pending.has(zoneId)) return undefined;
  pending.add(zoneId);
  const base = `${import.meta.env.BASE_URL}assets/bg/${zoneId}/`;
  (async () => {
    try {
      const res = await fetch(base + "layers.json", { cache: "force-cache" });
      if (!res.ok) throw new Error("no layers");
      const meta = (await res.json()) as Record<string, { rate?: number } | number>;
      const names = ["sky", "far", "mid", "near"];
      const imgs = await Promise.all(names.map((n) => loadImage(base + n + ".png")));
      const layerOf = (n: string, i: number): BgLayer | null => {
        const m = meta[n];
        const img = imgs[i];
        if (!img || typeof m !== "object" || m === null) return null;
        return { img, rate: m.rate ?? 0 };
      };
      const sky = layerOf("sky", 0);
      const layers = [layerOf("far", 1), layerOf("mid", 2), layerOf("near", 3)].filter((l): l is BgLayer => l !== null);
      if (!sky && layers.length === 0) throw new Error("no images");
      sets.set(zoneId, {
        width: Number(meta.width ?? 960),
        height: Number(meta.height ?? 540),
        scale: Number(meta.scale ?? 2),
        sky,
        layers,
      });
    } catch {
      sets.set(zoneId, null);
    } finally {
      pending.delete(zoneId);
    }
  })();
  return undefined;
}
