export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean; // edge-triggered, consumed each step
  startPressed: boolean;
  pausePressed: boolean;
  restartPressed: boolean;
  mutePressed: boolean;
  musicPressed: boolean;
}

const KEYMAP: Record<string, keyof InputState> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "jump",
  KeyZ: "jump",
  KeyX: "jump",
  KeyJ: "jump",
  KeyK: "jump",
};

export class Input {
  state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    jumpPressed: false,
    startPressed: false,
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    musicPressed: false,
  };
  private touchHeld = { left: false, right: false, down: false, up: false, jump: false };
  private keyHeld = { left: false, right: false, down: false, up: false, jump: false };
  onAnyPress: (() => void) | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      if (KEYMAP[e.code] || e.code === "Enter") e.preventDefault();
      return;
    }
    const k = KEYMAP[e.code];
    if (k) {
      e.preventDefault();
      if (k === "jump" && !this.keyHeld.jump) this.state.jumpPressed = true;
      if (k === "left" || k === "right" || k === "up" || k === "down" || k === "jump") this.keyHeld[k] = true;
      this.recompute();
      this.state.startPressed = true;
    } else if (e.code === "Enter") {
      e.preventDefault();
      this.state.startPressed = true;
    } else if (e.code === "KeyP" || e.code === "Escape") {
      this.state.pausePressed = true;
    } else if (e.code === "KeyR") {
      this.state.restartPressed = true;
    } else if (e.code === "KeyM") {
      this.state.mutePressed = true;
    } else if (e.code === "KeyN") {
      this.state.musicPressed = true;
    }
    this.onAnyPress?.();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (k && (k === "left" || k === "right" || k === "up" || k === "down" || k === "jump")) {
      this.keyHeld[k] = false;
      this.recompute();
    }
  };

  private onBlur = () => {
    this.keyHeld = { left: false, right: false, down: false, up: false, jump: false };
    this.touchHeld = { left: false, right: false, down: false, up: false, jump: false };
    this.recompute();
  };

  private recompute() {
    this.state.left = this.keyHeld.left || this.touchHeld.left;
    this.state.right = this.keyHeld.right || this.touchHeld.right;
    this.state.up = this.keyHeld.up || this.touchHeld.up;
    this.state.down = this.keyHeld.down || this.touchHeld.down;
    this.state.jump = this.keyHeld.jump || this.touchHeld.jump;
  }

  /** Called by on-screen buttons. */
  setTouch(button: "left" | "right" | "down" | "up" | "jump", held: boolean) {
    if (button === "jump" && held && !this.touchHeld.jump) this.state.jumpPressed = true;
    if (held) this.state.startPressed = true;
    this.touchHeld[button] = held;
    this.recompute();
    if (held) this.onAnyPress?.();
  }

  attach(target: Window) {
    target.addEventListener("keydown", this.onKeyDown);
    target.addEventListener("keyup", this.onKeyUp);
    target.addEventListener("blur", this.onBlur);
  }

  detach(target: Window) {
    target.removeEventListener("keydown", this.onKeyDown);
    target.removeEventListener("keyup", this.onKeyUp);
    target.removeEventListener("blur", this.onBlur);
  }

  /** Clear edge-triggered flags after a simulation step consumed them. */
  endStep() {
    this.state.jumpPressed = false;
    this.state.startPressed = false;
    this.state.pausePressed = false;
    this.state.restartPressed = false;
    this.state.mutePressed = false;
    this.state.musicPressed = false;
  }
}
