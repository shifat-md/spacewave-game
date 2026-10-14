/**
 * SPACE WAVE - Geometry Dash 60-Second Challenge
 * Pure Vanilla JavaScript Game Engine with Web Audio Synthesizer & Canvas Renderer
 */

(() => {
  'use strict';

  // ==========================================
  // 1. CONSTANTS & CONFIGURATION
  // ==========================================
  const GAME_DURATION = 60.0; // Exactly 60.0 seconds
  const BASE_SPEED = 480;     // Pixels per second at 1x speed
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;
  const BPM = 140;            // Beats per minute
  const BEAT_INTERVAL = 60 / BPM; // ~0.428s per beat

  const SHIP_COLORS = {
    cyan: { primary: '#06b6d4', secondary: '#22d3ee', glow: '#0891b2', trail: 'rgba(6, 182, 212, 0.5)' },
    magenta: { primary: '#ec4899', secondary: '#f472b6', glow: '#db2777', trail: 'rgba(236, 72, 153, 0.5)' },
    emerald: { primary: '#10b981', secondary: '#34d399', glow: '#059669', trail: 'rgba(16, 185, 129, 0.5)' },
    amber: { primary: '#f59e0b', secondary: '#fbbf24', glow: '#d97706', trail: 'rgba(245, 158, 11, 0.5)' },
    purple: { primary: '#a855f7', secondary: '#c084fc', glow: '#9333ea', trail: 'rgba(168, 85, 247, 0.5)' }
  };

  // ==========================================
  // 2. AUDIO SYNTHESIZER ENGINE (Web Audio API)
  // ==========================================
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = localStorage.getItem('spacewave_muted') === 'true';
      this.masterGain = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.isPlaying = false;
      this.startTime = 0;
      this.nextNoteTime = 0;
      this.currentBeat = 0;
      this.timerId = null;
      this.pausedAt = 0;
    }

    init() {
      if (this.ctx) return;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.55;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('spacewave_muted', this.isMuted);
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
      }
      return this.isMuted;
    }

    startMusic(elapsedGameTime = 0) {
      this.init();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.stopMusic();
      this.isPlaying = true;
      this.startTime = this.ctx.currentTime - elapsedGameTime;
      this.currentBeat = Math.floor(elapsedGameTime / (BEAT_INTERVAL / 4));
      this.nextNoteTime = this.ctx.currentTime;
      this.scheduleLoop();
    }

    stopMusic() {
      this.isPlaying = false;
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    }

    scheduleLoop() {
      if (!this.isPlaying) return;
      const lookahead = 0.1; // 100ms
      while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
        const gameTime = this.nextNoteTime - this.startTime;
        if (gameTime >= 60.5) {
          this.stopMusic();
          return;
        }
        this.play16thStep(this.currentBeat, this.nextNoteTime, gameTime);
        this.nextNoteTime += BEAT_INTERVAL / 4;
        this.currentBeat++;
      }
      this.timerId = setTimeout(() => this.scheduleLoop(), 30);
    }

    play16thStep(step, time, gameTime) {
      if (this.isMuted || !this.isPlaying) return;
      const beatInBar = step % 16;
      const beat = Math.floor(step / 4);

      // Phase calculation
      let chordRoot = 130.81; // C3
      let intensity = 1;

      if (gameTime < 10) {
        // Phase 1: Intro (0-10s) - C minor
        chordRoot = (beat % 32 < 16) ? 130.81 : 116.54; // C -> Bb
        intensity = 0.8;
      } else if (gameTime < 22) {
        // Phase 2: Neon Grid (10-22s) - F minor / C minor driving
        chordRoot = (beat % 16 < 8) ? 174.61 : 130.81; // F -> C
        intensity = 1.2;
      } else if (gameTime < 34) {
        // Phase 3: Gravity Void (22-34s) - Eb minor / Ab
        chordRoot = (beat % 16 < 8) ? 155.56 : 103.83; // Eb -> Ab
        intensity = 1.3;
      } else if (gameTime < 46) {
        // Phase 4: Cyber Drop (34-46s) - High Energy Heavy Drop
        chordRoot = (beat % 32 < 16) ? 130.81 : 164.81; // C -> E
        intensity = 1.6;
      } else if (gameTime < 57) {
        // Phase 5: Supernova Climax (46-57s) - Intense fast EDM
        chordRoot = (beat % 16 < 8) ? 146.83 : 174.61; // D -> F
        intensity = 1.8;
      } else {
        // Victory Phase (57-60s) - Major Chord resolve
        chordRoot = 261.63; // C4
        intensity = 1.4;
      }

      // 1. Kick Drum (beats 0, 4, 8, 12)
      if (beatInBar % 4 === 0) {
        this.playKick(time, intensity);
      }

      // 2. Snare / Clap (beats 4, 12)
      if (beatInBar === 4 || beatInBar === 12) {
        if (gameTime >= 4) {
          this.playSnare(time, intensity);
        }
      }

      // 3. Hi-Hats (every offbeat 16th or 8th)
      if (gameTime >= 2) {
        const isAccent = beatInBar % 4 === 2;
        this.playHiHat(time, isAccent);
      }

      // 4. Bassline (16th notes rolling bass)
      if (gameTime >= 1) {
        const bassNotes = [1, 1, 1.2, 1, 1.5, 1, 1.2, 0.8];
        const multiplier = bassNotes[step % bassNotes.length];
        this.playBass(time, chordRoot * 0.5 * multiplier, intensity);
      }

      // 5. Synth Lead Arpeggios (in higher phases)
      if (gameTime >= 10 && step % 2 === 0) {
        const arpPattern = [1, 1.2, 1.5, 1.88, 2, 2.4, 3, 2];
        const arpFreq = chordRoot * arpPattern[(step / 2) % arpPattern.length];
        this.playArpLead(time, arpFreq, intensity);
      }
    }

    playKick(time, intensity) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.12);

      gain.gain.setValueAtTime(0.7 * Math.min(1.3, intensity), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.14);
    }

    playSnare(time, intensity) {
      // Noise burst + punch tone
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(60, time + 0.08);

      oscGain.gain.setValueAtTime(0.4 * intensity, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

      osc.connect(oscGain);
      oscGain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.08);

      // Noise buffer
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35 * intensity, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.musicGain);

      noise.start(time);
      noise.stop(time + 0.12);
    }

    playHiHat(time, isAccent) {
      const bufferSize = this.ctx.sampleRate * (isAccent ? 0.07 : 0.03);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isAccent ? 0.18 : 0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isAccent ? 0.07 : 0.03));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      noise.start(time);
      noise.stop(time + (isAccent ? 0.07 : 0.03));
    }

    playBass(time, freq, intensity) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      const cutoff = Math.min(2400, 350 + intensity * 450);
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(160, time + 0.1);

      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.11);
    }

    playArpLead(time, freq, intensity) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.12 * Math.min(1.4, intensity), time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.14);
    }

    // --- SFX Functions ---
    playDirectionSwitch() {
      if (this.isMuted || !this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    }

    playPortalPass(type) {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = type.includes('speed') ? 600 : (type.includes('gravity') ? 850 : 500);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    playCrash() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      // Heavy low boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.45);

      // Noise shatter
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.5, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      noise.connect(nGain);
      nGain.connect(this.sfxGain);
      noise.start(now);
      noise.stop(now + 0.35);
    }

    playCoin() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    playCheckpoint() {
      if (this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    playVictory() {
      if (this.isMuted || !this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    }
  }

  // ==========================================
  // 3. LEVEL GENERATOR & TRACK ARCHITECTURE
  // ==========================================
  class LevelGenerator {
    static buildTrack() {
      // 60-Second course with exact speed regions, cavern polygons, spikes, portals, and crystals
      const portals = [];
      const ceilingPoints = [];
      const floorPoints = [];
      const spikes = [];
      const crystals = [];

      // Speed timeline helper
      // Calculates exact X coordinate for any given second t in [0, 60]
      const speedZones = [
        { startT: 0,  endT: 10, speed: BASE_SPEED },              // 1x Speed
        { startT: 10, endT: 22, speed: BASE_SPEED * 1.35 },        // 2x Speed (Green Portal)
        { startT: 22, endT: 34, speed: BASE_SPEED * 1.35 },        // 2x Speed (Gravity Invert)
        { startT: 34, endT: 46, speed: BASE_SPEED * 1.7 },         // 3x Speed (Cyber Drop)
        { startT: 46, endT: 57, speed: BASE_SPEED * 1.95 },        // 3.5x Speed (Climax)
        { startT: 57, endT: 60, speed: BASE_SPEED * 1.2 }          // Finish Corridor
      ];

      function getTimeToX(time) {
        let x = 0;
        for (const zone of speedZones) {
          if (time <= zone.startT) break;
          const duration = Math.min(time, zone.endT) - zone.startT;
          x += duration * zone.speed;
        }
        return x;
      }

      const totalX = getTimeToX(GAME_DURATION);

      // Define Portals at key timestamps
      // 10s: 2x Speed Portal (Green)
      portals.push({ x: getTimeToX(10), type: 'speed_2x', label: '2X SPEED', color: '#10b981' });
      // 22s: Invert Gravity Portal (Yellow)
      portals.push({ x: getTimeToX(22), type: 'gravity_invert', label: 'GRAVITY FLIP', color: '#eab308' });
      // 28s: Mini Wave Portal (Purple)
      portals.push({ x: getTimeToX(28), type: 'size_mini', label: 'MINI WAVE', color: '#c084fc' });
      // 34s: Normal Gravity + Normal Size + 3x Speed Portal (Pink)
      portals.push({ x: getTimeToX(34), type: 'speed_3x', label: 'THE CYBER DROP 3X', color: '#ec4899' });
      portals.push({ x: getTimeToX(34), type: 'gravity_normal', label: 'NORMAL GRAV', color: '#38bdf8' });
      portals.push({ x: getTimeToX(34.2), type: 'size_normal', label: 'NORMAL SIZE', color: '#38bdf8' });
      // 46s: Supernova Portal 3.5x Speed (Orange/Red)
      portals.push({ x: getTimeToX(46), type: 'speed_4x', label: 'SUPERNOVA CLIMAX', color: '#f97316' });
      // 52s: Gravity Invert for 3 seconds
      portals.push({ x: getTimeToX(52), type: 'gravity_invert', label: 'FINAL FLIP', color: '#eab308' });
      // 55s: Gravity Normal
      portals.push({ x: getTimeToX(55), type: 'gravity_normal', label: 'GRAVITY RESTORED', color: '#38bdf8' });

      // Generate Continuous Cavern Corridors
      // We sample every 0.25 seconds across 60 seconds
      const stepT = 0.25;
      const numSteps = Math.ceil(GAME_DURATION / stepT);

      for (let i = 0; i <= numSteps; i++) {
        const t = Math.min(GAME_DURATION, i * stepT);
        const x = getTimeToX(t);

        let centerY = CANVAS_HEIGHT / 2;
        let gap = 240; // Default vertical opening

        if (t < 10) {
          // Sector 1: Gentle wide cavern (0 - 10s)
          gap = 260 - t * 4;
          centerY = CANVAS_HEIGHT / 2 + Math.sin(t * 0.8) * 90;
        } else if (t < 22) {
          // Sector 2: Neon Sector (10 - 22s) - tighter, rhythmic zigzag
          gap = 210 - Math.sin(t * 1.5) * 20;
          centerY = CANVAS_HEIGHT / 2 + Math.sin(t * 1.8) * 130;
        } else if (t < 28) {
          // Sector 3A: Gravity Inverted (22 - 28s)
          gap = 200;
          centerY = CANVAS_HEIGHT / 2 + Math.cos(t * 1.6) * 140;
        } else if (t < 34) {
          // Sector 3B: Mini Wave (28 - 34s) - narrower gap
          gap = 160;
          centerY = CANVAS_HEIGHT / 2 + Math.sin(t * 2.2) * 160;
        } else if (t < 46) {
          // Sector 4: Cyber Drop 3x Speed (34 - 46s) - fast flow
          gap = 185 + Math.sin(t * 3.0) * 15;
          centerY = CANVAS_HEIGHT / 2 + Math.sin(t * 2.4) * 150;
        } else if (t < 57) {
          // Sector 5: Supernova Climax (46 - 57s) - intense rhythmic corridors
          gap = 170;
          centerY = CANVAS_HEIGHT / 2 + Math.sin(t * 2.8) * 170;
        } else {
          // Sector 6: Event Horizon (57 - 60s) - widening finish arena
          const progress = (t - 57) / 3;
          gap = 170 + progress * 320;
          centerY = CANVAS_HEIGHT / 2;
        }

        const ceilY = Math.max(30, centerY - gap / 2);
        const floorY = Math.min(CANVAS_HEIGHT - 30, centerY + gap / 2);

        ceilingPoints.push({ x, y: ceilY });
        floorPoints.push({ x, y: floorY });
      }

      // Generate Spikes & Obstacle Hazards
      // Place spikes along the corridor slopes and occasional floating spikes
      for (let t = 2.5; t < 57.0; t += 0.85) {
        const x = getTimeToX(t);
        // Find ceiling and floor at this X
        const ceilY = LevelGenerator.getYAtX(ceilingPoints, x);
        const floorY = LevelGenerator.getYAtX(floorPoints, x);
        const corridorHeight = floorY - ceilY;

        // Skip placing spikes directly on top of portals
        const nearPortal = portals.some(p => Math.abs(p.x - x) < 70);
        if (nearPortal) continue;

        // Floor Spike (Points UP)
        if (Math.sin(t * 2.1) > 0.05 && floorY > 200) {
          spikes.push({
            type: 'floor',
            x: x,
            y: floorY,
            width: 34,
            height: 38,
            rotation: 0 // pointing UP
          });
        }

        // Ceiling Spike (Points DOWN)
        if (Math.cos(t * 2.4) > 0.1 && ceilY < CANVAS_HEIGHT - 200) {
          spikes.push({
            type: 'ceiling',
            x: x + 60,
            y: ceilY,
            width: 34,
            height: 38,
            rotation: Math.PI // pointing DOWN
          });
        }

        // Floating Diamond Hazard in middle of wide areas
        if (corridorHeight > 220 && Math.sin(t * 1.7) > 0.6) {
          spikes.push({
            type: 'floating',
            x: x + 30,
            y: (ceilY + floorY) / 2,
            width: 28,
            height: 28,
            rotation: 0
          });
        }
      }

      // Generate 10 Collectible Crystals throughout the 60 seconds
      for (let c = 1; c <= 10; c++) {
        const t = c * 5.4; // Distributed from ~5.4s to 54s
        const x = getTimeToX(t);
        const ceilY = LevelGenerator.getYAtX(ceilingPoints, x);
        const floorY = LevelGenerator.getYAtX(floorPoints, x);
        crystals.push({
          id: c,
          x: x,
          y: (ceilY + floorY) / 2 + Math.sin(c) * 40,
          collected: false
        });
      }

      return {
        totalX,
        speedZones,
        portals,
        ceilingPoints,
        floorPoints,
        spikes,
        crystals,
        getTimeToX
      };
    }

    static getYAtX(points, x) {
      if (points.length === 0) return 0;
      if (x <= points[0].x) return points[0].y;
      if (x >= points[points.length - 1].x) return points[points.length - 1].y;

      // Binary search for segment
      let low = 0;
      let high = points.length - 1;
      while (low <= high) {
        const mid = (low + high) >> 1;
        if (points[mid].x < x) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      const p1 = points[Math.max(0, low - 1)];
      const p2 = points[Math.min(points.length - 1, low)];
      if (p2.x === p1.x) return p1.y;
      const t = (x - p1.x) / (p2.x - p1.x);
      return p1.y + t * (p2.y - p1.y);
    }
  }

  // ==========================================
  // 4. PARTICLE ENGINE
  // ==========================================
  class ParticleEngine {
    constructor() {
      this.particles = [];
      this.confetti = [];
    }

    reset() {
      this.particles = [];
      this.confetti = [];
    }

    addThrust(x, y, color, vy) {
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: x - 12 + (Math.random() * 4 - 2),
          y: y + (Math.random() * 6 - 3),
          vx: -(Math.random() * 90 + 120),
          vy: -vy * 0.2 + (Math.random() * 40 - 20),
          size: Math.random() * 4 + 2,
          color: color,
          alpha: 0.8,
          decay: Math.random() * 2.5 + 2.0
        });
      }
    }

    addExplosion(x, y, color) {
      // 50 glowing polygonal neon shards
      for (let i = 0; i < 55; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 520 + 80;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 7 + 3,
          color: i % 2 === 0 ? color : '#ffffff',
          alpha: 1.0,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() * 10 - 5),
          decay: Math.random() * 1.5 + 1.2,
          isShard: true
        });
      }
    }

    addPortalBurst(x, y, color) {
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 260 + 60;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 5 + 2,
          color: color,
          alpha: 0.9,
          decay: Math.random() * 2.0 + 1.8
        });
      }
    }

    addVictoryConfetti() {
      const colors = ['#f59e0b', '#ec4899', '#06b6d4', '#10b981', '#ffffff', '#a855f7'];
      for (let i = 0; i < 120; i++) {
        this.confetti.push({
          x: Math.random() * CANVAS_WIDTH,
          y: -20 - Math.random() * 200,
          vx: Math.random() * 120 - 60,
          vy: Math.random() * 250 + 150,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          vRot: Math.random() * 8 - 4
        });
      }
    }

    update(dt) {
      // Update normal particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
        if (p.isShard) {
          p.rotation += p.vRot * dt;
          p.vy += 300 * dt; // gravity on shards
        }
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update victory confetti
      for (let i = this.confetti.length - 1; i >= 0; i--) {
        const c = this.confetti[i];
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rotation += c.vRot * dt;
        if (c.y > CANVAS_HEIGHT + 30) {
          c.y = -20;
          c.x = Math.random() * CANVAS_WIDTH;
        }
      }
    }

    render(ctx, cameraX) {
      // Particles in world coordinates
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        const screenX = p.x - cameraX;
        if (p.isShard) {
          ctx.translate(screenX, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.moveTo(-p.size, -p.size);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(-p.size / 2, p.size);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(screenX, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Confetti in screen coordinates
      for (const c of this.confetti) {
        ctx.save();
        ctx.fillStyle = c.color;
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.5);
        ctx.restore();
      }
    }
  }

  // ==========================================
  // 5. MAIN GAME CONTROLLER
  // ==========================================
  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.audio = new AudioEngine();
      this.particles = new ParticleEngine();

      // Game States: 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
      this.state = 'MENU';
      this.isPracticeMode = false;
      this.practiceCheckpoints = [];

      // Wave Ship Properties
      this.colorKey = localStorage.getItem('spacewave_color') || 'cyan';
      this.shipColor = SHIP_COLORS[this.colorKey] || SHIP_COLORS.cyan;
      this.x = 0;
      this.y = CANVAS_HEIGHT / 2;
      this.vy = 0;
      this.gravity = 1; // 1 = normal, -1 = inverted
      this.isMini = false;
      this.currentSpeed = BASE_SPEED;
      this.angle = 0;
      this.isHolding = false;
      this.lastInputState = false;

      // Trail & Visuals
      this.trail = []; // Array of points {x, y}
      this.cameraX = 0;
      this.screenShake = 0;
      this.beatPulse = 0;

      // Level Progress
      this.track = LevelGenerator.buildTrack();
      this.elapsedTime = 0;
      this.attemptCount = parseInt(localStorage.getItem('spacewave_total_attempts') || '0', 10);
      this.bestPercent = parseFloat(localStorage.getItem('spacewave_best_percent') || '0');
      this.coinsCollected = 0;

      // Stars Parallax Background
      this.stars = [];
      this.initStars();

      // UI Elements Cache
      this.dom = {
        hud: document.getElementById('hud'),
        hudTime: document.getElementById('hud-time'),
        hudPercent: document.getElementById('hud-percent'),
        hudProgressFill: document.getElementById('hud-progress-fill'),
        hudAttempt: document.getElementById('hud-attempt'),
        hudBest: document.getElementById('hud-best'),
        hudModeBadge: document.getElementById('hud-mode-badge'),
        hudPhaseLabel: document.getElementById('hud-phase-label'),
        practiceBar: document.getElementById('practice-controls-bar'),
        practiceCount: document.getElementById('practice-count'),
        eventToast: document.getElementById('event-toast'),
        eventToastText: document.getElementById('event-toast-text'),
        eventToastIcon: document.getElementById('event-toast-icon'),
        screenStart: document.getElementById('screen-start'),
        screenGameOver: document.getElementById('screen-gameover'),
        screenVictory: document.getElementById('screen-victory'),
        screenPause: document.getElementById('screen-pause'),
        gameOverPercent: document.getElementById('gameover-percent'),
        gameOverTime: document.getElementById('gameover-time'),
        gameOverAttempt: document.getElementById('gameover-attempt'),
        gameOverNewBest: document.getElementById('gameover-new-best'),
        menuBestScore: document.getElementById('menu-best-score'),
        menuTotalAttempts: document.getElementById('menu-total-attempts'),
        victoryAttempts: document.getElementById('victory-attempts'),
        victoryCoins: document.getElementById('victory-coins'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        iconSoundOn: document.getElementById('icon-sound-on'),
        iconSoundOff: document.getElementById('icon-sound-off'),
        btnPauseToggle: document.getElementById('btn-pause-toggle')
      };

      this.lastFrameTime = performance.now();

      this.initWindow();
      this.bindEvents();
      this.updateMenuStats();
      this.updateSoundIcons();

      // Start animation loop
      requestAnimationFrame((t) => this.loop(t));
    }

    initStars() {
      this.stars = [];
      for (let i = 0; i < 160; i++) {
        this.stars.push({
          x: Math.random() * CANVAS_WIDTH * 2,
          y: Math.random() * CANVAS_HEIGHT,
          size: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.7 + 0.3,
          speedFactor: Math.random() * 0.3 + 0.1
        });
      }
    }

    initWindow() {
      const resize = () => {
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;
      };
      window.addEventListener('resize', resize);
      resize();
    }

    bindEvents() {
      // Input handlers for Wave
      const onDown = (e) => {
        if (e.target.closest('button')) return; // ignore UI button clicks
        if (this.state === 'GAMEOVER') {
          this.retry();
          return;
        }
        if (this.state === 'PLAYING') {
          this.isHolding = true;
          this.audio.playDirectionSwitch();
        }
      };

      const onUp = (e) => {
        if (this.state === 'PLAYING') {
          this.isHolding = false;
          this.audio.playDirectionSwitch();
        }
      };

      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          if (!this.lastInputState) {
            this.lastInputState = true;
            onDown(e);
          }
        }
        if (e.code === 'KeyP') {
          this.togglePause();
        }
        if (e.code === 'KeyZ' && this.isPracticeMode && this.state === 'PLAYING') {
          this.placeCheckpoint();
        }
        if (e.code === 'KeyX' && this.isPracticeMode && this.state === 'PLAYING') {
          this.removeCheckpoint();
        }
        if (e.code === 'KeyM') {
          this.toggleSound();
        }
        if (e.code === 'Escape') {
          if (this.state === 'PLAYING') this.togglePause();
          else if (this.state === 'PAUSED') this.resume();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          this.lastInputState = false;
          onUp(e);
        }
      });

      this.canvas.addEventListener('mousedown', onDown);
      window.addEventListener('mouseup', onUp);

      this.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onDown(e);
      }, { passive: false });

      window.addEventListener('touchend', (e) => {
        onUp(e);
      });

      // UI Button listeners
      document.getElementById('btn-start-game').addEventListener('click', () => {
        this.isPracticeMode = false;
        this.startRun();
      });

      document.getElementById('btn-start-practice').addEventListener('click', () => {
        this.isPracticeMode = true;
        this.startRun();
      });

      document.getElementById('btn-retry').addEventListener('click', () => {
        this.retry();
      });

      document.getElementById('btn-practice-from-gameover').addEventListener('click', () => {
        this.isPracticeMode = true;
        this.retry();
      });

      document.getElementById('btn-menu-from-gameover').addEventListener('click', () => {
        this.showMenu();
      });

      document.getElementById('btn-replay').addEventListener('click', () => {
        this.startRun();
      });

      document.getElementById('btn-menu-from-victory').addEventListener('click', () => {
        this.showMenu();
      });

      document.getElementById('btn-place-checkpoint').addEventListener('click', () => {
        this.placeCheckpoint();
      });

      document.getElementById('btn-remove-checkpoint').addEventListener('click', () => {
        this.removeCheckpoint();
      });

      this.dom.btnSoundToggle.addEventListener('click', () => {
        this.toggleSound();
      });

      this.dom.btnPauseToggle.addEventListener('click', () => {
        this.togglePause();
      });

      document.getElementById('btn-resume').addEventListener('click', () => {
        this.resume();
      });

      document.getElementById('btn-restart-pause').addEventListener('click', () => {
        this.dom.screenPause.classList.add('hidden');
        this.startRun();
      });

      document.getElementById('btn-menu-from-pause').addEventListener('click', () => {
        this.dom.screenPause.classList.add('hidden');
        this.showMenu();
      });

      // Color Swatches
      const swatches = document.querySelectorAll('.color-swatch');
      swatches.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const col = e.currentTarget.dataset.color;
          this.setShipColor(col);
        });
      });
    }

    setShipColor(key) {
      if (!SHIP_COLORS[key]) return;
      this.colorKey = key;
      this.shipColor = SHIP_COLORS[key];
      localStorage.setItem('spacewave_color', key);

      // Update swatch UI
      document.querySelectorAll('.color-swatch').forEach(btn => {
        if (btn.dataset.color === key) {
          btn.classList.add('ring-4', 'ring-cyan-500/40', 'border-white');
          btn.classList.remove('border-transparent');
        } else {
          btn.classList.remove('ring-4', 'ring-cyan-500/40', 'border-white');
          btn.classList.add('border-transparent');
        }
      });
    }

    toggleSound() {
      const isMuted = this.audio.toggleMute();
      this.updateSoundIcons();
    }

    updateSoundIcons() {
      if (this.audio.isMuted) {
        this.dom.iconSoundOn.classList.add('hidden');
        this.dom.iconSoundOff.classList.remove('hidden');
      } else {
        this.dom.iconSoundOn.classList.remove('hidden');
        this.dom.iconSoundOff.classList.add('hidden');
      }
    }

    updateMenuStats() {
      this.dom.menuBestScore.textContent = `${this.bestPercent.toFixed(1)}%`;
      this.dom.menuTotalAttempts.textContent = this.attemptCount;
      this.dom.hudBest.textContent = `${this.bestPercent.toFixed(0)}%`;
    }

    startRun() {
      this.attemptCount++;
      localStorage.setItem('spacewave_total_attempts', this.attemptCount);

      this.state = 'PLAYING';
      this.elapsedTime = 0;
      this.x = 0;
      this.y = CANVAS_HEIGHT / 2;
      this.vy = 0;
      this.gravity = 1;
      this.isMini = false;
      this.currentSpeed = BASE_SPEED;
      this.isHolding = false;
      this.trail = [{ x: 0, y: this.y }];
      this.practiceCheckpoints = [];
      this.coinsCollected = 0;
      this.particles.reset();

      // Reset track crystal states
      this.track.crystals.forEach(c => c.collected = false);

      // Hide all overlays
      this.dom.screenStart.classList.add('hidden');
      this.dom.screenGameOver.classList.add('hidden');
      this.dom.screenVictory.classList.add('hidden');
      this.dom.screenPause.classList.add('hidden');

      // Update HUD
      this.dom.hudAttempt.textContent = this.attemptCount;
      if (this.isPracticeMode) {
        this.dom.hudModeBadge.classList.remove('hidden');
        this.dom.hudModeBadge.classList.add('flex');
        this.dom.practiceBar.classList.remove('hidden');
        this.dom.practiceBar.classList.add('flex');
        this.dom.practiceCount.textContent = '0 CP';
      } else {
        this.dom.hudModeBadge.classList.add('hidden');
        this.dom.hudModeBadge.classList.remove('flex');
        this.dom.practiceBar.classList.add('hidden');
        this.dom.practiceBar.classList.remove('flex');
      }

      this.audio.startMusic(0);
      this.showToast('🚀 SECTOR 1: LIFT OFF', '#06b6d4');
    }

    retry() {
      if (this.isPracticeMode && this.practiceCheckpoints.length > 0) {
        // Respawn at last practice checkpoint
        const cp = this.practiceCheckpoints[this.practiceCheckpoints.length - 1];
        this.state = 'PLAYING';
        this.elapsedTime = cp.elapsedTime;
        this.x = cp.x;
        this.y = cp.y;
        this.gravity = cp.gravity;
        this.isMini = cp.isMini;
        this.currentSpeed = cp.speed;
        this.trail = [{ x: cp.x, y: cp.y }];
        this.particles.reset();
        this.dom.screenGameOver.classList.add('hidden');
        this.audio.startMusic(this.elapsedTime);
        return;
      }
      this.startRun();
    }

    showMenu() {
      this.state = 'MENU';
      this.audio.stopMusic();
      this.particles.reset();
      this.dom.screenStart.classList.remove('hidden');
      this.dom.screenGameOver.classList.add('hidden');
      this.dom.screenVictory.classList.add('hidden');
      this.dom.screenPause.classList.add('hidden');
      this.updateMenuStats();
    }

    togglePause() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        this.audio.stopMusic();
        this.dom.screenPause.classList.remove('hidden');
      } else if (this.state === 'PAUSED') {
        this.resume();
      }
    }

    resume() {
      if (this.state !== 'PAUSED') return;
      this.state = 'PLAYING';
      this.dom.screenPause.classList.add('hidden');
      this.audio.startMusic(this.elapsedTime);
    }

    placeCheckpoint() {
      if (this.state !== 'PLAYING' || !this.isPracticeMode) return;
      this.practiceCheckpoints.push({
        x: this.x,
        y: this.y,
        elapsedTime: this.elapsedTime,
        gravity: this.gravity,
        isMini: this.isMini,
        speed: this.currentSpeed
      });
      this.dom.practiceCount.textContent = `${this.practiceCheckpoints.length} CP`;
      this.audio.playCheckpoint();
      this.showToast('📍 CHECKPOINT SAVED', '#10b981');
    }

    removeCheckpoint() {
      if (this.practiceCheckpoints.length > 0) {
        this.practiceCheckpoints.pop();
        this.dom.practiceCount.textContent = `${this.practiceCheckpoints.length} CP`;
        this.audio.playCheckpoint();
      }
    }

    showToast(text, color = '#06b6d4') {
      this.dom.eventToastText.textContent = text;
      this.dom.eventToast.style.borderColor = color;
      this.dom.eventToast.style.color = color;
      this.dom.eventToast.classList.remove('opacity-0', 'scale-90');
      this.dom.eventToast.classList.add('opacity-100', 'scale-100');

      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.dom.eventToast.classList.add('opacity-0', 'scale-90');
        this.dom.eventToast.classList.remove('opacity-100', 'scale-100');
      }, 2000);
    }

    crash() {
      if (this.state !== 'PLAYING') return;
      this.state = 'GAMEOVER';
      this.audio.stopMusic();
      this.audio.playCrash();
      this.screenShake = 22; // pixels of trauma

      this.particles.addExplosion(this.x, this.y, this.shipColor.primary);

      const percent = Math.min(100, (this.elapsedTime / GAME_DURATION) * 100);
      const isNewBest = percent > this.bestPercent;
      if (isNewBest) {
        this.bestPercent = percent;
        localStorage.setItem('spacewave_best_percent', this.bestPercent.toFixed(1));
      }

      // Populate game over modal
      this.dom.gameOverPercent.textContent = `${percent.toFixed(1)}%`;
      this.dom.gameOverTime.textContent = `${this.elapsedTime.toFixed(1)}s / 60.0s`;
      this.dom.gameOverAttempt.textContent = `#${this.attemptCount}`;
      if (isNewBest && percent > 5) {
        this.dom.gameOverNewBest.classList.remove('hidden');
        this.dom.gameOverNewBest.classList.add('flex');
      } else {
        this.dom.gameOverNewBest.classList.add('hidden');
        this.dom.gameOverNewBest.classList.remove('flex');
      }

      setTimeout(() => {
        if (this.state === 'GAMEOVER') {
          this.dom.screenGameOver.classList.remove('hidden');
        }
      }, 350);
    }

    victory() {
      this.state = 'VICTORY';
      this.audio.stopMusic();
      this.audio.playVictory();
      this.particles.addVictoryConfetti();

      this.bestPercent = 100.0;
      localStorage.setItem('spacewave_best_percent', '100.0');

      this.dom.victoryAttempts.textContent = this.attemptCount;
      this.dom.victoryCoins.textContent = `${this.coinsCollected} / 10`;
      this.dom.screenVictory.classList.remove('hidden');
      this.showToast('🏆 100% VICTORY COMPLETED!', '#f59e0b');
    }

    // ==========================================
    // 6. MAIN GAME LOOP & UPDATES
    // ==========================================
    loop(currentTime) {
      const dt = Math.min(0.05, (currentTime - this.lastFrameTime) / 1000);
      this.lastFrameTime = currentTime;

      if (this.state === 'PLAYING') {
        this.update(dt);
      }
      this.particles.update(dt);
      this.render();

      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      this.elapsedTime += dt;

      // 60-Second Completion Check
      if (this.elapsedTime >= GAME_DURATION) {
        this.elapsedTime = GAME_DURATION;
        this.victory();
        return;
      }

      // 1. Determine Current Speed & Portals
      const zone = this.track.speedZones.find(z => this.elapsedTime >= z.startT && this.elapsedTime < z.endT);
      if (zone) {
        this.currentSpeed = zone.speed;
      }

      // Update Phase Label on HUD
      if (this.elapsedTime < 10) {
        this.dom.hudPhaseLabel.textContent = 'Sector 1: Lift Off (1x)';
      } else if (this.elapsedTime < 22) {
        this.dom.hudPhaseLabel.textContent = 'Sector 2: Neon Grid (2x)';
      } else if (this.elapsedTime < 34) {
        this.dom.hudPhaseLabel.textContent = this.isMini ? 'Sector 3: Mini Wave (2x)' : 'Sector 3: Gravity Void (2x)';
      } else if (this.elapsedTime < 46) {
        this.dom.hudPhaseLabel.textContent = 'Sector 4: Cyber Drop (3x)';
      } else if (this.elapsedTime < 57) {
        this.dom.hudPhaseLabel.textContent = 'Sector 5: Supernova Climax (3.5x)';
      } else {
        this.dom.hudPhaseLabel.textContent = 'Sector 6: Event Horizon';
      }

      // 2. Wave Movement Physics (Geometry Dash 45-degree angle)
      // Normal wave: vertical speed equals horizontal speed.
      // Mini wave: vertical speed is 1.35x faster (sharper angle).
      const verticalSpeedMultiplier = this.isMini ? 1.35 : 1.0;
      const targetDir = (this.isHolding ? -1 : 1) * this.gravity;
      this.vy = targetDir * this.currentSpeed * verticalSpeedMultiplier;

      // Advance X and Y
      this.x += this.currentSpeed * dt;
      this.y += this.vy * dt;

      // Target ship visual tilt angle
      const targetAngle = Math.atan2(this.vy, this.currentSpeed);
      this.angle += (targetAngle - this.angle) * Math.min(1.0, dt * 25);

      // Camera smoothly follows player (~28% from screen left)
      this.cameraX = this.x - CANVAS_WIDTH * 0.28;

      // 3. Record Trail Points
      const lastPoint = this.trail[this.trail.length - 1];
      if (!lastPoint || Math.hypot(this.x - lastPoint.x, this.y - lastPoint.y) > 6) {
        this.trail.push({ x: this.x, y: this.y });
        // Prune offscreen trail to keep high performance
        if (this.trail.length > 500) {
          this.trail.shift();
        }
      }

      // Engine Thruster Particles
      this.particles.addThrust(this.x, this.y, this.shipColor.secondary, this.vy);

      // 4. Collision Detection
      this.checkCollisions();

      // 5. Update HUD Progress
      const percent = Math.min(100, (this.elapsedTime / GAME_DURATION) * 100);
      this.dom.hudPercent.textContent = `${percent.toFixed(0)}%`;
      this.dom.hudTime.textContent = `${this.elapsedTime.toFixed(1)}s / 60.0s`;
      this.dom.hudProgressFill.style.width = `${percent}%`;

      // Screen Shake Decay
      if (this.screenShake > 0) {
        this.screenShake = Math.max(0, this.screenShake - dt * 45);
      }
    }

    checkCollisions() {
      // Hitbox Radius (forgiving GD wave feel)
      const radius = this.isMini ? 6 : 9;

      // 1. Ceiling & Floor Collision
      const ceilY = LevelGenerator.getYAtX(this.track.ceilingPoints, this.x);
      const floorY = LevelGenerator.getYAtX(this.track.floorPoints, this.x);

      if (this.y - radius <= ceilY || this.y + radius >= floorY) {
        this.crash();
        return;
      }

      // 2. Spikes & Hazard Collision
      const viewLeft = this.x - 50;
      const viewRight = this.x + 50;

      for (const spike of this.track.spikes) {
        if (spike.x + spike.width < viewLeft || spike.x - spike.width > viewRight) continue;

        if (spike.type === 'floating') {
          // Circle or diamond collision
          const dist = Math.hypot(this.x - spike.x, this.y - spike.y);
          if (dist < radius + spike.width * 0.45) {
            this.crash();
            return;
          }
        } else {
          // Triangle spike collision: Test if player circle overlaps triangle
          const halfW = spike.width / 2;
          let tipX = spike.x;
          let tipY = spike.type === 'floor' ? spike.y - spike.height : spike.y + spike.height;
          let base1X = spike.x - halfW;
          let base1Y = spike.y;
          let base2X = spike.x + halfW;
          let base2Y = spike.y;

          if (this.circleIntersectsTriangle(this.x, this.y, radius, tipX, tipY, base1X, base1Y, base2X, base2Y)) {
            this.crash();
            return;
          }
        }
      }

      // 3. Portals Trigger
      for (const portal of this.track.portals) {
        if (!portal.triggered && Math.abs(this.x - portal.x) < 25) {
          portal.triggered = true;
          this.particles.addPortalBurst(portal.x, this.y, portal.color);
          this.audio.playPortalPass(portal.type);
          this.showToast(portal.label, portal.color);

          if (portal.type === 'gravity_invert') {
            this.gravity = -1;
          } else if (portal.type === 'gravity_normal') {
            this.gravity = 1;
          } else if (portal.type === 'size_mini') {
            this.isMini = true;
          } else if (portal.type === 'size_normal') {
            this.isMini = false;
          }
        }
      }

      // 4. Crystals / Coins Pickup
      for (const crystal of this.track.crystals) {
        if (!crystal.collected && Math.hypot(this.x - crystal.x, this.y - crystal.y) < 28) {
          crystal.collected = true;
          this.coinsCollected++;
          this.particles.addPortalBurst(crystal.x, crystal.y, '#38bdf8');
          this.audio.playCoin();
        }
      }
    }

    circleIntersectsTriangle(cx, cy, r, x1, y1, x2, y2, x3, y3) {
      // 1. Point in triangle test
      const d1 = (cx - x2) * (y1 - y2) - (x1 - x2) * (cy - y2);
      const d2 = (cx - x3) * (y2 - y3) - (x2 - x3) * (cy - y3);
      const d3 = (cx - x1) * (y3 - y1) - (x3 - x1) * (cy - y1);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(hasNeg && hasPos)) return true;

      // 2. Circle to edge segment tests
      return this.circleIntersectsSegment(cx, cy, r, x1, y1, x2, y2) ||
             this.circleIntersectsSegment(cx, cy, r, x2, y2, x3, y3) ||
             this.circleIntersectsSegment(cx, cy, r, x3, y3, x1, y1);
    }

    circleIntersectsSegment(cx, cy, r, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const closestX = x1 + t * dx;
      const closestY = y1 + t * dy;
      const distSq = (cx - closestX) * (cx - closestX) + (cy - closestY) * (cy - closestY);
      return distSq <= r * r;
    }

    // ==========================================
    // 7. RENDER PIPELINE
    // ==========================================
    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      // Screen Shake
      if (this.screenShake > 0) {
        const shakeX = (Math.random() * 2 - 1) * this.screenShake;
        const shakeY = (Math.random() * 2 - 1) * this.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // A. Deep Space Background & Parallax Stars
      this.renderBackground(ctx);

      // B. Cavern Walls & Neon Grid
      this.renderCavern(ctx);

      // C. Hazards & Portals
      this.renderHazardsAndPortals(ctx);

      // D. Crystals / Coins
      this.renderCrystals(ctx);

      // E. Checkpoints in Practice Mode
      if (this.isPracticeMode) {
        this.renderCheckpoints(ctx);
      }

      // F. Wave Trail
      this.renderWaveTrail(ctx);

      // G. Player Ship
      if (this.state === 'PLAYING' || this.state === 'PAUSED') {
        this.renderShip(ctx);
      }

      // H. Particle Systems
      this.particles.render(ctx, this.cameraX);

      // I. Finish Line Archway (at 60s)
      this.renderFinishLine(ctx);

      ctx.restore();
    }

    renderBackground(ctx) {
      // Cosmic gradient backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGrad.addColorStop(0, '#030712');
      bgGrad.addColorStop(0.5, '#070b19');
      bgGrad.addColorStop(1, '#02040a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Parallax Stars
      for (const s of this.stars) {
        const screenX = (s.x - this.cameraX * s.speedFactor) % (CANVAS_WIDTH * 1.5);
        const drawX = screenX < 0 ? screenX + CANVAS_WIDTH * 1.5 : screenX;
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.beginPath();
        ctx.arc(drawX, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Background Cyber Grid (Pulsing to beat)
      ctx.save();
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      const offsetX = -(this.cameraX * 0.4) % gridSize;

      ctx.beginPath();
      for (let x = offsetX; x < CANVAS_WIDTH; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    renderCavern(ctx) {
      const ceil = this.track.ceilingPoints;
      const floor = this.track.floorPoints;
      if (ceil.length === 0 || floor.length === 0) return;

      const camX = this.cameraX;

      // Sector-based theme color
      let themeGlow = '#06b6d4';
      if (this.elapsedTime >= 10 && this.elapsedTime < 22) themeGlow = '#10b981';
      else if (this.elapsedTime >= 22 && this.elapsedTime < 34) themeGlow = '#a855f7';
      else if (this.elapsedTime >= 34 && this.elapsedTime < 46) themeGlow = '#ec4899';
      else if (this.elapsedTime >= 46 && this.elapsedTime < 57) themeGlow = '#f59e0b';
      else if (this.elapsedTime >= 57) themeGlow = '#38bdf8';

      // 1. Draw Solid Top Ceiling
      ctx.save();
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.moveTo(-100, 0);
      for (let i = 0; i < ceil.length; i++) {
        const sx = ceil[i].x - camX;
        if (sx < -200 || sx > CANVAS_WIDTH + 200) continue;
        ctx.lineTo(sx, ceil[i].y);
      }
      ctx.lineTo(CANVAS_WIDTH + 100, 0);
      ctx.closePath();
      ctx.fill();

      // Ceiling Glowing Border
      ctx.strokeStyle = themeGlow;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = themeGlow;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < ceil.length; i++) {
        const sx = ceil[i].x - camX;
        if (sx < -100 || sx > CANVAS_WIDTH + 100) continue;
        if (!started) {
          ctx.moveTo(sx, ceil[i].y);
          started = true;
        } else {
          ctx.lineTo(sx, ceil[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();

      // 2. Draw Solid Bottom Floor
      ctx.save();
      ctx.fillStyle = '#0b0f19';
      ctx.beginPath();
      ctx.moveTo(-100, CANVAS_HEIGHT);
      for (let i = 0; i < floor.length; i++) {
        const sx = floor[i].x - camX;
        if (sx < -200 || sx > CANVAS_WIDTH + 200) continue;
        ctx.lineTo(sx, floor[i].y);
      }
      ctx.lineTo(CANVAS_WIDTH + 100, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Floor Glowing Border
      ctx.strokeStyle = themeGlow;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = themeGlow;
      ctx.beginPath();
      started = false;
      for (let i = 0; i < floor.length; i++) {
        const sx = floor[i].x - camX;
        if (sx < -100 || sx > CANVAS_WIDTH + 100) continue;
        if (!started) {
          ctx.moveTo(sx, floor[i].y);
          started = true;
        } else {
          ctx.lineTo(sx, floor[i].y);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    renderHazardsAndPortals(ctx) {
      const camX = this.cameraX;

      // 1. Spikes
      for (const spike of this.track.spikes) {
        const sx = spike.x - camX;
        if (sx < -50 || sx > CANVAS_WIDTH + 50) continue;

        ctx.save();
        if (spike.type === 'floating') {
          // Rotating neon diamond
          ctx.translate(sx, spike.y);
          ctx.rotate((performance.now() / 600) % (Math.PI * 2));
          ctx.fillStyle = '#f43f5e';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#f43f5e';
          ctx.beginPath();
          ctx.moveTo(0, -spike.height / 2);
          ctx.lineTo(spike.width / 2, 0);
          ctx.lineTo(0, spike.height / 2);
          ctx.lineTo(-spike.width / 2, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Triangular Spike
          const halfW = spike.width / 2;
          const isFloor = spike.type === 'floor';
          const tipY = isFloor ? spike.y - spike.height : spike.y + spike.height;

          // Inner gradient
          const spikeGrad = ctx.createLinearGradient(sx, spike.y, sx, tipY);
          spikeGrad.addColorStop(0, '#1e293b');
          spikeGrad.addColorStop(1, '#f43f5e');

          ctx.fillStyle = spikeGrad;
          ctx.strokeStyle = '#fda4af';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#f43f5e';

          ctx.beginPath();
          ctx.moveTo(sx - halfW, spike.y);
          ctx.lineTo(sx, tipY);
          ctx.lineTo(sx + halfW, spike.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Portals
      for (const portal of this.track.portals) {
        const sx = portal.x - camX;
        if (sx < -80 || sx > CANVAS_WIDTH + 80) continue;

        ctx.save();
        ctx.translate(sx, CANVAS_HEIGHT / 2);

        // Glowing vertical portal ellipse rings
        const pulse = Math.sin(performance.now() / 150) * 4;
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 18;
        ctx.shadowColor = portal.color;

        ctx.beginPath();
        ctx.ellipse(0, 0, 16 + pulse, 130, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 8, 110, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Label above portal
        ctx.fillStyle = portal.color;
        ctx.font = 'bold 12px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(portal.label, 0, -145);

        ctx.restore();
      }
    }

    renderCrystals(ctx) {
      const camX = this.cameraX;
      for (const crystal of this.track.crystals) {
        if (crystal.collected) continue;
        const sx = crystal.x - camX;
        if (sx < -40 || sx > CANVAS_WIDTH + 40) continue;

        ctx.save();
        const floatY = crystal.y + Math.sin(performance.now() / 250 + crystal.id) * 6;
        ctx.translate(sx, floatY);
        ctx.rotate(performance.now() / 800);

        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#38bdf8';

        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(9, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }

    renderCheckpoints(ctx) {
      const camX = this.cameraX;
      for (let i = 0; i < this.practiceCheckpoints.length; i++) {
        const cp = this.practiceCheckpoints[i];
        const sx = cp.x - camX;
        if (sx < -30 || sx > CANVAS_WIDTH + 30) continue;

        ctx.save();
        ctx.translate(sx, cp.y);
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#a7f3d0';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#10b981';

        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
    }

    renderWaveTrail(ctx) {
      if (this.trail.length < 2) return;
      const camX = this.cameraX;

      ctx.save();
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';

      // Signature Geometry Dash glowing zigzag trail
      // 1. Wide outer neon glow
      ctx.lineWidth = this.isMini ? 6 : 8;
      ctx.strokeStyle = this.shipColor.trail;
      ctx.shadowBlur = 16;
      ctx.shadowColor = this.shipColor.glow;

      ctx.beginPath();
      for (let i = 0; i < this.trail.length; i++) {
        const sx = this.trail[i].x - camX;
        if (i === 0) ctx.moveTo(sx, this.trail[i].y);
        else ctx.lineTo(sx, this.trail[i].y);
      }
      ctx.stroke();

      // 2. Bright core center line
      ctx.lineWidth = this.isMini ? 3 : 4;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffffff';
      ctx.stroke();

      ctx.restore();
    }

    renderShip(ctx) {
      const screenX = this.x - this.cameraX;
      ctx.save();
      ctx.translate(screenX, this.y);

      // Mini wave scaling
      const scale = this.isMini ? 0.68 : 1.0;
      ctx.scale(scale, scale);

      // Rotation matches flight direction
      ctx.rotate(this.angle);

      // Inverted gravity visual cue
      if (this.gravity === -1) {
        ctx.scale(1, -1);
      }

      // Draw Geometry Dash Wave Icon (Dart / Arrowhead)
      ctx.shadowBlur = 16;
      ctx.shadowColor = this.shipColor.glow;

      // Outer hull
      ctx.fillStyle = this.shipColor.primary;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(18, 0);           // Arrowhead nose
      ctx.lineTo(-14, -12);        // Top wing
      ctx.lineTo(-8, 0);           // Back indent
      ctx.lineTo(-14, 12);         // Bottom wing
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner Core Accent
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();

      // Engine Thruster Flame
      const flameLength = Math.random() * 8 + 10;
      ctx.fillStyle = this.shipColor.secondary;
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - flameLength, 0);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    renderFinishLine(ctx) {
      const finishX = this.track.totalX;
      const sx = finishX - this.cameraX;
      if (sx < -100 || sx > CANVAS_WIDTH + 150) return;

      ctx.save();
      ctx.translate(sx, 0);

      // Glowing finish line beam
      const beamGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
      beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0.8)');

      ctx.fillStyle = beamGrad;
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#f59e0b';
      ctx.fillRect(-6, 0, 12, CANVAS_HEIGHT);

      // 100% Arch Banner
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'black 22px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('100% GOAL', 0, CANVAS_HEIGHT / 2 - 100);

      ctx.restore();
    }
  }

  // Initialize Game on Window Load
  window.addEventListener('DOMContentLoaded', () => {
    new Game();
  });

})();
