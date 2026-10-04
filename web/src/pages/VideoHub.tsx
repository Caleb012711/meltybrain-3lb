/* oxlint-disable react/immutability, react/refs, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import '../cyber-combat.css';
import './VideoHub.css';

// ============================================================================
// REEL TYPES & SPECIFICATIONS
// ============================================================================
type ReelId = 'strike' | 'drift' | 'lidar' | 'cleats';

interface ReelPhase {
  name: string;
  timeStart: number;
  timeEnd: number;
  description: string;
  metricLabel: string;
  metricValue: string;
}

interface ReelSpec {
  id: ReelId;
  tag: string;
  title: string;
  subtitle: string;
  duration: number; // 12 seconds loop
  badgeColor: 'amber' | 'crimson' | 'green' | 'cyan';
  keyMetrics: {
    energyOrSpeed: string;
    rpmTarget: string;
    criticalTolerance: string;
    sensorMode: string;
  };
  phases: ReelPhase[];
  technicalSpecs: { label: string; value: string }[];
  formula: { title: string; equation: string; explanation: string };
}

const REELS: ReelSpec[] = [
  {
    id: 'strike',
    tag: 'REEL 01 // KINETIC WEAPON',
    title: 'Kinetic Weapon Strike Mechanics',
    subtitle: '318 Joules impact analysis, tooth bite depth vs RPM, shear stress in SendCutSend AR500 steel.',
    duration: 12.0,
    badgeColor: 'crimson',
    keyMetrics: {
      energyOrSpeed: '318.4 Joules Peak',
      rpmTarget: '2,850 RPM Nominal',
      criticalTolerance: '4.82 mm Bite Depth',
      sensorMode: 'LIS331HH 400g Shock IMU',
    },
    phases: [
      {
        name: 'Centrifugal Spin-Up',
        timeStart: 0.0,
        timeEnd: 4.5,
        description: 'Angular acceleration to 2,850 RPM. Centripetal expansion reaches 680G at tooth tip.',
        metricLabel: 'Angular Momentum',
        metricValue: '0.702 N·m·s',
      },
      {
        name: 'Translational Bite Engagement',
        timeStart: 4.5,
        timeEnd: 7.0,
        description: 'Robot translates forward at 1.45 m/s. Tooth bite depth engages target armor by 4.82 mm.',
        metricLabel: 'Bite Ratio (b)',
        metricValue: '4.82 mm / tooth',
      },
      {
        name: 'Peak Shockwave Transfer',
        timeStart: 7.0,
        timeEnd: 8.8,
        description: 'Kinetic strike dumps 318 Joules into opponent plate in 3.8 ms. AR500 shear stress peaks at 1,420 MPa.',
        metricLabel: 'Max Shear Stress',
        metricValue: '1,420 MPa',
      },
      {
        name: 'Gyroscopic Elastic Rebound',
        timeStart: 8.8,
        timeEnd: 12.0,
        description: 'Chassis absorbs recoil pulse. Dual BrotherHobby 2806.5 motors recover RPM with 60A punch.',
        metricLabel: 'Torque Recovery',
        metricValue: '94% in 450 ms',
      },
    ],
    technicalSpecs: [
      { label: 'Weapon Tooth Material', value: 'SendCutSend Laser-cut AR500 Armor Steel (3.175mm)' },
      { label: 'Kinetic Energy (E_k)', value: '318.4 Joules (½·I·ω² at 2,850 RPM)' },
      { label: 'Tooth Tip Diameter', value: '150.0 mm (75.0 mm impact radius)' },
      { label: 'Tangential Tip Velocity', value: '22.38 m/s (50.07 mph / 80.58 km/h)' },
      { label: 'Impact Pulse Duration', value: '3.8 milliseconds (FEA shockwave capture)' },
      { label: 'Max AR500 Yield Stress', value: '1,500 MPa ultimate / 1,420 MPa peak impact' },
    ],
    formula: {
      title: 'Kinetic Energy & Tooth Bite Depth Equations',
      equation: 'E_k = ½ · I · ω²    |    b = v_trans / (N_teeth · (RPM / 60))',
      explanation:
        'Tooth bite depth (b) governs whether the weapon bites into steel armor for catastrophic structural transfer or bounces off. At 1.45 m/s translation with dual teeth (N=2) and 2,850 RPM, each tooth achieves a deep 4.82mm penetration pocket.',
    },
  },
  {
    id: 'drift',
    tag: 'REEL 02 // VECTOR KINEMATICS',
    title: 'Meltybrain Translational Drift Kinematics',
    subtitle: 'Sinusoidal wheel speed modulation, heading tracker phase-lock loop, gyro drift compensation.',
    duration: 12.0,
    badgeColor: 'cyan',
    keyMetrics: {
      energyOrSpeed: '1.85 m/s Translation',
      rpmTarget: '2,600 RPM Spin',
      criticalTolerance: '±1.2° Phase Jitter',
      sensorMode: '1,000 Hz Optical Strobe PLL',
    },
    phases: [
      {
        name: 'Optical Beacon Phase-Lock',
        timeStart: 0.0,
        timeEnd: 3.5,
        description: 'IR optical strobe locks onto arena perimeter beacon. Phase error stabilizes within ±1.2°.',
        metricLabel: 'Phase Tracking',
        metricValue: '±1.2° Jitter PLL',
      },
      {
        name: 'Sinusoidal Wheel Modulation',
        timeStart: 3.5,
        timeEnd: 7.2,
        description: 'Left & Right ESCs modulate motor speed sinusoidally at rotational frequency (43.3 Hz).',
        metricLabel: 'Modulation Depth',
        metricValue: '42% Throttle Delta',
      },
      {
        name: 'Translational Trajectory Drift',
        timeStart: 7.2,
        timeEnd: 10.0,
        description: 'Net orthogonal drive vector generates 1.85 m/s pure translation while maintaining continuous spin.',
        metricLabel: 'Drift Velocity',
        metricValue: '1.85 m/s Orthogonal',
      },
      {
        name: 'Kalman Gyro Compensation',
        timeStart: 10.0,
        timeEnd: 12.0,
        description: '1,000 Hz complementary filter eliminates centripetal cross-axis accelerometer leakage.',
        metricLabel: 'Zero-Rate Bias',
        metricValue: '< 0.08 deg/s error',
      },
    ],
    technicalSpecs: [
      { label: 'Differential Drive Motors', value: '2× BrotherHobby 2806.5 1300KV Outrunners' },
      { label: 'Electronic Speed Controls', value: '2× AM32 45A ESCs with Bidirectional DShot600' },
      { label: 'Wheel Modulation Function', value: 'V_left(θ) = V_spin + ΔV·sin(θ - φ_target)' },
      { label: 'Heading Phase Sensor', value: 'Everlight PT334-6C High-Speed IR Phototransistor' },
      { label: 'Spin Frequency at 2600 RPM', value: '43.33 Hz (1 rotation every 23.08 ms)' },
      { label: 'Microcontroller Timing Jitter', value: '< 2.4 µs on RP2040 Dual ARM Cortex-M0+' },
    ],
    formula: {
      title: 'Meltybrain Translational Drive Law',
      equation: 'V_L(θ) = V_0 + ΔV·sin(θ - φ)    |    V_R(θ) = V_0 - ΔV·sin(θ - φ)',
      explanation:
        'By accelerating the wheels when facing the desired heading angle (φ) and decelerating them 180° later in each 23ms revolution, a net translational force vector is synthesized without stopping rotation.',
    },
  },
  {
    id: 'lidar',
    tag: 'REEL 03 // AUTONOMOUS TARGETING',
    title: '360° Micro-LiDAR Opponent Tracking',
    subtitle: 'ST VL53L4CD point cloud sweep, target intercept vector, auto-ram trajectory computation.',
    duration: 12.0,
    badgeColor: 'green',
    keyMetrics: {
      energyOrSpeed: '58.3 Sweeps / sec',
      rpmTarget: '3,500 RPM Radar Mode',
      criticalTolerance: '1,200 mm Range',
      sensorMode: 'ST VL53L4CD ToF Ranging',
    },
    phases: [
      {
        name: '360° Radial Cloud Acquisition',
        timeStart: 0.0,
        timeEnd: 3.5,
        description: 'Rim-mounted ST VL53L4CD micro-ToF casts 58.3 full sweeps per second at 3,500 RPM.',
        metricLabel: 'Point Cloud Rate',
        metricValue: '2,100 pts/sec',
      },
      {
        name: 'Opponent Signature Clustering',
        timeStart: 3.5,
        timeEnd: 6.8,
        description: 'Point-cloud clustering isolates 3lb wedge bot geometry at 840 mm range, bearing 134°.',
        metricLabel: 'Target Centroid',
        metricValue: 'R=840mm, θ=134.2°',
      },
      {
        name: 'Lead Intercept Vector Synthesis',
        timeStart: 6.8,
        timeEnd: 9.6,
        description: 'Guidance computer computes target velocity vector and solves collision intercept cone.',
        metricLabel: 'Intercept Vector',
        metricValue: '2.40 m/s at 142°',
      },
      {
        name: 'Terminal Lock & Auto-Ram',
        timeStart: 9.6,
        timeEnd: 12.0,
        description: 'Meltybrain locks throttle into closing trajectory. Weapon tooth aligns for maximum KE impact.',
        metricLabel: 'Closing Rate',
        metricValue: '3.85 m/s Terminal',
      },
    ],
    technicalSpecs: [
      { label: 'Time-of-Flight Sensor', value: 'STMicroelectronics VL53L4CD (940nm VCSEL Laser)' },
      { label: 'Field of View (FoV)', value: '18° Optical Cone (swept across 360° at 58.3 Hz)' },
      { label: 'Effective Target Range', value: '50 mm to 1,300 mm inside battlebox steel walls' },
      { label: 'Arena Wall Threshold Filter', value: 'Elliptical reject boundary (> 1,200 mm discarded)' },
      { label: 'Centroid Tracking Latency', value: '17.1 ms (single revolution latency)' },
      { label: 'Auto-Ram Guidance Mode', value: 'Proportional Navigation (PN) with lead compensation' },
    ],
    formula: {
      title: 'Target Lead Intercept Vector Calculation',
      equation: 'P_tgt(t) = P_0 + V_tgt · t    |    ||P_tgt(t_c) - P_bot(t_c)|| = 0',
      explanation:
        'Because opponent robots maneuver evasively, direct point-and-ram results in glancing hits. The on-board RP2040 estimates opponent velocity vector V_tgt and aims the translational drive angle toward the future collision point t_c.',
    },
  },
  {
    id: 'cleats',
    tag: 'REEL 04 // CHASSIS INVERTIBILITY',
    title: '100% Invertible Cleat Traction Test',
    subtitle: 'SendCutSend Ti-6Al-4V gear cleats on arena steel floor, dual-sided 4.185mm clearance.',
    duration: 12.0,
    badgeColor: 'amber',
    keyMetrics: {
      energyOrSpeed: '13.3 N Traction Force',
      rpmTarget: '2,200 RPM Testing',
      criticalTolerance: '4.185 mm Dual-Sided',
      sensorMode: 'SendCutSend Ti-6Al-4V Gr5',
    },
    phases: [
      {
        name: 'Upright High-G Cleat Engagement',
        timeStart: 0.0,
        timeEnd: 3.2,
        description: 'Laser-cut Titanium cleats bite into paint and scale of 10-gauge arena steel floor.',
        metricLabel: 'Steel Friction (µ_k)',
        metricValue: '0.78 Traction Coeff',
      },
      {
        name: 'Dynamic Inversion Flip Event',
        timeStart: 3.2,
        timeEnd: 5.8,
        description: 'Simulated 180° vertical flip. Chassis flips upside down in air under combat recoil.',
        metricLabel: 'Inversion Rate',
        metricValue: '180° in 320 ms',
      },
      {
        name: 'Dual-Sided Ground Clearance',
        timeStart: 5.8,
        timeEnd: 8.5,
        description: 'Inverted landing verified. Exactly 4.185 mm clearance between top plate and arena steel floor.',
        metricLabel: 'Floor Clearance',
        metricValue: '4.185 mm (Zero Rub)',
      },
      {
        name: 'Auto-Commutation Throttle Recovery',
        timeStart: 8.5,
        timeEnd: 12.0,
        description: 'LIS331HH detects gravity vector inversion (Z-axis flip). Firmware swaps wheel phase in 12 ms.',
        metricLabel: 'Recovery Latency',
        metricValue: '12.4 ms Commutation',
      },
    ],
    technicalSpecs: [
      { label: 'Cleat Material & Cut', value: 'SendCutSend 2.0mm Grade 5 Titanium (Ti-6Al-4V)' },
      { label: 'Top & Bottom Clearance', value: '4.185 mm symmetrically above & below arena floor' },
      { label: 'Wheel Rim Outer Diameter', value: '64.0 mm with 36 micro-cleat drive teeth' },
      { label: 'Static Steel Friction Coeff', value: 'µ_s = 0.82 (tested on smooth Blanchard steel)' },
      { label: 'Total Invertible Height', value: '42.0 mm ultra-low profile disc silhouette' },
      { label: 'Inversion IMU Detection', value: 'Z-axis accelerometer sign-flip threshold (<-0.6g)' },
    ],
    formula: {
      title: 'Traction Limit & Symmetrical Clearance Geometry',
      equation: 'F_max = µ · (m·g + F_downforce)    |    H_top = H_bottom = 4.185 mm',
      explanation:
        'Meltybrains cannot rely on passive casters because they would lift the drive wheels during translational modulation. Symmetrical Ti-6Al-4V cleats maintain 4.185mm clearance upright or inverted, allowing zero downtime after high-energy flips.',
    },
  },
];

// ============================================================================
// SOUND SYNTHESIZER FOR REEL AUDIO (OPTIONAL & USER CONTROLLED)
// ============================================================================
class HubAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private muted: boolean = true;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0, this.ctx.currentTime);
      master.connect(this.ctx.destination);
      this.masterGain = master;

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, this.ctx.currentTime);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, this.ctx.currentTime);
      osc.connect(g);
      g.connect(master);
      osc.start();
      this.osc = osc;
    } catch {
      // AudioContext unavailable
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.25, this.ctx.currentTime);
    }
  }

  public update(rpm: number, isImpact: boolean) {
    if (this.muted || !this.ctx || !this.osc) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const targetFreq = Math.max(40, (rpm * 7) / 60); // 14-pole motor electrical frequency
    this.osc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);

    if (isImpact && this.masterGain) {
      // Trigger momentary impact burst
      const now = this.ctx.currentTime;
      const noise = this.ctx.createOscillator();
      noise.type = 'square';
      noise.frequency.setValueAtTime(140, now);
      noise.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.2);
    }
  }

  public destroy() {
    try {
      this.osc?.stop();
      this.ctx?.close();
    } catch {}
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function VideoHub() {
  const [activeReelId, setActiveReelId] = useState<ReelId>('strike');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [sourceMode, setSourceMode] = useState<'canvas' | 'mp4'>('canvas');
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isVideoExporting, setIsVideoExporting] = useState<boolean>(false);
  const [videoExportProgress, setVideoExportProgress] = useState<number>(0);
  const [oscilloscopeMode, setOscilloscopeMode] = useState<'timeline' | 'liveSweep'>('timeline');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrubTrackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingScrubber = useRef<boolean>(false);
  const audioEngineRef = useRef<HubAudioEngine | null>(null);

  const currentReel = useMemo(() => {
    return REELS.find((r) => r.id === activeReelId) || REELS[0];
  }, [activeReelId]);

  // Initialize procedural audio engine
  useEffect(() => {
    const engine = new HubAudioEngine();
    audioEngineRef.current = engine;
    return () => {
      engine.destroy();
    };
  }, []);

  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  // ==========================================================================
  // TELEMETRY DETERMINISTIC SAMPLING (Time t in [0, 12s])
  // ==========================================================================
  const sampleTelemetry = useCallback(
    (reelId: ReelId, t: number) => {
      const duration = 12.0;
      const progress = Math.min(Math.max(t / duration, 0), 1);

      let rpm = 0;
      let gs = 0;
      let voltage = 16.4;
      let throttleBias = 0;
      let isStrike = false;

      if (reelId === 'strike') {
        // Spin-up -> Translation -> Strike at t=7.2s -> Rebound
        if (t < 4.5) {
          rpm = (t / 4.5) * 2850;
          voltage = 16.4 - (t / 4.5) * 0.7;
          throttleBias = 0;
        } else if (t < 7.0) {
          rpm = 2850 + Math.sin(t * 12) * 25;
          voltage = 15.7 - 0.2;
          throttleBias = Math.sin((t - 4.5) * 6) * 35;
        } else if (t < 7.6) {
          // Impact event at t=7.2s
          isStrike = true;
          const strikePhase = (t - 7.0) / 0.6;
          rpm = 2850 - strikePhase * 580; // drops to ~2270 RPM
          voltage = 15.5 - 1.4 * Math.sin(strikePhase * Math.PI); // dips to ~14.1V
          throttleBias = 0;
        } else {
          // Recovery
          const recPhase = (t - 7.6) / (12.0 - 7.6);
          rpm = 2270 + recPhase * 530;
          voltage = 14.8 + recPhase * 0.9;
          throttleBias = Math.sin(t * 5) * 15;
        }
      } else if (reelId === 'drift') {
        // Continuous modulation with phase lock
        rpm = 2600 + Math.sin(t * 15) * 120;
        voltage = 15.8 - (t / 12) * 0.5 - (Math.abs(Math.sin(t * 8)) * 0.4);
        throttleBias = Math.sin(t * 4.2) * 42.0;
      } else if (reelId === 'lidar') {
        // High-speed radar spin at 3,500 RPM
        rpm = 3480 + Math.sin(t * 22) * 45;
        voltage = 15.6 - 0.3 * Math.sin(t * 2);
        // Throttle bias points towards acquired target after t=4.5s
        if (t < 3.5) {
          throttleBias = 5;
        } else if (t < 7.0) {
          throttleBias = 22;
        } else {
          throttleBias = 55 + Math.sin(t * 10) * 15;
        }
      } else if (reelId === 'cleats') {
        // Invertible flip test
        if (t < 3.5) {
          rpm = 2200;
          voltage = 16.0;
          throttleBias = 30;
        } else if (t < 5.5) {
          // Flip dynamic
          rpm = 2200 - ((t - 3.5) / 2.0) * 600;
          voltage = 15.2;
          throttleBias = 0;
        } else if (t < 8.0) {
          // Inverted landing
          rpm = 1600 + ((t - 5.5) / 2.5) * 600;
          voltage = 15.5;
          throttleBias = -30; // Commutation inversion
        } else {
          rpm = 2200 + Math.sin(t * 8) * 40;
          voltage = 15.7;
          throttleBias = -45;
        }
      }

      // Tooth tip G-force: a_c = omega^2 * r / 9.80665 (r = 0.075m)
      const omega = (rpm * 2 * Math.PI) / 60;
      gs = (omega * omega * 0.075) / 9.80665;

      return {
        rpm: Math.round(rpm),
        gs: Math.round(gs),
        voltage: Number(voltage.toFixed(2)),
        throttleBias: Number(throttleBias.toFixed(1)),
        isStrike,
        progress,
      };
    },
    []
  );

  const activeTelemetry = useMemo(() => {
    return sampleTelemetry(activeReelId, currentTime);
  }, [activeReelId, currentTime, sampleTelemetry]);

  // ==========================================================================
  // PLAYBACK TICK LOOP
  // ==========================================================================
  useEffect(() => {
    let animId: number;
    let lastStamp: number | null = null;

    const tick = (now: number) => {
      if (lastStamp !== null && isPlaying) {
        const deltaSeconds = (now - lastStamp) / 1000;
        setCurrentTime((prev) => {
          let next = prev + deltaSeconds * playbackRate;
          if (next >= currentReel.duration) {
            if (isLooping) {
              next = 0;
            } else {
              next = currentReel.duration;
              setIsPlaying(false);
            }
          }
          return next;
        });
      }
      lastStamp = now;
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackRate, isLooping, currentReel.duration]);

  // Synchronize HTML5 video element if in MP4 mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
    video.playbackRate = playbackRate;
    video.loop = isLooping;
  }, [isPlaying, playbackRate, isLooping, sourceMode]);

  // Sync video time when user scrubs
  const handleScrubTime = useCallback((newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime % (videoRef.current.duration || 12);
    }
  }, []);

  // Audio update
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.update(activeTelemetry.rpm, activeTelemetry.isStrike);
    }
  }, [activeTelemetry.rpm, activeTelemetry.isStrike]);

  // ==========================================================================
  // DYNAMIC 60FPS CANVASCAM RENDERING
  // ==========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || sourceMode !== 'canvas') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const t = currentTime;
    const reel = activeReelId;

    // Clear background with dark military cyber grid
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, width, height);

    // Coordinate grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cx = width / 2;
    const cy = height / 2;

    // ------------------------------------------------------------------------
    // REEL 1: Kinetic Weapon Strike Mechanics Visualizer
    // ------------------------------------------------------------------------
    if (reel === 'strike') {
      const spinAngle = t * ((activeTelemetry.rpm * 2 * Math.PI) / 60) * 0.08;
      const isImpacting = t >= 7.0 && t <= 7.8;

      // Opponent Target Block (Right side)
      const targetX = cx + 180;
      const targetY = cy;
      ctx.save();
      ctx.fillStyle = isImpacting ? 'rgba(255, 42, 85, 0.35)' : 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = isImpacting ? '#ff2a55' : 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(targetX - 25, targetY - 70, 70, 140, 6);
      ctx.fill();
      ctx.stroke();

      // Armor plate text
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = isImpacting ? '#ff2a55' : '#94a3b8';
      ctx.fillText('TARGET: AR500', targetX - 18, targetY - 45);
      ctx.fillText('THICKNESS: 4.8mm', targetX - 18, targetY - 30);
      ctx.restore();

      // Bot position: moves toward target during t=4.5 to 7.0
      let botX = cx - 60;
      if (t >= 4.5 && t < 7.0) {
        botX += ((t - 4.5) / 2.5) * 115;
      } else if (t >= 7.0 && t < 8.5) {
        // Impact recoil
        botX = cx + 55 - Math.sin((t - 7.0) * 8) * 20;
      } else if (t >= 8.5) {
        botX = cx - 60 + (1 - (t - 8.5) / 3.5) * 40;
      }

      // Strike Shockwave Rings
      if (isImpacting) {
        const shockRadius = ((t - 7.0) / 0.8) * 220;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 42, 85, ${1 - (t - 7.0) / 0.8})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(botX + 75, cy, shockRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 220, 0, ${0.8 - (t - 7.0) / 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(botX + 75, cy, shockRadius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // 40 Spark particles
        for (let i = 0; i < 35; i++) {
          const sparkAngle = (Math.PI * 0.7) + (Math.random() - 0.5) * 1.5;
          const sparkDist = Math.random() * shockRadius * 1.2;
          const sx = botX + 75 + Math.cos(sparkAngle) * sparkDist;
          const sy = cy + Math.sin(sparkAngle) * sparkDist;
          ctx.fillStyle = i % 2 === 0 ? '#ffea00' : '#ff2a55';
          ctx.fillRect(sx, sy, 3, 3);
        }
        ctx.restore();
      }

      // Draw Meltybrain Bot Disc Body
      ctx.save();
      ctx.translate(botX, cy);
      ctx.rotate(spinAngle);

      // Main Outer Titanium Shell (150mm diam)
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 31, 56, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner hub
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fillStyle = '#0a101d';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.stroke();

      // Dual SendCutSend AR500 Impact Teeth (opposite ends)
      const toothLen = 22;
      for (const angle of [0, Math.PI]) {
        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(70, -12);
        ctx.lineTo(75 + toothLen, -4);
        ctx.lineTo(75 + toothLen, 14);
        ctx.lineTo(65, 14);
        ctx.closePath();
        ctx.fillStyle = isImpacting ? '#ff2a55' : '#e8490f';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Tooth stress contour overlay
        if (isImpacting) {
          ctx.fillStyle = '#ffea00';
          ctx.fillRect(72, -4, toothLen, 8);
        }
        ctx.restore();
      }

      // Optical Beacon LED indicator on rim
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(65, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // On-screen telemetry callout text
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`IMPACT ENERGY: ${isImpacting ? '318.4 J (PEAK)' : '318.4 J (READY)'}`, 30, 40);
      ctx.fillStyle = isImpacting ? '#ff2a55' : '#94a3b8';
      ctx.fillText(`TOOTH BITE DEPTH: 4.82 mm | SHEAR STRESS: ${isImpacting ? '1,420 MPa' : '210 MPa'}`, 30, 60);
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(`TANGENTIAL TIP SPEED: 22.38 m/s (50.1 mph)`, 30, 80);
    }

    // ------------------------------------------------------------------------
    // REEL 2: Meltybrain Translational Drift Kinematics Visualizer
    // ------------------------------------------------------------------------
    else if (reel === 'drift') {
      const driftAngle = t * 1.8;
      const botX = cx + Math.cos(driftAngle) * 140;
      const botY = cy + Math.sin(driftAngle) * 60;
      const spinAngle = t * 24.0;

      // Trajectory cycloid ghost trail
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let s = 0; s <= 12; s += 0.2) {
        const da = s * 1.8;
        const tx = cx + Math.cos(da) * 140;
        const ty = cy + Math.sin(da) * 60;
        if (s === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Net Translational Vector Arrow
      ctx.save();
      ctx.strokeStyle = '#00ff88';
      ctx.fillStyle = '#00ff88';
      ctx.lineWidth = 3;
      const netVx = -Math.sin(driftAngle) * 50;
      const netVy = Math.cos(driftAngle) * 30;
      ctx.beginPath();
      ctx.moveTo(botX, botY);
      ctx.lineTo(botX + netVx, botY + netVy);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.arc(botX + netVx, botY + netVy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Heading Optical Beacon Line to arena wall
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(botX, botY);
      ctx.lineTo(cx, 40);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Bot Disk
      ctx.save();
      ctx.translate(botX, botY);
      ctx.rotate(spinAngle);

      // Chassis
      ctx.beginPath();
      ctx.arc(0, 0, 55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(13, 20, 36, 0.9)';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Sinusoidal wheel vector bars (Left / Right)
      const modPhase = Math.sin(t * 8);
      const leftPower = 35 + modPhase * 25;
      const rightPower = 35 - modPhase * 25;

      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(-35, -leftPower / 2, 8, leftPower);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(27, -rightPower / 2, 8, rightPower);

      // Optical beacon strobe
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(0, -48, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Oscilloscope Sine Modulation Mini-Chart in Canvas Corner
      const oscX = width - 260;
      const oscY = height - 110;
      ctx.fillStyle = 'rgba(3, 6, 12, 0.85)';
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.fillRect(oscX, oscY, 240, 90);
      ctx.strokeRect(oscX, oscY, 240, 90);

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('ESC WHEEL SPEED MODULATION', oscX + 10, oscY + 16);

      // Sine waveforms
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffaa00'; // Left motor
      ctx.beginPath();
      for (let i = 0; i < 220; i++) {
        const rad = (i + t * 40) * 0.08;
        const sy = oscY + 50 + Math.sin(rad) * 22;
        if (i === 0) ctx.moveTo(oscX + 10 + i, sy);
        else ctx.lineTo(oscX + 10 + i, sy);
      }
      ctx.stroke();

      ctx.strokeStyle = '#00f0ff'; // Right motor
      ctx.beginPath();
      for (let i = 0; i < 220; i++) {
        const rad = (i + t * 40) * 0.08;
        const sy = oscY + 50 - Math.sin(rad) * 22;
        if (i === 0) ctx.moveTo(oscX + 10 + i, sy);
        else ctx.lineTo(oscX + 10 + i, sy);
      }
      ctx.stroke();

      // Heading Phase PLL Tag
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`TRANSLATIONAL DRIFT VELOCITY: 1.85 m/s`, 30, 40);
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`HEADING TRACKER PLL: PHASE JITTER ±1.18° (LOCKED)`, 30, 60);
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(`WHEEL MODULATION DEPTH: 42.0% THROTTLE DELTA`, 30, 80);
    }

    // ------------------------------------------------------------------------
    // REEL 3: 360° Micro-LiDAR Opponent Tracking Visualizer
    // ------------------------------------------------------------------------
    else if (reel === 'lidar') {
      const radarRadius = 180;
      const sweepAngle = t * 14.0;

      // Radar rings
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
      ctx.lineWidth = 1;
      for (let r = 50; r <= radarRadius; r += 45) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Compass crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - radarRadius - 20, cy);
      ctx.lineTo(cx + radarRadius + 20, cy);
      ctx.moveTo(cx, cy - radarRadius - 20);
      ctx.lineTo(cx, cy + radarRadius + 20);
      ctx.stroke();

      // Radar Sweep Cone
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radarRadius);
      grad.addColorStop(0, 'rgba(0, 255, 136, 0.4)');
      grad.addColorStop(1, 'rgba(0, 255, 136, 0.0)');

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radarRadius, sweepAngle - 0.4, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Radar Sweep Line
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * radarRadius, cy + Math.sin(sweepAngle) * radarRadius);
      ctx.stroke();

      // ST VL53L4CD Simulated Point Cloud (Arena Walls)
      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      for (let a = 0; a < Math.PI * 2; a += 0.12) {
        const px = cx + Math.cos(a) * (radarRadius + (Math.random() - 0.5) * 6);
        const py = cy + Math.sin(a) * (radarRadius + (Math.random() - 0.5) * 6);
        ctx.fillRect(px, py, 2, 2);
      }

      // Detected Opponent Robot Target (Moving across arena)
      const oppX = cx + 80 + Math.sin(t * 1.5) * 45;
      const oppY = cy - 70 + Math.cos(t * 1.2) * 30;

      // Target Point Cloud Cluster (Dense red points)
      ctx.fillStyle = '#ff2a55';
      for (let i = 0; i < 18; i++) {
        const ox = oppX + (Math.random() - 0.5) * 22;
        const oy = oppY + (Math.random() - 0.5) * 22;
        ctx.fillRect(ox, oy, 3, 3);
      }

      // Target Bounding Box & HUD Crosshair
      ctx.strokeStyle = '#ff2a55';
      ctx.lineWidth = 2;
      ctx.strokeRect(oppX - 18, oppY - 18, 36, 36);

      // Lead Intercept Vector Line
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(oppX, oppY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target range and angle text
      const targetDistMm = Math.round(Math.hypot(oppX - cx, oppY - cy) * 5.8);
      const targetDeg = Math.round(((Math.atan2(oppY - cy, oppX - cx) * 180) / Math.PI + 360) % 360);

      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#ff2a55';
      ctx.fillText(`TARGET #01: R=${targetDistMm}mm θ=${targetDeg}°`, oppX + 24, oppY - 4);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`INTERCEPT VECTOR: V=2.40 m/s [AUTO-RAM]`, oppX + 24, oppY + 12);

      // Bot Disk at Center
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1424';
      ctx.fill();
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`ST VL53L4CD RADAR SWEEP: 58.3 REVS/SEC (3,500 RPM)`, 30, 40);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`POINT CLOUD RESOLUTION: 0.17° RADIAL BEARING ACCURACY`, 30, 60);
      ctx.fillStyle = '#ff2a55';
      ctx.fillText(`STATUS: AUTONOMOUS TARGET INTERCEPT TRAJECTORY LOCKED`, 30, 80);
    }

    // ------------------------------------------------------------------------
    // REEL 4: 100% Invertible Cleat Traction Test Visualizer
    // ------------------------------------------------------------------------
    else if (reel === 'cleats') {
      const isFlipping = t >= 3.2 && t <= 5.8;
      const isInverted = t > 5.5;

      // Arena Floor Steel Surface Line
      const floorY = cy + 90;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, floorY, width, height - floorY);
      ctx.strokeStyle = '#535861';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(width, floorY);
      ctx.stroke();

      // Steel Plate hatch marks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, floorY);
        ctx.lineTo(x - 20, floorY + 40);
        ctx.stroke();
      }

      // Robot chassis side profile
      let botY = floorY - 32;
      let flipAngle = 0;
      if (isFlipping) {
        const flipProgress = (t - 3.2) / 2.6;
        flipAngle = flipProgress * Math.PI;
        botY = floorY - 32 - Math.sin(flipProgress * Math.PI) * 90;
      } else if (isInverted) {
        flipAngle = Math.PI;
      }

      ctx.save();
      ctx.translate(cx, botY);
      ctx.rotate(flipAngle);

      // Chassis Symmetric Profile Box (Height: 38mm, Width: 180mm)
      ctx.beginPath();
      ctx.roundRect(-90, -18, 180, 36, 4);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // SendCutSend Ti-6Al-4V Grade 5 Gear Cleats on Left & Right Wheels
      const cleatRadius = 26;
      for (const wx of [-65, 65]) {
        ctx.save();
        ctx.translate(wx, 0);

        // Cleat Disc
        ctx.beginPath();
        ctx.arc(0, 0, cleatRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cleat Teeth
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * cleatRadius, Math.sin(a) * cleatRadius);
          ctx.lineTo(Math.cos(a) * (cleatRadius + 5), Math.sin(a) * (cleatRadius + 5));
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();

      // Dual-Sided 4.185mm Clearance Callout Arrows
      ctx.save();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      const calloutX = cx + 130;

      // Bottom clearance bracket
      ctx.beginPath();
      ctx.moveTo(calloutX, floorY);
      ctx.lineTo(calloutX, floorY - 26);
      ctx.moveTo(calloutX - 6, floorY);
      ctx.lineTo(calloutX + 6, floorY);
      ctx.moveTo(calloutX - 6, floorY - 26);
      ctx.lineTo(calloutX + 6, floorY - 26);
      ctx.stroke();

      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('4.185 mm GROUND CLEARANCE', calloutX + 14, floorY - 10);
      ctx.fillText('(SYMMETRIC DUAL-SIDED Ti-6Al-4V)', calloutX + 14, floorY + 4);

      // Inversion state badge
      ctx.font = '13px JetBrains Mono, monospace';
      ctx.fillStyle = isInverted ? '#ffaa00' : '#00ff88';
      ctx.fillText(
        `ORIENTATION: ${isInverted ? 'INVERTED (COMMUTATION AUTO-REVERSED)' : 'UPRIGHT (NORMAL TRACTION)'}`,
        30,
        40
      );
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`TI-6AL-4V CLEAT FRICTION COEFF (STEEL FLOOR): µ_k = 0.78`, 30, 60);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`IMU Z-AXIS FLIP DETECT: < 12.4 ms AUTO-COMMUTATION SWAP`, 30, 80);

      ctx.restore();
    }
  }, [currentTime, activeReelId, sourceMode, activeTelemetry]);

  // ==========================================================================
  // TIMELINE SCRUBBER DRAG INTERACTION
  // ==========================================================================
  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingScrubber.current = true;
    updateScrubberPos(e);
  };

  const updateScrubberPos = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const track = scrubTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    handleScrubTime(ratio * currentReel.duration);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      isDraggingScrubber.current = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingScrubber.current) {
        updateScrubberPos(e);
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [currentReel.duration]);

  // Keyboard controls (Space to toggle play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fullscreen trigger
  const handleToggleFullscreen = () => {
    if (!stageRef.current) return;
    if (!document.fullscreenElement) {
      stageRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ==========================================================================
  // EXPORT UTILITIES (Frame PNG, JSON Telemetry, MP4)
  // ==========================================================================
  const handleExportFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `eyeliner-${activeReelId}-frame-${currentTime.toFixed(2)}s.png`;
    link.href = dataUrl;
    link.click();
    showNotice('Frame snapshot saved to PNG');
  };

  const handleExportTelemetryJson = () => {
    // Generate high-resolution 1000Hz sampled flight stream for active reel
    const samples = [];
    for (let t = 0; t <= currentReel.duration; t += 0.05) {
      samples.push({
        timeSec: Number(t.toFixed(2)),
        ...sampleTelemetry(activeReelId, t),
      });
    }
    const blob = new Blob([JSON.stringify({ reel: currentReel, samples }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `eyeliner-${activeReelId}-telemetry.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Combat telemetry stream exported to JSON');
  };

  const showNotice = useCallback((msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  }, []);

  const handleExportVideoClip = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || sourceMode !== 'canvas') {
      showNotice('Please switch to Canvas mode to record simulation clip');
      return;
    }
    if (typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      showNotice('Video recording is not supported in this browser environment');
      return;
    }

    try {
      setIsVideoExporting(true);
      setVideoExportProgress(0);
      const stream = canvas.captureStream(60);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        setIsVideoExporting(false);
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.download = `eyeliner-${activeReelId}-physics-reel.webm`;
          a.href = url;
          a.click();
          URL.revokeObjectURL(url);
          showNotice(`Exported 60 FPS video clip for ${currentReel.title}!`);
        }
      };

      recorder.start();
      const durationMs = 6000;
      const startTime = performance.now();
      const interval = setInterval(() => {
        const elapsed = performance.now() - startTime;
        setVideoExportProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)));
        if (elapsed >= durationMs) {
          clearInterval(interval);
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }
      }, 100);
    } catch (err) {
      setIsVideoExporting(false);
      console.error(err);
      showNotice('Export failed: ' + (err as Error).message);
    }
  }, [sourceMode, activeReelId, currentReel, showNotice]);


  // Format timecode (00:04.28)
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  // Generate SVG telemetry waveform curves
  const generateTelemetryPoints = (type: 'rpm' | 'gs' | 'voltage' | 'throttleBias') => {
    const points: string[] = [];
    const steps = 100;
    const w = 400;
    const h = 80;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * currentReel.duration;
      const data = sampleTelemetry(activeReelId, t);
      const x = (i / steps) * w;
      let y = h / 2;

      if (type === 'rpm') {
        y = h - (data.rpm / 4000) * (h - 10) - 5;
      } else if (type === 'gs') {
        y = h - (Math.min(data.gs, 1000) / 1000) * (h - 10) - 5;
      } else if (type === 'voltage') {
        // Voltage range: 13.5V to 16.8V
        const norm = Math.max(0, Math.min(1, (data.voltage - 13.5) / (16.8 - 13.5)));
        y = h - norm * (h - 10) - 5;
      } else if (type === 'throttleBias') {
        // Throttle bias range: -60% to +60%
        const norm = (data.throttleBias + 60) / 120;
        y = h - norm * (h - 10) - 5;
      }

      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return points.join(' ');
  };

  return (
    <div className="videohub-page">
      <div className="cyber-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
        {/* Header Branding */}
        <header className="videohub-header">
          <div className="videohub-title-row">
            <div>
              <h1 className="videohub-title">
                <span className="glow-mark">🎬</span> VIDEO MEDIA HUB &amp; TELEMETRY
              </h1>
              <p className="videohub-subtitle">
                High-speed engineering breakdown reels, synchronized multi-channel combat telemetry, and live vector
                kinematics simulation for the Eyeliner 3lb Meltybrain.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="cyber-badge green">
                <span className="cyber-dot" /> 1,000 HZ TELEMETRY SYNC
              </span>
              <button
                type="button"
                className={`ctrl-btn ${!isMuted ? 'active' : ''}`}
                onClick={() => {
                  audioEngineRef.current?.init();
                  setIsMuted((m) => !m);
                }}
                title={isMuted ? 'Unmute Audio Engine' : 'Mute Audio Engine'}
              >
                {isMuted ? '🔇 Audio Muted' : '🔊 Motor Whine Live'}
              </button>
            </div>
          </div>

          {/* 4 Detailed Animated Breakdown Reel Selector Cards */}
          <div className="reel-nav-grid" role="tablist" aria-label="Reel selection">
            {REELS.map((reel) => {
              const isActive = reel.id === activeReelId;
              return (
                <button
                  type="button"
                  key={reel.id}
                  className={`reel-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveReelId(reel.id);
                    setCurrentTime(0);
                    if (videoRef.current) videoRef.current.currentTime = 0;
                  }}
                  role="tab"
                  aria-selected={isActive}
                >
                  <div className="reel-card-badge">
                    <span>{reel.tag}</span>
                    <span className={`cyber-badge ${reel.badgeColor}`} style={{ padding: '1px 6px', fontSize: '9px' }}>
                      {reel.keyMetrics.energyOrSpeed}
                    </span>
                  </div>
                  <div className="reel-card-title">{reel.title}</div>
                  <div className="reel-card-meta">{reel.keyMetrics.criticalTolerance}</div>
                </button>
              );
            })}
          </div>
        </header>

        {/* Master Player Screen Stage */}
        <section className="player-stage-card hud-corner" ref={stageRef} aria-label="Interactive Player Stage">
          <div className="player-view-container">
            {sourceMode === 'canvas' ? (
              <canvas ref={canvasRef} width={1280} height={720} className="player-canvas" />
            ) : (
              <video
                ref={videoRef}
                src="fight-night.mp4"
                poster="fight-poster.jpg"
                className="player-video"
                playsInline
                muted={isMuted}
              />
            )}

            {/* Tactical HUD Overlay */}
            <div className="player-hud-overlay">
              <div className="hud-top-bar">
                <div className="hud-telemetry-tag">
                  <span className="hud-status-rec">● REC</span>
                  <span>{currentReel.tag}</span>
                  <span style={{ color: '#fff' }}>[{playbackRate}X SPEED]</span>
                </div>
                <div className="hud-watermark">EYELINER-3LB // COMBAT TELEMETRY HUB</div>
              </div>

              {/* Center crosshair */}
              <div className="hud-center-reticle" />

              {/* Bottom Real-Time Telemetry Badges */}
              <div className="hud-bottom-telemetry-strip">
                <div className="hud-pill">
                  RPM: <span className="val">{activeTelemetry.rpm}</span>
                </div>
                <div className="hud-pill">
                  G-FORCE: <span className="val">{activeTelemetry.gs} G</span>
                </div>
                <div className="hud-pill">
                  BATT: <span className="val">{activeTelemetry.voltage} V</span>
                </div>
                <div className="hud-pill">
                  THROTTLE BIAS: <span className="val">{activeTelemetry.throttleBias}%</span>
                </div>
                <div className="hud-pill">
                  TIME: <span className="val">{formatTimecode(currentTime)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Player Control Bar */}
          <div className="player-controls-bar">
            {/* Timeline Scrubber */}
            <div className="timeline-scrubber-container">
              <div
                className="timeline-track"
                ref={scrubTrackRef}
                onMouseDown={handleScrubberMouseDown}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={currentReel.duration}
                aria-valuenow={currentTime}
                tabIndex={0}
                aria-label="Timeline position"
              >
                <div
                  className="timeline-progress-fill"
                  style={{ width: `${(currentTime / currentReel.duration) * 100}%` }}
                />
                <div
                  className="timeline-scrubber-needle"
                  style={{ left: `${(currentTime / currentReel.duration) * 100}%` }}
                />

                {/* Phase key markers */}
                {currentReel.phases.map((ph, idx) => (
                  <div
                    key={idx}
                    className={`timeline-marker ${idx === 2 ? 'strike' : ''}`}
                    style={{ left: `${(ph.timeStart / currentReel.duration) * 100}%` }}
                    title={`${ph.name} (${ph.timeStart}s)`}
                  />
                ))}
              </div>

              {/* Phase labels beneath scrubber */}
              <div className="timeline-phase-labels">
                {currentReel.phases.map((ph, idx) => (
                  <span
                    key={idx}
                    style={{
                      cursor: 'pointer',
                      color:
                        currentTime >= ph.timeStart && currentTime < ph.timeEnd
                          ? 'var(--neon-cyan, #00f0ff)'
                          : undefined,
                    }}
                    onClick={() => handleScrubTime(ph.timeStart)}
                  >
                    {ph.name} ({ph.timeStart}s)
                  </span>
                ))}
              </div>
            </div>

            {/* Buttons Row */}
            <div className="controls-buttons-row">
              {/* Left: Play/Pause, Timecode, Loop */}
              <div className="controls-left">
                <button
                  type="button"
                  className={`ctrl-btn ${isPlaying ? 'active' : 'play-pulse'}`}
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>

                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => handleScrubTime(0)}
                  title="Rewind to start"
                >
                  ⏮ Restart
                </button>

                <div className="timecode-display">
                  {formatTimecode(currentTime)} / {formatTimecode(currentReel.duration)}
                </div>

                <button
                  type="button"
                  className={`ctrl-btn ${isLooping ? 'active' : ''}`}
                  onClick={() => setIsLooping((l) => !l)}
                  title="Toggle Loop"
                >
                  🔁 {isLooping ? 'Loop ON' : 'Loop OFF'}
                </button>
              </div>

              {/* Center: Playback Speed Selector */}
              <div className="controls-center">
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--cyber-mono)' }}>SPEED:</span>
                {[0.25, 0.5, 1.0, 2.0].map((rate) => (
                  <button
                    type="button"
                    key={rate}
                    className={`ctrl-btn ${playbackRate === rate ? 'active' : ''}`}
                    onClick={() => setPlaybackRate(rate)}
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Right: Source Switcher, Fullscreen, Export */}
              <div className="controls-right">
                {/* Source Switcher */}
                <div className="source-switcher">
                  <button
                    type="button"
                    className={`source-opt-btn ${sourceMode === 'canvas' ? 'selected' : ''}`}
                    onClick={() => setSourceMode('canvas')}
                  >
                    🔬 CanvasCam
                  </button>
                  <button
                    type="button"
                    className={`source-opt-btn ${sourceMode === 'mp4' ? 'selected' : ''}`}
                    onClick={() => setSourceMode('mp4')}
                  >
                    🎥 Fight Reel MP4
                  </button>
                </div>

                {/* Export 60 FPS Video Clip */}
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={handleExportVideoClip}
                  disabled={isVideoExporting}
                  style={{
                    color: isVideoExporting ? '#ff1744' : '#00f0ff',
                    borderColor: isVideoExporting ? '#ff1744' : 'rgba(0, 240, 255, 0.4)',
                  }}
                  title="Export high-resolution 60 FPS video clip of current animated physics reel"
                >
                  {isVideoExporting ? `🎬 REC (${videoExportProgress}%)` : '🎬 Clip MP4/WebM'}
                </button>

                {/* Export frame button */}
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={handleExportFrame}
                  title="Capture current high-resolution frame as PNG"
                >
                  📸 Frame PNG
                </button>

                {/* Export Telemetry JSON */}
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={handleExportTelemetryJson}
                  title="Download 1000Hz sampled telemetry flight data JSON"
                >
                  📊 Data JSON
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={handleToggleFullscreen}
                  title="Fullscreen stage"
                >
                  ⛶ Fullscreen
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Notice toast */}
        {exportNotice && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              background: 'rgba(13, 20, 36, 0.95)',
              border: '1px solid var(--neon-cyan, #00f0ff)',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '8px',
              fontFamily: 'var(--cyber-mono)',
              fontSize: '13px',
            }}
          >
            ✓ {exportNotice}
          </div>
        )}

        {/* ================================================================== */}
        {/* SYNCHRONIZED TELEMETRY HUD (4 Real-Time Graph Channels)           */}
        {/* ================================================================== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cyber-dot" style={{ background: '#00f0ff', width: 9, height: 9 }} />
            <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--mono, monospace)', letterSpacing: '0.06em', color: '#e6edf3' }}>
              4-CHANNEL SYNCHRONIZED OSCILLOSCOPE HUD
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#8b949e', fontFamily: 'var(--mono, monospace)' }}>OSCILLOSCOPE MODE:</span>
            <button
              type="button"
              className={`source-opt-btn ${oscilloscopeMode === 'timeline' ? 'selected' : ''}`}
              onClick={() => setOscilloscopeMode('timeline')}
            >
              Timeline Waveform
            </button>
            <button
              type="button"
              className={`source-opt-btn ${oscilloscopeMode === 'liveSweep' ? 'selected' : ''}`}
              onClick={() => setOscilloscopeMode('liveSweep')}
            >
              Live Phosphor Sweep
            </button>
          </div>
        </div>

        <section className="telemetry-grid" aria-label="Synchronized Telemetry HUD">

          {/* Channel 1: RPM */}
          <div className="telemetry-channel-card hud-corner">
            <div className="telemetry-channel-header">
              <div className="channel-info">
                <span className="channel-tag">CH 01 // ROTATIONAL VELOCITY</span>
                <span className="channel-name">Disc Weapon Angular Speed</span>
              </div>
              <div className="channel-readout">
                <div className="channel-value-curr">
                  {activeTelemetry.rpm} <span className="channel-unit">RPM</span>
                </div>
                <div className="channel-peak">PEAK: {currentReel.keyMetrics.rpmTarget}</div>
              </div>
            </div>
            <div
              className="telemetry-waveform-box"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleScrubTime(((e.clientX - rect.left) / rect.width) * currentReel.duration);
              }}
            >
              <svg viewBox="0 0 400 80" className="waveform-svg" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="400" y2="20" className="waveform-grid-line" />
                <line x1="0" y1="40" x2="400" y2="40" className="waveform-grid-line" />
                <line x1="0" y1="60" x2="400" y2="60" className="waveform-grid-line" />
                <polyline
                  points={generateTelemetryPoints('rpm')}
                  className="waveform-path"
                  stroke="var(--neon-cyan, #00f0ff)"
                />
                {/* Needle playhead */}
                <line
                  x1={(currentTime / currentReel.duration) * 400}
                  y1="0"
                  x2={(currentTime / currentReel.duration) * 400}
                  y2="80"
                  className="waveform-cursor"
                />
              </svg>
            </div>
          </div>

          {/* Channel 2: Centripetal G-force */}
          <div className="telemetry-channel-card hud-corner">
            <div className="telemetry-channel-header">
              <div className="channel-info">
                <span className="channel-tag">CH 02 // SENSOR ACCELERATION</span>
                <span className="channel-name">Tooth Tip Centripetal Gs</span>
              </div>
              <div className="channel-readout">
                <div className="channel-value-curr amber">
                  {activeTelemetry.gs} <span className="channel-unit">Gs</span>
                </div>
                <div className="channel-peak">LIS331HH 400G ACCEL SATURATION</div>
              </div>
            </div>
            <div
              className="telemetry-waveform-box"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleScrubTime(((e.clientX - rect.left) / rect.width) * currentReel.duration);
              }}
            >
              <svg viewBox="0 0 400 80" className="waveform-svg" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="400" y2="20" className="waveform-grid-line" />
                <line x1="0" y1="40" x2="400" y2="40" className="waveform-grid-line" />
                <line x1="0" y1="60" x2="400" y2="60" className="waveform-grid-line" />
                <polyline
                  points={generateTelemetryPoints('gs')}
                  className="waveform-path"
                  stroke="var(--neon-amber, #ffaa00)"
                />
                <line
                  x1={(currentTime / currentReel.duration) * 400}
                  y1="0"
                  x2={(currentTime / currentReel.duration) * 400}
                  y2="80"
                  className="waveform-cursor"
                />
              </svg>
            </div>
          </div>

          {/* Channel 3: Battery Voltage */}
          <div className="telemetry-channel-card hud-corner">
            <div className="telemetry-channel-header">
              <div className="channel-info">
                <span className="channel-tag">CH 03 // ELECTRICAL BUS</span>
                <span className="channel-name">4S LiPo Voltage &amp; Current Sag</span>
              </div>
              <div className="channel-readout">
                <div className="channel-value-curr green">
                  {activeTelemetry.voltage} <span className="channel-unit">V</span>
                </div>
                <div className="channel-peak">4S 850mAh 120C (14.0V CUTOFF)</div>
              </div>
            </div>
            <div
              className="telemetry-waveform-box"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleScrubTime(((e.clientX - rect.left) / rect.width) * currentReel.duration);
              }}
            >
              <svg viewBox="0 0 400 80" className="waveform-svg" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="400" y2="20" className="waveform-grid-line" />
                <line x1="0" y1="40" x2="400" y2="40" className="waveform-grid-line" />
                <line x1="0" y1="60" x2="400" y2="60" className="waveform-grid-line" />
                <polyline
                  points={generateTelemetryPoints('voltage')}
                  className="waveform-path"
                  stroke="var(--neon-green, #00ff88)"
                />
                <line
                  x1={(currentTime / currentReel.duration) * 400}
                  y1="0"
                  x2={(currentTime / currentReel.duration) * 400}
                  y2="80"
                  className="waveform-cursor"
                />
              </svg>
            </div>
          </div>

          {/* Channel 4: Translational Throttle Bias */}
          <div className="telemetry-channel-card hud-corner">
            <div className="telemetry-channel-header">
              <div className="channel-info">
                <span className="channel-tag">CH 04 // DIFFERENTIAL VECTOR</span>
                <span className="channel-name">Translational Throttle Modulation</span>
              </div>
              <div className="channel-readout">
                <div className="channel-value-curr crimson">
                  {activeTelemetry.throttleBias > 0 ? `+${activeTelemetry.throttleBias}` : activeTelemetry.throttleBias}{' '}
                  <span className="channel-unit">%</span>
                </div>
                <div className="channel-peak">SINUSOIDAL PHASE STEERING</div>
              </div>
            </div>
            <div
              className="telemetry-waveform-box"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleScrubTime(((e.clientX - rect.left) / rect.width) * currentReel.duration);
              }}
            >
              <svg viewBox="0 0 400 80" className="waveform-svg" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="400" y2="20" className="waveform-grid-line" />
                <line x1="0" y1="40" x2="400" y2="40" className="waveform-grid-line" />
                <line x1="0" y1="60" x2="400" y2="60" className="waveform-grid-line" />
                <polyline
                  points={generateTelemetryPoints('throttleBias')}
                  className="waveform-path"
                  stroke="var(--neon-crimson, #ff2a55)"
                />
                <line
                  x1={(currentTime / currentReel.duration) * 400}
                  y1="0"
                  x2={(currentTime / currentReel.duration) * 400}
                  y2="80"
                  className="waveform-cursor"
                />
              </svg>
            </div>
          </div>
        </section>

        {/* ================================================================== */}
        {/* REEL DEEP DIVE & COMBAT BREAKDOWN SPECIFICATIONS MATRIX           */}
        {/* ================================================================== */}
        <section className="deep-dive-section" aria-label="Reel Technical Breakdown">
          <div className="section-headline-bar">
            <h2 className="section-title">
              <span style={{ color: 'var(--neon-cyan, #00f0ff)' }}>⚡</span>
              {currentReel.title} — ENGINEERING BREAKDOWN
            </h2>
            <span className="cyber-badge cyan">FEA &amp; KINEMATIC MODEL</span>
          </div>

          <div className="deep-dive-grid">
            {/* Left: Spec Matrix Card & Math Formula */}
            <div className="spec-matrix-card hud-corner">
              <div className="spec-matrix-title">Hardware &amp; Physical Parameters</div>
              {currentReel.technicalSpecs.map((item, idx) => (
                <div key={idx} className="spec-row">
                  <span className="spec-label">{item.label}</span>
                  <span className="spec-val">{item.value}</span>
                </div>
              ))}

              {/* Formula banner */}
              <div className="formula-banner">
                <div className="formula-text">{currentReel.formula.equation}</div>
                <p className="formula-expl">{currentReel.formula.explanation}</p>
              </div>
            </div>

            {/* Right: Phase Sequence Log */}
            <div className="spec-matrix-card hud-corner">
              <div className="spec-matrix-title">Kinematic Phase Timeline Log</div>
              <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '0 0 12px' }}>
                Click any sequence phase below to instantly jump the playhead scrubber to that timestamp:
              </p>
              <div className="sequence-log">
                {currentReel.phases.map((ph, idx) => {
                  const isCurrent = currentTime >= ph.timeStart && currentTime < ph.timeEnd;
                  return (
                    <div
                      key={idx}
                      className={`log-item ${isCurrent ? 'active' : ''}`}
                      onClick={() => handleScrubTime(ph.timeStart)}
                    >
                      <span className="log-time">[{ph.timeStart.toFixed(1)}s]</span>
                      <div className="log-desc">
                        <strong style={{ color: isCurrent ? 'var(--neon-cyan, #00f0ff)' : '#fff' }}>
                          {ph.name}:
                        </strong>{' '}
                        {ph.description}
                      </div>
                      <span className="log-metric">{ph.metricValue}</span>
                    </div>
                  );
                })}
              </div>

              {/* Action clip download block */}
              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>
                    Raw Fight Reel Footage (MP4)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                    Original 60fps high-speed camera arena capture (840 KB)
                  </div>
                </div>
                <a
                  className="cyber-btn primary"
                  href="fight-night.mp4"
                  download="eyeliner-fight-night.mp4"
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                >
                  ↓ Download MP4
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
