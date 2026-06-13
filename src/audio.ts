// Lightweight Web Audio synthesis — a calm ambient BGM loop and a sparkle SFX.
// No asset files: everything is generated with oscillators at runtime.
// A single shared instance survives scene restarts so the BGM never doubles up.

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmTimer: ReturnType<typeof setTimeout> | null = null;
  private step = 0;

  bgmOn = true;
  sfxOn = true;

  // Gentle, mostly-pentatonic pad chords (low) + a soft bell melody on top.
  private readonly chords: number[][] = [
    [196.00, 246.94, 293.66], // G  B  D
    [174.61, 220.00, 261.63], // F  A  C
    [220.00, 261.63, 329.63], // A  C  E
    [196.00, 261.63, 329.63], // G  C  E
  ];
  private readonly melody = [392.00, 440.00, 493.88, 587.33, 659.25]; // G A B D E
  private readonly melodyPattern = [0, 2, 1, 3, 2, 4, 3, 1];

  private ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.0001;
    this.bgmGain.connect(this.master);
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private soft(freq: number, when: number, dur: number, gain: number, type: OscillatorType, dest: AudioNode) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  startBgm() {
    this.ensure();
    if (!this.ctx || this.bgmTimer !== null) return;
    this.setBgmEnabled(this.bgmOn);
    const stepMs = 2400;
    const tick = () => {
      this.bgmTick();
      this.bgmTimer = setTimeout(tick, stepMs);
    };
    tick();
  }

  private bgmTick() {
    if (!this.ctx || !this.bgmGain) return;
    const t = this.ctx.currentTime + 0.05;
    const chord = this.chords[this.step % this.chords.length];
    chord.forEach(f => this.soft(f, t, 2.8, 0.055, 'sine', this.bgmGain!)); // soft pad
    const mi = this.melodyPattern[this.step % this.melodyPattern.length];
    this.soft(this.melody[mi], t + 0.25, 1.7, 0.045, 'triangle', this.bgmGain!); // bell
    this.step++;
  }

  setBgmEnabled(on: boolean) {
    this.bgmOn = on;
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(Math.max(0.0001, this.bgmGain.gain.value), now);
    this.bgmGain.gain.linearRampToValueAtTime(on ? 0.16 : 0.0001, now + 1.2);
  }

  /** Bright ascending sparkle — played when the mashup particles burst. */
  playBurst() {
    if (!this.sfxOn) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const t = this.ctx.currentTime;
    const freqs = [880, 1174.66, 1567.98, 2093.0]; // A5 D6 G6 C7 — twinkle up
    freqs.forEach((f, i) => this.soft(f, t + i * 0.035, 0.18, 0.11, 'triangle', this.master!));
    this.soft(659.25, t, 0.10, 0.06, 'sine', this.master); // soft low body
  }
}

export const gameAudio = new GameAudio();
