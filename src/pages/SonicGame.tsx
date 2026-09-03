import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Maximize2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameAudio } from "@/game/audio";
import { Game } from "@/game/game";
import { Input } from "@/game/input";
import { buildLevel, LEVEL_1 } from "@/game/level";
import { Renderer } from "@/game/render";
import { STEP, VIEW_H, VIEW_W } from "@/game/constants";

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

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;

    const audio = new GameAudio();
    const input = new Input();
    const game = new Game(buildLevel(LEVEL_1), audio);
    const renderer = new Renderer();
    audioRef.current = audio;
    inputRef.current = input;
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.render(ctx, game);
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

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#0b1a3a] text-white p-2 sm:p-4">
      <div className="w-full max-w-5xl flex items-center justify-between mb-2">
        <Button asChild variant="ghost" size="sm" className="gap-2 text-white hover:text-white hover:bg-white/10">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </Button>
        <h1 className="text-lg sm:text-2xl font-black tracking-widest uppercase">Spin Rush</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:text-white hover:bg-white/10" aria-label="Toggle sound">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={fullscreen} className="text-white hover:text-white hover:bg-white/10" aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={wrapperRef} className="relative w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          style={{ imageRendering: "auto" }}
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
              <button className={`${btn} w-14 h-14 sm:w-16 sm:h-16 text-2xl`} onPointerDown={press("down", true)} onPointerUp={press("down", false)} onPointerCancel={press("down", false)} onPointerLeave={press("down", false)} aria-label="Down / Roll">
                ▼
              </button>
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

      <div className="w-full max-w-5xl mt-3 text-xs sm:text-sm text-blue-100/80 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
        <span><b className="text-white">Move</b> Arrows / WASD</span>
        <span><b className="text-white">Jump</b> Space / Z / X</span>
        <span><b className="text-white">Roll</b> Down while running</span>
        <span><b className="text-white">Spin dash</b> Down + Jump, release Down</span>
        <span><b className="text-white">Pause</b> P / Esc</span>
        <span><b className="text-white">Restart</b> R</span>
        <span><b className="text-white">Sound</b> M</span>
        <span><b className="text-white">Music</b> N</span>
      </div>
      <p className="w-full max-w-5xl mt-2 text-xs text-blue-100/60">
        Collect rings, hit loops at full speed, bounce on springs, and reach the goal sign. Rings protect you from one hit. Every 100 rings is an extra life.
      </p>
    </div>
  );
}
