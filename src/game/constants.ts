// Native (16-bit style) resolution. The frame is rendered at this size and
// scaled up with nearest-neighbour sampling for a crisp pixel look.
export const VIEW_W = 480;
export const VIEW_H = 270;
export const SCALE = 3; // display canvas backing size = VIEW * SCALE

export const STEP = 1 / 60;

// Classic Mega Drive player constants (pixels per frame at 60 Hz).
export const ACC = 0.046875;
export const DEC = 0.5;
export const FRC = 0.046875;
export const TOP_SPEED = 6;
export const JUMP_FORCE = 6.5;
export const JUMP_CUT = -4;
export const GRAVITY = 0.21875;
export const AIR_ACC = 0.09375;
export const SLOPE_FACTOR = 0.125;
export const SLOPE_ROLL_UP = 0.078125;
export const SLOPE_ROLL_DOWN = 0.3125;
export const ROLL_FRC = 0.0234375;
export const ROLL_DEC = 0.125;
export const MIN_ROLL_SPEED = 0.5;
export const MIN_START_ROLL = 1.0;
export const SPINDASH_BASE = 8;
export const SPINDASH_MAX_CHARGE = 8;
export const HURT_X = 2;
export const HURT_Y = -4;
export const SPRING_RED = -10;
export const SPRING_YELLOW = -7;
export const LOOP_MIN_ENTRY = 4;
export const LOOP_MIN_STICK = 1.5;
export const LOOP_SLOPE = 0.09;
export const MAX_FALL = 16;

export const PLAYER_HALF_W = 9;
export const PLAYER_HALF_H = 20;
export const PLAYER_ROLL_HALF_H = 15;

export const INVULN_FRAMES = 120;
export const RING_SCATTER_MAX = 32;
export const RING_GRAVITY = 0.09375;
export const RING_LIFETIME = 256;
export const RING_PICKUP_DELAY = 64;

export const START_LIVES = 3;
export const BOSS_HITS = 8;

// Scoring
export const SCORE_ENEMY_CHAIN = [100, 200, 500, 1000];
export const SCORE_MONITOR = 10;
export const SCORE_BOSS_HIT = 100;
export const SCORE_BOSS = 1000;
export const SCORE_RING_BONUS = 100;
export const SCORE_PERFECT_BONUS = 10000;
export const SCORE_LIFE_EVERY = 50000;
