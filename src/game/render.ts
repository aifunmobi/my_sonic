import * as C from "./constants";
import { drawText } from "./font";
import { formatTime, groundAtSegs } from "./terrain";
import { LEVEL_NAMES } from "./levels";
import { WATER_Y, type Game, type Particle, type Player } from "./game";
import * as SP from "./sprites";
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
function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}
function shade(h: string, t: number): string {
  return mix(h, t < 0 ? "#000000" : "#ffffff", Math.abs(t));
}

function checker(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const rnd = seeded(3);
  const size = 16;
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const base = (tx + ty) % 2 === 0 ? b : a;
      const ox = tx * size;
      const oy = ty * size;
      g.fillStyle = base;
      g.fillRect(ox, oy, size, size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const d = (x + y) / (size * 2);
          if (d > 0.6 && (x + y) % 2 === 0) px(g, ox + x, oy + y, shade(base, -0.18));
          if (d < 0.28 && (x + y) % 2 === 0) px(g, ox + x, oy + y, shade(base, 0.14));
        }
      }
      px(g, ox, oy, shade(base, 0.28), size, 1);
      px(g, ox, oy, shade(base, 0.28), 1, size);
      px(g, ox, oy + size - 1, shade(base, -0.35), size, 1);
      px(g, ox + size - 1, oy, shade(base, -0.35), 1, size);
    }
  }
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rnd() * 58);
    const y = Math.floor(rnd() * 58);
    px(g, x, y, shade(a, -0.4), 4, 3);
    px(g, x + 1, y, shade(a, 0.25), 2, 1);
  }
  g.strokeStyle = shade(a, -0.3);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(40, 2);
  g.quadraticCurveTo(44, 14, 38, 26);
  g.stroke();
  return c;
}

function bricks(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 32;
  const g = c.getContext("2d")!;
  const rnd = seeded(5);
  g.fillStyle = "#242c2c";
  g.fillRect(0, 0, 48, 32);
  for (let row = 0; row < 2; row++) {
    const off = row % 2 ? 12 : 0;
    for (let col = -1; col < 3; col++) {
      const x = col * 24 + off;
      const y = row * 16;
      const base = rnd() > 0.5 ? a : b;
      g.fillStyle = base;
      g.fillRect(x + 1, y + 1, 22, 14);
      px(g, x + 1, y + 1, shade(base, 0.25), 22, 1);
      px(g, x + 1, y + 1, shade(base, 0.25), 1, 14);
      px(g, x + 1, y + 14, shade(base, -0.35), 22, 1);
      px(g, x + 22, y + 1, shade(base, -0.35), 1, 14);
      for (let k = 0; k < 5; k++) px(g, x + 2 + Math.floor(rnd() * 20), y + 2 + Math.floor(rnd() * 12), shade(base, -0.2), 2, 1);
      if (rnd() > 0.5) px(g, x + 2 + Math.floor(rnd() * 16), y + 2 + Math.floor(rnd() * 8), "#3a9a5a", 3 + Math.floor(rnd() * 3), 2);
      if (rnd() > 0.7) px(g, x + 2 + Math.floor(rnd() * 16), y + 10, "#6ad07a", 2, 1);
    }
  }
  return c;
}

function rock(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  const rnd = seeded(9);
  g.fillStyle = a;
  g.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rnd() * 32);
    const y = Math.floor(rnd() * 32);
    const w = 3 + Math.floor(rnd() * 8);
    const h = 2 + Math.floor(rnd() * 5);
    g.fillStyle = b;
    g.fillRect(x, y, w, h);
    px(g, x, y, shade(b, 0.2), w, 1);
    px(g, x, y + h - 1, shade(b, -0.35), w, 1);
  }
  for (const [x, y, w, h, col] of [[4, 6, 1, 6, "#ff7a20"], [5, 11, 5, 1, "#ff7a20"], [10, 12, 1, 4, "#ffb040"], [20, 20, 6, 1, "#ff7a20"], [26, 16, 1, 5, "#ff7a20"], [18, 26, 1, 4, "#ffb040"], [14, 3, 4, 1, "#ff7a20"]] as [number, number, number, number, string][]) {
    px(g, x - 1, y - 1, "rgba(255,120,30,0.25)", w + 2, h + 2);
    px(g, x, y, col, w, h);
  }
  return c;
}

function metal(a: string, b: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d")!;
  for (const [x, y, col] of [[0, 0, b], [16, 0, a], [0, 16, a], [16, 16, b]] as [number, number, string][]) {
    g.fillStyle = col;
    g.fillRect(x, y, 16, 16);
    px(g, x, y, shade(col, 0.3), 16, 1);
    px(g, x, y, shade(col, 0.3), 1, 16);
    px(g, x, y + 15, shade(col, -0.4), 16, 1);
    px(g, x + 15, y, shade(col, -0.4), 1, 16);
    for (const [rx, ry] of [[3, 3], [11, 3], [3, 11], [11, 11]]) {
      px(g, x + rx, y + ry, "#d8e0f0", 2, 2);
      px(g, x + rx + 1, y + ry + 1, "#2a3048", 1, 1);
    }
  }
  for (let i = 0; i < 16; i += 4) {
    px(g, 18 + i, 6, "#e0b030", 2, 3);
    px(g, 20 + i, 6, "#222", 2, 3);
  }
  px(g, 4, 20, "#1a2030", 8, 6);
  px(g, 5, 21, "#6ad0ff", 6, 1);
  px(g, 5, 23, "#3a9ad0", 4, 1);
  return c;
}

function ditherGradient(key: string, store: Map<string, HTMLCanvasElement>, w: number, h: number, stops: string[], bands: number): HTMLCanvasElement {
  let c = store.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const k = c.getContext("2d")!;
  const colorAt = (t: number) => {
    const seg = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1)));
    const lt = t * (stops.length - 1) - seg;
    return mix(stops[seg], stops[seg + 1], lt);
  };
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    k.fillStyle = colorAt(i / (bands - 1));
    k.fillRect(0, Math.floor(i * bh), w, Math.ceil(bh) + 1);
    if (i > 0) {
      k.fillStyle = colorAt((i - 1) / (bands - 1));
      const y = Math.floor(i * bh);
      for (let x = 0; x < w; x += 2) k.fillRect(x + (y % 2), y, 1, 1);
      for (let x = 0; x < w; x += 4) k.fillRect(x + ((y + 1) % 2), y + 1, 1, 1);
    }
  }
  store.set(key, c);
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
  private grads = new Map<string, HTMLCanvasElement>();
  private starSeed: number[] = [];
  private trail: { x: number; y: number; facing: 1 | -1; angle: number; rolling: boolean; phase: number }[] = [];

  constructor() {
    this.buf = document.createElement("canvas");
    this.buf.width = C.VIEW_W;
    this.buf.height = C.VIEW_H;
    this.b = this.buf.getContext("2d")!;
    for (let i = 0; i < 70; i++) this.starSeed.push(((i * 7919) % 480) / 480, ((i * 104729) % 170) / 170, (i * 31) % 3);
  }

  private pat(theme: Theme): ThemePatterns {
    let p = this.patterns.get(theme.id);
    if (!p) {
      const g = this.b;
      const tile = theme.tile === "brick" ? bricks(theme.ground[0], theme.ground[1]) : theme.tile === "rock" ? rock(theme.ground[0], theme.ground[1]) : theme.tile === "metal" ? metal(theme.ground[0], theme.ground[1]) : checker(theme.ground[0], theme.ground[1]);
      const loopTile = document.createElement("canvas");
      loopTile.width = 24;
      loopTile.height = 24;
      const lg = loopTile.getContext("2d")!;
      for (const [x, y, col] of [[0, 0, theme.loop[1]], [12, 0, theme.loop[0]], [0, 12, theme.loop[0]], [12, 12, theme.loop[1]]] as [number, number, string][]) {
        lg.fillStyle = col;
        lg.fillRect(x, y, 12, 12);
        px(lg, x, y, shade(col, 0.25), 12, 1);
        px(lg, x, y, shade(col, 0.25), 1, 12);
        px(lg, x, y + 11, shade(col, -0.3), 12, 1);
        px(lg, x + 11, y, shade(col, -0.3), 1, 12);
      }
      const blockTile = document.createElement("canvas");
      blockTile.width = 16;
      blockTile.height = 16;
      const bg = blockTile.getContext("2d")!;
      for (const [x, y, col] of [[0, 0, theme.block[1]], [8, 0, theme.block[0]], [0, 8, theme.block[0]], [8, 8, theme.block[1]]] as [number, number, string][]) {
        bg.fillStyle = col;
        bg.fillRect(x, y, 8, 8);
        px(bg, x, y, shade(col, 0.25), 8, 1);
        px(bg, x, y + 7, shade(col, -0.3), 8, 1);
      }
      p = { ground: g.createPattern(tile, "repeat")!, loop: g.createPattern(loopTile, "repeat")!, block: g.createPattern(blockTile, "repeat")! };
      this.patterns.set(theme.id, p);
    }
    return p;
  }

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
    const x0 = cam.x - 60;
    const x1 = cam.x + C.VIEW_W + 60;

    this.drawWater(g, game, theme, x0, x1);
    for (const d of game.level.decor) if (!d.front && d.x > x0 - 80 && d.x < x1 + 80) this.drawDecor(g, d, game.frame);
    for (const loop of game.level.loops) if (loop.cx + loop.r + 30 > x0 && loop.cx - loop.r - 30 < x1) this.drawLoopBack(g, loop, pats, theme);
    this.drawTerrain(g, game, theme, pats, x0, x1);
    this.drawPlatforms(g, game, theme, pats, x0, x1);
    for (const loop of game.level.loops) if (loop.cx + loop.r + 30 > x0 && loop.cx - loop.r - 30 < x1) this.drawLoopFront(g, loop, theme);

    for (const c of game.checkpoints) if (c.x > x0 && c.x < x1) SP.blit(g, SP.checkpointSprite(c.active, c.active && c.spin < 18 ? Math.round(Math.sin(c.spin * 2) * 4) : 0), c.x, c.y);
    this.drawGoal(g, game);
    for (const s of game.springs) if (s.x > x0 && s.x < x1) SP.blit(g, SP.springSprite(s.strong, s.anim > 0), s.x, s.y);
    for (const sp of game.level.spikes) {
      if (sp.x + sp.w < x0 || sp.x > x1) continue;
      for (let sx = 0; sx < sp.w; sx += 16) SP.blit(g, SP.spikesSprite(), sp.x + sx, sp.y);
    }
    for (const m of game.monitors) if (m.x > x0 && m.x < x1) SP.blit(g, SP.monitorSprite(m.kind, m.broken ? 0 : game.frame % 48 < 40 ? 0 : 1, m.broken), m.x, m.y);

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
          SP.blit(g, SP.crawlerSprite((e.t >> 3) % 2), e.x, e.y, e.dir === -1);
          break;
        case "buzzer":
          SP.blit(g, SP.buzzerSprite((e.t >> 2) % 2), e.x, e.y, e.dir === -1);
          break;
        case "crab":
          SP.blit(g, SP.crabSprite(e.pause > 0 ? 1 : (e.t >> 3) % 2 === 0 ? 0 : 2), e.x, e.y);
          break;
        case "chopper":
          SP.blit(g, SP.chopperSprite(e.vy < 0 ? 0 : 1), e.x, e.y);
          break;
        case "spikeball":
          this.drawSpikeball(g, e.x0, e.y0, e.x, e.y);
          break;
      }
    }
    for (const p of game.projectiles) this.drawProjectile(g, p.x, p.y, p.kind, game.frame);
    if (game.boss && game.boss.state !== "waiting") this.drawBoss(g, game);

    this.drawPlayer(g, game);
    for (const d of game.level.decor) if (d.front && d.x > x0 - 80 && d.x < x1 + 80) this.drawDecor(g, d, game.frame);
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
  // Backgrounds (each layer scrolls at its own parallax rate)
  // ------------------------------------------------------------------
  private drawBackground(g: CanvasRenderingContext2D, game: Game, theme: Theme) {
    const cam = game.camera;
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const py = -cam.y * 0.1;
    const f = game.frame;
    g.drawImage(ditherGradient(`sky:${theme.id}`, this.grads, W, H, [...theme.sky], 22), 0, 0);

    if (theme.stars) {
      for (let i = 0; i < this.starSeed.length; i += 3) {
        const sx = ((this.starSeed[i] * W - cam.x * 0.02) % W + W) % W;
        const sy = this.starSeed[i + 1] * 150 + py * 0.3;
        const tw = (f + i * 13) % 60 < 30;
        g.fillStyle = tw ? "#ffffff" : "#9ab0ff";
        const big = this.starSeed[i + 2] === 0;
        g.fillRect(Math.round(sx), Math.round(sy), big ? 2 : 1, big ? 2 : 1);
        if (big && tw) {
          g.fillRect(Math.round(sx) - 1, Math.round(sy), 1, 2);
          g.fillRect(Math.round(sx) + 2, Math.round(sy), 1, 2);
        }
      }
    }

    switch (theme.id) {
      case "emerald":
        this.bgEmerald(g, cam.x, py, f, theme);
        break;
      case "sunset":
        this.bgSunset(g, cam.x, py, f, theme);
        break;
      case "ruins":
        this.bgRuins(g, cam.x, py, f, theme);
        break;
      case "magma":
        this.bgMagma(g, cam.x, py, f, theme);
        break;
      default:
        this.bgSky(g, cam.x, py, f, theme);
    }
  }

  private sun(g: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, banded = false) {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = shade(col, 0.4);
    g.beginPath();
    g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2);
    g.fill();
    if (banded) {
      g.fillStyle = shade(col, -0.25);
      for (let i = 0; i < 4; i++) g.fillRect(x - r, y + r * 0.2 + i * 6, r * 2, 2 + i);
    }
  }

  private cloud(g: CanvasRenderingContext2D, x: number, y: number, s: number, col = "#ffffff", shadow = "#c8d8f0") {
    const blob = (c: string, dy: number) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, y + dy, 11 * s, 0, Math.PI * 2);
      g.arc(x + 13 * s, y - 5 * s + dy, 13 * s, 0, Math.PI * 2);
      g.arc(x + 28 * s, y + dy, 11 * s, 0, Math.PI * 2);
      g.arc(x + 14 * s, y + 4 * s + dy, 10 * s, 0, Math.PI * 2);
      g.fill();
    };
    blob(shadow, 3 * s);
    blob(col, 0);
    g.fillStyle = shadow;
    g.fillRect(x - 11 * s, y + 8 * s, 50 * s, 3 * s);
  }

  private ridge(g: CanvasRenderingContext2D, camX: number, par: number, baseY: number, amp: number[], freq: number[], col: string, lit: string, step = 4) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const yAt = (x: number) => {
      const wx = x + camX * par;
      let y = baseY;
      for (let i = 0; i < amp.length; i++) y += Math.sin(wx * freq[i] + i) * amp[i];
      return y;
    };
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += step) g.lineTo(x, yAt(x));
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    g.fillStyle = lit;
    for (let x = 0; x <= W; x += step) {
      const y0 = yAt(x);
      const y1 = yAt(x + step);
      if (y1 < y0) g.fillRect(x, Math.round(y1), step, Math.round(y0 - y1) + 6);
    }
    g.fillStyle = shade(col, -0.25);
    for (let x = 0; x <= W; x += 2) {
      const y = Math.round(yAt(x));
      if ((x / 2 + y) % 2 === 0) g.fillRect(x, y + 14, 2, 1);
      if ((x / 2 + y) % 3 === 0) g.fillRect(x, y + 20, 2, 1);
    }
  }

  private ocean(g: CanvasRenderingContext2D, camX: number, y0: number, stops: string[], frame: number, sparkle: string) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    g.drawImage(ditherGradient(`ocean:${stops.join()}`, this.grads, W, 120, stops, 10), 0, y0, W, H - y0);
    g.fillStyle = sparkle;
    for (let row = 0; row < 7; row++) {
      const y = y0 + 4 + row * 8 + (row % 2);
      const off = (camX * (0.25 + row * 0.05) + frame * (0.3 + row * 0.12)) % 36;
      for (let x = -36; x < W + 36; x += 36) {
        g.fillRect(Math.round(x - off), y, 8 + row, 1);
        g.fillRect(Math.round(x - off) + 14, y + 2, 3, 1);
      }
    }
    g.fillStyle = "rgba(255,255,255,0.7)";
    g.fillRect(0, y0, W, 1);
  }

  private bgEmerald(g: CanvasRenderingContext2D, camX: number, py: number, f: number, theme: Theme) {
    const W = C.VIEW_W;
    if (theme.sun) this.sun(g, theme.sun.x - camX * 0.02, theme.sun.y + py * 0.3, theme.sun.r, theme.sun.color);
    const off = (camX * 0.05 + f * 0.06) % 640;
    for (let k = -1; k <= 1; k++) for (const [cx, cy, s] of [[30, 38, 1], [210, 66, 0.7], [330, 26, 1.2], [500, 76, 0.8]]) this.cloud(g, cx - off + k * 640, cy + py * 0.3, s);
    this.ridge(g, camX, 0.1, 128 + py * 0.5, [28, 12, 8], [0.006, 0.017, 0.031], "#2f5cb8", "#4a78d0");
    this.ridge(g, camX, 0.16, 146 + py * 0.55, [22, 10, 6], [0.008, 0.021, 0.04], "#3d6fc4", "#5a8ad8");
    const coff = (camX * 0.22) % 1100;
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(560 - coff + k * 1100);
      if (x < -120 || x > W + 40) continue;
      const top = Math.round(104 + py * 0.6);
      const bottom = Math.round(176 + py * 0.7);
      g.fillStyle = "#6a4a2a";
      g.fillRect(x, top, 110, bottom - top);
      g.fillStyle = "#8a5a2b";
      for (let yy = top; yy < bottom; yy += 8) for (let xx = x; xx < x + 110; xx += 8) if (((xx + yy) / 8) % 2 === 0) g.fillRect(xx, yy, 8, 8);
      g.fillStyle = "#2f9e33";
      g.fillRect(x - 4, top - 6, 118, 8);
      g.fillStyle = "#63d75c";
      g.fillRect(x - 4, top - 6, 118, 2);
      const wx = x + 40;
      g.fillStyle = "#3f8fe8";
      g.fillRect(wx, top, 22, bottom - top);
      g.fillStyle = "#8fd0ff";
      for (let i = 0; i < 8; i++) g.fillRect(wx + 2 + ((i * 5) % 18), top + ((f * 3 + i * 19) % (bottom - top)), 2, 7);
      g.fillStyle = "#d8f0ff";
      for (let i = 0; i < 8; i++) g.fillRect(wx - 6 + i * 5, bottom - 3 + ((f + i * 4) % 6 < 3 ? 0 : 1), 3, 2);
      g.fillStyle = "#1e7a2a";
      for (const tx of [x + 10, x + 90]) {
        g.fillRect(tx, top - 24, 3, 20);
        g.beginPath();
        g.arc(tx + 1, top - 24, 9, 0, Math.PI * 2);
        g.fill();
      }
    }
    const oy = Math.round(176 + py * 0.7);
    this.ocean(g, camX, oy, ["#2a7ae8", "#1f5fc8", "#1a4aa8"], f, "rgba(255,255,255,0.55)");
    const ioff = (camX * 0.3) % 800;
    g.fillStyle = "#1e6a2a";
    for (let k = -1; k <= 1; k++) {
      const ix = 300 - ioff + k * 800;
      g.beginPath();
      g.ellipse(ix, oy + 10, 40, 6, 0, Math.PI, 0);
      g.fill();
      g.fillRect(ix - 2, oy - 8, 2, 14);
      g.beginPath();
      g.arc(ix - 1, oy - 9, 6, 0, Math.PI * 2);
      g.fill();
    }
    this.nearHills(g, camX, py, theme);
  }

  private nearHills(g: CanvasRenderingContext2D, camX: number, py: number, theme: Theme) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const yAt = (x: number) => {
      const wx = x + camX * 0.5;
      return 214 + py * 0.9 + Math.sin(wx * 0.009 + 1) * 14 + Math.sin(wx * 0.025) * 5;
    };
    g.fillStyle = theme.grass[0];
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, yAt(x));
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    g.fillStyle = shade(theme.grass[0], -0.18);
    const off = Math.round(camX * 0.5) % 16;
    for (let x = -16; x < W + 16; x += 8) {
      const top = Math.round(yAt(x)) + 10;
      for (let y = top; y < H; y += 8) if ((((x + off) / 8 + y / 8) | 0) % 2 === 0) g.fillRect(x - off, y, 8, 8);
    }
    g.fillStyle = theme.grass[1];
    for (let x = 0; x <= W; x += 2) {
      const y = Math.round(yAt(x));
      g.fillRect(x, y, 2, 2);
      if (x % 14 === 0) g.fillRect(x, y - 3, 1, 3);
    }
    for (let x = 0; x < W; x += 9) {
      const wx = x + camX * 0.5;
      if (Math.floor(wx / 9) % 5 !== 0) continue;
      const y = Math.round(yAt(x)) + 14 + (Math.floor(wx / 9) % 3) * 10;
      g.fillStyle = Math.floor(wx / 9) % 2 ? "#ffd23f" : "#ffffff";
      g.fillRect(x, y, 2, 2);
      g.fillStyle = "#e8442f";
      g.fillRect(x + 1, y + 1, 1, 1);
    }
  }

  private bgSunset(g: CanvasRenderingContext2D, camX: number, py: number, f: number, theme: Theme) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    if (theme.sun) this.sun(g, theme.sun.x - camX * 0.02, theme.sun.y + py * 0.3, theme.sun.r, theme.sun.color, true);
    g.fillStyle = "#3a1a3a";
    for (let i = 0; i < 6; i++) {
      const x = ((i * 137 + f * 0.4 - camX * 0.08) % 520 + 520) % 520 - 20;
      const y = 50 + i * 12 + py * 0.3 + Math.sin(f * 0.05 + i) * 4;
      const flap = (f >> 3) % 2 === 0 ? 1 : -1;
      g.fillRect(Math.round(x), Math.round(y), 3, 1);
      g.fillRect(Math.round(x) - 2, Math.round(y) - flap, 2, 1);
      g.fillRect(Math.round(x) + 3, Math.round(y) - flap, 2, 1);
    }
    this.ridge(g, camX, 0.08, 132 + py * 0.5, [18, 8], [0.008, 0.021], "#7a3a6a", "#9a4a7a", 4);
    this.ridge(g, camX, 0.14, 150 + py * 0.55, [14, 6], [0.011, 0.027], "#8a4a6a", "#a85a7a", 4);
    const loff = (camX * 0.2) % 1300;
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(700 - loff + k * 1300);
      if (x < -40 || x > W + 40) continue;
      const base = Math.round(178 + py * 0.7);
      g.fillStyle = "#5a2a4a";
      g.beginPath();
      g.ellipse(x, base + 2, 30, 8, 0, Math.PI, 0);
      g.fill();
      g.fillStyle = "#e8e8f0";
      g.fillRect(x - 6, base - 44, 12, 44);
      g.fillStyle = "#e84040";
      g.fillRect(x - 6, base - 36, 12, 6);
      g.fillRect(x - 6, base - 20, 12, 6);
      g.fillStyle = "#3a3a4a";
      g.fillRect(x - 8, base - 50, 16, 6);
      const lit = (f >> 4) % 3 === 0;
      g.fillStyle = lit ? "#fff6a0" : "#a08020";
      g.fillRect(x - 4, base - 49, 8, 4);
      if (lit) {
        g.fillStyle = "rgba(255,246,160,0.35)";
        g.beginPath();
        g.moveTo(x + 4, base - 47);
        g.lineTo(x + 70, base - 60);
        g.lineTo(x + 70, base - 34);
        g.closePath();
        g.fill();
      }
    }
    const oy = Math.round(180 + py * 0.7);
    this.ocean(g, camX, oy, ["#f08a5a", "#c8504a", "#7a3a5a"], f, "rgba(255,230,180,0.6)");
    const boff = (camX * 0.28 + f * 0.1) % 700;
    g.fillStyle = "#2a1030";
    for (let k = -1; k <= 1; k++) {
      const bx = 240 - boff + k * 700;
      const by = oy + 18 + Math.sin(f * 0.04 + k) * 1.5;
      g.fillRect(bx - 10, by, 20, 4);
      g.fillRect(bx - 1, by - 16, 2, 16);
      g.beginPath();
      g.moveTo(bx + 1, by - 16);
      g.lineTo(bx + 12, by - 2);
      g.lineTo(bx + 1, by - 2);
      g.closePath();
      g.fill();
    }
    for (let layer = 0; layer < 2; layer++) {
      const col = layer === 0 ? "#d8a860" : theme.grass[0];
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const wx = x + camX * (0.45 + layer * 0.1);
        g.lineTo(x, 216 + layer * 14 + py * 0.9 + Math.sin(wx * 0.009 + layer * 2) * 12 + Math.sin(wx * 0.03) * 4);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
      g.fillStyle = shade(col, -0.15);
      for (let x = 0; x <= W; x += 2) {
        const wx = x + camX * (0.45 + layer * 0.1);
        const y = Math.round(216 + layer * 14 + py * 0.9 + Math.sin(wx * 0.009 + layer * 2) * 12 + Math.sin(wx * 0.03) * 4);
        if ((x / 2 + y) % 2 === 0) g.fillRect(x, y + 6, 2, 1);
        if ((x / 2) % 4 === 0) g.fillRect(x, y + 12, 2, 1);
      }
    }
  }

  private bgRuins(g: CanvasRenderingContext2D, camX: number, py: number, f: number, theme: Theme) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const mx = 390 - camX * 0.02;
    const my = 46 + py * 0.3;
    g.fillStyle = "#f0f0d8";
    g.beginPath();
    g.arc(mx, my, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c8c8b0";
    for (const [dx, dy, r] of [[-6, -4, 4], [5, 6, 3], [8, -8, 2.5], [-3, 9, 2]]) {
      g.beginPath();
      g.arc(mx + dx, my + dy, r, 0, Math.PI * 2);
      g.fill();
    }
    const base = Math.round(152 + py * 0.5);
    g.fillStyle = theme.farColor;
    g.fillRect(0, base, W, H - base);
    const off = (camX * 0.12) % 360;
    for (let k = -1; k <= 2; k++) {
      const bx = k * 360 - off;
      for (let i = 0; i < 4; i++) {
        const cx = bx + 30 + i * 50;
        const h = 44 + (i % 2) * 20;
        g.fillRect(cx, base - h, 9, h);
        g.fillRect(cx - 3, base - h - 4, 15, 4);
        if (i % 2) g.fillRect(cx - 3, base - h - 8, 15, 2);
      }
      g.beginPath();
      g.moveTo(bx + 250, base);
      g.lineTo(bx + 250, base - 46);
      g.arc(bx + 280, base - 46, 30, Math.PI, 0);
      g.lineTo(bx + 310, base);
      g.closePath();
      g.fill();
      g.fillRect(bx + 320, base - 30, 30, 30);
      g.fillRect(bx + 325, base - 38, 8, 8);
    }
    const off2 = (camX * 0.2) % 420;
    for (let k = -1; k <= 2; k++) {
      const bx = k * 420 - off2;
      const b2 = base + 18;
      g.fillStyle = "#3c2e74";
      g.fillRect(bx + 40, b2 - 60, 70, 60);
      g.fillRect(bx + 30, b2 - 64, 90, 4);
      g.fillStyle = "#1a1040";
      for (let wy = b2 - 54; wy < b2 - 10; wy += 14) for (let wx = bx + 48; wx < bx + 104; wx += 16) g.fillRect(wx, wy, 6, 9);
      g.fillStyle = "#3c2e74";
      for (let i = 0; i < 3; i++) {
        g.fillRect(bx + 200 + i * 40, b2 - 50 - i * 8, 12, 50 + i * 8);
        g.fillRect(bx + 196 + i * 40, b2 - 54 - i * 8, 20, 4);
      }
    }
    for (let layer = 0; layer < 2; layer++) {
      g.fillStyle = layer === 0 ? theme.midColor : theme.midColor2;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const wx = x + camX * (0.3 + layer * 0.12);
        g.lineTo(x, 190 + layer * 22 + py * 0.8 + Math.sin(wx * 0.007 + layer * 2) * 16 + Math.sin(wx * 0.02) * 6);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(200,210,255,0.18)";
      for (let x = 0; x < W; x += 2) {
        const wx = x + camX * (0.3 + layer * 0.12);
        const y = Math.round(190 + layer * 22 + py * 0.8 + Math.sin(wx * 0.007 + layer * 2) * 16 + Math.sin(wx * 0.02) * 6);
        if ((x / 2 + y + (f >> 3)) % 3 === 0) g.fillRect(x, y + 8, 2, 1);
      }
    }
    g.fillStyle = "#1e5a3a";
    const voff = Math.round(camX * 0.6) % 160;
    for (let x = -160; x < W + 160; x += 160) {
      for (const [dx, len] of [[20, 40], [60, 70], [95, 30], [130, 55]]) {
        const vx = x + dx - voff;
        g.fillRect(vx, 0, 2, len);
        for (let y = 6; y < len; y += 9) {
          g.fillRect(vx - 3, y, 3, 2);
          g.fillRect(vx + 2, y + 4, 3, 2);
        }
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = ((i * 97 + Math.sin(f * 0.01 + i) * 30 - camX * 0.4) % 520 + 520) % 520 - 20;
      const y = 150 + (i * 23) % 80 + py * 0.8 + Math.sin(f * 0.03 + i * 2) * 6;
      if ((f + i * 17) % 90 >= 45) continue;
      g.fillStyle = "rgba(220,255,120,0.3)";
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 4, 4);
      g.fillStyle = "#dcff78";
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  private bgMagma(g: CanvasRenderingContext2D, camX: number, py: number, f: number, theme: Theme) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.12 + layer * 0.1;
      const off = (camX * par) % 240;
      g.fillStyle = layer === 0 ? theme.farColor : "#3a1218";
      g.beginPath();
      g.moveTo(0, 0);
      for (let x = -240; x <= W + 240; x += 8) {
        const wx = x + off;
        g.lineTo(x - off + 240, 30 + layer * 20 + py * 0.4 + Math.abs(Math.sin(wx * 0.05)) * 36 + Math.sin(wx * 0.013) * 10);
      }
      g.lineTo(W, 0);
      g.closePath();
      g.fill();
      if (layer === 1) {
        g.fillStyle = "#ff8a30";
        for (let x = -240; x <= W + 240; x += 8) {
          const wx = x + off;
          const s = Math.abs(Math.sin(wx * 0.05));
          if (s > 0.97) g.fillRect(x - off + 240, Math.round(50 + py * 0.4 + s * 36 + Math.sin(wx * 0.013) * 10) - 2, 2, 3);
        }
      }
    }
    const poff = (camX * 0.25) % 520;
    for (let k = -1; k <= 1; k++) {
      for (const [dx, w, h] of [[80, 26, 110], [250, 18, 80], [400, 30, 130]]) {
        const x = Math.round(dx - poff + k * 520);
        const top = Math.round(190 + py * 0.7 - h);
        g.fillStyle = "#3a1a18";
        g.fillRect(x, top, w, h + 40);
        g.fillStyle = "#4e2a24";
        g.fillRect(x, top, 4, h + 40);
        g.fillStyle = "#2a0e0c";
        g.fillRect(x + w - 4, top, 4, h + 40);
        g.fillStyle = "#ff7a20";
        g.fillRect(x + 8, top + 20, 2, 12);
        g.fillRect(x + w - 10, top + 50, 2, 8);
      }
    }
    const loff = (camX * 0.3) % 700;
    for (let k = -1; k <= 1; k++) {
      const x = Math.round(330 - loff + k * 700);
      const top = Math.round(120 + py * 0.6);
      const bottom = Math.round(190 + py * 0.7);
      g.fillStyle = "#ff6a1a";
      g.fillRect(x, top, 14, bottom - top);
      g.fillStyle = "#ffd040";
      for (let i = 0; i < 6; i++) g.fillRect(x + 2 + ((i * 4) % 10), top + ((f * 2 + i * 23) % (bottom - top)), 2, 8);
      g.fillStyle = "#3a1a18";
      g.fillRect(x - 4, top - 6, 22, 6);
    }
    const ly = Math.round(190 + py * 0.7);
    g.drawImage(ditherGradient("lava", this.grads, W, 100, ["#ffd040", "#ff7a1a", "#c02a00", "#6a1000"], 10), 0, ly, W, H - ly);
    g.fillStyle = "#fff0a0";
    for (let row = 0; row < 5; row++) {
      const y = ly + 6 + row * 11;
      const off = (camX * (0.3 + row * 0.05) + f * 0.25) % 50;
      for (let x = -50; x < W + 50; x += 50) g.fillRect(Math.round(x - off), y, 10 + row * 3, 2);
    }
    for (let x = 0; x < W; x += 40) {
      const t = (f + x * 3) % 100;
      if (t < 30) {
        g.fillStyle = "#ffe080";
        g.beginPath();
        g.arc(x + 12 + ((camX * 0.3) % 40), ly + 12 - t * 0.2, 2 + t * 0.05, 0, Math.PI * 2);
        g.fill();
      }
    }
    const glow = g.createLinearGradient(0, ly - 34, 0, ly);
    glow.addColorStop(0, "rgba(255,120,40,0)");
    glow.addColorStop(1, "rgba(255,120,40,0.45)");
    g.fillStyle = glow;
    g.fillRect(0, ly - 34, W, 34);
    g.fillStyle = "#2a1210";
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const wx = x + camX * 0.5;
      g.lineTo(x, 226 + py * 0.9 + Math.sin(wx * 0.011) * 10 + Math.sin(wx * 0.03) * 4);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fill();
    g.fillStyle = "#ff8a30";
    for (let x = 0; x <= W; x += 2) {
      const wx = x + camX * 0.5;
      const y = Math.round(226 + py * 0.9 + Math.sin(wx * 0.011) * 10 + Math.sin(wx * 0.03) * 4);
      if (Math.floor(wx / 2) % 9 === 0) g.fillRect(x, y + 4, 2, 1);
    }
    for (let i = 0; i < 20; i++) {
      const life = (f + i * 29) % 240;
      const x = (i * 53 + Math.sin(life * 0.05 + i) * 10) % W;
      const y = H - life * 1.1;
      if (y < 0) continue;
      g.fillStyle = life % 8 < 4 ? "#ff9040" : "#ffd060";
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }

  private bgSky(g: CanvasRenderingContext2D, camX: number, py: number, f: number, theme: Theme) {
    g.fillStyle = "#e8e8ff";
    g.beginPath();
    g.arc(80 - camX * 0.02, 50 + py * 0.3, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.sky[0];
    g.beginPath();
    g.arc(86 - camX * 0.02, 46 + py * 0.3, 12, 0, Math.PI * 2);
    g.fill();
    const off = (camX * 0.1 + f * 0.08) % 420;
    for (let k = -1; k <= 1; k++) for (const [cx, cy, s] of [[30, 150, 1.6], [180, 170, 1.2], [300, 140, 1.8], [420, 175, 1.1]]) this.cloud(g, cx - off + k * 420, cy + py * 0.4, s, "#c8d8ff", "#9ab0e8");
    const ax = Math.round(((f * 0.25 - camX * 0.1) % 760 + 760) % 760 - 120);
    const ay = Math.round(72 + py * 0.3 + Math.sin(f * 0.02) * 3);
    g.fillStyle = "#2a3050";
    g.beginPath();
    g.ellipse(ax, ay, 34, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#3e4870";
    g.beginPath();
    g.ellipse(ax, ay - 2, 32, 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#5a6a9a";
    g.fillRect(ax - 20, ay - 3, 40, 1);
    g.fillStyle = "#1a2040";
    g.fillRect(ax - 10, ay + 9, 20, 6);
    g.fillStyle = (f >> 3) % 2 === 0 ? "#ff5050" : "#600";
    g.fillRect(ax + 30, ay - 1, 2, 2);
    g.fillStyle = "#ffd060";
    for (let i = -7; i <= 7; i += 4) g.fillRect(ax + i, ay + 11, 2, 2);
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.22 + layer * 0.12;
      const base = Math.round(206 + layer * 16 + py * 0.7);
      const toff = (camX * par) % 260;
      const col = layer === 0 ? "#1e2848" : theme.midColor;
      const col2 = layer === 0 ? "#2a3660" : theme.midColor2;
      for (let k = -1; k <= 2; k++) {
        const bx = k * 260 - toff;
        const towers = layer === 0 ? [[0, 90, 28], [50, 120, 22], [90, 70, 36], [140, 140, 26], [180, 95, 30], [222, 115, 24]] : [[10, 60, 30], [50, 90, 22], [84, 50, 40], [134, 110, 26], [170, 70, 34], [214, 95, 24]];
        for (const [tx, th, tw] of towers) {
          g.fillStyle = col;
          g.fillRect(bx + tx, base - th, tw, th + 70);
          g.fillStyle = col2;
          g.fillRect(bx + tx, base - th, 3, th + 70);
          g.fillRect(bx + tx, base - th, tw, 3);
          for (let wy = base - th + 8; wy < base - 4; wy += 7) {
            for (let wx = bx + tx + 4; wx < bx + tx + tw - 4; wx += 6) {
              const lit = ((wx * 7 + wy * 13) % 5 === 0) !== ((f >> 5) % 7 === 0 && (wx + wy) % 11 === 0);
              g.fillStyle = lit ? (layer ? "#ffe090" : "#c0a060") : "rgba(0,0,0,0.3)";
              g.fillRect(wx, wy, 2, 3);
            }
          }
          g.fillStyle = (f >> 4) % 2 === 0 ? "#ff4040" : "#801010";
          g.fillRect(bx + tx + tw / 2, base - th - 6, 2, 2);
          g.fillStyle = "#3a4a80";
          g.fillRect(bx + tx + tw / 2, base - th - 4, 1, 4);
        }
      }
    }
    const coff = (camX * 0.5 + f * 0.3) % 300;
    for (let k = -1; k <= 2; k++) for (const [cx, cy, s] of [[20, 250, 1.3], [150, 262, 1.0], [240, 245, 1.5]]) this.cloud(g, cx - coff + k * 300, cy + py, s, "#ffffff", "#c8d8f0");
    const ioff = (camX * 0.42) % 640;
    for (let k = -1; k <= 1; k++) {
      const ix = Math.round(400 - ioff + k * 640);
      const iy = Math.round(200 + py * 0.9 + Math.sin(f * 0.02 + k) * 2);
      g.fillStyle = "#4a5068";
      g.beginPath();
      g.moveTo(ix - 30, iy);
      g.lineTo(ix - 18, iy + 20);
      g.lineTo(ix + 10, iy + 26);
      g.lineTo(ix + 28, iy + 8);
      g.lineTo(ix + 30, iy);
      g.closePath();
      g.fill();
      g.fillStyle = "#e0b030";
      g.fillRect(ix - 30, iy - 3, 60, 4);
      g.fillStyle = "#f8d860";
      g.fillRect(ix - 30, iy - 3, 60, 1);
      g.fillStyle = "#3a4058";
      g.fillRect(ix - 2, iy - 24, 4, 21);
      g.fillStyle = (f >> 4) % 2 ? "#ff5050" : "#601010";
      g.fillRect(ix - 1, iy - 27, 2, 3);
    }
  }

  // ------------------------------------------------------------------
  // Water, terrain, platforms, loops
  // ------------------------------------------------------------------
  private drawWater(g: CanvasRenderingContext2D, game: Game, theme: Theme, x0: number, x1: number) {
    const top = WATER_Y;
    const bottom = game.level.height + 100;
    g.drawImage(ditherGradient(`water:${theme.id}`, this.grads, 8, 80, [theme.water[0], theme.water[1]], 8), x0, top, x1 - x0, bottom - top);
    g.fillStyle = theme.id === "magma" ? "#fff0a0" : "rgba(255,255,255,0.6)";
    const off = (game.frame * 0.5) % 24;
    for (let x = Math.floor(x0 / 24) * 24 - 24; x < x1 + 24; x += 24) {
      g.fillRect(Math.round(x + off), top + 1 + Math.round(Math.sin((x + game.frame * 2) * 0.05)), 10, 1);
      g.fillRect(Math.round(x + off + 6), top + 7, 6, 1);
      g.fillRect(Math.round(x - off + 14), top + 14, 4, 1);
    }
    g.fillStyle = "rgba(255,255,255,0.8)";
    g.fillRect(x0, top, x1 - x0, 1);
    if (theme.id === "magma") {
      for (let x = Math.floor(x0 / 40) * 40; x < x1; x += 40) {
        const t = (game.frame + x) % 90;
        if (t < 30) {
          g.fillStyle = "#ffe080";
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
      g.save();
      g.clip();
      g.fillStyle = "rgba(0,0,0,0.22)";
      g.beginPath();
      pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y + 10) : g.lineTo(p.x, p.y + 10)));
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x, pts[i].y + 26);
      g.closePath();
      g.fill();
      g.restore();
      this.drawEdge(g, pts, theme);
      if (groundAtSegs(segs, first.x - step) === null) this.cliff(g, first.x, first.y, bottom, theme, true);
      if (groundAtSegs(segs, last.x + step) === null) this.cliff(g, last.x, last.y, bottom, theme, false);
    }
  }

  private cliff(g: CanvasRenderingContext2D, x: number, y: number, bottom: number, theme: Theme, left: boolean) {
    g.fillStyle = shade(theme.ground[0], -0.45);
    g.fillRect(left ? x : x - 5, y, 5, bottom - y);
    g.fillStyle = shade(theme.ground[0], -0.2);
    for (let yy = y + 6; yy < bottom; yy += 12) g.fillRect(left ? x + 1 : x - 4, yy, 2, 6);
    g.fillStyle = theme.grass[0];
    g.fillRect(x - 2, y - 2, 4, 8);
    g.fillRect(left ? x - 1 : x + 1, y + 6, 1, 6);
    g.fillRect(left ? x - 3 : x + 3, y + 3, 1, 4);
  }

  private strokePath(g: CanvasRenderingContext2D, pts: { x: number; y: number }[], dy: number, color: string, width: number) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y + dy) : g.lineTo(p.x, p.y + dy)));
    g.stroke();
  }

  private drawEdge(g: CanvasRenderingContext2D, pts: { x: number; y: number }[], theme: Theme) {
    g.lineCap = "round";
    switch (theme.edge) {
      case "grass":
      case "sand": {
        this.strokePath(g, pts, 11, theme.groundEdge, 4);
        this.strokePath(g, pts, 3, theme.grass[0], 8);
        this.strokePath(g, pts, 5, shade(theme.grass[0], -0.2), 2);
        this.strokePath(g, pts, -1, theme.grass[1], 3);
        this.strokePath(g, pts, -2, "rgba(255,255,255,0.4)", 1);
        g.fillStyle = theme.edge === "grass" ? theme.grass[1] : "#fff4d0";
        for (const p of pts) {
          const k = Math.floor(p.x / 4) % 7;
          const X = Math.round(p.x);
          const Y = Math.round(p.y);
          if (k === 0) {
            g.fillRect(X, Y - 5, 1, 4);
            g.fillRect(X + 2, Y - 3, 1, 2);
          } else if (k === 3) g.fillRect(X, Y - 4, 1, 3);
          else if (k === 5) g.fillRect(X - 1, Y - 3, 1, 2);
        }
        g.fillStyle = shade(theme.grass[0], -0.35);
        for (let i = 0; i < pts.length; i += 3) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 5 === 0) g.fillRect(Math.round(p.x), Math.round(p.y) + 6, 2, 1);
          if (Math.floor(p.x / 4) % 7 === 2) g.fillRect(Math.round(p.x), Math.round(p.y) + 3, 1, 2);
        }
        break;
      }
      case "moss": {
        this.strokePath(g, pts, 8, theme.groundEdge, 4);
        this.strokePath(g, pts, 2, "#5a6a6a", 6);
        this.strokePath(g, pts, 1, "#8a9a9a", 1);
        this.strokePath(g, pts, -1, theme.grass[0], 4);
        this.strokePath(g, pts, -2, theme.grass[1], 2);
        g.fillStyle = theme.grass[0];
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          const k = Math.floor(p.x / 4) % 9;
          if (k === 0) g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 2, 7);
          if (k === 5) g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 1, 4);
          if (k === 3) g.fillRect(Math.round(p.x), Math.round(p.y) - 4, 1, 3);
        }
        g.fillStyle = theme.grass[1];
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 9 === 0) g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 1, 3);
        }
        break;
      }
      case "crust": {
        this.strokePath(g, pts, 8, "#1a0808", 4);
        this.strokePath(g, pts, 2, theme.grass[0], 7);
        this.strokePath(g, pts, -1, theme.grass[1], 3);
        this.strokePath(g, pts, -2, "#ff9a50", 1);
        g.fillStyle = "#ffb040";
        for (const p of pts) {
          const k = Math.floor(p.x / 4) % 11;
          if (k === 0 || k === 6) g.fillRect(Math.round(p.x), Math.round(p.y) + 2, 3, 1);
          if (k === 3) g.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 4, 1, 3);
        }
        g.fillStyle = "#2a0a08";
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 7 === 1) g.fillRect(Math.round(p.x), Math.round(p.y) + 1, 2, 1);
        }
        break;
      }
      case "metal": {
        this.strokePath(g, pts, 8, "#1a2030", 3);
        this.strokePath(g, pts, 2, "#8a94b0", 7);
        this.strokePath(g, pts, -1, "#d8e0f0", 2);
        for (const p of pts) {
          const k = Math.floor(p.x / 4) % 4;
          g.fillStyle = k < 2 ? theme.grass[0] : "#222";
          g.fillRect(Math.round(p.x), Math.round(p.y) + 3, 4, 3);
        }
        g.fillStyle = "#e8eef8";
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 8 === 0) g.fillRect(Math.round(p.x), Math.round(p.y) - 1, 2, 1);
        }
        g.fillStyle = "#2a3048";
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i];
          if (Math.floor(p.x / 4) % 8 === 4) g.fillRect(Math.round(p.x), Math.round(p.y) + 7, 2, 2);
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
      const px0 = Math.round(p.px + sx);
      const py0 = Math.round(p.py);
      if (p.solid) {
        g.fillStyle = pats.block;
        g.fillRect(px0, py0, p.w, p.h);
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(px0, py0, p.w, 2);
        g.fillRect(px0, py0, 2, p.h);
        g.fillStyle = "rgba(0,0,0,0.4)";
        g.fillRect(px0, py0 + p.h - 2, p.w, 2);
        g.fillRect(px0 + p.w - 2, py0, 2, p.h);
        g.fillStyle = "rgba(0,0,0,0.6)";
        g.fillRect(px0 - 1, py0 - 1, p.w + 2, 1);
        g.fillRect(px0 - 1, py0 - 1, 1, p.h + 2);
        g.fillRect(px0 + p.w, py0 - 1, 1, p.h + 2);
      } else {
        g.fillStyle = pats.ground;
        g.fillRect(px0, py0, p.w, p.h);
        g.fillStyle = theme.groundEdge;
        g.fillRect(px0, py0 + p.h - 3, p.w, 3);
        g.fillRect(px0, py0 + 6, p.w, 2);
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.fillRect(px0 - 1, py0 + 4, 1, p.h - 4);
        g.fillRect(px0 + p.w, py0 + 4, 1, p.h - 4);
        g.fillRect(px0, py0 + p.h, p.w, 1);
        g.fillStyle = theme.grass[0];
        g.fillRect(px0 - 2, py0 - 2, p.w + 4, 7);
        g.fillStyle = theme.grass[1];
        g.fillRect(px0 - 2, py0 - 2, p.w + 4, 2);
        g.fillStyle = shade(theme.grass[0], -0.3);
        g.fillRect(px0 - 2, py0 + 4, p.w + 4, 1);
        for (let x = px0; x < px0 + p.w; x += 7) g.fillRect(x, py0 - 4, 1, 2);
        if (p.move) {
          g.fillStyle = "#4a4e60";
          g.fillRect(px0 + 4, py0 + p.h, 3, 4);
          g.fillRect(px0 + p.w - 7, py0 + p.h, 3, 4);
          g.fillStyle = "#8a8ea0";
          g.fillRect(px0 + 3, py0 + p.h + 3, 5, 2);
          g.fillRect(px0 + p.w - 8, py0 + p.h + 3, 5, 2);
        }
        if (p.crumble) {
          g.fillStyle = "rgba(0,0,0,0.55)";
          for (let cx = px0 + 8; cx < px0 + p.w; cx += 14) {
            g.fillRect(cx, py0 + 5, 1, 4);
            g.fillRect(cx + 1, py0 + 9, 2, 1);
            g.fillRect(cx + 2, py0 + 10, 1, 4);
          }
        }
      }
    }
  }

  private drawLoopBack(g: CanvasRenderingContext2D, loop: Loop, pats: ThemePatterns, theme: Theme) {
    const outer = loop.r + 24;
    g.fillStyle = shade(theme.loop[0], -0.3);
    g.fillRect(loop.cx - outer + 4, loop.cy, 10, loop.r + 24);
    g.fillRect(loop.cx + outer - 14, loop.cy, 10, loop.r + 24);
    g.fillStyle = shade(theme.loop[1], 0.1);
    g.fillRect(loop.cx - outer + 4, loop.cy, 2, loop.r + 24);
    g.fillRect(loop.cx + outer - 14, loop.cy, 2, loop.r + 24);
    g.fillStyle = "#1a1a2a";
    for (let y = loop.cy + 10; y < loop.cy + loop.r + 20; y += 14) {
      g.fillRect(loop.cx - outer + 6, y, 6, 2);
      g.fillRect(loop.cx + outer - 12, y, 6, 2);
    }
    g.beginPath();
    g.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    g.arc(loop.cx, loop.cy, loop.r, 0, Math.PI * 2, true);
    g.fillStyle = pats.loop;
    g.fill();
    g.save();
    g.beginPath();
    g.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    g.arc(loop.cx, loop.cy, loop.r, 0, Math.PI * 2, true);
    g.clip();
    g.strokeStyle = "rgba(0,0,0,0.3)";
    g.lineWidth = 8;
    g.beginPath();
    g.arc(loop.cx, loop.cy, loop.r + 4, 0.2, Math.PI - 0.2);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.25)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(loop.cx, loop.cy, outer - 2, Math.PI + 0.3, Math.PI * 2 - 0.3);
    g.stroke();
    g.restore();
    g.strokeStyle = "#101428";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = shade(theme.loop[1], 0.35);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.fillRect(Math.round(loop.cx + Math.cos(a) * (outer - 5)) - 1, Math.round(loop.cy + Math.sin(a) * (outer - 5)) - 1, 2, 2);
    }
  }

  private drawLoopFront(g: CanvasRenderingContext2D, loop: Loop, theme: Theme) {
    g.strokeStyle = "#101428";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(loop.cx, loop.cy, loop.r, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.75)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(loop.cx, loop.cy, loop.r + 2, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = shade(theme.loop[0], -0.2);
    g.lineWidth = 1;
    g.beginPath();
    g.arc(loop.cx, loop.cy, loop.r + 4, 0, Math.PI * 2);
    g.stroke();
  }

  // ------------------------------------------------------------------
  // Decoration
  // ------------------------------------------------------------------
  private drawDecor(g: CanvasRenderingContext2D, d: Decor, frame: number) {
    const x = Math.round(d.x);
    const y = Math.round(d.y);
    const size = Math.max(0, Math.min(2, Math.round(((d.scale ?? 1) - 0.85) / 0.175)));
    switch (d.kind) {
      case "palm":
        SP.blit(g, SP.palmSprite(size, Math.floor((frame / 30 + d.x) % 4)), x, y, Math.round(d.x) % 2 === 1);
        break;
      case "bush":
        SP.blit(g, SP.bushSprite(), x, y);
        break;
      case "flower":
        SP.blit(g, SP.flowerSprite(Math.floor(frame / 12 + d.x / 7) % 2), x, y);
        break;
      case "totem":
        SP.blit(g, SP.totemSprite(), x, y);
        break;
      case "column":
        SP.blit(g, SP.columnSprite(size), x, y);
        break;
      case "ruinwall":
        SP.blit(g, SP.ruinWallSprite(), x, y);
        break;
      case "torch":
        SP.blit(g, SP.torchSprite(Math.floor(frame / 6 + d.x) % 3), x, y);
        g.fillStyle = `rgba(255,140,40,${0.12 + Math.sin(frame * 0.3 + d.x) * 0.04})`;
        g.beginPath();
        g.arc(x, y - 46, 22, 0, Math.PI * 2);
        g.fill();
        break;
      case "crystal":
        SP.blit(g, SP.crystalSprite(), x, y);
        g.fillStyle = "rgba(200,120,255,0.12)";
        g.beginPath();
        g.arc(x, y - 18, 24, 0, Math.PI * 2);
        g.fill();
        break;
      case "lavaburst": {
        const t = (frame + Math.round(d.x)) % 140;
        const fr = t < 60 ? 1 + Math.floor(t / 12) : 0;
        SP.blit(g, SP.lavaburstSprite(Math.min(5, fr)), x, y);
        break;
      }
      case "rock":
        SP.blit(g, SP.rockSprite(), x, y, Math.round(d.x) % 2 === 1);
        break;
      case "umbrella":
        SP.blit(g, SP.umbrellaSprite(), x, y);
        break;
      case "antenna":
        SP.blit(g, SP.antennaSprite(size, Math.floor(frame / 16 + d.x / 50) % 2 === 0), x, y);
        break;
      case "pipe":
        SP.blit(g, SP.pipeSprite(), x, y);
        if ((frame + d.x) % 80 < 40) {
          const t = (frame + d.x) % 40;
          g.fillStyle = `rgba(255,255,255,${0.35 - t * 0.008})`;
          g.beginPath();
          g.arc(x + t * 0.2, y - 36 - t * 0.5, 3 + t * 0.1, 0, Math.PI * 2);
          g.fill();
        }
        break;
    }
  }

  // ------------------------------------------------------------------
  // Objects
  // ------------------------------------------------------------------
  private drawRing(g: CanvasRenderingContext2D, x: number, y: number, frame: number) {
    SP.blit(g, SP.ringSprite(Math.floor(frame / 4 + x / 20)), x, y);
    if ((frame + Math.round(x)) % 56 < 5) {
      g.fillStyle = "#fff";
      const rx = Math.round(x) + 4;
      const ry = Math.round(y) - 5;
      g.fillRect(rx - 1, ry - 3, 2, 7);
      g.fillRect(rx - 3, ry - 1, 7, 2);
    }
  }

  private drawRingSparkle(g: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const r = (16 - t) * 0.7 + 2;
    g.fillStyle = t > 8 ? "#fff" : "#ffe080";
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + (16 - t) * 0.1;
      g.fillRect(Math.round(x + Math.cos(a) * r) - 1, Math.round(y + Math.sin(a) * r) - 1, 2, 2);
    }
    g.fillRect(Math.round(x) - 1, Math.round(y) - 3, 2, 6);
    g.fillRect(Math.round(x) - 3, Math.round(y) - 1, 6, 2);
  }

  private drawGoal(g: CanvasRenderingContext2D, game: Game) {
    const gl = game.level.goal;
    if (gl.x < game.camera.x - 60 || gl.x > game.camera.x + C.VIEW_W + 60) return;
    const spin = game.goalSpin;
    let face: "villain" | "hero" | "blank" = "villain";
    if (spin >= 150) face = "hero";
    else if (spin > 0) {
      const c = Math.cos(spin * 0.35);
      face = Math.abs(c) < 0.35 ? "blank" : c < 0 ? "hero" : "villain";
    }
    SP.blit(g, SP.goalSprite(face), gl.x, gl.y);
  }

  private drawSpikeball(g: CanvasRenderingContext2D, px0: number, py0: number, x: number, y: number) {
    g.fillStyle = "#3a3a44";
    g.beginPath();
    g.arc(px0, py0, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#8a8a96";
    g.fillRect(px0 - 2, py0 - 2, 2, 2);
    const n = 6;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const cx = Math.round(px0 + (x - px0) * t);
      const cy = Math.round(py0 + (y - py0) * t);
      g.fillStyle = "#2a2a34";
      g.fillRect(cx - 2, cy - 2, 4, 4);
      g.fillStyle = "#a0a0ac";
      g.fillRect(cx - 1, cy - 1, 2, 2);
    }
    SP.blit(g, SP.spikeballSprite(), x, y);
  }

  private drawProjectile(g: CanvasRenderingContext2D, x: number, y: number, kind: "shot" | "fireball", frame: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (kind === "shot") {
      g.fillStyle = "#a06000";
      g.fillRect(x - 3, y - 3, 6, 6);
      g.fillStyle = "#ffe040";
      g.fillRect(x - 2, y - 2, 4, 4);
      g.fillStyle = "#fff";
      g.fillRect(x - 1, y - 2, 1, 1);
    } else {
      g.fillStyle = "rgba(255,120,30,0.45)";
      g.beginPath();
      g.arc(x, y, 6 + (frame % 4 < 2 ? 1 : 0), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#c02a00";
      g.fillRect(x - 4, y - 4, 8, 8);
      g.fillStyle = "#ff8020";
      g.fillRect(x - 3, y - 3, 6, 6);
      g.fillStyle = "#ffe060";
      g.fillRect(x - 2, y - 2, 3, 3);
    }
  }

  private drawBoss(g: CanvasRenderingContext2D, game: Game) {
    const b = game.boss!;
    const flashing = b.flash > 0 && (b.flash >> 1) % 2 === 0;
    SP.blit(g, SP.bossSprite((game.frame >> 1) % 2, flashing), b.x, b.y, b.dir === -1);
    if (b.hits >= 4 && game.frame % 6 === 0) {
      g.fillStyle = "rgba(80,80,80,0.6)";
      g.beginPath();
      g.arc(b.x - 6 + (game.frame % 12), b.y - 18 - (game.frame % 10), 3 + (game.frame % 5), 0, Math.PI * 2);
      g.fill();
    }
  }

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------
  private heroPose(pl: Player, game: Game): SP.HeroPose {
    if (game.phase === "dying") return "dead";
    if (pl.hurt) return "hurt";
    if (pl.springTimer > 0 && !pl.onGround) return "spring";
    if (!pl.onGround) return "air";
    if (pl.crouching) return "crouch";
    if (pl.lookingUp) return "look";
    if (pl.skidding) return "skid";
    const speed = Math.abs(pl.gsp);
    if (speed >= 5.5) return `fast${Math.floor(pl.runPhase * 1.5) % 4}` as SP.HeroPose;
    if (speed > 0.3) return `run${Math.floor(pl.runPhase * 1.2) % 6}` as SP.HeroPose;
    if (pl.idle > 200 && pl.idle % 150 < 8) return "blink";
    return "idle";
  }

  private drawHeroAt(g: CanvasRenderingContext2D, x: number, y: number, pose: SP.HeroPose | null, ballFrame: number, facing: 1 | -1, angle: number, alpha: number) {
    if (pose === null) SP.blit(g, SP.heroBall(ballFrame), x, y, facing === -1, 0, alpha);
    else SP.blit(g, SP.heroSprite(pose), x, y, facing === -1, angle, alpha);
  }

  private drawPlayer(g: CanvasRenderingContext2D, game: Game) {
    const pl = game.player;
    if (pl.invuln > 0 && game.phase === "playing" && Math.floor(pl.invuln / 3) % 2 === 0) return;
    const dying = game.phase === "dying";
    const pose = pl.rolling && !dying ? null : this.heroPose(pl, game);
    const ballFrame = Math.floor(pl.runPhase * 1.4) % 4;

    this.trail.push({ x: pl.x, y: pl.y, facing: pl.facing, angle: pl.drawAngle, rolling: pl.rolling, phase: pl.runPhase });
    if (this.trail.length > 8) this.trail.shift();
    const fast = Math.abs(pl.gsp) >= 5.5 || (!pl.onGround && Math.abs(pl.xsp) >= 5.5) || pl.invincible > 0;
    if (fast && game.phase === "playing") {
      for (const [idx, alpha] of [[5, 0.2], [3, 0.35]] as [number, number][]) {
        const t = this.trail[this.trail.length - 1 - idx];
        if (!t) continue;
        const tp = t.rolling ? null : pose && pose.startsWith("fast") ? (`fast${Math.floor(t.phase * 1.5) % 4}` as SP.HeroPose) : pose;
        this.drawHeroAt(g, t.x, t.y, tp, Math.floor(t.phase * 1.4) % 4, t.facing, t.angle, alpha);
      }
    }

    if (pl.shield) {
      g.fillStyle = `rgba(120,200,255,${0.2 + Math.sin(game.frame * 0.3) * 0.08})`;
      g.beginPath();
      g.arc(Math.round(pl.x), Math.round(pl.y), 23, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#c8f0ff";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(Math.round(pl.x), Math.round(pl.y), 23, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#ffffff";
      const a = game.frame * 0.15;
      g.fillRect(Math.round(pl.x + Math.cos(a) * 23) - 1, Math.round(pl.y + Math.sin(a) * 23) - 1, 2, 2);
    }
    if (pl.invincible > 0) {
      for (let i = 0; i < 3; i++) {
        const a = game.frame * 0.2 + (i / 3) * Math.PI * 2;
        const r = 20 + Math.sin(game.frame * 0.3 + i) * 3;
        const sx = Math.round(pl.x + Math.cos(a) * r);
        const sy = Math.round(pl.y + Math.sin(a) * r);
        g.fillStyle = ["#ffffff", "#ffe060", "#80d0ff"][(i + (game.frame >> 2)) % 3];
        g.fillRect(sx - 1, sy - 3, 2, 6);
        g.fillRect(sx - 3, sy - 1, 6, 2);
      }
    }
    this.drawHeroAt(g, pl.x, pl.y, pose, ballFrame, pl.facing, pose === null ? 0 : pl.drawAngle, 1);
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
      case "smoke": {
        const r = Math.round(p.size * (0.6 + t));
        g.fillStyle = t < 0.5 ? "#ffffff" : "#d8e0f0";
        g.fillRect(x - r, y - Math.round(r * 0.6), r * 2, Math.round(r * 1.2));
        g.fillRect(x - Math.round(r * 0.6), y - r, Math.round(r * 1.2), r * 2);
        break;
      }
      case "spark":
        g.fillStyle = t < 0.5 ? "#fff" : "#ffec78";
        g.fillRect(x - 1, y - 1, 2, 2);
        break;
      case "pop":
        g.fillStyle = t < 0.5 ? "#fff" : "#ffb300";
        g.fillRect(x - 1, y - 1, 3, 3);
        break;
      case "boom": {
        const r = Math.round(p.size * Math.sin(t * Math.PI));
        g.fillStyle = t < 0.4 ? "#fff" : t < 0.7 ? "#ffd040" : "#ff6020";
        g.fillRect(x - r, y - Math.round(r * 0.5), r * 2, r);
        g.fillRect(x - Math.round(r * 0.5), y - r, r, r * 2);
        g.fillStyle = "#101010";
        const ir = Math.round(r * 0.5 * t);
        g.fillRect(x - ir, y - ir, ir * 2, ir * 2);
        break;
      }
      case "star":
      case "invstar":
        g.fillStyle = p.kind === "star" ? "#ffffff" : ["#ffffff", "#ffe060", "#80d0ff"][Math.floor(t * 6) % 3];
        g.fillRect(x - 1, y - 3, 2, 6);
        g.fillRect(x - 3, y - 1, 6, 2);
        break;
      case "shieldpop":
        g.strokeStyle = "#8ad0ff";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(x, y, Math.round(p.size + t * 20), 0, Math.PI * 2);
        g.stroke();
        break;
      case "splash":
        g.fillStyle = t < 0.5 ? "#ffffff" : "#a8d8ff";
        g.fillRect(x - 1, y - 1, 2, 3);
        break;
      case "debris":
        g.fillStyle = "#6a4a2a";
        g.fillRect(x - 2, y - 2, 4, 4);
        g.fillStyle = "#9a7a4a";
        g.fillRect(x - 2, y - 2, 4, 1);
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
      this.heroIcon(g, 18, H - 12);
      drawText(g, `X${Math.max(0, game.lives)}`, 30, H - 15, "#fff");

      if (game.boss && game.boss.locked && game.boss.state !== "gone") {
        const left = C.BOSS_HITS - game.boss.hits;
        drawText(g, "BOSS", W - 100, 10, "#ff5252");
        for (let i = 0; i < C.BOSS_HITS; i++) {
          g.fillStyle = i < left ? "#ff5252" : "#3a1010";
          g.fillRect(W - 66 + i * 7, 10, 5, 6);
          g.fillStyle = i < left ? "#ffb0b0" : "#2a0808";
          g.fillRect(W - 66 + i * 7, 10, 5, 1);
        }
      }
      if (game.player.invincible > 0 || game.player.speedShoes > 0) {
        const s = Math.ceil(Math.max(game.player.invincible, game.player.speedShoes) / 60);
        drawText(g, game.player.invincible > 0 ? `STARS ${s}` : `SPEED ${s}`, W - 12, H - 15, "#ffd23f", { align: "right" });
      }
    }

    if (game.messageTimer > 0 && game.phase !== "title") {
      if (game.message === game.level.name) {
        const t = game.messageTimer;
        const slide = t > 140 ? (160 - t) / 20 : t < 20 ? t / 20 : 1;
        const x = Math.round(W - 30 - (1 - slide) * 220);
        g.fillStyle = "#101428";
        g.fillRect(x - 176, 82, 196, 48);
        g.fillStyle = "#1c2a60";
        g.fillRect(x - 174, 84, 192, 44);
        g.fillStyle = "#ffd23f";
        g.fillRect(x - 174, 84, 5, 44);
        g.fillStyle = "#e83838";
        g.fillRect(x - 168, 84, 2, 44);
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

  private heroIcon(g: CanvasRenderingContext2D, x: number, y: number) {
    const s = SP.pixelSprite("heroicon", 26, 22, 13, 11, (k) => {
      k.fillStyle = SP.PAL.B;
      k.beginPath();
      k.arc(1, 0, 7, 0, Math.PI * 2);
      k.fill();
      for (let i = 0; i < 3; i++) {
        k.beginPath();
        k.moveTo(-4, -5 + i * 4);
        k.lineTo(-12, -2 + i * 5);
        k.lineTo(-3, -1 + i * 4);
        k.closePath();
        k.fill();
      }
      k.fillStyle = SP.PAL.S;
      k.beginPath();
      k.arc(5, 2, 3.5, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = "#fff";
      k.beginPath();
      k.ellipse(4, -2, 3, 4, 0, 0, Math.PI * 2);
      k.fill();
      k.fillStyle = SP.PAL.G;
      k.fillRect(5, -3, 1.5, 2.5);
      k.fillStyle = "#101010";
      k.fillRect(8, 1, 2, 2);
    });
    SP.blit(g, s, x, y);
  }

  private dim(g: CanvasRenderingContext2D, a: number) {
    g.fillStyle = `rgba(0,0,0,${a})`;
    g.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  private drawTitle(g: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    this.dim(g, 0.35);
    const t = game.titleTimer;
    const bob = Math.round(Math.sin(t * 0.05) * 3);
    g.fillStyle = "#101428";
    g.beginPath();
    g.ellipse(W / 2, 48 + bob, 134, 33, 0, 0, Math.PI * 2);
    g.fill();
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
    g.fillStyle = "#ffd23f";
    for (let i = 0; i < 4; i++) {
      g.fillRect(W / 2 - 170 - i * 10, 44 + bob + i * 5, 36 - i * 6, 3);
      g.fillRect(W / 2 + 134 + i * 10, 44 + bob + i * 5, 36 - i * 6, 3);
    }
    drawText(g, "SPIN RUSH", W / 2, 34 + bob, "#fff", { scale: 3, align: "center", outline: "#0b2a6f" });
    drawText(g, "A SONIC-STYLE SPEED PLATFORMER", W / 2, 84, "#ffd23f", { align: "center" });

    g.save();
    g.translate(70, 170);
    g.scale(2, 2);
    g.imageSmoothingEnabled = false;
    const pose: SP.HeroPose = t % 400 > 330 && t % 400 < 338 ? "blink" : "idle";
    SP.blit(g, SP.heroSprite(pose), 0, 0);
    g.restore();

    const lx = 150;
    const ly = 104;
    g.fillStyle = "#101428";
    g.fillRect(lx - 10, ly - 8, 304, 122);
    g.fillStyle = "rgba(10,20,60,0.85)";
    g.fillRect(lx - 8, ly - 6, 300, 118);
    g.fillStyle = "#ffd23f";
    g.fillRect(lx - 8, ly - 6, 300, 2);
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
  }

  private drawResults(g: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const t = game.tally;
    const slide = Math.min(1, (game.clearTimer - 150) / 25);
    const ox = Math.round((1 - slide) * -W);
    g.save();
    g.translate(ox, 0);
    g.fillStyle = "#101428";
    g.fillRect(W / 2 - 132, 48, 264, 154);
    g.fillStyle = "rgba(10,20,60,0.85)";
    g.fillRect(W / 2 - 130, 50, 260, 150);
    g.fillStyle = "#ffd23f";
    g.fillRect(W / 2 - 130, 50, 260, 2);
    g.fillStyle = "#e83838";
    g.fillRect(W / 2 - 130, 52, 260, 1);
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
    drawText(g, "SCORE", W / 2 - 110, y, "#ffd23f");
    drawText(g, String(game.score), W / 2 + 110, y, "#fff", { align: "right" });
    y += 16;
    if (t.done) {
      if (t.newRecord) drawText(g, "NEW RECORD!", W / 2, y, "#9fffb0", { align: "center" });
      if (Math.floor(game.frame / 30) % 2 === 0) drawText(g, game.levelIndex + 1 < game.levelCount ? "PRESS JUMP FOR NEXT ZONE" : "PRESS JUMP", W / 2, y + 14, "#fff", { align: "center" });
    }
    g.restore();
  }
}
