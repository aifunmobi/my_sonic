import * as C from "./constants";
import { formatTime, groundAngle, groundAt, timeBonus } from "./level";
import type { GameAudio } from "./audio";
import type { InputState } from "./input";
import type { Checkpoint, EnemyKind, LevelData, Loop, Monitor, MonitorKind, Platform, Spring } from "./types";

export type Phase = "title" | "playing" | "paused" | "dying" | "clear" | "gameover";

export interface Player {
  x: number;
  y: number;
  prevX: number;
  xsp: number;
  ysp: number;
  gsp: number;
  onGround: boolean;
  angle: number;
  drawAngle: number;
  rolling: boolean;
  jumping: boolean;
  spindash: number; // -1 when not charging, else charge amount 0..8
  facing: 1 | -1;
  invuln: number;
  hurt: boolean;
  loop: { loop: Loop; theta: number } | null;
  shield: boolean;
  runPhase: number;
  skidding: boolean;
  crouching: boolean;
  lookingUp: boolean;
  standingOn: PlatformEnt | null;
  springTimer: number;
  idle: number;
}

export interface RingEnt {
  x: number;
  y: number;
  collected: boolean;
  sparkle: number;
}

export interface ScatterRing {
  x: number;
  y: number;
  xsp: number;
  ysp: number;
  life: number;
}

export interface EnemyEnt {
  kind: EnemyKind;
  x: number;
  y: number;
  x0: number;
  y0: number;
  range: number;
  dir: 1 | -1;
  alive: boolean;
  t: number;
  w: number;
  h: number;
}

export interface PlatformEnt extends Platform {
  px: number;
  py: number;
  prevPx: number;
  prevPy: number;
}

export interface MonitorEnt extends Monitor {
  broken: boolean;
  breakTimer: number;
}

export interface CheckpointEnt extends Checkpoint {
  active: boolean;
  spin: number;
}

export interface SpringEnt extends Spring {
  anim: number;
}

export type ParticleKind = "dust" | "spark" | "smoke" | "pop" | "text" | "shieldpop" | "star";

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  xsp: number;
  ysp: number;
  life: number;
  maxLife: number;
  size: number;
  text?: string;
  gravity?: number;
}

export interface Camera {
  x: number;
  y: number;
}

export interface Tally {
  timeBonus: number;
  ringBonus: number;
  remainingTime: number;
  remainingRing: number;
  done: boolean;
  visible: boolean;
}

export class Game {
  level: LevelData;
  audio: GameAudio;
  phase: Phase = "title";
  player: Player;
  rings: RingEnt[] = [];
  scatter: ScatterRing[] = [];
  enemies: EnemyEnt[] = [];
  platforms: PlatformEnt[] = [];
  monitors: MonitorEnt[] = [];
  checkpoints: CheckpointEnt[] = [];
  springs: SpringEnt[] = [];
  particles: Particle[] = [];
  camera: Camera = { x: 0, y: 0 };
  score = 0;
  lives = C.START_LIVES;
  ringCount = 0;
  time = 0;
  frame = 0;
  respawn: { x: number; y: number; time: number };
  deathTimer = 0;
  clearTimer = 0;
  goalSpin = 0;
  goalPassed = false;
  tally: Tally = { timeBonus: 0, ringBonus: 0, remainingTime: 0, remainingRing: 0, done: false, visible: false };
  titleTimer = 0;
  message = "";
  messageTimer = 0;
  lastLifeThreshold = 0;
  shake = 0;

  constructor(level: LevelData, audio: GameAudio) {
    this.level = level;
    this.audio = audio;
    this.respawn = { x: level.start.x, y: level.start.y, time: 0 };
    this.player = this.makePlayer(level.start.x, level.start.y);
    this.buildEntities();
  }

  private makePlayer(x: number, y: number): Player {
    return {
      x,
      y,
      prevX: x,
      xsp: 0,
      ysp: 0,
      gsp: 0,
      onGround: false,
      angle: 0,
      drawAngle: 0,
      rolling: false,
      jumping: false,
      spindash: -1,
      facing: 1,
      invuln: 0,
      hurt: false,
      loop: null,
      shield: false,
      runPhase: 0,
      skidding: false,
      crouching: false,
      lookingUp: false,
      standingOn: null,
      springTimer: 0,
      idle: 0,
    };
  }

  private buildEntities() {
    const L = this.level;
    this.rings = L.rings.map((r) => ({ x: r.x, y: r.y, collected: false, sparkle: 0 }));
    this.platforms = L.platforms.map((p) => ({ ...p, px: p.x, py: p.y, prevPx: p.x, prevPy: p.y }));
    this.monitors = L.monitors.map((m) => ({ ...m, broken: false, breakTimer: 0 }));
    this.checkpoints = L.checkpoints.map((c) => ({ ...c, active: false, spin: 0 }));
    this.springs = L.springs.map((s) => ({ ...s, anim: 0 }));
    this.spawnEnemies();
  }

  private spawnEnemies() {
    this.enemies = this.level.enemies.map((e) => ({
      kind: e.kind,
      x: e.x,
      y: e.y,
      x0: e.x,
      y0: e.y,
      range: e.range,
      dir: 1,
      alive: true,
      t: 0,
      w: e.kind === "crawler" ? 44 : 40,
      h: e.kind === "crawler" ? 30 : 26,
    }));
  }

  /** Full restart: new game from the title screen. */
  newGame() {
    this.score = 0;
    this.lives = C.START_LIVES;
    this.ringCount = 0;
    this.time = 0;
    this.lastLifeThreshold = 0;
    this.respawn = { x: this.level.start.x, y: this.level.start.y, time: 0 };
    this.buildEntities();
    this.scatter = [];
    this.particles = [];
    this.goalPassed = false;
    this.goalSpin = 0;
    this.clearTimer = 0;
    this.tally = { timeBonus: 0, ringBonus: 0, remainingTime: 0, remainingRing: 0, done: false, visible: false };
    this.player = this.makePlayer(this.level.start.x, this.level.start.y);
    this.snapCamera();
    this.phase = "playing";
    this.showMessage(`${this.level.name}  ACT ${this.level.act}`, 150);
    this.audio.startMusic();
  }

  private respawnPlayer() {
    this.player = this.makePlayer(this.respawn.x, this.respawn.y);
    this.time = this.respawn.time;
    this.ringCount = 0;
    this.scatter = [];
    this.particles = [];
    this.spawnEnemies();
    this.deathTimer = 0;
    this.snapCamera();
    this.phase = "playing";
    this.audio.startMusic();
  }

  private snapCamera() {
    this.camera.x = this.player.x - C.VIEW_W / 2;
    this.camera.y = this.player.y - C.VIEW_H * 0.55;
    this.clampCamera();
  }

  private clampCamera() {
    const maxX = this.goalPassed ? Math.min(this.level.width - C.VIEW_W, this.level.goal.x + 260 - C.VIEW_W / 2) : this.level.width - C.VIEW_W;
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(this.level.height - C.VIEW_H, this.camera.y));
  }

  showMessage(text: string, frames: number) {
    this.message = text;
    this.messageTimer = frames;
  }

  // ------------------------------------------------------------------
  // Main step
  // ------------------------------------------------------------------
  step(input: InputState) {
    this.frame++;
    if (this.messageTimer > 0) this.messageTimer--;
    if (this.shake > 0) this.shake--;

    if (input.mutePressed) {
      this.audio.setMuted(!this.audio.muted);
      this.showMessage(this.audio.muted ? "SOUND OFF" : "SOUND ON", 60);
    }
    if (input.musicPressed) {
      const on = this.audio.toggleMusic();
      this.showMessage(on ? "MUSIC ON" : "MUSIC OFF", 60);
    }

    switch (this.phase) {
      case "title":
        this.titleTimer++;
        if (input.startPressed) this.newGame();
        break;
      case "playing":
        if (input.pausePressed) {
          this.phase = "paused";
          this.audio.stopMusic();
          return;
        }
        if (input.restartPressed) {
          this.audio.stopMusic();
          this.newGame();
          return;
        }
        this.updatePlaying(input);
        break;
      case "paused":
        if (input.pausePressed || input.startPressed) {
          this.phase = "playing";
          this.audio.startMusic();
        }
        break;
      case "dying":
        this.updateDying();
        break;
      case "clear":
        this.updateClear(input);
        break;
      case "gameover":
        this.deathTimer++;
        if (this.deathTimer > 60 && input.startPressed) {
          this.phase = "title";
          this.titleTimer = 0;
        }
        break;
    }
  }

  // ------------------------------------------------------------------
  // Playing
  // ------------------------------------------------------------------
  private updatePlaying(input: InputState) {
    if (this.time < 59 * 60 + 59 * 60 * 60) this.time++;
    this.updatePlatforms();
    this.updatePlayer(input);
    this.updateCollisions();
    this.updateEnemies();
    this.updateScatterRings();
    this.updateParticles();
    this.updateCamera();

    if (this.player.y - C.PLAYER_HALF_H > this.level.height + 40) this.die();
  }

  private updatePlatforms() {
    for (const p of this.platforms) {
      p.prevPx = p.px;
      p.prevPy = p.py;
      if (p.move) {
        const t = ((this.frame + (p.move.phase ?? 0)) / p.move.period) * Math.PI * 2;
        p.px = p.x + Math.sin(t) * p.move.dx;
        p.py = p.y + Math.sin(t) * p.move.dy;
      }
    }
    const pl = this.player;
    if (pl.standingOn && pl.onGround) {
      pl.x += pl.standingOn.px - pl.standingOn.prevPx;
      pl.y += pl.standingOn.py - pl.standingOn.prevPy;
    }
  }

  private halfH(): number {
    return this.player.rolling ? C.PLAYER_ROLL_HALF_H : C.PLAYER_HALF_H;
  }

  private setRolling(on: boolean) {
    const pl = this.player;
    if (pl.rolling === on) return;
    // keep feet planted when the hitbox height changes
    if (pl.onGround) pl.y += on ? C.PLAYER_HALF_H - C.PLAYER_ROLL_HALF_H : C.PLAYER_ROLL_HALF_H - C.PLAYER_HALF_H;
    pl.rolling = on;
  }

  private updatePlayer(input: InputState) {
    const pl = this.player;
    pl.prevX = pl.x;
    if (pl.invuln > 0) pl.invuln--;
    if (pl.springTimer > 0) pl.springTimer--;
    pl.skidding = false;
    pl.crouching = false;
    pl.lookingUp = false;

    const lockedInput = this.goalPassed || pl.hurt;
    const left = !lockedInput && input.left;
    const right = (!lockedInput && input.right) || (this.goalPassed && this.clearTimer < 120);
    const down = !lockedInput && input.down;
    const up = !lockedInput && input.up;
    const jumpHeld = !lockedInput && input.jump;
    const jumpPressed = !lockedInput && input.jumpPressed;

    if (pl.loop) {
      this.updateLoop(left, right);
      this.updateDrawAngle();
      return;
    }

    if (pl.onGround) {
      // ---- Spindash ----
      if (pl.spindash >= 0) {
        if (jumpPressed) {
          pl.spindash = Math.min(C.SPINDASH_MAX_CHARGE, pl.spindash + 2);
          this.audio.spindashCharge(pl.spindash);
          this.emitSmoke(pl.x - pl.facing * 20, pl.y + 10, -pl.facing);
        }
        pl.spindash -= Math.floor(pl.spindash * 8) / 256;
        if (!down) {
          pl.gsp = pl.facing * (C.SPINDASH_BASE + Math.floor(pl.spindash));
          pl.spindash = -1;
          this.setRolling(true);
          this.audio.spindashRelease();
          this.shake = 6;
        }
        pl.crouching = true;
        pl.runPhase += 0.6;
      } else if (pl.rolling) {
        // ---- Rolling ----
        if (left && pl.gsp > 0) pl.gsp -= C.ROLL_DEC;
        else if (right && pl.gsp < 0) pl.gsp += C.ROLL_DEC;
        pl.gsp -= Math.min(Math.abs(pl.gsp), C.ROLL_FRC) * Math.sign(pl.gsp);
        const s = Math.sin(pl.angle);
        const downhill = Math.sign(pl.gsp) === Math.sign(s) && s !== 0;
        pl.gsp += (downhill ? C.SLOPE_ROLL_DOWN : C.SLOPE_ROLL_UP) * s;
        if (Math.abs(pl.gsp) < C.MIN_ROLL_SPEED) this.setRolling(false);
      } else {
        // ---- Running ----
        if (left) {
          if (pl.gsp > 0) {
            pl.gsp -= C.DEC;
            if (pl.gsp <= 0) pl.gsp = -1;
            if (pl.gsp > 4) pl.skidding = true;
          } else if (pl.gsp > -C.TOP_SPEED) {
            pl.gsp = Math.max(-C.TOP_SPEED, pl.gsp - C.ACC);
          }
          pl.facing = -1;
        } else if (right) {
          if (pl.gsp < 0) {
            pl.gsp += C.DEC;
            if (pl.gsp >= 0) pl.gsp = 1;
            if (pl.gsp < -4) pl.skidding = true;
          } else if (pl.gsp < C.TOP_SPEED) {
            pl.gsp = Math.min(C.TOP_SPEED, pl.gsp + C.ACC);
          }
          pl.facing = 1;
        } else {
          pl.gsp -= Math.min(Math.abs(pl.gsp), C.FRC) * Math.sign(pl.gsp);
        }
        pl.gsp += C.SLOPE_FACTOR * Math.sin(pl.angle);

        if (down && Math.abs(pl.gsp) >= C.MIN_START_ROLL) {
          this.setRolling(true);
          this.audio.roll();
        } else if (down && Math.abs(pl.gsp) < C.MIN_START_ROLL) {
          pl.crouching = true;
          if (jumpPressed) {
            pl.spindash = 2;
            this.audio.spindashCharge(2);
          }
        } else if (up && Math.abs(pl.gsp) < 0.5) {
          pl.lookingUp = true;
        }
        if (pl.skidding) {
          if (this.frame % 4 === 0) this.emitDust(pl.x, pl.y + C.PLAYER_HALF_H);
          if (this.frame % 12 === 0) this.audio.skid();
        }
      }

      // ---- Jump ----
      if (jumpPressed && pl.spindash < 0) {
        const s = Math.sin(pl.angle);
        const c = Math.cos(pl.angle);
        pl.xsp = pl.gsp * c + C.JUMP_FORCE * s;
        pl.ysp = pl.gsp * s - C.JUMP_FORCE * c;
        pl.onGround = false;
        pl.jumping = true;
        pl.standingOn = null;
        this.setRolling(true);
        this.audio.jump();
      } else {
        pl.xsp = pl.gsp * Math.cos(pl.angle);
        pl.ysp = pl.gsp * Math.sin(pl.angle);
      }
    } else {
      // ---- Airborne ----
      if (!pl.hurt) {
        if (left) {
          pl.xsp = Math.max(-C.TOP_SPEED, pl.xsp - C.AIR_ACC);
          pl.facing = -1;
        } else if (right) {
          pl.xsp = Math.min(C.TOP_SPEED, pl.xsp + C.AIR_ACC);
          pl.facing = 1;
        }
      }
      if (pl.jumping && !jumpHeld && pl.ysp < C.JUMP_CUT) pl.ysp = C.JUMP_CUT;
      if (pl.ysp < 0 && pl.ysp > -8) pl.xsp -= pl.xsp / 0.125 / 256;
      pl.ysp = Math.min(C.MAX_FALL, pl.ysp + C.GRAVITY);
    }

    // ---- Move ----
    const wasOnGround = pl.onGround;
    const prevFeet = pl.y + this.halfH();
    pl.x += pl.xsp;
    pl.y += pl.ysp;

    // level bounds
    const minX = C.PLAYER_HALF_W;
    const maxX = this.level.width - C.PLAYER_HALF_W;
    if (pl.x < minX) {
      pl.x = minX;
      if (pl.gsp < 0) pl.gsp = 0;
      if (pl.xsp < 0) pl.xsp = 0;
    } else if (pl.x > maxX) {
      pl.x = maxX;
      if (pl.gsp > 0) pl.gsp = 0;
      if (pl.xsp > 0) pl.xsp = 0;
    }

    this.collideSolids(prevFeet);
    this.resolveSurface(wasOnGround, prevFeet);
    this.checkLoopEntry();
    this.updateDrawAngle();

    // animation counters
    if (pl.onGround) pl.runPhase += Math.abs(pl.gsp) * 0.05 + (Math.abs(pl.gsp) > 0.2 ? 0.04 : 0);
    else if (pl.rolling) pl.runPhase += 0.5;
    if (pl.onGround && Math.abs(pl.gsp) < 0.1 && !pl.crouching && !pl.lookingUp) pl.idle++;
    else pl.idle = 0;
  }

  private updateDrawAngle() {
    const pl = this.player;
    let target = 0;
    if (pl.loop) target = -pl.loop.theta;
    else if (pl.onGround) target = pl.angle;
    if (pl.loop) pl.drawAngle = target;
    else pl.drawAngle += (target - pl.drawAngle) * 0.35;
  }

  /** Solid blocks: walls, ceilings, and their tops. */
  private collideSolids(prevFeet: number) {
    const pl = this.player;
    const hh = this.halfH();
    const hw = C.PLAYER_HALF_W;
    for (const p of this.platforms) {
      if (!p.solid) continue;
      const left = pl.x - hw;
      const right = pl.x + hw;
      const top = pl.y - hh;
      const bottom = pl.y + hh;
      if (right <= p.px || left >= p.px + p.w || bottom <= p.py || top >= p.py + p.h) continue;
      const prevHead = prevFeet - hh * 2;
      if (prevFeet <= p.py + 6 && pl.ysp >= 0) {
        // land on top
        pl.y = p.py - hh;
        this.land(p);
      } else if (prevHead >= p.py + p.h - 6 && pl.ysp < 0) {
        pl.y = p.py + p.h + hh;
        pl.ysp = 0;
      } else {
        if (pl.x < p.px + p.w / 2) pl.x = p.px - hw;
        else pl.x = p.px + p.w + hw;
        pl.gsp = 0;
        pl.xsp = 0;
      }
    }
  }

  private land(platform: PlatformEnt | null) {
    const pl = this.player;
    if (!pl.onGround) {
      // convert air velocity to ground speed
      pl.gsp = pl.xsp;
      pl.onGround = true;
      pl.jumping = false;
      if (pl.hurt) {
        pl.hurt = false;
        pl.gsp = 0;
      }
      this.setRolling(false);
    }
    pl.standingOn = platform;
    pl.ysp = 0;
  }

  /** Snap to the ground/one-way platform below, or fall off. */
  private resolveSurface(wasOnGround: boolean, prevFeet: number) {
    const pl = this.player;
    const hh = this.halfH();
    const feet = pl.y + hh;
    const gy = groundAt(this.level, pl.x);

    if (wasOnGround && pl.onGround) {
      const snap = Math.max(18, Math.abs(pl.gsp) + 6);
      let bestY: number | null = null;
      let bestPlat: PlatformEnt | null = null;
      for (const p of this.platforms) {
        if (pl.x + C.PLAYER_HALF_W <= p.px || pl.x - C.PLAYER_HALF_W >= p.px + p.w) continue;
        if (Math.abs(p.py - feet) <= (p === pl.standingOn ? snap : 10) && (bestY === null || p.py < bestY)) {
          bestY = p.py;
          bestPlat = p;
        }
      }
      if (gy !== null && gy >= feet - snap && gy <= feet + snap && (bestY === null || gy < bestY)) {
        bestY = gy;
        bestPlat = null;
      }
      if (bestY === null) {
        pl.onGround = false;
        pl.standingOn = null;
        pl.xsp = pl.gsp * Math.cos(pl.angle);
        pl.ysp = pl.gsp * Math.sin(pl.angle);
        pl.angle = 0;
      } else {
        pl.y = bestY - hh;
        pl.standingOn = bestPlat;
        pl.angle = bestPlat ? 0 : groundAngle(this.level, pl.x);
      }
      return;
    }

    if (!pl.onGround) {
      // one-way platforms
      let landed = false;
      if (pl.ysp >= 0) {
        for (const p of this.platforms) {
          if (p.solid) continue;
          if (pl.x + C.PLAYER_HALF_W <= p.px || pl.x - C.PLAYER_HALF_W >= p.px + p.w) continue;
          const prevRel = prevFeet - (p.prevPy);
          if (prevRel <= 6 && feet >= p.py) {
            pl.y = p.py - hh;
            pl.angle = 0;
            this.land(p);
            landed = true;
            break;
          }
        }
      }
      if (!landed && gy !== null && feet >= gy) {
        pl.y = gy - hh;
        pl.angle = groundAngle(this.level, pl.x);
        this.land(null);
      }
    }
  }

  private checkLoopEntry() {
    const pl = this.player;
    if (!pl.onGround || pl.loop || Math.abs(pl.gsp) < C.LOOP_MIN_ENTRY) return;
    for (const loop of this.level.loops) {
      const surface = loop.cy + loop.r;
      if (Math.abs(pl.y + this.halfH() - surface) > 12) continue;
      if ((pl.prevX - loop.cx) * (pl.x - loop.cx) <= 0) {
        pl.loop = { loop, theta: pl.gsp > 0 ? 0 : Math.PI * 2 };
        pl.standingOn = null;
        pl.angle = 0;
        this.placeOnLoop();
        return;
      }
    }
  }

  private placeOnLoop() {
    const pl = this.player;
    if (!pl.loop) return;
    const { loop, theta } = pl.loop;
    const rp = loop.r - this.halfH();
    pl.x = loop.cx + Math.sin(theta) * rp;
    pl.y = loop.cy + Math.cos(theta) * rp;
  }

  private updateLoop(left: boolean, right: boolean) {
    const pl = this.player;
    if (!pl.loop) return;
    const { loop } = pl.loop;
    const rp = loop.r - this.halfH();
    if (right && pl.gsp > 0 && pl.gsp < C.TOP_SPEED) pl.gsp += C.ACC;
    if (left && pl.gsp < 0 && pl.gsp > -C.TOP_SPEED) pl.gsp -= C.ACC;
    if (!pl.rolling) pl.gsp -= Math.min(Math.abs(pl.gsp), C.FRC * 0.5) * Math.sign(pl.gsp);
    pl.gsp -= C.LOOP_SLOPE * Math.sin(pl.loop.theta);
    pl.loop.theta += pl.gsp / rp;
    const th = pl.loop.theta;
    pl.runPhase += Math.abs(pl.gsp) * 0.05;

    const onUpperHalf = th > Math.PI / 2 && th < Math.PI * 1.5;
    if (Math.abs(pl.gsp) < C.LOOP_MIN_STICK && onUpperHalf) {
      // not enough speed: drop off the wall
      this.placeOnLoop();
      pl.xsp = pl.gsp * Math.cos(th);
      pl.ysp = -pl.gsp * Math.sin(th);
      pl.loop = null;
      pl.onGround = false;
      pl.gsp = 0;
      return;
    }
    if (th >= Math.PI * 2 || th <= 0) {
      const dir = th >= Math.PI * 2 ? 1 : -1;
      const overshoot = dir === 1 ? (th - Math.PI * 2) * rp : th * rp;
      pl.loop = null;
      pl.onGround = true;
      pl.x = loop.cx + overshoot;
      pl.y = loop.cy + loop.r - this.halfH();
      pl.angle = 0;
      pl.xsp = pl.gsp;
      pl.ysp = 0;
      return;
    }
    this.placeOnLoop();
  }

  // ------------------------------------------------------------------
  // Collisions with things
  // ------------------------------------------------------------------
  private overlaps(x: number, y: number, w: number, h: number): boolean {
    const pl = this.player;
    const hh = this.halfH();
    return pl.x + C.PLAYER_HALF_W > x && pl.x - C.PLAYER_HALF_W < x + w && pl.y + hh > y && pl.y - hh < y + h;
  }

  private isAttacking(): boolean {
    return this.player.rolling || this.player.jumping;
  }

  private updateCollisions() {
    const pl = this.player;
    const L = this.level;

    // rings
    for (const r of this.rings) {
      if (r.collected) {
        if (r.sparkle > 0) r.sparkle--;
        continue;
      }
      if (Math.abs(r.x - pl.x) < 400 && this.overlaps(r.x - 8, r.y - 8, 16, 16)) this.collectRing(r);
    }

    // scattered rings
    for (const r of this.scatter) {
      if (r.life < C.RING_PICKUP_DELAY) continue;
      if (this.overlaps(r.x - 8, r.y - 8, 16, 16)) {
        r.life = C.RING_LIFETIME + 1;
        this.addRing(r.x, r.y);
      }
    }

    if (pl.loop) return;

    // springs
    for (const s of this.springs) {
      if (s.anim > 0) s.anim--;
      if (pl.ysp < 0 && !pl.onGround) continue;
      if (this.overlaps(s.x - 16, s.y - 6, 32, 20)) {
        pl.y = s.y - this.halfH();
        pl.ysp = C.SPRING_FORCE;
        pl.onGround = false;
        pl.jumping = false;
        pl.standingOn = null;
        pl.springTimer = 30;
        this.setRolling(false);
        pl.hurt = false;
        s.anim = 12;
        this.audio.spring();
      }
    }

    // spikes
    if (pl.invuln === 0) {
      for (const sp of L.spikes) {
        if (this.overlaps(sp.x, sp.y - 2, sp.w, 18) && pl.y + this.halfH() >= sp.y - 6 && pl.ysp >= 0) {
          this.hurt(pl.x - pl.facing);
          break;
        }
      }
    }

    // monitors
    for (const m of this.monitors) {
      if (m.broken) {
        if (m.breakTimer > 0) m.breakTimer--;
        continue;
      }
      if (this.overlaps(m.x - 16, m.y - 32, 32, 32)) {
        if (this.isAttacking()) this.breakMonitor(m);
        else if (!pl.onGround && pl.ysp > 0 && pl.y + this.halfH() <= m.y - 24) {
          // stand on top of an unbroken monitor
          pl.y = m.y - 32 - this.halfH();
          this.land(null);
        }
      }
    }

    // checkpoints
    for (const c of this.checkpoints) {
      if (c.active) {
        c.spin += 0.3;
        continue;
      }
      if (this.overlaps(c.x - 10, c.y - 70, 20, 70)) {
        c.active = true;
        this.respawn = { x: c.x, y: c.y - C.PLAYER_HALF_H, time: this.time };
        this.audio.checkpoint();
        this.emitStars(c.x, c.y - 60, 8);
      }
    }

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - pl.x) > 200) continue;
      if (this.overlaps(e.x - e.w / 2, e.y - e.h, e.w, e.h)) {
        if (this.isAttacking()) {
          e.alive = false;
          this.addScore(100, e.x, e.y - 20);
          this.audio.pop();
          this.emitPop(e.x, e.y - e.h / 2);
          if (!pl.onGround) {
            if (pl.ysp > 0) pl.ysp = -pl.ysp;
            else pl.ysp = Math.min(pl.ysp, -6);
          }
        } else if (pl.invuln === 0) {
          this.hurt(e.x);
        }
      }
    }

    // goal
    if (!this.goalPassed && pl.x >= L.goal.x) {
      this.goalPassed = true;
      this.goalSpin = 1;
      this.clearTimer = 0;
      this.phase = "clear";
      this.audio.stopMusic();
      this.audio.goal();
      const tb = timeBonus(this.time);
      const rb = this.ringCount * 100;
      this.tally = { timeBonus: tb, ringBonus: rb, remainingTime: tb, remainingRing: rb, done: false, visible: false };
    }
  }

  private collectRing(r: RingEnt) {
    r.collected = true;
    r.sparkle = 16;
    this.addRing(r.x, r.y);
  }

  private addRing(x: number, y: number) {
    this.ringCount++;
    this.audio.ring();
    this.emitSparks(x, y);
    if (this.ringCount >= 100 && this.lastLifeThreshold < 100) {
      this.lastLifeThreshold = 100;
      this.gainLife();
    } else if (this.ringCount >= 200 && this.lastLifeThreshold < 200) {
      this.lastLifeThreshold = 200;
      this.gainLife();
    }
  }

  private gainLife() {
    this.lives++;
    this.audio.extraLife();
    this.showMessage("EXTRA LIFE!", 90);
  }

  private addScore(points: number, x: number, y: number) {
    this.score += points;
    this.particles.push({ kind: "text", x, y, xsp: 0, ysp: -1, life: 0, maxLife: 40, size: 16, text: String(points) });
  }

  private breakMonitor(m: MonitorEnt) {
    const pl = this.player;
    m.broken = true;
    m.breakTimer = 40;
    this.addScore(10, m.x, m.y - 40);
    this.audio.monitor();
    this.emitPop(m.x, m.y - 16);
    if (!pl.onGround && pl.ysp > 0) pl.ysp = -pl.ysp;
    this.applyMonitor(m.kind, m.x, m.y - 16);
  }

  private applyMonitor(kind: MonitorKind, x: number, y: number) {
    switch (kind) {
      case "ring":
        for (let i = 0; i < 10; i++) this.addRing(x, y);
        this.showMessage("+10 RINGS", 60);
        break;
      case "shield":
        this.player.shield = true;
        this.showMessage("SHIELD!", 60);
        break;
      case "life":
        this.gainLife();
        break;
    }
  }

  private hurt(sourceX: number) {
    const pl = this.player;
    if (pl.invuln > 0) return;
    if (pl.shield) {
      pl.shield = false;
      this.audio.hurt();
      this.particles.push({ kind: "shieldpop", x: pl.x, y: pl.y, xsp: 0, ysp: 0, life: 0, maxLife: 20, size: 34 });
    } else if (this.ringCount > 0) {
      this.scatterRings();
      this.ringCount = 0;
      this.audio.ringLoss();
    } else {
      this.die();
      return;
    }
    const dir = pl.x < sourceX ? -1 : 1;
    pl.xsp = C.HURT_X * dir;
    pl.ysp = C.HURT_Y;
    pl.gsp = 0;
    pl.onGround = false;
    pl.jumping = false;
    pl.hurt = true;
    pl.spindash = -1;
    pl.standingOn = null;
    pl.loop = null;
    pl.invuln = C.INVULN_FRAMES;
    this.setRolling(false);
    this.shake = 8;
  }

  private scatterRings() {
    const n = Math.min(this.ringCount, C.RING_SCATTER_MAX);
    let angle = (101.25 * Math.PI) / 180;
    let speed = 8;
    let flip = false;
    for (let i = 0; i < n; i++) {
      let xsp = Math.cos(angle) * speed;
      const ysp = -Math.sin(angle) * speed;
      if (flip) {
        xsp = -xsp;
        angle += (22.5 * Math.PI) / 180;
      }
      flip = !flip;
      this.scatter.push({ x: this.player.x, y: this.player.y, xsp, ysp, life: 0 });
      if (i === 15) {
        speed = 4;
        angle = (101.25 * Math.PI) / 180;
      }
    }
  }

  private die() {
    if (this.phase === "dying") return;
    const pl = this.player;
    this.phase = "dying";
    pl.loop = null;
    pl.ysp = -14;
    pl.xsp = 0;
    pl.onGround = false;
    pl.rolling = false;
    pl.spindash = -1;
    pl.hurt = true;
    pl.drawAngle = 0;
    this.deathTimer = 0;
    this.audio.stopMusic();
    this.audio.death();
  }

  private updateDying() {
    const pl = this.player;
    pl.y += pl.ysp;
    pl.ysp = Math.min(C.MAX_FALL, pl.ysp + C.GRAVITY);
    this.updateParticles();
    this.updateScatterRings();
    if (pl.y > this.camera.y + C.VIEW_H + 80) {
      this.deathTimer++;
      if (this.deathTimer === 45) {
        this.lives--;
        if (this.lives < 0) {
          this.phase = "gameover";
          this.deathTimer = 0;
        } else {
          this.respawnPlayer();
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Level clear
  // ------------------------------------------------------------------
  private updateClear(input: InputState) {
    this.clearTimer++;
    if (this.goalSpin > 0 && this.goalSpin < 150) this.goalSpin++;
    this.updatePlatforms();
    this.updatePlayer(input);
    this.updateCollisions();
    this.updateEnemies();
    this.updateScatterRings();
    this.updateParticles();
    this.updateCamera();

    if (this.clearTimer === 150) this.tally.visible = true;
    if (this.tally.visible && !this.tally.done && this.clearTimer > 200) {
      const t = this.tally;
      let moved = false;
      if (t.remainingTime > 0) {
        const d = Math.min(100, t.remainingTime);
        t.remainingTime -= d;
        this.score += d;
        moved = true;
      }
      if (t.remainingRing > 0) {
        const d = Math.min(100, t.remainingRing);
        t.remainingRing -= d;
        this.score += d;
        moved = true;
      }
      if (moved) {
        if (this.frame % 3 === 0) this.audio.tally();
      } else {
        t.done = true;
        this.audio.checkpoint();
      }
    }
    if (this.tally.done && this.clearTimer > 260 && input.startPressed) {
      this.phase = "title";
      this.titleTimer = 0;
    }
  }

  // ------------------------------------------------------------------
  // Enemies, rings, particles, camera
  // ------------------------------------------------------------------
  private updateEnemies() {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t++;
      if (e.kind === "crawler") {
        const nx = e.x + e.dir * 1.5;
        const gy = groundAt(this.level, nx);
        if (gy === null || Math.abs(nx - e.x0) > e.range) {
          e.dir = e.dir === 1 ? -1 : 1;
        } else {
          e.x = nx;
          e.y = gy;
        }
      } else {
        e.x += e.dir * 2;
        if (Math.abs(e.x - e.x0) > e.range) e.dir = e.dir === 1 ? -1 : 1;
        e.y = e.y0 + Math.sin(e.t * 0.06) * 8;
      }
    }
  }

  private updateScatterRings() {
    for (const r of this.scatter) {
      r.life++;
      r.ysp += C.RING_GRAVITY;
      r.x += r.xsp;
      r.y += r.ysp;
      if (r.ysp > 0) {
        const gy = groundAt(this.level, r.x);
        if (gy !== null && r.y + 8 >= gy) {
          r.y = gy - 8;
          r.ysp *= -0.75;
        }
      }
    }
    this.scatter = this.scatter.filter((r) => r.life <= C.RING_LIFETIME && r.y < this.level.height + 40);
  }

  private updateParticles() {
    for (const p of this.particles) {
      p.life++;
      p.x += p.xsp;
      p.y += p.ysp;
      if (p.gravity) p.ysp += p.gravity;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  private emitDust(x: number, y: number) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        kind: "dust",
        x: x + (Math.random() - 0.5) * 10,
        y,
        xsp: (Math.random() - 0.5) * 1.5,
        ysp: -Math.random() * 1.5,
        life: 0,
        maxLife: 20 + Math.random() * 10,
        size: 5 + Math.random() * 5,
      });
    }
  }

  private emitSmoke(x: number, y: number, dir: number) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        kind: "smoke",
        x,
        y: y + (Math.random() - 0.5) * 8,
        xsp: dir * (1 + Math.random() * 2),
        ysp: -Math.random(),
        life: 0,
        maxLife: 18 + Math.random() * 10,
        size: 6 + Math.random() * 6,
      });
    }
  }

  private emitSparks(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      this.particles.push({
        kind: "spark",
        x,
        y,
        xsp: Math.cos(a) * 2,
        ysp: Math.sin(a) * 2,
        life: 0,
        maxLife: 14,
        size: 3,
      });
    }
  }

  private emitPop(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.particles.push({
        kind: "pop",
        x,
        y,
        xsp: Math.cos(a) * 3,
        ysp: Math.sin(a) * 3 - 1,
        life: 0,
        maxLife: 24,
        size: 4,
        gravity: 0.15,
      });
    }
  }

  private emitStars(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.push({
        kind: "star",
        x,
        y,
        xsp: Math.cos(a) * 2.5,
        ysp: Math.sin(a) * 2.5,
        life: 0,
        maxLife: 30,
        size: 4,
      });
    }
  }

  private updateCamera() {
    const pl = this.player;
    const cam = this.camera;
    const lookahead = pl.facing * Math.min(Math.abs(pl.gsp), 12) * 8;
    const targetX = pl.x - C.VIEW_W / 2 + lookahead;
    cam.x += (targetX - cam.x) * 0.18;

    const targetY = pl.y - C.VIEW_H * 0.55;
    if (pl.onGround || pl.loop) {
      cam.y += (targetY - cam.y) * 0.16;
    } else {
      const rel = pl.y - cam.y;
      if (rel < 140) cam.y += (rel - 140) * 0.5;
      else if (rel > 400) cam.y += (rel - 400) * 0.5;
    }
    this.clampCamera();
  }

  get timeString(): string {
    return formatTime(this.time);
  }
}
