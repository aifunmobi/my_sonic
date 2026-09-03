import { useEffect, useRef, useState } from "react";
import { GameAudio } from "@/game/audio";
import { Game } from "@/game/game";
import { Input } from "@/game/input";
import { Renderer } from "@/game/render";
import { SCALE, STEP, VIEW_H, VIEW_W } from "@/game/constants";

type TouchButton = "left" | "right" | "down" | "up" | "jump";

declare global {
  interface Window {
    __spinRush?: { game: Game; input: Input };
  }
}

export default function SonicGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<Input | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const [muted, setMuted] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(typeof window !== "undefined" && (navigator.maxTouchPoints > 0 || "ontouchstart" in window));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = VIEW_W * SCALE;
    canvas.height = VIEW_H * SCALE;

    const audio = new GameAudio();
    const input = new Input();
    const game = new Game(audio);
    const renderer = new Renderer();
    audioRef.current = audio;
    inputRef.current = input;
    setMuted(audio.muted);
    input.onAnyPress = () => audio.unlock();
    input.attach(window);
    window.__spinRush = { game, input };

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000);
      last = now;
      let steps = 0;
      while (acc >= STEP && steps < 4) {
        game.step(input.state);
        input.endStep();
        acc -= STEP;
        steps++;
      }
      renderer.render(ctx, game, canvas.width, canvas.height);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      input.detach(window);
      audio.dispose();
      delete window.__spinRush;
      audioRef.current = null;
      inputRef.current = null;
    };
  }, []);

  const press = (b: TouchButton, held: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    inputRef.current?.setTouch(b, held);
  };

  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.unlock();
    a.setMuted(!a.muted);
    setMuted(a.muted);
  };

  const fullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const btn =
    "select-none touch-none rounded-full bg-white/15 backdrop-blur border border-white/30 text-white font-bold flex items-center justify-center active:bg-white/40";
  const iconBtn = "px-3 py-1 rounded-md text-sm font-semibold text-white/90 hover:bg-white/10 border border-white/10";

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#07102a] text-white p-2 sm:p-4">
      <div className="w-full max-w-5xl flex items-center justify-between mb-2">
        <h1 className="text-lg sm:text-2xl font-black tracking-[0.3em] uppercase">Spin Rush</h1>
        <div className="flex gap-2">
          <button className={iconBtn} onClick={toggleMute} aria-label="Toggle sound">
            {muted ? "Sound: off" : "Sound: on"}
          </button>
          <button className={iconBtn} onClick={() => inputRef.current?.press("pause")} aria-label="Pause">
            Pause
          </button>
          <button className={iconBtn} onClick={fullscreen} aria-label="Fullscreen">
            Fullscreen
          </button>
        </div>
      </div>

      <div ref={wrapperRef} className="relative w-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ imageRendering: "pixelated" }}
          onPointerDown={() => {
            if (!touch) return;
            inputRef.current?.setTouch("jump", true);
            setTimeout(() => inputRef.current?.setTouch("jump", false), 60);
          }}
        />
        {touch && (
          <>
            <div className="absolute left-3 bottom-3 flex items-end gap-2">
              <button className={`${btn} w-14 h-14 sm:w-16 sm:h-16 text-2xl`} onPointerDown={press("left", true)} onPointerUp={press("left", false)} onPointerCancel={press("left", false)} onPointerLeave={press("left", false)} aria-label="Left">
                ◀
              </button>
              <div className="flex flex-col gap-2">
                <button className={`${btn} w-14 h-10 sm:w-16 sm:h-12 text-xl`} onPointerDown={press("up", true)} onPointerUp={press("up", false)} onPointerCancel={press("up", false)} onPointerLeave={press("up", false)} aria-label="Up">
                  ▲
                </button>
                <button className={`${btn} w-14 h-10 sm:w-16 sm:h-12 text-xl`} onPointerDown={press("down", true)} onPointerUp={press("down", false)} onPointerCancel={press("down", false)} onPointerLeave={press("down", false)} aria-label="Down / Roll">
                  ▼
                </button>
              </div>
              <button className={`${btn} w-14 h-14 sm:w-16 sm:h-16 text-2xl`} onPointerDown={press("right", true)} onPointerUp={press("right", false)} onPointerCancel={press("right", false)} onPointerLeave={press("right", false)} aria-label="Right">
                ▶
              </button>
            </div>
            <div className="absolute right-3 bottom-3">
              <button className={`${btn} w-16 h-16 sm:w-20 sm:h-20 text-base sm:text-lg`} onPointerDown={press("jump", true)} onPointerUp={press("jump", false)} onPointerCancel={press("jump", false)} onPointerLeave={press("jump", false)} aria-label="Jump">
                JUMP
              </button>
            </div>
          </>
        )}
      </div>

      <p className="w-full max-w-5xl mt-2 text-xs text-blue-100/60">
        Five zones. Collect rings, hit loops at full speed, bounce on springs, defeat the boss in Sky Fortress. Best scores, unlocked zones and settings are saved in your browser.
      </p>
    </div>
  );
}
