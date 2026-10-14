/**
 * Pixel sprite pipeline. Vector drawing routines are rendered once at 1x into
 * small canvases, then post-processed into crisp pixel art: alpha is snapped,
 * colours are quantised to the 8-level-per-channel Mega Drive palette, and a
 * one pixel dark outline is grown around the silhouette.
 */
export interface Sprite {
  c: HTMLCanvasElement;
  ox: number;
  oy: number;
  w: number;
  h: number;
}

const cache = new Map<string, Sprite>();
const LEVELS = [0, 36, 72, 109, 145, 182, 219, 255];

function quant(v: number): number {
  let best = 0;
  let bd = 999;
  for (const l of LEVELS) {
    const d = Math.abs(l - v);
    if (d < bd) {
      bd = d;
      best = l;
    }
  }
  return best;
}

export interface SpriteOpts {
  outline?: string | null;
  quantize?: boolean;
  threshold?: number;
}

export function pixelSprite(key: string, w: number, h: number, ox: number, oy: number, draw: (g: CanvasRenderingContext2D) => void, opts: SpriteOpts = {}): Sprite {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.save();
  g.translate(ox, oy);
  draw(g);
  g.restore();
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const th = opts.threshold ?? 110;
  const q = opts.quantize !== false;
  const opaque = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3] < th) {
      d[i + 3] = 0;
      continue;
    }
    d[i + 3] = 255;
    opaque[p] = 1;
    if (q) {
      d[i] = quant(d[i]);
      d[i + 1] = quant(d[i + 1]);
      d[i + 2] = quant(d[i + 2]);
    }
  }
  const outline = opts.outline === undefined ? "#10142a" : opts.outline;
  if (outline) {
    const r = parseInt(outline.slice(1, 3), 16);
    const gg = parseInt(outline.slice(3, 5), 16);
    const b = parseInt(outline.slice(5, 7), 16);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (opaque[p]) continue;
        const n = (x > 0 && opaque[p - 1]) || (x < w - 1 && opaque[p + 1]) || (y > 0 && opaque[p - w]) || (y < h - 1 && opaque[p + w]);
        if (n) {
          const i = p * 4;
          d[i] = r;
          d[i + 1] = gg;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }
    }
  }
  g.putImageData(img, 0, 0);
  const s = { c, ox, oy, w, h };
  cache.set(key, s);
  return s;
}

/** Draw a sprite with its origin at (x, y). Rotation is snapped to 22.5 degree steps. */
export function blit(g: CanvasRenderingContext2D, s: Sprite, x: number, y: number, flip = false, angle = 0, alpha = 1) {
  const a = Math.round(angle / (Math.PI / 8)) * (Math.PI / 8);
  if (!flip && a === 0 && alpha === 1) {
    g.drawImage(s.c, Math.round(x) - s.ox, Math.round(y) - s.oy);
    return;
  }
  g.save();
  g.globalAlpha = alpha;
  g.translate(Math.round(x), Math.round(y));
  if (a !== 0) g.rotate(a);
  if (flip) g.scale(-1, 1);
  g.drawImage(s.c, -s.ox, -s.oy);
  g.restore();
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
export const PAL = {
  K: "#0a2a34", // dark outline teal
  B: "#1aa8c8", // body teal
  Bd: "#0f7a98",
  Bl: "#6ae0f0",
  S: "#f6d6a0",
  Sd: "#d8a860",
  W: "#ffffff",
  Wd: "#c4c8d8",
  R: "#ff7a1a", // shoes orange
  Rd: "#b84a08",
  Rl: "#ffb070",
  Y: "#ffe040",
  E: "#101010",
  G: "#d88a10", // amber iris
  Gl: "#40c060",
};

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
export type HeroPose = "idle" | "blink" | "look" | "crouch" | "skid" | "air" | "spring" | "hurt" | "dead" | "run0" | "run1" | "run2" | "run3" | "run4" | "run5" | "fast0" | "fast1" | "fast2" | "fast3" | "push0" | "push1";

interface PoseDef {
  legs: [number, number, number][]; // foot x, foot y, tilt
  arm: [number, number]; // glove x,y
  armBack?: [number, number];
  by: number; // body y offset (crouch)
  face: "normal" | "blink" | "dead" | "hurt" | "lookup" | "smile" | "grit";
  lean: number;
  fast?: number;
}

const RUN: [number, number, number][][] = [
  [[10, 17, 0.1], [-9, 13, -0.7]],
  [[6, 18, 0], [-5, 9, -1.0]],
  [[0, 18, -0.1], [1, 7, -0.9]],
  [[-6, 16, -0.3], [8, 12, 0.5]],
  [[-9, 13, -0.7], [10, 17, 0.1]],
  [[-5, 9, -1.0], [6, 18, 0]],
];

function poseDef(p: HeroPose): PoseDef {
  switch (p) {
    case "idle":
      return { legs: [[-4, 18, 0], [5, 18, 0]], arm: [9, 10], by: 0, face: "normal", lean: 0 };
    case "blink":
      return { legs: [[-4, 18, 0], [5, 18, 0]], arm: [9, 10], by: 0, face: "blink", lean: 0 };
    case "look":
      return { legs: [[-4, 18, 0], [5, 18, 0]], arm: [8, 11], by: 0, face: "lookup", lean: 0 };
    case "crouch":
      return { legs: [[-7, 18, 0], [7, 18, 0]], arm: [8, 14], by: 6, face: "normal", lean: 0 };
    case "skid":
      return { legs: [[-9, 18, -0.2], [6, 18, 0.2]], arm: [-9, 4], by: 1, face: "grit", lean: -0.3 };
    case "air":
      return { legs: [[-5, 13, 0.5], [6, 17, -0.2]], arm: [13, 3], by: 0, face: "normal", lean: 0 };
    case "spring":
      return { legs: [[-3, 17, -0.2], [4, 19, 0.2]], arm: [7, -13], armBack: [-6, -11], by: 0, face: "smile", lean: 0 };
    case "hurt":
      return { legs: [[-6, 15, -0.4], [6, 16, 0.4]], arm: [13, -9], armBack: [-12, -8], by: 0, face: "hurt", lean: 0 };
    case "dead":
      return { legs: [[-6, 15, -0.4], [6, 15, 0.4]], arm: [12, -10], armBack: [-12, -10], by: 0, face: "dead", lean: 0 };
    case "push0":
      return { legs: [[-8, 18, 0], [3, 18, 0]], arm: [13, 2], armBack: [12, 8], by: 1, face: "grit", lean: 0.3 };
    case "push1":
      return { legs: [[-6, 18, 0], [5, 18, 0]], arm: [14, 3], armBack: [12, 7], by: 1, face: "grit", lean: 0.3 };
    default: {
      if (p.startsWith("fast")) return { legs: [], arm: [12, 6], by: 0, face: "normal", lean: 0.35, fast: Number(p[4]) };
      const i = Number(p[3]);
      const sw = Math.sin((i / 6) * Math.PI * 2);
      return { legs: RUN[i], arm: [7 + sw * 7, 7 - sw * 4], by: 0, face: "normal", lean: 0.2 };
    }
  }
}

function heroDraw(g: CanvasRenderingContext2D, d: PoseDef) {
  const { K, B, Bd, Bl, S, Sd, W, Wd, R, Rd, Rl, Y, E, G } = PAL;
  const by = d.by;
  g.lineCap = "round";
  g.lineJoin = "round";

  const stroke = (x0: number, y0: number, x1: number, y1: number, w: number, c: string) => {
    g.strokeStyle = c;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  };
  const ell = (x: number, y: number, rx: number, ry: number, c: string, rot = 0) => {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  };
  const shoe = (fx: number, fy: number, tilt: number) => {
    g.save();
    g.translate(fx, fy);
    g.rotate(tilt);
    // sock
    ell(-1, -4, 3.5, 2.5, K);
    ell(-1, -4, 2.5, 1.5, W);
    // sole
    ell(2, 1.5, 8.5, 3.2, K);
    ell(2, 1.5, 7.5, 2.2, "#5a5a66");
    // upper
    ell(2, -1, 8, 4, K);
    ell(2, -1, 7, 3.2, R);
    ell(0, -2.5, 4, 1.4, Rl);
    g.fillStyle = Rd;
    g.fillRect(-5, 0, 14, 1.5);
    // yellow stripe and buckle
    g.fillStyle = Y;
    g.fillRect(-4, -2.2, 12, 1.6);
    g.fillStyle = W;
    g.fillRect(-1, -4.6, 6, 2);
    g.fillStyle = Wd;
    g.fillRect(-1, -2.8, 6, 0.6);
    g.restore();
  };
  const leg = (fx: number, fy: number) => {
    const hx = fx * 0.35;
    stroke(hx, 5 + by, fx, fy - 3, 6, K);
    stroke(hx, 5 + by, fx, fy - 3, 4, B);
    stroke(hx - 1, 5 + by, fx - 1, fy - 4, 1.2, Bl);
  };
  const glove = (x: number, y: number, sx: number, sy: number) => {
    stroke(sx, sy, x, y, 5.5, K);
    stroke(sx, sy, x, y, 3.2, S);
    // cuff
    const a = Math.atan2(y - sy, x - sx);
    const cx = x - Math.cos(a) * 4;
    const cy = y - Math.sin(a) * 4;
    ell(cx, cy, 3.6, 2.6, K, a);
    ell(cx, cy, 2.8, 1.8, Wd, a);
    ell(x, y, 4.8, 4.8, K);
    ell(x, y, 3.8, 3.8, W);
    g.fillStyle = Wd;
    g.fillRect(x - 2, y + 1.5, 4, 1);
  };
  const quill = (qx: number, qy: number, len: number, ang: number, thick: number) => {
    g.save();
    g.translate(qx, qy);
    g.rotate(ang);
    g.fillStyle = K;
    g.beginPath();
    g.moveTo(1, -thick - 1);
    g.lineTo(-len - 1.5, 0.5);
    g.lineTo(1, thick + 1);
    g.closePath();
    g.fill();
    g.fillStyle = B;
    g.beginPath();
    g.moveTo(1, -thick);
    g.lineTo(-len, 0.5);
    g.lineTo(1, thick);
    g.closePath();
    g.fill();
    g.fillStyle = Bd;
    g.beginPath();
    g.moveTo(0, thick * 0.1);
    g.lineTo(-len + 1, 0.5);
    g.lineTo(0, thick);
    g.closePath();
    g.fill();
    g.fillStyle = Bl;
    g.beginPath();
    g.moveTo(-1, -thick + 1);
    g.lineTo(-len * 0.75, -0.5);
    g.lineTo(-1, -thick * 0.3);
    g.closePath();
    g.fill();
    g.restore();
  };

  // ---- back arm ----
  if (d.armBack) glove(d.armBack[0], d.armBack[1], -2, 2 + by);

  // ---- legs ----
  if (d.fast !== undefined) {
    const f = d.fast;
    // figure-eight blur: two red streaks and sock flashes
    g.fillStyle = K;
    g.beginPath();
    g.ellipse(1, 15, 13, 5.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = R;
    g.beginPath();
    g.ellipse(1, 15, 12, 4.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = Rl;
    g.fillRect(-9 + f * 5, 12, 5, 1.5);
    g.fillStyle = W;
    g.fillRect(-6 + ((f * 7) % 14), 14, 3, 2);
    g.fillRect(4 - ((f * 5) % 12), 16.5, 3, 1.5);
    g.fillStyle = Bd;
    g.beginPath();
    g.ellipse(-1, 9, 7, 3.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = B;
    g.beginPath();
    g.ellipse(-1, 8.5, 6, 2.5, 0, 0, Math.PI * 2);
    g.fill();
  } else {
    for (const [fx, fy, tilt] of d.legs) {
      leg(fx, fy);
      shoe(fx, fy, tilt);
    }
  }

  // ---- quills ----
  const L = d.lean;
  quill(-7, -14 + by, 15, -0.62 + L, 3.6);
  quill(-9, -9 + by, 17, -0.22 + L, 3.8);
  quill(-9, -3 + by, 16, 0.2 + L, 3.8);
  quill(-7, 3 + by, 13, 0.62 + L, 3.4);
  quill(-4, 8 + by, 9, 1.0 + L, 2.8);

  // ---- torso ----
  ell(0, 4 + by, 8, 9, K);
  ell(0, 4 + by, 7, 8, B);
  ell(2, 5 + by, 5, 6.5, S);
  ell(2.5, 8 + by, 3.5, 2.5, Sd);
  ell(1, 3 + by, 2.5, 2, "#fbe0b8");

  // ---- head ----
  ell(0, -8 + by, 12.5, 12.5, K);
  ell(0, -8 + by, 11.5, 11.5, B);
  // shade crescent lower-right and highlight upper-left
  g.save();
  g.beginPath();
  g.arc(0, -8 + by, 11.5, 0, Math.PI * 2);
  g.clip();
  ell(3, -4 + by, 11, 11, Bd);
  ell(0, -8 + by, 10, 10, B);
  ell(-4, -13 + by, 5, 3.5, Bl, -0.5);
  g.restore();
  // signature lightning-bolt marking on the forehead
  g.fillStyle = Y;
  g.beginPath();
  g.moveTo(0, -18 + by);
  g.lineTo(-2.5, -13 + by);
  g.lineTo(-0.5, -13 + by);
  g.lineTo(-2.5, -8.5 + by);
  g.lineTo(1.5, -14 + by);
  g.lineTo(-0.5, -14 + by);
  g.closePath();
  g.fill();
  // ears
  for (const ex of [-6, 5]) {
    g.fillStyle = K;
    g.beginPath();
    g.moveTo(ex - 4, -15 + by);
    g.lineTo(ex - 0.5, -25 + by);
    g.lineTo(ex + 3.5, -15 + by);
    g.closePath();
    g.fill();
    g.fillStyle = B;
    g.beginPath();
    g.moveTo(ex - 3, -16 + by);
    g.lineTo(ex - 0.5, -23.5 + by);
    g.lineTo(ex + 2.5, -16 + by);
    g.closePath();
    g.fill();
    g.fillStyle = Sd;
    g.beginPath();
    g.moveTo(ex - 1.5, -16.5 + by);
    g.lineTo(ex - 0.5, -21 + by);
    g.lineTo(ex + 1.2, -16.5 + by);
    g.closePath();
    g.fill();
  }
  // muzzle
  ell(7.5, -2.5 + by, 7, 5.2, K);
  ell(7.5, -2.5 + by, 6.2, 4.4, S);
  ell(8, -0.5 + by, 4.5, 1.8, Sd);
  ell(6, -4.5 + by, 2.5, 1.2, "#fbe0b8");
  // eye
  const lu = d.face === "lookup" ? -2 : 0;
  ell(6, -10.5 + by + lu, 5.8, 7.5, K, 0.12);
  ell(6, -10.5 + by + lu, 5, 6.7, W, 0.12);
  if (d.face === "blink") {
    ell(6, -10 + by, 5.2, 6.8, B, 0.12);
    stroke(2, -8 + by, 10, -8.5 + by, 1.5, K);
  } else if (d.face === "dead") {
    stroke(3, -14 + by, 9, -7 + by, 1.6, E);
    stroke(9, -14 + by, 3, -7 + by, 1.6, E);
  } else {
    const gx = d.face === "hurt" ? 7 : 8;
    ell(gx, -9.5 + by + lu, 2.3, 3.6, G);
    ell(gx + 0.4, -9.3 + by + lu, 1.3, 2.5, E);
    g.fillStyle = W;
    g.fillRect(gx - 1, -12.5 + by + lu, 1.5, 1.5);
    g.fillRect(gx + 1, -8.5 + by + lu, 1, 1);
    if (d.face === "grit" || d.face === "hurt") stroke(2, -16 + by, 10, -14 + by, 1.6, K);
  }
  // nose
  ell(14, -4.5 + by, 2.6, 1.9, E);
  g.fillStyle = "#777";
  g.fillRect(12.8, -5.6 + by, 1, 1);
  // mouth
  if (d.face === "hurt" || d.face === "dead") {
    ell(10, 1 + by, 2.8, 2.2, K);
    ell(10, 1.2 + by, 2, 1.4, "#802020");
  } else if (d.face === "smile") {
    g.strokeStyle = K;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(9.5, 0 + by, 3, 0.1, Math.PI - 0.4);
    g.stroke();
  } else if (d.face === "grit") {
    g.fillStyle = K;
    g.fillRect(7, 0 + by, 6, 1.4);
    g.fillStyle = W;
    g.fillRect(8, 0.2 + by, 4, 1);
  } else {
    stroke(9, 0.5 + by, 12, 0 + by, 1.1, K);
  }

  // ---- front arm ----
  glove(d.arm[0], d.arm[1], 3, 2 + by);
}

export function heroSprite(pose: HeroPose): Sprite {
  return pixelSprite(`hero:${pose}`, 60, 56, 30, 30, (g) => heroDraw(g, poseDef(pose)));
}

export function heroBall(frame: number): Sprite {
  return pixelSprite(`heroball:${frame}`, 36, 36, 18, 18, (g) => {
    const { K, B, Bd, Bl, S, R, Y } = PAL;
    const r = 13;
    g.rotate((frame / 4) * (Math.PI / 3));
    g.fillStyle = K;
    g.beginPath();
    g.arc(0, 0, r + 1, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = B;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    // six quill wedges around
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillStyle = K;
      g.beginPath();
      g.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
      g.lineTo(Math.cos(a + 0.42) * (r + 0.5), Math.sin(a + 0.42) * (r + 0.5));
      g.lineTo(Math.cos(a + 0.75) * 5, Math.sin(a + 0.75) * 5);
      g.closePath();
      g.fill();
      g.fillStyle = Bd;
      g.beginPath();
      g.moveTo(Math.cos(a + 0.05) * 4, Math.sin(a + 0.05) * 4);
      g.lineTo(Math.cos(a + 0.42) * (r - 1), Math.sin(a + 0.42) * (r - 1));
      g.lineTo(Math.cos(a + 0.6) * 6, Math.sin(a + 0.6) * 6);
      g.closePath();
      g.fill();
      g.fillStyle = Bl;
      g.beginPath();
      g.moveTo(Math.cos(a + 0.12) * 5, Math.sin(a + 0.12) * 5);
      g.lineTo(Math.cos(a + 0.2) * (r - 3), Math.sin(a + 0.2) * (r - 3));
      g.lineTo(Math.cos(a + 0.3) * 6, Math.sin(a + 0.3) * 6);
      g.closePath();
      g.fill();
    }
    g.fillStyle = S;
    g.beginPath();
    g.arc(4, 3, 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = R;
    g.beginPath();
    g.arc(-5, 7, 3.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = Y;
    g.fillRect(-6, 6, 3, 1.2);
    g.fillRect(-2, -8, 1.5, 4);
    g.fillRect(-3, -5, 1.5, 3);
  });
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------
export function crawlerSprite(frame: number): Sprite {
  return pixelSprite(`crawler:${frame}`, 40, 34, 20, 30, (g) => {
    // treads
    g.fillStyle = "#1a1a22";
    g.beginPath();
    g.roundRect(-12, -8, 24, 8, 3);
    g.fill();
    g.fillStyle = "#4a4a56";
    for (let i = 0; i < 5; i++) g.fillRect(-11 + ((i * 5 + frame * 2) % 23), -7, 2, 6);
    g.fillStyle = "#6a6a78";
    g.fillRect(-12, -8, 24, 1.5);
    // axle hub
    g.fillStyle = "#8a8a96";
    g.beginPath();
    g.arc(-5, -4, 2, 0, Math.PI * 2);
    g.arc(5, -4, 2, 0, Math.PI * 2);
    g.fill();
    // body shell
    g.fillStyle = "#7a1212";
    g.beginPath();
    g.ellipse(0, -14, 14, 8.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e83838";
    g.beginPath();
    g.ellipse(0, -15, 13, 7.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff8a8a";
    g.beginPath();
    g.ellipse(-4, -18.5, 6, 2.2, 0, 0, Math.PI * 2);
    g.fill();
    // shell seam and spots
    g.fillStyle = "#7a1212";
    g.fillRect(-1, -22, 1.5, 9);
    g.fillRect(-9, -14, 2, 2);
    g.fillRect(-4, -11, 2, 2);
    g.fillRect(5, -12, 2, 2);
    // face
    g.fillStyle = "#1a1a22";
    g.beginPath();
    g.ellipse(10, -14, 5, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(11, -15, 3, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#101010";
    g.fillRect(11.5, -16, 2, 2.5);
    // antenna
    g.fillStyle = "#1a1a22";
    g.fillRect(9, -24, 1.2, 5);
    g.fillRect(9, -26 + (frame % 2), 4, 2);
    // exhaust pipe
    g.fillStyle = "#4a4a56";
    g.fillRect(-16, -13, 4, 3);
  });
}

export function buzzerSprite(frame: number): Sprite {
  return pixelSprite(`buzzer:${frame}`, 44, 30, 22, 15, (g) => {
    const up = frame % 2 === 0;
    // wings
    g.fillStyle = "#d8ecff";
    g.beginPath();
    g.ellipse(-3, up ? -10 : -7, 10, 3.2, up ? -0.35 : 0.15, 0, Math.PI * 2);
    g.ellipse(5, up ? -10 : -7, 10, 3.2, up ? 0.35 : -0.15, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#8ab0d8";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-3, up ? -10 : -7);
    g.lineTo(-12, up ? -13 : -8);
    g.moveTo(5, up ? -10 : -7);
    g.lineTo(14, up ? -13 : -8);
    g.stroke();
    // body
    g.fillStyle = "#ffca28";
    g.beginPath();
    g.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffe680";
    g.beginPath();
    g.ellipse(2, -3, 7, 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a1a22";
    g.fillRect(-9, -6.5, 3.5, 13);
    g.fillRect(-3, -6.5, 3.5, 13);
    g.fillRect(3, -5.5, 2.5, 11);
    // stinger
    g.fillStyle = "#4a4a56";
    g.beginPath();
    g.moveTo(-12, 1);
    g.lineTo(-20, 5);
    g.lineTo(-12, 5);
    g.closePath();
    g.fill();
    // head
    g.fillStyle = "#2a2a36";
    g.beginPath();
    g.arc(12, -1, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff5050";
    g.fillRect(12, -3, 3.5, 3);
    g.fillStyle = "#fff";
    g.fillRect(13.5, -3, 1, 1);
    // antennae
    g.strokeStyle = "#2a2a36";
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(13, -5);
    g.lineTo(16, -9);
    g.moveTo(11, -5);
    g.lineTo(12, -9);
    g.stroke();
    // legs
    g.fillStyle = "#2a2a36";
    g.fillRect(-4, 5, 1.5, 4);
    g.fillRect(2, 5, 1.5, 4);
    g.fillRect(7, 4, 1.5, 4);
  });
}

export function crabSprite(frame: number): Sprite {
  return pixelSprite(`crab:${frame}`, 48, 34, 24, 30, (g) => {
    const open = frame === 1;
    const legPhase = frame === 1 ? 2 : frame === 2 ? -2 : 0;
    g.fillStyle = "#7a1212";
    for (const i of [-1, 1]) for (let k = 0; k < 3; k++) g.fillRect(i * (5 + k * 4) - 1, -8, 2, 8 + (k % 2 ? legPhase : -legPhase));
    // shell
    g.fillStyle = "#7a1212";
    g.beginPath();
    g.ellipse(0, -12, 15, 8.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e83838";
    g.beginPath();
    g.ellipse(0, -13, 14, 7.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ff8a8a";
    g.fillRect(-8, -17, 16, 2);
    g.fillStyle = "#7a1212";
    g.fillRect(-10, -12, 20, 1.2);
    g.fillRect(-6, -9, 12, 1.2);
    // claws
    for (const dd of [-1, 1]) {
      g.fillStyle = "#c62828";
      g.beginPath();
      g.arc(dd * 19, -14, 5.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#7a1212";
      g.fillRect(dd * 19 - (dd > 0 ? 0 : 7), -18 - (open ? 3 : 0), 7, 2.5);
      g.fillRect(dd * 19 - (dd > 0 ? 0 : 7), -11 + (open ? 3 : 0), 7, 2.5);
      g.fillStyle = "#ff8a8a";
      g.fillRect(dd * 19 - 1, -16, 2, 1.5);
    }
    // eye stalks
    g.fillStyle = "#2a2a36";
    g.fillRect(-5, -23, 1.5, 6);
    g.fillRect(4, -23, 1.5, 6);
    g.fillStyle = "#fff";
    g.fillRect(-7, -27, 5, 5);
    g.fillRect(3, -27, 5, 5);
    g.fillStyle = "#101010";
    g.fillRect(-6, -26, 2.5, 2.5);
    g.fillRect(4, -26, 2.5, 2.5);
  });
}

export function chopperSprite(frame: number): Sprite {
  return pixelSprite(`chopper:${frame}`, 30, 36, 15, 18, (g) => {
    g.rotate(frame === 0 ? -0.3 : 0.4);
    g.fillStyle = "#7a1212";
    g.beginPath();
    g.ellipse(0, 0, 8.5, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e83838";
    g.beginPath();
    g.ellipse(0, 0, 7.5, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffb0b0";
    g.beginPath();
    g.ellipse(2.5, 3, 3.5, 6, 0, 0, Math.PI * 2);
    g.fill();
    // scales
    g.fillStyle = "#c62828";
    for (let y = -6; y < 6; y += 3) for (let x = -5; x < 2; x += 3) g.fillRect(x + (y % 2 ? 1 : 0), y, 1.5, 1.5);
    // fins
    g.fillStyle = "#c62828";
    g.beginPath();
    g.moveTo(-3, 10);
    g.lineTo(-9, 17);
    g.lineTo(3, 16);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(-8, -2);
    g.lineTo(-12, 4);
    g.lineTo(-6, 5);
    g.closePath();
    g.fill();
    g.fillRect(-2, -13, 4, 3);
    // eye and teeth
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(2, -7, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#101010";
    g.fillRect(2.5, -8, 2, 2);
    g.fillStyle = "#101010";
    g.fillRect(2, -2, 6.5, 1.5);
    g.fillStyle = "#fff";
    g.fillRect(3, -1, 1.2, 2);
    g.fillRect(5.5, -1, 1.2, 2);
  });
}

export function spikeballSprite(): Sprite {
  return pixelSprite("spikeball", 28, 28, 14, 14, (g) => {
    g.fillStyle = "#d0d0d8";
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a - 0.25) * 7, Math.sin(a - 0.25) * 7);
      g.lineTo(Math.cos(a) * 12.5, Math.sin(a) * 12.5);
      g.lineTo(Math.cos(a + 0.25) * 7, Math.sin(a + 0.25) * 7);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#3a3a44";
    g.beginPath();
    g.arc(0, 0, 7.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#6a6a76";
    g.beginPath();
    g.arc(0, 0, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#a0a0ac";
    g.beginPath();
    g.arc(-2, -2, 2.5, 0, Math.PI * 2);
    g.fill();
  });
}

export function bossSprite(frame: number, flash: boolean): Sprite {
  return pixelSprite(`boss:${frame}:${flash}`, 70, 60, 35, 30, (g) => {
    const f = (c: string) => (flash ? "#ffffff" : c);
    // propeller
    g.fillStyle = f("#333");
    g.fillRect(-2, -27, 4, 9);
    g.fillStyle = f("#c8ccd8");
    const pw = frame % 2 === 0 ? 24 : 10;
    g.fillRect(-pw, -29, pw * 2, 2.5);
    // pod
    g.fillStyle = f("#6a6e80");
    g.beginPath();
    g.ellipse(0, 3, 24, 15, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = f("#9a9eb0");
    g.beginPath();
    g.ellipse(0, 1, 22, 12, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = f("#c8ccd8");
    g.beginPath();
    g.ellipse(-3, -3, 18, 6, 0, Math.PI, 0);
    g.fill();
    // rivets and panel line
    g.fillStyle = f("#3a3e50");
    for (let i = -18; i <= 18; i += 6) g.fillRect(i, 9, 1.5, 1.5);
    g.fillRect(-22, 5, 44, 1);
    // cockpit dome
    g.fillStyle = f("#8fd0ff");
    g.beginPath();
    g.arc(0, -8, 13, Math.PI, 0);
    g.fill();
    g.fillStyle = f("#d8f0ff");
    g.beginPath();
    g.arc(-4, -12, 5, Math.PI, 0);
    g.fill();
    if (!flash) {
      // original villain: round goggles, big orange moustache, red coat
      g.fillStyle = "#f5c6a0";
      g.beginPath();
      g.arc(0, -11, 7, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#3a3e50";
      g.beginPath();
      g.arc(-3, -13, 2.5, 0, Math.PI * 2);
      g.arc(3, -13, 2.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#8fd0ff";
      g.fillRect(-4, -14, 1.5, 1.5);
      g.fillRect(2, -14, 1.5, 1.5);
      g.fillStyle = "#c8601a";
      g.fillRect(-8, -10, 16, 4);
      g.fillRect(-9, -9, 2, 2);
      g.fillRect(7, -9, 2, 2);
      g.fillStyle = "#b71c1c";
      g.fillRect(-9, -5, 18, 5);
      g.fillStyle = "#ffd040";
      g.fillRect(-2, -4, 1.5, 1.5);
      g.fillRect(1, -4, 1.5, 1.5);
    }
    // undercarriage spikes
    g.fillStyle = f("#4b4f5c");
    g.fillRect(-16, 14, 32, 5);
    g.fillStyle = f("#d0d0d8");
    for (let i = -12; i <= 12; i += 8) {
      g.beginPath();
      g.moveTo(i - 4, 19);
      g.lineTo(i, 27);
      g.lineTo(i + 4, 19);
      g.closePath();
      g.fill();
    }
    // exhaust
    g.fillStyle = f("#4b4f5c");
    g.fillRect(-28, 0, 6, 8);
    g.fillStyle = f(frame % 2 === 0 ? "#ff8020" : "#ffe060");
    g.beginPath();
    g.moveTo(-28, 1);
    g.lineTo(-35 - frame * 2, 4);
    g.lineTo(-28, 7);
    g.closePath();
    g.fill();
  });
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------
export function ringSprite(frame: number): Sprite {
  const n = 8;
  const t = frame % n;
  const sx = Math.max(0.12, Math.abs(Math.cos((t / n) * Math.PI)));
  return pixelSprite(`ring:${t}`, 18, 18, 9, 9, (g) => {
    g.scale(sx, 1);
    g.lineWidth = 3.2;
    g.strokeStyle = "#c88000";
    g.beginPath();
    g.arc(0, 0, 6, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = "#f0b000";
    g.beginPath();
    g.arc(0, 0, 6, 0.9, 2.7);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 6, -2.2, -0.6);
    g.stroke();
    g.lineWidth = 1.4;
    g.strokeStyle = "#fff4b0";
    g.beginPath();
    g.arc(0, 0, 6.2, -2.4, -1.2);
    g.stroke();
  }, { outline: "#6a3a00" });
}

export function monitorSprite(kind: string, frame: number, broken: boolean): Sprite {
  return pixelSprite(`monitor:${kind}:${frame}:${broken}`, 30, 32, 15, 30, (g) => {
    if (broken) {
      g.fillStyle = "#5c6070";
      g.fillRect(-12, -7, 24, 7);
      g.fillStyle = "#8a8ea0";
      g.fillRect(-11, -8, 22, 2);
      g.fillStyle = "#3a3e50";
      g.fillRect(-9, -4, 4, 2);
      g.fillRect(3, -5, 5, 2);
      return;
    }
    // stand
    g.fillStyle = "#3a3e50";
    g.fillRect(-8, -5, 16, 5);
    g.fillStyle = "#5c6070";
    g.fillRect(-9, -6, 18, 2);
    // case
    g.fillStyle = "#6c7084";
    g.fillRect(-12, -27, 24, 22);
    g.fillStyle = "#a8acbc";
    g.fillRect(-12, -27, 24, 2);
    g.fillRect(-12, -27, 2, 22);
    g.fillStyle = "#4a4e60";
    g.fillRect(-12, -7, 24, 2);
    g.fillRect(10, -27, 2, 22);
    // screen bezel
    g.fillStyle = "#1a1e2c";
    g.fillRect(-10, -25, 20, 17);
    g.fillStyle = "#1c4aa0";
    g.fillRect(-9, -24, 18, 15);
    g.fillStyle = "#2c66d0";
    g.fillRect(-9, -24, 18, 2);
    g.fillStyle = "#143880";
    g.fillRect(-9, -11, 18, 2);
    const cx = 0;
    const cy = -16;
    if (frame === 0) {
      switch (kind) {
        case "ring":
          g.lineWidth = 2.5;
          g.strokeStyle = "#f0b000";
          g.beginPath();
          g.arc(cx, cy, 4.5, 0, Math.PI * 2);
          g.stroke();
          break;
        case "shield":
          g.strokeStyle = "#7fd4ff";
          g.lineWidth = 2;
          g.beginPath();
          g.arc(cx, cy, 5, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = "#c8f0ff";
          g.fillRect(cx - 1, cy - 1, 2, 2);
          break;
        case "speed":
          g.fillStyle = "#e83838";
          g.fillRect(cx - 6, cy - 1, 12, 5);
          g.fillStyle = "#fff";
          g.fillRect(cx - 6, cy - 3, 12, 2);
          g.fillStyle = "#ffd040";
          g.fillRect(cx + 2, cy - 1, 2, 2);
          break;
        case "invincible":
          g.fillStyle = "#fff";
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            g.fillRect(Math.round(cx + Math.cos(a) * 5) - 1, Math.round(cy + Math.sin(a) * 5) - 1, 2, 2);
          }
          g.fillRect(cx - 1, cy - 1, 2, 2);
          break;
        default: {
          // life: hero face icon
          g.fillStyle = PAL.B;
          g.beginPath();
          g.arc(cx, cy, 5.5, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.moveTo(cx - 4, cy - 3);
          g.lineTo(cx - 11, cy);
          g.lineTo(cx - 4, cy + 2);
          g.closePath();
          g.fill();
          g.fillStyle = PAL.S;
          g.beginPath();
          g.arc(cx + 3, cy + 2, 3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#fff";
          g.fillRect(cx + 1, cy - 4, 3, 4);
          g.fillStyle = PAL.G;
          g.fillRect(cx + 3, cy - 3, 1, 2);
        }
      }
    } else {
      // static flicker frame
      g.fillStyle = "#3a7ae0";
      for (let y = -23; y < -10; y += 3) g.fillRect(-8 + (y % 2 ? 2 : 0), y, 6, 1);
    }
  });
}

export function springSprite(strong: boolean, up: boolean): Sprite {
  return pixelSprite(`spring:${strong}:${up}`, 32, 24, 16, 20, (g) => {
    const ext = up ? 8 : 0;
    g.fillStyle = strong ? "#7a1414" : "#7a6010";
    g.fillRect(-14, 2, 28, 10);
    g.fillStyle = strong ? "#c62828" : "#c8a020";
    g.fillRect(-14, 1, 28, 8);
    g.fillStyle = strong ? "#ff6060" : "#ffe060";
    g.fillRect(-13, 1, 26, 2);
    g.fillStyle = "#3a3e50";
    g.fillRect(-10, 7, 20, 1.5);
    // coils
    g.fillStyle = "#c8ccd8";
    for (let i = 0; i < 3; i++) g.fillRect(-7, 0 - i * (2.5 + ext / 2), 14, 1.5);
    g.fillStyle = "#6a6e80";
    for (let i = 0; i < 3; i++) g.fillRect(-7, 1 - i * (2.5 + ext / 2), 14, 0.8);
    // plate
    g.fillStyle = "#c89000";
    g.fillRect(-14, -5 - ext, 28, 7);
    g.fillStyle = strong ? "#ffd23f" : "#ffe680";
    g.fillRect(-14, -5 - ext, 28, 5);
    g.fillStyle = "#fff6c0";
    g.fillRect(-13, -5 - ext, 26, 2);
    g.fillStyle = "#c89000";
    for (let x = -10; x <= 10; x += 10) g.fillRect(x - 1, -3 - ext, 2, 2);
  });
}

export function spikesSprite(): Sprite {
  return pixelSprite("spikes", 18, 16, 1, 14, (g) => {
    for (let sx = 0; sx < 16; sx += 8) {
      g.fillStyle = "#6a7080";
      g.beginPath();
      g.moveTo(sx, 12);
      g.lineTo(sx + 4, -1);
      g.lineTo(sx + 8, 12);
      g.closePath();
      g.fill();
      g.fillStyle = "#e6e9f0";
      g.beginPath();
      g.moveTo(sx + 1.5, 12);
      g.lineTo(sx + 4, 0);
      g.lineTo(sx + 4, 12);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#3a3e50";
    g.fillRect(0, 11, 16, 4);
    g.fillStyle = "#8a8ea0";
    g.fillRect(0, 11, 16, 1);
  });
}

export function checkpointSprite(active: boolean, wobble: number): Sprite {
  return pixelSprite(`checkpoint:${active}:${wobble}`, 34, 60, 17, 56, (g) => {
    g.fillStyle = "#3a3e50";
    g.fillRect(-7, -3, 14, 3);
    g.fillStyle = "#6a6e80";
    g.fillRect(-7, -4, 14, 1.5);
    g.fillStyle = "#8a8ea0";
    g.fillRect(-2.5, -47, 5, 44);
    g.fillStyle = "#c8ccd8";
    g.fillRect(-2.5, -47, 1.5, 44);
    g.fillStyle = "#4a4e60";
    g.fillRect(1, -47, 1.5, 44);
    g.fillStyle = "#1a1e2c";
    g.beginPath();
    g.arc(wobble, -51, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = active ? "#e83838" : "#2a5ce8";
    g.beginPath();
    g.arc(wobble, -51, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = active ? "#ff9a9a" : "#8ab0ff";
    g.fillRect(wobble - 3, -54, 2.5, 2.5);
    g.fillStyle = active ? "#ffd040" : "#ffffff";
    g.fillRect(wobble - 1, -52, 2, 2);
  });
}

export function goalSprite(face: "villain" | "hero" | "blank"): Sprite {
  return pixelSprite(`goal:${face}`, 60, 70, 30, 66, (g) => {
    g.fillStyle = "#3a3e50";
    g.fillRect(-8, -3, 16, 3);
    g.fillStyle = "#8a8ea0";
    g.fillRect(-2.5, -58, 5, 55);
    g.fillStyle = "#c8ccd8";
    g.fillRect(-2.5, -58, 1.5, 55);
    g.save();
    g.translate(0, -66);
    if (face === "blank") g.scale(0.12, 1);
    g.fillStyle = "#1a1e2c";
    g.fillRect(-25, -18, 50, 36);
    g.fillStyle = "#ffd23f";
    g.fillRect(-23, -16, 46, 32);
    g.fillStyle = "#fff0a0";
    g.fillRect(-23, -16, 46, 2);
    g.fillStyle = "#c89000";
    g.fillRect(-23, 12, 46, 4);
    g.fillRect(-23, -16, 2, 32);
    if (face === "hero") {
      g.fillStyle = PAL.B;
      g.beginPath();
      g.arc(0, -2, 10, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-6, -8 + i * 5);
        g.lineTo(-19, -4 + i * 6);
        g.lineTo(-5, -3 + i * 5);
        g.closePath();
        g.fill();
      }
      g.fillStyle = PAL.S;
      g.beginPath();
      g.arc(6, 2, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.ellipse(5, -4, 4, 5, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PAL.G;
      g.fillRect(6, -5, 2, 3);
      g.fillStyle = "#101010";
      g.fillRect(11, 0, 2, 2);
    } else if (face === "villain") {
      g.fillStyle = "#b71c1c";
      g.fillRect(-13, 0, 26, 12);
      g.fillStyle = "#f5c6a0";
      g.fillRect(-9, -13, 18, 14);
      g.fillStyle = "#3a3e50";
      g.beginPath();
      g.arc(-4, -9, 3, 0, Math.PI * 2);
      g.arc(4, -9, 3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#8fd0ff";
      g.fillRect(-5, -10, 1.5, 1.5);
      g.fillRect(3, -10, 1.5, 1.5);
      g.fillStyle = "#c8601a";
      g.fillRect(-12, -5, 24, 5);
      g.fillStyle = "#ffd040";
      g.fillRect(-2, 3, 1.5, 1.5);
      g.fillRect(1, 3, 1.5, 1.5);
    }
    g.restore();
  });
}

// ---------------------------------------------------------------------------
// Decoration
// ---------------------------------------------------------------------------
export function palmSprite(size: number, frame: number): Sprite {
  const s = 0.8 + size * 0.2;
  return pixelSprite(`palm:${size}:${frame}`, 100, 110, 50, 106, (g) => {
    // trunk
    const segs = 9;
    for (let i = 0; i < segs; i++) {
      const t = i / segs;
      const x = 2 * (1 - t) * t * 12 * s + t * t * 6 * s;
      const y = -t * 78 * s;
      g.fillStyle = i % 2 ? "#8a5a2a" : "#7a4a1e";
      g.beginPath();
      g.roundRect(x - 4.5 * s, y - 9.5 * s, 9 * s, 10 * s, 2);
      g.fill();
      g.fillStyle = "#b07a3a";
      g.fillRect(x - 3.5 * s, y - 9 * s, 2 * s, 8 * s);
      g.fillStyle = "#5a3210";
      g.fillRect(x - 4.5 * s, y - 1 * s, 9 * s, 1.2);
    }
    const tx = 6 * s;
    const ty = -78 * s;
    // fronds (back layer darker, front lighter)
    const frond = (a: number, len: number, col: string, col2: string) => {
      g.save();
      g.translate(tx, ty);
      g.rotate(a);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(len * 0.5, -len * 0.25, len, len * 0.15);
      g.quadraticCurveTo(len * 0.5, 0.5, 0, 3);
      g.closePath();
      g.fill();
      g.fillStyle = col2;
      for (let i = 1; i < 7; i++) {
        const t = i / 7;
        const px = len * t;
        const py = -len * 0.25 * 2 * t * (1 - t) * 1 + len * 0.15 * t * t;
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + 3, py + 7 * (1 - t) + 2);
        g.lineTo(px + 6, py);
        g.closePath();
        g.fill();
      }
      g.restore();
    };
    const sway = Math.sin(frame) * 0.04;
    frond(Math.PI * 1.05 + sway, 40 * s, "#1e7a2a", "#2a9a3a");
    frond(-Math.PI * 0.2 + sway, 38 * s, "#1e7a2a", "#2a9a3a");
    frond(Math.PI * 0.85 + sway, 42 * s, "#2a9a3a", "#3fbf3f");
    frond(Math.PI * 0.62 + sway, 36 * s, "#2a9a3a", "#3fbf3f");
    frond(-Math.PI * 0.08 + sway, 44 * s, "#2a9a3a", "#3fbf3f");
    frond(Math.PI * 0.25 + sway, 36 * s, "#3fbf3f", "#6ad85a");
    frond(Math.PI * 0.42 + sway, 32 * s, "#3fbf3f", "#6ad85a");
    // coconuts
    g.fillStyle = "#5a3210";
    g.beginPath();
    g.arc(tx - 4 * s, ty + 6 * s, 3.5 * s, 0, Math.PI * 2);
    g.arc(tx + 4 * s, ty + 7 * s, 3.5 * s, 0, Math.PI * 2);
    g.arc(tx, ty + 10 * s, 3.5 * s, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#8a5a2a";
    g.fillRect(tx - 5 * s, ty + 4 * s, 2, 1.5);
    g.fillRect(tx + 3 * s, ty + 5 * s, 2, 1.5);
  });
}

export function bushSprite(): Sprite {
  return pixelSprite("bush", 44, 30, 22, 28, (g) => {
    g.fillStyle = "#1a6a26";
    g.beginPath();
    g.arc(-10, -7, 9.5, 0, Math.PI * 2);
    g.arc(1, -13, 11.5, 0, Math.PI * 2);
    g.arc(12, -7, 8.5, 0, Math.PI * 2);
    g.arc(0, -4, 10, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#2a9a3a";
    g.beginPath();
    g.arc(-9, -9, 6.5, 0, Math.PI * 2);
    g.arc(1, -15, 8, 0, Math.PI * 2);
    g.arc(12, -9, 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#5fd35a";
    g.beginPath();
    g.arc(-10, -11, 3, 0, Math.PI * 2);
    g.arc(0, -18, 4, 0, Math.PI * 2);
    g.arc(11, -11, 2.5, 0, Math.PI * 2);
    g.fill();
    // berries
    g.fillStyle = "#e83838";
    for (const [x, y] of [[-5, -5], [6, -12], [-12, -3], [9, -3], [2, -9]]) g.fillRect(x, y, 2.5, 2.5);
    g.fillStyle = "#ffb0b0";
    for (const [x, y] of [[-5, -5], [6, -12], [9, -3]]) g.fillRect(x, y, 1, 1);
  });
}

export function flowerSprite(frame: number): Sprite {
  return pixelSprite(`flower:${frame}`, 30, 40, 15, 38, (g) => {
    g.fillStyle = "#1e7a2a";
    g.fillRect(-1.5, -28, 3, 28);
    g.fillStyle = "#3fbf3f";
    g.fillRect(-1.5, -28, 1.2, 28);
    // leaves
    g.fillStyle = "#2a9a3a";
    g.beginPath();
    g.ellipse(4, -14, 6, 2.5, -0.5, 0, Math.PI * 2);
    g.ellipse(-4, -9, 6, 2.5, 0.5, 0, Math.PI * 2);
    g.fill();
    const rot = frame * (Math.PI / 8);
    g.fillStyle = "#ffd23f";
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * Math.PI * 2;
      g.beginPath();
      g.ellipse(Math.cos(a) * 7.5, -30 + Math.sin(a) * 7.5, 5, 3, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#ffe890";
    for (let i = 0; i < 8; i++) {
      const a = rot + (i / 8) * Math.PI * 2;
      g.beginPath();
      g.ellipse(Math.cos(a) * 7, -30.5 + Math.sin(a) * 7, 2.5, 1.2, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#8a3a10";
    g.beginPath();
    g.arc(0, -30, 4.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e86a2a";
    g.beginPath();
    g.arc(0, -30, 3.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffd040";
    g.fillRect(-1, -32, 1.5, 1.5);
  });
}

export function totemSprite(): Sprite {
  return pixelSprite("totem", 30, 70, 15, 68, (g) => {
    g.fillStyle = "#8a5a2b";
    g.fillRect(-9, -64, 18, 66);
    g.fillStyle = "#b07a3a";
    g.fillRect(-9, -64, 3, 66);
    g.fillStyle = "#5b3a16";
    g.fillRect(6, -64, 3, 66);
    for (let i = 0; i < 3; i++) {
      const ty = -58 + i * 20;
      // carved face
      g.fillStyle = "#5b3a16";
      g.fillRect(-7, ty, 14, 16);
      g.fillStyle = "#c78b4e";
      g.fillRect(-6, ty + 1, 12, 14);
      g.fillStyle = "#3a2410";
      g.fillRect(-5, ty + 3, 4, 3);
      g.fillRect(1, ty + 3, 4, 3);
      g.fillStyle = "#ffd040";
      g.fillRect(-4, ty + 4, 1.5, 1.5);
      g.fillRect(2, ty + 4, 1.5, 1.5);
      g.fillStyle = "#3a2410";
      g.fillRect(-2, ty + 7, 4, 3);
      g.fillRect(-5, ty + 11, 10, 2.5);
      g.fillStyle = "#e83838";
      g.fillRect(-5, ty + 11, 2, 2.5);
      g.fillRect(3, ty + 11, 2, 2.5);
    }
    // wings on top
    g.fillStyle = "#c78b4e";
    g.fillRect(-14, -67, 28, 4);
    g.fillStyle = "#e83838";
    g.fillRect(-14, -67, 28, 1.5);
    g.fillStyle = "#ffd040";
    g.fillRect(-13, -70, 4, 3);
    g.fillRect(9, -70, 4, 3);
  });
}

export function columnSprite(size: number): Sprite {
  const h = 50 + size * 14;
  return pixelSprite(`column:${size}`, 30, h + 10, 15, h + 6, (g) => {
    g.fillStyle = "#7a7a8e";
    g.fillRect(-6, -h, 12, h + 2);
    g.fillStyle = "#a8a8bc";
    g.fillRect(-5, -h, 3, h);
    g.fillStyle = "#5a5a6e";
    g.fillRect(3, -h, 3, h);
    // fluting
    g.fillStyle = "#6a6a7e";
    g.fillRect(-1, -h, 1, h);
    // capital and base
    g.fillStyle = "#9a9aae";
    g.fillRect(-10, -h - 5, 20, 6);
    g.fillRect(-10, -5, 20, 6);
    g.fillStyle = "#c0c0d0";
    g.fillRect(-10, -h - 5, 20, 1.5);
    g.fillStyle = "#5a5a6e";
    g.fillRect(-10, -h, 20, 1.5);
    // cracks and moss
    g.fillStyle = "#3a3a4a";
    g.fillRect(-2, -h + 14, 1, 9);
    g.fillRect(-1, -h + 22, 2, 1);
    g.fillStyle = "#3a9a5a";
    g.fillRect(-6, -h + 8, 4, 14);
    g.fillRect(2, -h + 30, 4, 9);
    g.fillRect(-6, -12, 3, 7);
    g.fillStyle = "#6ad07a";
    g.fillRect(-6, -h + 8, 2, 5);
    g.fillRect(2, -h + 30, 2, 3);
    // vine
    g.strokeStyle = "#2a7a4a";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(6, -h + 4);
    g.quadraticCurveTo(10, -h + 20, 5, -h + 36);
    g.stroke();
    g.fillStyle = "#3fbf5f";
    for (let i = 0; i < 4; i++) g.fillRect(6 + (i % 2) * 3, -h + 8 + i * 8, 2.5, 2.5);
  });
}

export function ruinWallSprite(): Sprite {
  return pixelSprite("ruinwall", 50, 40, 25, 38, (g) => {
    g.fillStyle = "#2c3434";
    g.fillRect(-20, -32, 40, 34);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = -20 + col * 10 + (row % 2) * 5;
        const y = -32 + row * 8;
        if (row === 0 && (col === 1 || col === 3)) continue; // broken top
        g.fillStyle = (row + col) % 3 ? "#7a7a8e" : "#6a6a7e";
        g.fillRect(x + 0.5, y + 0.5, 9, 7);
        g.fillStyle = "#a0a0b4";
        g.fillRect(x + 0.5, y + 0.5, 9, 1);
        g.fillStyle = "#4a4a5e";
        g.fillRect(x + 0.5, y + 6.5, 9, 1);
      }
    }
    g.fillStyle = "#3a9a5a";
    g.fillRect(-18, -22, 6, 3);
    g.fillRect(6, -14, 9, 3);
    g.fillRect(-8, -6, 5, 4);
    g.fillStyle = "#6ad07a";
    g.fillRect(-18, -22, 3, 1.5);
    g.fillRect(6, -14, 4, 1.5);
    // vine over top
    g.strokeStyle = "#2a7a4a";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(-6, -34);
    g.quadraticCurveTo(-2, -20, 2, -8);
    g.stroke();
  });
}

export function torchSprite(frame: number): Sprite {
  return pixelSprite(`torch:${frame}`, 20, 56, 10, 52, (g) => {
    g.fillStyle = "#3a2a1a";
    g.fillRect(-2, -38, 4, 40);
    g.fillStyle = "#6a4a2a";
    g.fillRect(-2, -38, 1.5, 40);
    g.fillStyle = "#8a6a3a";
    g.fillRect(-4.5, -41, 9, 5);
    g.fillStyle = "#c89050";
    g.fillRect(-4.5, -41, 9, 1.5);
    const f = frame % 3;
    g.fillStyle = "#ff6a10";
    g.beginPath();
    g.moveTo(-5, -41);
    g.lineTo(-3 + f, -49 - f);
    g.lineTo(0, -45);
    g.lineTo(3 - f, -51 + f);
    g.lineTo(5, -41);
    g.closePath();
    g.fill();
    g.fillStyle = "#ffb020";
    g.beginPath();
    g.moveTo(-3, -41);
    g.lineTo(-1 + f * 0.5, -47);
    g.lineTo(1, -44);
    g.lineTo(3 - f * 0.5, -41);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff0a0";
    g.fillRect(-1, -44, 2, 3);
  }, { outline: "#2a1408" });
}

export function crystalSprite(): Sprite {
  return pixelSprite("crystal", 40, 44, 20, 42, (g) => {
    const shard = (dx: number, h: number, w: number, col: string, hi: string, dk: string) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(dx - w, 2);
      g.lineTo(dx - w * 0.6, -h * 0.8);
      g.lineTo(dx, -h);
      g.lineTo(dx + w * 0.7, -h * 0.7);
      g.lineTo(dx + w, 2);
      g.closePath();
      g.fill();
      g.fillStyle = hi;
      g.beginPath();
      g.moveTo(dx - w * 0.5, 2);
      g.lineTo(dx - w * 0.4, -h * 0.75);
      g.lineTo(dx, -h + 2);
      g.lineTo(dx - 0.5, 2);
      g.closePath();
      g.fill();
      g.fillStyle = dk;
      g.beginPath();
      g.moveTo(dx + w * 0.3, 2);
      g.lineTo(dx + w * 0.7, -h * 0.7);
      g.lineTo(dx + w, 2);
      g.closePath();
      g.fill();
    };
    shard(-10, 26, 6, "#9a48e0", "#d8a0ff", "#6a2aa0");
    shard(10, 22, 5, "#9a48e0", "#d8a0ff", "#6a2aa0");
    shard(0, 38, 7, "#b060ff", "#f0c8ff", "#7a3ac0");
    g.fillStyle = "#fff";
    g.fillRect(-2, -30, 1.5, 6);
    g.fillRect(-11, -18, 1, 4);
    // rock base
    g.fillStyle = "#3a2420";
    g.fillRect(-16, -1, 32, 4);
    g.fillStyle = "#5a3a30";
    g.fillRect(-14, -2, 28, 1.5);
  }, { outline: "#2a1030" });
}

export function rockSprite(): Sprite {
  return pixelSprite("rock", 34, 20, 17, 18, (g) => {
    g.fillStyle = "#4a4a56";
    g.beginPath();
    g.moveTo(-14, 2);
    g.lineTo(-12, -6);
    g.lineTo(-5, -12);
    g.lineTo(6, -13);
    g.lineTo(13, -6);
    g.lineTo(14, 2);
    g.closePath();
    g.fill();
    g.fillStyle = "#7a7a88";
    g.beginPath();
    g.moveTo(-12, 0);
    g.lineTo(-11, -5);
    g.lineTo(-5, -10);
    g.lineTo(5, -11);
    g.lineTo(10, -6);
    g.lineTo(11, 0);
    g.closePath();
    g.fill();
    g.fillStyle = "#a0a0ae";
    g.beginPath();
    g.moveTo(-9, -5);
    g.lineTo(-4, -9);
    g.lineTo(3, -9.5);
    g.lineTo(0, -6);
    g.closePath();
    g.fill();
    g.fillStyle = "#5a5a68";
    g.fillRect(2, -4, 6, 1.5);
    g.fillRect(-6, -2, 4, 1.5);
  }, { outline: "#1a1a24" });
}

export function umbrellaSprite(): Sprite {
  return pixelSprite("umbrella", 50, 62, 25, 60, (g) => {
    g.fillStyle = "#c8ccd8";
    g.fillRect(-1.5, -52, 3, 54);
    g.fillStyle = "#8a8ea0";
    g.fillRect(0.5, -52, 1, 54);
    g.fillStyle = "#e84040";
    g.beginPath();
    g.arc(0, -50, 22, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillStyle = "#fff";
    for (const i of [-1, 1]) {
      g.beginPath();
      g.moveTo(0, -50);
      g.lineTo(i * 8, -50);
      g.lineTo(i * 12, -66);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#a02020";
    for (let x = -20; x <= 20; x += 8) g.fillRect(x, -51, 4, 2);
    g.fillStyle = "#ffd040";
    g.fillRect(-1.5, -56, 3, 5);
  }, { outline: "#4a1010" });
}

export function antennaSprite(size: number, blink: boolean): Sprite {
  const h = 44 + size * 10;
  return pixelSprite(`antenna:${size}:${blink}`, 24, h + 12, 12, h + 8, (g) => {
    g.fillStyle = "#3a4058";
    g.fillRect(-2.5, -h, 5, h + 2);
    g.fillStyle = "#5a6480";
    g.fillRect(-2.5, -h, 2, h);
    g.fillStyle = "#3a4058";
    g.fillRect(-9, -h * 0.55, 18, 2.5);
    g.fillRect(-6, -h * 0.8, 12, 2.5);
    g.fillStyle = "#c8ccd8";
    g.fillRect(-9, -h * 0.55, 18, 1);
    g.fillRect(-6, -h * 0.8, 12, 1);
    // dish
    g.fillStyle = "#8a94b0";
    g.beginPath();
    g.ellipse(5, -h * 0.35, 5, 3.5, -0.6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#c8d0e0";
    g.fillRect(3, -h * 0.35 - 1, 2, 2);
    // base plate
    g.fillStyle = "#2a3048";
    g.fillRect(-7, -2, 14, 4);
    g.fillStyle = blink ? "#ff5050" : "#601010";
    g.fillRect(-1.5, -h - 4, 3, 4);
    if (blink) {
      g.fillStyle = "rgba(255,80,80,0.5)";
      g.fillRect(-3.5, -h - 6, 7, 8);
    }
  }, { outline: "#141828" });
}

export function pipeSprite(): Sprite {
  return pixelSprite("pipe", 24, 36, 12, 34, (g) => {
    g.fillStyle = "#505870";
    g.fillRect(-6, -28, 12, 30);
    g.fillStyle = "#7a84a0";
    g.fillRect(-6, -28, 3, 30);
    g.fillStyle = "#30364a";
    g.fillRect(3, -28, 3, 30);
    g.fillStyle = "#6a7290";
    g.fillRect(-8, -31, 16, 5);
    g.fillStyle = "#9aa4c0";
    g.fillRect(-8, -31, 16, 1.5);
    g.fillStyle = "#1a1e2c";
    g.fillRect(-5, -30, 10, 2);
    g.fillStyle = "#e0b030";
    g.fillRect(-6, -12, 12, 3);
    g.fillStyle = "#222";
    for (let x = -6; x < 6; x += 4) g.fillRect(x + 2, -12, 2, 3);
  }, { outline: "#141828" });
}

export function lavaburstSprite(frame: number): Sprite {
  return pixelSprite(`lavaburst:${frame}`, 24, 44, 12, 42, (g) => {
    g.fillStyle = "#3a2020";
    g.fillRect(-8, -4, 16, 5);
    g.fillStyle = "#6a3a30";
    g.fillRect(-7, -5, 14, 1.5);
    g.fillStyle = "#1a0808";
    g.fillRect(-4, -3, 8, 2);
    if (frame > 0) {
      const hh = [0, 14, 30, 36, 26, 12][frame];
      g.fillStyle = "#ff6a10";
      g.beginPath();
      g.moveTo(-4, -3);
      g.lineTo(-2, -hh + 4);
      g.lineTo(0, -hh);
      g.lineTo(2, -hh + 6);
      g.lineTo(4, -3);
      g.closePath();
      g.fill();
      g.fillStyle = "#ffd040";
      g.fillRect(-1, -hh + 8, 2, Math.max(0, hh - 12));
      g.fillStyle = "#ff8a30";
      g.fillRect(-6, -hh * 0.6, 2, 2);
      g.fillRect(4, -hh * 0.8, 2, 2);
    }
  }, { outline: "#200808" });
}
