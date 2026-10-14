export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  upPressed: boolean;
  downPressed: boolean;
  startPressed: boolean;
  pausePressed: boolean;
  restartPressed: boolean;
  mutePressed: boolean;
  musicPressed: boolean;
  backPressed: boolean;
}

type Held = "left" | "right" | "up" | "down" | "jump";

const KEYMAP: Record<string, Held> = {
  ArrowLeft: "left",
  KeyA: "left",
  KeyJ: "left",
  ArrowRight: "right",
  KeyD: "right",
  KeyL: "right",
  ArrowUp: "up",
  KeyW: "up",
  KeyI: "up",
  ArrowDown: "down",
  KeyS: "down",
  KeyK: "down",
  Space: "jump",
  KeyZ: "jump",
  KeyX: "jump",
  KeyC: "jump",
  KeyF: "jump",
  ShiftLeft: "jump",
  ShiftRight: "jump",
};

const emptyState = (): InputState => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  jumpPressed: false,
  upPressed: false,
  downPressed: false,
  startPressed: false,
  pausePressed: false,
  restartPressed: false,
  mutePressed: false,
  musicPressed: false,
  backPressed: false,
});

export class Input {
  state: InputState = emptyState();
  private touchHeld: Record<Held, boolean> = { left: false, right: false, down: false, up: false, jump: false };
  private keyHeld: Record<Held, boolean> = { left: false, right: false, down: false, up: false, jump: false };
  onAnyPress: (() => void) | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    const k = KEYMAP[e.code];
    if (k || e.code === "Enter") e.preventDefault();
    if (e.repeat) return;
    if (k) {
      if (k === "jump" && !this.keyHeld.jump) this.state.jumpPressed = true;
      if (k === "up" && !this.keyHeld.up) this.state.upPressed = true;
      if (k === "down" && !this.keyHeld.down) this.state.downPressed = true;
      this.keyHeld[k] = true;
      this.recompute();
      if (k === "jump") this.state.startPressed = true;
    } else if (e.code === "Enter") {
      this.state.startPressed = true;
    } else if (e.code === "KeyP") {
      this.state.pausePressed = true;
    } else if (e.code === "Escape") {
      this.state.backPressed = true;
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
    if (k) {
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
    for (const k of ["left", "right", "up", "down", "jump"] as Held[]) this.state[k] = this.keyHeld[k] || this.touchHeld[k];
  }

  /** Called by on-screen buttons. */
  setTouch(button: Held, held: boolean) {
    if (held && !this.touchHeld[button]) {
      if (button === "jump") {
        this.state.jumpPressed = true;
        this.state.startPressed = true;
      }
      if (button === "up") this.state.upPressed = true;
      if (button === "down") this.state.downPressed = true;
    }
    this.touchHeld[button] = held;
    this.recompute();
    if (held) this.onAnyPress?.();
  }

  press(kind: "pause" | "start" | "back") {
    if (kind === "pause") this.state.pausePressed = true;
    if (kind === "start") this.state.startPressed = true;
    if (kind === "back") this.state.backPressed = true;
    this.onAnyPress?.();
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
    const s = this.state;
    s.jumpPressed = s.upPressed = s.downPressed = s.startPressed = s.pausePressed = s.restartPressed = s.mutePressed = s.musicPressed = s.backPressed = false;
  }
}
