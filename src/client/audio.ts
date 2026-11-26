/** Synthesised sound effects and a gentle generative salon soundtrack (no audio files needed). */
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private reverb!: ConvolverNode;
  private musicTimer: number | null = null;
  private chord = 0;
  sfxOn = localStorage.getItem('artsociety.sfx') !== 'off';
  musicOn = localStorage.getItem('artsociety.music') !== 'off';

  /** Must be called from a user gesture (browser autoplay rules). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    this.reverb.connect(wet).connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = this.sfxOn ? 0.9 : 0;
    this.sfx.connect(this.master);
    this.sfx.connect(this.reverb);
    this.music = ctx.createGain();
    this.music.gain.value = this.musicOn ? 0.5 : 0;
    this.music.connect(this.master);
    this.music.connect(this.reverb);
    this.startMusic();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    localStorage.setItem('artsociety.sfx', on ? 'on' : 'off');
    if (this.ctx) this.sfx.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    localStorage.setItem('artsociety.music', on ? 'on' : 'off');
    if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.4);
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; attack?: number; when?: number; glide?: number; dest?: AudioNode; filter?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.when ?? 0);
    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.glide) osc.frequency.exponentialRampToValueAtTime(opts.glide, t + dur);
    const g = ctx.createGain();
    const peak = opts.gain ?? 0.2;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = osc;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(opts.dest ?? this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noise(dur: number, opts: { gain?: number; when?: number; type?: BiquadFilterType; freq?: number; q?: number; sweep?: number } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (opts.when ?? 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1200, t);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
  }

  click() {
    this.tone(1200, 0.05, { gain: 0.05 });
  }
  hop(i: number) {
    this.tone(midi(64 + PENTA[i % 7]), 0.12, { type: 'triangle', gain: 0.12 });
    this.noise(0.03, { gain: 0.08, freq: 2500 });
  }
  diceShake() {
    for (let i = 0; i < 7; i++) this.noise(0.04, { gain: 0.12, freq: 1800 + Math.random() * 1500, when: i * 0.05, q: 4 });
  }
  diceHit() {
    this.noise(0.06, { gain: 0.22, freq: 900, q: 2 });
    this.tone(140, 0.12, { gain: 0.2, glide: 70 });
  }
  coin() {
    this.tone(1318, 0.25, { gain: 0.08 });
    this.tone(1975, 0.35, { gain: 0.06, when: 0.07 });
  }
  sparkle() {
    [0, 4, 7, 12].forEach((n, i) => this.tone(midi(84 + n), 0.3, { gain: 0.05, when: i * 0.05 }));
  }
  brush() {
    this.noise(0.55, { gain: 0.12, freq: 800, sweep: 3200, q: 0.8 });
    this.sparkle();
  }
  paper() {
    this.noise(0.18, { gain: 0.1, type: 'highpass', freq: 2500 });
  }
  land() {
    this.tone(midi(67), 0.25, { type: 'triangle', gain: 0.08 });
  }
  gavel(times = 1) {
    for (let i = 0; i < times; i++) {
      this.tone(160, 0.18, { gain: 0.32, glide: 60, when: i * 0.28 });
      this.noise(0.05, { gain: 0.25, freq: 1400, when: i * 0.28 });
    }
  }
  chime() {
    this.tone(midi(76), 1.4, { gain: 0.08 });
    this.tone(midi(83), 1.6, { gain: 0.05, when: 0.12 });
    this.tone(midi(88), 1.8, { gain: 0.04, when: 0.24 });
  }
  gong() {
    this.tone(98, 2.4, { gain: 0.16, type: 'sine' });
    this.tone(196, 1.8, { gain: 0.06, type: 'sine' });
    this.tone(293, 1.4, { gain: 0.04, type: 'sine' });
  }
  trend(up: boolean) {
    this.tone(up ? midi(72) : midi(76), 0.18, { gain: 0.07, type: 'triangle' });
    this.tone(up ? midi(79) : midi(69), 0.3, { gain: 0.07, type: 'triangle', when: 0.12 });
  }
  error() {
    this.tone(150, 0.2, { type: 'square', gain: 0.04, filter: 900 });
  }
  /** A frame meeting the wall: a soft wooden knock. */
  hang() {
    this.tone(180, 0.12, { gain: 0.22, glide: 110, type: 'triangle' });
    this.noise(0.05, { gain: 0.12, freq: 900, q: 1.5 });
    this.tone(midi(79), 0.35, { gain: 0.03, when: 0.05 });
  }
  /** A social gaffe: a little descending sour interval. */
  faux() {
    this.tone(midi(70), 0.25, { gain: 0.06, type: 'triangle' });
    this.tone(midi(69), 0.4, { gain: 0.06, type: 'triangle', when: 0.16 });
    this.tone(midi(63), 0.5, { gain: 0.05, type: 'triangle', when: 0.32 });
  }
  /** A marker stepping along the prestige track. */
  tick() {
    this.tone(midi(84), 0.06, { gain: 0.04, type: 'triangle' });
  }
  fanfare() {
    const chords = [
      [60, 64, 67],
      [65, 69, 72],
      [67, 71, 74],
      [72, 76, 79, 84],
    ];
    chords.forEach((c, i) => c.forEach((n) => this.tone(midi(n), i === 3 ? 1.8 : 0.42, { type: 'sawtooth', gain: 0.05, attack: 0.03, when: i * 0.32, filter: 2200 })));
  }
  drumroll(seconds = 2.4) {
    const n = Math.floor(seconds * 22);
    for (let i = 0; i < n; i++) this.noise(0.05, { gain: 0.04 + (i / n) * 0.16, freq: 300 + Math.random() * 200, q: 1.5, when: i / 22 });
    this.noise(1.8, { gain: 0.18, type: 'highpass', freq: 5000, when: seconds });
    this.tone(70, 0.8, { gain: 0.3, glide: 40, when: seconds });
  }

  private startMusic() {
    if (this.musicTimer !== null) return;
    // Cmaj7, Am9, Fmaj7, G6 — slow pads with a harp-like melody on top.
    const chords = [
      [48, 55, 59, 64, 67],
      [45, 52, 57, 60, 64],
      [41, 48, 52, 57, 64],
      [43, 50, 55, 59, 64],
    ];
    const bar = () => {
      const ctx = this.ctx;
      if (!ctx) return;
      const c = chords[this.chord++ % chords.length];
      for (const n of c) {
        this.tone(midi(n), 6.5, { type: 'sine', gain: 0.022, attack: 1.8, dest: this.music });
        this.tone(midi(n) * 1.003, 6.5, { type: 'triangle', gain: 0.008, attack: 2.2, dest: this.music, filter: 1200 });
      }
      const notes = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < notes; i++) {
        const n = 72 + PENTA[Math.floor(Math.random() * 7)] - (Math.random() < 0.3 ? 12 : 0);
        this.tone(midi(n), 2.2, { type: 'triangle', gain: 0.018, when: 0.6 + i * (0.8 + Math.random() * 0.6), dest: this.music, filter: 2600 });
      }
    };
    bar();
    this.musicTimer = window.setInterval(bar, 6000);
  }
}
