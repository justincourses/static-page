// Procedural Web Audio API Sound & Cadence-Synced Synthwave/Bossa Music Engine
// Zero external dependencies - 100% real-time Web Audio synthesis

const MIDI_TO_FREQ = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Dusk progression: Warm coastal sunset (Fmaj7 - G6 - Em7 - Am9)
const DUSK_CHORDS = [
  { root: 41, bass: [41, 48, 53, 48], notes: [60, 64, 65, 69, 72] }, // Fmaj7
  { root: 43, bass: [43, 50, 55, 50], notes: [59, 62, 64, 67, 71] }, // G6
  { root: 40, bass: [40, 47, 52, 47], notes: [59, 62, 64, 67, 71] }, // Em7
  { root: 45, bass: [45, 52, 57, 52], notes: [60, 64, 67, 71, 74] }, // Am9
];

// Starry Night progression: Dreamy Lydian / 9th voicings with crystalline extensions
const NIGHT_CHORDS = [
  { root: 41, bass: [41, 48, 55, 52], notes: [64, 67, 69, 71, 76] }, // Fmaj9(#11)
  { root: 43, bass: [43, 50, 57, 55], notes: [62, 64, 67, 71, 74] }, // G6/9
  { root: 40, bass: [40, 47, 54, 52], notes: [62, 66, 67, 71, 74] }, // Em9
  { root: 45, bass: [45, 52, 59, 57], notes: [64, 67, 71, 72, 76] }, // Am11
];

// 16-step bossa-synthwave arpeggio pattern indices into chord.notes
const ARP_PATTERN = [0, 2, 1, 3, 4, 2, 1, 3, 0, 3, 2, 4, 3, 1, 2, 0];
// Bossa nova clave / coastal groove accent pattern (16 steps)
const BOSSA_RIM_STEPS = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
const KICK_STEPS =      [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const SHAKER_STEPS =    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const WHEELIE_LEAD_OFFSET = [12, 14, 16, 12, 19, 16, 14, 12, 16, 19, 21, 19, 16, 14, 12, 14];

export class CoastalAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.sfxEnabled = true;

    this.bpm = 96;
    this.cadenceRpm = 70;
    this.speedKmh = 30;
    this.dayNightPhase = 0; // 0 = dusk, 1 = starry night
    this.isWheelie = false;
    this.isAirborne = false;
    this.waveBreakerIntensity = 0.5;

    this.stepIndex = 0;
    this.nextNoteTime = 0;

    // Master & Submix nodes
    this.compressor = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    // Continuous Ocean Surf nodes
    this.surfNode = null;
    this.surfFilter = null;
    this.surfGain = null;
    this.surfLfo = null;
    this.surfLfoGain = null;

    // Cached noise buffers
    this.whiteNoiseBuffer = null;
    this.pinkNoiseBuffer = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    try {
      this.ctx = new AudioCtx();
    } catch {
      return null;
    }

    const now = this.ctx.currentTime;

    // Master dynamics compressor for glue and clip protection
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-16, now);
    this.compressor.knee.setValueAtTime(18, now);
    this.compressor.ratio.setValueAtTime(3.5, now);
    this.compressor.attack.setValueAtTime(0.005, now);
    this.compressor.release.setValueAtTime(0.18, now);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, now);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.52 : 0.0001, now);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.85 : 0.0001, now);

    this.musicGain.connect(this.compressor);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this._createNoiseBuffers();
    this._setupContinuousOceanSurf();

    this.nextNoteTime = this.ctx.currentTime + 0.04;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  resume() {
    if (!this.ctx) {
      return this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _createNoiseBuffers() {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4; // 4-second seamless noise buffers

    // White noise buffer
    this.whiteNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const whiteData = this.whiteNoiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }

    // Pink/Brown coastal surf noise buffer (Paul Kellet's pink noise filter)
    this.pinkNoiseBuffer = this.ctx.createBuffer(1, length, sampleRate);
    const pinkData = this.pinkNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
  }

  _setupContinuousOceanSurf() {
    if (!this.ctx || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;

    this.surfNode = this.ctx.createBufferSource();
    this.surfNode.buffer = this.pinkNoiseBuffer;
    this.surfNode.loop = true;

    this.surfFilter = this.ctx.createBiquadFilter();
    this.surfFilter.type = 'bandpass';
    this.surfFilter.frequency.setValueAtTime(340, now);
    this.surfFilter.Q.setValueAtTime(0.65, now);

    this.surfGain = this.ctx.createGain();
    this.surfGain.gain.setValueAtTime(this.sfxEnabled ? 0.065 : 0.0001, now);

    // Slow LFO to ebb and flow like rolling Pacific swells
    this.surfLfo = this.ctx.createOscillator();
    this.surfLfo.type = 'sine';
    this.surfLfo.frequency.setValueAtTime(0.16, now); // ~6.25s wave period

    this.surfLfoGain = this.ctx.createGain();
    this.surfLfoGain.gain.setValueAtTime(160, now);

    this.surfLfo.connect(this.surfLfoGain);
    this.surfLfoGain.connect(this.surfFilter.frequency);

    this.surfNode.connect(this.surfFilter);
    this.surfFilter.connect(this.surfGain);
    this.surfGain.connect(this.compressor);

    this.surfNode.start(now);
    this.surfLfo.start(now);
  }

  update(
    dt,
    {
      cadenceRpm = 75,
      speedKmh = 30,
      dayNightPhase = 0,
      isWheelie = false,
      isAirborne = false,
      waveBreakerIntensity = 0.5,
    } = {}
  ) {
    const safeDt = Math.min(0.1, Math.max(0.001, Number(dt) || 0.016));

    // Smoothly map cadenceRpm (35..135 RPM) -> bpm (72..156 BPM)
    const clampedCadence = Math.max(35, Math.min(135, Number(cadenceRpm) || 75));
    const cadenceNorm = (clampedCadence - 35) / (135 - 35);
    const targetBpm = 72 + cadenceNorm * (156 - 72);

    this.cadenceRpm += (clampedCadence - this.cadenceRpm) * Math.min(1, safeDt * 8);
    this.bpm += (targetBpm - this.bpm) * Math.min(1, safeDt * 5);
    this.speedKmh = Number(speedKmh) || 30;
    this.dayNightPhase = Math.max(0, Math.min(1, Number(dayNightPhase) || 0));
    this.isWheelie = Boolean(isWheelie);
    this.isAirborne = Boolean(isAirborne);
    this.waveBreakerIntensity = Math.max(0, Math.min(1, Number(waveBreakerIntensity) || 0));

    if (!this.ctx || this.ctx.state !== 'running' || !this.enabled) {
      return;
    }

    const now = this.ctx.currentTime;

    // Modulate continuous ocean surf filter & gain from shore waveBreakerIntensity
    if (this.surfFilter && this.surfGain) {
      const targetFreq = 220 + this.waveBreakerIntensity * 620 + (this.isAirborne ? 180 : 0);
      const targetSurfGain = this.sfxEnabled
        ? 0.035 + this.waveBreakerIntensity * 0.085
        : 0.0001;
      this.surfFilter.frequency.setTargetAtTime(targetFreq, now, 0.12);
      this.surfGain.gain.setTargetAtTime(targetSurfGain, now, 0.15);
    }

    // Prevent runaway catch-up if tab was backgrounded
    if (this.nextNoteTime < now - 0.35) {
      this.nextNoteTime = now + 0.02;
    }

    // Cadence-synced lookahead step sequencer
    const lookahead = 0.12;
    while (this.nextNoteTime < now + lookahead) {
      if (this.musicEnabled) {
        this._scheduleStep(this.stepIndex, this.nextNoteTime);
      }
      const secondsPerStep = 60 / Math.max(60, this.bpm) / 4; // 16th note
      this.nextNoteTime += secondsPerStep;
      this.stepIndex = (this.stepIndex + 1) % 64;
    }
  }

  _scheduleStep(totalStep, time) {
    if (!this.ctx) return;

    const step = totalStep % 16;
    const bar = Math.floor(totalStep / 16) % 4;
    const isNight = this.dayNightPhase >= 0.5;
    const chord = (isNight ? NIGHT_CHORDS : DUSK_CHORDS)[bar];

    const stepDuration = 60 / Math.max(60, this.bpm) / 4;

    // 1. Lush Pad Chords on beat 0 of every bar (and gentle swell on step 8)
    if (step === 0) {
      this._playPadChord(chord.notes, time, stepDuration * 15.5, this.dayNightPhase);
    }

    // 2. Warm Bassline (triangle + lowpass filter) on syncopated bossa-synthwave steps
    if (step % 2 === 0 || step === 3 || step === 11 || step === 15) {
      const bassIdx = Math.floor(step / 4) % chord.bass.length;
      let bassMidi = chord.bass[bassIdx];
      if (step === 15) bassMidi += 2; // passing approach note
      const duration = step % 4 === 0 ? stepDuration * 1.85 : stepDuration * 0.9;
      this._playBassNote(bassMidi, time, duration);
    }

    // 3. Plucked Coastal Marimba / Ukulele Arpeggio & Starry Celesta Overtones
    const arpNoteIndex = ARP_PATTERN[step];
    const arpMidi = chord.notes[arpNoteIndex % chord.notes.length];
    const transpose = this.isAirborne ? 12 : 0;
    this._playPluckArp(arpMidi + transpose, time, stepDuration * 1.4, this.dayNightPhase, step);

    // 4. Extra soaring lead harmony when in Wheelie mode (T)
    if (this.isWheelie && (step % 2 === 0 || step === 7 || step === 15)) {
      const leadMidi = chord.root + 24 + WHEELIE_LEAD_OFFSET[step];
      this._playWheelieLead(leadMidi, time, stepDuration * 1.75);
    }

    // 5. Crisp bicycle-chain hi-hat / shaker & soft kick/rimshot percussion
    if (KICK_STEPS[step]) {
      this._playSoftKick(time);
    }
    if (BOSSA_RIM_STEPS[step]) {
      this._playRimshot(time);
    }
    if (SHAKER_STEPS[step]) {
      const accent = step % 4 === 2 ? 0.95 : step % 2 === 0 ? 0.55 : 0.32;
      this._playChainShaker(time, accent);
    }
  }

  _playBassNote(midi, time, duration) {
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const freq = MIDI_TO_FREQ(midi);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + duration);
    filter.Q.setValueAtTime(2.2, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.24, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + duration + 0.02);
    subOsc.stop(time + duration + 0.02);
  }

  _playPluckArp(midi, time, duration, nightPhase, step) {
    const freq = MIDI_TO_FREQ(midi);
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    // Morph between warm wooden marimba/ukulele in dusk and crystalline bell in starry night
    osc.type = nightPhase < 0.5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    const brightness = 1300 + nightPhase * 1800 + (step % 4 === 0 ? 500 : 0);
    filter.frequency.setValueAtTime(brightness, time);
    filter.frequency.exponentialRampToValueAtTime(380, time + duration);

    const peakGain = step % 4 === 0 ? 0.13 : 0.085;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);

    // Starry Night celesta/bell harmonic overtone (3rd harmonic / octave+fifth shimmer)
    if (nightPhase >= 0.35 && step % 2 === 0) {
      const bellOsc = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(freq * 2, time);

      const bellPeak = 0.045 * Math.min(1, (nightPhase - 0.3) / 0.7);
      bellGain.gain.setValueAtTime(0.0001, time);
      bellGain.gain.linearRampToValueAtTime(bellPeak, time + 0.006);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, time + duration * 1.35);

      bellOsc.connect(bellGain);
      bellGain.connect(this.musicGain);

      bellOsc.start(time);
      bellOsc.stop(time + duration * 1.4);
    }
  }

  _playPadChord(notes, time, duration, nightPhase) {
    const padFilter = this.ctx.createBiquadFilter();
    const padGain = this.ctx.createGain();

    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(900 + nightPhase * 900, time);
    padFilter.Q.setValueAtTime(0.7, time);

    padGain.gain.setValueAtTime(0.0001, time);
    padGain.gain.linearRampToValueAtTime(0.05, time + duration * 0.25);
    padGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    padFilter.connect(padGain);
    padGain.connect(this.musicGain);

    notes.slice(0, 4).forEach((midi, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const detuneCents = (idx - 1.5) * (4 + nightPhase * 5);
      osc.frequency.setValueAtTime(MIDI_TO_FREQ(midi), time);
      osc.detune.setValueAtTime(detuneCents, time);

      osc.connect(padFilter);
      osc.start(time);
      osc.stop(time + duration + 0.04);
    });
  }

  _playWheelieLead(midi, time, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const freq = MIDI_TO_FREQ(midi);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.992, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.035);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, time);
    filter.frequency.exponentialRampToValueAtTime(750, time + duration);
    filter.Q.setValueAtTime(2.5, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.085, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  _playSoftKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(118, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);

    gain.gain.setValueAtTime(0.24, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  _playRimshot(time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, time);
    osc.frequency.exponentialRampToValueAtTime(190, time + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, time);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(0.11, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  _playChainShaker(time, accent = 0.5) {
    if (!this.whiteNoiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.whiteNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.045 * accent, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.032);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    const offset = Math.random() * 2.5;
    src.start(time, offset, 0.04);
  }

  // ============================================================================
  // Procedural SFX Methods (safe no-ops if !this.ctx || !this.sfxEnabled)
  // ============================================================================

  _canPlaySfx() {
    return Boolean(this.ctx && this.ctx.state === 'running' && this.enabled && this.sfxEnabled);
  }

  playPedalClick(intensity = 0.5) {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const clamped = Math.max(0.1, Math.min(1, Number(intensity) || 0.5));

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1650 + clamped * 550, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.018);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, now);

    gain.gain.setValueAtTime(0.055 * clamped, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.025);
  }

  playCatchFish(fishType = 'normal', combo = 1) {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const safeCombo = Math.max(1, Math.min(16, Number(combo) || 1));
    const isRare =
      fishType === 'golden' ||
      fishType === 'rare' ||
      fishType === 'moon' ||
      (typeof fishType === 'string' && fishType !== 'normal');

    // 1. Water splash burst
    if (this.whiteNoiseBuffer) {
      const splash = this.ctx.createBufferSource();
      splash.buffer = this.whiteNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.14);
      filter.Q.setValueAtTime(1.4, now);

      const splashGain = this.ctx.createGain();
      splashGain.gain.setValueAtTime(0.16, now);
      splashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      splash.connect(filter);
      filter.connect(splashGain);
      splashGain.connect(this.sfxGain);
      splash.start(now, Math.random() * 1.5, 0.18);
    }

    // 2. Joyful pelican throat gulp
    const gulpOsc = this.ctx.createOscillator();
    const gulpGain = this.ctx.createGain();
    gulpOsc.type = 'sine';
    gulpOsc.frequency.setValueAtTime(240, now + 0.02);
    gulpOsc.frequency.exponentialRampToValueAtTime(520, now + 0.11);

    gulpGain.gain.setValueAtTime(0.0001, now);
    gulpGain.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gulpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    gulpOsc.connect(gulpGain);
    gulpGain.connect(this.sfxGain);
    gulpOsc.start(now + 0.02);
    gulpOsc.stop(now + 0.14);

    // 3. Ascending harmonic chime pitched by combo count
    const baseMidi = 65 + Math.min(14, (safeCombo - 1) * 2); // F4 rising with combo
    const chimeIntervals = isRare ? [0, 4, 7, 11, 14, 19] : [0, 4, 7, 12];

    chimeIntervals.forEach((semi, idx) => {
      const start = now + 0.04 + idx * 0.045;
      const dur = isRare ? 0.38 : 0.24;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isRare ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(MIDI_TO_FREQ(baseMidi + semi), start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(isRare ? 0.18 : 0.14, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }

  playJump() {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;

    // Airy wing-flap noise whoosh
    if (this.pinkNoiseBuffer) {
      const flap = this.ctx.createBufferSource();
      flap.buffer = this.pinkNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1250, now + 0.22);
      filter.Q.setValueAtTime(1.1, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      flap.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      flap.start(now, Math.random(), 0.26);
    }

    // Bunny-hop spring upward pitch sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.19);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playLand() {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;

    // Soft rubber tire thud on coastal asphalt
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playWheelieStart() {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;

    // Dual-wing spread aerodynamic whoosh
    if (this.pinkNoiseBuffer) {
      const wing = this.ctx.createBufferSource();
      wing.buffer = this.pinkNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.35);
      filter.Q.setValueAtTime(0.9, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      wing.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      wing.start(now, 0.2, 0.4);
    }

    // Rising heroic synth triad swell
    [60, 64, 67, 72].forEach((midi, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const start = now + idx * 0.035;

      osc.type = 'sawtooth';
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, start);
      filter.frequency.exponentialRampToValueAtTime(2400, start + 0.28);

      osc.frequency.setValueAtTime(MIDI_TO_FREQ(midi), start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  playLaneSwitch(dir = 0) {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;
    const sign = dir >= 0 ? 1 : -1;

    if (this.whiteNoiseBuffer) {
      const swish = this.ctx.createBufferSource();
      swish.buffer = this.whiteNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = sign > 0 ? 600 : 1100;
      const endFreq = sign > 0 ? 1200 : 550;
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + 0.11);
      filter.Q.setValueAtTime(1.8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      swish.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      swish.start(now, Math.random(), 0.13);
    }
  }

  playWaveCrash() {
    if (!this._canPlaySfx() || !this.pinkNoiseBuffer) return;
    const now = this.ctx.currentTime;

    const crash = this.ctx.createBufferSource();
    crash.buffer = this.pinkNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 1.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    crash.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    crash.start(now, Math.random() * 1.5, 1.25);
  }

  playAchievement() {
    if (!this._canPlaySfx()) return;
    const now = this.ctx.currentTime;

    // Triumphant 4-note brass/bell fanfare arpeggio (F5 - A5 - C6 - F6)
    const notes = [77, 81, 84, 89];
    notes.forEach((midi, idx) => {
      const start = now + idx * 0.085;
      const isLast = idx === notes.length - 1;
      const duration = isLast ? 0.65 : 0.24;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      const freq = MIDI_TO_FREQ(midi);
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, start);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq * 1.003, start);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, start);
      filter.frequency.exponentialRampToValueAtTime(1100, start + duration);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + duration + 0.03);
      osc2.stop(start + duration + 0.03);
    });
  }

  // ============================================================================
  // Toggle & Status Methods
  // ============================================================================

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(
        this.musicEnabled ? 0.52 : 0.0001,
        this.ctx.currentTime,
        0.08
      );
    }
    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.sfxGain) {
        this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.85 : 0.0001, now, 0.06);
      }
      if (this.surfGain) {
        this.surfGain.gain.setTargetAtTime(
          this.sfxEnabled ? 0.05 + this.waveBreakerIntensity * 0.06 : 0.0001,
          now,
          0.1
        );
      }
    }
    return this.sfxEnabled;
  }

  getStatus() {
    return {
      bpm: Math.round(this.bpm),
      cadenceRpm: Math.round(this.cadenceRpm),
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      active: Boolean(this.ctx && this.ctx.state === 'running'),
    };
  }
}
