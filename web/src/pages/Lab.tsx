/* oxlint-disable react/immutability, react/refs, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback } from 'react';
import '../cyber-combat.css';

// ============================================================================
// COMBAT KINEMATICS & SENSOR CONSTANTS
// ============================================================================
const NORMAL_MAX_RPM = 3500;
const OVERDRIVE_MAX_RPM = 4000;
const SENSOR_RADIUS_M = 0.025; // 25mm radius from center of rotation
const GRAVITY_MSS = 9.80665;
const BOT_MOMENT_OF_INERTIA = 0.00235; // kg*m^2 for 3lb meltybrain disc + AR500 teeth
export const TOOTH_TIP_RADIUS_M = 0.075; // 75mm radius to AR500 impact tooth tip
const ARENA_RADIUS = 260;
const ARENA_CENTER = { x: 300, y: 300 };
const EYELINER_RADIUS = 22;

// ============================================================================
// TYPES
// ============================================================================
export type ArenaId = 'nhrl-cage' | 'battlebox' | 'spin-chamber';
export type OpponentId = 'tombstone' | 'wedge' | 'drum' | 'dummy1' | 'dummy2' | 'dummy3';

export type ArenaConfig = {
  id: ArenaId;
  name: string;
  tagline: string;
  badge: string;
  themeColor: string;
  description: string;
};

export const ARENA_CONFIGS: Record<ArenaId, ArenaConfig> = {
  'nhrl-cage': {
    id: 'nhrl-cage',
    name: 'NHRL STEEL CAGE',
    tagline: '10-Gauge Steel Floor · Pit Hazard · Push-Out Boundary',
    badge: 'NHRL OFFICIAL',
    themeColor: '#ffaa00',
    description: 'Authentic Norwalk Havoc 10-gauge welded steel arena. Features an active corner Pit Hazard with suction vortex and perimeter push-out hazard boundary.',
  },
  'battlebox': {
    id: 'battlebox',
    name: 'BATTLEBOX PROVING GROUND',
    tagline: 'Polycarbonate Walls · 4x Floor Killsaws · Industrial Steel',
    badge: 'PROVING GROUND',
    themeColor: '#00f0ff',
    description: 'Hardened arena with transparent ballistic polycarbonate containment and four 1,200 RPM spinning hazard blades that obliterate unguided bots.',
  },
  'spin-chamber': {
    id: 'spin-chamber',
    name: 'SPIN TEST CHAMBER',
    tagline: '4,000 RPM High-Speed Velocity Ring · AR500 Telemetry Dummies',
    badge: '145 MPH RATED',
    themeColor: '#00ff88',
    description: 'Heavy Kevlar containment test bunker with concentric 1k-4k RPM speed rings and stationary AR500 telemetry target dummies recording tooth bite depth.',
  },
};

type Opponent = {
  id: OpponentId;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  accentColor: string;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  weaponAngle: number;
  weaponSpeed: number; // rad/s
  aiState: 'patrol' | 'charge' | 'flank' | 'evade' | 'recover' | 'stationary';
  aiTimer: number;
  massLb: number;
  biteTelemetryMm?: number;
  lastBiteForceN?: number;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type MetalDebris = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vRot: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type FloorScuff = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
};

type FloatingCombatText = {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
};

export type CameraMode = 'Tactical Top-Down' | 'Dynamic Follow Bot' | 'Clash Zoom';

export type ReplaySnapshot = {
  time: number;
  bot: {
    x: number;
    y: number;
    angle: number;
    headingAngle: number;
    vx: number;
    vy: number;
    motorBias: number;
  };
  opponents: {
    id: OpponentId;
    name: string;
    type: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    health: number;
    maxHealth: number;
    destroyed: boolean;
    weaponAngle: number;
  }[];
  sparks: Spark[];
  debris: MetalDebris[];
  scuffs: FloorScuff[];
  rpm: number;
  impactG: number;
  arenaId: ArenaId;
};

export type KillcamModalData = {
  impactG: number;
  opponentName: string;
  snapshots: ReplaySnapshot[];
  impactIndex: number;
  arenaId: ArenaId;
};

export type RecordedVideo = {
  blob: Blob;
  url: string;
  durationSec: number;
  mimeType: string;
  sizeBytes: number;
  filename: string;
};

// ============================================================================
// WEB AUDIO API PROCEDURAL SOUND ENGINE
// ============================================================================
class CombatAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mixGain: GainNode | null = null;
  private recordGain: GainNode | null = null;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  
  // Brushless Motor Oscillators (14-Pole Commutation)
  private motorGain: GainNode | null = null;
  private motorFundOsc: OscillatorNode | null = null;
  private motorHarmOsc: OscillatorNode | null = null;
  private motorThirdOsc: OscillatorNode | null = null;
  private motorSubOsc: OscillatorNode | null = null;
  private motorPwmOsc: OscillatorNode | null = null;

  // Titanium Cleat / Tire Scrub
  private scrubGain: GainNode | null = null;
  private scrubFilter: BiquadFilterNode | null = null;
  private scrubSource: AudioBufferSourceNode | null = null;

  // Killsaw / Hazard Blade Sound
  private sawGain: GainNode | null = null;
  private sawOsc: OscillatorNode | null = null;

  // Noise Buffer for Crashes & Sparks
  private noiseBuffer: AudioBuffer | null = null;
  private muted: boolean = false;
  private initialized: boolean = false;

  public init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      // Master Speaker Output Bus
      const master = ctx.createGain();
      master.gain.setValueAtTime(this.muted ? 0 : 0.7, ctx.currentTime);
      master.connect(ctx.destination);
      this.masterGain = master;

      // Shared Pre-Master Audio Mix Bus
      const mix = ctx.createGain();
      mix.gain.setValueAtTime(1.0, ctx.currentTime);
      mix.connect(master);
      this.mixGain = mix;

      // Independent Recording Gain Bus (feeds video stream, unaffected by speaker mute)
      const record = ctx.createGain();
      record.gain.setValueAtTime(1.0, ctx.currentTime);
      mix.connect(record);
      this.recordGain = record;

      if (this.mediaDest) {
        record.connect(this.mediaDest);
      }

      // Pre-generate Pink/White Noise Buffer for Impact & Cleat Scraping
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.11;
        b2 = 0.86 * b2 + white * 0.25;
        channelData[i] = (b0 + b1 + b2 + white * 0.1) * 0.35;
      }
      this.noiseBuffer = noiseBuffer;

      // 1. Multi-Harmonic Brushless Motor Whine Synthesis (14-Pole Motor Commutation)
      const motorGain = ctx.createGain();
      motorGain.gain.setValueAtTime(0, ctx.currentTime);
      motorGain.connect(mix);
      this.motorGain = motorGain;

      // Fundamental electrical whine: freq = (RPM * 7) / 60
      const fundOsc = ctx.createOscillator();
      fundOsc.type = 'sawtooth';
      fundOsc.frequency.setValueAtTime(70, ctx.currentTime);
      const fundGain = ctx.createGain();
      fundGain.gain.setValueAtTime(0.22, ctx.currentTime);
      fundOsc.connect(fundGain);
      fundGain.connect(motorGain);
      fundOsc.start();
      this.motorFundOsc = fundOsc;

      // 2nd Harmonic (2 * f0)
      const harmOsc = ctx.createOscillator();
      harmOsc.type = 'triangle';
      harmOsc.frequency.setValueAtTime(140, ctx.currentTime);
      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.14, ctx.currentTime);
      harmOsc.connect(harmGain);
      harmGain.connect(motorGain);
      harmOsc.start();
      this.motorHarmOsc = harmOsc;

      // 3rd Harmonic (3 * f0) - Crisp Brushless Ringing
      const thirdOsc = ctx.createOscillator();
      thirdOsc.type = 'sine';
      thirdOsc.frequency.setValueAtTime(210, ctx.currentTime);
      const thirdGain = ctx.createGain();
      thirdGain.gain.setValueAtTime(0.08, ctx.currentTime);
      thirdOsc.connect(thirdGain);
      thirdGain.connect(motorGain);
      thirdOsc.start();
      this.motorThirdOsc = thirdOsc;

      // Sub Rumble (Mechanical balance vibration at RPM / 60)
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(30, ctx.currentTime);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.32, ctx.currentTime);
      subOsc.connect(subGain);
      subGain.connect(motorGain);
      subOsc.start();
      this.motorSubOsc = subOsc;

      // DSHOT PWM High-Frequency Switching Ripple (~4-8 kHz)
      const pwmOsc = ctx.createOscillator();
      pwmOsc.type = 'sine';
      pwmOsc.frequency.setValueAtTime(4000, ctx.currentTime);
      const pwmGain = ctx.createGain();
      pwmGain.gain.setValueAtTime(0.035, ctx.currentTime);
      pwmOsc.connect(pwmGain);
      pwmGain.connect(motorGain);
      pwmOsc.start();
      this.motorPwmOsc = pwmOsc;

      // 2. High-Traction Titanium Cleat / Tire Scrub Synthesis
      const scrubFilter = ctx.createBiquadFilter();
      scrubFilter.type = 'bandpass';
      scrubFilter.frequency.setValueAtTime(480, ctx.currentTime);
      scrubFilter.Q.setValueAtTime(2.2, ctx.currentTime);

      const scrubGain = ctx.createGain();
      scrubGain.gain.setValueAtTime(0, ctx.currentTime);

      const scrubSource = ctx.createBufferSource();
      scrubSource.buffer = noiseBuffer;
      scrubSource.loop = true;
      scrubSource.connect(scrubFilter);
      scrubFilter.connect(scrubGain);
      scrubGain.connect(mix);
      scrubSource.start();

      this.scrubGain = scrubGain;
      this.scrubFilter = scrubFilter;
      this.scrubSource = scrubSource;

      // 3. BattleBox Killsaws Ambient Whine
      const sawOsc = ctx.createOscillator();
      sawOsc.type = 'sawtooth';
      sawOsc.frequency.setValueAtTime(340, ctx.currentTime);
      const sawGain = ctx.createGain();
      sawGain.gain.setValueAtTime(0, ctx.currentTime);
      sawOsc.connect(sawGain);
      sawGain.connect(mix);
      sawOsc.start();
      this.sawOsc = sawOsc;
      this.sawGain = sawGain;

      this.initialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode | null {
    if (!this.initialized || !this.ctx) {
      this.init();
    }
    if (!this.ctx) return null;
    if (!this.mediaDest) {
      try {
        this.mediaDest = this.ctx.createMediaStreamDestination();
        if (this.recordGain) {
          this.recordGain.connect(this.mediaDest);
        } else if (this.mixGain) {
          this.mixGain.connect(this.mediaDest);
        }
      } catch {
        return null;
      }
    }
    return this.mediaDest;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    }
  }

  public isMuted() {
    return this.muted;
  }

  public updateMotor(rpm: number, armed: boolean, throttle: number) {
    if (!this.initialized || !this.ctx || !this.motorGain) return;
    const now = this.ctx.currentTime;
    if (!armed || rpm < 40) {
      this.motorGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    // 14-pole motor electrical frequency (7 pole-pairs): f0 = (RPM * 7) / 60
    const fundFreq = Math.max(30, (rpm * 7) / 60);
    const harmFreq = fundFreq * 2;
    const thirdFreq = fundFreq * 3;
    const subFreq = Math.max(15, rpm / 60);

    this.motorFundOsc?.frequency.setTargetAtTime(fundFreq, now, 0.02);
    this.motorHarmOsc?.frequency.setTargetAtTime(harmFreq, now, 0.02);
    this.motorThirdOsc?.frequency.setTargetAtTime(thirdFreq, now, 0.02);
    this.motorSubOsc?.frequency.setTargetAtTime(subFreq, now, 0.02);

    const pwmFreq = 3800 + throttle * 1200;
    this.motorPwmOsc?.frequency.setTargetAtTime(pwmFreq, now, 0.02);

    const rpmFrac = Math.min(1.15, rpm / NORMAL_MAX_RPM);
    const targetVol = 0.03 + rpmFrac * 0.18 + throttle * 0.06;
    this.motorGain.gain.setTargetAtTime(targetVol, now, 0.04);
  }

  public updateScrub(lateralVelocityMag: number, rpm: number) {
    if (!this.initialized || !this.ctx || !this.scrubGain) return;
    const now = this.ctx.currentTime;
    if (rpm < 400) {
      this.scrubGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }
    const scrubIntensity = Math.min(1, lateralVelocityMag / 150);
    const targetGain = scrubIntensity > 0.08 ? (scrubIntensity - 0.06) * 0.24 : 0;
    this.scrubGain.gain.setTargetAtTime(targetGain, now, 0.04);

    const freq = 420 + scrubIntensity * 480;
    this.scrubFilter?.frequency.setTargetAtTime(freq, now, 0.04);
  }

  public updateArenaAmbience(arenaId: ArenaId) {
    if (!this.initialized || !this.ctx || !this.sawGain) return;
    const now = this.ctx.currentTime;
    if (arenaId === 'battlebox') {
      this.sawGain.gain.setTargetAtTime(0.045, now, 0.1);
    } else {
      this.sawGain.gain.setTargetAtTime(0, now, 0.1);
    }
  }

  public playImpact(intensity: number, isWall: boolean) {
    if (!this.initialized || !this.ctx) return;
    const targetBus = this.mixGain || this.masterGain;
    if (!targetBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const norm = Math.min(1.8, Math.max(0.25, intensity));

    // 1. Metallic Clang Shock (Resonant Bandpassed Noise)
    if (this.noiseBuffer) {
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.setValueAtTime(isWall ? 1450 : 980, now);
      bpFilter.Q.setValueAtTime(isWall ? 6.0 : 4.5, now);

      const impactGain = ctx.createGain();
      const peak = 0.52 * norm;
      impactGain.gain.setValueAtTime(peak, now);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + (isWall ? 0.22 : 0.38));

      noiseSrc.connect(bpFilter);
      bpFilter.connect(impactGain);
      impactGain.connect(targetBus);

      noiseSrc.start(now);
      noiseSrc.stop(now + 0.4);
    }

    // 2. High-Frequency Metallic Harmonics Ping
    const pingOsc = ctx.createOscillator();
    pingOsc.type = isWall ? 'triangle' : 'sine';
    const baseFreq = isWall ? 1720 : 1180;
    pingOsc.frequency.setValueAtTime(baseFreq * (0.92 + Math.random() * 0.16), now);
    pingOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.32, now + 0.19);

    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0.35 * norm, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    pingOsc.connect(pingGain);
    pingGain.connect(targetBus);
    pingOsc.start(now);
    pingOsc.stop(now + 0.27);

    // 3. Low Sub-thud for Kinetic Transfer
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(170, now);
    thudOsc.frequency.exponentialRampToValueAtTime(34, now + 0.14);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.6 * norm, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    thudOsc.connect(thudGain);
    thudGain.connect(targetBus);
    thudOsc.start(now);
    thudOsc.stop(now + 0.18);

    // 4. Synthetic Spark Hiss
    if (this.noiseBuffer) {
      const sparkSrc = ctx.createBufferSource();
      sparkSrc.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3200, now);

      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.28 * norm, now);
      sg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      sparkSrc.connect(hp);
      hp.connect(sg);
      sg.connect(targetBus);
      sparkSrc.start(now);
      sparkSrc.stop(now + 0.3);
    }
  }

  public playSawImpact() {
    if (!this.initialized || !this.ctx) return;
    const targetBus = this.mixGain || this.masterGain;
    if (!targetBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.22);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(targetBus);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playPitAlarm() {
    if (!this.initialized || !this.ctx) return;
    const targetBus = this.mixGain || this.masterGain;
    if (!targetBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(940, now);
    osc.frequency.setValueAtTime(720, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(targetBus);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  public playDestruction() {
    if (!this.initialized || !this.ctx) return;
    const targetBus = this.mixGain || this.masterGain;
    if (!targetBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.7);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(targetBus);
      src.start(now);
      src.stop(now + 0.8);
    }
  }

  public destroy() {
    try {
      this.scrubSource?.stop();
      this.motorFundOsc?.stop();
      this.motorHarmOsc?.stop();
      this.motorThirdOsc?.stop();
      this.motorSubOsc?.stop();
      this.motorPwmOsc?.stop();
      this.sawOsc?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
  }
}

// Global sound engine instance
const soundEngine = new CombatAudioEngine();

// ============================================================================
// VIDEO RECORDING & REPLAY HELPERS & MODALS
// ============================================================================
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

// ----------------------------------------------------------------------------
// INSTANT KILLCAM & SLOW-MO REPLAY POPUP (0.25X SPEED + SPARK MAGNIFICATION)
// ----------------------------------------------------------------------------
function KillcamReplayModal({
  data,
  onClose,
}: {
  data: KillcamModalData;
  onClose: () => void;
}) {
  const replayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(0.25);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const isPlayingRef = useRef(true);
  const playbackSpeedRef = useRef(0.25);
  const frameIdxRef = useRef(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const drawFrame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (isPlayingRef.current && data.snapshots.length > 0) {
        frameIdxRef.current += playbackSpeedRef.current * (dt * 60);
        if (frameIdxRef.current >= data.snapshots.length) {
          frameIdxRef.current = 0; // loop replay
        }
        setCurrentFrameIdx(Math.floor(frameIdxRef.current));
      }

      const canvas = replayCanvasRef.current;
      if (canvas && data.snapshots.length > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          if (canvas.width !== 540 * dpr || canvas.height !== 540 * dpr) {
            canvas.width = 540 * dpr;
            canvas.height = 540 * dpr;
          }

          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.clearRect(0, 0, 540, 540);

          ctx.fillStyle = '#050811';
          ctx.fillRect(0, 0, 540, 540);

          const snapIdx = Math.min(data.snapshots.length - 1, Math.max(0, Math.floor(frameIdxRef.current)));
          const snap = data.snapshots[snapIdx];

          // Screen-Shake Effect around impact moment
          const distToImpact = Math.abs(snapIdx - data.impactIndex);
          const shakeRatio = Math.max(0, 1 - distToImpact / 28);
          const shakeAmp = shakeRatio * Math.min(24, data.impactG / 10);
          const shakeX = (Math.random() - 0.5) * shakeAmp;
          const shakeY = (Math.random() - 0.5) * shakeAmp;

          // Camera centered smoothly on bot / impact clash
          const clashCenterX = snap.bot.x;
          const clashCenterY = snap.bot.y;
          const zoom = 1.35 + shakeRatio * 0.3;

          ctx.save();
          ctx.translate(270 + shakeX, 270 + shakeY);
          ctx.scale(zoom, zoom);
          ctx.translate(-clashCenterX, -clashCenterY);

          // Arena boundary outline
          ctx.beginPath();
          ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS, 0, 2 * Math.PI);
          ctx.fillStyle = '#09101d';
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#00f0ff';
          ctx.stroke();

          // Floor grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          for (let x = 60; x <= 540; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 40);
            ctx.lineTo(x, 560);
            ctx.stroke();
          }
          for (let y = 60; y <= 540; y += 40) {
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(560, y);
            ctx.stroke();
          }

          // Floor Scuffs
          snap.scuffs.forEach((scuff) => {
            ctx.fillStyle = scuff.color;
            ctx.globalAlpha = scuff.alpha;
            ctx.beginPath();
            ctx.arc(scuff.x, scuff.y, scuff.radius, 0, 2 * Math.PI);
            ctx.fill();
          });
          ctx.globalAlpha = 1.0;

          // Metal debris shards
          snap.debris.forEach((deb) => {
            ctx.save();
            ctx.translate(deb.x, deb.y);
            ctx.rotate(deb.angle);
            ctx.fillStyle = deb.color;
            ctx.globalAlpha = Math.max(0.2, 1 - deb.life / deb.maxLife);
            ctx.fillRect(-deb.size, -deb.size, deb.size * 2, deb.size * 2);
            ctx.restore();
          });
          ctx.globalAlpha = 1.0;

          // SPARK MAGNIFICATION (Slow-mo 3.4x intensified bloom sparks with white-hot core)
          snap.sparks.forEach((sp) => {
            const alpha = Math.max(0.2, 1 - sp.life / sp.maxLife);
            const magSize = sp.size * 3.4;

            const grad = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, magSize * 2.8);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.25, sp.color);
            grad.addColorStop(0.65, 'rgba(255, 170, 0, 0.4)');
            grad.addColorStop(1, 'rgba(255, 42, 85, 0)');
            ctx.fillStyle = grad;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, magSize * 2.8, 0, 2 * Math.PI);
            ctx.fill();

            // White-hot core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, magSize * 0.7, 0, 2 * Math.PI);
            ctx.fill();

            // High energy particle streak
            ctx.strokeStyle = sp.color;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(sp.x - sp.vx * 0.04, sp.y - sp.vy * 0.04);
            ctx.stroke();
          });
          ctx.globalAlpha = 1.0;

          // Opponent bots
          snap.opponents.forEach((opp) => {
            ctx.save();
            ctx.translate(opp.x, opp.y);
            if (opp.destroyed) {
              ctx.fillStyle = '#1e293b';
              ctx.beginPath();
              ctx.arc(0, 0, opp.radius, 0, 2 * Math.PI);
              ctx.fill();
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 2;
              ctx.stroke();
            } else {
              ctx.fillStyle = opp.color;
              ctx.beginPath();
              ctx.arc(0, 0, opp.radius, 0, 2 * Math.PI);
              ctx.fill();
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = '#ffffff';
              ctx.stroke();

              if (opp.id === 'tombstone') {
                ctx.save();
                ctx.rotate(opp.weaponAngle);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(-opp.radius - 8, -4, (opp.radius + 8) * 2, 8);
                ctx.strokeStyle = '#ff2a55';
                ctx.strokeRect(-opp.radius - 8, -4, (opp.radius + 8) * 2, 8);
                ctx.restore();
              }
            }
            ctx.restore();
          });

          // Robot (Eyeliner 3lb Meltybrain)
          ctx.save();
          ctx.translate(snap.bot.x, snap.bot.y);
          ctx.rotate(snap.bot.angle);

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, 0, EYELINER_RADIUS, 0, 2 * Math.PI);
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#00f0ff';
          ctx.stroke();

          // AR500 teeth
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(17, -6);
          ctx.lineTo(29, 0);
          ctx.lineTo(17, 6);
          ctx.moveTo(-17, 6);
          ctx.lineTo(-29, 0);
          ctx.lineTo(-17, -6);
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#ffaa00';
          ctx.stroke();

          ctx.restore();

          // End camera transform
          ctx.restore();

          // Screen Flash on Clash
          if (shakeRatio > 0.05) {
            ctx.save();
            const vig = ctx.createRadialGradient(270, 270, 150, 270, 270, 270);
            vig.addColorStop(0, 'rgba(255, 42, 85, 0)');
            vig.addColorStop(1, `rgba(255, 42, 85, ${shakeRatio * 0.45})`);
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, 540, 540);
            ctx.restore();
          }

          // Scanlines
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (let y = 0; y < 540; y += 4) {
            ctx.fillRect(0, y, 540, 1.5);
          }

          // Tactical Replay Badges
          ctx.fillStyle = '#ff2a55';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`● SLOW-MO REPLAY [${playbackSpeedRef.current}X]`, 20, 32);

          const timeOffset = ((snapIdx - data.impactIndex) / 60).toFixed(2);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`T: ${timeOffset}s | FRAME ${snapIdx}/${data.snapshots.length - 1} | ARENA: ${data.arenaId.toUpperCase()}`, 20, 50);

          if (shakeRatio > 0.2) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`💥 CLASH IMPACT: ${data.impactG}G!`, 270, 80);
          }

          ctx.restore();
        }
      }

      animId = requestAnimationFrame(drawFrame);
    };

    animId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animId);
  }, [data]);

  return (
    <div className="cyber-modal-backdrop" onClick={onClose}>
      <div
        className="cyber-modal-container killcam-container hud-corner"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '580px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 42, 85, 0.4)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="rec-pulsing-dot" />
            <h3 style={{ margin: 0, fontSize: '16px', color: '#ff2a55', letterSpacing: '0.08em', fontWeight: 'bold' }}>
              INSTANT KILLCAM // SLOW-MO REPLAY
            </h3>
            <span className="cyber-badge crimson">{data.impactG}G SHOCK</span>
          </div>
          <button className="cyber-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={onClose}>
            ✕ ESC
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
          Massive collision vs <strong style={{ color: '#fff' }}>{data.opponentName}</strong> in <strong>{ARENA_CONFIGS[data.arenaId].name}</strong> · 0.25x Slow-Motion with Spark Magnification
        </div>

        {/* Dedicated Replay Canvas */}
        <div style={{ width: '100%', aspectRatio: '1/1', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 42, 85, 0.5)', position: 'relative' }}>
          <canvas ref={replayCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Timeline Scrubber */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', fontFamily: 'monospace' }}>0.0s</span>
          <input
            type="range"
            min="0"
            max={Math.max(1, data.snapshots.length - 1)}
            value={currentFrameIdx}
            onChange={(e) => {
              const f = parseInt(e.target.value);
              frameIdxRef.current = f;
              setCurrentFrameIdx(f);
            }}
            style={{ flex: 1, accentColor: '#ff2a55' }}
          />
          <span style={{ fontSize: '11px', color: '#ff2a55', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {data.snapshots.length > 0 ? `${(currentFrameIdx / 60).toFixed(2)}s` : '0s'}
          </span>
        </div>

        {/* Playback Controls & Speed Selectors */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`cyber-btn ${isPlaying ? 'primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: '11px' }}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <button
              className="cyber-btn"
              style={{ padding: '6px 12px', fontSize: '11px' }}
              onClick={() => {
                frameIdxRef.current = 0;
                setCurrentFrameIdx(0);
                setIsPlaying(true);
              }}
            >
              ⏮ RESTART
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>SPEED:</span>
            {[0.1, 0.25, 0.5, 1.0].map((s) => (
              <button
                key={s}
                className={`cyber-btn ${playbackSpeed === s ? 'danger' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => setPlaybackSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          <button className="cyber-btn danger" style={{ padding: '6px 16px', fontSize: '11px' }} onClick={onClose}>
            DISMISS REPLAY
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// VIDEO EXPORT & INSTANT PREVIEW MODAL (1-CLICK DOWNLOAD & COPY)
// ----------------------------------------------------------------------------
function VideoExportModal({
  video,
  onClose,
}: {
  video: RecordedVideo;
  onClose: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = video.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyVideo = async () => {
    try {
      const item = new ClipboardItem({ [video.blob.type]: video.blob });
      await navigator.clipboard.write([item]);
      setCopyStatus('✓ Video file copied to clipboard!');
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.origin + video.url);
        setCopyStatus('✓ Video preview URL copied to clipboard');
      } catch {
        setCopyStatus('Clipboard writing not permitted by browser.');
      }
    }
    setTimeout(() => setCopyStatus(null), 3500);
  };

  const isMp4 = video.mimeType.toLowerCase().includes('mp4');

  return (
    <div className="cyber-modal-backdrop" onClick={onClose}>
      <div
        className="cyber-modal-container hud-corner"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '640px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="cyber-dot" style={{ color: 'var(--neon-green)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--neon-cyan)', letterSpacing: '0.08em' }}>
              COMBAT VIDEO RECORDING COMPLETE
            </h3>
            <span className="cyber-badge green">60 FPS</span>
          </div>
          <button className="cyber-btn" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={onClose}>
            ✕ CLOSE
          </button>
        </div>

        {/* Video Player */}
        <div style={{ width: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--cyber-border)' }}>
          <video
            src={video.url}
            controls
            autoPlay
            loop
            style={{ width: '100%', maxHeight: '420px', display: 'block' }}
          />
        </div>

        {/* Tactical Metadata Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div className="glass-panel" style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>DURATION</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{video.durationSec.toFixed(1)}s</div>
          </div>
          <div className="glass-panel" style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>FILE SIZE</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
              {(video.sizeBytes / (1024 * 1024)).toFixed(2)} MB
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>AVG BITRATE</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-amber)' }}>
              {Math.round((video.sizeBytes * 8) / (video.durationSec * 1000))} kbps
            </div>
          </div>
          <div className="glass-panel" style={{ padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>CONTAINER</div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: isMp4 ? 'var(--neon-green)' : 'var(--neon-cyan)' }}>
              {isMp4 ? 'MP4 / AVC' : 'WEBM / VP9'}
            </div>
          </div>
        </div>

        {/* Feedback Toast */}
        {copyStatus && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(0, 255, 136, 0.15)', border: '1px solid var(--neon-green)', color: 'var(--neon-green)', fontSize: '12px', textAlign: 'center', fontFamily: 'monospace' }}>
            {copyStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--cyber-border-faint)', paddingTop: '12px' }}>
          <button className="cyber-btn" style={{ padding: '8px 16px' }} onClick={onClose}>
            DISCARD / CLOSE
          </button>
          <button className="cyber-btn" style={{ padding: '8px 16px' }} onClick={handleCopyVideo}>
            📋 COPY VIDEO
          </button>
          <button className="cyber-btn primary" style={{ padding: '8px 20px' }} onClick={handleDownload}>
            ⬇ DOWNLOAD {isMp4 ? 'MP4' : 'WEBM'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: LAB
// ============================================================================
export function Lab() {
  // Multi-Arena State
  const [currentArena, setCurrentArena] = useState<ArenaId>('nhrl-cage');
  const currentArenaRef = useRef<ArenaId>('nhrl-cage');
  useEffect(() => {
    currentArenaRef.current = currentArena;
    soundEngine.updateArenaAmbience(currentArena);
    resetArenaForMode(currentArena);
  }, [currentArena]);

  // Fullscreen / Immersive Viewport Mode
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewportContainerRef.current?.requestFullscreen?.().catch(() => {
        setIsFullscreen(!isFullscreen);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Simulator State
  const [armed, setArmed] = useState(false);
  const [throttle, setThrottle] = useState(0); // 0 to 1
  const [currentRpm, setCurrentRpm] = useState(0);
  const [overdrive, setOverdrive] = useState(false);
  const [autoRam, setAutoRam] = useState(false);
  const [driveMode, setDriveMode] = useState<'Normal' | 'Acro' | 'Orbit-Lock'>('Normal');
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentId>('tombstone');
  const [impactG, setImpactG] = useState(0);
  const [peakG, setPeakG] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [hitCombo, setHitCombo] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [audioMuted, setAudioMuted] = useState(false);

  // Translation Vector & State Refs
  const [transVector, setTransVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const transVectorRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);
  const throttleRef = useRef(0);
  const autoRamRef = useRef(false);
  const overdriveRef = useRef(false);
  const selectedOpponentRef = useRef<OpponentId>('tombstone');
  const driveModeRef = useRef<'Normal' | 'Acro' | 'Orbit-Lock'>('Normal');

  useEffect(() => { transVectorRef.current = transVector; }, [transVector]);
  useEffect(() => { armedRef.current = armed; }, [armed]);
  useEffect(() => { throttleRef.current = throttle; }, [throttle]);
  useEffect(() => { autoRamRef.current = autoRam; }, [autoRam]);
  useEffect(() => { overdriveRef.current = overdrive; }, [overdrive]);
  useEffect(() => { selectedOpponentRef.current = selectedOpponent; }, [selectedOpponent]);
  useEffect(() => { driveModeRef.current = driveMode; }, [driveMode]);

  // Gamepad / RadioMaster USB Controller Telemetry
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState<string>('');
  const [gamepadAxes, setGamepadAxes] = useState<number[]>([0, 0, 0, 0]);
  void gamepadAxes;

  useEffect(() => {
    const handleGpConnect = (e: GamepadEvent) => {
      setGamepadConnected(true);
      setGamepadName(e.gamepad.id || 'USB Controller');
    };
    const handleGpDisconnect = () => {
      setGamepadConnected(false);
      setGamepadName('');
    };
    window.addEventListener('gamepadconnected', handleGpConnect);
    window.addEventListener('gamepaddisconnected', handleGpDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected', handleGpConnect);
      window.removeEventListener('gamepaddisconnected', handleGpDisconnect);
    };
  }, []);

  // Live Video Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordBitrate, setRecordBitrate] = useState(0);
  const [recordedVideo, setRecordedVideo] = useState<RecordedVideo | null>(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordStartTimeRef = useRef(0);
  const totalRecordedBytesRef = useRef(0);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Preset Cinematic Camera Modes
  const [cameraMode, setCameraMode] = useState<CameraMode>('Tactical Top-Down');
  const cameraModeRef = useRef<CameraMode>('Tactical Top-Down');
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);
  const cameraStateRef = useRef({ x: 300, y: 300, zoom: 1 });

  // Instant Killcam & Slow-Mo Replay State
  const [autoKillcam, setAutoKillcam] = useState(true);
  const autoKillcamRef = useRef(true);
  useEffect(() => { autoKillcamRef.current = autoKillcam; }, [autoKillcam]);
  const [killcamData, setKillcamData] = useState<KillcamModalData | null>(null);
  const killcamActiveRef = useRef(false);
  useEffect(() => { killcamActiveRef.current = !!killcamData; }, [killcamData]);
  const replayBufferRef = useRef<ReplaySnapshot[]>([]);
  const pendingKillcamRef = useRef<{ delayFrames: number; impactG: number; oppName: string } | null>(null);
  const lastKillcamTriggerRef = useRef(0);

  // Live Canvas Video Recording Controls
  const startRecording = () => {
    soundEngine.init();
    const canvas = arenaCanvasRef.current;
    if (!canvas) return;

    const streamSupported = (canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream;
    if (!streamSupported) {
      alert('Live canvas recording is not supported in this browser.');
      return;
    }

    const canvasStream = (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(60);
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    const audioDest = soundEngine.getMediaStreamDestination();
    if (audioDest && audioDest.stream) {
      const audioTracks = audioDest.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        tracks.push(audioTracks[0]);
      }
    }

    const combinedStream = new MediaStream(tracks);

    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];
    let chosenMime = '';
    for (const m of mimeCandidates) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
        chosenMime = m;
        break;
      }
    }

    try {
      const recorder = new MediaRecorder(
        combinedStream,
        chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: 4_000_000 } : undefined
      );

      recordedChunksRef.current = [];
      totalRecordedBytesRef.current = 0;
      recordStartTimeRef.current = performance.now();

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
          totalRecordedBytesRef.current += e.data.size;
          const elapsedSec = (performance.now() - recordStartTimeRef.current) / 1000;
          if (elapsedSec > 0.3) {
            const kbps = Math.round((totalRecordedBytesRef.current * 8) / (elapsedSec * 1000));
            setRecordBitrate(kbps);
          }
        }
      };

      recorder.onstop = () => {
        const mime = chosenMime || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const nowStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `eyeliner-${currentArenaRef.current}-${nowStamp}.${ext}`;
        const durationSec = Math.max(0.5, (performance.now() - recordStartTimeRef.current) / 1000);

        setRecordedVideo({
          blob,
          url,
          durationSec,
          mimeType: mime,
          sizeBytes: blob.size,
          filename,
        });
        setIsRecording(false);
        setRecordDuration(0);
        setRecordBitrate(0);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);
      setRecordBitrate(0);
    } catch (err) {
      console.error('Failed to initialize MediaRecorder:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Instant Killcam Trigger Logic
  const triggerKillcam = (impactGVal: number, opponentName: string) => {
    if (replayBufferRef.current.length === 0) return;
    const snapshots = [...replayBufferRef.current];
    const impactIdx = Math.max(0, snapshots.length - 24);
    setKillcamData({
      impactG: impactGVal,
      opponentName,
      snapshots,
      impactIndex: impactIdx,
      arenaId: currentArenaRef.current,
    });
  };

  const triggerManualReplay = () => {
    if (replayBufferRef.current.length === 0) return;
    const opp = opponentsRef.current.find((o) => !o.destroyed) || opponentsRef.current[0];
    const targetG = impactG > 0 ? impactG : Math.round(180 + Math.random() * 80);
    triggerKillcam(targetG, opp.name);
  };

  const toggleAudioMute = () => {
    soundEngine.init();
    const next = !audioMuted;
    setAudioMuted(next);
    soundEngine.setMuted(next);
  };

  // Canvas Refs
  const arenaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const accelCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Direct Click/Touch to Aim in Arena state
  const isArenaPointerDownRef = useRef(false);
  const arenaPointerTargetRef = useRef<{ x: number; y: number } | null>(null);

  // Physics simulation data
  const robotPosRef = useRef({
    x: 300,
    y: 300,
    vx: 0,
    vy: 0,
    angle: 0,
    headingAngle: 0,
    motorBias: 0,
  });

  const rpmRef = useRef(0);
  const pllPhaseRef = useRef(0);
  const sparksRef = useRef<Spark[]>([]);
  const debrisRef = useRef<MetalDebris[]>([]);
  const scuffsRef = useRef<FloorScuff[]>([]);
  const floatingTextsRef = useRef<FloatingCombatText[]>([]);
  const comboTimerRef = useRef(0);
  const nextTextIdRef = useRef(1);

  // Hazard Blade Spin Angle (for BattleBox)
  const hazardBladeAngleRef = useRef(0);

  // Opponent Roster Setup by Arena
  const getInitialOpponents = (arenaId: ArenaId): Opponent[] => {
    if (arenaId === 'spin-chamber') {
      return [
        {
          id: 'dummy1',
          name: 'AR500 DUMMY ALPHA',
          type: 'Spring Telemetry Target',
          x: 430,
          y: 200,
          vx: 0,
          vy: 0,
          radius: 26,
          color: '#10b981',
          accentColor: '#34d399',
          health: 500,
          maxHealth: 500,
          destroyed: false,
          weaponAngle: 0,
          weaponSpeed: 0,
          aiState: 'stationary',
          aiTimer: 9999,
          massLb: 8.5,
          biteTelemetryMm: 0,
          lastBiteForceN: 0,
        },
        {
          id: 'dummy2',
          name: 'AR500 DUMMY BETA',
          type: 'Spring Telemetry Target',
          x: 430,
          y: 400,
          vx: 0,
          vy: 0,
          radius: 26,
          color: '#06b6d4',
          accentColor: '#22d3ee',
          health: 500,
          maxHealth: 500,
          destroyed: false,
          weaponAngle: 0,
          weaponSpeed: 0,
          aiState: 'stationary',
          aiTimer: 9999,
          massLb: 8.5,
          biteTelemetryMm: 0,
          lastBiteForceN: 0,
        },
        {
          id: 'dummy3',
          name: 'AR500 DUMMY GAMMA',
          type: 'Spring Telemetry Target',
          x: 170,
          y: 300,
          vx: 0,
          vy: 0,
          radius: 26,
          color: '#8b5cf6',
          accentColor: '#a78bfa',
          health: 500,
          maxHealth: 500,
          destroyed: false,
          weaponAngle: 0,
          weaponSpeed: 0,
          aiState: 'stationary',
          aiTimer: 9999,
          massLb: 8.5,
          biteTelemetryMm: 0,
          lastBiteForceN: 0,
        },
      ];
    }

    return [
      {
        id: 'tombstone',
        name: 'TOMBSTONE JR',
        type: 'Horizontal Bar Spinner',
        x: 460,
        y: 190,
        vx: -0.6,
        vy: 0.4,
        radius: 25,
        color: '#ff2a55',
        accentColor: '#ff6b8b',
        health: 100,
        maxHealth: 100,
        destroyed: false,
        weaponAngle: 0,
        weaponSpeed: 380,
        aiState: 'patrol',
        aiTimer: 0,
        massLb: 3.2,
      },
      {
        id: 'wedge',
        name: 'WEDGE-HOUND',
        type: 'Titanium Wedge Rammer',
        x: 170,
        y: 430,
        vx: 0.5,
        vy: -0.5,
        radius: 23,
        color: '#ffaa00',
        accentColor: '#ffd166',
        health: 120,
        maxHealth: 120,
        destroyed: false,
        weaponAngle: 0,
        weaponSpeed: 0,
        aiState: 'patrol',
        aiTimer: 0,
        massLb: 3.5,
      },
      {
        id: 'drum',
        name: 'DRUM-FIEND',
        type: 'Eggbeater Drum Spinner',
        x: 430,
        y: 440,
        vx: -0.5,
        vy: -0.7,
        radius: 21,
        color: '#a855f7',
        accentColor: '#c084fc',
        health: 90,
        maxHealth: 90,
        destroyed: false,
        weaponAngle: 0,
        weaponSpeed: 520,
        aiState: 'patrol',
        aiTimer: 0,
        massLb: 2.9,
      },
    ];
  };

  const opponentsRef = useRef<Opponent[]>(getInitialOpponents('nhrl-cage'));

  // Dual Accel Waveform History Buffer
  const accelHistoryRef = useRef<{ s1: number; s2: number; rpm: number }[]>([]);

  // Virtual RadioMaster Pocket Gimbal State
  const rightStickRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRight = useRef(false);

  // Helper to add floating combat text
  const addFloatingText = (text: string, x: number, y: number, color: string, size = 13) => {
    floatingTextsRef.current.push({
      id: nextTextIdRef.current++,
      text,
      x: x + (Math.random() - 0.5) * 16,
      y: y - 10,
      color,
      size,
      life: 0,
      maxLife: 0.85,
    });
  };

  // Reset Arena State
  const resetArenaForMode = (arenaId: ArenaId) => {
    robotPosRef.current = { x: 300, y: 300, vx: 0, vy: 0, angle: 0, headingAngle: 0, motorBias: 0 };
    opponentsRef.current = getInitialOpponents(arenaId);
    setSelectedOpponent(arenaId === 'spin-chamber' ? 'dummy1' : 'tombstone');
    sparksRef.current = [];
    debrisRef.current = [];
    scuffsRef.current = [];
    floatingTextsRef.current = [];
    setTotalHits(0);
    setHitCombo(0);
    setComboMultiplier(1);
    setImpactG(0);
    setPeakG(0);
  };

  const resetArena = () => {
    resetArenaForMode(currentArenaRef.current);
  };

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const keysDown = new Set<string>();

    const updateFromKeys = () => {
      let x = 0;
      let y = 0;
      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) y -= 1;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) y += 1;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) x -= 1;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) x += 1;

      const mag = Math.hypot(x, y);
      if (mag > 0) {
        setTransVector({ x: x / mag, y: y / mag });
      } else if (!isDraggingRight.current && !isArenaPointerDownRef.current && !gamepadConnected) {
        setTransVector({ x: 0, y: 0 });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.init();
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysDown.add(e.code);

      if (e.code === 'Space') {
        // Emergency Spin Kill / E-Brake
        setThrottle(0);
        setArmed(false);
      } else if (e.code === 'KeyR') {
        resetArena();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setOverdrive(true);
      } else if (e.code === 'KeyM') {
        toggleAudioMute();
      } else if (e.code === 'KeyF') {
        toggleFullscreen();
      } else if (e.code === 'Digit1') {
        setCurrentArena('nhrl-cage');
      } else if (e.code === 'Digit2') {
        setCurrentArena('battlebox');
      } else if (e.code === 'Digit3') {
        setCurrentArena('spin-chamber');
      }

      updateFromKeys();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setOverdrive(false);
      }
      updateFromKeys();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [audioMuted, gamepadConnected]);

  // Direct Arena Click-to-Aim / Touch Handlers
  const handleArenaPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    soundEngine.init();
    isArenaPointerDownRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleArenaPointerMove(e);
  };

  const handleArenaPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isArenaPointerDownRef.current) return;
    const canvas = arenaCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 600;
    const clickY = ((e.clientY - rect.top) / rect.height) * 600;
    arenaPointerTargetRef.current = { x: clickX, y: clickY };

    const bot = robotPosRef.current;
    const dx = clickX - bot.x;
    const dy = clickY - bot.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 15) {
      setTransVector({ x: dx / dist, y: dy / dist });
    } else {
      setTransVector({ x: 0, y: 0 });
    }
  };

  const handleArenaPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isArenaPointerDownRef.current = false;
    arenaPointerTargetRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!isDraggingRight.current && !gamepadConnected) {
      setTransVector({ x: 0, y: 0 });
    }
  };

  // Main 60FPS Physics, Audio, Gamepad, and Canvas Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let radarSweepAngle = 0;

    const runCombatLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // ----------------------------------------------------------------------
      // 0. GAMEPAD / RADIOMASTER USB CONTROLLER POLLING
      // ----------------------------------------------------------------------
      const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
      const gp = gamepads[0] || gamepads[1];
      if (gp && gp.connected) {
        const deadzone = 0.12;
        let gx = gp.axes[0] ?? 0;
        let gy = gp.axes[1] ?? 0;

        if (Math.hypot(gx, gy) < deadzone) {
          gx = 0;
          gy = 0;
        }

        // Stick deflection update
        if (Math.hypot(gx, gy) > 0) {
          const mag = Math.hypot(gx, gy);
          const normX = gx / (mag > 1 ? mag : 1);
          const normY = gy / (mag > 1 ? mag : 1);
          transVectorRef.current = { x: normX, y: normY };
          setTransVector({ x: normX, y: normY });
        }

        // Throttle control via Right Stick Y (Axis 3) or Triggers
        if (gp.axes[3] !== undefined && Math.abs(gp.axes[3]) > deadzone) {
          const rawThrot = Math.max(0, Math.min(1, (-gp.axes[3] + 1) / 2));
          throttleRef.current = rawThrot;
          setThrottle(rawThrot);
        } else if (gp.buttons[7] && gp.buttons[7].value > 0.05) {
          throttleRef.current = gp.buttons[7].value;
          setThrottle(gp.buttons[7].value);
        }

        // Overdrive via Bumpers (Button 4 / 5)
        const isBumperDown = (gp.buttons[4]?.pressed || gp.buttons[5]?.pressed) ?? false;
        if (isBumperDown !== overdriveRef.current) {
          setOverdrive(isBumperDown);
        }

        setGamepadAxes([gp.axes[0] || 0, gp.axes[1] || 0, gp.axes[2] || 0, gp.axes[3] || 0]);
      }

      // ----------------------------------------------------------------------
      // 1. MOTOR & SPIN KINEMATICS (Up to 4,000 RPM / 145 MPH Tip Speed)
      // ----------------------------------------------------------------------
      const maxTargetRpm = overdriveRef.current ? OVERDRIVE_MAX_RPM : NORMAL_MAX_RPM;
      const targetRpm = armedRef.current ? throttleRef.current * maxTargetRpm : 0;
      const spinTau = armedRef.current ? 1.0 : 2.2;
      rpmRef.current += (targetRpm - rpmRef.current) * (1 - Math.exp(-dt / spinTau));
      if (Math.abs(rpmRef.current - targetRpm) < 2) rpmRef.current = targetRpm;
      setCurrentRpm(Math.round(rpmRef.current));

      const bot = robotPosRef.current;
      const radPerSec = (rpmRef.current * 2 * Math.PI) / 60;
      bot.angle = (bot.angle + radPerSec * dt) % (2 * Math.PI);
      pllPhaseRef.current = (pllPhaseRef.current + radPerSec * dt) % (2 * Math.PI);

      // Sound Engine update
      soundEngine.updateMotor(rpmRef.current, armedRef.current, throttleRef.current);

      // Killsaw rotation for BattleBox
      hazardBladeAngleRef.current = (hazardBladeAngleRef.current + 25 * dt) % (2 * Math.PI);

      // ----------------------------------------------------------------------
      // 2. MELTYBRAIN TRANSLATIONAL DRIFT (Sinusoidal Modulation + PLL)
      // ----------------------------------------------------------------------
      const minSpinThreshold = 600;
      const spinFactor = Math.min(1, Math.max(0, (rpmRef.current - minSpinThreshold) / 1200));

      let moveX = transVectorRef.current.x;
      let moveY = transVectorRef.current.y;

      // Autonomous AI Auto-Ramming Intercept
      if (autoRamRef.current && armedRef.current && rpmRef.current > 1000) {
        const target = opponentsRef.current.find((o) => o.id === selectedOpponentRef.current && !o.destroyed) ||
                       opponentsRef.current.find((o) => !o.destroyed);
        if (target) {
          const dx = target.x - bot.x;
          const dy = target.y - bot.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 12) {
            const leadTime = dist / 240;
            const predX = target.x + target.vx * 60 * leadTime;
            const predY = target.y + target.vy * 60 * leadTime;
            const pdx = predX - bot.x;
            const pdy = predY - bot.y;
            const pdist = Math.hypot(pdx, pdy);
            moveX = pdx / (pdist || 1);
            moveY = pdy / (pdist || 1);
            transVectorRef.current = { x: moveX, y: moveY };
          }
        }
      }

      // Melty translation angle and sinusoidal motor bias with Phase Lead compensation
      const transMag = Math.hypot(moveX, moveY);
      const phaseLeadAngle = (32 * Math.PI) / 180; // ~32 deg brushless lead
      if (transMag > 0.05) {
        bot.headingAngle = Math.atan2(moveY, moveX);
        bot.motorBias = transMag * Math.sin(bot.angle - bot.headingAngle + phaseLeadAngle);
      } else {
        bot.motorBias = 0;
      }

      // Drive mode speed multipliers
      let maxSpeed = 230; // px/sec
      if (driveModeRef.current === 'Acro') {
        maxSpeed = 290;
      } else if (driveModeRef.current === 'Orbit-Lock') {
        maxSpeed = 180;
      }

      const targetVx = moveX * maxSpeed * spinFactor;
      const targetVy = moveY * maxSpeed * spinFactor;
      const tractionK = 9.0;
      bot.vx += (targetVx - bot.vx) * (1 - Math.exp(-tractionK * dt));
      bot.vy += (targetVy - bot.vy) * (1 - Math.exp(-tractionK * dt));
      bot.x += bot.vx * dt;
      bot.y += bot.vy * dt;

      // Tire scrub / Titanium Cleats audio & floor markings
      const lateralVel = Math.hypot(bot.vx, bot.vy);
      soundEngine.updateScrub(lateralVel, rpmRef.current);

      if (spinFactor > 0.35 && transMag > 0.35 && Math.random() < 0.16) {
        scuffsRef.current.push({
          x: bot.x + (Math.random() - 0.5) * 8,
          y: bot.y + (Math.random() - 0.5) * 8,
          radius: 3 + Math.random() * 4,
          alpha: 0.24,
          color: '#1e293b',
        });
        if (scuffsRef.current.length > 80) scuffsRef.current.shift();
      }

      // ----------------------------------------------------------------------
      // 3. MULTI-ARENA BOUNDARY & HAZARDS
      // ----------------------------------------------------------------------
      const arena = currentArenaRef.current;

      // Arena Perimeter Collision
      if (arena === 'battlebox') {
        // Rectangular BattleBox Wall Bounce (x: 75..525, y: 75..525)
        const minBound = 75 + EYELINER_RADIUS;
        const maxBound = 525 - EYELINER_RADIUS;

        if (bot.x < minBound) {
          bot.x = minBound;
          bot.vx = Math.abs(bot.vx) * 0.8;
          soundEngine.playImpact(0.8, true);
        } else if (bot.x > maxBound) {
          bot.x = maxBound;
          bot.vx = -Math.abs(bot.vx) * 0.8;
          soundEngine.playImpact(0.8, true);
        }
        if (bot.y < minBound) {
          bot.y = minBound;
          bot.vy = Math.abs(bot.vy) * 0.8;
          soundEngine.playImpact(0.8, true);
        } else if (bot.y > maxBound) {
          bot.y = maxBound;
          bot.vy = -Math.abs(bot.vy) * 0.8;
          soundEngine.playImpact(0.8, true);
        }

        // BattleBox 4x Spinning Killsaws Collision
        const saws = [
          { x: 200, y: 200 },
          { x: 400, y: 200 },
          { x: 200, y: 400 },
          { x: 400, y: 400 },
        ];
        saws.forEach((saw) => {
          const sdist = Math.hypot(bot.x - saw.x, bot.y - saw.y);
          const sawRadius = 24;
          if (sdist < sawRadius + EYELINER_RADIUS) {
            const snx = (bot.x - saw.x) / (sdist || 1);
            const sny = (bot.y - saw.y) / (sdist || 1);
            bot.vx += snx * 240;
            bot.vy += sny * 240;
            soundEngine.playSawImpact();

            for (let s = 0; s < 16; s++) {
              sparksRef.current.push({
                x: saw.x + snx * sawRadius,
                y: saw.y + sny * sawRadius,
                vx: snx * (100 + Math.random() * 200) + (Math.random() - 0.5) * 100,
                vy: sny * (100 + Math.random() * 200) + (Math.random() - 0.5) * 100,
                life: 0,
                maxLife: 0.3 + Math.random() * 0.3,
                color: '#ffaa00',
                size: 2 + Math.random() * 2,
              });
            }
            addFloatingText('KILLSAW!', bot.x, bot.y, '#ffaa00', 14);
          }

          opponentsRef.current.forEach((opp) => {
            if (opp.destroyed) return;
            const osdist = Math.hypot(opp.x - saw.x, opp.y - saw.y);
            if (osdist < sawRadius + opp.radius) {
              const osnx = (opp.x - saw.x) / (osdist || 1);
              const osny = (opp.y - saw.y) / (osdist || 1);
              opp.vx += osnx * 260;
              opp.vy += osny * 260;
              opp.health = Math.max(0, opp.health - 40);
              soundEngine.playSawImpact();
              if (opp.health === 0) {
                opp.destroyed = true;
                soundEngine.playDestruction();
                addFloatingText('SAW ELIMINATION!', opp.x, opp.y, '#ff2a55', 18);
              } else {
                addFloatingText('-40 SAW DMG', opp.x, opp.y, '#ffaa00', 14);
              }
            }
          });
        });

      } else {
        // Circular Arena Perimeter (NHRL Steel Cage / Spin Test Chamber)
        const distFromCenter = Math.hypot(bot.x - ARENA_CENTER.x, bot.y - ARENA_CENTER.y);
        if (distFromCenter > ARENA_RADIUS - EYELINER_RADIUS) {
          const nx = (bot.x - ARENA_CENTER.x) / distFromCenter;
          const ny = (bot.y - ARENA_CENTER.y) / distFromCenter;
          bot.x = ARENA_CENTER.x + nx * (ARENA_RADIUS - EYELINER_RADIUS);
          bot.y = ARENA_CENTER.y + ny * (ARENA_RADIUS - EYELINER_RADIUS);

          const dot = bot.vx * nx + bot.vy * ny;
          if (dot > 0) {
            bot.vx -= 1.6 * dot * nx;
            bot.vy -= 1.6 * dot * ny;

            const wallImpactSpd = Math.abs(dot);
            if (wallImpactSpd > 25 || rpmRef.current > 800) {
              soundEngine.playImpact(Math.min(1.5, wallImpactSpd / 100 + (rpmRef.current / 3500)), true);

              const sparkCount = Math.min(24, Math.round(8 + (rpmRef.current / 3500) * 16));
              for (let i = 0; i < sparkCount; i++) {
                sparksRef.current.push({
                  x: bot.x,
                  y: bot.y,
                  vx: -nx * (80 + Math.random() * 160) + (Math.random() - 0.5) * 90,
                  vy: -ny * (80 + Math.random() * 160) + (Math.random() - 0.5) * 90,
                  life: 0,
                  maxLife: 0.2 + Math.random() * 0.35,
                  color: Math.random() > 0.3 ? '#00f0ff' : '#ffaa00',
                  size: 1.5 + Math.random() * 1.5,
                });
              }
            }
          }
        }

        // NHRL Steel Cage: Corner Pit Hazard at (470, 470)
        if (arena === 'nhrl-cage') {
          const pitX = 470;
          const pitY = 470;
          const pitRadius = 46;

          const pdist = Math.hypot(bot.x - pitX, bot.y - pitY);
          if (pdist < pitRadius + EYELINER_RADIUS) {
            const pnx = (pitX - bot.x) / (pdist || 1);
            const pny = (pitY - bot.y) / (pdist || 1);
            bot.vx += pnx * 140 * dt;
            bot.vy += pny * 140 * dt;
            soundEngine.playPitAlarm();

            if (pdist < pitRadius * 0.65) {
              addFloatingText('PIT HAZARD!', bot.x, bot.y, '#ff2a55', 14);
              setThrottle(0);
            }
          }

          opponentsRef.current.forEach((opp) => {
            if (opp.destroyed) return;
            const odist = Math.hypot(opp.x - pitX, opp.y - pitY);
            if (odist < pitRadius + opp.radius) {
              const onx = (pitX - opp.x) / (odist || 1);
              const ony = (pitY - opp.y) / (odist || 1);
              opp.vx += onx * 160 * dt;
              opp.vy += ony * 160 * dt;

              if (odist < pitRadius * 0.65) {
                opp.health = 0;
                opp.destroyed = true;
                soundEngine.playDestruction();
                addFloatingText('PIT ELIMINATION!', opp.x, opp.y, '#ff2a55', 18);
              }
            }
          });
        }
      }

      // ----------------------------------------------------------------------
      // 4. OPPONENT BOT BEHAVIORS & COMBAT DYNAMICS
      // ----------------------------------------------------------------------
      opponentsRef.current.forEach((opp) => {
        if (opp.destroyed) return;

        // Weapon rotation
        if (opp.weaponSpeed > 0) {
          opp.weaponAngle = (opp.weaponAngle + opp.weaponSpeed * dt) % (2 * Math.PI);
        }

        // AI Logic
        if (opp.aiState !== 'stationary') {
          opp.aiTimer -= dt;
          const dxToBot = bot.x - opp.x;
          const dyToBot = bot.y - opp.y;
          const distToBot = Math.hypot(dxToBot, dyToBot);
          const dirToBotX = dxToBot / (distToBot || 1);
          const dirToBotY = dyToBot / (distToBot || 1);

          if (opp.aiTimer <= 0) {
            opp.aiTimer = 1.0 + Math.random() * 1.5;
            if (opp.id === 'tombstone') {
              opp.aiState = opp.health < 40 && Math.random() < 0.4 ? 'recover' : 'charge';
            } else if (opp.id === 'wedge') {
              opp.aiState = 'charge';
            } else if (opp.id === 'drum') {
              if (rpmRef.current > 3200 && distToBot < 120) {
                opp.aiState = 'evade';
              } else if (distToBot > 180) {
                opp.aiState = 'flank';
              } else {
                opp.aiState = 'charge';
              }
            }
          }

          let targetOppVx = 0;
          let targetOppVy = 0;
          let oppSpeed = 85;

          if (opp.id === 'wedge') oppSpeed = 130;
          if (opp.id === 'drum') oppSpeed = 150;

          if (opp.aiState === 'charge') {
            targetOppVx = dirToBotX * oppSpeed;
            targetOppVy = dirToBotY * oppSpeed;
          } else if (opp.aiState === 'flank') {
            const perpX = -dirToBotY;
            const perpY = dirToBotX;
            targetOppVx = (perpX * 0.8 + dirToBotX * 0.3) * oppSpeed;
            targetOppVy = (perpY * 0.8 + dirToBotY * 0.3) * oppSpeed;
          } else if (opp.aiState === 'evade' || opp.aiState === 'recover') {
            targetOppVx = -dirToBotX * oppSpeed * 0.9;
            targetOppVy = -dirToBotY * oppSpeed * 0.9;
          } else {
            targetOppVx = opp.vx;
            targetOppVy = opp.vy;
          }

          const oppAccel = 4.0;
          opp.vx += (targetOppVx - opp.vx) * (1 - Math.exp(-oppAccel * dt));
          opp.vy += (targetOppVy - opp.vy) * (1 - Math.exp(-oppAccel * dt));
          opp.x += opp.vx * dt;
          opp.y += opp.vy * dt;

          // Opponent arena perimeter collision
          const oppDist = Math.hypot(opp.x - ARENA_CENTER.x, opp.y - ARENA_CENTER.y);
          if (oppDist > ARENA_RADIUS - opp.radius) {
            const onx = (opp.x - ARENA_CENTER.x) / oppDist;
            const ony = (opp.y - ARENA_CENTER.y) / oppDist;
            opp.x = ARENA_CENTER.x + onx * (ARENA_RADIUS - opp.radius);
            opp.y = ARENA_CENTER.y + ony * (ARENA_RADIUS - opp.radius);
            opp.vx = -onx * Math.abs(opp.vx) * 1.1 + (Math.random() - 0.5) * 20;
            opp.vy = -ony * Math.abs(opp.vy) * 1.1 + (Math.random() - 0.5) * 20;
          }
        }

        // --------------------------------------------------------------------
        // COLLISION WITH EYELINER 3LB MELTYBRAIN
        // --------------------------------------------------------------------
        const cdx = opp.x - bot.x;
        const cdy = opp.y - bot.y;
        const cdist = Math.hypot(cdx, cdy);
        const minDist = opp.radius + EYELINER_RADIUS;

        if (cdist < minDist) {
          const overlap = minDist - cdist;
          const nx = cdx / (cdist || 1);
          const ny = cdy / (cdist || 1);

          opp.x += nx * overlap;
          opp.y += ny * overlap;

          // Rotational Kinetic Energy: E = 1/2 * I * omega^2
          const spinRatio = rpmRef.current / NORMAL_MAX_RPM;
          const joules = 0.5 * BOT_MOMENT_OF_INERTIA * Math.pow(radPerSec, 2);
          const impactForce = 130 + spinRatio * 560;

          const botMass = 3.0;
          const oppMass = opp.massLb;
          const totalMass = botMass + oppMass;

          if (opp.aiState !== 'stationary') {
            opp.vx = nx * (impactForce * (botMass / totalMass) * 0.085);
            opp.vy = ny * (impactForce * (botMass / totalMass) * 0.085);
            bot.vx -= nx * (impactForce * (oppMass / totalMass) * 0.035);
            bot.vy -= ny * (impactForce * (oppMass / totalMass) * 0.035);
          } else {
            // Stationary telemetry dummy absorbs impact with spring restitution
            bot.vx -= nx * (impactForce * 0.06);
            bot.vy -= ny * (impactForce * 0.06);
          }

          // Damage calculation with armor mitigation
          let baseDamage = Math.round(18 + spinRatio * 55 + (joules / 160) * 25);
          let isCritical = false;

          // Wedge-Hound front angle deflection
          if (opp.id === 'wedge') {
            const oppHeading = Math.atan2(opp.vy, opp.vx);
            const impactAngle = Math.atan2(-ny, -nx);
            const angleDiff = Math.abs(oppHeading - impactAngle);
            if (angleDiff < 0.8) {
              baseDamage = Math.round(baseDamage * 0.55);
              addFloatingText('DEFLECTED!', opp.x, opp.y, '#ffd166', 11);
            }
          }

          if (spinRatio > 0.85 && Math.random() < 0.4) {
            baseDamage = Math.round(baseDamage * 1.5);
            isCritical = true;
          }

          // Telemetry Dummy tooth bite recording
          if (opp.aiState === 'stationary') {
            const biteDepthMm = Number(((spinRatio * 6.5) + (Math.random() * 1.2)).toFixed(1));
            const biteForceN = Math.round(joules * 48);
            opp.biteTelemetryMm = biteDepthMm;
            opp.lastBiteForceN = biteForceN;
            addFloatingText(`BITE: ${biteDepthMm}mm (${biteForceN}N)`, opp.x, opp.y - 12, '#34d399', 12);
          }

          opp.health = Math.max(0, opp.health - baseDamage);
          if (opp.health === 0) {
            opp.destroyed = true;
            soundEngine.playDestruction();
            addFloatingText('TERMINATED!', opp.x, opp.y, '#ff2a55', 18);
          } else {
            addFloatingText(
              isCritical ? `-${baseDamage} CRIT!` : `-${baseDamage}`,
              opp.x,
              opp.y,
              isCritical ? '#ff0055' : '#00f0ff',
              isCritical ? 16 : 13
            );
          }

          // Accelerometer Shock G Spike (ST H3LIS331DLTR simulation)
          const baseG = (Math.pow(radPerSec, 2) * SENSOR_RADIUS_M) / GRAVITY_MSS;
          const shockG = Math.round(baseG + 80 + spinRatio * 280 + Math.random() * 40);
          const cappedG = Math.min(400, shockG);
          setImpactG(cappedG);
          setPeakG((prev) => Math.max(prev, cappedG));
          setTotalHits((h) => h + 1);

          // Auto-trigger instant slow-motion replay popup on massive impacts (>150G)
          if (cappedG > 150 && autoKillcamRef.current && !killcamActiveRef.current) {
            const nowMs = performance.now();
            if (nowMs - lastKillcamTriggerRef.current > 4000) {
              lastKillcamTriggerRef.current = nowMs;
              pendingKillcamRef.current = {
                delayFrames: 24,
                impactG: cappedG,
                oppName: opp.name,
              };
            }
          }

          // Hit Combo System
          comboTimerRef.current = 3.5;
          setHitCombo((c) => {
            const next = c + 1;
            const mult = Math.min(4, 1 + Math.floor(next / 2));
            setComboMultiplier(mult);
            if (next > 1) {
              addFloatingText(`x${next} COMBO (${mult}x)`, bot.x, bot.y - 25, '#ffaa00', 14);
            }
            return next;
          });

          // Impact Sound
          soundEngine.playImpact(impactForce / 300, false);

          // High-Velocity Sparks & Hot Metal Shards
          const sparkCount = Math.min(36, Math.round(14 + spinRatio * 22));
          for (let s = 0; s < sparkCount; s++) {
            const sAngle = Math.atan2(ny, nx) + (Math.random() - 0.5) * 1.5;
            const sSpd = 90 + Math.random() * 260;
            sparksRef.current.push({
              x: bot.x + nx * EYELINER_RADIUS,
              y: bot.y + ny * EYELINER_RADIUS,
              vx: Math.cos(sAngle) * sSpd,
              vy: Math.sin(sAngle) * sSpd,
              life: 0,
              maxLife: 0.25 + Math.random() * 0.45,
              color: Math.random() > 0.5 ? '#ffffff' : Math.random() > 0.3 ? '#ffaa00' : '#ff2a55',
              size: 1.8 + Math.random() * 1.8,
            });
          }

          // Flying Metal Debris
          for (let d = 0; d < 4; d++) {
            debrisRef.current.push({
              x: opp.x,
              y: opp.y,
              vx: (Math.random() - 0.5) * 180 + nx * 60,
              vy: (Math.random() - 0.5) * 180 + ny * 60,
              angle: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 20,
              life: 0,
              maxLife: 0.6 + Math.random() * 0.5,
              size: 2.5 + Math.random() * 3.5,
              color: opp.color,
            });
          }
        }
      });

      // Update Combo Timer
      if (comboTimerRef.current > 0) {
        comboTimerRef.current -= dt;
        if (comboTimerRef.current <= 0) {
          setHitCombo(0);
          setComboMultiplier(1);
        }
      }

      // Update Sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vx *= 0.94;
        sp.vy *= 0.94;
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sparksRef.current.splice(i, 1);
        }
      }

      // Update Metal Debris
      for (let i = debrisRef.current.length - 1; i >= 0; i--) {
        const deb = debrisRef.current[i];
        deb.x += deb.vx * dt;
        deb.y += deb.vy * dt;
        deb.angle += deb.vRot * dt;
        deb.vx *= 0.92;
        deb.vy *= 0.92;
        deb.life += dt;
        if (deb.life >= deb.maxLife) {
          debrisRef.current.splice(i, 1);
        }
      }

      // Update Floating Combat Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 35 * dt;
        ft.life += dt;
        if (ft.life >= ft.maxLife) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      // ----------------------------------------------------------------------
      // 5. DUAL ACCELEROMETER OSCILLOSCOPE TELEMETRY
      // ----------------------------------------------------------------------
      const centripetalGs = (radPerSec * radPerSec * SENSOR_RADIUS_M) / GRAVITY_MSS;
      const jitter1 = (Math.random() - 0.5) * (centripetalGs * 0.035);
      const jitter2 = (Math.random() - 0.5) * (centripetalGs * 0.035);
      const s1 = Math.min(400, centripetalGs + jitter1);
      const s2 = Math.min(400, centripetalGs * 0.985 + jitter2);

      accelHistoryRef.current.push({
        s1,
        s2,
        rpm: rpmRef.current,
      });
      if (accelHistoryRef.current.length > 200) {
        accelHistoryRef.current.shift();
      }

      // Process pending killcam triggers
      if (pendingKillcamRef.current) {
        pendingKillcamRef.current.delayFrames -= 1;
        if (pendingKillcamRef.current.delayFrames <= 0) {
          const { impactG: trigG, oppName } = pendingKillcamRef.current;
          pendingKillcamRef.current = null;
          triggerKillcam(trigG, oppName);
        }
      }

      // Record 60 FPS state snapshot into rolling replay buffer (last 3 seconds = 180 frames)
      replayBufferRef.current.push({
        time: now,
        bot: {
          x: bot.x,
          y: bot.y,
          angle: bot.angle,
          headingAngle: bot.headingAngle,
          vx: bot.vx,
          vy: bot.vy,
          motorBias: bot.motorBias,
        },
        opponents: opponentsRef.current.map((o) => ({
          id: o.id,
          name: o.name,
          type: o.type,
          x: o.x,
          y: o.y,
          vx: o.vx,
          vy: o.vy,
          radius: o.radius,
          color: o.color,
          health: o.health,
          maxHealth: o.maxHealth,
          destroyed: o.destroyed,
          weaponAngle: o.weaponAngle,
        })),
        sparks: sparksRef.current.map((s) => ({ ...s })),
        debris: debrisRef.current.map((d) => ({ ...d })),
        scuffs: scuffsRef.current.slice(-25),
        rpm: rpmRef.current,
        impactG: impactG,
        arenaId: currentArenaRef.current,
      });
      if (replayBufferRef.current.length > 180) {
        replayBufferRef.current.shift();
      }

      // Update live recording duration timer
      if (isRecordingRef.current && recordStartTimeRef.current > 0) {
        setRecordDuration((performance.now() - recordStartTimeRef.current) / 1000);
      }

      // ----------------------------------------------------------------------
      // SMOOTH CINEMATIC CAMERA TRACKING
      // ----------------------------------------------------------------------
      const mode = cameraModeRef.current;
      let targetCamX = 300;
      let targetCamY = 300;
      let targetZoom = 1.0;

      if (mode === 'Tactical Top-Down') {
        targetCamX = 300;
        targetCamY = 300;
        targetZoom = 1.0;
      } else if (mode === 'Dynamic Follow Bot') {
        targetCamX = bot.x;
        targetCamY = bot.y;
        targetZoom = 1.45;
      } else if (mode === 'Clash Zoom') {
        let nearestDist = 9999;
        let nearestOpp: Opponent | null = null;
        for (const opp of opponentsRef.current) {
          if (!opp.destroyed) {
            const d = Math.hypot(opp.x - bot.x, opp.y - bot.y);
            if (d < nearestDist) {
              nearestDist = d;
              nearestOpp = opp;
            }
          }
        }
        if (nearestOpp) {
          targetCamX = (bot.x + nearestOpp.x) / 2;
          targetCamY = (bot.y + nearestOpp.y) / 2;
          const prox = Math.max(0, Math.min(1, (270 - nearestDist) / 200));
          targetZoom = 1.15 + prox * 0.75;
        } else {
          targetCamX = bot.x;
          targetCamY = bot.y;
          targetZoom = 1.3;
        }
      }

      const cam = cameraStateRef.current;
      cam.x += (targetCamX - cam.x) * 0.08;
      cam.y += (targetCamY - cam.y) * 0.08;
      cam.zoom += (targetZoom - cam.zoom) * 0.08;

      // ----------------------------------------------------------------------
      // 6. RENDER ALL CANVASES (RETINA / HIGH-DPI CRISP)
      // ----------------------------------------------------------------------
      drawArenaCanvas();
      drawRadarCanvas(radarSweepAngle);
      drawAccelCanvas();

      radarSweepAngle = (radarSweepAngle + 4.8 * dt) % (2 * Math.PI);
      animId = requestAnimationFrame(runCombatLoop);
    };

    animId = requestAnimationFrame(runCombatLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // ==========================================================================
  // DRAW ARENA CANVAS (60 FPS, MULTI-ARENA RETINA RENDERING)
  // ==========================================================================
  const drawArenaCanvas = useCallback(() => {
    const canvas = arenaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== 600 * dpr || canvas.height !== 600 * dpr) {
      canvas.width = 600 * dpr;
      canvas.height = 600 * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 600, 600);

    const arena = currentArenaRef.current;

    // ------------------------------------------------------------------------
    // 1. ARENA FLOOR RENDERING
    // ------------------------------------------------------------------------
    if (arena === 'nhrl-cage') {
      // 10-GAUGE STEEL CAGE ARENA
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, 600, 600);

      // Welded steel floor circle
      ctx.beginPath();
      ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#111827';
      ctx.fill();

      // Steel plate weld seams
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1.5;
      for (let x = 80; x <= 520; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x, 560);
        ctx.stroke();
      }
      for (let y = 80; y <= 520; y += 60) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(560, y);
        ctx.stroke();
      }

      // Outer Cage Border
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffaa00';
      ctx.stroke();

      // Yellow/Black Diagonal Hazard Ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS - 10, 0, 2 * Math.PI);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
      ctx.setLineDash([14, 14]);
      ctx.stroke();
      ctx.restore();

      // Push-out Boundary Zone (Top Left)
      ctx.save();
      ctx.beginPath();
      ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS - 4, Math.PI, 1.5 * Math.PI);
      ctx.strokeStyle = '#ff2a55';
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 42, 85, 0.8)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PUSH-OUT ZONE', 130, 140);
      ctx.restore();

      // Active Corner Pit Hazard (Bottom Right: 470, 470)
      const pitX = 470;
      const pitY = 470;
      const pitRadius = 46;

      ctx.save();
      // Hazard crosshatch apron
      ctx.beginPath();
      ctx.arc(pitX, pitY, pitRadius + 14, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 42, 85, 0.15)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke();

      // Abyss hole
      ctx.beginPath();
      ctx.arc(pitX, pitY, pitRadius, 0, 2 * Math.PI);
      const pitGrad = ctx.createRadialGradient(pitX, pitY, 2, pitX, pitY, pitRadius);
      pitGrad.addColorStop(0, '#000000');
      pitGrad.addColorStop(0.7, '#070a12');
      pitGrad.addColorStop(1, '#ff2a55');
      ctx.fillStyle = pitGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ff2a55';
      ctx.stroke();

      // Pulsing Pit Warning Beacon
      ctx.fillStyle = '#ff2a55';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ PIT', pitX, pitY + 4);
      ctx.restore();

    } else if (arena === 'battlebox') {
      // BATTLEBOX PROVING GROUND
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, 600, 600);

      // Rectangular Steel Floor (75, 75 to 525, 525) with Chamfered Corners
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(110, 75);
      ctx.lineTo(490, 75);
      ctx.lineTo(525, 110);
      ctx.lineTo(525, 490);
      ctx.lineTo(490, 525);
      ctx.lineTo(110, 525);
      ctx.lineTo(75, 490);
      ctx.lineTo(75, 110);
      ctx.closePath();
      ctx.fillStyle = '#0c1322';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#00f0ff';
      ctx.stroke();

      // Clear Polycarbonate Wall Visual
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.strokeRect(60, 60, 480, 480);

      // Floor Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 110; x <= 490; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 75);
        ctx.lineTo(x, 525);
        ctx.stroke();
      }
      for (let y = 110; y <= 490; y += 40) {
        ctx.beginPath();
        ctx.moveTo(75, y);
        ctx.lineTo(525, y);
        ctx.stroke();
      }

      // BattleBox Center Emblem
      ctx.beginPath();
      ctx.arc(300, 300, 75, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BATTLEBOX', 300, 304);

      // 4 Active Spinning Floor Killsaws / Hazard Blades
      const saws = [
        { x: 200, y: 200 },
        { x: 400, y: 200 },
        { x: 200, y: 400 },
        { x: 400, y: 400 },
      ];
      const bladeRot = hazardBladeAngleRef.current;
      saws.forEach((saw) => {
        // Warning zone
        ctx.beginPath();
        ctx.arc(saw.x, saw.y, 34, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rotating saw blade
        ctx.save();
        ctx.translate(saw.x, saw.y);
        ctx.rotate(bladeRot);
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const rOuter = 24;
          const rInner = 14;
          ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
          ctx.lineTo(Math.cos(a + 0.2) * rInner, Math.sin(a + 0.2) * rInner);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center hub
        ctx.fillStyle = '#ff2a55';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();

    } else {
      // SPIN TEST CHAMBER
      ctx.fillStyle = '#060d0b';
      ctx.fillRect(0, 0, 600, 600);

      // Heavy Kevlar bunker circular chamber
      ctx.beginPath();
      ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ARENA_RADIUS, 0, 2 * Math.PI);
      ctx.fillStyle = '#0b1612';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#00ff88';
      ctx.stroke();

      // Velocity Ring Markings (1,000 RPM, 2,000 RPM, 3,000 RPM, 4,000 RPM / 145 MPH)
      const rings = [
        { r: 80, label: '1,000 RPM' },
        { r: 140, label: '2,000 RPM' },
        { r: 200, label: '3,000 RPM' },
        { r: 250, label: '4,000 RPM // 145 MPH' },
      ];
      rings.forEach((ring) => {
        ctx.beginPath();
        ctx.arc(ARENA_CENTER.x, ARENA_CENTER.y, ring.r, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(0, 255, 136, 0.55)';
        ctx.font = '8px monospace';
        ctx.fillText(ring.label, ARENA_CENTER.x + ring.r - 28, ARENA_CENTER.y - 4);
      });

      // Blast Shield Radial Warning Chevrons
      for (let a = 0; a < 2 * Math.PI; a += Math.PI / 4) {
        ctx.save();
        ctx.translate(ARENA_CENTER.x, ARENA_CENTER.y);
        ctx.rotate(a);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(250, 0);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Arena Floor Tire Scuffs
    scuffsRef.current.forEach((scuff) => {
      ctx.fillStyle = scuff.color;
      ctx.globalAlpha = scuff.alpha;
      ctx.beginPath();
      ctx.arc(scuff.x, scuff.y, scuff.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Direct Click-to-Aim / Pointer Reticle
    const pointerTarget = arenaPointerTargetRef.current;
    const bot = robotPosRef.current;
    if (pointerTarget && isArenaPointerDownRef.current) {
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(bot.x, bot.y);
      ctx.lineTo(pointerTarget.x, pointerTarget.y);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(pointerTarget.x, pointerTarget.y);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.lineTo(-10, 0);
      ctx.moveTo(10, 0); ctx.lineTo(18, 0);
      ctx.moveTo(0, -18); ctx.lineTo(0, -10);
      ctx.moveTo(0, 10); ctx.lineTo(0, 18);
      ctx.stroke();

      const distPx = Math.hypot(pointerTarget.x - bot.x, pointerTarget.y - bot.y);
      const distM = (distPx * 0.005).toFixed(2);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '10px monospace';
      ctx.fillText(`${distM}m`, 18, -8);
      ctx.restore();
    }

    // Render Metal Debris Shards
    debrisRef.current.forEach((deb) => {
      ctx.save();
      ctx.translate(deb.x, deb.y);
      ctx.rotate(deb.angle);
      ctx.fillStyle = deb.color;
      ctx.globalAlpha = 1 - deb.life / deb.maxLife;
      ctx.fillRect(-deb.size / 2, -deb.size / 2, deb.size, deb.size);
      ctx.restore();
    });
    ctx.globalAlpha = 1.0;

    // Render Kinetic Sparks
    sparksRef.current.forEach((sp) => {
      const alpha = 1 - sp.life / sp.maxLife;
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Render Opponents / Telemetry Dummies
    opponentsRef.current.forEach((opp) => {
      ctx.save();
      ctx.translate(opp.x, opp.y);

      if (opp.destroyed) {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, opp.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ff2a55';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WRECK', 0, 4);
      } else {
        ctx.fillStyle = opp.color;
        ctx.beginPath();
        ctx.arc(0, 0, opp.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        if (opp.aiState === 'stationary') {
          // Stationary Telemetry Target Dummy
          ctx.strokeStyle = '#34d399';
          ctx.lineWidth = 2;
          ctx.strokeRect(-16, -16, 32, 32);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('DUMMY', 0, 3);
          if (opp.biteTelemetryMm !== undefined && opp.biteTelemetryMm > 0) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(`${opp.biteTelemetryMm}mm BITE`, 0, 14);
          }
        } else if (opp.id === 'tombstone') {
          // Horizontal Spinning S7 Tool Steel Bar
          ctx.save();
          ctx.rotate(opp.weaponAngle);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(-opp.radius - 8, -4, (opp.radius + 8) * 2, 8);
          ctx.strokeStyle = '#ff2a55';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-opp.radius - 8, -4, (opp.radius + 8) * 2, 8);
          ctx.restore();
        } else if (opp.id === 'wedge') {
          // Titanium Angled Wedge Front Armor
          const wedgeAngle = Math.atan2(opp.vy, opp.vx);
          ctx.save();
          ctx.rotate(wedgeAngle);
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.moveTo(opp.radius + 6, 0);
          ctx.lineTo(opp.radius - 4, -opp.radius);
          ctx.lineTo(opp.radius - 12, -opp.radius);
          ctx.lineTo(opp.radius - 2, 0);
          ctx.lineTo(opp.radius - 12, opp.radius);
          ctx.lineTo(opp.radius - 4, opp.radius);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        } else if (opp.id === 'drum') {
          // Vertical Eggbeater Drum
          const drumAngle = Math.atan2(opp.vy, opp.vx);
          ctx.save();
          ctx.rotate(drumAngle);
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(opp.radius - 8, -12, 12, 24);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(opp.radius - 8, -12, 12, 24);
          ctx.restore();
        }

        // Target Lock Reticle if Selected
        if (opp.id === selectedOpponentRef.current) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.strokeRect(-opp.radius - 8, -opp.radius - 8, (opp.radius + 8) * 2, (opp.radius + 8) * 2);
          ctx.setLineDash([]);
        }

        // Health Bar & Nameplate
        const barWidth = 48;
        const barHeight = 6;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(-barWidth / 2, -opp.radius - 18, barWidth, barHeight);

        const healthRatio = opp.health / opp.maxHealth;
        ctx.fillStyle = healthRatio > 0.5 ? '#00ff88' : healthRatio > 0.25 ? '#ffaa00' : '#ff2a55';
        ctx.fillRect(-barWidth / 2 + 1, -opp.radius - 17, (barWidth - 2) * healthRatio, barHeight - 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(opp.name, 0, -opp.radius - 22);
      }
      ctx.restore();
    });

    // ------------------------------------------------------------------------
    // RENDER EYELINER 3LB MELTYBRAIN ROBOT
    // ------------------------------------------------------------------------
    ctx.save();
    ctx.translate(bot.x, bot.y);

    // Stroboscopic Persistence-Of-Vision (POV) Virtual LED Heading Beacons
    if (rpmRef.current > 300 && armedRef.current) {
      const heading = bot.headingAngle;

      // 1. FRONT POV BEACON (GREEN)
      const frontDist = 200;
      const frontSpread = 0.26;
      const frontGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, frontDist);
      frontGrad.addColorStop(0, 'rgba(0, 255, 136, 0.85)');
      frontGrad.addColorStop(0.35, 'rgba(0, 255, 136, 0.45)');
      frontGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');

      ctx.fillStyle = frontGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, frontDist, heading - frontSpread, heading + frontSpread);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(heading) * frontDist, Math.sin(heading) * frontDist);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. REAR POV BEACON (RED)
      const rearHeading = heading + Math.PI;
      const rearDist = 120;
      const rearSpread = 0.22;
      const rearGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, rearDist);
      rearGrad.addColorStop(0, 'rgba(255, 42, 85, 0.7)');
      rearGrad.addColorStop(0.4, 'rgba(255, 42, 85, 0.3)');
      rearGrad.addColorStop(1, 'rgba(255, 42, 85, 0)');

      ctx.fillStyle = rearGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rearDist, rearHeading - rearSpread, rearHeading + rearSpread);
      ctx.closePath();
      ctx.fill();
    }

    // Auto-Ram Autonomous Intercept Guideline
    if (autoRamRef.current && armedRef.current) {
      const target = opponentsRef.current.find((o) => o.id === selectedOpponentRef.current && !o.destroyed);
      if (target) {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(target.x - bot.x, target.y - bot.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Rotating Robot Chassis (spinning up to 4,000 RPM)
    ctx.rotate(bot.angle);

    // TPU 95A HF Core Base Disc
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, EYELINER_RADIUS, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = armedRef.current ? (overdriveRef.current ? '#ff2a55' : '#00f0ff') : '#64748b';
    ctx.stroke();

    // Aluminum / Carbon Clamping Ring
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, 2 * Math.PI);
    ctx.fill();

    // Dual PropDrive Wheel Hubs
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -18, 12, 6);
    ctx.fillRect(-6, 12, 12, 6);

    // AR500 Hardened Kinetic Impact Teeth (Symmetric Pair)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(17, -6);
    ctx.lineTo(29, 0);
    ctx.lineTo(17, 6);
    ctx.moveTo(-17, 6);
    ctx.lineTo(-29, 0);
    ctx.lineTo(-17, -6);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = overdriveRef.current ? '#ff2a55' : '#ffaa00';
    ctx.stroke();

    // Optical LED Diode physical strobe flash on rotating puck
    const angleDiffFront = Math.abs(((bot.angle - bot.headingAngle + Math.PI) % (2 * Math.PI)) - Math.PI);
    const angleDiffRear = Math.abs(((bot.angle - (bot.headingAngle + Math.PI) + Math.PI) % (2 * Math.PI)) - Math.PI);
    const isFlashingFront = angleDiffFront < 0.28;
    const isFlashingRear = angleDiffRear < 0.28;

    ctx.fillStyle = isFlashingFront ? '#ffffff' : '#00ff88';
    ctx.beginPath();
    ctx.arc(12, 0, isFlashingFront ? 4.5 : 2.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = isFlashingRear ? '#ffffff' : '#ff2a55';
    ctx.beginPath();
    ctx.arc(-12, 0, isFlashingRear ? 4.5 : 2.5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();

    // Render Floating Combat Text
    floatingTextsRef.current.forEach((ft) => {
      ctx.save();
      const alpha = 1 - ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }, []);

  // ==========================================================================
  // DRAW 360° MICRO-LIDAR RADAR PPI CANVAS (HIGH-DPI)
  // ==========================================================================
  const drawRadarCanvas = useCallback((sweepAngle: number) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== 160 * dpr || canvas.height !== 160 * dpr) {
      canvas.width = 160 * dpr;
      canvas.height = 160 * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 160, 160);

    const cx = 80;
    const cy = 80;
    const r = 72;

    ctx.fillStyle = '#040810';
    ctx.fillRect(0, 0, 160, 160);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * ratio, 0, 2 * Math.PI);
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 240, 255, 0.55)';
    ctx.font = '8px monospace';
    ctx.fillText('1m', cx + 3, cy - r * 0.33 + 8);
    ctx.fillText('2m', cx + 3, cy - r * 0.66 + 8);
    ctx.fillText('3m', cx + 3, cy - r + 8);

    const bot = robotPosRef.current;
    opponentsRef.current.forEach((opp) => {
      if (opp.destroyed) return;
      const dx = opp.x - bot.x;
      const dy = opp.y - bot.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      const radarDist = (dist / 520) * r * 2;
      if (radarDist <= r) {
        const rx = cx + Math.cos(angle) * radarDist;
        const ry = cy + Math.sin(angle) * radarDist;

        ctx.fillStyle = opp.id === selectedOpponentRef.current ? '#00f0ff' : opp.color;
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '7px monospace';
        ctx.fillText(opp.name.split(' ')[0], rx + 6, ry - 2);

        if (opp.id === selectedOpponentRef.current) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(rx - 6, ry - 6, 12, 12);
        }
      }
    });

    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.04)');

    ctx.save();
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sweepAngle - 0.45, sweepAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, []);

  // ==========================================================================
  // DRAW DUAL ACCELEROMETER OSCILLOSCOPE WAVEFORM (±400G, RETINA)
  // ==========================================================================
  const drawAccelCanvas = useCallback(() => {
    const canvas = accelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== 500 * dpr || canvas.height !== 110 * dpr) {
      canvas.width = 500 * dpr;
      canvas.height = 110 * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 500, 110);

    const w = 500;
    const h = 110;

    ctx.fillStyle = '#04070e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const history = accelHistoryRef.current;
    if (history.length < 2) {
      ctx.restore();
      return;
    }

    const zeroY = h - 18;
    const maxGScale = 400;

    // Channel 1: Sensor 1 Front (Cyan)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = zeroY - (pt.s1 / maxGScale) * (h - 32);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Channel 2: Sensor 2 Rear (Amber)
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = zeroY - (pt.s2 / maxGScale) * (h - 32);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // ±400G Saturation Threshold Line
    ctx.strokeStyle = 'rgba(255, 42, 85, 0.65)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY - (400 / maxGScale) * (h - 32));
    ctx.lineTo(w, zeroY - (400 / maxGScale) * (h - 32));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff2a55';
    ctx.font = '9px monospace';
    ctx.fillText('±400G SATURATION LIMIT', 8, 14);

    ctx.restore();
  }, []);

  // Pointer Event Handlers for Right Gimbal
  const handleStickPointerDown = (e: React.PointerEvent) => {
    soundEngine.init();
    isDraggingRight.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleStickMove(e);
  };

  const handleStickMove = (e: React.PointerEvent) => {
    if (!isDraggingRight.current || !rightStickRef.current) return;
    const rect = rightStickRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2 - 12;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    let normX = dx / maxRadius;
    let normY = dy / maxRadius;

    if (dist > maxRadius) {
      normX = dx / dist;
      normY = dy / dist;
    }

    setTransVector({ x: normX, y: normY });
  };

  const handleStickPointerUp = (e: React.PointerEvent) => {
    isDraggingRight.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (!isArenaPointerDownRef.current && !gamepadConnected) {
      setTransVector({ x: 0, y: 0 });
    }
  };

  // Kinetic Calculations
  const omegaRadS = (currentRpm * 2 * Math.PI) / 60;
  const currentGs = ((Math.pow(omegaRadS, 2) * SENSOR_RADIUS_M) / GRAVITY_MSS).toFixed(1);
  const kineticJoules = Math.round(0.5 * BOT_MOMENT_OF_INERTIA * Math.pow(omegaRadS, 2));
  // Exact tip speed calculation: v = omega * r_tip; 1 m/s = 2.23694 mph (1 / 0.44704)
  const tipSpeedMph = Math.round((omegaRadS * TOOTH_TIP_RADIUS_M) / 0.44704);

  return (
    <div className="page lab-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Top Combat Breadcrumb & Tactical Toolbar */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="cyber-badge">SYSTEM // COMBAT TEST LAB</span>
          <span className="cyber-badge amber">DSHOT600 8kHz</span>
          <span className="cyber-badge green">ELRS 250Hz CRSF</span>
          <span className="cyber-badge crimson">H3LIS331DLTR ±400G</span>
          {gamepadConnected && (
            <span className="gamepad-badge">
              🎮 {gamepadName.slice(0, 20).toUpperCase()} [{gamepadAxes.slice(0, 2).map((a) => a.toFixed(1)).join(',')}]
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Audio Mute Toggle */}
          <button
            className={`cyber-btn ${audioMuted ? '' : 'primary'}`}
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={toggleAudioMute}
            title="Toggle Procedural Web Audio Synthesis"
          >
            {audioMuted ? '🔇 AUDIO: MUTED' : '🔊 AUDIO: ACTIVE'}
          </button>
          {/* Fullscreen Viewport Mode Toggle */}
          <button
            className={`cyber-btn ${isFullscreen ? 'amber' : ''}`}
            style={{ padding: '6px 12px', fontSize: '11px' }}
            onClick={toggleFullscreen}
            title="Toggle Full-Screen Cyber-Combat Viewport (F)"
          >
            {isFullscreen ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN (F)'}
          </button>
          {/* Master Arm Safety Switch */}
          <button
            className={`cyber-btn ${armed ? 'danger' : 'primary'}`}
            style={{ padding: '6px 14px', fontSize: '11px' }}
            onClick={() => {
              soundEngine.init();
              setArmed(!armed);
            }}
          >
            <span className="cyber-dot" />
            {armed ? 'DISARM COMBAT BOT' : 'SAFETY: ARM ROBOT'}
          </button>
        </div>
      </div>

      {/* MULTI-ARENA SELECTOR TABS */}
      <div
        className="glass-panel"
        style={{
          marginTop: '16px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', fontFamily: 'monospace', fontWeight: 'bold' }}>
            SELECT ARENA [1-3]:
          </span>
          {(['nhrl-cage', 'battlebox', 'spin-chamber'] as ArenaId[]).map((aid) => {
            const cfg = ARENA_CONFIGS[aid];
            const isActive = currentArena === aid;
            const colorClass = aid === 'nhrl-cage' ? 'amber' : aid === 'battlebox' ? '' : 'green';
            return (
              <button
                key={aid}
                className={`arena-tab-btn ${isActive ? `active ${colorClass}` : ''}`}
                onClick={() => setCurrentArena(aid)}
              >
                <span>{aid === 'nhrl-cage' ? '⚡ ' : aid === 'battlebox' ? '⚔️ ' : '🔬 '}</span>
                {cfg.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="cyber-badge" style={{ borderColor: ARENA_CONFIGS[currentArena].themeColor, color: ARENA_CONFIGS[currentArena].themeColor }}>
            {ARENA_CONFIGS[currentArena].badge}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', fontFamily: 'monospace' }}>
            {ARENA_CONFIGS[currentArena].tagline}
          </span>
        </div>
      </div>

      {/* Main Grid: Arena Viewport (Left) vs Radar & RadioMaster Station (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 640px) 1fr', gap: '24px', marginTop: '20px' }}>
        
        {/* Left Column: 60FPS Combat Arena Physics & Fullscreen Viewport */}
        <div
          ref={viewportContainerRef}
          className={`arena-fullscreen-wrapper ${isFullscreen ? 'is-fullscreen' : ''} hud-corner`}
          style={{ display: 'flex', flexDirection: 'column' }}
        >
          {/* Sleek Floating Glassmorphism Header Bar */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
              background: 'rgba(10, 16, 28, 0.85)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              zIndex: 30,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="cyber-dot" /> {ARENA_CONFIGS[currentArena].name}
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                {ARENA_CONFIGS[currentArena].tagline}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Live Video Recording Button */}
              {!isRecording ? (
                <button
                  className="cyber-btn danger"
                  style={{ padding: '4px 10px', fontSize: '10px' }}
                  onClick={startRecording}
                  title="Record 60 FPS Arena Video with Synthesized Audio"
                >
                  <span className="rec-pulsing-dot" /> REC COMBAT (60FPS)
                </button>
              ) : (
                <button
                  className="cyber-btn danger"
                  style={{
                    padding: '4px 10px',
                    fontSize: '10px',
                    background: 'rgba(255, 42, 85, 0.45)',
                    boxShadow: '0 0 16px rgba(255, 42, 85, 0.7)',
                  }}
                  onClick={stopRecording}
                  title="Stop and Export Combat Recording"
                >
                  <span className="rec-pulsing-dot" /> STOP ({formatDuration(recordDuration)})
                </button>
              )}

              {/* Instant 3s Slow-Motion Replay Trigger */}
              <button
                className="cyber-btn"
                style={{ padding: '4px 9px', fontSize: '10px' }}
                onClick={triggerManualReplay}
                title="Instant Slow-Motion Replay (Last 3.0s @ 0.25x Speed)"
              >
                🎬 REPLAY
              </button>

              {/* Auto-Killcam Toggle */}
              <button
                className={`cyber-btn ${autoKillcam ? 'primary' : ''}`}
                style={{ padding: '4px 9px', fontSize: '10px' }}
                onClick={() => setAutoKillcam(!autoKillcam)}
                title="Toggle automatic slow-mo replay popup on massive impacts (>150G)"
              >
                ⚡ {autoKillcam ? 'KILLCAM: ON' : 'KILLCAM: OFF'}
              </button>

              <button
                className="cyber-btn"
                style={{ padding: '4px 9px', fontSize: '10px' }}
                onClick={resetArena}
              >
                RESET (R)
              </button>

              {isFullscreen && (
                <button
                  className="cyber-btn primary"
                  style={{ padding: '4px 9px', fontSize: '10px' }}
                  onClick={toggleFullscreen}
                >
                  ✕ EXIT FS
                </button>
              )}
            </div>
          </div>

          {/* Director Camera Selector Strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(8, 12, 22, 0.75)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '6px 14px',
              flexWrap: 'wrap',
              gap: '8px',
              zIndex: 25,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', color: 'var(--cyber-text-muted)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                DIRECTOR CAM:
              </span>
              {(['Tactical Top-Down', 'Dynamic Follow Bot', 'Clash Zoom'] as CameraMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`cyber-btn ${cameraMode === mode ? 'primary' : ''}`}
                  style={{ padding: '3px 8px', fontSize: '10px' }}
                  onClick={() => setCameraMode(mode)}
                >
                  {mode === 'Tactical Top-Down' && '🎥 '}
                  {mode === 'Dynamic Follow Bot' && '🤖 '}
                  {mode === 'Clash Zoom' && '⚡ '}
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'var(--cyber-text-dim)' }}>ZOOM:</span>
              <strong style={{ color: 'var(--neon-cyan)' }}>{cameraStateRef.current.zoom.toFixed(2)}X</strong>
            </div>
          </div>

          {/* Interactive Arena Canvas Viewport */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: isFullscreen ? 'auto' : '1/1',
              flex: isFullscreen ? 1 : 'none',
              background: '#04070e',
              overflow: 'hidden',
              touchAction: 'none',
              cursor: isArenaPointerDownRef.current ? 'crosshair' : 'default',
            }}
          >
            <canvas
              ref={arenaCanvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
              onPointerDown={handleArenaPointerDown}
              onPointerMove={handleArenaPointerMove}
              onPointerUp={handleArenaPointerUp}
              onPointerCancel={handleArenaPointerUp}
            />

            {/* Tactical Recording HUD */}
            {isRecording && (
              <div className="tactical-rec-hud">
                <span className="rec-pulsing-dot" />
                <span style={{ color: '#ff2a55', fontWeight: 'bold', letterSpacing: '0.12em' }}>REC</span>
                <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{formatDuration(recordDuration)}</span>
                <span style={{ color: 'var(--neon-cyan)', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '8px' }}>
                  {recordBitrate > 1000 ? `${(recordBitrate / 1000).toFixed(2)} Mbps` : `${recordBitrate} kbps`}
                </span>
                <span style={{ color: 'var(--neon-amber)', fontSize: '10px' }}>60 FPS</span>
              </div>
            )}

            {/* Floating Glassmorphism Telemetry HUD: Top Left */}
            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
              <div className="floating-hud-panel" style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: 'var(--cyber-text-muted)' }}>SPIN:</span>
                  <strong style={{ color: overdrive ? '#ff2a55' : 'var(--neon-cyan)' }}>{currentRpm} RPM</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: 'var(--cyber-text-muted)' }}>TIP SPEED:</span>
                  <strong style={{ color: '#fff' }}>{tipSpeedMph} MPH</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: 'var(--cyber-text-muted)' }}>KINETIC E:</span>
                  <strong style={{ color: 'var(--neon-amber)' }}>{kineticJoules} J</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: 'var(--cyber-text-muted)' }}>PLL LOCK:</span>
                  <strong style={{ color: 'var(--neon-green)' }}>
                    {rpmRef.current > 600 ? '99.8% (32° LEAD)' : 'ACQUIRING'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Floating Glassmorphism Telemetry HUD: Top Right (Combo) */}
            {hitCombo > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'linear-gradient(135deg, rgba(255, 170, 0, 0.9), rgba(255, 42, 85, 0.9))',
                  padding: '5px 12px',
                  borderRadius: '4px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  boxShadow: '0 0 16px rgba(255, 170, 0, 0.6)',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{hitCombo}x COMBO</span>
                <span style={{ fontSize: '10px', background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: '3px' }}>
                  {comboMultiplier}X DMG
                </span>
              </div>
            )}

            {/* Bottom Keyboard, Touch, & Gamepad Controls Hint */}
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', pointerEvents: 'none' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.75)', background: 'rgba(0, 0, 0, 0.85)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                CLICK / TOUCH ARENA = AIM · WASD / ARROWS = DRIVE · SHIFT = 4,000 RPM · 1-3 = ARENA
              </span>
            </div>
          </div>

          {/* Speed & Modulation Telemetry Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', background: 'rgba(0, 240, 255, 0.15)' }}>
            <div className="glass-panel" style={{ padding: '8px', textAlign: 'center', borderRadius: 0 }}>
              <div style={{ fontSize: '9px', color: 'var(--cyber-text-muted)' }}>STATUS</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: armed ? 'var(--neon-green)' : 'var(--neon-crimson)' }}>
                {armed ? (overdrive ? 'OVERDRIVE' : 'ARMED') : 'SAFE'}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '8px', textAlign: 'center', borderRadius: 0 }}>
              <div style={{ fontSize: '9px', color: 'var(--cyber-text-muted)' }}>TIP VELOCITY</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                {tipSpeedMph} MPH
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '8px', textAlign: 'center', borderRadius: 0 }}>
              <div style={{ fontSize: '9px', color: 'var(--cyber-text-muted)' }}>KINETIC ROTOR</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-amber)' }}>
                {kineticJoules} J
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '8px', textAlign: 'center', borderRadius: 0 }}>
              <div style={{ fontSize: '9px', color: 'var(--cyber-text-muted)' }}>TOTAL CLASHES</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>
                {totalHits} {peakG > 0 && <span style={{ fontSize: '10px', color: 'var(--neon-crimson)' }}>({peakG}G)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Radar Sweep, Dual Accel Waveforms, and RadioMaster Pocket Station */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Row: Simulated LiDAR Radar PPI + Target Roster */}
          <div className="glass-panel hud-corner" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="cyber-dot" /> 360° MICRO-LIDAR RADAR &amp; TARGET LOCK
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                  {currentArena === 'spin-chamber' ? 'AR500 Telemetry Sensor Targets' : 'Ballistic Lead Pursuit Intercept'}
                </span>
              </div>
              <button
                className={`cyber-btn ${autoRam ? 'danger' : 'amber'}`}
                style={{ padding: '5px 12px', fontSize: '11px' }}
                onClick={() => setAutoRam(!autoRam)}
              >
                {autoRam ? 'AUTO-RAM: ENGAGED' : 'ENGAGE AI AUTO-RAM'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0, 240, 255, 0.4)', margin: '0 auto' }}>
                <canvas ref={radarCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>

              {/* Target Selector & Radar Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', textTransform: 'uppercase' }}>
                  {currentArena === 'spin-chamber' ? 'Telemetry Targets:' : 'Select Target to Lock:'}
                </div>
                {opponentsRef.current.map((opp) => (
                  <div
                    key={opp.id}
                    onClick={() => setSelectedOpponent(opp.id)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: selectedOpponent === opp.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: selectedOpponent === opp.id ? '1px solid var(--neon-cyan)' : '1px solid rgba(255, 255, 255, 0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opp.color }} />
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{opp.name}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: opp.destroyed ? '#ff2a55' : 'var(--neon-green)', fontWeight: 'bold' }}>
                      {opp.destroyed ? 'KILLED' : opp.biteTelemetryMm !== undefined ? `${opp.biteTelemetryMm}mm BITE` : `HP ${opp.health}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Row: Dual Accelerometer Oscilloscope Waveform */}
          <div className="glass-panel hud-corner" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--neon-amber)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="cyber-dot" /> DUAL ACCELEROMETER OSCILLOSCOPE (±400G)
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                  H3LIS331DLTR Real-Time G-Force Waveform (Radius 25mm Opposed Pairs)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                <span style={{ color: '#00f0ff' }}>● S1 (Front)</span>
                <span style={{ color: '#ffaa00' }}>● S2 (Rear)</span>
              </div>
            </div>

            <div style={{ width: '100%', height: '110px', background: '#04070e', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255, 170, 0, 0.2)' }}>
              <canvas ref={accelCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
          </div>

          {/* Bottom Row: Virtual RadioMaster Pocket Station */}
          <div className="glass-panel-elevated hud-corner" style={{ padding: '18px', background: 'linear-gradient(180deg, rgba(16, 24, 40, 0.95), rgba(10, 15, 28, 0.98))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.08em', color: '#fff' }}>
                  RADIOMASTER POCKET // ELRS 2.4GHz TACTICAL STATION
                </span>
                <span className="cyber-badge">MODE 2 CRSF</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                {gamepadConnected ? `🎮 ${gamepadName.slice(0, 20)}` : 'Hall X5 Gimbals · EdgeTX 2.10'}
              </span>
            </div>

            {/* Controller Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px', gap: '20px', alignItems: 'center' }}>
              
              {/* Left Gimbal: Spin Throttle */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', fontWeight: 'bold' }}>
                  CH3: SPIN THROTTLE
                </div>
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #1e293b 20%, #0f172a 80%)',
                    border: '2px solid rgba(0, 240, 255, 0.3)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ position: 'absolute', width: '4px', height: '60px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }} />
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: armed ? '#00f0ff' : '#64748b',
                      boxShadow: armed ? '0 0 12px #00f0ff' : 'none',
                      transform: `translateY(${-throttle * 30 + 15}px)`,
                      transition: 'transform 0.05s ease',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={throttle}
                  onChange={(e) => {
                    soundEngine.init();
                    setThrottle(parseFloat(e.target.value));
                  }}
                  style={{ width: '100px', accentColor: '#00f0ff' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--neon-cyan)', fontFamily: 'monospace' }}>
                  {Math.round(throttle * 100)}% THROTTLE
                </span>
              </div>

              {/* Center: Monochrome 128x64 EdgeTX LCD Telemetry Display */}
              <div
                style={{
                  background: '#15251b',
                  border: '3px solid #233b2c',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  fontFamily: 'monospace',
                  color: '#4ade80',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: 'inset 0 0 16px rgba(0, 255, 128, 0.15)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(74, 222, 128, 0.3)', paddingBottom: '3px' }}>
                  <span>EYELINER-3LB REV9</span>
                  <span>4S 15.6V</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>RPM: {currentRpm.toString().padStart(4, ' ')}</span>
                  <span>ENERGY: {kineticJoules.toString().padStart(3, ' ')}J</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>G-FORCE: {currentGs.padStart(5, ' ')}G</span>
                  <span>TIP: {tipSpeedMph.toString().padStart(3, ' ')}MPH</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CRSF: 250Hz -38dB</span>
                  <span style={{ color: armed ? '#4ade80' : '#f87171' }}>{armed ? 'STATE: ARMED' : 'STATE: SAFE'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(74, 222, 128, 0.3)', paddingTop: '3px' }}>
                  <span>SA: {armed ? 'ARMED' : 'DISARM'}</span>
                  <span>SB: {driveMode}</span>
                  <span>ARENA: {currentArena.toUpperCase()}</span>
                </div>
              </div>

              {/* Right Gimbal: Pitch & Roll Translation Vector */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', fontWeight: 'bold' }}>
                  CH1/2: TRANSLATE
                </div>
                <div
                  ref={rightStickRef}
                  onPointerDown={handleStickPointerDown}
                  onPointerMove={handleStickMove}
                  onPointerUp={handleStickPointerUp}
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #1e293b 20%, #0f172a 80%)',
                    border: '2px solid rgba(255, 170, 0, 0.4)',
                    position: 'relative',
                    cursor: 'grab',
                    touchAction: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ position: 'absolute', width: '60px', height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <div style={{ position: 'absolute', width: '1px', height: '60px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: Math.hypot(transVector.x, transVector.y) > 0.05 ? '#ffaa00' : '#94a3b8',
                      boxShadow: Math.hypot(transVector.x, transVector.y) > 0.05 ? '0 0 12px #ffaa00' : 'none',
                      transform: `translate(${transVector.x * 32}px, ${transVector.y * 32}px)`,
                      pointerEvents: 'none',
                      transition: isDraggingRight.current ? 'none' : 'transform 0.12s ease-out',
                    }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: 'var(--neon-amber)', fontFamily: 'monospace' }}>
                  VEC: [{transVector.x.toFixed(2)}, {transVector.y.toFixed(2)}]
                </span>
              </div>
            </div>

            {/* Quick Tactical Switches */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', flexWrap: 'wrap' }}>
              <button
                className={`cyber-btn ${armed ? 'danger' : 'primary'}`}
                style={{ padding: '5px 12px', fontSize: '11px' }}
                onClick={() => {
                  soundEngine.init();
                  setArmed(!armed);
                }}
              >
                SWITCH SA: {armed ? 'ARMED' : 'DISARMED'}
              </button>
              <button
                className="cyber-btn"
                style={{ padding: '5px 12px', fontSize: '11px' }}
                onClick={() => {
                  const modes: ('Normal' | 'Acro' | 'Orbit-Lock')[] = ['Normal', 'Acro', 'Orbit-Lock'];
                  const next = modes[(modes.indexOf(driveMode) + 1) % modes.length];
                  setDriveMode(next);
                }}
              >
                SWITCH SB: {driveMode}
              </button>
              <button
                className={`cyber-btn ${autoRam ? 'amber' : ''}`}
                style={{ padding: '5px 12px', fontSize: '11px' }}
                onClick={() => setAutoRam(!autoRam)}
              >
                SWITCH SF: {autoRam ? 'AUTONOMY' : 'MANUAL'}
              </button>
              <button
                className={`cyber-btn ${overdrive ? 'danger' : ''}`}
                style={{ padding: '5px 12px', fontSize: '11px' }}
                onClick={() => setOverdrive(!overdrive)}
              >
                {overdrive ? '⚡ 4,000 RPM OVERDRIVE' : 'OVERDRIVE: OFF'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Killcam & Slow-Mo Replay Modal */}
      {killcamData && (
        <KillcamReplayModal
          data={killcamData}
          onClose={() => setKillcamData(null)}
        />
      )}

      {/* Video Export & Instant Preview Modal */}
      {recordedVideo && (
        <VideoExportModal
          video={recordedVideo}
          onClose={() => {
            if (recordedVideo.url) {
              URL.revokeObjectURL(recordedVideo.url);
            }
            setRecordedVideo(null);
          }}
        />
      )}
    </div>
  );
}
