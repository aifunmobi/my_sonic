// Logical canvas size. The canvas is scaled with CSS to fit the viewport.
export const VIEW_W = 960;
export const VIEW_H = 540;

// Fixed simulation step (60 Hz), matching classic 16-bit frame timing.
export const STEP = 1 / 60;

// Player physics. Values are the classic Mega Drive constants scaled x2
// because this game renders at twice the original resolution.
export const ACC = 0.09375;
export const DEC = 1.0;
export const FRC = 0.09375;
export const TOP_SPEED = 12;
export const JUMP_FORCE = 13;
export const JUMP_CUT = -8;
export const GRAVITY = 0.4375;
export const AIR_ACC = 0.1875;
export const SLOPE_FACTOR = 0.25;
export const SLOPE_ROLL_UP = 0.15625;
export const SLOPE_ROLL_DOWN = 0.625;
export const ROLL_FRC = 0.046875;
export const ROLL_DEC = 0.25;
export const MIN_ROLL_SPEED = 1.0;
export const MIN_START_ROLL = 1.0;
export const SPINDASH_BASE = 16;
export const SPINDASH_MAX_CHARGE = 8;
export const HURT_X = 4;
export const HURT_Y = -8;
export const SPRING_FORCE = -18;
export const LOOP_MIN_ENTRY = 8;
export const LOOP_MIN_STICK = 4;
export const LOOP_SLOPE = 0.25;
export const MAX_FALL = 24;

export const PLAYER_HALF_W = 12;
export const PLAYER_HALF_H = 20;
export const PLAYER_ROLL_HALF_H = 14;

export const INVULN_FRAMES = 120;
export const RING_SCATTER_MAX = 32;
export const RING_GRAVITY = 0.1875;
export const RING_LIFETIME = 256;
export const RING_PICKUP_DELAY = 64;

export const START_LIVES = 3;
