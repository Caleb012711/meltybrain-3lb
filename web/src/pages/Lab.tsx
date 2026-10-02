/* oxlint-disable react/immutability, react/refs, react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useCallback } from 'react';
import '../cyber-combat.css';

// Combat Constants
const MAX_TEST_RPM = 3500;
const ABSOLUTE_CUTOFF_RPM = 4000;
const SENSOR_RADIUS_M = 0.025; // 25mm radius
const GRAVITY_MSS = 9.80665;

type Opponent = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  health: number;
  destroyed: boolean;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

export function Lab() {
  // Simulator State
  const [armed, setArmed] = useState(false);
  const [throttle, setThrottle] = useState(0); // 0 to 1
  const [currentRpm, setCurrentRpm] = useState(0);
  const [overdrive, setOverdrive] = useState(false);
  const [autoRam, setAutoRam] = useState(false);
  const [driveMode, setDriveMode] = useState<'Normal' | 'Acro' | 'Orbit-Lock'>('Normal');
  const [selectedOpponent, setSelectedOpponent] = useState<string>('tombstone');
  const [impactG, setImpactG] = useState(0);
  const [totalHits, setTotalHits] = useState(0);

  // Translation Vector (from Virtual RadioMaster Pocket)
  const [transVector, setTransVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const transVectorRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);
  const throttleRef = useRef(0);
  const autoRamRef = useRef(false);
  const overdriveRef = useRef(false);

  useEffect(() => { transVectorRef.current = transVector; }, [transVector]);
  useEffect(() => { armedRef.current = armed; }, [armed]);
  useEffect(() => { throttleRef.current = throttle; }, [throttle]);
  useEffect(() => { autoRamRef.current = autoRam; }, [autoRam]);
  useEffect(() => { overdriveRef.current = overdrive; }, [overdrive]);

  // Canvas Refs
  const arenaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const accelCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Physics simulation data
  const robotPosRef = useRef({ x: 300, y: 300, vx: 0, vy: 0, angle: 0, headingAngle: 0 });
  const rpmRef = useRef(0);
  const sparksRef = useRef<Spark[]>([]);
  const opponentsRef = useRef<Opponent[]>([
    { id: 'tombstone', name: 'TOMBSTONE JR', type: 'Horizontal Bar', x: 450, y: 200, vx: -0.8, vy: 0.5, radius: 24, color: '#ff2a55', health: 100, destroyed: false },
    { id: 'wedge', name: 'WEDGE-HOUND', type: 'Plow Rammer', x: 180, y: 420, vx: 0.6, vy: -0.4, radius: 22, color: '#ffaa00', health: 100, destroyed: false },
    { id: 'drum', name: 'DRUM-FIEND', type: 'Eggbeater Drum', x: 420, y: 450, vx: -0.4, vy: -0.7, radius: 20, color: '#a855f7', health: 100, destroyed: false },
  ]);

  // Waveform history buffers for Dual Accel Oscilloscope
  const accelHistoryRef = useRef<{ s1: number; s2: number; rpm: number }[]>([]);

  // Dragging states for Virtual RadioMaster Pocket gimbals
  const rightStickRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRight = useRef(false);

  // Keyboard navigation
  useEffect(() => {
    const keysDown = new Set<string>();

    const updateFromKeys = () => {
      let x = 0;
      let y = 0;
      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) y -= 1;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) y += 1;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) x -= 1;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) x += 1;

      // Normalize diagonal vector
      const mag = Math.hypot(x, y);
      if (mag > 0) {
        setTransVector({ x: x / mag, y: y / mag });
      } else if (!isDraggingRight.current) {
        setTransVector({ x: 0, y: 0 });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysDown.add(e.code);

      if (e.code === 'Space') {
        // Emergency Spin Kill / Brake
        setThrottle(0);
        setArmed(false);
      } else if (e.code === 'KeyR') {
        // Reset Arena
        robotPosRef.current = { x: 300, y: 300, vx: 0, vy: 0, angle: 0, headingAngle: 0 };
        opponentsRef.current.forEach((opp) => { opp.health = 100; opp.destroyed = false; });
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setOverdrive(true);
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
  }, []);

  // Main 60FPS Physics, Radar, and Waveform Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let radarAngle = 0;

    const runPhysicsLoop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // 1. Motor & Spin Dynamics
      const maxTargetRpm = overdriveRef.current ? ABSOLUTE_CUTOFF_RPM : MAX_TEST_RPM;
      const targetRpm = armedRef.current ? throttleRef.current * maxTargetRpm : 0;
      const spinTau = armedRef.current ? 1.2 : 2.5; // Acceleration & coasting
      rpmRef.current += (targetRpm - rpmRef.current) * (1 - Math.exp(-dt / spinTau));
      if (Math.abs(rpmRef.current - targetRpm) < 2) rpmRef.current = targetRpm;
      setCurrentRpm(Math.round(rpmRef.current));

      const bot = robotPosRef.current;
      const radPerSec = (rpmRef.current * 2 * Math.PI) / 60;
      bot.angle += radPerSec * dt;

      // 2. Translational Drive Physics (Meltybrain modulation)
      // Only translates if spinning fast enough (>800 RPM)
      const minSpinThreshold = 800;
      const spinFactor = Math.min(1, Math.max(0, (rpmRef.current - minSpinThreshold) / 1500));

      let moveX = transVectorRef.current.x;
      let moveY = transVectorRef.current.y;

      // Auto-Ram AI navigation override
      if (autoRamRef.current && armedRef.current && rpmRef.current > 1200) {
        const target = opponentsRef.current.find((o) => o.id === selectedOpponent && !o.destroyed) ||
                       opponentsRef.current.find((o) => !o.destroyed);
        if (target) {
          const dx = target.x - bot.x;
          const dy = target.y - bot.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            // Proportional lead pursuit
            moveX = (dx + target.vx * 12) / dist;
            moveY = (dy + target.vy * 12) / dist;
            transVectorRef.current = { x: moveX, y: moveY };
          }
        }
      }

      const maxSpeed = 160; // Arena px/s
      const targetVx = moveX * maxSpeed * spinFactor;
      const targetVy = moveY * maxSpeed * spinFactor;
      const accelK = 5.0;
      bot.vx += (targetVx - bot.vx) * (1 - Math.exp(-accelK * dt));
      bot.vy += (targetVy - bot.vy) * (1 - Math.exp(-accelK * dt));
      bot.x += bot.vx * dt;
      bot.y += bot.vy * dt;

      // Virtual Stroboscopic Heading calculation
      if (Math.hypot(moveX, moveY) > 0.05) {
        bot.headingAngle = Math.atan2(moveY, moveX);
      }

      // Arena boundary collision (Arena circle radius 260, center 300, 300)
      const arenaCenter = { x: 300, y: 300 };
      const arenaRadius = 260;
      const botRadius = 22;
      const distFromCenter = Math.hypot(bot.x - arenaCenter.x, bot.y - arenaCenter.y);

      if (distFromCenter > arenaRadius - botRadius) {
        const nx = (bot.x - arenaCenter.x) / distFromCenter;
        const ny = (bot.y - arenaCenter.y) / distFromCenter;
        bot.x = arenaCenter.x + nx * (arenaRadius - botRadius);
        bot.y = arenaCenter.y + ny * (arenaRadius - botRadius);

        // Wall impact bounce
        const dot = bot.vx * nx + bot.vy * ny;
        if (dot > 0) {
          bot.vx -= 1.6 * dot * nx;
          bot.vy -= 1.6 * dot * ny;

          // Wall sparks if high RPM
          if (rpmRef.current > 1000) {
            for (let i = 0; i < 8; i++) {
              sparksRef.current.push({
                x: bot.x,
                y: bot.y,
                vx: -nx * (100 + Math.random() * 150) + (Math.random() - 0.5) * 80,
                vy: -ny * (100 + Math.random() * 150) + (Math.random() - 0.5) * 80,
                life: 0,
                maxLife: 0.2 + Math.random() * 0.3,
                color: '#00f0ff',
              });
            }
          }
        }
      }

      // 3. Opponent Bot AI & Collisions
      opponentsRef.current.forEach((opp) => {
        if (opp.destroyed) return;

        // Opponent movement
        opp.x += opp.vx;
        opp.y += opp.vy;

        // Opponent arena bounce
        const oppDist = Math.hypot(opp.x - arenaCenter.x, opp.y - arenaCenter.y);
        if (oppDist > arenaRadius - opp.radius) {
          const onx = (opp.x - arenaCenter.x) / oppDist;
          const ony = (opp.y - arenaCenter.y) / oppDist;
          opp.vx = -onx * Math.abs(opp.vx) * 1.05 + (Math.random() - 0.5) * 0.4;
          opp.vy = -ony * Math.abs(opp.vy) * 1.05 + (Math.random() - 0.5) * 0.4;
        }

        // Collision with Eyeliner 3lb Meltybrain!
        const cdx = opp.x - bot.x;
        const cdy = opp.y - bot.y;
        const cdist = Math.hypot(cdx, cdy);
        const minDist = opp.radius + botRadius;

        if (cdist < minDist) {
          const overlap = minDist - cdist;
          const nx = cdx / (cdist || 1);
          const ny = cdy / (cdist || 1);

          opp.x += nx * overlap;
          opp.y += ny * overlap;

          // Kinetic impact calculation (E = 1/2 I w^2)
          const spinEnergyRatio = (rpmRef.current / MAX_TEST_RPM);
          const impactForce = 150 + spinEnergyRatio * 450;

          opp.vx = nx * (impactForce * 0.04);
          opp.vy = ny * (impactForce * 0.04);
          bot.vx -= nx * (impactForce * 0.015);
          bot.vy -= ny * (impactForce * 0.015);

          const dmg = Math.round(15 + spinEnergyRatio * 45);
          opp.health = Math.max(0, opp.health - dmg);
          if (opp.health === 0) opp.destroyed = true;

          // Accelerometer spike (centripetal + tangential shock up to 400g)
          const gSpike = Math.min(400, Math.round(180 + spinEnergyRatio * 200 + Math.random() * 40));
          setImpactG(gSpike);
          setTotalHits((h) => h + 1);

          // Kinetic sparks explosion
          for (let s = 0; s < 18; s++) {
            sparksRef.current.push({
              x: bot.x + nx * botRadius,
              y: bot.y + ny * botRadius,
              vx: nx * (80 + Math.random() * 200) + (Math.random() - 0.5) * 120,
              vy: ny * (80 + Math.random() * 200) + (Math.random() - 0.5) * 120,
              life: 0,
              maxLife: 0.3 + Math.random() * 0.4,
              color: Math.random() > 0.4 ? '#ffaa00' : '#ff2a55',
            });
          }
        }
      });

      // Update sparks
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life += dt;
        if (sp.life >= sp.maxLife) {
          sparksRef.current.splice(i, 1);
        }
      }

      // 4. Dual Accelerometer Telemetry Math
      const omega = radPerSec;
      const centripetalGs = (omega * omega * SENSOR_RADIUS_M) / GRAVITY_MSS;
      // Sensor 1 and Sensor 2 with slight vibration jitter & impact spikes
      const jitter1 = (Math.random() - 0.5) * (centripetalGs * 0.04);
      const jitter2 = (Math.random() - 0.5) * (centripetalGs * 0.04);
      const sensor1G = Math.min(400, centripetalGs + jitter1);
      const sensor2G = Math.min(400, centripetalGs * 0.98 + jitter2);

      accelHistoryRef.current.push({
        s1: sensor1G,
        s2: sensor2G,
        rpm: rpmRef.current,
      });
      if (accelHistoryRef.current.length > 200) {
        accelHistoryRef.current.shift();
      }

      // 5. Render Canvas Views
      drawArenaCanvas();
      drawRadarCanvas(radarAngle);
      drawAccelCanvas();

      radarAngle = (radarAngle + 4.5 * dt) % (2 * Math.PI);
      animId = requestAnimationFrame(runPhysicsLoop);
    };

    animId = requestAnimationFrame(runPhysicsLoop);
    return () => cancelAnimationFrame(animId);
  }, [selectedOpponent]);

  // Draw Arena Canvas
  const drawArenaCanvas = useCallback(() => {
    const canvas = arenaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Arena Background & Hex Grid
    ctx.save();
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Hexagonal / Round Combat Arena Boundary
    ctx.beginPath();
    ctx.arc(300, 300, 260, 0, 2 * Math.PI);
    ctx.fillStyle = '#0c1220';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#00f0ff';
    ctx.stroke();

    // Secondary inner steel perimeter
    ctx.beginPath();
    ctx.arc(300, 300, 256, 0, 2 * Math.PI);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.stroke();

    // Arena Floor Grid Lines
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

    // Render Sparks
    sparksRef.current.forEach((sp) => {
      const alpha = 1 - sp.life / sp.maxLife;
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.2, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Render Opponent Combat Bots
    opponentsRef.current.forEach((opp) => {
      ctx.save();
      ctx.translate(opp.x, opp.y);

      if (opp.destroyed) {
        // Smoking wreck
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(0, 0, opp.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.stroke();
        ctx.fillStyle = '#ff2a55';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DEAD', 0, 3);
      } else {
        // Active Opponent Bot
        ctx.fillStyle = opp.color;
        ctx.beginPath();
        ctx.arc(0, 0, opp.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        // Weapon indicator
        ctx.fillStyle = '#fff';
        ctx.fillRect(-opp.radius - 4, -3, 8, 6);
        ctx.fillRect(opp.radius - 4, -3, 8, 6);

        // Name & Health bar above bot
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-22, -opp.radius - 18, 44, 7);
        ctx.fillStyle = opp.health > 40 ? '#00ff88' : '#ff2a55';
        ctx.fillRect(-21, -opp.radius - 17, (opp.health / 100) * 42, 5);

        ctx.fillStyle = '#fff';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(opp.name, 0, -opp.radius - 22);

        // If target locked by Auto-Ram
        if (autoRamRef.current && opp.id === selectedOpponent) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(-opp.radius - 6, -opp.radius - 6, opp.radius * 2 + 12, opp.radius * 2 + 12);
        }
      }
      ctx.restore();
    });

    // Render Eyeliner 3lb Meltybrain
    const bot = robotPosRef.current;
    ctx.save();
    ctx.translate(bot.x, bot.y);

    // Render Stroboscopic Virtual LED Heading Beacon!
    if (rpmRef.current > 400 && armedRef.current) {
      const beamDist = 180;
      const flashSpread = 0.28; // ~16 degrees
      const heading = bot.headingAngle;

      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, beamDist);
      grad.addColorStop(0, 'rgba(0, 255, 136, 0.75)');
      grad.addColorStop(0.4, 'rgba(0, 240, 255, 0.45)');
      grad.addColorStop(1, 'rgba(0, 240, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, beamDist, heading - flashSpread, heading + flashSpread);
      ctx.closePath();
      ctx.fill();

      // Heading guideline
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(heading) * beamDist, Math.sin(heading) * beamDist);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Auto-Ram Trajectory Vector line to target
    if (autoRamRef.current && armedRef.current) {
      const target = opponentsRef.current.find((o) => o.id === selectedOpponent && !o.destroyed);
      if (target) {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(target.x - bot.x, target.y - bot.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Rotating robot chassis & AR500 teeth
    ctx.rotate(bot.angle);

    // Chassis body puck (Bambu TPU 95A HF core)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = armedRef.current ? '#00f0ff' : '#64748b';
    ctx.stroke();

    // Carbon / Aluminum Top Armor Plate clamping ring
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, 2 * Math.PI);
    ctx.fill();

    // Wheel Pods (Dual PropDrive Hubmotors)
    ctx.fillStyle = '#475569';
    ctx.fillRect(-6, -19, 12, 6);
    ctx.fillRect(-6, 13, 12, 6);

    // AR500 Hardened Kinetic Impact Teeth (Symmetric Pair)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    // Tooth 1
    ctx.moveTo(18, -6);
    ctx.lineTo(29, 0);
    ctx.lineTo(18, 6);
    // Tooth 2
    ctx.moveTo(-18, 6);
    ctx.lineTo(-29, 0);
    ctx.lineTo(-18, -6);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#ffaa00';
    ctx.stroke();

    // Optical LED beacon physical diode (Green)
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(12, 0, 3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }, [selectedOpponent]);

  // Draw Circular LiDAR Radar PPI Display
  const drawRadarCanvas = useCallback((sweepAngle: number) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 8;

    ctx.fillStyle = '#050a12';
    ctx.fillRect(0, 0, w, h);

    // Radar Concentric Range Rings
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach((ratio) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r * ratio, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Radar Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.stroke();

    // Range Labels
    ctx.fillStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.font = '9px monospace';
    ctx.fillText('1.0m', cx + 4, cy - r * 0.33 + 10);
    ctx.fillText('2.0m', cx + 4, cy - r * 0.66 + 10);
    ctx.fillText('3.0m', cx + 4, cy - r + 10);

    // Opponent Echoes
    const bot = robotPosRef.current;
    opponentsRef.current.forEach((opp) => {
      if (opp.destroyed) return;
      const dx = opp.x - bot.x;
      const dy = opp.y - bot.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Scale distance to radar radius (arena 520px -> radar 130px)
      const radarDist = (dist / 520) * r * 2;
      if (radarDist <= r) {
        const rx = cx + Math.cos(angle) * radarDist;
        const ry = cy + Math.sin(angle) * radarDist;

        // Blip
        ctx.fillStyle = opp.id === selectedOpponent ? '#00f0ff' : '#ff2a55';
        ctx.beginPath();
        ctx.arc(rx, ry, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Target Label
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '8px monospace';
        ctx.fillText(opp.name.split(' ')[0], rx + 6, ry - 3);

        // Lock brackets
        if (autoRamRef.current && opp.id === selectedOpponent) {
          ctx.strokeStyle = '#00f0ff';
          ctx.strokeRect(rx - 7, ry - 7, 14, 14);
        }
      }
    });

    // Rotating Sweep Line with Phosphor Gradient Fade
    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.05)');

    ctx.save();
    ctx.fillStyle = sweepGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sweepAngle - 0.45, sweepAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * r, cy + Math.sin(sweepAngle) * r);
    ctx.stroke();
    ctx.restore();
  }, [selectedOpponent]);

  // Draw Dual Accelerometer Oscilloscope Waveform
  const drawAccelCanvas = useCallback(() => {
    const canvas = accelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let y = 0; y <= h; y += 25) {
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
    if (history.length < 2) return;

    // Zero line at bottom (padding 15px)
    const zeroY = h - 20;
    const maxGScale = 400; // 400g scale

    // Channel 1: Sensor 1 (Cyan)
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = zeroY - (pt.s1 / maxGScale) * (h - 35);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Channel 2: Sensor 2 (Amber)
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((pt, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = zeroY - (pt.s2 / maxGScale) * (h - 35);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 400G Saturation Limit Marker
    ctx.strokeStyle = 'rgba(255, 42, 85, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, zeroY - (400 / maxGScale) * (h - 35));
    ctx.lineTo(w, zeroY - (400 / maxGScale) * (h - 35));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff2a55';
    ctx.font = '9px monospace';
    ctx.fillText('±400G SATURATION LIMIT', 8, 14);
  }, []);

  // Joystick Pointer Event Handlers for Right Stick (Translation Vector)
  const handleStickPointerDown = (e: React.PointerEvent) => {
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
    // Spring return to center
    setTransVector({ x: 0, y: 0 });
  };

  const currentGs = ((Math.pow((currentRpm * 2 * Math.PI) / 60, 2) * SENSOR_RADIUS_M) / GRAVITY_MSS).toFixed(1);

  return (
    <div className="page lab-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Combat Breadcrumb */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="cyber-badge">SYSTEM // COMBAT TEST LAB</span>
          <span className="cyber-badge amber">DSHOT600 8kHz</span>
          <span className="cyber-badge green">ELRS 250Hz CRSF</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`cyber-btn ${armed ? 'danger' : 'primary'}`}
            style={{ padding: '6px 14px', fontSize: '11px' }}
            onClick={() => setArmed(!armed)}
          >
            <span className="cyber-dot" />
            {armed ? 'DISARM COMBAT BOT' : 'SAFETY: ARM ROBOT'}
          </button>
        </div>
      </div>

      {/* Main Grid: Arena & Physics (Left) vs Radar, Charts & RadioMaster Station (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 640px) 1fr', gap: '24px', marginTop: '20px' }}>
        
        {/* Left Column: 60FPS Combat Arena Physics */}
        <div className="glass-panel hud-corner" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="cyber-dot" /> TACTICAL PHYSICS ARENA
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                3,500 RPM Kinematics · Stroboscopic Optical Heading · Collision Dynamics
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  robotPosRef.current = { x: 300, y: 300, vx: 0, vy: 0, angle: 0, headingAngle: 0 };
                  opponentsRef.current.forEach((opp) => { opp.health = 100; opp.destroyed = false; });
                }}
              >
                RESET ARENA (R)
              </button>
            </div>
          </div>

          {/* Arena Canvas Container */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#050811', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
            <canvas
              ref={arenaCanvasRef}
              width={600}
              height={600}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />

            {/* In-Canvas Telemetry HUD Overlays */}
            <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none' }}>
              <div className="cyber-badge" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                SPIN: <strong style={{ color: '#fff', marginLeft: '4px' }}>{currentRpm} RPM</strong>
              </div>
              <div className="cyber-badge amber" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                CENTRIPETAL: <strong style={{ color: '#fff', marginLeft: '4px' }}>{currentGs} G</strong>
              </div>
              <div className="cyber-badge crimson" style={{ background: 'rgba(0, 0, 0, 0.7)' }}>
                LAST HIT: <strong style={{ color: '#fff', marginLeft: '4px' }}>{impactG > 0 ? `${impactG} G` : 'NONE'}</strong>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', pointerEvents: 'none' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', background: 'rgba(0, 0, 0, 0.7)', padding: '2px 6px', borderRadius: '3px' }}>
                WASD / ARROWS = DRIVE · SPACE = BRAKE · SHIFT = 4,000 RPM
              </span>
            </div>
          </div>

          {/* Speed & Modulation HUD Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>STATUS</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: armed ? 'var(--neon-green)' : 'var(--neon-crimson)' }}>
                {armed ? 'ARMED' : 'DISARMED'}
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>TIP SPEED</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>
                {Math.round((currentRpm / 3500) * 88)} MPH
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>KINETIC ENERGY</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--neon-amber)' }}>
                {Math.round(0.5 * 0.002 * Math.pow((currentRpm * 2 * Math.PI) / 60, 2))} J
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--cyber-text-muted)' }}>HITS RECORDED</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                {totalHits}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Radar Sweep, Dual Accel Waveforms, and RadioMaster Pocket Station */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Top Row: Simulated LiDAR Radar PPI + Auto-Ramming Controls */}
          <div className="glass-panel hud-corner" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="cyber-dot" /> 360° LIDAR RADAR SWEEP &amp; AUTONOMY
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                  Opponent Bot Detection · Ballistic Vector Intercept · Auto-Ram
                </span>
              </div>
              <button
                className={`cyber-btn ${autoRam ? 'danger' : 'amber'}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
                onClick={() => setAutoRam(!autoRam)}
              >
                {autoRam ? 'AUTONOMY: AUTO-RAM ENGAGED' : 'ENGAGE AI AUTO-RAM'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: '16px', alignItems: 'center' }}>
              {/* Radar PPI Canvas */}
              <div style={{ width: '160px', height: '160px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0, 240, 255, 0.4)', margin: '0 auto' }}>
                <canvas ref={radarCanvasRef} width={160} height={160} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>

              {/* Target Selector & Radar Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', textTransform: 'uppercase' }}>
                  Select Target to Lock &amp; Intercept:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opp.color }} />
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{opp.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--cyber-text-dim)' }}>({opp.type})</span>
                      </div>
                      <span style={{ fontSize: '11px', color: opp.destroyed ? '#ff2a55' : 'var(--neon-green)', fontWeight: 'bold' }}>
                        {opp.destroyed ? 'KILLED' : `HP ${opp.health}%`}
                      </span>
                    </div>
                  ))}
                </div>
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
              <canvas ref={accelCanvasRef} width={500} height={110} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
          </div>

          {/* Bottom Row: Virtual RadioMaster Pocket Station */}
          <div className="glass-panel-elevated hud-corner" style={{ padding: '18px', background: 'linear-gradient(180deg, rgba(16, 24, 40, 0.95), rgba(10, 15, 28, 0.98))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '0.08em', color: '#fff' }}>
                  RADIOMASTER POCKET // ELRS 2.4GHz TACTICAL STATION
                </span>
                <span className="cyber-badge">MODE 2 CRSF</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                Hall X5 Gimbals · EdgeTX 2.10
              </span>
            </div>

            {/* Controller Layout: Left Gimbal (Throttle/Spin) + LCD Telemetry + Right Gimbal (Translation Vector) */}
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 130px', gap: '20px', alignItems: 'center' }}>
              
              {/* Left Gimbal: Spin Throttle (Slider + Vertical Gimbal) */}
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
                  {/* Vertical Guide Track */}
                  <div style={{ position: 'absolute', width: '4px', height: '60px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px' }} />
                  {/* Gimbal Stick Tip */}
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
                  onChange={(e) => setThrottle(parseFloat(e.target.value))}
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
                  <span>COR: ±25mm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>G-FORCE: {currentGs.padStart(5, ' ')}G</span>
                  <span>MOD: {Math.round(Math.hypot(transVector.x, transVector.y) * 65)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CRSF: 250Hz -38dB</span>
                  <span style={{ color: armed ? '#4ade80' : '#f87171' }}>{armed ? 'STATE: ARMED' : 'STATE: SAFE'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(74, 222, 128, 0.3)', paddingTop: '3px' }}>
                  <span>SA: {armed ? 'ARMED' : 'DISARM'}</span>
                  <span>SB: {driveMode}</span>
                  <span>SF: {autoRam ? 'AUTO' : 'MANUAL'}</span>
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
                  {/* Crosshair guide */}
                  <div style={{ position: 'absolute', width: '60px', height: '1px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  <div style={{ position: 'absolute', width: '1px', height: '60px', background: 'rgba(255, 255, 255, 0.1)' }} />
                  {/* Interactive Stick Puck */}
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

            {/* Quick Tactical Switches: SA (Arm), SB (Mode), SF (Kill) */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px' }}>
              <button
                className={`cyber-btn ${armed ? 'danger' : 'primary'}`}
                style={{ padding: '6px 14px', fontSize: '11px' }}
                onClick={() => setArmed(!armed)}
              >
                SWITCH SA: {armed ? 'ARMED (3-POS DOWN)' : 'DISARMED (UP)'}
              </button>
              <button
                className="cyber-btn"
                style={{ padding: '6px 14px', fontSize: '11px' }}
                onClick={() => {
                  const modes: ('Normal' | 'Acro' | 'Orbit-Lock')[] = ['Normal', 'Acro', 'Orbit-Lock'];
                  const next = modes[(modes.indexOf(driveMode) + 1) % modes.length];
                  setDriveMode(next);
                }}
              >
                SWITCH SB: MODE ({driveMode})
              </button>
              <button
                className={`cyber-btn ${autoRam ? 'amber' : ''}`}
                style={{ padding: '6px 14px', fontSize: '11px' }}
                onClick={() => setAutoRam(!autoRam)}
              >
                SWITCH SF: {autoRam ? 'AUTONOMY OVERRIDE' : 'MANUAL CONTROL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
