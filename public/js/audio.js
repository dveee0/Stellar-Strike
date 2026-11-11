/**
 * Stellar Strike: Cyber Typing Interceptor
 * Procedural Web Audio Engine & Dynamic Synthwave Music Generator
 * 100% self-contained, zero external asset dependencies.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.4;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;

    // Music Sequencing State
    this.bgmPlaying = false;
    this.bpm = 116;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerId = null;

    // Pentatonic scale frequencies for combo tones
    this.comboNotes = [
      220.00, // A3
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.00  // A5
    ];
    this.voiceEnabled = true;
  }

  setVoiceEnabled(enabled) {
    this.voiceEnabled = enabled;
    if (!enabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Retro robotic voice announcer using Web Speech API
   */
  speak(text) {
    if (this.isMuted || !this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.15;
      utter.pitch = 0.9;
      utter.volume = Math.min(1.0, this.sfxVolume * 1.2);
      
      // Try to find an English voice for clear robotic pronunciation
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith("en"));
      if (englishVoice) utter.voice = englishVoice;

      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch (e) {
      console.warn("Web Audio not supported or blocked", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1.0, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.setMute(!this.isMuted);
    return this.isMuted;
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  // ==========================================
  // PROCEDURAL SOUND EFFECTS (SFX)
  // ==========================================

  /**
   * Fast, punchy laser sound for typing a correct letter
   */
  playLaser(isAlternate = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isAlternate ? "sawtooth" : "square";
    const startFreq = isAlternate ? 880 : 960;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  /**
   * Ascending melodic tone for building typing streaks
   */
  playCombo(comboCount = 0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const noteIndex = Math.min(comboCount, this.comboNotes.length - 1);
    const freq = this.comboNotes[noteIndex];

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Short low-pitch buzz on typo to inform without annoying
   */
  playTypo() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(123, now); // Dissonant minor second

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now + 0.01);
    osc1.stop(now + 0.12);
    osc2.stop(now + 0.12);
  }

  /**
   * Procedural filtered noise explosion
   */
  playExplosion(isLarge = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = isLarge ? 0.7 : 0.35;

    // Noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to give that bass rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isLarge ? 600 : 900, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.45 : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + duration);

    // Add a sub-bass thump for large explosions
    if (isLarge) {
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(100, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 0.5);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);

      sub.start(now);
      sub.stop(now + 0.5);
    }
  }

  /**
   * Point-defense flak cannon destroying a missile
   */
  playInterception() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);

    // Add tiny pop
    this.playExplosion(false);
  }

  /**
   * Massive EMP Shockwave blast sound
   */
  playEmp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = 1.2;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(55, now); // Low A1

    filter.type = "bandpass";
    filter.Q.setValueAtTime(6, now);
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.linearRampToValueAtTime(3200, now + 0.3);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Hull / Shield hit alarm
   */
  playShieldHit() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Tactical Threat Warning alarm beep
   */
  playWarning() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1046.5, now + i * 0.12); // High C6

      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.08);
    }
  }

  /**
   * UI / Powerup chime
   */
  playChime(isPositive = true) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = isPositive ? [523.25, 659.25, 783.99, 1046.5] : [440, 370, 311];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.18);
    });
  }

  // ==========================================
  // DYNAMIC PROCEDURAL SYNTHWAVE BGM
  // ==========================================

  startBGM() {
    this.init();
    this.resume();
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduleMusicLoop();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  setBpmFromWpm(wpm) {
    // Dynamic tempo adjustment based on typing speed (110 BPM up to 138 BPM)
    const targetBpm = Math.min(138, Math.max(110, 110 + (wpm - 20) * 0.35));
    this.bpm = targetBpm;
  }

  scheduleMusicLoop() {
    if (!this.bgmPlaying || !this.ctx) return;

    const secondsPer16th = (60 / this.bpm) / 4;
    const lookahead = 0.15; // Schedule 150ms ahead

    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.playStep(this.step, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.step = (this.step + 1) % 64; // 4-bar loop (16 steps * 4)
    }

    this.timerId = setTimeout(() => this.scheduleMusicLoop(), 50);
  }

  playStep(step, time) {
    if (this.isMuted) return;

    // Drum Track: Kick, Snare, Hi-Hat
    const beatInBar = step % 16;
    const bar = Math.floor(step / 16);

    // 1. Synth Kick on beats 0, 4, 8, 12 (Four on the floor)
    if (beatInBar % 4 === 0) {
      this.synthKick(time);
    }

    // 2. Snare / Clap on beats 4 and 12 (2 and 4 in 4/4 time)
    if (beatInBar === 4 || beatInBar === 12) {
      this.synthSnare(time);
    }

    // 3. Hi-Hat on off-beats (2, 6, 10, 14) and 16ths
    if (beatInBar % 2 === 0) {
      this.synthHiHat(time, beatInBar % 4 !== 0);
    }

    // 4. Rolling Cyberpunk Synth Bassline (16th notes)
    // Chord progression: Am (Bar 0), F (Bar 1), C (Bar 2), G (Bar 3)
    const rootNotes = [55, 43.65, 65.41, 49]; // A1, F1, C2, G1 in Hz
    const currentRoot = rootNotes[bar];
    const octaveNote = currentRoot * 2;

    // Pattern: alternating root and octave with syncopation
    const isOctave = (beatInBar % 4 === 2) || (beatInBar % 4 === 3);
    const bassFreq = isOctave ? octaveNote : currentRoot;

    this.synthBass(bassFreq, time);

    // 5. Arpeggiator Lead on bars 2 & 3 or when in intense mode
    if (bar >= 1 && step % 2 === 0) {
      const arpScales = [
        [220, 261.6, 329.6, 440],       // Am chord
        [174.6, 220, 261.6, 349.2],     // F chord
        [261.6, 329.6, 392, 523.2],     // C chord
        [196, 246.9, 293.7, 392]        // G chord
      ];
      const chord = arpScales[bar];
      const arpFreq = chord[(step / 2) % 4] * 2;
      this.synthArp(arpFreq, time);
    }
  }

  synthKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  synthSnare(time) {
    // Noise snap
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(1200, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.12);
  }

  synthHiHat(time, isAccent = false) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(8000, time);
    filter.Q.setValueAtTime(4, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isAccent ? 0.15 : 0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  synthBass(freq, time) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    // Resonant lowpass envelope for that 80s squelch
    filter.type = "lowpass";
    filter.Q.setValueAtTime(3.5, time);
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(140, time + 0.1);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  synthArp(freq, time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.14);
  }
}

// Global singleton instance
window.soundEngine = new SoundEngine();
