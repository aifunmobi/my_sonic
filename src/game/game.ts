import * as C from "./constants";
import { formatTime, groundAngleSegs, groundAtSegs, timeBonus } from "./terrain";
import { buildLevel, LEVEL_COUNT } from "./levels";
import { loadSave, writeSave, type SaveData } from "./save";
import type { GameAudio } from "./audio";
import type { InputState } from "./input";
import type { Checkpoint, EnemyKind, LevelData, Loop, Monitor, MonitorKind, Platform, Spring } from "./types";

export type Phase = "title" | "playing" | "paused" | "dying" | "clear" | "gameover" | "complete";

export const WATER_Y = 480;

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
  spindash: number;
  facing: 1 | -1;
  invuln: number;
  hurt: boolean;
  loop: { loop: Loop; theta: number } | null;
  shield: boolean;
  invincible: number;
  speedShoes: number;
  runPhase: number;
  skidding: boolean;
  crouching: boolean;
  lookingUp: boolean;
  standingOn: PlatformEnt | null;
  springTimer: number;
  idle: number;
  chain: number;
  splashed: boolean;
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
  shoots: boolean;
  cooldown: number;
  vy: number;
  angle: number;
  pause: number;
}

export interface Projectile {
  x: number;
  y: number;
  xsp: number;
  ysp: number;
  life: number;
  kind: "shot" | "fireball";
}

export interface PlatformEnt extends Platform {
  px: number;
  py: number;
  prevPx: number;
  prevPy: number;
  crumbleTimer: number;
  gone: number; // frames remaining before it comes back (0 = present)
  shake: number;
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

export type BossState = "waiting" | "enter" | "hover" | "dive" | "rise" | "defeated" | "gone";

export interface BossEnt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: BossState;
  timer: number;
  hits: number;
  flash: number;
  targetX: number;
  dir: 1 | -1;
  locked: boolean;
}

export type ParticleKind = "dust" | "spark" | "smoke" | "pop" | "text" | "shieldpop" | "star" | "boom" | "splash" | "debris" | "invstar";

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
  color?: string;
}

export interface Camera {
  x: number;
  y: number;
}

export interface Tally {
  timeBonus: number;
  ringBonus: number;
  perfectBonus: number;
  remainingTime: number;
  remainingRing: number;
  remainingPerfect: number;
  done: boolean;
  visible: boolean;
  newRecord: boolean;
}

export class Game {
  level: LevelData;
  levelIndex = 0;
  audio: GameAudio;
  save: SaveData;
  phase: Phase = "title";
  player: Player;
  rings: RingEnt[] = [];
  scatter: ScatterRing[] = [];
  enemies: EnemyEnt[] = [];
  projectiles: Projectile[] = [];
  platforms: PlatformEnt[] = [];
  monitors: MonitorEnt[] = [];
  checkpoints: CheckpointEnt[] = [];
  springs: SpringEnt[] = [];
  particles: Particle[] = [];
  boss: BossEnt | null = null;
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
  tally: Tally = this.emptyTally();
  titleTimer = 0;
  menuIndex = 0;
  message = "";
  messageTimer = 0;
  lastLifeThreshold = 0;
  nextLifeScore = C.SCORE_LIFE_EVERY;
  shake = 0;
  levelRingsCollected = 0;
  levelEnemies = 0;
  fade = 0; // 0..1 black overlay for transitions
  fadeDir = 0;
  pendingLevel = -1;
  runScore = 0;

  constructor(audio: GameAudio) {
    this.audio = audio;
    this.save = loadSave();
    this.audio.musicOn = this.save.music;
    this.audio.setMuted(this.save.muted);
    this.level = buildLevel(0);
    this.respawn = { x: this.level.start.x, y: this.level.start.y, time: 0 };
    this.player = this.makePlayer(this.level.start.x, this.level.start.y);
    this.buildEntities();
    this.snapCamera();
  }

  private emptyTally(): Tally {
    return {
      timeBonus: 0,
      ringBonus: 0,
      perfectBonus: 0,
      remainingTime: 0,
      remainingRing: 0,
      remainingPerfect: 0,
      done: false,
      visible: false,
      newRecord: false,
    };
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
      invincible: 0,
      speedShoes: 0,
      runPhase: 0,
      skidding: false,
      crouching: false,
      lookingUp: false,
      standingOn: null,
      springTimer: 0,
      idle: 0,
      chain: 0,
      splashed: false,
    };
  }

  private buildEntities() {
    const L = this.level;
    this.rings = L.rings.map((r) => ({ x: r.x, y: r.y, collected: false, sparkle: 0 }));
    this.platforms = L.platforms.map((p) => ({ ...p, px: p.x, py: p.y, prevPx: p.x, prevPy: p.y, crumbleTimer: 0, gone: 0, shake: 0 }));
    this.monitors = L.monitors.map((m) => ({ ...m, broken: false, breakTimer: 0 }));
    this.checkpoints = L.checkpoints.map((c) => ({ ...c, active: false, spin: 0 }));
    this.springs = L.springs.map((s) => ({ ...s, anim: 0 }));
    this.projectiles = [];
    this.scatter = [];
    this.particles = [];
    this.spawnEnemies();
    this.spawnBoss();
  }

  private spawnEnemies() {
    const size: Record<EnemyKind, [number, number]> = {
      crawler: [26, 18],
      buzzer: [26, 14],
      crab: [34, 18],
      chopper: [16, 22],
      spikeball: [16, 16],
    };
    this.enemies = this.level.enemies.map((e) => ({
      kind: e.kind,
      x: e.x,
      y: e.y,
      x0: e.x,
      y0: e.y,
      range: e.range,
      dir: 1,
      alive: true,
      t: Math.floor((e.x * 7) % 120),
      w: size[e.kind][0],
      h: size[e.kind][1],
      shoots: !!e.shoots,
      cooldown: 60,
      vy: 0,
      angle: 0,
      pause: 0,
    }));
  }

  private spawnBoss() {
    const a = this.level.boss;
    if (!a) {
      this.boss = null;
      return;
    }
    this.boss = {
      x: a.x + a.w / 2,
      y: a.y - 260,
      vx: 0,
      vy: 0,
      state: "waiting",
      timer: 0,
      hits: 0,
      flash: 0,
      targetX: a.x + a.w / 2,
      dir: 1,
      locked: false,
    };
  }

  // ------------------------------------------------------------------
  // Level / run management
  // ------------------------------------------------------------------
  loadLevel(index: number, keepRun: boolean) {
    this.levelIndex = index;
    this.level = buildLevel(index);
    if (!keepRun) {
      this.score = 0;
      this.lives = C.START_LIVES;
      this.nextLifeScore = C.SCORE_LIFE_EVERY;
    }
    this.ringCount = 0;
    this.time = 0;
    this.lastLifeThreshold = 0;
    this.levelRingsCollected = 0;
    this.levelEnemies = 0;
    this.respawn = { x: this.level.start.x, y: this.level.start.y, time: 0 };
    this.buildEntities();
    this.goalPassed = false;
    this.goalSpin = 0;
    this.clearTimer = 0;
    this.tally = this.emptyTally();
    this.player = this.makePlayer(this.level.start.x, this.level.start.y);
    this.snapCamera();
    this.phase = "playing";
    this.showMessage(`${this.level.name}`, 160);
    this.audio.startMusic(this.level.music);
  }

  startRun(fromLevel: number) {
    this.save.runs++;
    this.persist();
    this.loadLevel(fromLevel, false);
  }

  private persist() {
    this.save.muted = this.audio.muted;
    this.save.music = this.audio.musicOn;
    writeSave(this.save);
  }

  private respawnPlayer() {
    this.player = this.makePlayer(this.respawn.x, this.respawn.y);
    this.time = this.respawn.time;
    this.ringCount = 0;
    this.scatter = [];
    this.particles = [];
    this.projectiles = [];
    this.spawnEnemies();
    if (this.boss && this.boss.state !== "gone") this.spawnBoss();
    for (const p of this.platforms) {
      p.gone = 0;
      p.crumbleTimer = 0;
    }
    this.deathTimer = 0;
    this.snapCamera();
    this.phase = "playing";
    this.audio.startMusic(this.level.music);
  }

  private snapCamera() {
    this.camera.x = this.player.x - C.VIEW_W / 2;
    this.camera.y = this.player.y - C.VIEW_H * 0.6;
    this.clampCamera();
  }

  private clampCamera() {
    let minX = 0;
    let maxX = this.level.width - C.VIEW_W;
    if (this.goalPassed) maxX = Math.min(maxX, this.level.goal.x + 100 - C.VIEW_W / 2);
    if (this.boss?.locked && this.level.boss) {
      minX = this.level.boss.x;
      maxX = this.level.boss.x + this.level.boss.w - C.VIEW_W;
    }
    this.camera.x = Math.max(minX, Math.min(maxX, this.camera.x));
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
    if (this.fadeDir !== 0) {
      this.fade = Math.max(0, Math.min(1, this.fade + this.fadeDir * 0.05));
      if (this.fade >= 1 && this.fadeDir > 0) {
        this.fadeDir = -1;
        if (this.pendingLevel >= 0) {
          const idx = this.pendingLevel;
          this.pendingLevel = -1;
          this.loadLevel(idx, true);
        }
      } else if (this.fade <= 0 && this.fadeDir < 0) this.fadeDir = 0;
    }

    if (input.mutePressed) {
      this.audio.setMuted(!this.audio.muted);
      this.showMessage(this.audio.muted ? "SOUND OFF" : "SOUND ON", 60);
      this.persist();
    }
    if (input.musicPressed) {
      const on = this.audio.toggleMusic();
      this.showMessage(on ? "MUSIC ON" : "MUSIC OFF", 60);
      this.persist();
    }

    switch (this.phase) {
      case "title":
        this.titleTimer++;
        if (input.upPressed) {
          this.menuIndex = (this.menuIndex + this.save.unlocked - 1) % this.save.unlocked;
          this.audio.select();
        }
        if (input.downPressed) {
          this.menuIndex = (this.menuIndex + 1) % this.save.unlocked;
          this.audio.select();
        }
        if (input.startPressed && this.titleTimer > 10) this.startRun(this.menuIndex);
        break;
      case "playing":
        if (input.pausePressed || input.backPressed) {
          this.phase = "paused";
          this.audio.stopMusic();
          return;
        }
        if (input.restartPressed) {
          this.audio.stopMusic();
          this.loadLevel(this.levelIndex, true);
          return;
        }
        if (this.fadeDir === 0) this.updatePlaying(input);
        break;
      case "paused":
        if (input.pausePressed || input.startPressed) {
          this.phase = "playing";
          this.audio.startMusic(this.boss?.locked ? 5 : this.level.music);
        } else if (input.backPressed) {
          this.phase = "title";
          this.titleTimer = 0;
        }
        break;
      case "dying":
        this.updateDying();
        break;
      case "clear":
        this.updateClear(input);
        break;
      case "gameover":
      case "complete":
        this.deathTimer++;
        if (this.deathTimer > 60 && input.startPressed) {
          this.phase = "title";
          this.titleTimer = 0;
          this.menuIndex = Math.min(this.menuIndex, this.save.unlocked - 1);
        }
        break;
    }
  }

  // ------------------------------------------------------------------
  // Playing
  // ------------------------------------------------------------------
  private updatePlaying(input: InputState) {
    if (this.time < 599 * 60) this.time++;
    this.updatePlatforms();
    this.updatePlayer(input);
    this.updateCollisions();
    this.updateEnemies();
    this.updateProjectiles();
    this.updateBoss();
    this.updateScatterRings();
    this.updateParticles();
    this.updateCamera();

    const pl = this.player;
    if (!pl.splashed && pl.y > WATER_Y && pl.ysp > 0) {
      pl.splashed = true;
      this.emitSplash(pl.x, WATER_Y);
      this.audio.splash();
    }
    if (pl.y - C.PLAYER_HALF_H > this.level.height + 20) this.die();
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
      if (p.gone > 0) {
        p.gone--;
        if (p.gone === 0) p.crumbleTimer = 0;
      } else if (p.crumble && p.crumbleTimer > 0) {
        p.crumbleTimer++;
        p.shake = p.crumbleTimer > 12 ? 1 : 0;
        if (p.crumbleTimer > 30) {
          p.gone = 240;
          p.shake = 0;
          this.emitDebris(p.px + p.w / 2, p.py + 4, p.w);
          if (this.player.standingOn === p) {
            this.player.standingOn = null;
            this.player.onGround = false;
            this.player.xsp = this.player.gsp;
            this.player.ysp = 0;
          }
        }
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
    if (pl.onGround) pl.y += on ? C.PLAYER_HALF_H - C.PLAYER_ROLL_HALF_H : C.PLAYER_ROLL_HALF_H - C.PLAYER_HALF_H;
    pl.rolling = on;
  }

  private topSpeed(): number {
    return this.player.speedShoes > 0 ? C.TOP_SPEED * 2 : C.TOP_SPEED;
  }

  private acc(): number {
    return this.player.speedShoes > 0 ? C.ACC * 2 : C.ACC;
  }

  private updatePlayer(input: InputState) {
    const pl = this.player;
    pl.prevX = pl.x;
    if (pl.invuln > 0) pl.invuln--;
    if (pl.springTimer > 0) pl.springTimer--;
    if (pl.invincible > 0) {
      pl.invincible--;
      if (this.frame % 4 === 0) this.emitInvStar(pl.x, pl.y);
      if (pl.invincible === 0) this.audio.startMusic(this.boss?.locked ? 5 : this.level.music);
    }
    if (pl.speedShoes > 0) {
      pl.speedShoes--;
      if (pl.speedShoes === 0) this.showMessage("SPEED SHOES OFF", 60);
    }
    pl.skidding = false;
    pl.crouching = false;
    pl.lookingUp = false;

    const lockedInput = this.goalPassed || pl.hurt;
    const left = !lockedInput && input.left;
    const right = (!lockedInput && input.right) || (this.goalPassed && this.clearTimer < 140);
    const down = !lockedInput && input.down;
    const up = !lockedInput && input.up;
    const jumpHeld = !lockedInput && input.jump;
    const jumpPressed = !lockedInput && input.jumpPressed;
    const TOP = this.topSpeed();
    const ACC = this.acc();

    if (pl.loop) {
      this.updateLoop(left, right);
      this.updateDrawAngle();
      return;
    }

    if (pl.onGround) {
      if (pl.spindash >= 0) {
        if (jumpPressed) {
          pl.spindash = Math.min(C.SPINDASH_MAX_CHARGE, pl.spindash + 2);
          this.audio.spindashCharge(pl.spindash);
          this.emitSmoke(pl.x - pl.facing * 12, pl.y + 8, -pl.facing);
        }
        pl.spindash -= Math.floor(pl.spindash * 8) / 256;
        if (!down) {
          pl.gsp = pl.facing * (C.SPINDASH_BASE + Math.floor(pl.spindash) / 2);
          pl.spindash = -1;
          this.setRolling(true);
          this.audio.spindashRelease();
          this.shake = 4;
        }
        pl.crouching = true;
        pl.runPhase += 0.6;
      } else if (pl.rolling) {
        if (left && pl.gsp > 0) pl.gsp -= C.ROLL_DEC;
        else if (right && pl.gsp < 0) pl.gsp += C.ROLL_DEC;
        pl.gsp -= Math.min(Math.abs(pl.gsp), C.ROLL_FRC) * Math.sign(pl.gsp);
        const s = Math.sin(pl.angle);
        const downhill = Math.sign(pl.gsp) === Math.sign(s) && s !== 0;
        pl.gsp += (downhill ? C.SLOPE_ROLL_DOWN : C.SLOPE_ROLL_UP) * s;
        if (Math.abs(pl.gsp) < C.MIN_ROLL_SPEED) this.setRolling(false);
        if (left) pl.facing = -1;
        else if (right) pl.facing = 1;
      } else {
        if (left) {
          if (pl.gsp > 0) {
            pl.gsp -= C.DEC;
            if (pl.gsp <= 0) pl.gsp = -0.5;
            if (pl.gsp > 2.5) pl.skidding = true;
          } else if (pl.gsp > -TOP) {
            pl.gsp = Math.max(-TOP, pl.gsp - ACC);
          }
          pl.facing = -1;
        } else if (right) {
          if (pl.gsp < 0) {
            pl.gsp += C.DEC;
            if (pl.gsp >= 0) pl.gsp = 0.5;
            if (pl.gsp < -2.5) pl.skidding = true;
          } else if (pl.gsp < TOP) {
            pl.gsp = Math.min(TOP, pl.gsp + ACC);
          }
          pl.facing = 1;
        } else {
          pl.gsp -= Math.min(Math.abs(pl.gsp), C.FRC) * Math.sign(pl.gsp);
        }
        if (Math.abs(pl.gsp) > 0.05 || Math.abs(Math.sin(pl.angle)) > 0.35) pl.gsp += C.SLOPE_FACTOR * Math.sin(pl.angle);

        if (down && Math.abs(pl.gsp) >= C.MIN_START_ROLL) {
          this.setRolling(true);
          this.audio.roll();
        } else if (down && Math.abs(pl.gsp) < C.MIN_START_ROLL) {
          pl.crouching = true;
          if (jumpPressed) {
            pl.spindash = 2;
            this.audio.spindashCharge(2);
          }
        } else if (up && Math.abs(pl.gsp) < 0.3) {
          pl.lookingUp = true;
        }
        if (pl.skidding) {
          if (this.frame % 4 === 0) this.emitDust(pl.x, pl.y + C.PLAYER_HALF_H);
          if (this.frame % 12 === 0) this.audio.skid();
        }
      }

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
      if (!pl.hurt) {
        if (left) {
          pl.xsp = Math.max(-TOP, pl.xsp - C.AIR_ACC);
          pl.facing = -1;
        } else if (right) {
          pl.xsp = Math.min(TOP, pl.xsp + C.AIR_ACC);
          pl.facing = 1;
        }
      }
      if (pl.jumping && !jumpHeld && pl.ysp < C.JUMP_CUT) pl.ysp = C.JUMP_CUT;
      if (pl.ysp < 0 && pl.ysp > -4) pl.xsp -= pl.xsp / 0.125 / 256;
      pl.ysp = Math.min(C.MAX_FALL, pl.ysp + C.GRAVITY);
    }

    const wasOnGround = pl.onGround;
    const prevFeet = pl.y + this.halfH();
    pl.x += pl.xsp;
    pl.y += pl.ysp;

    let minX = C.PLAYER_HALF_W;
    let maxX = this.level.width - C.PLAYER_HALF_W;
    if (this.boss?.locked && this.level.boss) {
      minX = this.level.boss.x + C.PLAYER_HALF_W;
      maxX = this.level.boss.x + this.level.boss.w - C.PLAYER_HALF_W;
    }
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

    if (pl.onGround) pl.runPhase += Math.abs(pl.gsp) * 0.09 + (Math.abs(pl.gsp) > 0.2 ? 0.05 : 0);
    else if (pl.rolling) pl.runPhase += 0.6;
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

  private platformPresent(p: PlatformEnt) {
    return p.gone === 0;
  }

  private collideSolids(prevFeet: number) {
    const pl = this.player;
    const hh = this.halfH();
    const hw = C.PLAYER_HALF_W;
    for (const p of this.platforms) {
      if (!p.solid || !this.platformPresent(p)) continue;
      const left = pl.x - hw;
      const right = pl.x + hw;
      const top = pl.y - hh;
      const bottom = pl.y + hh;
      if (right <= p.px || left >= p.px + p.w || bottom <= p.py || top >= p.py + p.h) continue;
      const prevHead = prevFeet - hh * 2;
      if (prevFeet <= p.py + 4 && pl.ysp >= 0) {
        pl.y = p.py - hh;
        this.land(p);
      } else if (prevHead >= p.py + p.h - 4 && pl.ysp < 0) {
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
      pl.gsp = pl.xsp;
      pl.onGround = true;
      pl.jumping = false;
      pl.chain = 0;
      if (pl.hurt) {
        pl.hurt = false;
        pl.gsp = 0;
      }
      this.setRolling(false);
      if (Math.abs(pl.ysp) > 6) this.emitDust(pl.x, pl.y + this.halfH());
    }
    pl.standingOn = platform;
    if (platform?.crumble && platform.crumbleTimer === 0) platform.crumbleTimer = 1;
    pl.ysp = 0;
  }

  private resolveSurface(wasOnGround: boolean, prevFeet: number) {
    const pl = this.player;
    const hh = this.halfH();
    const feet = pl.y + hh;
    const segs = this.level.segments;
    const gy = groundAtSegs(segs, pl.x);

    if (wasOnGround && pl.onGround) {
      const snap = Math.max(10, Math.abs(pl.gsp) + 4);
      let bestY: number | null = null;
      let bestPlat: PlatformEnt | null = null;
      for (const p of this.platforms) {
        if (!this.platformPresent(p)) continue;
        if (pl.x + C.PLAYER_HALF_W <= p.px || pl.x - C.PLAYER_HALF_W >= p.px + p.w) continue;
        if (Math.abs(p.py - feet) <= (p === pl.standingOn ? snap : 6) && (bestY === null || p.py < bestY)) {
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
        if (bestPlat !== pl.standingOn) this.land(bestPlat);
        pl.standingOn = bestPlat;
        pl.angle = bestPlat ? 0 : groundAngleSegs(segs, pl.x);
      }
      return;
    }

    if (!pl.onGround) {
      let landed = false;
      if (pl.ysp >= 0) {
        for (const p of this.platforms) {
          if (p.solid || !this.platformPresent(p)) continue;
          if (pl.x + C.PLAYER_HALF_W <= p.px || pl.x - C.PLAYER_HALF_W >= p.px + p.w) continue;
          if (prevFeet - p.prevPy <= 4 && feet >= p.py) {
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
        pl.angle = groundAngleSegs(segs, pl.x);
        this.land(null);
      }
    }
  }

  private checkLoopEntry() {
    const pl = this.player;
    if (!pl.onGround || pl.loop || Math.abs(pl.gsp) < C.LOOP_MIN_ENTRY) return;
    for (const loop of this.level.loops) {
      const surface = loop.cy + loop.r;
      if (Math.abs(pl.y + this.halfH() - surface) > 8) continue;
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
    const TOP = this.topSpeed();
    if (right && pl.gsp > 0 && pl.gsp < TOP) pl.gsp += this.acc();
    if (left && pl.gsp < 0 && pl.gsp > -TOP) pl.gsp -= this.acc();
    if (!pl.rolling) pl.gsp -= Math.min(Math.abs(pl.gsp), C.FRC * 0.5) * Math.sign(pl.gsp);
    pl.gsp -= C.LOOP_SLOPE * Math.sin(pl.loop.theta);
    pl.loop.theta += pl.gsp / rp;
    const th = pl.loop.theta;
    pl.runPhase += Math.abs(pl.gsp) * 0.09;

    const onUpperHalf = th > Math.PI / 2 && th < Math.PI * 1.5;
    if (Math.abs(pl.gsp) < C.LOOP_MIN_STICK && onUpperHalf) {
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
  // Collisions
  // ------------------------------------------------------------------
  private overlaps(x: number, y: number, w: number, h: number, pad = 0): boolean {
    const pl = this.player;
    const hh = this.halfH() + pad;
    const hw = C.PLAYER_HALF_W + pad;
    return pl.x + hw > x && pl.x - hw < x + w && pl.y + hh > y && pl.y - hh < y + h;
  }

  private isAttacking(): boolean {
    return this.player.rolling || this.player.jumping || this.player.invincible > 0;
  }

  private updateCollisions() {
    const pl = this.player;
    const L = this.level;

    for (const r of this.rings) {
      if (r.collected) {
        if (r.sparkle > 0) r.sparkle--;
        continue;
      }
      if (Math.abs(r.x - pl.x) < 300 && this.overlaps(r.x - 6, r.y - 6, 12, 12, 2)) {
        r.collected = true;
        r.sparkle = 16;
        this.levelRingsCollected++;
        this.addRing(r.x, r.y);
      }
    }
    for (const r of this.scatter) {
      if (r.life < C.RING_PICKUP_DELAY) continue;
      if (this.overlaps(r.x - 6, r.y - 6, 12, 12, 2)) {
        r.life = C.RING_LIFETIME + 1;
        this.addRing(r.x, r.y);
      }
    }

    if (pl.loop) return;

    for (const s of this.springs) {
      if (s.anim > 0) s.anim--;
      if (pl.ysp < 0 && !pl.onGround) continue;
      if (this.overlaps(s.x - 14, s.y - 4, 28, 14)) {
        pl.y = s.y - this.halfH();
        pl.ysp = s.strong ? C.SPRING_RED : C.SPRING_YELLOW;
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

    if (pl.invuln === 0 && pl.invincible === 0) {
      for (const sp of L.spikes) {
        if (this.overlaps(sp.x, sp.y - 2, sp.w, 12) && pl.y + this.halfH() >= sp.y - 4 && pl.ysp >= 0) {
          this.hurt(pl.x - pl.facing);
          break;
        }
      }
    }

    for (const m of this.monitors) {
      if (m.broken) {
        if (m.breakTimer > 0) m.breakTimer--;
        continue;
      }
      if (this.overlaps(m.x - 12, m.y - 24, 24, 24)) {
        if (this.isAttacking()) this.breakMonitor(m);
        else if (!pl.onGround && pl.ysp > 0 && pl.y + this.halfH() <= m.y - 18) {
          pl.y = m.y - 24 - this.halfH();
          this.land(null);
        }
      }
    }

    for (const c of this.checkpoints) {
      if (c.active) {
        c.spin += 0.3;
        continue;
      }
      if (this.overlaps(c.x - 8, c.y - 52, 16, 52)) {
        c.active = true;
        this.respawn = { x: c.x, y: c.y - C.PLAYER_HALF_H, time: this.time };
        this.audio.checkpoint();
        this.emitStars(c.x, c.y - 44, 8);
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.abs(e.x - pl.x) > 120) continue;
      const ex = e.x - e.w / 2;
      const ey = e.kind === "buzzer" || e.kind === "spikeball" || e.kind === "chopper" ? e.y - e.h / 2 : e.y - e.h;
      if (this.overlaps(ex, ey, e.w, e.h)) {
        if (e.kind === "spikeball") {
          if (pl.invuln === 0 && pl.invincible === 0) this.hurt(e.x);
        } else if (this.isAttacking()) {
          this.killEnemy(e);
        } else if (pl.invuln === 0) {
          this.hurt(e.x);
        }
      }
    }

    for (const pr of this.projectiles) {
      if (pr.life < 0) continue;
      if (Math.abs(pr.x - pl.x) > 40) continue;
      if (this.overlaps(pr.x - 4, pr.y - 4, 8, 8)) {
        if (pl.invincible > 0 || pl.shield) {
          pr.life = -1;
          this.emitPop(pr.x, pr.y, 4);
          if (pl.shield && pl.invincible === 0 && pl.invuln === 0) this.hurt(pr.x);
        } else if (pl.invuln === 0) {
          pr.life = -1;
          this.hurt(pr.x);
        }
      }
    }

    if (!this.goalPassed && pl.x >= L.goal.x && (!this.boss || this.boss.state === "gone")) this.passGoal();
  }

  private killEnemy(e: EnemyEnt) {
    const pl = this.player;
    e.alive = false;
    const idx = Math.min(pl.chain, C.SCORE_ENEMY_CHAIN.length - 1);
    const pts = C.SCORE_ENEMY_CHAIN[idx];
    if (!pl.onGround) pl.chain++;
    this.addScore(pts, e.x, e.y - 20);
    this.levelEnemies++;
    this.save.totalEnemies++;
    this.audio.pop();
    this.emitPop(e.x, e.y - e.h / 2, 10);
    this.particles.push({ kind: "boom", x: e.x, y: e.y - e.h / 2, xsp: 0, ysp: 0, life: 0, maxLife: 18, size: 14 });
    if (!pl.onGround && pl.invincible === 0) {
      if (pl.ysp > 0) pl.ysp = -pl.ysp;
      else pl.ysp = Math.min(pl.ysp, -3);
    }
  }

  private passGoal() {
    this.goalPassed = true;
    this.goalSpin = 1;
    this.clearTimer = 0;
    this.phase = "clear";
    this.audio.stopMusic();
    this.audio.goal();
    const tb = timeBonus(this.time);
    const rb = this.ringCount * C.SCORE_RING_BONUS;
    const perfect = this.levelRingsCollected >= this.level.rings.length;
    const pb = perfect ? C.SCORE_PERFECT_BONUS : 0;
    this.tally = {
      timeBonus: tb,
      ringBonus: rb,
      perfectBonus: pb,
      remainingTime: tb,
      remainingRing: rb,
      remainingPerfect: pb,
      done: false,
      visible: false,
      newRecord: false,
    };
  }

  private addRing(x: number, y: number) {
    this.ringCount++;
    this.save.totalRings++;
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
    if (points > 0) this.particles.push({ kind: "text", x, y, xsp: 0, ysp: -0.6, life: 0, maxLife: 40, size: 1, text: String(points) });
    if (this.score >= this.nextLifeScore) {
      this.nextLifeScore += C.SCORE_LIFE_EVERY;
      this.gainLife();
    }
  }

  private breakMonitor(m: MonitorEnt) {
    const pl = this.player;
    m.broken = true;
    m.breakTimer = 40;
    this.addScore(C.SCORE_MONITOR, m.x, m.y - 32);
    this.audio.monitor();
    this.emitPop(m.x, m.y - 12, 8);
    if (!pl.onGround && pl.ysp > 0) pl.ysp = -pl.ysp;
    this.applyMonitor(m.kind, m.x, m.y - 12);
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
      case "speed":
        this.player.speedShoes = 1200;
        this.showMessage("SPEED SHOES!", 60);
        break;
      case "invincible":
        this.player.invincible = 1200;
        this.showMessage("INVINCIBLE!", 60);
        break;
    }
  }

  private hurt(sourceX: number) {
    const pl = this.player;
    if (pl.invuln > 0 || pl.invincible > 0) return;
    if (pl.shield) {
      pl.shield = false;
      this.audio.hurt();
      this.particles.push({ kind: "shieldpop", x: pl.x, y: pl.y, xsp: 0, ysp: 0, life: 0, maxLife: 20, size: 22 });
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
    this.shake = 6;
  }

  private scatterRings() {
    const n = Math.min(this.ringCount, C.RING_SCATTER_MAX);
    let angle = (101.25 * Math.PI) / 180;
    let speed = 4;
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
        speed = 2;
        angle = (101.25 * Math.PI) / 180;
      }
    }
  }

  private die() {
    if (this.phase === "dying") return;
    const pl = this.player;
    this.phase = "dying";
    pl.loop = null;
    pl.ysp = -7;
    pl.xsp = 0;
    pl.onGround = false;
    pl.rolling = false;
    pl.spindash = -1;
    pl.hurt = true;
    pl.drawAngle = 0;
    pl.invincible = 0;
    pl.speedShoes = 0;
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
    if (pl.y > this.camera.y + C.VIEW_H + 40) {
      this.deathTimer++;
      if (this.deathTimer === 45) {
        this.lives--;
        if (this.lives < 0) {
          this.phase = "gameover";
          this.deathTimer = 0;
          this.endRun();
        } else {
          this.respawnPlayer();
        }
      }
    }
  }

  private endRun() {
    if (this.score > this.save.bestRun) this.save.bestRun = this.score;
    this.persist();
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
    this.updateProjectiles();
    this.updateScatterRings();
    this.updateParticles();
    this.updateCamera();

    if (this.clearTimer === 150) this.tally.visible = true;
    if (this.tally.visible && !this.tally.done && this.clearTimer > 200) {
      const t = this.tally;
      let moved = false;
      const drain = (key: "remainingTime" | "remainingRing" | "remainingPerfect") => {
        if (t[key] > 0) {
          const d = Math.min(100, t[key]);
          t[key] -= d;
          this.score += d;
          moved = true;
        }
      };
      drain("remainingTime");
      drain("remainingRing");
      drain("remainingPerfect");
      if (moved) {
        if (this.frame % 3 === 0) this.audio.tally();
      } else {
        t.done = true;
        this.audio.tallyDone();
        this.recordLevel();
      }
    }
    if (this.tally.done && input.startPressed) {
      if (this.levelIndex + 1 < LEVEL_COUNT) {
        this.pendingLevel = this.levelIndex + 1;
        this.fadeDir = 1;
        this.fade = 0;
        this.phase = "playing";
      } else {
        this.phase = "complete";
        this.deathTimer = 0;
        this.endRun();
      }
    }
  }

  private recordLevel() {
    const idx = this.levelIndex;
    const levelScore = this.tally.timeBonus + this.tally.ringBonus + this.tally.perfectBonus + this.levelEnemies * 100;
    const prev = this.save.best[idx];
    const perfect = this.tally.perfectBonus > 0;
    const better = !prev || levelScore > prev.score;
    if (better) {
      this.save.best[idx] = { score: levelScore, time: this.time, rings: this.ringCount, perfect };
      this.tally.newRecord = !!prev;
    } else if (this.time < prev.time) {
      this.save.best[idx] = { ...prev, time: this.time };
    }
    if (idx + 1 < LEVEL_COUNT && this.save.unlocked < idx + 2) this.save.unlocked = idx + 2;
    if (this.score > this.save.bestRun) this.save.bestRun = this.score;
    this.persist();
  }

  // ------------------------------------------------------------------
  // Enemies, projectiles, boss
  // ------------------------------------------------------------------
  private updateEnemies() {
    const segs = this.level.segments;
    const pl = this.player;
    const speedMul = 1 + this.levelIndex * 0.15;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.t++;
      if (e.cooldown > 0) e.cooldown--;
      switch (e.kind) {
        case "crawler": {
          const nx = e.x + e.dir * 1.0 * speedMul;
          const gy = groundAtSegs(segs, nx);
          if (gy === null || Math.abs(nx - e.x0) > e.range) e.dir = e.dir === 1 ? -1 : 1;
          else {
            e.x = nx;
            e.y = gy;
          }
          break;
        }
        case "buzzer": {
          if (e.pause > 0) {
            e.pause--;
          } else {
            e.x += e.dir * 1.5;
            if (Math.abs(e.x - e.x0) > e.range) e.dir = e.dir === 1 ? -1 : 1;
          }
          e.y = e.y0 + Math.sin(e.t * 0.08) * 4;
          if (e.shoots && e.cooldown === 0 && Math.abs(pl.x - e.x) < 110 && pl.y > e.y && pl.y - e.y < 140 && Math.sign(pl.x - e.x) === e.dir) {
            e.cooldown = 150;
            e.pause = 30;
            const dx = pl.x - e.x;
            const dy = pl.y - e.y;
            const len = Math.hypot(dx, dy) || 1;
            this.projectiles.push({ x: e.x, y: e.y + 6, xsp: (dx / len) * 2, ysp: (dy / len) * 2, life: 0, kind: "shot" });
            this.audio.shoot();
          }
          break;
        }
        case "crab": {
          if (e.pause > 0) e.pause--;
          else {
            const nx = e.x + e.dir * 0.5;
            const gy = groundAtSegs(segs, nx);
            if (gy === null || Math.abs(nx - e.x0) > e.range) {
              e.dir = e.dir === 1 ? -1 : 1;
              e.pause = 40;
            } else {
              e.x = nx;
              e.y = gy;
            }
          }
          if (e.shoots && e.cooldown === 0 && Math.abs(pl.x - e.x) < 140) {
            e.cooldown = 180;
            e.pause = 40;
            for (const d of [-1, 1] as const) this.projectiles.push({ x: e.x + d * 12, y: e.y - 14, xsp: d * 1.2, ysp: -3.2, life: 0, kind: "fireball" });
            this.audio.shoot();
          }
          break;
        }
        case "chopper": {
          if (e.t % 150 === 0) {
            e.vy = -5.5;
            this.emitSplash(e.x, WATER_Y, 4);
          }
          e.y += e.vy;
          e.vy += 0.125;
          if (e.y > e.y0 + 40) {
            e.y = e.y0 + 40;
            e.vy = 0;
          }
          break;
        }
        case "spikeball": {
          e.angle += 0.035;
          e.x = e.x0 + Math.cos(e.angle) * 46;
          e.y = e.y0 + Math.sin(e.angle) * 46;
          break;
        }
      }
    }
  }

  private updateProjectiles() {
    const segs = this.level.segments;
    for (const p of this.projectiles) {
      if (p.life < 0) continue;
      p.life++;
      if (p.kind === "fireball") p.ysp += 0.1;
      p.x += p.xsp;
      p.y += p.ysp;
      const gy = groundAtSegs(segs, p.x);
      if ((gy !== null && p.y >= gy) || p.life > 240 || p.y > this.level.height) {
        p.life = -1;
        if (gy !== null && p.y >= gy) this.emitPop(p.x, gy - 2, 3);
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life >= 0);
  }

  private updateBoss() {
    const b = this.boss;
    const arena = this.level.boss;
    if (!b || !arena) return;
    const pl = this.player;
    b.timer++;
    if (b.flash > 0) b.flash--;
    switch (b.state) {
      case "waiting":
        if (pl.x >= arena.x + 60 && pl.onGround) {
          b.state = "enter";
          b.locked = true;
          b.timer = 0;
          this.audio.startMusic(5);
          this.showMessage("WARNING!", 90);
        }
        break;
      case "enter":
        b.y += (arena.y - 120 - b.y) * 0.04;
        if (b.timer > 90) {
          b.state = "hover";
          b.timer = 0;
        }
        break;
      case "hover": {
        const hoverY = arena.y - 120 + Math.sin(b.timer * 0.05) * 6;
        b.y += (hoverY - b.y) * 0.1;
        const speed = 1.2 + b.hits * 0.15;
        b.x += b.dir * speed;
        if (b.x > arena.x + arena.w - 60) b.dir = -1;
        if (b.x < arena.x + 60) b.dir = 1;
        const interval = Math.max(90, 200 - b.hits * 12);
        if (b.timer > interval) {
          b.state = "dive";
          b.timer = 0;
          b.targetX = pl.x;
        }
        break;
      }
      case "dive": {
        b.x += (b.targetX - b.x) * 0.08;
        b.y += 3.2 + b.hits * 0.2;
        if (b.y >= arena.y - 26) {
          b.y = arena.y - 26;
          b.state = "rise";
          b.timer = 0;
          this.shake = 6;
          this.emitDust(b.x - 14, arena.y);
          this.emitDust(b.x + 14, arena.y);
        }
        break;
      }
      case "rise":
        if (b.timer > 20) b.y -= 2.5;
        if (b.y <= arena.y - 120) {
          b.state = "hover";
          b.timer = 0;
        }
        break;
      case "defeated":
        if (b.timer % 10 === 0 && b.timer < 120) {
          this.particles.push({ kind: "boom", x: b.x + (Math.random() - 0.5) * 50, y: b.y + (Math.random() - 0.5) * 30, xsp: 0, ysp: 0, life: 0, maxLife: 20, size: 16 });
          this.audio.explosion();
        }
        if (b.timer > 120) {
          b.y -= 3;
          b.x += 2;
        }
        if (b.timer > 200) {
          b.state = "gone";
          b.locked = false;
          this.audio.startMusic(this.level.music);
        }
        break;
      case "gone":
        break;
    }

    if (b.state === "hover" || b.state === "dive" || b.state === "rise") {
      const bw = 44;
      const bh = 30;
      if (this.overlaps(b.x - bw / 2, b.y - bh / 2, bw, bh)) {
        if (this.isAttacking() && b.flash === 0) {
          b.hits++;
          b.flash = 45;
          this.audio.bossHit();
          this.emitPop(pl.x, pl.y, 6);
          this.shake = 4;
          if (!pl.onGround) {
            if (pl.ysp > 0) pl.ysp = -pl.ysp * 0.8;
            else pl.ysp = Math.min(pl.ysp, -3);
          }
          if (b.hits >= C.BOSS_HITS) {
            b.state = "defeated";
            b.timer = 0;
            b.flash = 0;
            this.addScore(C.SCORE_BOSS, b.x, b.y - 30);
            this.audio.explosion();
          } else this.addScore(C.SCORE_BOSS_HIT, b.x, b.y - 30);
        } else if (b.flash === 0 && pl.invuln === 0) {
          this.hurt(b.x);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Rings, particles, camera
  // ------------------------------------------------------------------
  private updateScatterRings() {
    const segs = this.level.segments;
    for (const r of this.scatter) {
      r.life++;
      r.ysp += C.RING_GRAVITY;
      r.x += r.xsp;
      r.y += r.ysp;
      if (r.ysp > 0) {
        const gy = groundAtSegs(segs, r.x);
        if (gy !== null && r.y + 6 >= gy) {
          r.y = gy - 6;
          r.ysp *= -0.75;
        }
      }
    }
    this.scatter = this.scatter.filter((r) => r.life <= C.RING_LIFETIME && r.y < this.level.height + 20);
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
      this.particles.push({ kind: "dust", x: x + (Math.random() - 0.5) * 6, y, xsp: (Math.random() - 0.5), ysp: -Math.random(), life: 0, maxLife: 18 + Math.random() * 8, size: 3 + Math.random() * 3 });
    }
  }

  private emitSmoke(x: number, y: number, dir: number) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({ kind: "smoke", x, y: y + (Math.random() - 0.5) * 6, xsp: dir * (0.6 + Math.random() * 1.2), ysp: -Math.random() * 0.6, life: 0, maxLife: 16 + Math.random() * 10, size: 3 + Math.random() * 4 });
    }
  }

  private emitSparks(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.random();
      this.particles.push({ kind: "spark", x, y, xsp: Math.cos(a) * 1.2, ysp: Math.sin(a) * 1.2, life: 0, maxLife: 14, size: 2 });
    }
  }

  private emitPop(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.push({ kind: "pop", x, y, xsp: Math.cos(a) * 1.8, ysp: Math.sin(a) * 1.8 - 0.6, life: 0, maxLife: 24, size: 2.5, gravity: 0.08 });
    }
  }

  private emitStars(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.particles.push({ kind: "star", x, y, xsp: Math.cos(a) * 1.4, ysp: Math.sin(a) * 1.4, life: 0, maxLife: 30, size: 3 });
    }
  }

  private emitInvStar(x: number, y: number) {
    const a = Math.random() * Math.PI * 2;
    this.particles.push({ kind: "invstar", x: x + Math.cos(a) * 16, y: y + Math.sin(a) * 16, xsp: Math.cos(a) * 0.5, ysp: Math.sin(a) * 0.5, life: 0, maxLife: 20, size: 3 });
  }

  private emitSplash(x: number, y: number, n = 8) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ kind: "splash", x: x + (Math.random() - 0.5) * 12, y, xsp: (Math.random() - 0.5) * 2.5, ysp: -2 - Math.random() * 2.5, life: 0, maxLife: 30, size: 2, gravity: 0.15 });
    }
  }

  private emitDebris(x: number, y: number, w: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({ kind: "debris", x: x + (Math.random() - 0.5) * w, y, xsp: (Math.random() - 0.5) * 1.5, ysp: Math.random() * 0.5, life: 0, maxLife: 40, size: 4, gravity: 0.2 });
    }
  }

  private updateCamera() {
    const pl = this.player;
    const cam = this.camera;
    const lookahead = pl.facing * Math.min(Math.abs(pl.gsp), 6) * 6;
    const targetX = pl.x - C.VIEW_W / 2 + lookahead;
    cam.x += (targetX - cam.x) * 0.18;

    const targetY = pl.y - C.VIEW_H * 0.6;
    if (pl.onGround || pl.loop) {
      cam.y += (targetY - cam.y) * 0.16;
    } else {
      const rel = pl.y - cam.y;
      if (rel < 70) cam.y += (rel - 70) * 0.5;
      else if (rel > 200) cam.y += (rel - 200) * 0.5;
    }
    this.clampCamera();
  }

  get timeString(): string {
    return formatTime(this.time);
  }

  get levelCount(): number {
    return LEVEL_COUNT;
  }
}
