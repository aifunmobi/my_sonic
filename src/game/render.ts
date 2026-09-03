import * as C from "./constants";
import { drawText } from "./font";
import { groundAtSegs } from "./terrain";
import { formatTime } from "./terrain";
import { LEVEL_NAMES } from "./levels";
import { WATER_Y, type Game, type Particle, type Player } from "./game";
import type { Decor, Loop, Theme } from "./types";

function px(g: CanvasRenderingContext2D, x: number, y: number, c: string, w = 1, h = 1) {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Classic checkerboard with dithered shading inside each tile. */
function checker(a: string, b: string, size: number, detail = true): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size * 2;
  const g = c.getContext("2d")!;
  g.fillStyle = a;
  g.fillRect(0, 0, size * 2, size * 2);
  g.fillStyle = b;
  g.fillRect(0, 0, size, size);
  g.fillRect(size, size, size, size);
  if (detail) {
    for (const [ox, oy, light] of [[0, 0, true], [size, size, true], [size, 0, false], [0, size, false]] as [number, number, boolean][]) {
      // dithered diagonal shading: darker toward bottom-right
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d = (x + y) / (size * 2);
          if (d > 0.55 && (x + y) % 2 === 0) px(g, ox + x, oy + y, "rgba(0,0,0,0.14)");
          if (d < 0.3 && (x + y) % 2 === 0 && light) px(g, ox + x, oy + y, "rgba(255,255,255,0.12)");
        }
      }
      px(g, ox, oy, "rgba(255,255,255,0.18)", size, 1);
      px(g, ox, oy, "rgba(255,255,255,0.18)", 1, size);
      px(g, ox, oy + size - 1, "rgba(0,0,0,0.25)", size, 1);
      px(g, ox + size - 1, oy, "rgba(0,0,0,0.25)", 1, size);
    }
  }
  return c;
}

/** Mossy stone bricks for the ruins. */
function bricks(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 32;
  const g = c.getContext("2d")!;
  const rnd = seeded(5);
  g.fillStyle = "#2c3434";
  g.fillRect(0, 0, 48, 32);
  for (let row = 0; row < 2; row++) {
    const off = row % 2 ? 12 : 0;
    for (let col = -1; col < 3; col++) {
      const x = col * 24 + off;
      const y = row * 16;
      g.fillStyle = rnd() > 0.5 ? a : b;
      g.fillRect(x + 1, y + 1, 22, 14);
      px(g, x + 1, y + 1, "rgba(255,255,255,0.22)", 22, 1);
      px(g, x + 1, y + 1, "rgba(255,255,255,0.22)", 1, 14);
      px(g, x + 1, y + 14, "rgba(0,0,0,0.3)", 22, 1);
      px(g, x + 22, y + 1, "rgba(0,0,0,0.3)", 1, 14);
      for (let k = 0; k < 4; k++) px(g, x + 2 + Math.floor(rnd() * 20), y + 2 + Math.floor(rnd() * 12), "rgba(0,0,0,0.15)", 2, 1);
      if (rnd() > 0.6) px(g, x + 2 + Math.floor(rnd() * 16), y + 2 + Math.floor(rnd() * 8), "#3a9a5a", 3, 2);
    }
  }
  return c;
}

/** Cracked volcanic rock with glowing seams. */
function rock(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  const rnd = seeded(9);
  g.fillStyle = a;
  g.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd() * 32);
    const y = Math.floor(rnd() * 32);
    const w = 3 + Math.floor(rnd() * 8);
    const h = 2 + Math.floor(rnd() * 5);
    g.fillStyle = b;
    g.fillRect(x, y, w, h);
    px(g, x, y, "rgba(255,255,255,0.12)", w, 1);
    px(g, x, y + h - 1, "rgba(0,0,0,0.3)", w, 1);
  }
  // glowing cracks
  g.fillStyle = "#ff7a20";
  px(g, 4, 6, "#ff7a20", 1, 6);
  px(g, 5, 11, "#ff7a20", 5, 1);
  px(g, 10, 12, "#ffb040", 1, 4);
  px(g, 20, 20, "#ff7a20", 6, 1);
  px(g, 26, 16, "#ff7a20", 1, 5);
  px(g, 18, 26, "#ffb040", 1, 4);
  px(g, 14, 3, "#ff7a20", 4, 1);
  return c;
}

/** Riveted metal panels for the fortress. */
function metal(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = a;
  g.fillRect(0, 0, 32, 32);
  for (const [x, y, w, h, col] of [[0, 0, 16, 16, b], [16, 0, 16, 16, a], [0, 16, 16, 16, a], [16, 16, 16, 16, b]] as [number, number, number, number, string][]) {
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
    px(g, x, y, "rgba(255,255,255,0.25)", w, 1);
    px(g, x, y, "rgba(255,255,255,0.25)", 1, h);
    px(g, x, y + h - 1, "rgba(0,0,0,0.35)", w, 1);
    px(g, x + w - 1, y, "rgba(0,0,0,0.35)", 1, h);
    for (const [rx, ry] of [[3, 3], [w - 5, 3], [3, h - 5], [w - 5, h - 5]]) {
      px(g, x + rx, y + ry, "#c8d0e0", 2, 2);
      px(g, x + rx + 1, y + ry + 1, "#3a4058", 1, 1);
    }
  }
  // hazard stripe on one panel
  for (let i = 0; i < 16; i += 4) {
    px(g, 18 + i, 6, "#e0b030", 2, 3);
    px(g, 20 + i, 6, "#222", 2, 3);
  }
  return c;
}

interface ThemePatterns {
  ground: CanvasPattern;
  loop: CanvasPattern;
  block: CanvasPattern;
}

export class Renderer {
  private buf: HTMLCanvasElement;
  private b: CanvasRenderingContext2D;
  private patterns = new Map<string, ThemePatterns>();
  private starSeed: number[] = [];

  constructor() {
    this.buf = document.createElement("canvas");
    this.buf.width = C.VIEW_W;
    this.buf.height = C.VIEW_H;
    this.b = this.buf.getContext("2d")!;
    for (let i = 0; i < 60; i++) this.starSeed.push(((i * 7919) % 480) / 480, ((i * 104729) % 170) / 170, (i * 31) % 3);
  }

  private pat(theme: Theme): ThemePatterns {
    let p = this.patterns.get(theme.id);
    if (!p) {
      const g = this.b;
      const tile =
        theme.tile === "brick" ? bricks(theme.ground[0], theme.ground[1]) : theme.tile === "rock" ? rock(theme.ground[0], theme.ground[1]) : theme.tile === "metal" ? metal(theme.ground[0], theme.ground[1]) : checker(theme.ground[0], theme.ground[1], 16);
      p = {
        ground: g.createPattern(tile, "repeat")!,
        loop: g.createPattern(checker(theme.loop[0], theme.loop[1], 12), "repeat")!,
        block: g.createPattern(checker(theme.block[0], theme.block[1], 8, false), "repeat")!,
      };
      this.patterns.set(theme.id, p);
    }
    return p;
  }

  /** Render the frame into the low-res buffer and blit it to the display canvas. */
  render(display: CanvasRenderingContext2D, game: Game, dispW: number, dispH: number) {
    const g = this.b;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    this.drawScene(g, game);
    display.imageSmoothingEnabled = false;
    display.drawImage(this.buf, 0, 0, dispW, dispH);
  }

  private drawScene(g: CanvasRenderingContext2D, game: Game) {
    const cam = game.camera;
    const theme = game.level.theme;
    const pats = this.pat(theme);
    const shakeX = game.shake > 0 ? Math.round((Math.random() - 0.5) * game.shake) : 0;
    const shakeY = game.shake > 0 ? Math.round((Math.random() - 0.5) * game.shake) : 0;

    this.drawBackground(g, game, theme);

    g.save();
    g.translate(-Math.round(cam.x + shakeX), -Math.round(cam.y + shakeY));
    const x0 = cam.x - 40;
    const x1 = cam.x + C.VIEW_W + 40;

    this.drawWater(g, game, theme, x0, x1);
    for (const d of game.level.decor) if (!d.front && d.x > x0 - 60 && d.x < x1 + 60) this.drawDecor(g, d, game.frame, theme);
    for (const loop of game.level.loops) if (loop.cx + loop.r + 30 > x0 && loop.cx - loop.r - 30 < x1) this.drawLoopBack(g, loop, pats, theme);
    this.drawTerrain(g, game, theme, pats, x0, x1);
    this.drawPlatforms(g, game, theme, pats, x0, x1);
    for (const loop of game.level.loops) if (loop.cx + loop.r + 30 > x0 && loop.cx - loop.r - 30 < x1) this.drawLoopFront(g, loop, theme);

    for (const c of game.checkpoints) if (c.x > x0 && c.x < x1) this.drawCheckpoint(g, c.x, c.y, c.active, c.spin);
    this.drawGoal(g, game);
    for (const s of game.springs) if (s.x > x0 && s.x < x1) this.drawSpring(g, s.x, s.y, s.anim, s.strong);
    for (const sp of game.level.spikes) if (sp.x + sp.w > x0 && sp.x < x1) this.drawSpikes(g, sp.x, sp.y, sp.w);
    for (const m of game.monitors) if (m.x > x0 && m.x < x1) this.drawMonitor(g, m.x, m.y, m.kind, m.broken, game.frame);

    for (const r of game.rings) {
      if (r.x < x0 || r.x > x1) continue;
      if (!r.collected) this.drawRing(g, r.x, r.y, game.frame);
      else if (r.sparkle > 0) this.drawRingSparkle(g, r.x, r.y, r.sparkle);
    }
    for (const r of game.scatter) {
      if (r.life > 200 && r.life % 2 === 0) continue;
      this.drawRing(g, r.x, r.y, game.frame + r.life * 2);
    }

    for (const e of game.enemies) {
      if (!e.alive || e.x < x0 - 40 || e.x > x1 + 40) continue;
      switch (e.kind) {
        case "crawler":
          this.drawCrawler(g, e.x, e.y, e.dir, e.t);
          break;
        case "buzzer":
          this.drawBuzzer(g, e.x, e.y, e.dir, e.t);
          break;
        case "crab":
          this.drawCrab(g, e.x, e.y, e.t, e.pause > 0);
          break;
        case "chopper":
          this.drawChopper(g, e.x, e.y, e.vy);
          break;
        case "spikeball":
          this.drawSpikeball(g, e.x0, e.y0, e.x, e.y);
          break;
      }
    }
    for (const p of game.projectiles) this.drawProjectile(g, p.x, p.y, p.kind, game.frame);
    if (game.boss && game.boss.state !== "waiting") this.drawBoss(g, game);

    this.drawPlayer(g, game);
    for (const d of game.level.decor) if (d.front && d.x > x0 - 60 && d.x < x1 + 60) this.drawDecor(g, d, game.frame, theme);
    for (const p of game.particles) this.drawParticle(g, p);

    g.restore();
    if (theme.fog) {
      g.fillStyle = theme.fog;
      g.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
    }
    this.drawHud(g, game);
    if (game.fade > 0) {
      g.fillStyle = `rgba(0,0,0,${game.fade})`;
      g.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
    }
  }

  // ------------------------------------------------------------------
  // Background layers
  // ------------------------------------------------------------------
  private drawBackground(g: CanvasRenderingContext2D, game: Game, theme: Theme) {
    const cam = game.camera;
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const py = -cam.y * 0.1;
    this.bandedSky(g, theme, W, H);

    if (theme.stars) {
      for (let i = 0; i < this.starSeed.length; i += 3) {
        const sx = ((this.starSeed[i] * W - cam.x * 0.02) % W + W) % W;
        const sy = this.starSeed[i + 1] * 140 + py * 0.3;
        const tw = (game.frame + i * 13) % 60 < 30 ? 1 : 0.5;
        g.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.5})`;
        g.fillRect(Math.round(sx), Math.round(sy), this.starSeed[i + 2] === 0 ? 2 : 1, 1);
      }
    }
    if (theme.sun) {
      const s = theme.sun;
      g.fillStyle = s.color;
      g.beginPath();
      g.arc(s.x - cam.x * 0.02, s.y + py * 0.3, s.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.beginPath();
      g.arc(s.x - cam.x * 0.02 - s.r * 0.3, s.y + py * 0.3 - s.r * 0.3, s.r * 0.35, 0, Math.PI * 2);
      g.fill();
    }

    switch (theme.farLayer) {
      case "mountains":
        this.bgMountains(g, cam.x, py, theme.farColor, game.frame);
        break;
      case "dunes":
        this.bgDunes(g, cam.x, py, theme.farColor);
        break;
      case "ruins":
        this.bgRuins(g, cam.x, py, theme.farColor);
        break;
      case "cave":
        this.bgCave(g, cam.x, py, theme.farColor);
        break;
      case "clouds":
        this.bgCloudBank(g, cam.x, py, theme.farColor, game.frame);
        break;
    }
    switch (theme.midLayer) {
      case "ocean":
      case "sea":
        this.bgOcean(g, cam.x, py, theme, game.frame);
        break;
      case "hills":
        this.bgHills(g, cam.x, py, theme);
        break;
      case "lava":
        this.bgLava(g, cam.x, py, theme, game.frame);
        break;
      case "cityline":
        this.bgCity(g, cam.x, py, theme, game.frame);
        break;
    }
    if (theme.id !== "sky") this.bgNearHills(g, cam.x, py, theme);
    else this.bgSmallClouds(g, cam.x, py, game.frame);
    switch (theme.extra) {
      case "waterfall":
        this.bgWaterfall(g, cam.x, py, game.frame);
        break;
      case "birds":
        this.bgBirds(g, cam.x, py, game.frame);
        break;
      case "fireflies":
        this.bgFireflies(g, cam.x, py, game.frame);
        break;
      case "embers":
        this.bgEmbers(g, game.frame);
        break;
      case "airship":
        this.bgAirship(g, cam.x, py, game.frame);
        break;
    }
  }

  private skyCache = new Map<string, HTMLCanvasElement>();

  /** Mega Drive style sky: horizontal colour bands with a 2px dither between them. */
  private bandedSky(g: CanvasRenderingContext2D, theme: Theme, W: number, H: number) {
    let c = this.skyCache.get(theme.id);
    if (!c) {
      c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const k = c.getContext("2d")!;
      const stops = theme.sky.map((hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
      const bands = 18;
      const colorAt = (t: number) => {
        const seg = t < 0.55 ? 0 : 1;
        const lt = seg === 0 ? t / 0.55 : (t - 0.55) / 0.45;
        const a = stops[seg];
        const b = stops[seg + 1];
        return `rgb(${Math.round(a[0] + (b[0] - a[0]) * lt)},${Math.round(a[1] + (b[1] - a[1]) * lt)},${Math.round(a[2] + (b[2] - a[2]) * lt)})`;
      };
      const bh = H / bands;
      for (let i = 0; i < bands; i++) {
        k.fillStyle = colorAt(i / (bands - 1));
        k.fillRect(0, Math.floor(i * bh), W, Math.ceil(bh) + 1);
        if (i > 0) {
          // dither the seam with the previous band colour
          k.fillStyle = colorAt((i - 1) / (bands - 1));
          const y = Math.floor(i * bh);
          for (let x = 0; x < W; x += 2) k.fillRect(x + (y % 2), y, 1, 1);
          for (let x = 0; x < W; x += 4) k.fillRect(x + ((y + 1) % 2), y + 1, 1, 1);
        }
      }
      this.skyCache.set(theme.id, c);
    }
    g.drawImage(c, 0, 0);
  }

  private bgWaterfall(g: CanvasRenderingContext2D, camX: number, py: number, frame: number) {
    const W = C.VIEW_W;
    const off = (camX * 0.25) % 900;
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(620 - off + k * 900);
      if (x < -40 || x > W + 40) continue;
      const top = Math.round(120 + py * 0.6);
      const h = 100;
      g.fillStyle = "#3f8fe8";
      g.fillRect(x, top, 18, h);
      g.fillStyle = "#8fd0ff";
      for (let i = 0; i < 6; i++) {
        const yy = top + ((frame * 3 + i * 17) % h);
        g.fillRect(x + 2 + (i * 5) % 14, yy, 2, 6);
      }
      g.fillStyle = "rgba(255,255,255,0.8)";
      for (let i = 0; i < 6; i++) g.fillRect(x - 4 + i * 5, top + h - 3 + ((frame + i * 4) % 6 < 3 ? 0 : 1), 3, 2);
      g.fillStyle = "#2f6fc8";
      g.fillRect(x - 3, top - 3, 24, 3);
    }
  }

  private bgBirds(g: CanvasRenderingContext2D, camX: number, py: number, frame: number) {
    g.fillStyle = "#3a1a3a";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 + frame * 0.4 - camX * 0.08) % 520 + 520) % 520 - 20;
      const y = 60 + i * 14 + py * 0.3 + Math.sin(frame * 0.05 + i) * 4;
      const flap = (frame >> 3) % 2 === 0 ? 1 : -1;
      g.fillRect(Math.round(x), Math.round(y), 3, 1);
      g.fillRect(Math.round(x) - 2, Math.round(y) - flap, 2, 1);
      g.fillRect(Math.round(x) + 3, Math.round(y) - flap, 2, 1);
    }
  }

  private bgFireflies(g: CanvasRenderingContext2D, camX: number, py: number, frame: number) {
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97 + Math.sin(frame * 0.01 + i) * 30 - camX * 0.4) % 520 + 520) % 520 - 20;
      const y = 150 + (i * 23) % 80 + py * 0.8 + Math.sin(frame * 0.03 + i * 2) * 6;
      const on = (frame + i * 17) % 90 < 45;
      if (!on) continue;
      g.fillStyle = "rgba(220,255,120,0.9)";
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
      g.fillStyle = "rgba(220,255,120,0.3)";
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 4, 4);
    }
  }

  private bgEmbers(g: CanvasRenderingContext2D, frame: number) {
    for (let i = 0; i < 18; i++) {
      const life = (frame + i * 29) % 240;
      const x = (i * 53 + Math.sin(life * 0.05 + i) * 10) % C.VIEW_W;
      const y = C.VIEW_H - life * 1.1;
      if (y < 0) continue;
      g.fillStyle = life % 8 < 4 ? "#ff9040" : "#ffd060";
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  private bgAirship(g: CanvasRenderingContext2D, camX: number, py: number, frame: number) {
    const x = Math.round(((frame * 0.25 - camX * 0.1) % 700 + 700) % 700 - 100);
    const y = Math.round(70 + py * 0.3 + Math.sin(frame * 0.02) * 3);
    g.fillStyle = "#2a3050";
    g.beginPath();
    g.ellipse(x, y, 30, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3e4870";
    g.beginPath();
    g.ellipse(x, y - 2, 28, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a2040";
    g.fillRect(x - 8, y + 8, 16, 5);
    g.fillStyle = (frame >> 3) % 2 === 0 ? "#ff5050" : "#600";
    g.fillRect(x + 26, y - 1, 2, 2);
    g.fillStyle = "#ffd060";
    g.fillRect(x - 5, y + 9, 2, 2);
    g.fillRect(x + 2, y + 9, 2, 2);
  }

  private bgMountains(g: CanvasRenderingContext2D, camX: number, py: number, color: string, frame: number) {
    const W = C.VIEW_W;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, C.VIEW_H);
    for (let x = 0; x <= W; x += 6) {
      const wx = x + camX * 0.12;
      const y = 120 + py * 0.5 + Math.sin(wx * 0.006) * 26 + Math.sin(wx * 0.017) * 12 + Math.abs(Math.sin(wx * 0.031)) * 10;
      g.lineTo(x, y);
    }
    g.lineTo(W, C.VIEW_H);
    g.closePath();
    g.fill();
    // snow caps / highlights
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let x = 0; x <= W; x += 6) {
      const wx = x + camX * 0.12;
      const y = 120 + py * 0.5 + Math.sin(wx * 0.006) * 26 + Math.sin(wx * 0.017) * 12 + Math.abs(Math.sin(wx * 0.031)) * 10;
      if (Math.sin(wx * 0.031) > 0.92) g.fillRect(x, y, 6, 3);
    }
    // clouds drifting
    g.fillStyle = "rgba(255,255,255,0.9)";
    const off = (camX * 0.06 + frame * 0.08) % 600;
    for (let k = -1; k <= 1; k++) {
      for (const [cx, cy, s] of [[40, 40, 1], [200, 70, 0.7], [330, 30, 1.2], [480, 80, 0.8]]) {
        this.cloud(g, cx - off + k * 600, cy + py * 0.3, s);
      }
    }
  }

  private bgDunes(g: CanvasRenderingContext2D, camX: number, py: number, color: string) {
    const W = C.VIEW_W;
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer === 0 ? color : "rgba(255,180,120,0.35)";
      g.beginPath();
      g.moveTo(0, C.VIEW_H);
      for (let x = 0; x <= W; x += 6) {
        const wx = x + camX * (0.1 + layer * 0.06);
        const y = 130 + layer * 14 + py * 0.5 + Math.sin(wx * 0.008 + layer) * 18 + Math.sin(wx * 0.021) * 6;
        g.lineTo(x, y);
      }
      g.lineTo(W, C.VIEW_H);
      g.closePath();
      g.fill();
    }
  }

  private bgRuins(g: CanvasRenderingContext2D, camX: number, py: number, color: string) {
    const W = C.VIEW_W;
    g.fillStyle = color;
    const base = 150 + py * 0.5;
    g.fillRect(0, base, W, C.VIEW_H - base);
    const off = (camX * 0.15) % 320;
    for (let k = -1; k <= 2; k++) {
      const bx = k * 320 - off;
      // columns
      for (let i = 0; i < 4; i++) {
        const cx = bx + 30 + i * 60;
        const h = 40 + (i % 2) * 18;
        g.fillRect(cx, base - h, 10, h);
        g.fillRect(cx - 3, base - h - 4, 16, 4);
      }
      // arch
      g.beginPath();
      g.moveTo(bx + 260, base);
      g.lineTo(bx + 260, base - 40);
      g.arc(bx + 285, base - 40, 25, Math.PI, 0);
      g.lineTo(bx + 310, base);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(0, base, W, 2);
  }

  private bgCave(g: CanvasRenderingContext2D, camX: number, py: number, color: string) {
    const W = C.VIEW_W;
    g.fillStyle = color;
    const off = (camX * 0.15) % 240;
    g.beginPath();
    g.moveTo(0, 0);
    for (let x = -240; x <= W + 240; x += 12) {
      const wx = x + off;
      const y = 40 + py * 0.4 + Math.abs(Math.sin(wx * 0.05)) * 40 + Math.sin(wx * 0.013) * 10;
      g.lineTo(x - off + 240, y);
    }
    g.lineTo(W, 0);
    g.closePath();
    g.fill();
    // stalagmites
    g.beginPath();
    g.moveTo(0, C.VIEW_H);
    for (let x = -240; x <= W + 240; x += 12) {
      const wx = x + off;
      const y = 200 + py * 0.5 - Math.abs(Math.sin(wx * 0.04)) * 50 - Math.sin(wx * 0.011) * 10;
      g.lineTo(x - off + 240, y);
    }
    g.lineTo(W, C.VIEW_H);
    g.closePath();
    g.fill();
  }

  private bgCloudBank(g: CanvasRenderingContext2D, camX: number, py: number, color: string, frame: number) {
    g.fillStyle = color;
    const off = (camX * 0.12 + frame * 0.1) % 400;
    for (let k = -1; k <= 1; k++) {
      for (const [cx, cy, s] of [[30, 150, 1.6], [180, 170, 1.2], [300, 140, 1.8], [420, 175, 1.1]]) {
        this.cloud(g, cx - off + k * 400, cy + py * 0.4, s);
      }
    }
    g.fillStyle = "rgba(255,255,255,0.5)";
    const off2 = (camX * 0.2 + frame * 0.2) % 400;
    for (let k = -1; k <= 1; k++) {
      for (const [cx, cy, s] of [[90, 230, 1.8], [260, 245, 1.5], [400, 235, 2]]) {
        this.cloud(g, cx - off2 + k * 400, cy + py * 0.5, s);
      }
    }
  }

  private bgOcean(g: CanvasRenderingContext2D, camX: number, py: number, theme: Theme, frame: number) {
    const W = C.VIEW_W;
    const oceanY = Math.round(160 + py * 0.7);
    const grad = g.createLinearGradient(0, oceanY, 0, oceanY + 80);
    grad.addColorStop(0, theme.midColor);
    grad.addColorStop(1, theme.midColor2);
    g.fillStyle = grad;
    g.fillRect(0, oceanY, W, C.VIEW_H - oceanY);
    g.fillStyle = "rgba(255,255,255,0.45)";
    for (let row = 0; row < 6; row++) {
      const y = oceanY + 6 + row * 9;
      const off = (camX * (0.25 + row * 0.05) + frame * (0.4 + row * 0.15)) % 40;
      for (let x = -40; x < W + 40; x += 40) g.fillRect(Math.round(x - off), y, 14 + row * 2, 1);
    }
  }

  private bgHills(g: CanvasRenderingContext2D, camX: number, py: number, theme: Theme) {
    const W = C.VIEW_W;
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer === 0 ? theme.midColor : theme.midColor2;
      g.beginPath();
      g.moveTo(0, C.VIEW_H);
      for (let x = 0; x <= W; x += 6) {
        const wx = x + camX * (0.25 + layer * 0.1);
        const y = 170 + layer * 20 + py * 0.7 + Math.sin(wx * 0.007 + layer * 2) * 16 + Math.sin(wx * 0.02) * 6;
        g.lineTo(x, y);
      }
      g.lineTo(W, C.VIEW_H);
      g.closePath();
      g.fill();
    }
  }

  private bgLava(g: CanvasRenderingContext2D, camX: number, py: number, theme: Theme, frame: number) {
    const W = C.VIEW_W;
    const y0 = Math.round(185 + py * 0.7);
    const grad = g.createLinearGradient(0, y0, 0, y0 + 60);
    grad.addColorStop(0, theme.midColor2);
    grad.addColorStop(1, theme.midColor);
    g.fillStyle = grad;
    g.fillRect(0, y0, W, C.VIEW_H - y0);
    g.fillStyle = "rgba(255,240,150,0.5)";
    for (let row = 0; row < 4; row++) {
      const y = y0 + 8 + row * 12;
      const off = (camX * (0.3 + row * 0.05) + frame * 0.3) % 50;
      for (let x = -50; x < W + 50; x += 50) g.fillRect(Math.round(x - off), y, 10 + row * 3, 2);
    }
    // glow at the horizon
    const glow = g.createLinearGradient(0, y0 - 30, 0, y0);
    glow.addColorStop(0, "rgba(255,120,40,0)");
    glow.addColorStop(1, "rgba(255,120,40,0.5)");
    g.fillStyle = glow;
    g.fillRect(0, y0 - 30, W, 30);
  }

  private bgCity(g: CanvasRenderingContext2D, camX: number, py: number, theme: Theme, frame: number) {
    const base = Math.round(210 + py * 0.7);
    g.fillStyle = theme.midColor;
    const off = (camX * 0.3) % 240;
    for (let k = -1; k <= 2; k++) {
      const bx = k * 240 - off;
      const towers = [[0, 60, 30], [40, 90, 22], [70, 50, 40], [120, 110, 26], [156, 70, 34], [200, 95, 24]];
      for (const [tx, th, tw] of towers) {
        g.fillStyle = theme.midColor;
        g.fillRect(bx + tx, base - th, tw, th + 60);
        g.fillStyle = theme.midColor2;
        g.fillRect(bx + tx + 2, base - th + 2, tw - 4, 3);
        // windows
        for (let wy = base - th + 8; wy < base - 4; wy += 8) {
          for (let wx = bx + tx + 4; wx < bx + tx + tw - 4; wx += 6) {
            const lit = ((wx * 7 + wy * 13) % 5 === 0) !== ((frame >> 5) % 7 === 0 && (wx + wy) % 11 === 0);
            g.fillStyle = lit ? "rgba(255,220,120,0.8)" : "rgba(0,0,0,0.25)";
            g.fillRect(wx, wy, 2, 3);
          }
        }
        // antenna light
        g.fillStyle = (frame >> 4) % 2 === 0 ? "#ff4040" : "#801010";
        g.fillRect(bx + tx + tw / 2, base - th - 6, 2, 2);
      }
    }
  }

  private bgNearHills(g: CanvasRenderingContext2D, camX: number, py: number, theme: Theme) {
    const W = C.VIEW_W;
    g.fillStyle = theme.grass[0];
    g.beginPath();
    g.moveTo(0, C.VIEW_H);
    for (let x = 0; x <= W; x += 6) {
      const wx = x + camX * 0.5;
      const y = 218 + py * 0.9 + Math.sin(wx * 0.009 + 1) * 14 + Math.sin(wx * 0.025) * 5;
      g.lineTo(x, y);
    }
    g.lineTo(W, C.VIEW_H);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.beginPath();
    g.moveTo(0, C.VIEW_H);
    for (let x = 0; x <= W; x += 6) {
      const wx = x + camX * 0.5;
      const y = 236 + py * 0.9 + Math.sin(wx * 0.009 + 1) * 14 + Math.sin(wx * 0.025) * 5;
      g.lineTo(x, y);
    }
    g.lineTo(W, C.VIEW_H);
    g.closePath();
    g.fill();
  }

  private bgSmallClouds(g: CanvasRenderingContext2D, camX: number, py: number, frame: number) {
    g.fillStyle = "rgba(255,255,255,0.85)";
    const off = (camX * 0.5 + frame * 0.3) % 300;
    for (let k = -1; k <= 2; k++) {
      for (const [cx, cy, s] of [[20, 250, 1.2], [150, 262, 0.9], [240, 245, 1.4]]) this.cloud(g, cx - off + k * 300, cy + py, s);
    }
  }

  private cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
    g.beginPath();
    g.arc(x, y, 11 * s, 0, Math.PI * 2);
    g.arc(x + 13 * s, y - 5 * s, 13 * s, 0, Math.PI * 2);
    g.arc(x + 28 * s, y, 11 * s, 0, Math.PI * 2);
    g.arc(x + 14 * s, y + 4 * s, 10 * s, 0, Math.PI * 2);
    g.fill();
  }

  // ------------------------------------------------------------------
  // Terrain
  // ------------------------------------------------------------------
  private drawWater(g: CanvasRenderingContext2D, game: Game, theme: Theme, x0: number, x1: number) {
    const top = WATER_Y;
    const bottom = game.level.height + 100;
    const grad = g.createLinearGradient(0, top, 0, bottom);
    grad.addColorStop(0, theme.water[0]);
    grad.addColorStop(1, theme.water[1]);
    g.fillStyle = grad;
    g.fillRect(x0, top, x1 - x0, bottom - top);
    g.fillStyle = theme.id === "magma" ? "rgba(255,240,160,0.7)" : "rgba(255,255,255,0.5)";
    const off = (game.frame * 0.5) % 24;
    for (let x = Math.floor(x0 / 24) * 24 - 24; x < x1 + 24; x += 24) {
      g.fillRect(Math.round(x + off), top + 1 + Math.round(Math.sin((x + game.frame * 2) * 0.05)), 10, 1);
      g.fillRect(Math.round(x + off + 6), top + 6, 6, 1);
    }
    if (theme.id === "magma") {
      // bubbles
      for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) {
        const t = (game.frame + x) % 90;
        if (t < 30) {
          g.fillStyle = "rgba(255,220,120,0.8)";
          g.beginPath();
          g.arc(x + 12, top + 10 - t * 0.3, 2 + t * 0.06, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }

  private drawTerrain(g: CanvasRenderingContext2D, game: Game, theme: Theme, pats: ThemePatterns, x0: number, x1: number) {
    const segs = game.level.segments;
    const bottom = game.level.height + 100;
    const step = 4;
    const runs: { x: number; y: number }[][] = [];
    let run: { x: number; y: number }[] = [];
    for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
      const y = groundAtSegs(segs, x);
      if (y === null) {
        if (run.length) runs.push(run);
        run = [];
      } else run.push({ x, y });
    }
    if (run.length) runs.push(run);

    for (const pts of runs) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      g.beginPath();
      g.moveTo(first.x, bottom);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.lineTo(last.x, bottom);
      g.closePath();
      g.fillStyle = pats.ground;
      g.fill();

      this.drawEdge(g, pts, theme);
      // cliff walls at the run ends (edges of pits)
      const wallShade = "rgba(0,0,0,0.28)";
      g.fillStyle = wallShade;
      if (groundAtSegs(segs, first.x - step) === null) g.fillRect(first.x, first.y, 4, bottom - first.y);
      if (groundAtSegs(segs, last.x + step) === null) g.fillRect(last.x - 4, last.y, 4, bottom - last.y);
    }
  }

  private strokePath(g: CanvasRenderingContext2D, pts: { x: number; y: number }[], dy: number, color: string, width: number) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y + dy) : g.lineTo(p.x, p.y + dy)));
    g.stroke();
  }

  /** Surface strip along the terrain, styled per theme. */
  private drawEdge(g: CanvasRenderingContext2D, pts: { x: number; y: number }[], theme: Theme) {
    g.lineCap = "round";
    switch (theme.edge) {
      case "grass":
      case "sand": {
        this.strokePath(g, pts, 11, theme.groundEdge, 4);
        this.strokePath(g, pts, 3, theme.grass[0], 8);
        this.strokePath(g, pts, -1, theme.grass[1], 3);
        this.strokePath(g, pts, -2, "rgba(255,255,255,0.35)", 1);
        // blades / pebbles
        g.fillStyle = theme.edge === "grass" ? theme.grass[1] : "rgba(255,255,255,0.5)";
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          const k = Math.floor(p.x / 4) % 7;
          if (k === 0) g.fillRect(Math.round(p.x), Math.round(p.y) - 5, 1, 4);
          else if (k === 3) g.fillRect(Math.round(p.x), Math.round(p.y) - 4, 1, 3);
        }
        g.fillStyle = "rgba(0,0,0,0.25)";
        for (let i = 0; i < pts.length; i += 3) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 5 === 0) g.fillRect(Math.round(p.x), Math.round(p.y) + 5, 2, 1);
        }
        break;
      }
      case "moss": {
        this.strokePath(g, pts, 8, theme.groundEdge, 4);
        this.strokePath(g, pts, 2, "#5a6a6a", 6);
        this.strokePath(g, pts, -1, theme.grass[0], 4);
        this.strokePath(g, pts, -2, theme.grass[1], 2);
        g.fillStyle = theme.grass[0];
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          const k = Math.floor(p.x / 4) % 9;
          if (k === 0) g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 2, 6);
          if (k === 5) g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 1, 4);
        }
        break;
      }
      case "crust": {
        this.strokePath(g, pts, 8, "#1a0808", 4);
        this.strokePath(g, pts, 2, theme.grass[0], 7);
        this.strokePath(g, pts, -1, theme.grass[1], 3);
        g.fillStyle = "#ffb040";
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          const k = Math.floor(p.x / 4) % 11;
          if (k === 0 || k === 6) g.fillRect(Math.round(p.x), Math.round(p.y) + 1, 3, 1);
        }
        break;
      }
      case "metal": {
        this.strokePath(g, pts, 8, "#1a2030", 3);
        this.strokePath(g, pts, 2, "#8a94b0", 7);
        this.strokePath(g, pts, -1, "#c8d0e0", 2);
        // hazard stripes
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const k = Math.floor(p.x / 4) % 4;
          g.fillStyle = k < 2 ? theme.grass[0] : "#222";
          g.fillRect(Math.round(p.x), Math.round(p.y) + 3, 4, 3);
        }
        g.fillStyle = "#e8eef8";
        for (let i = 0; i < pts.length; i += 4) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 8 === 0) g.fillRect(Math.round(p.x), Math.round(p.y) - 1, 2, 1);
        }
        break;
      }
    }
    g.lineCap = "butt";
  }

  private drawPlatforms(g: CanvasRenderingContext2D, game: Game, theme: Theme, pats: ThemePatterns, x0: number, x1: number) {
    for (const p of game.platforms) {
      if (p.px + p.w < x0 || p.px > x1 || p.gone > 0) continue;
      const sx = p.shake ? Math.round((Math.random() - 0.5) * 2) : 0;
      const px = Math.round(p.px + sx);
      const py = Math.round(p.py);
      if (p.solid) {
        g.fillStyle = pats.block;
        g.fillRect(px, py, p.w, p.h);
        g.fillStyle = "rgba(255,255,255,0.3)";
        g.fillRect(px, py, p.w, 2);
        g.fillRect(px, py, 2, p.h);
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(px, py + p.h - 2, p.w, 2);
        g.fillRect(px + p.w - 2, py, 2, p.h);
      } else {
        g.fillStyle = pats.ground;
        g.fillRect(px, py, p.w, p.h);
        g.fillStyle = theme.groundEdge;
        g.fillRect(px, py + p.h - 3, p.w, 3);
        g.fillRect(px, py + 6, p.w, 2);
        g.fillStyle = theme.grass[0];
        g.fillRect(px - 2, py - 2, p.w + 4, 7);
        g.fillStyle = theme.grass[1];
        g.fillRect(px - 2, py - 2, p.w + 4, 2);
        if (p.crumble) {
          g.strokeStyle = "rgba(0,0,0,0.5)";
          g.lineWidth = 1;
          g.beginPath();
          for (let cx = px + 8; cx < px + p.w; cx += 14) {
            g.moveTo(cx, py + 4);
            g.lineTo(cx + 3, py + 9);
            g.lineTo(cx - 2, py + p.h - 2);
          }
          g.stroke();
        }
      }
    }
  }

  private drawLoopBack(g: CanvasRenderingContext2D, loop: Loop, pats: ThemePatterns, theme: Theme) {
    const outer = loop.r + 22;
    g.fillStyle = theme.loop[0];
    g.fillRect(loop.cx - outer + 4, loop.cy, 8, loop.r + 22);
    g.fillRect(loop.cx + outer - 12, loop.cy, 8, loop.r + 22);
    g.beginPath();
    g.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    g.arc(loop.cx, loop.cy, loop.r, 0, Math.PI * 2, true);
    g.fillStyle = pats.loop;
    g.fill();
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    g.stroke();
  }

  private drawLoopFront(g: CanvasRenderingContext2D, loop: Loop, theme: Theme) {
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(loop.cx, loop.cy, loop.r + 1, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = theme.loop[0];
    g.lineWidth = 1;
    g.beginPath();
    g.arc(loop.cx, loop.cy, loop.r + 3, 0, Math.PI * 2);
    g.stroke();
  }

  // ------------------------------------------------------------------
  // Decoration
  // ------------------------------------------------------------------
  private drawDecor(g: CanvasRenderingContext2D, d: Decor, frame: number, theme: Theme) {
    const s = d.scale ?? 1;
    const x = Math.round(d.x);
    const y = Math.round(d.y);
    switch (d.kind) {
      case "palm": {
        g.strokeStyle = "#6a3f18";
        g.lineWidth = 6 * s;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x, y + 2);
        g.quadraticCurveTo(x + 10 * s, y - 40 * s, x + 5 * s, y - 72 * s);
        g.stroke();
        g.strokeStyle = "#a06a30";
        g.lineWidth = 2;
        for (let i = 1; i < 7; i++) {
          const t = i / 7;
          const px = x + 2 * (1 - t) * t * 10 * s + t * t * 5 * s;
          const py = y + 2 - 74 * s * t;
          g.beginPath();
          g.moveTo(px - 3 * s, py);
          g.lineTo(px + 3 * s, py);
          g.stroke();
        }
        const tx = x + 5 * s;
        const ty = y - 72 * s;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI * 0.95 + (i / 5) * Math.PI * 0.9 + Math.sin(frame * 0.02 + i) * 0.05;
          g.strokeStyle = i % 2 ? "#2f9e33" : "#3fbf3f";
          g.lineWidth = 5 * s;
          g.beginPath();
          g.moveTo(tx, ty);
          g.quadraticCurveTo(tx + Math.cos(a) * 26 * s, ty + Math.sin(a) * 26 * s - 10 * s, tx + Math.cos(a) * 40 * s, ty + Math.sin(a) * 40 * s + 14 * s);
          g.stroke();
        }
        g.fillStyle = "#5a3210";
        g.beginPath();
        g.arc(tx - 3 * s, ty + 5 * s, 3.5 * s, 0, Math.PI * 2);
        g.arc(tx + 4 * s, ty + 5 * s, 3.5 * s, 0, Math.PI * 2);
        g.fill();
        g.lineCap = "butt";
        break;
      }
      case "bush": {
        g.fillStyle = "#1e7a2a";
        g.beginPath();
        g.arc(x - 9 * s, y - 6 * s, 9 * s, 0, Math.PI * 2);
        g.arc(x + 1, y - 12 * s, 11 * s, 0, Math.PI * 2);
        g.arc(x + 11 * s, y - 6 * s, 8 * s, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#3fbf3f";
        g.beginPath();
        g.arc(x - 8 * s, y - 8 * s, 5 * s, 0, Math.PI * 2);
        g.arc(x + 2, y - 15 * s, 6 * s, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case "flower": {
        g.fillStyle = "#2f9e33";
        g.fillRect(x - 1, y - 24 * s, 2, 24 * s);
        g.fillRect(x + 1, y - 14 * s, 5, 2);
        const rot = frame * 0.03 + d.x;
        g.fillStyle = "#ffd23f";
        for (let i = 0; i < 8; i++) {
          const a = rot + (i / 8) * Math.PI * 2;
          g.beginPath();
          g.ellipse(x + Math.cos(a) * 6 * s, y - 26 * s + Math.sin(a) * 6 * s, 4 * s, 2.5 * s, a, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#e8442f";
        g.beginPath();
        g.arc(x, y - 26 * s, 3.5 * s, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case "totem": {
        g.fillStyle = "#8a5a2b";
        g.fillRect(x - 8, y - 56, 16, 58);
        g.fillStyle = "#5b3a16";
        for (let i = 0; i < 3; i++) {
          const ty = y - 50 + i * 17;
          g.fillRect(x - 6, ty, 4, 3);
          g.fillRect(x + 2, ty, 4, 3);
          g.fillRect(x - 5, ty + 7, 10, 2);
        }
        g.fillStyle = "#c78b4e";
        g.fillRect(x - 10, y - 58, 20, 3);
        break;
      }
      case "column": {
        const h = 60 * s;
        g.fillStyle = "#8a8a9a";
        g.fillRect(x - 6, y - h, 12, h + 2);
        g.fillStyle = "#b0b0c0";
        g.fillRect(x - 4, y - h, 3, h);
        g.fillStyle = "#6a6a7a";
        g.fillRect(x + 2, y - h, 3, h);
        g.fillStyle = "#9a9aaa";
        g.fillRect(x - 9, y - h - 4, 18, 5);
        g.fillRect(x - 9, y - 4, 18, 5);
        g.fillStyle = "#3a9a5a";
        g.fillRect(x - 6, y - h + 10, 4, 12);
        g.fillRect(x + 2, y - h + 30, 4, 8);
        break;
      }
      case "ruinwall": {
        g.fillStyle = "#7a7a8a";
        g.fillRect(x - 20, y - 30, 40, 32);
        g.fillStyle = "#5a5a6a";
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) g.fillRect(x - 20 + col * 10 + (row % 2) * 5, y - 30 + row * 8, 9, 7);
        g.fillStyle = "#9a9aaa";
        g.fillRect(x - 20, y - 30, 40, 1);
        g.fillStyle = "#3a9a5a";
        g.fillRect(x - 18, y - 20, 6, 3);
        g.fillRect(x + 6, y - 12, 8, 3);
        break;
      }
      case "torch": {
        g.fillStyle = "#4a3a2a";
        g.fillRect(x - 2, y - 36, 4, 38);
        g.fillStyle = "#8a6a3a";
        g.fillRect(x - 4, y - 38, 8, 4);
        const f = Math.sin(frame * 0.3 + d.x) * 2;
        g.fillStyle = "#ff8020";
        g.beginPath();
        g.ellipse(x, y - 44, 4, 7 + f, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#ffe060";
        g.beginPath();
        g.ellipse(x, y - 43, 2, 4 + f * 0.5, 0, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case "crystal": {
        const h = 28 * s;
        for (const [dx, hh, col] of [[-8, h * 0.7, "#b060ff"], [0, h, "#d090ff"], [8, h * 0.6, "#a050e0"]] as [number, number, string][]) {
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(x + dx - 5, y + 2);
          g.lineTo(x + dx, y - hh);
          g.lineTo(x + dx + 5, y + 2);
          g.closePath();
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.5)";
          g.beginPath();
          g.moveTo(x + dx - 3, y + 2);
          g.lineTo(x + dx, y - hh + 4);
          g.lineTo(x + dx - 1, y + 2);
          g.closePath();
          g.fill();
        }
        break;
      }
      case "lavaburst": {
        const t = (frame + d.x) % 120;
        if (t < 50) {
          g.fillStyle = "#ff8020";
          const hh = Math.sin((t / 50) * Math.PI) * 30 * s;
          g.beginPath();
          g.moveTo(x - 4, y);
          g.lineTo(x, y - hh);
          g.lineTo(x + 4, y);
          g.closePath();
          g.fill();
          g.fillStyle = "#ffe060";
          g.fillRect(x - 1, y - hh * 0.8, 2, hh * 0.6);
        }
        g.fillStyle = "#3a2020";
        g.fillRect(x - 7, y - 3, 14, 4);
        break;
      }
      case "rock": {
        g.fillStyle = "#6a6a70";
        g.beginPath();
        g.ellipse(x, y - 5 * s, 12 * s, 7 * s, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#8a8a90";
        g.beginPath();
        g.ellipse(x - 3 * s, y - 8 * s, 5 * s, 3 * s, 0, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case "umbrella": {
        g.fillStyle = "#e8e8e8";
        g.fillRect(x - 1, y - 40, 2, 42);
        g.fillStyle = "#e84040";
        g.beginPath();
        g.arc(x, y - 38, 18, Math.PI, 0);
        g.closePath();
        g.fill();
        g.fillStyle = "#fff";
        for (let i = -1; i <= 1; i += 2) {
          g.beginPath();
          g.moveTo(x, y - 38);
          g.lineTo(x + i * 6, y - 38);
          g.lineTo(x + i * 9, y - 52);
          g.closePath();
          g.fill();
        }
        break;
      }
      case "antenna": {
        g.fillStyle = "#3a4058";
        g.fillRect(x - 2, y - 50 * s, 4, 52 * s);
        g.fillRect(x - 8, y - 30 * s, 16, 2);
        g.fillRect(x - 5, y - 44 * s, 10, 2);
        g.fillStyle = (frame >> 4) % 2 === 0 ? "#ff5050" : "#701010";
        g.fillRect(x - 1, y - 53 * s, 2, 3);
        break;
      }
      case "pipe": {
        g.fillStyle = "#505870";
        g.fillRect(x - 6, y - 26, 12, 28);
        g.fillStyle = "#6a7290";
        g.fillRect(x - 8, y - 28, 16, 4);
        g.fillStyle = "#3a4058";
        g.fillRect(x - 3, y - 20, 2, 18);
        if ((frame + d.x) % 80 < 40) {
          g.fillStyle = "rgba(255,255,255,0.3)";
          g.beginPath();
          g.arc(x, y - 34 - ((frame + d.x) % 40) * 0.3, 4, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
    }
    void theme;
  }

  // ------------------------------------------------------------------
  // Objects
  // ------------------------------------------------------------------
  private drawRing(g: CanvasRenderingContext2D, x: number, y: number, frame: number) {
    const ph = Math.abs(Math.cos(frame * 0.12 + x * 0.02));
    const sx = Math.max(0.2, ph);
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(sx, 1);
    g.lineWidth = 3;
    g.strokeStyle = "#d89000";
    g.beginPath();
    g.arc(0, 0, 6, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.5;
    g.strokeStyle = "#ffe060";
    g.beginPath();
    g.arc(0, 0, 6, -2.6, -0.6);
    g.stroke();
    g.strokeStyle = "#a06000";
    g.lineWidth = 1;
    g.beginPath();
    g.arc(0, 0, 7.2, 0.4, 2.2);
    g.stroke();
    g.restore();
    if ((frame + Math.round(x)) % 48 < 5) {
      g.fillStyle = "#fff";
      const rx = Math.round(x) + 4;
      const ry = Math.round(y) - 5;
      g.fillRect(rx - 1, ry - 3, 2, 7);
      g.fillRect(rx - 3, ry - 1, 7, 2);
    }
  }

  private drawRingSparkle(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const r = (16 - t) * 0.7 + 2;
    g.fillStyle = `rgba(255,240,150,${t / 16})`;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 2, 2);
    }
    g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }

  private drawSpring(g: CanvasRenderingContext2D, x: number, y: number, anim: number, strong: boolean) {
    const ext = anim > 0 ? 8 : 0;
    x = Math.round(x);
    y = Math.round(y);
    g.fillStyle = strong ? "#c62828" : "#c8a020";
    g.fillRect(x - 14, y + 2, 28, 8);
    g.fillStyle = strong ? "#7a1414" : "#7a6010";
    g.fillRect(x - 14, y + 8, 28, 3);
    g.fillStyle = "#d0d0d0";
    for (let i = 0; i < 3; i++) g.fillRect(x - 8, y + 1 - i * (2 + ext / 2), 16, 1);
    g.fillStyle = strong ? "#ffd23f" : "#ffe680";
    g.fillRect(x - 14, y - 4 - ext, 28, 6);
    g.fillStyle = "#fff6c0";
    g.fillRect(x - 14, y - 4 - ext, 28, 2);
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(x - 14, y, 28, 1);
  }

  private drawSpikes(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
    x = Math.round(x);
    y = Math.round(y);
    for (let sx = x; sx < x + w; sx += 8) {
      g.fillStyle = "#8a90a0";
      g.beginPath();
      g.moveTo(sx, y + 12);
      g.lineTo(sx + 4, y);
      g.lineTo(sx + 8, y + 12);
      g.closePath();
      g.fill();
      g.fillStyle = "#e6e9f0";
      g.beginPath();
      g.moveTo(sx + 1, y + 12);
      g.lineTo(sx + 4, y + 1);
      g.lineTo(sx + 4, y + 12);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#4b4f5c";
    g.fillRect(x, y + 11, w, 3);
  }

  private drawMonitor(g: CanvasRenderingContext2D, x: number, y: number, kind: string, broken: boolean, frame: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (broken) {
      g.fillStyle = "#6c6f7c";
      g.fillRect(x - 12, y - 6, 24, 6);
      g.fillStyle = "#4b4f5c";
      g.fillRect(x - 10, y - 8, 20, 2);
      return;
    }
    g.fillStyle = "#4b4f5c";
    g.fillRect(x - 9, y - 6, 18, 6);
    g.fillStyle = "#8a8ea0";
    g.fillRect(x - 12, y - 26, 24, 22);
    g.fillStyle = "#c0c4d0";
    g.fillRect(x - 12, y - 26, 24, 2);
    g.fillRect(x - 12, y - 26, 2, 22);
    g.fillStyle = "#2a2d38";
    g.fillRect(x - 10, y - 24, 20, 16);
    g.fillStyle = "#123a80";
    g.fillRect(x - 9, y - 23, 18, 14);
    if (frame % 40 < 22) {
      if (kind === "ring") this.drawRing(g, x, y - 16, 0);
      else if (kind === "shield") {
        g.strokeStyle = "#7fd4ff";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y - 16, 5, 0, Math.PI * 2);
        g.stroke();
      } else if (kind === "speed") {
        g.fillStyle = "#e53935";
        g.fillRect(x - 6, y - 16, 12, 5);
        g.fillStyle = "#fff";
        g.fillRect(x - 6, y - 17, 12, 1);
      } else if (kind === "invincible") {
        g.fillStyle = "#fff";
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          g.fillRect(Math.round(x + Math.cos(a) * 5) - 1, Math.round(y - 16 + Math.sin(a) * 5) - 1, 2, 2);
        }
      } else {
        this.drawHeroIcon(g, x, y - 16);
      }
    }
  }

  private drawHeroIcon(g: CanvasRenderingContext2D, x: number, y: number) {
    g.fillStyle = "#1f4fd8";
    g.beginPath();
    g.arc(x, y, 6, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(x - 4, y - 3);
    g.lineTo(x - 11, y - 1);
    g.lineTo(x - 4, y + 2);
    g.closePath();
    g.fill();
    g.fillStyle = "#f0c890";
    g.beginPath();
    g.arc(x + 3, y + 2, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(x + 1, y - 4, 3, 4);
    g.fillStyle = "#116a2a";
    g.fillRect(x + 3, y - 3, 1, 2);
  }

  private drawCheckpoint(g: CanvasRenderingContext2D, x: number, y: number, active: boolean, spin: number) {
    x = Math.round(x);
    y = Math.round(y);
    g.fillStyle = "#4b4f5c";
    g.fillRect(x - 6, y - 3, 12, 3);
    g.fillStyle = "#9aa0ad";
    g.fillRect(x - 2, y - 46, 4, 44);
    g.fillStyle = "#d0d4dd";
    g.fillRect(x - 2, y - 46, 1, 44);
    const wobble = active && spin < 18 ? Math.sin(spin * 2) * 6 : 0;
    g.fillStyle = "#333";
    g.beginPath();
    g.arc(x + wobble, y - 50, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = active ? "#e53935" : "#1f5fe0";
    g.beginPath();
    g.arc(x + wobble, y - 50, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.fillRect(x + wobble - 3, y - 53, 2, 2);
    if (active) {
      g.fillStyle = "#ffd23f";
      for (let i = 0; i < 5; i++) {
        const a = spin * 0.2 + (i / 5) * Math.PI * 2;
        g.fillRect(Math.round(x + wobble + Math.cos(a) * 9) - 1, Math.round(y - 50 + Math.sin(a) * 9) - 1, 2, 2);
      }
    }
  }

  private drawGoal(g: CanvasRenderingContext2D, game: Game) {
    const gl = game.level.goal;
    if (gl.x < game.camera.x - 60 || gl.x > game.camera.x + C.VIEW_W + 60) return;
    const x = Math.round(gl.x);
    const y = Math.round(gl.y);
    g.fillStyle = "#4b4f5c";
    g.fillRect(x - 8, y - 3, 16, 3);
    g.fillStyle = "#9aa0ad";
    g.fillRect(x - 2, y - 56, 4, 54);
    const spin = game.goalSpin;
    const sx = spin > 0 && spin < 150 ? Math.cos(spin * 0.35) : 1;
    const showHero = spin >= 150 || (spin > 0 && Math.cos(spin * 0.35) < 0);
    g.save();
    g.translate(x, y - 66);
    g.scale(Math.max(0.08, Math.abs(sx)), 1);
    g.fillStyle = "#222";
    g.fillRect(-24, -17, 48, 34);
    g.fillStyle = "#ffd23f";
    g.fillRect(-22, -15, 44, 30);
    g.fillStyle = "#c98f00";
    g.fillRect(-22, 11, 44, 4);
    if (showHero) {
      this.drawHeroIcon(g, 0, -2);
      g.fillStyle = "#fff";
    } else {
      // villain mug: red suit, goggles, big moustache
      g.fillStyle = "#b71c1c";
      g.fillRect(-12, -2, 24, 14);
      g.fillStyle = "#f5c6a0";
      g.fillRect(-9, -12, 18, 12);
      g.fillStyle = "#222";
      g.fillRect(-8, -10, 6, 3);
      g.fillRect(2, -10, 6, 3);
      g.fillRect(-11, -4, 22, 5);
      g.fillStyle = "#4a2a10";
      g.fillRect(-11, -4, 22, 5);
    }
    g.restore();
  }

  // ------------------------------------------------------------------
  // Enemies
  // ------------------------------------------------------------------
  private drawCrawler(g: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(dir, 1);
    // treads
    g.fillStyle = "#222";
    g.fillRect(-11, -8, 22, 8);
    g.fillStyle = "#555";
    for (let i = 0; i < 4; i++) g.fillRect(-10 + ((i * 6 + t) % 22), -7, 2, 6);
    // body
    g.fillStyle = "#7a1212";
    g.beginPath();
    g.ellipse(0, -13, 13, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e53935";
    g.beginPath();
    g.ellipse(0, -14, 12, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff8a80";
    g.beginPath();
    g.ellipse(-3, -17, 6, 2.5, 0, 0, Math.PI * 2);
    g.fill();
    // face
    g.fillStyle = "#fff";
    g.fillRect(6, -18, 5, 5);
    g.fillStyle = "#111";
    g.fillRect(9, -17, 2, 3);
    g.fillStyle = "#333";
    g.fillRect(9, -22, 1, 4);
    g.fillRect(9, -24 + Math.round(Math.sin(t * 0.2)), 3, 2);
    // exhaust
    if (t % 20 < 10) {
      g.fillStyle = "rgba(200,200,200,0.6)";
      g.fillRect(-15, -14, 3, 3);
    }
    g.restore();
  }

  private drawBuzzer(g: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.scale(dir, 1);
    const flap = (t >> 2) % 2 === 0;
    g.fillStyle = "rgba(220,240,255,0.85)";
    g.beginPath();
    g.ellipse(-2, flap ? -9 : -7, 9, 3, flap ? -0.3 : 0.2, 0, Math.PI * 2);
    g.ellipse(4, flap ? -9 : -7, 9, 3, flap ? 0.3 : -0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#222";
    g.beginPath();
    g.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffca28";
    g.beginPath();
    g.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#222";
    g.fillRect(-8, -6, 3, 12);
    g.fillRect(-2, -6, 3, 12);
    // stinger and head
    g.beginPath();
    g.moveTo(-12, 1);
    g.lineTo(-19, 4);
    g.lineTo(-12, 4);
    g.closePath();
    g.fill();
    g.fillStyle = "#333";
    g.beginPath();
    g.arc(11, -1, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff5050";
    g.fillRect(11, -3, 3, 3);
    g.restore();
  }

  private drawCrab(g: CanvasRenderingContext2D, x: number, y: number, t: number, paused: boolean) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    const legPhase = paused ? 0 : Math.sin(t * 0.3);
    g.fillStyle = "#7a1212";
    for (let i = -1; i <= 1; i += 2) {
      for (let k = 0; k < 2; k++) {
        const lx = i * (6 + k * 5);
        g.fillRect(lx - 1, -8, 2, 4 + Math.round(legPhase * (k ? 2 : -2)) + 4);
      }
    }
    g.fillStyle = "#7a1212";
    g.beginPath();
    g.ellipse(0, -11, 15, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e53935";
    g.beginPath();
    g.ellipse(0, -12, 14, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff8a80";
    g.fillRect(-8, -16, 16, 2);
    // claws
    const open = paused ? 3 : 1;
    for (const d of [-1, 1]) {
      g.fillStyle = "#c62828";
      g.beginPath();
      g.arc(d * 18, -14, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#7a1212";
      g.fillRect(d * 18 - (d > 0 ? 0 : 6), -17 - open, 6, 2);
      g.fillRect(d * 18 - (d > 0 ? 0 : 6), -11 + open, 6, 2);
    }
    // eyes on stalks
    g.fillStyle = "#333";
    g.fillRect(-5, -22, 1, 5);
    g.fillRect(4, -22, 1, 5);
    g.fillStyle = "#fff";
    g.fillRect(-7, -25, 4, 4);
    g.fillRect(3, -25, 4, 4);
    g.fillStyle = "#111";
    g.fillRect(-6, -24, 2, 2);
    g.fillRect(4, -24, 2, 2);
    g.restore();
  }

  private drawChopper(g: CanvasRenderingContext2D, x: number, y: number, vy: number) {
    g.save();
    g.translate(Math.round(x), Math.round(y));
    g.rotate(vy < 0 ? -0.3 : 0.4);
    g.fillStyle = "#7a1212";
    g.beginPath();
    g.ellipse(0, 0, 8, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e53935";
    g.beginPath();
    g.ellipse(0, 0, 7, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffb0b0";
    g.beginPath();
    g.ellipse(2, 3, 3, 5, 0, 0, Math.PI * 2);
    g.fill();
    // fins & tail
    g.fillStyle = "#c62828";
    g.beginPath();
    g.moveTo(-3, 9);
    g.lineTo(-8, 16);
    g.lineTo(2, 15);
    g.closePath();
    g.fill();
    g.fillRect(-9, -2, 4, 6);
    // mouth and eye
    g.fillStyle = "#fff";
    g.fillRect(1, -8, 4, 4);
    g.fillStyle = "#111";
    g.fillRect(3, -7, 2, 2);
    g.fillStyle = "#111";
    g.fillRect(2, -2, 6, 1);
    g.fillStyle = "#fff";
    g.fillRect(3, -1, 1, 2);
    g.fillRect(6, -1, 1, 2);
    g.restore();
  }

  private drawSpikeball(g: CanvasRenderingContext2D, px: number, py: number, x: number, y: number) {
    g.fillStyle = "#555";
    g.beginPath();
    g.arc(px, py, 4, 0, Math.PI * 2);
    g.fill();
    const n = 5;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      g.fillStyle = "#9a9aa0";
      g.fillRect(Math.round(px + (x - px) * t) - 1, Math.round(py + (y - py) * t) - 1, 3, 3);
    }
    g.fillStyle = "#222";
    g.beginPath();
    g.arc(x, y, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#6a6a72";
    g.beginPath();
    g.arc(x, y, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#d0d0d8";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      g.lineTo(x + Math.cos(a + 0.3) * 6, y + Math.sin(a + 0.3) * 6);
      g.lineTo(x + Math.cos(a + 0.15) * 11, y + Math.sin(a + 0.15) * 11);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#fff";
    g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 2, 2);
  }

  private drawProjectile(g: CanvasRenderingContext2D, x: number, y: number, kind: "shot" | "fireball", frame: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (kind === "shot") {
      g.fillStyle = "#ffe040";
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.fillRect(x - 1, y - 1, 2, 2);
    } else {
      g.fillStyle = "rgba(255,120,30,0.5)";
      g.beginPath();
      g.arc(x, y, 5 + (frame % 4 < 2 ? 1 : 0), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ff8020";
      g.beginPath();
      g.arc(x, y, 3.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ffe060";
      g.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  private drawBoss(g: CanvasRenderingContext2D, game: Game) {
    const b = game.boss!;
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    const flashing = b.flash > 0 && (b.flash >> 1) % 2 === 0;
    g.save();
    g.translate(x, y);
    g.scale(b.dir, 1);
    // propeller
    g.fillStyle = "#333";
    g.fillRect(-2, -26, 4, 8);
    g.fillStyle = "rgba(200,200,200,0.7)";
    const pw = (game.frame >> 1) % 2 === 0 ? 22 : 10;
    g.fillRect(-pw, -28, pw * 2, 2);
    // pod
    g.fillStyle = flashing ? "#fff" : "#8a8ea0";
    g.beginPath();
    g.ellipse(0, 2, 22, 14, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = flashing ? "#fff" : "#c0c4d0";
    g.beginPath();
    g.ellipse(0, -2, 20, 9, 0, Math.PI, 0);
    g.fill();
    // cockpit dome + villain
    g.fillStyle = flashing ? "#fff" : "rgba(120,200,255,0.55)";
    g.beginPath();
    g.arc(0, -8, 12, Math.PI, 0);
    g.fill();
    if (!flashing) {
      g.fillStyle = "#f5c6a0";
      g.fillRect(-6, -14, 12, 8);
      g.fillStyle = "#222";
      g.fillRect(-5, -13, 4, 2);
      g.fillRect(1, -13, 4, 2);
      g.fillStyle = "#4a2a10";
      g.fillRect(-7, -9, 14, 3);
      g.fillStyle = "#b71c1c";
      g.fillRect(-8, -6, 16, 4);
    }
    // engine and spikes below
    g.fillStyle = flashing ? "#fff" : "#4b4f5c";
    g.fillRect(-14, 12, 28, 5);
    g.fillStyle = flashing ? "#fff" : "#d0d0d8";
    for (let i = -10; i <= 10; i += 10) {
      g.beginPath();
      g.moveTo(i - 4, 17);
      g.lineTo(i, 24);
      g.lineTo(i + 4, 17);
      g.closePath();
      g.fill();
    }
    // exhaust flame
    if (b.state !== "defeated") {
      g.fillStyle = (game.frame >> 2) % 2 === 0 ? "#ff8020" : "#ffe060";
      g.beginPath();
      g.moveTo(-22, 2);
      g.lineTo(-32 - (game.frame % 3) * 2, 4);
      g.lineTo(-22, 8);
      g.closePath();
      g.fill();
    }
    // damage smoke
    if (b.hits >= 4 && game.frame % 6 === 0) {
      g.fillStyle = "rgba(80,80,80,0.6)";
      g.beginPath();
      g.arc(-6 + (game.frame % 12), -18 - (game.frame % 10), 3 + (game.frame % 5), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------
  private trail: { x: number; y: number; facing: 1 | -1; angle: number; rolling: boolean; phase: number }[] = [];

  private drawPlayer(g: CanvasRenderingContext2D, game: Game) {
    const pl = game.player;
    if (pl.invuln > 0 && game.phase === "playing" && Math.floor(pl.invuln / 3) % 2 === 0) return;
    // speed after-images
    this.trail.push({ x: pl.x, y: pl.y, facing: pl.facing, angle: pl.drawAngle, rolling: pl.rolling, phase: pl.runPhase });
    if (this.trail.length > 8) this.trail.shift();
    const fast = Math.abs(pl.gsp) >= 5.5 || (!pl.onGround && Math.abs(pl.xsp) >= 5.5) || pl.invincible > 0;
    if (fast && game.phase === "playing") {
      for (const [idx, alpha] of [[2, 0.18], [5, 0.32]] as [number, number][]) {
        const t = this.trail[this.trail.length - 1 - idx];
        if (!t) continue;
        g.save();
        g.globalAlpha = alpha;
        g.translate(Math.round(t.x), Math.round(t.y));
        g.rotate(t.angle);
        g.scale(t.facing, 1);
        if (t.rolling) this.drawBall(g, { ...pl, runPhase: t.phase });
        else this.drawStanding(g, { ...pl, runPhase: t.phase, skidding: false }, game, false);
        g.restore();
      }
    }
    g.save();
    g.translate(Math.round(pl.x), Math.round(pl.y));
    if (pl.shield) {
      g.fillStyle = `rgba(120,200,255,${0.22 + Math.sin(game.frame * 0.3) * 0.08})`;
      g.strokeStyle = "rgba(200,240,255,0.85)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(0, 0, 22, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    if (pl.invincible > 0) {
      g.strokeStyle = `rgba(255,255,${(game.frame * 20) % 255},0.8)`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(0, 0, 20 + Math.sin(game.frame * 0.5) * 2, 0, Math.PI * 2);
      g.stroke();
    }
    g.rotate(pl.drawAngle);
    g.scale(pl.facing, 1);
    const dying = game.phase === "dying";
    if (pl.rolling && !dying) this.drawBall(g, pl);
    else this.drawStanding(g, pl, game, dying);
    g.restore();
  }

  private outlined(g: CanvasRenderingContext2D, fill: string, draw: (grow: number) => void) {
    g.fillStyle = "#0a1a4a";
    draw(1.2);
    g.fillStyle = fill;
    draw(0);
  }

  private drawBall(g: CanvasRenderingContext2D, pl: Player) {
    const r = 13;
    g.save();
    g.rotate(pl.runPhase * pl.facing * 1.6);
    // outline
    g.fillStyle = "#0a1a4a";
    g.beginPath();
    g.arc(0, 0, r + 1.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2050e0";
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    // quill wedges
    g.fillStyle = "#0a1a4a";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      g.lineTo(Math.cos(a + 0.35) * (r + 1), Math.sin(a + 0.35) * (r + 1));
      g.lineTo(Math.cos(a + 0.7) * 6, Math.sin(a + 0.7) * 6);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#5a8aff";
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.15;
      g.beginPath();
      g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      g.lineTo(Math.cos(a + 0.12) * (r - 2), Math.sin(a + 0.12) * (r - 2));
      g.lineTo(Math.cos(a + 0.3) * 7, Math.sin(a + 0.3) * 7);
      g.closePath();
      g.fill();
    }
    // face patch
    g.fillStyle = "#f0c890";
    g.beginPath();
    g.arc(4, 2, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e53935";
    g.beginPath();
    g.arc(-5, 6, 3, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // motion highlight
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillRect(-4, -r - 1, 8, 1);
  }

  private drawStanding(g: CanvasRenderingContext2D, pl: Player, game: Game, dying: boolean) {
    const speed = Math.abs(pl.gsp);
    const running = pl.onGround && speed > 0.3;
    const crouch = pl.crouching;
    const spring = pl.springTimer > 0 && !pl.onGround;
    const by = crouch ? 5 : 0; // body offset
    const swing = running ? Math.sin(pl.runPhase * 2) : 0;
    const lean = running ? Math.min(speed / 6, 1) * 0.25 : 0;
    const dark = "#0a1a4a";
    const blue = "#2050e0";
    const blueHi = "#5a8aff";
    const tan = "#f0c890";
    const tanDk = "#c89860";

    // ---- legs & shoes ----
    const drawShoe = (lx: number, ly: number, tilt: number) => {
      g.save();
      g.translate(lx, ly);
      g.rotate(tilt);
      g.fillStyle = dark;
      g.beginPath();
      g.ellipse(2, 0, 7.5, 4.2, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#e53935";
      g.beginPath();
      g.ellipse(2, 0, 6.5, 3.3, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#ff7a70";
      g.fillRect(-2, -2, 5, 1);
      g.fillStyle = "#fff";
      g.fillRect(-1, -3, 6, 2);
      g.fillStyle = "#ffd23f";
      g.fillRect(3, -3, 2, 2);
      g.restore();
    };
    const drawLeg = (hipX: number, footX: number, footY: number) => {
      g.strokeStyle = dark;
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(hipX, 4 + by);
      g.lineTo(footX, footY - 2);
      g.stroke();
      g.strokeStyle = blue;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(hipX, 4 + by);
      g.lineTo(footX, footY - 2);
      g.stroke();
    };
    if (running && speed >= 5.5) {
      // figure-eight leg blur
      g.fillStyle = "rgba(229,57,53,0.85)";
      g.beginPath();
      g.ellipse(0, 14, 11, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(90,138,255,0.6)";
      g.beginPath();
      g.ellipse(-2, 9, 8, 4, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillRect(-8 + (game.frame % 4) * 4, 13, 4, 1);
    } else {
      let legs: [number, number, number][];
      if (dying) legs = [[-5, 14, -0.3], [5, 14, 0.3]];
      else if (spring) legs = [[-3, 15, -0.2], [3, 16, 0.2]];
      else if (!pl.onGround) legs = [[-5, 12, 0.5], [5, 15, -0.2]];
      else if (crouch) legs = [[-6, 16, 0], [6, 16, 0]];
      else if (running) {
        // six-frame run cycle: front foot, back foot
        const cycle: [number, number, number][][] = [
          [[9, 15, 0.2], [-8, 12, -0.6]],
          [[6, 16, 0], [-4, 9, -0.9]],
          [[1, 16, -0.1], [1, 8, -0.8]],
          [[-5, 15, -0.3], [7, 11, 0.4]],
          [[-8, 12, -0.6], [9, 15, 0.2]],
          [[-3, 9, -0.9], [6, 16, 0]],
        ];
        legs = cycle[Math.floor(pl.runPhase * 1.2) % cycle.length];
      }
      else legs = [[-4, 16, 0], [4, 16, 0]];
      for (const [fx, fy, tilt] of legs) {
        drawLeg(fx * 0.4, fx, fy);
        drawShoe(fx, fy, tilt);
      }
    }

    // ---- back quills ----
    const quill = (qx: number, qy: number, len: number, ang: number) => {
      g.save();
      g.translate(qx, qy);
      g.rotate(ang);
      this.outlined(g, blue, (grow) => {
        g.beginPath();
        g.moveTo(0, -4 - grow);
        g.lineTo(-len - grow * 2, 1);
        g.lineTo(0, 5 + grow);
        g.closePath();
        g.fill();
      });
      g.fillStyle = blueHi;
      g.beginPath();
      g.moveTo(-2, -2);
      g.lineTo(-len * 0.7, 0.5);
      g.lineTo(-2, 0);
      g.closePath();
      g.fill();
      g.restore();
    };
    quill(-6, -13 + by, 14, -0.55 + lean);
    quill(-8, -8 + by, 16, -0.15 + lean);
    quill(-7, -2 + by, 14, 0.3 + lean);
    quill(-5, 4 + by, 10, 0.75 + lean);

    // ---- body (torso) ----
    this.outlined(g, blue, (grow) => {
      g.beginPath();
      g.ellipse(0, 3 + by, 7 + grow, 8 + grow, 0, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = tan;
    g.beginPath();
    g.ellipse(2, 4 + by, 4.5, 6, 0, 0, Math.PI * 2);
    g.fill();

    // ---- head ----
    this.outlined(g, blue, (grow) => {
      g.beginPath();
      g.arc(0, -8 + by, 11 + grow, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = blueHi;
    g.beginPath();
    g.arc(-3, -13 + by, 4, 0, Math.PI * 2);
    g.fill();
    // ears
    for (const ex of [-5, 4]) {
      this.outlined(g, blue, (grow) => {
        g.beginPath();
        g.moveTo(ex - 3 - grow, -14 + by);
        g.lineTo(ex, -22 - grow + by);
        g.lineTo(ex + 3 + grow, -14 + by);
        g.closePath();
        g.fill();
      });
      g.fillStyle = tanDk;
      g.beginPath();
      g.moveTo(ex - 1, -15 + by);
      g.lineTo(ex, -19 + by);
      g.lineTo(ex + 1.5, -15 + by);
      g.closePath();
      g.fill();
    }
    // muzzle
    g.fillStyle = tan;
    g.beginPath();
    g.ellipse(7, -3 + by, 6, 4.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = tanDk;
    g.beginPath();
    g.ellipse(7, -1 + by, 4, 1.5, 0, 0, Math.PI * 2);
    g.fill();
    // eye (single big merged eye, side view)
    const lookUp = pl.lookingUp ? -2 : 0;
    g.fillStyle = dark;
    g.beginPath();
    g.ellipse(6, -10 + by + lookUp, 5, 6.5, 0.15, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(6, -10 + by + lookUp, 4, 5.5, 0.15, 0, Math.PI * 2);
    g.fill();
    if (dying) {
      g.strokeStyle = "#111";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(4, -13 + by);
      g.lineTo(9, -7 + by);
      g.moveTo(9, -13 + by);
      g.lineTo(4, -7 + by);
      g.stroke();
    } else {
      const blink = pl.idle > 200 && pl.idle % 150 < 6;
      if (blink) {
        g.fillStyle = tan;
        g.fillRect(3, -11 + by, 7, 3);
      } else {
        g.fillStyle = "#116a2a";
        g.beginPath();
        g.ellipse(8, -9 + by + lookUp, 1.8, 3, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#111";
        g.beginPath();
        g.ellipse(8.3, -9 + by + lookUp, 1, 2, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        g.fillRect(8, -11 + by + lookUp, 1, 1);
      }
    }
    // nose
    g.fillStyle = "#111";
    g.beginPath();
    g.ellipse(13, -5 + by, 2.2, 1.6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#666";
    g.fillRect(12, -6 + by, 1, 1);
    // mouth (smile when idle a while, open when hurt)
    if (pl.hurt || dying) {
      g.fillStyle = "#111";
      g.beginPath();
      g.ellipse(9, 1 + by, 2.5, 2, 0, 0, Math.PI * 2);
      g.fill();
    } else if (pl.idle > 120) {
      g.strokeStyle = "#111";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(9, 0 + by, 2.5, 0.1, Math.PI - 0.3);
      g.stroke();
    }

    // ---- arm & glove ----
    let ax = 8;
    let ay = 8 + by;
    if (pl.hurt || dying) {
      ax = 12;
      ay = -8 + by;
    } else if (spring) {
      ax = 6;
      ay = -12 + by;
    } else if (!pl.onGround) {
      ax = 12;
      ay = 3 + by;
    } else if (running) {
      ax = 6 + swing * 7;
      ay = 6 + by - swing * 4;
    } else if (pl.skidding) {
      ax = -8;
      ay = 2 + by;
    }
    g.strokeStyle = dark;
    g.lineWidth = 4.5;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(3, 2 + by);
    g.lineTo(ax, ay);
    g.stroke();
    g.strokeStyle = tan;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(3, 2 + by);
    g.lineTo(ax, ay);
    g.stroke();
    g.fillStyle = dark;
    g.beginPath();
    g.arc(ax, ay, 4.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(ax, ay, 3.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ddd";
    g.fillRect(ax - 3, ay + 1, 6, 1);
    g.lineCap = "butt";
  }

  // ------------------------------------------------------------------
  // Particles
  // ------------------------------------------------------------------
  private drawParticle(g: CanvasRenderingContext2D, p: Particle) {
    const t = p.life / p.maxLife;
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    switch (p.kind) {
      case "dust":
      case "smoke":
        g.fillStyle = `rgba(255,255,255,${0.7 * (1 - t)})`;
        g.beginPath();
        g.arc(x, y, p.size * (0.6 + t), 0, Math.PI * 2);
        g.fill();
        break;
      case "spark":
        g.fillStyle = `rgba(255,236,120,${1 - t})`;
        g.fillRect(x - 1, y - 1, 2, 2);
        break;
      case "pop":
        g.fillStyle = t < 0.5 ? "#fff" : "#ffb300";
        g.fillRect(x - 1, y - 1, 3, 3);
        break;
      case "boom": {
        const r = p.size * Math.sin(t * Math.PI);
        g.fillStyle = t < 0.4 ? "#fff" : t < 0.7 ? "#ffd040" : "#ff6020";
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.beginPath();
        g.arc(x, y, r * 0.5 * t, 0, Math.PI * 2);
        g.fill();
        break;
      }
      case "star":
      case "invstar": {
        g.fillStyle = p.kind === "star" ? `rgba(255,255,255,${1 - t})` : `rgba(255,${200 + Math.round(55 * Math.sin(t * 6))},80,${1 - t})`;
        g.fillRect(x - 1, y - 3, 2, 6);
        g.fillRect(x - 3, y - 1, 6, 2);
        break;
      }
      case "shieldpop":
        g.strokeStyle = `rgba(120,200,255,${1 - t})`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, p.size + t * 20, 0, Math.PI * 2);
        g.stroke();
        break;
      case "splash":
        g.fillStyle = `rgba(200,230,255,${1 - t})`;
        g.fillRect(x - 1, y - 1, 2, 3);
        break;
      case "debris":
        g.fillStyle = "#6a4a2a";
        g.fillRect(x - 2, y - 2, 4, 4);
        break;
      case "text":
        drawText(g, p.text ?? "", x, y - 4, "#fff", { align: "center" });
        break;
    }
  }

  // ------------------------------------------------------------------
  // HUD & overlays
  // ------------------------------------------------------------------
  private drawHud(g: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const label = "#ffd23f";

    if (game.phase !== "title") {
      drawText(g, "SCORE", 12, 10, label);
      drawText(g, String(game.score), 110, 10, "#fff", { align: "right" });
      drawText(g, "TIME", 12, 22, label);
      drawText(g, game.timeString, 110, 22, "#fff", { align: "right" });
      const ringsRed = game.ringCount === 0 && Math.floor(game.frame / 8) % 2 === 0;
      drawText(g, "RINGS", 12, 34, ringsRed ? "#ff5252" : label);
      drawText(g, String(game.ringCount), 110, 34, "#fff", { align: "right" });

      this.drawHeroIcon(g, 18, H - 12);
      drawText(g, `X${Math.max(0, game.lives)}`, 30, H - 15, "#fff");

      if (game.boss && game.boss.locked && game.boss.state !== "gone") {
        const left = C.BOSS_HITS - game.boss.hits;
        drawText(g, "BOSS", W - 100, 10, "#ff5252");
        for (let i = 0; i < C.BOSS_HITS; i++) {
          g.fillStyle = i < left ? "#ff5252" : "#3a1010";
          g.fillRect(W - 66 + i * 7, 10, 5, 6);
        }
      }
      if (game.player.invincible > 0 || game.player.speedShoes > 0) {
        const s = Math.ceil(Math.max(game.player.invincible, game.player.speedShoes) / 60);
        drawText(g, game.player.invincible > 0 ? `STARS ${s}` : `SPEED ${s}`, W - 12, H - 15, "#ffd23f", { align: "right" });
      }
    }

    if (game.messageTimer > 0 && game.phase !== "title") {
      const big = game.message === game.level.name;
      if (big) {
        const t = game.messageTimer;
        const slide = t > 140 ? (160 - t) / 20 : t < 20 ? t / 20 : 1;
        const x = Math.round(W - 30 - (1 - slide) * 200);
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.fillRect(x - 170, 84, 190, 44);
        g.fillStyle = "#ffd23f";
        g.fillRect(x - 170, 84, 4, 44);
        drawText(g, game.level.name, x, 92, "#fff", { scale: 2, align: "right" });
        drawText(g, `ZONE ${game.levelIndex + 1}  ACT ${game.level.act}`, x, 114, "#ffd23f", { align: "right" });
      } else {
        drawText(g, game.message, W / 2, 60, "#fff", { align: "center", scale: 1 });
      }
    }

    switch (game.phase) {
      case "title":
        this.drawTitle(g, game);
        break;
      case "paused":
        this.dim(g, 0.5);
        drawText(g, "PAUSED", W / 2, H / 2 - 20, "#fff", { scale: 2, align: "center" });
        drawText(g, "P  RESUME", W / 2, H / 2 + 8, "#ffd23f", { align: "center" });
        drawText(g, "ESC  QUIT TO TITLE", W / 2, H / 2 + 20, "#ffd23f", { align: "center" });
        break;
      case "gameover":
        this.dim(g, 0.6);
        drawText(g, "GAME OVER", W / 2, H / 2 - 20, "#ff5252", { scale: 3, align: "center" });
        drawText(g, `SCORE ${game.score}`, W / 2, H / 2 + 14, "#fff", { align: "center" });
        if (game.deathTimer > 60 && Math.floor(game.frame / 30) % 2 === 0) drawText(g, "PRESS JUMP", W / 2, H / 2 + 34, "#ffd23f", { align: "center" });
        break;
      case "complete":
        this.dim(g, 0.6);
        drawText(g, "ALL ZONES CLEAR!", W / 2, 70, "#ffd23f", { scale: 2, align: "center" });
        drawText(g, "ZIP SAVED THE ISLANDS", W / 2, 100, "#fff", { align: "center" });
        drawText(g, `FINAL SCORE  ${game.score}`, W / 2, 130, "#fff", { scale: 2, align: "center" });
        drawText(g, `BEST RUN  ${game.save.bestRun}`, W / 2, 158, "#9fd0ff", { align: "center" });
        drawText(g, `LIVES LEFT  ${Math.max(0, game.lives)}`, W / 2, 172, "#9fd0ff", { align: "center" });
        if (game.deathTimer > 60 && Math.floor(game.frame / 30) % 2 === 0) drawText(g, "PRESS JUMP", W / 2, 210, "#ffd23f", { align: "center" });
        break;
      case "clear":
        if (game.tally.visible) this.drawResults(g, game);
        break;
    }
  }

  private dim(g: CanvasRenderingContext2D, a: number) {
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  private drawTitle(g: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    this.dim(g, 0.35);
    const t = game.titleTimer;
    const bob = Math.round(Math.sin(t * 0.05) * 3);
    // emblem
    g.fillStyle = "#ffd23f";
    g.beginPath();
    g.ellipse(W / 2, 48 + bob, 130, 30, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1f4fd8";
    g.beginPath();
    g.ellipse(W / 2, 48 + bob, 124, 25, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#0b2a6f";
    g.beginPath();
    g.ellipse(W / 2, 54 + bob, 124, 15, 0, 0, Math.PI);
    g.fill();
    drawText(g, "SPIN RUSH", W / 2, 34 + bob, "#fff", { scale: 3, align: "center", outline: "#0b2a6f" });
    drawText(g, "A SONIC-STYLE SPEED PLATFORMER", W / 2, 84, "#ffd23f", { align: "center" });

    // hero on the left
    g.save();
    g.translate(70, 170);
    g.scale(2, 2);
    const fake: Player = { ...game.player, onGround: true, gsp: 0, rolling: false, crouching: false, lookingUp: false, hurt: false, idle: (t % 400) + 130, drawAngle: 0, facing: 1, runPhase: 0, shield: false, invuln: 0, skidding: false, springTimer: 0, invincible: 0, speedShoes: 0 };
    this.drawStanding(g, fake, game, false);
    g.restore();

    // level select
    const lx = 150;
    const ly = 104;
    g.fillStyle = "rgba(0,0,0,0.55)";
    g.fillRect(lx - 8, ly - 6, 300, 118);
    drawText(g, "SELECT ZONE", lx, ly, "#ffd23f");
    drawText(g, "UP/DOWN  CHOOSE", lx + 292, ly, "#9fd0ff", { align: "right" });
    for (let i = 0; i < game.levelCount; i++) {
      const y = ly + 16 + i * 14;
      const unlocked = i < game.save.unlocked;
      const sel = i === game.menuIndex;
      if (sel) {
        g.fillStyle = "rgba(255,210,63,0.25)";
        g.fillRect(lx - 4, y - 3, 292, 13);
        drawText(g, ">", lx - 2, y, "#ffd23f");
      }
      drawText(g, `${i + 1}. ${LEVEL_NAMES[i]}`, lx + 10, y, unlocked ? (sel ? "#fff" : "#d0d8e8") : "#666");
      const best = game.save.best[i];
      if (!unlocked) drawText(g, "LOCKED", lx + 292, y, "#666", { align: "right" });
      else if (best) drawText(g, `${best.score}  ${formatTime(best.time)}${best.perfect ? " P" : ""}`, lx + 292, y, "#9fd0ff", { align: "right" });
      else drawText(g, "--", lx + 292, y, "#889", { align: "right" });
    }
    drawText(g, `BEST RUN ${game.save.bestRun}   RUNS ${game.save.runs}`, lx, ly + 94, "#9fd0ff");

    if (Math.floor(t / 30) % 2 === 0) drawText(g, "PRESS JUMP TO START", W / 2, 232, "#fff", { align: "center", scale: 1 });
    drawText(g, "ARROWS/WASD/IJKL MOVE  SPACE/Z/X JUMP  DOWN ROLL  DOWN+JUMP SPINDASH", W / 2, 246, "#cfe3ff", { align: "center" });
    drawText(g, "P PAUSE  R RESTART  M SOUND  N MUSIC", W / 2, 257, "#cfe3ff", { align: "center" });
    void H;
  }

  private drawResults(g: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const t = game.tally;
    const slide = Math.min(1, (game.clearTimer - 150) / 25);
    const ox = Math.round((1 - slide) * -W);
    g.save();
    g.translate(ox, 0);
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(W / 2 - 130, 50, 260, 150);
    g.fillStyle = "#ffd23f";
    g.fillRect(W / 2 - 130, 50, 260, 2);
    drawText(g, "ZIP GOT THROUGH", W / 2, 62, "#ffd23f", { scale: 2, align: "center" });
    drawText(g, `${game.level.name}  ACT ${game.level.act}`, W / 2, 84, "#fff", { align: "center" });
    let y = 106;
    const row = (name: string, val: number, color = "#fff") => {
      drawText(g, name, W / 2 - 110, y, "#ffd23f");
      drawText(g, String(val), W / 2 + 110, y, color, { align: "right" });
      y += 14;
    };
    row("TIME BONUS", t.remainingTime);
    row("RING BONUS", t.remainingRing);
    if (t.perfectBonus > 0) row("PERFECT BONUS", t.remainingPerfect, "#9fffb0");
    y += 6;
    drawText(g, "SCORE", W / 2 - 110, y, "#ffd23f", { scale: 1 });
    drawText(g, String(game.score), W / 2 + 110, y, "#fff", { align: "right", scale: 1 });
    y += 16;
    if (t.done) {
      if (t.newRecord) drawText(g, "NEW RECORD!", W / 2, y, "#9fffb0", { align: "center" });
      if (Math.floor(game.frame / 30) % 2 === 0) drawText(g, game.levelIndex + 1 < game.levelCount ? "PRESS JUMP FOR NEXT ZONE" : "PRESS JUMP", W / 2, y + 14, "#fff", { align: "center" });
    }
    g.restore();
  }
}
