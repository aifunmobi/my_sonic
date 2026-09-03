/**
 * Synthesized retro sound effects and a looping chiptune track.
 * Everything is generated with the Web Audio API; no external assets.
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  muted = false;
  musicOn = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Must be called from a user gesture on iOS Safari. */
  unlock() {
    this.ensure();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.35;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "square",
    vol = 0.3,
    slideTo?: number,
    delay = 0,
    dest?: AudioNode,
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(dest ?? this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.2, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.master);
    src.start(ctx.currentTime + delay);
  }

  ring() {
    this.tone(2093, 0.08, "square", 0.18);
    this.tone(2637, 0.16, "square", 0.18, undefined, 0.06);
  }
  jump() {
    this.tone(300, 0.18, "square", 0.22, 900);
  }
  roll() {
    this.tone(220, 0.12, "sawtooth", 0.12, 440);
  }
  spindashCharge(level: number) {
    this.tone(180 + level * 40, 0.14, "sawtooth", 0.18, 260 + level * 60);
  }
  spindashRelease() {
    this.tone(400, 0.25, "sawtooth", 0.2, 1200);
    this.noise(0.15, 0.1);
  }
  skid() {
    this.noise(0.12, 0.12);
  }
  hurt() {
    this.tone(400, 0.25, "square", 0.25, 120);
  }
  ringLoss() {
    for (let i = 0; i < 6; i++) this.tone(1500 - i * 120, 0.06, "square", 0.12, undefined, i * 0.04);
  }
  spring() {
    this.tone(500, 0.25, "square", 0.22, 1600);
  }
  pop() {
    this.noise(0.18, 0.25);
    this.tone(200, 0.15, "square", 0.15, 60);
  }
  monitor() {
    this.tone(660, 0.08, "square", 0.2);
    this.tone(880, 0.12, "square", 0.2, undefined, 0.08);
  }
  checkpoint() {
    this.tone(880, 0.1, "square", 0.2);
    this.tone(1175, 0.1, "square", 0.2, undefined, 0.1);
    this.tone(1568, 0.2, "square", 0.2, undefined, 0.2);
  }
  extraLife() {
    const notes = [784, 988, 1175, 1568, 1319, 1568];
    notes.forEach((n, i) => this.tone(n, 0.12, "square", 0.22, undefined, i * 0.1));
  }
  death() {
    this.tone(500, 0.6, "square", 0.25, 80);
  }
  goal() {
    const notes = [659, 784, 880, 1047, 880, 1047, 1319, 1568];
    notes.forEach((n, i) => this.tone(n, 0.16, "square", 0.22, undefined, i * 0.12));
  }
  tally() {
    this.tone(1760, 0.04, "square", 0.12);
  }

  // ---- Music: a tiny two-voice sequencer with an original melody ----
  private static LEAD = [
    // 32 sixteenth-steps, MIDI note numbers (0 = rest)
    76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 79, 0, 81, 0, 79, 0,
    74, 0, 78, 0, 81, 0, 78, 0, 74, 0, 78, 0, 79, 0, 76, 0,
    72, 0, 76, 0, 79, 0, 76, 0, 72, 0, 76, 0, 77, 0, 76, 0,
    74, 0, 78, 0, 81, 0, 83, 0, 84, 0, 83, 0, 81, 0, 79, 0,
  ];
  private static BASS = [
    40, 0, 40, 0, 47, 0, 40, 0, 40, 0, 40, 0, 47, 0, 45, 0,
    38, 0, 38, 0, 45, 0, 38, 0, 38, 0, 38, 0, 45, 0, 43, 0,
    36, 0, 36, 0, 43, 0, 36, 0, 36, 0, 36, 0, 43, 0, 41, 0,
    38, 0, 38, 0, 45, 0, 38, 0, 43, 0, 43, 0, 47, 0, 47, 0,
  ];

  private midi(n: number) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null || !this.musicOn) return;
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.stepIndex = 0;
    const stepDur = 60 / 150 / 4; // 150 BPM sixteenths
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        const i = this.stepIndex % GameAudio.LEAD.length;
        const lead = GameAudio.LEAD[i];
        const bass = GameAudio.BASS[i];
        const delay = Math.max(0, this.nextNoteTime - this.ctx.currentTime);
        if (lead) this.tone(this.midi(lead), stepDur * 1.6, "square", 0.08, undefined, delay, this.musicGain);
        if (bass) this.tone(this.midi(bass), stepDur * 1.2, "triangle", 0.16, undefined, delay, this.musicGain);
        if (i % 4 === 0) this.tone(90, 0.08, "sine", 0.2, 40, delay, this.musicGain);
        if (i % 8 === 4) this.noise(0.05, 0.05, delay);
        this.nextNoteTime += stepDur;
        this.stepIndex++;
      }
    }, 80);
  }

  stopMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic();
    else this.stopMusic();
    return this.musicOn;
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
  }
}
