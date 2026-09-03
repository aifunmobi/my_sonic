/**
 * Synthesized retro sound effects and looping chiptune tracks (Web Audio).
 * No external assets are used.
 */

type Track = { bpm: number; lead: number[]; bass: number[]; leadWave: OscillatorType; arp?: number[] };

// Note numbers are MIDI; 0 = rest. 32 sixteenth steps per pattern.
const TRACKS: Track[] = [
  {
    // Emerald Coast: bright major bounce
    bpm: 150,
    leadWave: "square",
    lead: [76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 79, 0, 81, 0, 79, 0, 74, 0, 78, 0, 81, 0, 78, 0, 74, 0, 78, 0, 79, 0, 76, 0],
    bass: [40, 0, 40, 0, 47, 0, 40, 0, 40, 0, 40, 0, 47, 0, 45, 0, 38, 0, 38, 0, 45, 0, 38, 0, 38, 0, 38, 0, 45, 0, 43, 0],
    arp: [64, 67, 71, 67],
  },
  {
    // Sunset Bay: laid-back lydian sway
    bpm: 132,
    leadWave: "triangle",
    lead: [72, 0, 0, 74, 76, 0, 79, 0, 0, 78, 76, 0, 74, 0, 0, 0, 69, 0, 0, 71, 72, 0, 76, 0, 0, 74, 72, 0, 71, 0, 0, 0],
    bass: [36, 0, 0, 36, 43, 0, 0, 0, 41, 0, 0, 41, 48, 0, 0, 0, 33, 0, 0, 33, 40, 0, 0, 0, 38, 0, 0, 38, 43, 0, 0, 0],
    arp: [60, 64, 67, 71],
  },
  {
    // Mossy Ruins: minor, mysterious
    bpm: 140,
    leadWave: "square",
    lead: [69, 0, 72, 0, 76, 0, 72, 0, 71, 0, 0, 0, 67, 0, 0, 0, 65, 0, 69, 0, 72, 0, 69, 0, 68, 0, 0, 0, 64, 0, 0, 0],
    bass: [33, 0, 33, 0, 40, 0, 33, 0, 31, 0, 31, 0, 38, 0, 31, 0, 29, 0, 29, 0, 36, 0, 29, 0, 28, 0, 28, 0, 35, 0, 28, 0],
    arp: [57, 60, 64, 60],
  },
  {
    // Magma Cavern: driving, dark
    bpm: 168,
    leadWave: "sawtooth",
    lead: [62, 62, 0, 65, 0, 62, 69, 0, 68, 0, 65, 0, 62, 0, 0, 0, 60, 60, 0, 63, 0, 60, 67, 0, 65, 0, 63, 0, 62, 0, 0, 0],
    bass: [38, 0, 38, 38, 0, 38, 0, 38, 36, 0, 36, 36, 0, 36, 0, 36, 34, 0, 34, 34, 0, 34, 0, 34, 41, 0, 41, 41, 0, 41, 0, 41],
    arp: [50, 53, 57, 53],
  },
  {
    // Sky Fortress: heroic, fast
    bpm: 160,
    leadWave: "square",
    lead: [67, 0, 71, 0, 74, 0, 79, 0, 78, 0, 74, 0, 71, 0, 74, 0, 72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 74, 0],
    bass: [43, 0, 43, 0, 50, 0, 43, 0, 38, 0, 38, 0, 45, 0, 38, 0, 36, 0, 36, 0, 43, 0, 36, 0, 41, 0, 41, 0, 48, 0, 41, 0],
    arp: [55, 59, 62, 59],
  },
  {
    // Boss: tense chromatic riff
    bpm: 176,
    leadWave: "sawtooth",
    lead: [57, 0, 57, 60, 0, 63, 62, 0, 57, 0, 57, 60, 0, 66, 65, 0, 57, 0, 57, 60, 0, 63, 62, 0, 68, 0, 67, 0, 65, 0, 63, 0],
    bass: [33, 33, 0, 33, 33, 0, 33, 0, 33, 33, 0, 33, 33, 0, 36, 0, 33, 33, 0, 33, 33, 0, 33, 0, 32, 32, 0, 31, 31, 0, 30, 0],
  },
];

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  private currentTrack = 0;
  muted = false;
  musicOn = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.4;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.45;
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
    if (this.master) this.master.gain.value = m ? 0 : 0.4;
  }

  private tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.3, slideTo?: number, delay = 0, dest?: AudioNode) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(dest ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.2, delay = 0, lowpass?: number) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass;
      g.connect(f);
      f.connect(this.sfxGain);
    } else g.connect(this.sfxGain);
    src.start(ctx.currentTime + delay);
  }

  // ---- SFX ----
  ring() {
    this.tone(1975.5, 0.07, "square", 0.16);
    this.tone(2637, 0.18, "square", 0.16, undefined, 0.055);
  }
  jump() {
    this.tone(220, 0.22, "square", 0.22, 880);
  }
  roll() {
    this.tone(160, 0.14, "sawtooth", 0.14, 520);
  }
  spindashCharge(level: number) {
    this.tone(120 + level * 30, 0.18, "sawtooth", 0.2, 360 + level * 70);
    this.noise(0.08, 0.08, 0, 1200);
  }
  spindashRelease() {
    this.tone(300, 0.3, "sawtooth", 0.22, 1400);
    this.noise(0.2, 0.12, 0, 2500);
  }
  skid() {
    this.noise(0.14, 0.14, 0, 3000);
  }
  hurt() {
    this.tone(520, 0.08, "square", 0.25, 400);
    this.tone(380, 0.3, "square", 0.25, 90, 0.08);
  }
  ringLoss() {
    for (let i = 0; i < 8; i++) this.tone(1800 - i * 150, 0.05, "square", 0.12, 1500 - i * 150, i * 0.035);
    this.noise(0.25, 0.1, 0, 4000);
  }
  spring() {
    this.tone(420, 0.06, "square", 0.22, 900);
    this.tone(900, 0.28, "square", 0.2, 1900, 0.06);
  }
  pop() {
    this.noise(0.22, 0.28, 0, 1800);
    this.tone(240, 0.18, "square", 0.16, 50);
  }
  monitor() {
    this.noise(0.1, 0.18, 0, 3000);
    this.tone(660, 0.08, "square", 0.2);
    this.tone(990, 0.14, "square", 0.2, undefined, 0.08);
  }
  checkpoint() {
    const notes = [880, 1108.7, 1318.5, 1760];
    notes.forEach((n, i) => this.tone(n, 0.14, "square", 0.2, undefined, i * 0.08));
  }
  extraLife() {
    const notes = [784, 988, 1175, 1568, 1319, 1568, 1976];
    notes.forEach((n, i) => this.tone(n, 0.14, "square", 0.22, undefined, i * 0.1));
  }
  death() {
    this.tone(600, 0.15, "square", 0.25, 300);
    this.tone(300, 0.7, "sawtooth", 0.2, 60, 0.12);
  }
  goal() {
    const notes = [659, 784, 880, 1047, 880, 1047, 1319, 1568, 1319, 1568, 2093];
    notes.forEach((n, i) => this.tone(n, 0.16, "square", 0.22, undefined, i * 0.11));
    notes.forEach((n, i) => this.tone(n / 2, 0.2, "triangle", 0.18, undefined, i * 0.11));
  }
  tally() {
    this.tone(1760, 0.04, "square", 0.12);
  }
  tallyDone() {
    this.tone(1319, 0.1, "square", 0.2);
    this.tone(1760, 0.25, "square", 0.2, undefined, 0.1);
  }
  shoot() {
    this.tone(900, 0.12, "sawtooth", 0.12, 200);
  }
  bossHit() {
    this.noise(0.15, 0.25, 0, 2500);
    this.tone(180, 0.25, "square", 0.22, 60);
  }
  explosion() {
    this.noise(0.5, 0.35, 0, 900);
    this.tone(120, 0.5, "sawtooth", 0.2, 30);
  }
  select() {
    this.tone(1200, 0.06, "square", 0.15);
  }
  splash() {
    this.noise(0.3, 0.2, 0, 1500);
  }

  // ---- Music ----
  private midi(n: number) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  startMusic(track = this.currentTrack) {
    const ctx = this.ensure();
    if (!ctx) return;
    if (this.musicTimer !== null && track === this.currentTrack) return;
    this.stopMusic();
    this.currentTrack = track;
    if (!this.musicOn) return;
    const tr = TRACKS[track % TRACKS.length];
    this.nextNoteTime = ctx.currentTime + 0.05;
    this.stepIndex = 0;
    const stepDur = 60 / tr.bpm / 4;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain) return;
      while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
        const i = this.stepIndex % tr.lead.length;
        const lead = tr.lead[i];
        const bass = tr.bass[i];
        const delay = Math.max(0, this.nextNoteTime - this.ctx.currentTime);
        if (lead) this.tone(this.midi(lead), stepDur * 1.7, tr.leadWave, 0.07, undefined, delay, this.musicGain);
        if (bass) this.tone(this.midi(bass), stepDur * 1.3, "triangle", 0.16, undefined, delay, this.musicGain);
        if (tr.arp && this.stepIndex % 2 === 1) this.tone(this.midi(tr.arp[(this.stepIndex >> 1) % tr.arp.length]), stepDur * 0.9, "square", 0.03, undefined, delay, this.musicGain);
        if (i % 4 === 0) this.tone(100, 0.09, "sine", 0.22, 35, delay, this.musicGain);
        if (i % 8 === 4) this.noise(0.06, 0.06, delay, 6000);
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
    if (this.musicOn) {
      const t = this.currentTrack;
      this.currentTrack = -1;
      this.startMusic(t);
    } else this.stopMusic();
    return this.musicOn;
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
  }
}
