import * as C from "./constants";
import { groundAt } from "./level";
import type { Game, Particle, Player } from "./game";
import type { Decor, Loop } from "./types";

function makeChecker(a: string, b: string, size = 32): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size * 2;
  c.height = size * 2;
  const g = c.getContext("2d")!;
  g.fillStyle = a;
  g.fillRect(0, 0, size * 2, size * 2);
  g.fillStyle = b;
  g.fillRect(0, 0, size, size);
  g.fillRect(size, size, size, size);
  return c;
}

export class Renderer {
  private groundPattern: CanvasPattern | null = null;
  private loopPattern: CanvasPattern | null = null;
  private stonePattern: CanvasPattern | null = null;

  private ensurePatterns(ctx: CanvasRenderingContext2D) {
    if (this.groundPattern) return;
    this.groundPattern = ctx.createPattern(makeChecker("#8a5a2b", "#a3703a"), "repeat");
    this.loopPattern = ctx.createPattern(makeChecker("#5b4aa8", "#7461c4", 24), "repeat");
    this.stonePattern = ctx.createPattern(makeChecker("#6e6a80", "#7f7b92", 16), "repeat");
  }

  render(ctx: CanvasRenderingContext2D, game: Game) {
    this.ensurePatterns(ctx);
    const cam = game.camera;
    const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
    const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;

    ctx.save();
    this.drawBackground(ctx, game);

    ctx.translate(-Math.round(cam.x + shakeX), -Math.round(cam.y + shakeY));
    const x0 = cam.x - 80;
    const x1 = cam.x + C.VIEW_W + 80;

    this.drawDeepWater(ctx, game, x0, x1);
    for (const loop of game.level.loops) if (loop.cx + loop.r + 40 > x0 && loop.cx - loop.r - 40 < x1) this.drawLoop(ctx, loop);
    for (const d of game.level.decor) if (d.x > x0 - 100 && d.x < x1 + 100) this.drawDecor(ctx, d, game.frame);
    this.drawTerrain(ctx, game, x0, x1);
    this.drawPlatforms(ctx, game);

    for (const c of game.checkpoints) if (c.x > x0 && c.x < x1) this.drawCheckpoint(ctx, c.x, c.y, c.active, c.spin);
    this.drawGoal(ctx, game);
    for (const s of game.springs) if (s.x > x0 && s.x < x1) this.drawSpring(ctx, s.x, s.y, s.anim);
    for (const sp of game.level.spikes) if (sp.x + sp.w > x0 && sp.x < x1) this.drawSpikes(ctx, sp.x, sp.y, sp.w);
    for (const m of game.monitors) if (m.x > x0 && m.x < x1) this.drawMonitor(ctx, m.x, m.y, m.kind, m.broken, game.frame);

    for (const r of game.rings) {
      if (r.x < x0 || r.x > x1) continue;
      if (!r.collected) this.drawRing(ctx, r.x, r.y, game.frame);
      else if (r.sparkle > 0) this.drawRingSparkle(ctx, r.x, r.y, r.sparkle);
    }
    for (const r of game.scatter) {
      if (r.life > 200 && r.life % 2 === 0) continue;
      this.drawRing(ctx, r.x, r.y, game.frame + r.life * 2);
    }

    for (const e of game.enemies) {
      if (!e.alive || e.x < x0 || e.x > x1) continue;
      if (e.kind === "crawler") this.drawCrawler(ctx, e.x, e.y, e.dir, e.t);
      else this.drawBuzzer(ctx, e.x, e.y, e.dir, e.t);
    }

    this.drawPlayer(ctx, game);
    for (const p of game.particles) this.drawParticle(ctx, p);

    ctx.restore();
    this.drawHud(ctx, game);
  }

  // ------------------------------------------------------------------
  // Background
  // ------------------------------------------------------------------
  private drawBackground(ctx: CanvasRenderingContext2D, game: Game) {
    const cam = game.camera;
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#2f6fdc");
    sky.addColorStop(0.55, "#6fb3ff");
    sky.addColorStop(1, "#bfe6ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const py = -cam.y * 0.12;

    // sun
    ctx.fillStyle = "#fff4a8";
    ctx.beginPath();
    ctx.arc(780 - cam.x * 0.03, 90 + py * 0.5, 42, 0, Math.PI * 2);
    ctx.fill();

    // clouds
    const cloudOff = (cam.x * 0.12) % 1200;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const clouds = [
      [80, 70, 1],
      [340, 120, 1.3],
      [620, 60, 0.8],
      [900, 140, 1.1],
      [1100, 90, 0.9],
    ];
    for (let k = -1; k <= 1; k++) {
      for (const [cx, cy, s] of clouds) {
        const x = cx - cloudOff + k * 1200;
        const y = cy + py * 0.4;
        this.cloud(ctx, x, y, s);
      }
    }

    // distant mountains
    ctx.fillStyle = "#4b7bd1";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) {
      const wx = x + cam.x * 0.25;
      const y = 300 + py * 0.6 + Math.sin(wx * 0.004) * 40 + Math.sin(wx * 0.011) * 22 + Math.sin(wx * 0.023) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // ocean
    const oceanY = 360 + py * 0.7;
    const ocean = ctx.createLinearGradient(0, oceanY, 0, oceanY + 120);
    ocean.addColorStop(0, "#1f5fc8");
    ocean.addColorStop(1, "#2c8ff0");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, oceanY, W, H - oceanY);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let row = 0; row < 6; row++) {
      const y = oceanY + 14 + row * 16;
      const off = (cam.x * (0.3 + row * 0.05) + game.frame * (0.6 + row * 0.2)) % 80;
      ctx.beginPath();
      for (let x = -80; x < W + 80; x += 80) {
        ctx.moveTo(x - off, y);
        ctx.lineTo(x - off + 30 + row * 4, y);
      }
      ctx.stroke();
    }

    // near green hills with checker shading
    ctx.fillStyle = "#3f9f3a";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) {
      const wx = x + cam.x * 0.45;
      const y = 430 + py * 0.9 + Math.sin(wx * 0.006 + 1) * 30 + Math.sin(wx * 0.017) * 14;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  private cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    ctx.beginPath();
    ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 26 * s, y - 10 * s, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 56 * s, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 28 * s, y + 8 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ------------------------------------------------------------------
  // Terrain
  // ------------------------------------------------------------------
  /** Water that is only visible through pits in the terrain. */
  private drawDeepWater(ctx: CanvasRenderingContext2D, game: Game, x0: number, x1: number) {
    const top = game.level.height - 140;
    const grad = ctx.createLinearGradient(0, top, 0, game.level.height + 200);
    grad.addColorStop(0, "#1b4fb8");
    grad.addColorStop(1, "#071a4a");
    ctx.fillStyle = grad;
    ctx.fillRect(x0, top, x1 - x0, game.level.height + 200 - top);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const off = (game.frame * 0.8) % 48;
    for (let x = Math.floor(x0 / 48) * 48 - 48; x < x1 + 48; x += 48) {
      ctx.moveTo(x + off, top + 2 + Math.sin((x + game.frame) * 0.05) * 2);
      ctx.lineTo(x + off + 22, top + 2 + Math.sin((x + game.frame) * 0.05) * 2);
    }
    ctx.stroke();
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, game: Game, x0: number, x1: number) {
    const L = game.level;
    const bottom = L.height + 200;
    const step = 8;
    const runs: { x: number; y: number }[][] = [];
    let run: { x: number; y: number }[] = [];
    for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
      const y = groundAt(L, x);
      if (y === null) {
        if (run.length) runs.push(run);
        run = [];
      } else run.push({ x, y });
    }
    if (run.length) runs.push(run);

    for (const pts of runs) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, bottom);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(pts[pts.length - 1].x, bottom);
      ctx.closePath();
      ctx.fillStyle = this.groundPattern!;
      ctx.fill();

      // dirt shade band just below the grass
      ctx.strokeStyle = "rgba(60,30,10,0.35)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y + 18);
        else ctx.lineTo(pts[i].x, pts[i].y + 18);
      }
      ctx.stroke();

      // grass
      ctx.lineCap = "round";
      ctx.strokeStyle = "#2f9e33";
      ctx.lineWidth = 16;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y + 4);
        else ctx.lineTo(pts[i].x, pts[i].y + 4);
      }
      ctx.stroke();
      ctx.strokeStyle = "#5fd35a";
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y - 1);
        else ctx.lineTo(pts[i].x, pts[i].y - 1);
      }
      ctx.stroke();
      ctx.lineCap = "butt";
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, game: Game) {
    for (const p of game.platforms) {
      if (p.px + p.w < game.camera.x - 50 || p.px > game.camera.x + C.VIEW_W + 50) continue;
      if (p.solid) {
        ctx.fillStyle = this.stonePattern!;
        ctx.fillRect(p.px, p.py, p.w, p.h);
        ctx.strokeStyle = "#3d3a4d";
        ctx.lineWidth = 3;
        ctx.strokeRect(p.px + 1.5, p.py + 1.5, p.w - 3, p.h - 3);
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(p.px, p.py, p.w, 4);
      } else {
        ctx.fillStyle = this.groundPattern!;
        ctx.fillRect(p.px, p.py, p.w, p.h);
        ctx.fillStyle = "#2f9e33";
        ctx.fillRect(p.px - 3, p.py - 4, p.w + 6, 12);
        ctx.fillStyle = "#5fd35a";
        ctx.fillRect(p.px - 3, p.py - 4, p.w + 6, 4);
        ctx.fillStyle = "#5a3a1a";
        ctx.fillRect(p.px, p.py + p.h - 4, p.w, 4);
      }
    }
  }

  private drawLoop(ctx: CanvasRenderingContext2D, loop: Loop) {
    const outer = loop.r + 30;
    ctx.beginPath();
    ctx.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    ctx.arc(loop.cx, loop.cy, loop.r, 0, Math.PI * 2, true);
    ctx.fillStyle = this.loopPattern!;
    ctx.fill();
    ctx.strokeStyle = "#2e2360";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(loop.cx, loop.cy, outer, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#c9c1ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(loop.cx, loop.cy, loop.r + 2, 0, Math.PI * 2);
    ctx.stroke();
    // support posts
    ctx.fillStyle = "#3b2f78";
    ctx.fillRect(loop.cx - outer + 6, loop.cy, 14, loop.r + 30);
    ctx.fillRect(loop.cx + outer - 20, loop.cy, 14, loop.r + 30);
  }

  private drawDecor(ctx: CanvasRenderingContext2D, d: Decor, frame: number) {
    const s = d.scale ?? 1;
    switch (d.kind) {
      case "palm": {
        ctx.strokeStyle = "#7a4a1e";
        ctx.lineWidth = 12 * s;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(d.x, d.y + 4);
        ctx.quadraticCurveTo(d.x + 18 * s, d.y - 70 * s, d.x + 8 * s, d.y - 130 * s);
        ctx.stroke();
        ctx.strokeStyle = "#a86a2e";
        ctx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
          const t = i / 6;
          const px = d.x + (18 * s * 2 * t * (1 - t)) + 8 * s * t * t;
          const py = d.y + 4 - (d.y + 4 - (d.y - 130 * s)) * t;
          ctx.beginPath();
          ctx.moveTo(px - 5 * s, py);
          ctx.lineTo(px + 5 * s, py);
          ctx.stroke();
        }
        const tx = d.x + 8 * s;
        const ty = d.y - 130 * s;
        ctx.strokeStyle = "#2e9d3a";
        ctx.lineWidth = 9 * s;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI * 0.95 + (i / 5) * Math.PI * 0.9 + Math.sin(frame * 0.02 + i) * 0.04;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.quadraticCurveTo(tx + Math.cos(a) * 45 * s, ty + Math.sin(a) * 45 * s - 20 * s, tx + Math.cos(a) * 70 * s, ty + Math.sin(a) * 70 * s + 25 * s);
          ctx.stroke();
        }
        ctx.fillStyle = "#6b3f14";
        ctx.beginPath();
        ctx.arc(tx - 6 * s, ty + 8 * s, 6 * s, 0, Math.PI * 2);
        ctx.arc(tx + 7 * s, ty + 9 * s, 6 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineCap = "butt";
        break;
      }
      case "bush": {
        ctx.fillStyle = "#2e9d3a";
        ctx.beginPath();
        ctx.arc(d.x - 16, d.y - 10, 16, 0, Math.PI * 2);
        ctx.arc(d.x + 2, d.y - 20, 20, 0, Math.PI * 2);
        ctx.arc(d.x + 20, d.y - 10, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5fd35a";
        ctx.beginPath();
        ctx.arc(d.x - 2, d.y - 24, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "flower": {
        ctx.strokeStyle = "#2e9d3a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x, d.y - 40);
        ctx.stroke();
        const rot = frame * 0.03 + d.x;
        ctx.fillStyle = "#ffd23f";
        for (let i = 0; i < 8; i++) {
          const a = rot + (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(d.x + Math.cos(a) * 10, d.y - 44 + Math.sin(a) * 10, 7, 4, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#e8442f";
        ctx.beginPath();
        ctx.arc(d.x, d.y - 44, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "totem": {
        ctx.fillStyle = "#8a5a2b";
        ctx.fillRect(d.x - 14, d.y - 96, 28, 100);
        ctx.fillStyle = "#5b3a16";
        for (let i = 0; i < 3; i++) {
          const y = d.y - 88 + i * 30;
          ctx.fillRect(d.x - 10, y, 8, 6);
          ctx.fillRect(d.x + 2, y, 8, 6);
          ctx.fillRect(d.x - 8, y + 12, 16, 4);
        }
        ctx.fillStyle = "#c78b4e";
        ctx.fillRect(d.x - 18, d.y - 100, 36, 6);
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // Objects
  // ------------------------------------------------------------------
  private drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
    const sx = Math.abs(Math.cos(frame * 0.12 + x * 0.02));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(Math.max(0.15, sx), 1);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#f5b400";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#fff0a0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 8, -2.4, -0.8);
    ctx.stroke();
    ctx.restore();
  }

  private drawRingSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
    const r = (16 - t) * 1.2 + 4;
    ctx.strokeStyle = `rgba(255,240,150,${t / 16})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.stroke();
  }

  private drawSpring(ctx: CanvasRenderingContext2D, x: number, y: number, anim: number) {
    const ext = anim > 0 ? 14 : 0;
    ctx.fillStyle = "#c62828";
    ctx.fillRect(x - 16, y + 4, 32, 12);
    ctx.fillStyle = "#8d1a1a";
    ctx.fillRect(x - 16, y + 12, 32, 4);
    ctx.strokeStyle = "#cfcfcf";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const yy = y + 2 - (i * (ext + 2)) / 2;
      ctx.moveTo(x - 10, yy);
      ctx.lineTo(x + 10, yy - 2);
    }
    ctx.stroke();
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(x - 16, y - 6 - ext, 32, 8);
    ctx.fillStyle = "#fff3a6";
    ctx.fillRect(x - 16, y - 6 - ext, 32, 3);
  }

  private drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
    for (let sx = x; sx < x + w; sx += 16) {
      ctx.fillStyle = "#9aa0ad";
      ctx.beginPath();
      ctx.moveTo(sx, y + 18);
      ctx.lineTo(sx + 8, y);
      ctx.lineTo(sx + 16, y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e6e9f0";
      ctx.beginPath();
      ctx.moveTo(sx + 2, y + 18);
      ctx.lineTo(sx + 8, y + 2);
      ctx.lineTo(sx + 8, y + 18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#4b4f5c";
    ctx.fillRect(x, y + 16, w, 5);
  }

  private drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, kind: string, broken: boolean, frame: number) {
    if (broken) {
      ctx.fillStyle = "#6c6f7c";
      ctx.fillRect(x - 16, y - 8, 32, 8);
      return;
    }
    ctx.fillStyle = "#6c6f7c";
    ctx.fillRect(x - 16, y - 32, 32, 32);
    ctx.fillStyle = "#3c3f4a";
    ctx.fillRect(x - 14, y - 30, 28, 22);
    ctx.fillStyle = "#1c3f7a";
    ctx.fillRect(x - 12, y - 28, 24, 18);
    if (frame % 40 < 20) {
      if (kind === "ring") this.drawRing(ctx, x, y - 19, 0);
      else if (kind === "shield") {
        ctx.strokeStyle = "#7fd4ff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - 19, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#1f5fe0";
        ctx.beginPath();
        ctx.arc(x, y - 19, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x + 2, y - 21, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#4b4f5c";
    ctx.fillRect(x - 12, y - 8, 24, 8);
  }

  private drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean, spin: number) {
    ctx.fillStyle = "#9aa0ad";
    ctx.fillRect(x - 3, y - 64, 6, 64);
    ctx.fillStyle = "#4b4f5c";
    ctx.fillRect(x - 8, y - 4, 16, 4);
    const wobble = active && spin < 18 ? Math.sin(spin * 2) * 10 : 0;
    ctx.fillStyle = active ? "#e53935" : "#1f5fe0";
    ctx.beginPath();
    ctx.arc(x + wobble, y - 70, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + wobble - 3, y - 73, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGoal(ctx: CanvasRenderingContext2D, game: Game) {
    const g = game.level.goal;
    if (g.x < game.camera.x - 100 || g.x > game.camera.x + C.VIEW_W + 100) return;
    ctx.fillStyle = "#9aa0ad";
    ctx.fillRect(g.x - 3, g.y - 80, 6, 80);
    ctx.fillStyle = "#4b4f5c";
    ctx.fillRect(g.x - 10, g.y - 4, 20, 4);
    const spin = game.goalSpin;
    const sx = spin > 0 && spin < 150 ? Math.cos(spin * 0.35) : 1;
    const showHero = spin >= 150 || (spin > 0 && Math.cos(spin * 0.35) < 0);
    ctx.save();
    ctx.translate(g.x, g.y - 100);
    ctx.scale(Math.max(0.08, Math.abs(sx)), 1);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(-32, -22, 64, 44);
    ctx.fillStyle = "#c98f00";
    ctx.fillRect(-32, 18, 64, 4);
    if (showHero) {
      ctx.fillStyle = "#1f5fe0";
      ctx.beginPath();
      ctx.arc(0, -2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(5, -6, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a7f2e";
      ctx.beginPath();
      ctx.arc(6, -6, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(-16, -16, 32, 28);
      ctx.fillStyle = "#f5c6a0";
      ctx.fillRect(-12, -10, 24, 12);
      ctx.fillStyle = "#222";
      ctx.fillRect(-10, -8, 6, 4);
      ctx.fillRect(4, -8, 6, 4);
      ctx.fillRect(-12, 2, 24, 6);
    }
    ctx.restore();
  }

  private drawCrawler(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-8, -8, 9, 0, Math.PI * 2);
    ctx.arc(10, -8, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 2;
    for (const wx of [-8, 10]) {
      ctx.beginPath();
      ctx.moveTo(wx + Math.cos(t * 0.3) * 7, -8 + Math.sin(t * 0.3) * 7);
      ctx.lineTo(wx - Math.cos(t * 0.3) * 7, -8 - Math.sin(t * 0.3) * 7);
      ctx.stroke();
    }
    ctx.fillStyle = "#e53935";
    ctx.beginPath();
    ctx.ellipse(0, -18, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a80";
    ctx.beginPath();
    ctx.ellipse(-4, -24, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(14, -20, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(16, -20, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, -28);
    ctx.lineTo(22, -38 + Math.sin(t * 0.2) * 3);
    ctx.stroke();
    ctx.restore();
  }

  private drawBuzzer(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
    ctx.save();
    ctx.translate(x, y - 12);
    ctx.scale(dir, 1);
    const flap = Math.sin(t * 0.8) * 0.5;
    ctx.fillStyle = "rgba(220,240,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(-4, -12, 14, 6, -0.4 + flap, 0, Math.PI * 2);
    ctx.ellipse(-4, -12, 14, 6, 0.4 - flap, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffca28";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.fillRect(-12, -10, 6, 20);
    ctx.fillRect(-2, -11, 6, 22);
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(-30, 6);
    ctx.lineTo(-20, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(12, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(14, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------
  private drawPlayer(ctx: CanvasRenderingContext2D, game: Game) {
    const pl = game.player;
    if (pl.invuln > 0 && game.phase === "playing" && Math.floor(pl.invuln / 3) % 2 === 0) return;
    ctx.save();
    ctx.translate(pl.x, pl.y);
    if (pl.shield) {
      ctx.fillStyle = `rgba(120,200,255,${0.25 + Math.sin(game.frame * 0.3) * 0.08})`;
      ctx.strokeStyle = "rgba(200,240,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.rotate(pl.drawAngle);
    ctx.scale(pl.facing, 1);

    const dying = game.phase === "dying";
    if (pl.rolling && !dying) this.drawBall(ctx, pl);
    else this.drawStanding(ctx, pl, game, dying);
    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, pl: Player) {
    const r = 15;
    ctx.save();
    ctx.rotate(pl.runPhase * pl.facing * 1.4);
    ctx.fillStyle = "#1f5fe0";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1240a0";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, r - 4, a, a + 0.7);
      ctx.stroke();
    }
    ctx.fillStyle = "#f5d3a3";
    ctx.beginPath();
    ctx.arc(4, 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // spin trail highlight
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, -2.2, -1.2);
    ctx.stroke();
  }

  private drawStanding(ctx: CanvasRenderingContext2D, pl: Player, game: Game, dying: boolean) {
    const speed = Math.abs(pl.gsp);
    const running = pl.onGround && speed > 0.3;
    const crouch = pl.crouching;
    const bodyY = crouch ? 6 : 0;

    // legs
    const swing = running ? Math.sin(pl.runPhase * 2) : 0;
    const legLen = crouch ? 8 : 14;
    if (running && speed > 9) {
      // super-fast leg blur
      ctx.fillStyle = "#e53935";
      ctx.beginPath();
      ctx.ellipse(0, 14, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(31,95,224,0.7)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-6, 4);
      ctx.lineTo(-10, 14);
      ctx.moveTo(6, 4);
      ctx.lineTo(10, 14);
      ctx.stroke();
    } else {
      const legs: [number, number][] = [
        [-5 + swing * 8, legLen - Math.abs(swing) * 4],
        [5 - swing * 8, legLen - Math.abs(swing) * 4],
      ];
      if (!pl.onGround && !dying) {
        legs[0] = [-6, 10];
        legs[1] = [6, 14];
      }
      for (const [lx, ly] of legs) {
        ctx.strokeStyle = "#1f5fe0";
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(lx * 0.4, 4 + bodyY);
        ctx.lineTo(lx, 4 + ly);
        ctx.stroke();
        ctx.fillStyle = "#e53935";
        ctx.beginPath();
        ctx.ellipse(lx + 3, 6 + ly, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(lx - 2, 3 + ly, 8, 3);
      }
    }

    // back spikes
    ctx.fillStyle = "#1f5fe0";
    const lean = running ? Math.min(speed / 12, 1) * 0.35 : 0;
    for (let i = 0; i < 3; i++) {
      const sy = -12 + i * 8 + bodyY;
      ctx.beginPath();
      ctx.moveTo(-8, sy - 4);
      ctx.lineTo(-30 - (running ? 6 : 0), sy + 6 + i * 3 + lean * 10);
      ctx.lineTo(-6, sy + 6);
      ctx.closePath();
      ctx.fill();
    }
    // head/body
    ctx.beginPath();
    ctx.arc(0, -4 + bodyY, 17, 0, Math.PI * 2);
    ctx.fill();
    // belly
    ctx.fillStyle = "#f5d3a3";
    ctx.beginPath();
    ctx.ellipse(3, 4 + bodyY, 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    // muzzle
    ctx.beginPath();
    ctx.ellipse(10, -1 + bodyY, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // ear
    ctx.fillStyle = "#1f5fe0";
    ctx.beginPath();
    ctx.moveTo(-4, -18 + bodyY);
    ctx.lineTo(-2, -28 + bodyY);
    ctx.lineTo(6, -18 + bodyY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f5d3a3";
    ctx.beginPath();
    ctx.moveTo(-2, -19 + bodyY);
    ctx.lineTo(-1, -25 + bodyY);
    ctx.lineTo(4, -19 + bodyY);
    ctx.closePath();
    ctx.fill();
    // eyes
    const lookUp = pl.lookingUp ? -3 : 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(8, -9 + bodyY + lookUp, 6, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    if (dying) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, -12 + bodyY);
      ctx.lineTo(11, -6 + bodyY);
      ctx.moveTo(11, -12 + bodyY);
      ctx.lineTo(5, -6 + bodyY);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#1a7f2e";
      ctx.beginPath();
      ctx.ellipse(10, -8 + bodyY + lookUp, 2.6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(11, -10 + bodyY + lookUp, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    // nose
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(17, -3 + bodyY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // mouth
    if (pl.idle > 240 && Math.floor(game.frame / 30) % 2 === 0) {
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(12, 2 + bodyY, 3, 0, Math.PI);
      ctx.stroke();
    }
    // arm
    ctx.strokeStyle = "#f5d3a3";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (pl.hurt || dying) {
      ctx.moveTo(4, 0 + bodyY);
      ctx.lineTo(16, -12 + bodyY);
    } else if (!pl.onGround) {
      ctx.moveTo(4, 0 + bodyY);
      ctx.lineTo(14, 8 + bodyY);
    } else if (running) {
      ctx.moveTo(2, 2 + bodyY);
      ctx.lineTo(12 + swing * 6, 6 + bodyY - swing * 6);
    } else {
      ctx.moveTo(4, 2 + bodyY);
      ctx.lineTo(10, 10 + bodyY);
    }
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(pl.hurt || dying ? 17 : !pl.onGround ? 15 : running ? 13 + swing * 6 : 11, pl.hurt || dying ? -13 + bodyY : !pl.onGround ? 9 + bodyY : running ? 6 + bodyY - swing * 6 : 11 + bodyY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "butt";
  }

  // ------------------------------------------------------------------
  // Particles
  // ------------------------------------------------------------------
  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    const t = p.life / p.maxLife;
    switch (p.kind) {
      case "dust":
      case "smoke":
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - t)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.6 + t), 0, Math.PI * 2);
        ctx.fill();
        break;
      case "spark":
        ctx.fillStyle = `rgba(255,236,120,${1 - t})`;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        break;
      case "pop":
        ctx.fillStyle = t < 0.5 ? "#fff" : "#ffb300";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t), 0, Math.PI * 2);
        ctx.fill();
        break;
      case "star": {
        ctx.fillStyle = `rgba(255,255,255,${1 - t})`;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const b = a + Math.PI / 5;
          ctx.lineTo(p.x + Math.cos(a) * 5, p.y + Math.sin(a) * 5);
          ctx.lineTo(p.x + Math.cos(b) * 2, p.y + Math.sin(b) * 2);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "shieldpop":
        ctx.strokeStyle = `rgba(120,200,255,${1 - t})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + t * 30, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "text":
        this.text(ctx, p.text ?? "", p.x, p.y, 14, "#fff", "center", `rgba(0,0,0,${1 - t})`);
        break;
    }
  }

  // ------------------------------------------------------------------
  // HUD & overlays
  // ------------------------------------------------------------------
  private text(
    ctx: CanvasRenderingContext2D,
    str: string,
    x: number,
    y: number,
    size: number,
    color: string,
    align: CanvasTextAlign = "left",
    outline = "#000",
  ) {
    ctx.font = `bold ${size}px "Courier New", Courier, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size / 5);
    ctx.strokeStyle = outline;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  private drawHud(ctx: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const label = "#ffd23f";

    if (game.phase !== "title") {
      this.text(ctx, "SCORE", 24, 30, 20, label);
      this.text(ctx, String(game.score).padStart(7, " "), 200, 30, 20, "#fff", "right");
      this.text(ctx, "TIME", 24, 60, 20, label);
      this.text(ctx, game.timeString, 200, 60, 20, "#fff", "right");
      const ringsRed = game.ringCount === 0 && Math.floor(game.frame / 8) % 2 === 0;
      this.text(ctx, "RINGS", 24, 90, 20, ringsRed ? "#ff5252" : label);
      this.text(ctx, String(game.ringCount).padStart(3, " "), 200, 90, 20, "#fff", "right");

      // lives
      ctx.save();
      ctx.translate(34, H - 30);
      ctx.fillStyle = "#1f5fe0";
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(4, -3, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.text(ctx, `x ${Math.max(0, game.lives)}`, 54, H - 30, 20, "#fff");
    }

    if (game.messageTimer > 0 && game.phase === "playing") {
      const a = Math.min(1, game.messageTimer / 20);
      ctx.globalAlpha = a;
      this.text(ctx, game.message, W / 2, 150, 30, "#fff", "center");
      ctx.globalAlpha = 1;
    } else if (game.messageTimer > 0 && game.phase !== "title") {
      this.text(ctx, game.message, W / 2, 150, 24, "#fff", "center");
    }

    switch (game.phase) {
      case "title":
        this.drawTitle(ctx, game);
        break;
      case "paused":
        this.dim(ctx, 0.45);
        this.text(ctx, "PAUSED", W / 2, H / 2 - 20, 40, "#fff", "center");
        this.text(ctx, "PRESS P TO RESUME", W / 2, H / 2 + 24, 18, "#ffd23f", "center");
        break;
      case "gameover":
        this.dim(ctx, 0.55);
        this.text(ctx, "GAME OVER", W / 2, H / 2 - 20, 48, "#ff5252", "center");
        if (game.deathTimer > 60 && Math.floor(game.frame / 30) % 2 === 0) this.text(ctx, "PRESS JUMP", W / 2, H / 2 + 36, 20, "#fff", "center");
        break;
      case "clear":
        if (game.tally.visible) this.drawResults(ctx, game);
        break;
    }
  }

  private dim(ctx: CanvasRenderingContext2D, a: number) {
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  private drawTitle(ctx: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    this.dim(ctx, 0.35);
    const t = game.titleTimer;
    const bob = Math.sin(t * 0.05) * 6;
    // emblem
    ctx.save();
    ctx.translate(W / 2, 150 + bob);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.ellipse(0, 0, 250, 70, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f5fe0";
    ctx.beginPath();
    ctx.ellipse(0, 0, 240, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.text(ctx, "SPIN RUSH", W / 2, 150 + bob, 64, "#fff", "center", "#0b2a6f");
    this.text(ctx, "A SONIC-STYLE SPEED PLATFORMER", W / 2, 215 + bob, 16, "#ffd23f", "center");

    // hero
    ctx.save();
    ctx.translate(W / 2, 310);
    ctx.scale(2, 2);
    const fake: Player = { ...game.player, onGround: true, gsp: 0, rolling: false, crouching: false, lookingUp: false, hurt: false, idle: 0, drawAngle: 0, facing: 1, runPhase: 0, shield: false, invuln: 0 };
    ctx.rotate(0);
    this.drawStanding(ctx, fake, game, false);
    ctx.restore();

    if (Math.floor(t / 30) % 2 === 0) this.text(ctx, "PRESS SPACE / TAP TO START", W / 2, 400, 22, "#fff", "center");
    this.text(ctx, "ARROWS/WASD MOVE   SPACE JUMP   DOWN ROLL   DOWN+JUMP SPINDASH", W / 2, 455, 13, "#cfe3ff", "center");
    this.text(ctx, "P PAUSE   R RESTART   M SOUND   N MUSIC", W / 2, 478, 13, "#cfe3ff", "center");
    this.text(ctx, `${game.level.name}  ZONE  ACT ${game.level.act}`, W / 2, 515, 14, "#ffd23f", "center");
  }

  private drawResults(ctx: CanvasRenderingContext2D, game: Game) {
    const W = C.VIEW_W;
    const t = game.tally;
    const slide = Math.min(1, (game.clearTimer - 150) / 30);
    const ox = (1 - slide) * -W;
    ctx.save();
    ctx.translate(ox, 0);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(W / 2 - 300, 120, 600, 300);
    this.text(ctx, "ZIP GOT THROUGH", W / 2, 160, 30, "#ffd23f", "center");
    this.text(ctx, `ACT ${game.level.act}`, W / 2, 200, 30, "#fff", "center");
    this.text(ctx, "TIME BONUS", W / 2 - 220, 260, 22, "#ffd23f");
    this.text(ctx, String(t.remainingTime), W / 2 + 230, 260, 22, "#fff", "right");
    this.text(ctx, "RING BONUS", W / 2 - 220, 300, 22, "#ffd23f");
    this.text(ctx, String(t.remainingRing), W / 2 + 230, 300, 22, "#fff", "right");
    this.text(ctx, "SCORE", W / 2 - 220, 360, 26, "#ffd23f");
    this.text(ctx, String(game.score), W / 2 + 230, 360, 26, "#fff", "right");
    if (t.done && Math.floor(game.frame / 30) % 2 === 0) this.text(ctx, "PRESS JUMP TO CONTINUE", W / 2, 400, 18, "#fff", "center");
    ctx.restore();
  }
}
