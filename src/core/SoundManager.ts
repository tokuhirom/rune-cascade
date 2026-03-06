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

  startBattleBgm(): void {
    if (!this.ctx || !this.bgmGain || this.bgmPlaying) return;
    this.ensureContext();
    this.bgmPlaying = true;
    this.playBgmLoop();
  }

  stopBgm(): void {
    this.bgmPlaying = false;
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

  private playBgmLoop(): void {
    if (!this.ctx || !this.bgmGain || !this.bgmPlaying) return;

    const now = this.ctx.currentTime;
    const bpm = 140;
    const beatDur = 60 / bpm;
    const barDur = beatDur * 4;
    const loopBars = 4;
    const loopDur = barDur * loopBars;

    // Bass line (driving rhythm)
    const bassNotes = [
      // Bar 1: Am
      { note: 220, time: 0 }, { note: 220, time: beatDur },
      { note: 330, time: beatDur * 2 }, { note: 220, time: beatDur * 3 },
      // Bar 2: F
      { note: 175, time: barDur }, { note: 175, time: barDur + beatDur },
      { note: 262, time: barDur + beatDur * 2 }, { note: 175, time: barDur + beatDur * 3 },
      // Bar 3: G
      { note: 196, time: barDur * 2 }, { note: 196, time: barDur * 2 + beatDur },
      { note: 294, time: barDur * 2 + beatDur * 2 }, { note: 196, time: barDur * 2 + beatDur * 3 },
      // Bar 4: E
      { note: 165, time: barDur * 3 }, { note: 165, time: barDur * 3 + beatDur },
      { note: 247, time: barDur * 3 + beatDur * 2 }, { note: 330, time: barDur * 3 + beatDur * 3 },
    ];

    for (const { note, time } of bassNotes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = note;
      const t = now + time;
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.setValueAtTime(0.12, t + beatDur * 0.7);
      gain.gain.linearRampToValueAtTime(0, t + beatDur * 0.9);
      osc.connect(gain);
      gain.connect(this.bgmGain!);
      osc.start(t);
      osc.stop(t + beatDur);
      this.bgmNodes.push(osc);
    }

    // Melody (chiptune lead)
    const melodyNotes = [
      // Bar 1
      { note: 880, time: 0, dur: beatDur * 0.5 },
      { note: 784, time: beatDur * 0.5, dur: beatDur * 0.5 },
      { note: 660, time: beatDur, dur: beatDur },
      { note: 784, time: beatDur * 2, dur: beatDur * 0.5 },
      { note: 880, time: beatDur * 2.5, dur: beatDur * 0.5 },
      { note: 1047, time: beatDur * 3, dur: beatDur },
      // Bar 2
      { note: 880, time: barDur, dur: beatDur },
      { note: 784, time: barDur + beatDur, dur: beatDur * 0.5 },
      { note: 660, time: barDur + beatDur * 1.5, dur: beatDur * 0.5 },
      { note: 698, time: barDur + beatDur * 2, dur: beatDur * 2 },
      // Bar 3
      { note: 784, time: barDur * 2, dur: beatDur * 0.5 },
      { note: 880, time: barDur * 2 + beatDur * 0.5, dur: beatDur * 0.5 },
      { note: 988, time: barDur * 2 + beatDur, dur: beatDur },
      { note: 880, time: barDur * 2 + beatDur * 2, dur: beatDur * 0.5 },
      { note: 784, time: barDur * 2 + beatDur * 2.5, dur: beatDur * 0.5 },
      { note: 660, time: barDur * 2 + beatDur * 3, dur: beatDur },
      // Bar 4
      { note: 784, time: barDur * 3, dur: beatDur },
      { note: 660, time: barDur * 3 + beatDur, dur: beatDur * 0.5 },
      { note: 784, time: barDur * 3 + beatDur * 1.5, dur: beatDur * 0.5 },
      { note: 880, time: barDur * 3 + beatDur * 2, dur: beatDur * 2 },
    ];

    for (const { note, time, dur } of melodyNotes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = note;
      const t = now + time;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.setValueAtTime(0.15, t + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, t + dur * 0.95);
      osc.connect(gain);
      gain.connect(this.bgmGain!);
      osc.start(t);
      osc.stop(t + dur);
      this.bgmNodes.push(osc);
    }

    // Percussion (hi-hat style on every 8th note)
    for (let i = 0; i < loopBars * 8; i++) {
      const t = now + i * (beatDur / 2);
      const isDownbeat = i % 2 === 0;
      const bufLen = Math.floor(this.ctx.sampleRate * 0.03);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) {
        d[j] = (Math.random() * 2 - 1) * (1 - j / bufLen);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isDownbeat ? 0.08 : 0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      // Hi-pass filter for tinny hat sound
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);
      src.start(t);
      src.stop(t + 0.05);
      this.bgmNodes.push(src);
    }

    // Schedule next loop
    const scheduleNext = () => {
      if (this.bgmPlaying) {
        // Clean up old nodes
        this.bgmNodes = [];
        this.playBgmLoop();
      }
    };
    const timerId = setTimeout(scheduleNext, (loopDur - 0.1) * 1000);
    // Store cleanup reference
    const cleanup = { stop: () => clearTimeout(timerId) } as unknown as AudioScheduledSourceNode;
    this.bgmNodes.push(cleanup);
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
