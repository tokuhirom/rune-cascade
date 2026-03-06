/**
 * Procedural audio using Web Audio API.
 * No external files needed — all sounds are synthesized on-the-fly.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmNodes: AudioNode[] = [];
  private bgmPlaying = false;
  private bgmTrack: string = '';
  private muted = false;

  init(): void {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.25;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);

      // Pause BGM when tab/screen is hidden (phone lock, tab switch)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.ctx?.suspend();
        } else {
          this.ctx?.resume();
        }
      });
    } catch {
      // Web Audio not available
    }
  }

  private ensureContext(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.5;
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  // --- SFX ---

  /** Rune match/clear: bright sparkle sound */
  playMatchSfx(comboCount: number = 1): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    // Higher pitch with more combos
    const baseFreq = 600 + comboCount * 80;

    // Quick ascending arpeggio
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq + i * 150;
      gain.gain.setValueAtTime(0.3, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.2);
    }
  }

  /** Combo callout: exciting escalating fanfare */
  playComboSfx(comboCount: number): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const baseFreq = 400 + comboCount * 60;

    // Fanfare arpeggio — more notes for higher combos
    const noteCount = Math.min(3 + comboCount, 8);
    const intervals = [0, 4, 7, 12, 16, 19, 24, 28]; // major scale semitones

    for (let i = 0; i < noteCount; i++) {
      const freq = baseFreq * Math.pow(2, intervals[i % intervals.length] / 12);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'square' : 'triangle';
      osc.frequency.value = freq;

      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    // Bass punch for big combos (5+)
    if (comboCount >= 5) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  }

  /** Enemy attack: heavy impact */
  playEnemyAttackSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;

    // Low thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);

    // Noise burst (impact texture)
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.2);
  }

  /** Enemy defeated: victory jingle */
  playDefeatSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    // Triumphant ascending chord
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
      gain.gain.setValueAtTime(0.25, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.85);
    }

    // Final chord sustain
    const chord = [523, 659, 784];
    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + 0.5;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 1.3);
    }
  }

  /** Player takes damage */
  playDamageSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  /** Heal sound: gentle chime */
  playHealSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const notes = [523, 659, 784]; // C E G
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i];
      const t = now + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }

  /** Shield gain sound */
  playShieldSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  /** Gold collect sound */
  playGoldSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1200 + i * 400;
      const t = now + i * 0.06;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.15);
    }
  }

  /** Swap runes sound */
  playSwapSfx(): void {
    if (!this.ctx || !this.sfxGain) return;
    this.ensureContext();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(500, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // --- BGM ---

  startBgm(track: string): void {
    if (!this.ctx || !this.bgmGain) return;
    // Always stop and restart to prevent layer stacking across scene transitions
    this.stopBgm();
    this.ensureContext();
    this.bgmPlaying = true;
    this.bgmTrack = track;
    this.scheduleBgmLoop();
  }

  /** Convenience alias for battle BGM */
  startBattleBgm(): void {
    this.startBgm('battle');
  }

  stopBgm(): void {
    this.bgmPlaying = false;
    this.bgmTrack = '';
    for (const node of this.bgmNodes) {
      try {
        if (node instanceof AudioScheduledSourceNode) {
          node.stop();
        }
      } catch {
        // already stopped
      }
    }
    this.bgmNodes = [];
  }

  private scheduleBgmLoop(): void {
    if (!this.ctx || !this.bgmGain || !this.bgmPlaying) return;

    const now = this.ctx.currentTime;
    let loopDur: number;

    switch (this.bgmTrack) {
      case 'town': loopDur = this.playTownBgm(now); break;
      case 'shop': loopDur = this.playShopBgm(now); break;
      case 'boss': loopDur = this.playBossBgm(now); break;
      case 'midboss': loopDur = this.playMidBossBgm(now); break;
      case 'finalboss': loopDur = this.playFinalBossBgm(now); break;
      case 'ending': loopDur = this.playEndingBgm(now); break;
      default: loopDur = this.playBattleBgm(now); break;
    }

    const timerId = setTimeout(() => {
      if (this.bgmPlaying) {
        this.bgmNodes = [];
        this.scheduleBgmLoop();
      }
    }, (loopDur - 0.1) * 1000);
    const cleanup = { stop: () => clearTimeout(timerId) } as unknown as AudioScheduledSourceNode;
    this.bgmNodes.push(cleanup);
  }

  // Helper: schedule an oscillator note (smooth fade-in/out to avoid clicks)
  private schedNote(
    freq: number, t: number, dur: number,
    type: OscillatorType = 'triangle', vol: number = 0.15,
  ): void {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const fadeIn = Math.min(0.015, dur * 0.1);
    const fadeOut = Math.min(0.04, dur * 0.2);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + fadeIn);
    gain.gain.setValueAtTime(vol, t + dur - fadeOut);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(t);
    osc.stop(t + dur + 0.01);
    this.bgmNodes.push(osc);
  }

  // Helper: schedule a bass note with staccato envelope (smooth edges)
  private schedBass(freq: number, t: number, dur: number, type: OscillatorType = 'square', vol: number = 0.12): void {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const fadeIn = Math.min(0.01, dur * 0.05);
    const fadeOut = Math.min(0.03, dur * 0.15);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + fadeIn);
    gain.gain.setValueAtTime(vol, t + dur - fadeOut);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(t);
    osc.stop(t + dur + 0.01);
    this.bgmNodes.push(osc);
  }

  // Helper: hi-hat percussion
  private schedHiHat(t: number, loud: boolean = false): void {
    const bufLen = Math.floor(this.ctx!.sampleRate * 0.03);
    const buf = this.ctx!.createBuffer(1, bufLen, this.ctx!.sampleRate);
    const d = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) {
      d[j] = (Math.random() * 2 - 1) * (1 - j / bufLen);
    }
    const src = this.ctx!.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(loud ? 0.08 : 0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain!);
    src.start(t);
    src.stop(t + 0.05);
    this.bgmNodes.push(src);
  }

  // Helper: kick drum
  private schedKick(t: number, vol: number = 0.2): void {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(t);
    osc.stop(t + 0.25);
    this.bgmNodes.push(osc);
  }

  // === Normal Battle BGM (Em-C-D-Bm, 145bpm, tense dungeon crawl) ===
  private playBattleBgm(now: number): number {
    const bpm = 145;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const loopDur = bar * 4;

    // Driving sawtooth bass (8th note pulse for urgency)
    const bassRoots = [82, 82, 65, 65, 73, 73, 62, 62]; // Em, Em, C, C, D, D, Bm, Bm (low octave)
    for (let b = 0; b < 4; b++) {
      for (let i = 0; i < 4; i++) {
        const root = bassRoots[b * 2 + (i < 2 ? 0 : 1)];
        const freq = i % 2 === 0 ? root : root * 1.5; // root-fifth pattern
        this.schedBass(freq, now + b*bar + i*beat, beat*0.8, 'sawtooth', 0.13);
      }
      // 8th note fills on beats 3-4
      for (let i = 0; i < 4; i++) {
        const root = bassRoots[b * 2 + 1];
        this.schedBass(root, now + b*bar + beat*2 + i*beat*0.5, beat*0.4, 'sawtooth', 0.09);
      }
    }

    // Tense melody (square wave, minor key, fast rhythmic phrases)
    const mel: [number, number, number][] = [
      // Bar 1 (Em): driving minor riff
      [660, 0, beat*0.5], [622, beat*0.5, beat*0.25], [660, beat*0.75, beat*0.25],
      [784, beat, beat*0.5], [740, beat*1.5, beat*0.5],
      [660, beat*2, beat*0.5], [588, beat*2.5, beat*0.5], [524, beat*3, beat*0.5],
      [588, beat*3.5, beat*0.5],
      // Bar 2 (C): tension build
      [524, bar, beat*0.5], [588, bar+beat*0.5, beat*0.5],
      [660, bar+beat, beat], [784, bar+beat*2, beat*0.5],
      [740, bar+beat*2.5, beat*0.5], [660, bar+beat*3, beat],
      // Bar 3 (D): ascending urgency
      [588, bar*2, beat*0.25], [660, bar*2+beat*0.25, beat*0.25],
      [740, bar*2+beat*0.5, beat*0.5], [784, bar*2+beat, beat*0.5],
      [880, bar*2+beat*1.5, beat*0.5], [988, bar*2+beat*2, beat],
      [880, bar*2+beat*3, beat*0.5], [784, bar*2+beat*3.5, beat*0.5],
      // Bar 4 (Bm): resolving descent
      [740, bar*3, beat], [660, bar*3+beat, beat*0.5],
      [588, bar*3+beat*1.5, beat*0.5], [494, bar*3+beat*2, beat],
      [524, bar*3+beat*3, beat*0.5], [588, bar*3+beat*3.5, beat*0.5],
    ];
    for (const [n, t, d] of mel) this.schedNote(n, now+t, d, 'square', 0.10);

    // Kick on every beat for drive
    for (let i = 0; i < 16; i++) {
      this.schedKick(now + i * beat, i%4===0 ? 0.18 : 0.10);
    }

    // Hi-hats on 8th and 16th notes (more aggressive)
    for (let i = 0; i < 32; i++) {
      this.schedHiHat(now + i * beat/2, i%2===0);
    }

    // Snare-like noise on beats 2 and 4
    for (let b = 0; b < 4; b++) {
      for (const off of [beat, beat*3]) {
        const t = now + b * bar + off;
        const bufLen = Math.floor(this.ctx!.sampleRate * 0.06);
        const buf = this.ctx!.createBuffer(1, bufLen, this.ctx!.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < bufLen; j++) {
          d[j] = (Math.random() * 2 - 1) * (1 - j / bufLen) * 0.8;
        }
        const src = this.ctx!.createBufferSource();
        src.buffer = buf;
        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain!);
        src.start(t);
        src.stop(t + 0.1);
        this.bgmNodes.push(src);
      }
    }

    return loopDur;
  }

  // === Town BGM (Gentle waltz, 3/4 time, C-Am-F-G, dreamy) ===
  private playTownBgm(now: number): number {
    const bpm = 90;
    const beat = 60 / bpm;
    const bar = beat * 3; // 3/4 time waltz
    const loopDur = bar * 8;

    // Gentle bass (root notes, soft triangle wave)
    const bassPattern: [number, number][] = [
      // C-Am-F-G repeated twice
      [131, 0], [131, bar], [110, bar*2], [110, bar*3],
      [175, bar*4], [175, bar*5], [196, bar*6], [196, bar*7],
    ];
    for (const [n, t] of bassPattern) {
      this.schedBass(n, now+t, bar*0.9, 'triangle', 0.1);
    }

    // Waltz chords (oom-pah-pah pattern)
    const chords: [number[], number][] = [
      [[262, 330, 392], 0], [[262, 330, 392], bar],     // C
      [[220, 262, 330], bar*2], [[220, 262, 330], bar*3], // Am
      [[175, 220, 262], bar*4], [[175, 220, 262], bar*5], // F
      [[196, 247, 294], bar*6], [[196, 247, 294], bar*7], // G
    ];
    for (const [freqs, barStart] of chords) {
      for (let b = 1; b < 3; b++) {
        const t = now + barStart + b * beat;
        for (const f of freqs) {
          this.schedNote(f, t, beat * 0.6, 'sine', 0.06);
        }
      }
    }

    // Dreamy melody (high register, sine wave)
    const melody: [number, number, number][] = [
      // Phrase 1 (bars 0-3)
      [784, 0, beat], [880, beat, beat], [784, beat*2, beat*0.5],
      [660, bar+beat*0.5, beat*1.5], [784, bar+beat*2, beat],
      [880, bar*2, beat*2], [784, bar*2+beat*2, beat],
      [660, bar*3, beat], [784, bar*3+beat, beat], [880, bar*3+beat*2, beat],
      // Phrase 2 (bars 4-7)
      [1047, bar*4, beat*1.5], [880, bar*4+beat*1.5, beat*0.5], [784, bar*4+beat*2, beat],
      [880, bar*5, beat], [784, bar*5+beat, beat*0.5], [660, bar*5+beat*1.5, beat*1.5],
      [784, bar*6, beat*2], [880, bar*6+beat*2, beat],
      [1047, bar*7, beat*2], [784, bar*7+beat*2, beat],
    ];
    for (const [n, t, d] of melody) this.schedNote(n, now+t, d, 'sine', 0.12);

    // Sparkle arpeggios (fairy dust feel)
    for (let i = 0; i < 8; i++) {
      const t = now + i * bar + beat * 0.5;
      this.schedNote(1568, t, beat*0.3, 'sine', 0.04);
      this.schedNote(1976, t + beat*0.3, beat*0.3, 'sine', 0.03);
    }

    return loopDur;
  }

  // === Shop BGM (Bouncy, mysterious merchant vibe, Em-Bb-Am-B7) ===
  private playShopBgm(now: number): number {
    const bpm = 110;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const loopDur = bar * 4;

    // Walking bass line
    const bass: [number, number][] = [
      [165, 0], [196, beat], [220, beat*2], [196, beat*3],
      [147, bar], [165, bar+beat], [175, bar+beat*2], [165, bar+beat*3],
      [110, bar*2], [131, bar*2+beat], [147, bar*2+beat*2], [165, bar*2+beat*3],
      [124, bar*3], [147, bar*3+beat], [156, bar*3+beat*2], [185, bar*3+beat*3],
    ];
    for (const [n, t] of bass) this.schedBass(n, now+t, beat*0.8, 'square', 0.1);

    // Quirky melody (square wave for chiptune merchant feel)
    const mel: [number, number, number][] = [
      [660, 0, beat*0.5], [698, beat*0.5, beat*0.5], [784, beat, beat],
      [698, beat*2, beat*0.5], [660, beat*2.5, beat*0.5], [588, beat*3, beat],
      [466, bar, beat], [524, bar+beat, beat*0.5], [588, bar+beat*1.5, beat*0.5],
      [524, bar+beat*2, beat*2],
      [440, bar*2, beat*0.5], [524, bar*2+beat*0.5, beat*0.5], [588, bar*2+beat, beat],
      [660, bar*2+beat*2, beat*0.5], [588, bar*2+beat*2.5, beat*0.5], [524, bar*2+beat*3, beat],
      [588, bar*3, beat*1.5], [660, bar*3+beat*1.5, beat*0.5],
      [698, bar*3+beat*2, beat], [784, bar*3+beat*3, beat],
    ];
    for (const [n, t, d] of mel) this.schedNote(n, now+t, d, 'square', 0.08);

    // Light percussion (every beat, softer)
    for (let i = 0; i < 16; i++) {
      this.schedHiHat(now + i * beat, i%4===0);
    }

    // Coin jingle accent on downbeats
    for (let i = 0; i < 4; i++) {
      this.schedNote(1320, now + i * bar, beat*0.15, 'sine', 0.05);
      this.schedNote(1760, now + i * bar + beat*0.1, beat*0.15, 'sine', 0.04);
    }

    return loopDur;
  }

  // === Boss BGM (Intense, Dm-Bb-C-A, 150bpm, heavy bass + driving beat) ===
  private playBossBgm(now: number): number {
    const bpm = 150;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const loopDur = bar * 4;

    // Heavy bass (octave jumps)
    const bass: [number, number][] = [
      [147, 0], [73, beat], [147, beat*2], [147, beat*2.5],
      [117, bar], [58, bar+beat], [117, bar+beat*2], [117, bar+beat*2.5],
      [131, bar*2], [65, bar*2+beat], [131, bar*2+beat*2], [147, bar*2+beat*3],
      [110, bar*3], [55, bar*3+beat], [110, bar*3+beat*2], [131, bar*3+beat*3],
    ];
    for (const [n, t] of bass) this.schedBass(n, now+t, beat*0.8, 'sawtooth', 0.14);

    // Aggressive melody (minor key, fast runs)
    const mel: [number, number, number][] = [
      [588, 0, beat*0.5], [660, beat*0.5, beat*0.5], [698, beat, beat*0.5],
      [784, beat*1.5, beat*0.5], [880, beat*2, beat], [784, beat*3, beat],
      [698, bar, beat], [660, bar+beat, beat*0.5], [588, bar+beat*1.5, beat*0.5],
      [524, bar+beat*2, beat*2],
      [660, bar*2, beat*0.5], [698, bar*2+beat*0.5, beat*0.5],
      [784, bar*2+beat, beat], [880, bar*2+beat*2, beat*0.5],
      [988, bar*2+beat*2.5, beat*0.5], [1047, bar*2+beat*3, beat],
      [880, bar*3, beat*0.5], [784, bar*3+beat*0.5, beat*0.5],
      [698, bar*3+beat, beat*0.5], [660, bar*3+beat*1.5, beat*0.5],
      [588, bar*3+beat*2, beat*2],
    ];
    for (const [n, t, d] of mel) this.schedNote(n, now+t, d, 'square', 0.12);

    // Driving drums: kick on 1&3, hi-hat on 8ths
    for (let i = 0; i < 16; i++) {
      if (i%4 === 0 || i%4 === 2) this.schedKick(now + i * beat);
      this.schedHiHat(now + i * beat, true);
      this.schedHiHat(now + i * beat + beat/2, false);
    }

    return loopDur;
  }

  // === Mid-Boss BGM (Heavier variant, Dm-Gm-A-Dm, 155bpm, with power chords) ===
  private playMidBossBgm(now: number): number {
    const bpm = 155;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const loopDur = bar * 4;

    // Pounding bass with chromatic movement
    const bass: [number, number][] = [
      [147, 0], [147, beat*0.5], [139, beat], [147, beat*1.5],
      [147, beat*2], [156, beat*3], [147, beat*3.5],
      [196, bar], [196, bar+beat*0.5], [185, bar+beat], [196, bar+beat*1.5],
      [196, bar+beat*2], [208, bar+beat*3],
      [220, bar*2], [220, bar*2+beat], [208, bar*2+beat*2], [196, bar*2+beat*3],
      [147, bar*3], [147, bar*3+beat], [175, bar*3+beat*2], [165, bar*3+beat*3],
    ];
    for (const [n, t] of bass) this.schedBass(n, now+t, beat*0.45, 'sawtooth', 0.16);

    // Power chord stabs (fifths)
    const chordTimes = [0, beat*2, bar, bar+beat*2, bar*2, bar*2+beat*2, bar*3, bar*3+beat*2];
    const chordRoots = [294, 294, 392, 392, 440, 440, 294, 349];
    for (let i = 0; i < chordTimes.length; i++) {
      const t = now + chordTimes[i];
      const root = chordRoots[i];
      this.schedNote(root, t, beat*0.3, 'sawtooth', 0.08);
      this.schedNote(root * 1.5, t, beat*0.3, 'sawtooth', 0.06);
    }

    // Intense melody
    const mel: [number, number, number][] = [
      [1175, 0, beat*0.5], [1047, beat*0.5, beat*0.5], [880, beat, beat],
      [1047, beat*2, beat*0.5], [1175, beat*2.5, beat*0.5], [1320, beat*3, beat],
      [1175, bar, beat*0.5], [1047, bar+beat*0.5, beat*0.5],
      [988, bar+beat, beat], [880, bar+beat*2, beat*2],
      [1047, bar*2, beat*0.5], [1175, bar*2+beat*0.5, beat*0.5],
      [1320, bar*2+beat, beat*0.5], [1397, bar*2+beat*1.5, beat*0.5],
      [1568, bar*2+beat*2, beat*2],
      [1320, bar*3, beat], [1175, bar*3+beat, beat*0.5],
      [1047, bar*3+beat*1.5, beat*0.5], [880, bar*3+beat*2, beat*2],
    ];
    for (const [n, t, d] of mel) this.schedNote(n, now+t, d, 'triangle', 0.13);

    // Aggressive drums
    for (let i = 0; i < 16; i++) {
      this.schedKick(now + i * beat, i%2===0 ? 0.25 : 0.12);
      this.schedHiHat(now + i * beat, true);
      this.schedHiHat(now + i * beat + beat/2, true);
    }

    return loopDur;
  }

  // === Final Boss BGM (Epic, 160bpm, Dm-Cm-Bb-A, tremolo + descending chromatic) ===
  private playFinalBossBgm(now: number): number {
    const bpm = 160;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const loopDur = bar * 8; // Longer loop for final boss

    // Relentless bass (16th note pulse)
    const bassRoots = [147, 147, 131, 131, 117, 117, 110, 110];
    for (let b = 0; b < 8; b++) {
      const root = bassRoots[b];
      for (let i = 0; i < 8; i++) {
        const freq = i % 2 === 0 ? root : root * 1.5;
        this.schedBass(freq, now + b*bar + i*beat*0.5, beat*0.45, 'sawtooth', 0.14);
      }
    }

    // Epic melody with tremolo feel (two phrases)
    const melA: [number, number, number][] = [
      // Phrase A (bars 0-3): ascending fury
      [588, 0, beat], [660, beat, beat*0.5], [698, beat*1.5, beat*0.5],
      [784, beat*2, beat*1.5], [880, beat*3.5, beat*0.5],
      [988, bar, beat], [880, bar+beat, beat*0.5], [784, bar+beat*1.5, beat*0.5],
      [880, bar+beat*2, beat*2],
      [1047, bar*2, beat*0.5], [988, bar*2+beat*0.5, beat*0.5],
      [880, bar*2+beat, beat*0.5], [988, bar*2+beat*1.5, beat*0.5],
      [1047, bar*2+beat*2, beat], [1175, bar*2+beat*3, beat],
      [1320, bar*3, beat*2], [1175, bar*3+beat*2, beat],
      [1047, bar*3+beat*3, beat],
    ];
    for (const [n, t, d] of melA) this.schedNote(n, now+t, d, 'square', 0.11);

    // Phrase B (bars 4-7): descending chromatic tension
    const melB: [number, number, number][] = [
      [1320, bar*4, beat], [1245, bar*4+beat, beat], [1175, bar*4+beat*2, beat],
      [1109, bar*4+beat*3, beat],
      [1047, bar*5, beat*2], [988, bar*5+beat*2, beat], [880, bar*5+beat*3, beat],
      [784, bar*6, beat*0.5], [880, bar*6+beat*0.5, beat*0.5],
      [988, bar*6+beat, beat], [1047, bar*6+beat*2, beat],
      [1175, bar*6+beat*3, beat],
      [1320, bar*7, beat*1.5], [1175, bar*7+beat*1.5, beat*0.5],
      [1047, bar*7+beat*2, beat], [1175, bar*7+beat*3, beat],
    ];
    for (const [n, t, d] of melB) this.schedNote(n, now+t, d, 'triangle', 0.12);

    // Counter-melody (organ-like sustained chords)
    const chordProg: [number[], number][] = [
      [[294, 349, 440], 0], [[294, 349, 440], bar],
      [[262, 311, 392], bar*2], [[262, 311, 392], bar*3],
      [[233, 294, 349], bar*4], [[233, 294, 349], bar*5],
      [[220, 277, 330], bar*6], [[220, 277, 330], bar*7],
    ];
    for (const [freqs, t] of chordProg) {
      for (const f of freqs) {
        this.schedNote(f, now+t, bar*0.9, 'sine', 0.05);
      }
    }

    // Maximum intensity drums
    for (let i = 0; i < 32; i++) {
      const t = now + i * beat;
      this.schedKick(t, 0.22);
      this.schedHiHat(t, true);
      this.schedHiHat(t + beat*0.25, false);
      this.schedHiHat(t + beat*0.5, true);
      this.schedHiHat(t + beat*0.75, false);
    }

    return loopDur;
  }

  // === Ending BGM (Triumphant and emotional, C-G-Am-F, 80bpm, slow and grand) ===
  private playEndingBgm(now: number): number {
    const bpm = 80;
    const beat = 60 / bpm;
    const bar = beat * 4;
    const loopDur = bar * 8;

    // Warm sustained bass
    const bassRoots: [number, number][] = [
      [131, 0], [131, bar], [196, bar*2], [196, bar*3],
      [110, bar*4], [110, bar*5], [175, bar*6], [175, bar*7],
    ];
    for (const [n, t] of bassRoots) {
      this.schedBass(n, now+t, bar*0.9, 'triangle', 0.1);
    }

    // Sustained chords (strings-like)
    const chords: [number[], number][] = [
      [[262, 330, 392], 0], [[262, 330, 392], bar],       // C
      [[196, 247, 294], bar*2], [[196, 247, 294], bar*3], // G
      [[220, 262, 330], bar*4], [[220, 262, 330], bar*5], // Am
      [[175, 220, 262], bar*6], [[175, 220, 262], bar*7], // F
    ];
    for (const [freqs, t] of chords) {
      for (const f of freqs) {
        this.schedNote(f, now+t, bar*0.95, 'sine', 0.06);
      }
    }

    // Soaring melody (emotional, resolving)
    const mel: [number, number, number][] = [
      // Phrase 1
      [524, 0, beat*2], [660, beat*2, beat], [784, beat*3, beat],
      [880, bar, beat*2], [784, bar+beat*2, beat], [660, bar+beat*3, beat],
      [784, bar*2, beat*2], [880, bar*2+beat*2, beat], [784, bar*2+beat*3, beat],
      [660, bar*3, beat*3], [784, bar*3+beat*3, beat],
      // Phrase 2 (higher, more triumphant)
      [880, bar*4, beat*2], [1047, bar*4+beat*2, beat], [880, bar*4+beat*3, beat],
      [784, bar*5, beat*2], [660, bar*5+beat*2, beat*2],
      [784, bar*6, beat], [880, bar*6+beat, beat], [1047, bar*6+beat*2, beat*2],
      [1047, bar*7, beat*2], [880, bar*7+beat*2, beat], [784, bar*7+beat*3, beat],
    ];
    for (const [n, t, d] of mel) this.schedNote(n, now+t, d, 'triangle', 0.14);

    // Gentle arpeggios
    const arpTimes = [0, bar*2, bar*4, bar*6];
    for (const at of arpTimes) {
      for (let i = 0; i < 4; i++) {
        this.schedNote(1568 + i * 200, now + at + bar + i * beat * 0.4, beat * 0.5, 'sine', 0.03);
      }
    }

    return loopDur;
  }

  destroy(): void {
    this.stopBgm();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

// Singleton
export const soundManager = new SoundManager();

/** Add a mute toggle button to any Phaser scene (top-right corner) */
export function createMuteButton(scene: Phaser.Scene): void {
  const { width } = scene.scale;
  const label = soundManager.isMuted() ? 'MUTE' : 'SND';
  const btn = scene.add.text(width - 8, 8, label, {
    fontSize: '14px',
    color: soundManager.isMuted() ? '#666666' : '#ffffff',
    backgroundColor: '#333333',
    padding: { x: 6, y: 4 },
  }).setOrigin(1, 0).setDepth(400).setInteractive({ useHandCursor: true });

  btn.on('pointerdown', () => {
    const muted = soundManager.toggleMute();
    localStorage.setItem('rune_cascade_muted', muted ? 'true' : 'false');
    btn.setText(muted ? 'MUTE' : 'SND');
    btn.setColor(muted ? '#666666' : '#ffffff');
  });
}
