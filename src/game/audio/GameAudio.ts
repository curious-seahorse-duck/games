type MusicTrack = {
  notes: number[];
  bass: number[];
  tempo: number;
  wave: OscillatorType;
  bassWave: OscillatorType;
};

const MUSIC_TRACKS: MusicTrack[] = [
  { notes: [262, 330, 392, 523, 440, 392, 330, 294], bass: [131, 196], tempo: 470, wave: 'sine', bassWave: 'sine' },
  { notes: [392, 494, 587, 659, 587, 494, 440, 494], bass: [196, 220], tempo: 390, wave: 'triangle', bassWave: 'sine' },
  { notes: [330, 392, 494, 587, 523, 440, 392, 349], bass: [165, 196], tempo: 420, wave: 'sine', bassWave: 'triangle' },
  { notes: [220, 262, 311, 370, 311, 262, 233, 196], bass: [110, 123], tempo: 520, wave: 'triangle', bassWave: 'sine' },
  { notes: [247, 311, 370, 494, 440, 370, 311, 277], bass: [123, 185], tempo: 360, wave: 'sine', bassWave: 'triangle' },
  { notes: [196, 233, 277, 349, 311, 277, 233, 185], bass: [98, 117], tempo: 300, wave: 'sawtooth', bassWave: 'square' },
  { notes: [185, 233, 277, 370, 330, 277, 220, 165], bass: [92, 110], tempo: 250, wave: 'square', bassWave: 'sawtooth' },
  { notes: [165, 196, 247, 311, 247, 196, 147, 131], bass: [82, 98], tempo: 235, wave: 'sawtooth', bassWave: 'sine' },
  { notes: [147, 185, 220, 277, 330, 277, 220, 185], bass: [73, 110], tempo: 210, wave: 'triangle', bassWave: 'square' },
  { notes: [139, 175, 208, 262, 311, 262, 208, 156], bass: [69, 78], tempo: 190, wave: 'sawtooth', bassWave: 'square' },
  { notes: [208, 262, 330, 415, 523, 659, 784, 659], bass: [104, 131], tempo: 270, wave: 'sine', bassWave: 'triangle' },
  { notes: [131, 165, 247, 330, 494, 392, 247, 147], bass: [65, 98], tempo: 180, wave: 'square', bassWave: 'sawtooth' },
  { notes: [175, 220, 262, 349, 392, 349, 262, 220], bass: [87, 110], tempo: 165, wave: 'triangle', bassWave: 'sine' },
  { notes: [147, 196, 233, 311, 370, 311, 233, 185], bass: [73, 92], tempo: 155, wave: 'sawtooth', bassWave: 'triangle' },
  { notes: [220, 277, 370, 494, 587, 494, 370, 277], bass: [110, 139], tempo: 145, wave: 'sine', bassWave: 'square' },
  { notes: [262, 330, 392, 523, 659, 784, 659, 523], bass: [131, 196], tempo: 135, wave: 'triangle', bassWave: 'sine' },
];

const MENU_TRACK: MusicTrack = {
  notes: [262, 330, 392, 523, 659, 523, 392, 330, 294, 370, 440, 587, 740, 587, 440, 370],
  bass: [131, 196, 147, 220],
  tempo: 360,
  wave: 'triangle',
  bassWave: 'sine',
};

export class GameAudio {
  private context?: AudioContext;
  private musicInterval?: number;
  private musicStep = 0;
  private enabled = true;
  private phonkMode = false;
  private currentBaseTrack?: MusicTrack;

  get isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  get isPhonkMode(): boolean {
    return this.phonkMode;
  }

  setPhonkMode(enabled: boolean): void {
    if (this.phonkMode === enabled) {
      return;
    }
    this.phonkMode = enabled;
    if (this.currentBaseTrack) {
      this.startTrack(this.currentBaseTrack);
    }
  }

  startMusic(levelIndex: number): void {
    this.startTrack(MUSIC_TRACKS[levelIndex % MUSIC_TRACKS.length]);
  }

  startMenuMusic(): void {
    this.startTrack(MENU_TRACK);
  }

  private startTrack(track: MusicTrack): void {
    this.stopMusic();
    this.currentBaseTrack = track;
    if (!this.enabled) {
      return;
    }

    const activeTrack = this.phonkMode ? this.createPhonkTrack(track) : track;
    this.musicStep = 0;
    const playStep = () => {
      if (!this.enabled) {
        return;
      }
      const noteIndex = this.musicStep % activeTrack.notes.length;
      this.playTone(activeTrack.notes[noteIndex], activeTrack.tempo * 0.00072, activeTrack.wave, 0.027);
      if (noteIndex % 4 === 0) {
        this.playTone(activeTrack.bass[(noteIndex / 4) % activeTrack.bass.length], 0.42, activeTrack.bassWave, 0.028);
      }
      if (this.phonkMode) {
        this.playTone(1180, 0.035, 'square', 0.008, 0.035);
        if (noteIndex % 4 === 0) {
          this.playTone(activeTrack.bass[(noteIndex / 4) % activeTrack.bass.length] * 0.5, 0.3, 'sine', 0.035, 0.02);
        }
      }
      this.musicStep += 1;
    };

    playStep();
    this.musicInterval = window.setInterval(playStep, activeTrack.tempo);
  }

  private createPhonkTrack(track: MusicTrack): MusicTrack {
    return {
      notes: track.notes.map((note, index) => Math.max(72, Math.round(note * (index % 4 === 0 ? 0.5 : 0.667)))),
      bass: track.bass.map((note) => Math.max(42, Math.round(note * 0.5))),
      tempo: Math.max(210, Math.round(track.tempo * 0.72)),
      wave: 'sawtooth',
      bassWave: 'sine',
    };
  }

  stopMusic(): void {
    if (this.musicInterval !== undefined) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = undefined;
    }
  }

  playCatch(): void {
    this.playTone(520, 0.08, 'sine', 0.08);
    this.playTone(720, 0.11, 'triangle', 0.06, 0.06);
  }

  playMiss(): void {
    this.playTone(180, 0.16, 'sawtooth', 0.055);
    this.playTone(125, 0.22, 'square', 0.035, 0.1);
  }

  playDime(): void {
    this.playTone(880, 0.12, 'sine', 0.075);
    this.playTone(1175, 0.15, 'sine', 0.065, 0.08);
    this.playTone(1568, 0.18, 'triangle', 0.05, 0.15);
  }

  playFeed(): void {
    this.playTone(260, 0.07, 'triangle', 0.07);
    this.playTone(210, 0.08, 'triangle', 0.06, 0.08);
    this.playTone(310, 0.12, 'sine', 0.055, 0.16);
  }

  private getContext(): AudioContext | undefined {
    if (!this.enabled) {
      return undefined;
    }
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  private playTone(
    frequency: number,
    duration: number,
    wave: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
