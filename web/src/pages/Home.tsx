import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { HeroCombatViewer3D, WEAPON_MODES, type WeaponMode, type LightingPreset } from '../components/HeroCombatViewer3D';
import '../cyber-combat.css';
import './Home.css';

export function Home() {
  // ---------------------------------------------------------------------------
  // 1. Interactive 3D Hero Viewport State
  // ---------------------------------------------------------------------------
  const [weaponMode, setWeaponMode] = useState<WeaponMode>('A');
  const [isSpinning, setIsSpinning] = useState<boolean>(true);
  const [rpm, setRpm] = useState<number>(4000);
  const [exploded, setExploded] = useState<number>(0);
  const [strobeLaser, setStrobeLaser] = useState<boolean>(true);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('cyber');

  // Dynamic Tactical Calculations based on RPM and Weapon Mode
  const activeWeapon = WEAPON_MODES[weaponMode];
  const rpmRatio = rpm / 4000;
  // Kinetic energy: proportional to omega^2
  const liveKeJoules = Math.round(activeWeapon.keJoules * (rpmRatio * rpmRatio));
  // Tip speed: proportional to omega
  const liveTipSpeedMph = Math.round(activeWeapon.tipSpeedMph * rpmRatio);
  // Centripetal acceleration: proportional to omega^2
  const liveCentripetalG = Math.round(activeWeapon.centripetalG * (rpmRatio * rpmRatio));
  const robotCombatMassG = 1360.8;

  // ---------------------------------------------------------------------------
  // 2. Bento Card 1: Kinetic Strike & Bite Depth Mechanics State
  // ---------------------------------------------------------------------------
  const [transSpeed, setTransSpeed] = useState<number>(1.8); // m/s
  const [calcRpm, setCalcRpm] = useState<number>(4000);
  const [calcTeethCount, setCalcTeethCount] = useState<number>(2);

  // Bite depth formula: b = v_trans / (N_teeth * (RPM / 60)) * 1000 mm
  const biteDepthMm = useMemo(() => {
    if (calcRpm <= 0 || calcTeethCount <= 0) return 0;
    const revsPerSec = calcRpm / 60;
    const bitesPerSec = calcTeethCount * revsPerSec;
    return Number(((transSpeed / bitesPerSec) * 1000).toFixed(2));
  }, [transSpeed, calcRpm, calcTeethCount]);

  // ---------------------------------------------------------------------------
  // 2. Bento Card 2: 100% Invertible Chassis State
  // ---------------------------------------------------------------------------
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // 2. Bento Card 3: 360° Micro-LiDAR Opponent Tracker State
  // ---------------------------------------------------------------------------
  const [radarState, setRadarState] = useState<'searching' | 'locked' | 'auto-ram'>('locked');
  const [radarAzimuth, setRadarAzimuth] = useState<number>(134.2);
  const [radarRange, setRadarRange] = useState<number>(1.74);

  useEffect(() => {
    const interval = setInterval(() => {
      setRadarAzimuth((prev) => Number(((prev + 0.8) % 360).toFixed(1)));
      setRadarRange((prev) => {
        const next = prev + (Math.random() * 0.08 - 0.04);
        return Number(Math.max(0.6, Math.min(3.8, next)).toFixed(2));
      });
    }, 180);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Bento Card 4: Quick-Swap 15s LiPo Cartridge State
  // ---------------------------------------------------------------------------
  const [lipoStep, setLipoStep] = useState<number>(0);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapTimer, setSwapTimer] = useState<number>(11.4);
  const swapIntervalRef = useRef<number | null>(null);

  const startPitSwap = () => {
    if (isSwapping) return;
    setIsSwapping(true);
    setLipoStep(1);
    setSwapTimer(0.0);

    const startTime = performance.now();
    if (swapIntervalRef.current) clearInterval(swapIntervalRef.current);

    swapIntervalRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      setSwapTimer(Number(elapsed.toFixed(1)));

      if (elapsed >= 2.5 && elapsed < 5.5) {
        setLipoStep(2);
      } else if (elapsed >= 5.5 && elapsed < 8.8) {
        setLipoStep(3);
      } else if (elapsed >= 8.8 && elapsed < 11.4) {
        setLipoStep(4);
      } else if (elapsed >= 11.4) {
        setLipoStep(4);
        setIsSwapping(false);
        if (swapIntervalRef.current) clearInterval(swapIntervalRef.current);
      }
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (swapIntervalRef.current) clearInterval(swapIntervalRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Bento Card 5: 36T Titanium Cleat Traction Matrix State
  // ---------------------------------------------------------------------------
  const [selectedSurface, setSelectedSurface] = useState<'steel' | 'wood' | 'hazard'>('steel');

  const surfaces = {
    steel: { name: 'Smooth Painted Steel (NHRL / SPARC)', cleatMu: 0.94, siliconeMu: 0.85, tpuMu: 0.52, foamMu: 0.41 },
    wood: { name: 'Plywood Test Deck (Workshop)', cleatMu: 1.15, siliconeMu: 0.90, tpuMu: 0.65, foamMu: 0.55 },
    hazard: { name: 'Diamond Plate Steel (Hazard Zone)', cleatMu: 1.05, siliconeMu: 0.72, tpuMu: 0.48, foamMu: 0.35 },
  };

  const currentSurface = surfaces[selectedSurface];

  // ---------------------------------------------------------------------------
  // 3. Interactive Weight Budget Matrix State
  // Exact default: Armor 437g, Motors & Pods 184g, Dual 4S LiPo 210g, Electronics & LiDAR 92g, Puck & Fasteners 437.8g = Exactly 1,360.8g
  // ---------------------------------------------------------------------------
  const [armorMass, setArmorMass] = useState<number>(437.0);
  const [motorMass, setMotorMass] = useState<number>(184.0);
  const [batteryMass, setBatteryMass] = useState<number>(210.0);
  const [electronicsMass, setElectronicsMass] = useState<number>(92.0);
  const [puckMass, setPuckMass] = useState<number>(437.8);

  const totalBudgetG = useMemo(() => {
    return Number((armorMass + motorMass + batteryMass + electronicsMass + puckMass).toFixed(1));
  }, [armorMass, motorMass, batteryMass, electronicsMass, puckMass]);

  const maxBudgetG = 1360.8;
  const deltaG = Number((maxBudgetG - totalBudgetG).toFixed(1));
  const isOverweight = totalBudgetG > maxBudgetG;
  const isExactLimit = totalBudgetG === maxBudgetG;

  const resetWeightBudget = () => {
    setArmorMass(437.0);
    setMotorMass(184.0);
    setBatteryMass(210.0);
    setElectronicsMass(92.0);
    setPuckMass(437.8);
  };

  return (
    <div className="home-container">
      {/* ----------------------------------------------------------------------
          TOPLINE TACTICAL STATUS BAR
          ---------------------------------------------------------------------- */}
      <header className="home-topline" aria-label="Tactical Status Bar">
        <div className="home-topline-left">
          <span className="cyber-badge">
            <span className="cyber-dot" style={{ color: 'var(--neon-cyan)' }} />
            REV 7 COMBAT SPECIFICATION
          </span>
          <span className="cyber-badge green">STATUS: COMBAT READY // ACTIVE TEST</span>
          <span className="cyber-badge">SPARC BEETLEWEIGHT 3.00 LB</span>
        </div>
        <div className="home-topline-right">
          <span className="cyber-badge amber">MAX LIMIT: 1,360.8 g (3.000 LB)</span>
          <span className="cyber-badge" style={{ color: 'var(--neon-cyan)', borderColor: 'rgba(0, 240, 255, 0.4)' }}>
            DSHOT600 · 8kHz · CRSF 250Hz
          </span>
        </div>
      </header>

      {/* ----------------------------------------------------------------------
          1. INTERACTIVE 3D HERO VIEWPORT SECTION
          ---------------------------------------------------------------------- */}
      <section className="home-hero-grid" aria-labelledby="hero-title">
        {/* Left Column: Robot Bio, Quick Stats, High-Impact CTAs */}
        <div className="hero-info-column">
          <div className="hero-title-group">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span className="cyber-badge crimson">4,000 RPM KINETIC STRIKE</span>
              <span className="cyber-badge amber">415 J ENERGY RING</span>
              <span className="cyber-badge green">360° MICRO-LIDAR AUTO-RAM</span>
            </div>

            <h1 id="hero-title" className="hero-main-title">
              EYELINER <span className="rev-tag">// REV 7</span>
            </h1>

            <p className="hero-tagline">
              Autonomous Meltybrain Combat Robot. 3.00 lb Kinetic Masterpiece.
            </p>

            <p className="hero-bio">
              Translating through high-speed directional motor differential pulsing at 4,000 RPM.
              Equipped with dual ±400g H3LIS331DL centrifugal accelerometers, stroboscopic heading beacon laser,
              autonomous 360° micro-LiDAR opponent auto-ram tracking, and 100% invertible Ti-6Al-4V cleat drivetrain.
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="hero-quick-stats">
            <div className="hero-stat-card" style={{ borderLeft: '3px solid var(--neon-crimson)' }}>
              <div className="hero-stat-label">Kinetic Impact</div>
              <div className="hero-stat-value" style={{ color: 'var(--neon-crimson)' }}>
                {liveKeJoules} J
              </div>
              <div className="hero-stat-sub">@ {rpm.toLocaleString()} RPM</div>
            </div>

            <div className="hero-stat-card" style={{ borderLeft: '3px solid var(--neon-amber)' }}>
              <div className="hero-stat-label">Tooth Tip Speed</div>
              <div className="hero-stat-value" style={{ color: 'var(--neon-amber)' }}>
                {liveTipSpeedMph} MPH
              </div>
              <div className="hero-stat-sub">64.8 m/s perimeter</div>
            </div>

            <div className="hero-stat-card" style={{ borderLeft: '3px solid var(--neon-cyan)' }}>
              <div className="hero-stat-label">Centripetal G</div>
              <div className="hero-stat-value" style={{ color: 'var(--neon-cyan)' }}>
                {liveCentripetalG} G
              </div>
              <div className="hero-stat-sub">Dual ±400g IMU</div>
            </div>

            <div className="hero-stat-card" style={{ borderLeft: '3px solid var(--neon-green)' }}>
              <div className="hero-stat-label">Combat Weight</div>
              <div className="hero-stat-value" style={{ color: 'var(--neon-green)' }}>
                {robotCombatMassG} g
              </div>
              <div className="hero-stat-sub">Exactly 3.000 lb limit</div>
            </div>
          </div>

          {/* High-Impact CTA Buttons */}
          <div className="hero-cta-grid">
            <Link to="/lab" className="hero-cta-btn primary">
              <span>⚡</span> Launch Arena Driving Sim
            </Link>
            <Link to="/explorer" className="hero-cta-btn">
              <span>🔍</span> 3D CAD Teardown
            </Link>
            <Link to="/video" className="hero-cta-btn danger">
              <span>🎥</span> Combat Video Reels
            </Link>
            <Link to="/build" className="hero-cta-btn amber">
              <span>📦</span> Parts &amp; Build Guide
            </Link>
          </div>
        </div>

        {/* Right Column: 3D WebGL Hero Stage */}
        <div className="hero-viewport-stage">
          {/* Top Controls: Weapon Mode Selector & Lighting */}
          <div className="stage-top-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="hero-stat-label" style={{ margin: 0 }}>Weapon Config:</span>
              <div className="stage-weapon-selector">
                <button
                  className={`weapon-btn ${weaponMode === 'A' ? 'active' : ''}`}
                  onClick={() => setWeaponMode('A')}
                  title="Mode A: 2-Tooth High-KE Ring (415 J)"
                >
                  Mode A: 2-Tooth (415 J)
                </button>
                <button
                  className={`weapon-btn ${weaponMode === 'B' ? 'active' : ''}`}
                  onClick={() => setWeaponMode('B')}
                  title="Mode B: Single Deep-Bite Razor + Tungsten Wedge"
                >
                  Mode B: Razor + Tungsten
                </button>
                <button
                  className={`weapon-btn ${weaponMode === 'C' ? 'active' : ''}`}
                  onClick={() => setWeaponMode('C')}
                  title="Mode C: Low-Profile Undercutter Scoop"
                >
                  Mode C: Undercutter
                </button>
                <button
                  className={`weapon-btn ${weaponMode === 'D' ? 'active' : ''}`}
                  onClick={() => setWeaponMode('D')}
                  title="Mode D: Skirt-Breaker Can-Opener"
                >
                  Mode D: Can-Opener
                </button>
              </div>
            </div>

            {/* Lighting Preset Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="hero-stat-label" style={{ margin: 0 }}>Studio:</span>
              <select
                value={lightingPreset}
                onChange={(e) => setLightingPreset(e.target.value as LightingPreset)}
                style={{
                  background: 'rgba(18, 26, 44, 0.9)',
                  border: '1px solid var(--cyber-border)',
                  color: 'var(--neon-cyan)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontFamily: 'var(--cyber-mono)',
                  cursor: 'pointer',
                }}
              >
                <option value="cyber">Cyberpunk Neon</option>
                <option value="studio">Studio Neutral</option>
                <option value="arena">Deep Arena</option>
                <option value="ir">Tactical Infrared</option>
              </select>
            </div>
          </div>

          {/* Interactive 3D Canvas Stage */}
          <div className="stage-canvas-wrapper">
            <HeroCombatViewer3D
              weaponMode={weaponMode}
              rpm={rpm}
              isSpinning={isSpinning}
              exploded={exploded}
              strobeLaser={strobeLaser}
              lightingPreset={lightingPreset}
            />

            {/* Tactical HUD Overlay - Top Left */}
            <div className="stage-hud-overlay">
              <div className="stage-hud-badge">
                <span className="cyber-dot" style={{ color: isSpinning ? 'var(--neon-crimson)' : 'var(--cyber-text-dim)' }} />
                <span>SPIN: {isSpinning ? `${rpm.toLocaleString()} RPM` : 'STANDBY'}</span>
              </div>
              <div className="stage-hud-badge">
                <span style={{ color: activeWeapon.color }}>●</span>
                <span>{activeWeapon.badge}</span>
              </div>
            </div>

            {/* Tactical HUD Metrics Overlay - Top Right */}
            <div className="stage-hud-metrics">
              <div className="hud-metric-box">
                <div className="label">Kinetic Energy</div>
                <div className="value" style={{ color: 'var(--neon-crimson)' }}>
                  {liveKeJoules} J
                </div>
              </div>
              <div className="hud-metric-box">
                <div className="label">Tip Speed</div>
                <div className="value" style={{ color: 'var(--neon-amber)' }}>
                  {liveTipSpeedMph} mph
                </div>
              </div>
              <div className="hud-metric-box">
                <div className="label">Centripetal G</div>
                <div className="value" style={{ color: 'var(--neon-cyan)' }}>
                  {liveCentripetalG} G
                </div>
              </div>
              <div className="hud-metric-box">
                <div className="label">Weight Meter</div>
                <div className="value" style={{ color: 'var(--neon-green)' }}>
                  {robotCombatMassG} g
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Interactive Control Bar: Spin Toggle, Laser Toggle, Exploded View Slider */}
          <div className="stage-bottom-bar">
            {/* Quick Interactive Toggles */}
            <div className="stage-quick-toggles">
              <button
                className={`toggle-chip ${isSpinning ? 'active' : ''}`}
                onClick={() => setIsSpinning(!isSpinning)}
              >
                {isSpinning ? '🔄 SPINNING (4,000 RPM)' : '⏸️ SPIN-UP ROBOT'}
              </button>

              <button
                className={`toggle-chip ${strobeLaser ? 'active laser' : ''}`}
                onClick={() => setStrobeLaser(!strobeLaser)}
              >
                {strobeLaser ? '🔦 HEADING LASER: ACTIVE' : '🔦 HEADING LASER: OFF'}
              </button>
            </div>

            {/* RPM Slider */}
            <div className="stage-slider-group">
              <span>RPM: {rpm}</span>
              <input
                type="range"
                min="500"
                max="4500"
                step="100"
                value={rpm}
                disabled={!isSpinning}
                onChange={(e) => setRpm(Number(e.target.value))}
              />
            </div>

            {/* Exploded View Slider */}
            <div className="stage-slider-group">
              <span>EXPLODED VIEW: {Math.round(exploded * 100)}%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={exploded}
                onChange={(e) => setExploded(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          2. MODERN BENTO GRID ARCHITECTURE (Cards 1 to 5)
          ---------------------------------------------------------------------- */}
      <section aria-labelledby="bento-title">
        <div className="bento-section-header">
          <div>
            <h2 id="bento-title" className="bento-title-main">
              <span className="cyber-dot" style={{ color: 'var(--neon-cyan)' }} />
              TACTICAL BENTO ARCHITECTURE // CRITICAL INNOVATIONS
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>
              Interactive mechanical, kinematic, optical, and energy systems engineered for SPARC 3lb dominance
            </span>
          </div>
          <span className="cyber-badge green">5 SYSTEMS VALIDATED</span>
        </div>

        <div className="bento-grid">
          {/* ------------------------------------------------------------------
              Card 1: Kinetic Strike Mechanics (Interactive Bite Depth vs RPM)
              ------------------------------------------------------------------ */}
          <div className="bento-card bento-card-1 hud-corner">
            <div>
              <div className="bento-card-header">
                <span className="cyber-badge crimson">KINETICS // EQUATION SOLVER</span>
                <span className="cyber-badge">IMPACT MECHANICS</span>
              </div>

              <h3 className="bento-card-title">01 // Kinetic Strike &amp; Bite Depth Mechanics</h3>
              <p className="bento-card-desc">
                Tooth bite depth <em>b</em> determines whether kinetic strikes transfer massive structural shock into the opponent&apos;s
                chassis or glance off. At high rotational velocities, tooth pass frequency can outpace translation speed, causing teeth
                to skate on armor. Use the live solver below to calculate penetration depth:
              </p>

              {/* Interactive Calculation Card */}
              <div className="strike-calc-box">
                <div className="calc-controls-row">
                  <div className="calc-field">
                    <label>
                      <span>TRANSLATION SPEED (V_trans)</span>
                      <strong style={{ color: 'var(--neon-cyan)' }}>{transSpeed} m/s</strong>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3.5"
                      step="0.1"
                      value={transSpeed}
                      onChange={(e) => setTransSpeed(Number(e.target.value))}
                    />
                  </div>

                  <div className="calc-field">
                    <label>
                      <span>ROTATIONAL SPEED (RPM)</span>
                      <strong style={{ color: 'var(--neon-amber)' }}>{calcRpm.toLocaleString()} RPM</strong>
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="4500"
                      step="100"
                      value={calcRpm}
                      onChange={(e) => setCalcRpm(Number(e.target.value))}
                    />
                  </div>

                  <div className="calc-field">
                    <label>
                      <span>TOOTH COUNT (N_teeth)</span>
                      <strong style={{ color: '#fff' }}>{calcTeethCount} {calcTeethCount === 1 ? 'Tooth' : 'Teeth'}</strong>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        className={`weapon-btn ${calcTeethCount === 1 ? 'active' : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => setCalcTeethCount(1)}
                      >
                        1 Tooth (Mode B)
                      </button>
                      <button
                        className={`weapon-btn ${calcTeethCount === 2 ? 'active' : ''}`}
                        style={{ flex: 1 }}
                        onClick={() => setCalcTeethCount(2)}
                      >
                        2 Teeth (Mode A/D)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Bite Depth Result */}
                <div className="bite-depth-display">
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Calculated Bite Depth (b = v / (N · ω))
                    </div>
                    <div className="bite-depth-val">
                      {biteDepthMm} mm
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                      {biteDepthMm >= 10
                        ? '💥 DEEP BITE ZONE: Catastrophic structural penetration & frame shear.'
                        : biteDepthMm >= 5
                        ? '⚡ OPTIMAL BITE: Crisp edge gouging and violent kinetic launch.'
                        : '⚠️ SHALLOW BITE: High probability of glancing on 3mm Hardox/Titanium.'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)' }}>STRIKE FREQUENCY</div>
                    <div style={{ fontFamily: 'var(--cyber-mono)', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                      {Math.round(calcTeethCount * (calcRpm / 60))} hits/sec
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--cyber-border-faint)', paddingTop: '14px' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--cyber-text-dim)', fontFamily: 'var(--cyber-mono)' }}>
                FORMULA: b = (v_trans / (N · (RPM/60))) · 1000
              </span>
              <Link to="/engineering" className="cyber-btn" style={{ padding: '6px 14px', fontSize: '11px' }}>
                VIEW FULL EQUATION SUITE ↗
              </Link>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Card 2: 100% Invertible Chassis (Interactive 180° Flip Demo)
              ------------------------------------------------------------------ */}
          <div className="bento-card bento-card-2 hud-corner">
            <div>
              <div className="bento-card-header">
                <span className="cyber-badge">CHASSIS // SYMMETRY</span>
                <span className="cyber-badge green">4.185mm CLEARANCE</span>
              </div>

              <h3 className="bento-card-title">02 // 100% Invertible Chassis</h3>
              <p className="bento-card-desc">
                Violent hits flip bots across the arena. Eyeliner eliminates self-righting srimech delay by engineering
                identical 4.185mm ground clearance top and bottom with bi-directional Ti-6Al-4V cleats.
              </p>

              {/* Interactive 180° Flip Demo */}
              <div className="invertible-demo-box">
                <div className={`flipper-stage ${isFlipped ? 'flipped' : ''}`}>
                  <div className="clearance-guide-top">
                    ▲ TOP CLEARANCE: 4.185 mm
                  </div>
                  <div className="chassis-schematic-body">
                    <span style={{ fontSize: '10.5px', fontFamily: 'var(--cyber-mono)', color: '#fff', fontWeight: 700 }}>
                      {isFlipped ? 'INVERTED FLIGHT // DSHOT REV' : 'UPRIGHT NORMAL // DSHOT FWD'}
                    </span>
                    <div className="schematic-wheel left" />
                    <div className="schematic-wheel right" />
                  </div>
                  <div className="clearance-guide-bot">
                    ▼ BOT CLEARANCE: 4.185 mm
                  </div>
                </div>

                <button
                  className="cyber-btn primary"
                  style={{ marginTop: '16px', padding: '8px 18px', fontSize: '12px' }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  🔄 {isFlipped ? 'FLIP UPRIGHT (0°)' : 'TRIGGER 180° CHASSIS INVERSION'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cyber-border-faint)', paddingTop: '14px' }}>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)' }}>
                Zero self-righting delay · Immediate torque recovery
              </span>
              <span className="cyber-badge green">100% INVERTIBLE</span>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Card 3: 360° Micro-LiDAR Opponent Tracker
              ------------------------------------------------------------------ */}
          <div className="bento-card bento-card-3 hud-corner">
            <div>
              <div className="bento-card-header">
                <span className="cyber-badge green">OPTICAL RADAR</span>
                <span className="cyber-badge">58.3 SWEEPS/S</span>
              </div>

              <h3 className="bento-card-title">03 // 360° Micro-LiDAR Radar</h3>
              <p className="bento-card-desc">
                At 3,500–4,000 RPM, the embedded Time-of-Flight micro-LiDAR sweeps 58+ times per second, building a real-time
                radial range map and locking onto opponents with lead-angle trajectory solving.
              </p>

              {/* Animated Radar Screen */}
              <div className="radar-display-wrapper">
                <div className="radar-sweep-beam" />
                <div className="radar-reticle-ring" style={{ width: '40%', height: '40%' }} />
                <div className="radar-reticle-ring" style={{ width: '70%', height: '70%' }} />
                <div className="radar-reticle-ring" style={{ width: '95%', height: '95%' }} />

                {/* Opponent Blip */}
                <div
                  className="radar-blip"
                  style={{
                    top: `${50 - Math.sin((radarAzimuth * Math.PI) / 180) * 32}%`,
                    left: `${50 + Math.cos((radarAzimuth * Math.PI) / 180) * 32}%`,
                  }}
                  title={`Opponent Target: Azimuth ${radarAzimuth}°, Range ${radarRange}m`}
                />
              </div>

              {/* Radar Status Bar & Buttons */}
              <div style={{ background: 'rgba(8, 12, 22, 0.7)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--cyber-border-faint)', marginBottom: '14px', fontSize: '11.5px', fontFamily: 'var(--cyber-mono)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--cyber-text-dim)' }}>AZIMUTH / RANGE:</span>
                  <span style={{ color: 'var(--neon-green)', fontWeight: 700 }}>
                    {radarAzimuth}° · {radarRange} m
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--cyber-text-dim)' }}>LEAD ANGLE COMP:</span>
                  <span style={{ color: 'var(--neon-cyan)' }}>+18.4° (AUTO-RAM)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`weapon-btn ${radarState === 'searching' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '6px 8px' }}
                  onClick={() => setRadarState('searching')}
                >
                  SEARCH
                </button>
                <button
                  className={`weapon-btn ${radarState === 'locked' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '6px 8px' }}
                  onClick={() => setRadarState('locked')}
                >
                  LOCK
                </button>
                <button
                  className={`weapon-btn ${radarState === 'auto-ram' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '6px 8px', color: 'var(--neon-crimson)', borderColor: 'rgba(255, 42, 85, 0.4)' }}
                  onClick={() => setRadarState('auto-ram')}
                >
                  AUTO-RAM
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--cyber-border-faint)', paddingTop: '14px', marginTop: '16px' }}>
              <Link to="/firmware" style={{ fontSize: '11.5px', color: 'var(--neon-green)', textDecoration: 'none', fontWeight: 600 }}>
                EXPLORE LIDAR KERNEL CODE ↗
              </Link>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Card 4: Quick-Swap 15s LiPo Cartridge
              ------------------------------------------------------------------ */}
          <div className="bento-card bento-card-4 hud-corner">
            <div>
              <div className="bento-card-header">
                <span className="cyber-badge amber">ENERGY // 4S LIPO</span>
                <span className="cyber-badge">&lt;15s PIT SWAP</span>
              </div>

              <h3 className="bento-card-title">04 // Quick-Swap 15s LiPo Cartridge</h3>
              <p className="bento-card-desc">
                Eliminates screw disassembly between tournament elimination rounds. A magnetic slide-rail cartridge
                snaps dual 4S 850mAh packs into high-current XT30U sockets in under 15 seconds.
              </p>

              {/* Step Sequence Timeline */}
              <div className="lipo-sequence-box">
                <div className="lipo-steps-timeline">
                  <div className={`lipo-step-item ${lipoStep >= 1 ? 'done' : ''} ${lipoStep === 1 ? 'active' : ''}`}>
                    <span>01</span>
                    <span>DISENGAGE CARBON SAFETY LATCH</span>
                  </div>
                  <div className={`lipo-step-item ${lipoStep >= 2 ? 'done' : ''} ${lipoStep === 2 ? 'active' : ''}`}>
                    <span>02</span>
                    <span>SLIDE EJECT DEPLETED 4S PACK</span>
                  </div>
                  <div className={`lipo-step-item ${lipoStep >= 3 ? 'done' : ''} ${lipoStep === 3 ? 'active' : ''}`}>
                    <span>03</span>
                    <span>INSERT FRESH 4S 850mAh 95C PACK</span>
                  </div>
                  <div className={`lipo-step-item ${lipoStep >= 4 ? 'done' : ''} ${lipoStep === 4 ? 'active' : ''}`}>
                    <span>04</span>
                    <span>ENGAGE AUTO-LOCK &amp; REBOOT MCU</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', fontFamily: 'var(--cyber-mono)' }}>
                  <span style={{ color: 'var(--cyber-text-dim)' }}>PIT STOP DURATION:</span>
                  <span style={{ color: 'var(--neon-amber)', fontWeight: 800, fontSize: '15px' }}>
                    {swapTimer}s <span style={{ fontSize: '10px', color: 'var(--neon-green)' }}>(&lt;15s TARGET)</span>
                  </span>
                </div>

                <button
                  className="cyber-btn amber"
                  style={{ width: '100%', padding: '9px 14px', fontSize: '12px' }}
                  onClick={startPitSwap}
                  disabled={isSwapping}
                >
                  {isSwapping ? `SWAPPING IN PROGRESS... (${swapTimer}s)` : '⚡ RUN 15s PIT SWAP SIMULATION'}
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--cyber-border-faint)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--cyber-text-dim)', fontFamily: 'var(--cyber-mono)' }}>
                <span>BUS: 16.79V 4S</span>
                <span>BURST: 95C (120A)</span>
                <span>PACK MASS: 210g</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Card 5: 36T Titanium Cleat Traction Matrix
              ------------------------------------------------------------------ */}
          <div className="bento-card bento-card-5 hud-corner">
            <div>
              <div className="bento-card-header">
                <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
                  TRACTION DRIVE
                </span>
                <span className="cyber-badge">TI-6AL-4V</span>
              </div>

              <h3 className="bento-card-title">05 // 36T Titanium Cleat Traction Matrix</h3>
              <p className="bento-card-desc">
                High-speed melty translation requires extreme wheel traction without shredding under 4,000 RPM wheel scrub.
                Compare friction coefficients (μ) across arena surfaces:
              </p>

              {/* Surface Selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                <button
                  className={`weapon-btn ${selectedSurface === 'steel' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '5px 8px', fontSize: '10.5px' }}
                  onClick={() => setSelectedSurface('steel')}
                >
                  Painted Steel
                </button>
                <button
                  className={`weapon-btn ${selectedSurface === 'wood' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '5px 8px', fontSize: '10.5px' }}
                  onClick={() => setSelectedSurface('wood')}
                >
                  Plywood Test
                </button>
                <button
                  className={`weapon-btn ${selectedSurface === 'hazard' ? 'active' : ''}`}
                  style={{ flex: 1, padding: '5px 8px', fontSize: '10.5px' }}
                  onClick={() => setSelectedSurface('hazard')}
                >
                  Diamond Plate
                </button>
              </div>

              {/* Matrix Table */}
              <table className="cleat-matrix-table">
                <thead>
                  <tr>
                    <th>Wheel Material</th>
                    <th>Friction (μ)</th>
                    <th>Wear / Scrub Resistance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="highlight">
                    <td style={{ color: 'var(--neon-purple)' }}>36T Ti-6Al-4V Cleats</td>
                    <td style={{ fontFamily: 'var(--cyber-mono)' }}>μ = {currentSurface.cleatMu.toFixed(2)}</td>
                    <td style={{ color: 'var(--neon-green)' }}>Indestructible (0% wear)</td>
                  </tr>
                  <tr>
                    <td>Shore 20A Silicone</td>
                    <td style={{ fontFamily: 'var(--cyber-mono)' }}>μ = {currentSurface.siliconeMu.toFixed(2)}</td>
                    <td style={{ color: 'var(--neon-amber)' }}>High grip, vulnerable to cuts</td>
                  </tr>
                  <tr>
                    <td>TPU 95A HF Direct</td>
                    <td style={{ fontFamily: 'var(--cyber-mono)' }}>μ = {currentSurface.tpuMu.toFixed(2)}</td>
                    <td style={{ color: 'var(--cyber-text-dim)' }}>Slips during spin-up</td>
                  </tr>
                  <tr>
                    <td>Neoprene Foam</td>
                    <td style={{ fontFamily: 'var(--cyber-mono)' }}>μ = {currentSurface.foamMu.toFixed(2)}</td>
                    <td style={{ color: 'var(--neon-crimson)' }}>Melts / shreds in 30s</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ borderTop: '1px solid var(--cyber-border-faint)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)' }}>
                Surface: {currentSurface.name}
              </span>
              <Link to="/build" style={{ fontSize: '11.5px', color: 'var(--neon-purple)', textDecoration: 'none', fontWeight: 600 }}>
                CLEAT ASSEMBLY SPEC ↗
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          3. INTERACTIVE WEIGHT BUDGET MATRIX
          ---------------------------------------------------------------------- */}
      <section className="weight-budget-section hud-corner" aria-labelledby="weight-matrix-title">
        <div className="weight-header-row">
          <div>
            <h2 id="weight-matrix-title" style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="cyber-dot" style={{ color: isExactLimit ? 'var(--neon-green)' : isOverweight ? 'var(--neon-crimson)' : 'var(--neon-amber)' }} />
              INTERACTIVE WEIGHT BUDGET MATRIX // 3.00 LB CAP
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>
              Precise subsystem allocation against the strict SPARC &amp; NHRL 1,360.8 g (3.000 lb) weigh-in limit
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span
              className={`cyber-badge ${isExactLimit ? 'green' : isOverweight ? 'crimson' : 'amber'}`}
              style={{ fontSize: '13px', padding: '6px 14px' }}
            >
              {isExactLimit && '🎯 EXACT 1,360.8 g (100.0% OPTIMAL)'}
              {!isExactLimit && isOverweight && `❌ OVERWEIGHT BY ${Math.abs(deltaG)} g (DISQUALIFIED)`}
              {!isExactLimit && !isOverweight && `✅ UNDERWEIGHT BY +${deltaG} g (LEGAL)`}
            </span>
            <button className="cyber-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={resetWeightBudget}>
              RESET REV 7 BASELINE
            </button>
          </div>
        </div>

        {/* Visual Progress Breakdown Bar */}
        <div className="weight-progress-bar">
          <div
            className="weight-bar-segment"
            style={{
              width: `${(armorMass / maxBudgetG) * 100}%`,
              background: 'var(--neon-crimson, #ff2a55)',
              color: '#fff',
            }}
            title={`Armor: ${armorMass}g (${((armorMass / maxBudgetG) * 100).toFixed(1)}%)`}
          >
            ARMOR {armorMass}g
          </div>
          <div
            className="weight-bar-segment"
            style={{
              width: `${(motorMass / maxBudgetG) * 100}%`,
              background: 'var(--neon-cyan, #00f0ff)',
              color: '#000',
            }}
            title={`Motors & Pods: ${motorMass}g (${((motorMass / maxBudgetG) * 100).toFixed(1)}%)`}
          >
            MOTORS {motorMass}g
          </div>
          <div
            className="weight-bar-segment"
            style={{
              width: `${(batteryMass / maxBudgetG) * 100}%`,
              background: 'var(--neon-amber, #ffaa00)',
              color: '#000',
            }}
            title={`Dual 4S LiPo: ${batteryMass}g (${((batteryMass / maxBudgetG) * 100).toFixed(1)}%)`}
          >
            LIPO {batteryMass}g
          </div>
          <div
            className="weight-bar-segment"
            style={{
              width: `${(electronicsMass / maxBudgetG) * 100}%`,
              background: 'var(--neon-green, #00ff88)',
              color: '#000',
            }}
            title={`Electronics & LiDAR: ${electronicsMass}g (${((electronicsMass / maxBudgetG) * 100).toFixed(1)}%)`}
          >
            AVIONICS {electronicsMass}g
          </div>
          <div
            className="weight-bar-segment"
            style={{
              width: `${(puckMass / maxBudgetG) * 100}%`,
              background: 'var(--neon-purple, #a855f7)',
              color: '#fff',
            }}
            title={`Puck & Fasteners: ${puckMass}g (${((puckMass / maxBudgetG) * 100).toFixed(1)}%)`}
          >
            PUCK {puckMass}g
          </div>
        </div>

        {/* Live Sliders for Each Subsystem */}
        <div className="weight-controls-grid">
          {/* Armor Slider */}
          <div className="weight-control-card" style={{ borderLeft: '3px solid var(--neon-crimson)' }}>
            <label>
              <span>ARMOR &amp; TEETH</span>
              <strong style={{ color: 'var(--neon-crimson)' }}>{armorMass} g</strong>
            </label>
            <input
              type="range"
              min="246"
              max="520"
              step="1"
              value={armorMass}
              onChange={(e) => setArmorMass(Number(e.target.value))}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--cyber-text-dim)', marginTop: '4px' }}>
              Ti Teeth (246g) · AR500 Std (437g) · Heavy (480g)
            </div>
          </div>

          {/* Motors & Pods Slider */}
          <div className="weight-control-card" style={{ borderLeft: '3px solid var(--neon-cyan)' }}>
            <label>
              <span>MOTORS &amp; CLEAT PODS</span>
              <strong style={{ color: 'var(--neon-cyan)' }}>{motorMass} g</strong>
            </label>
            <input
              type="range"
              min="140"
              max="240"
              step="1"
              value={motorMass}
              onChange={(e) => setMotorMass(Number(e.target.value))}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--cyber-text-dim)', marginTop: '4px' }}>
              Dual BE1806 2300KV + Grade 5 Ti Cleats (184g)
            </div>
          </div>

          {/* Dual 4S LiPo Slider */}
          <div className="weight-control-card" style={{ borderLeft: '3px solid var(--neon-amber)' }}>
            <label>
              <span>DUAL 4S LIPO CARTRIDGE</span>
              <strong style={{ color: 'var(--neon-amber)' }}>{batteryMass} g</strong>
            </label>
            <input
              type="range"
              min="160"
              max="270"
              step="1"
              value={batteryMass}
              onChange={(e) => setBatteryMass(Number(e.target.value))}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--cyber-text-dim)', marginTop: '4px' }}>
              650mAh (170g) · 850mAh 95C (210g) · 1000mAh (260g)
            </div>
          </div>

          {/* Electronics & LiDAR Slider */}
          <div className="weight-control-card" style={{ borderLeft: '3px solid var(--neon-green)' }}>
            <label>
              <span>ELECTRONICS &amp; LIDAR</span>
              <strong style={{ color: 'var(--neon-green)' }}>{electronicsMass} g</strong>
            </label>
            <input
              type="range"
              min="65"
              max="130"
              step="1"
              value={electronicsMass}
              onChange={(e) => setElectronicsMass(Number(e.target.value))}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--cyber-text-dim)', marginTop: '4px' }}>
              Teensy 4.0 + Dual ±400g IMU + Micro-LiDAR (92g)
            </div>
          </div>

          {/* Chassis Puck & Fasteners Slider */}
          <div className="weight-control-card" style={{ borderLeft: '3px solid var(--neon-purple)' }}>
            <label>
              <span>PUCK &amp; ALLOY FASTENERS</span>
              <strong style={{ color: 'var(--neon-purple)' }}>{puckMass} g</strong>
            </label>
            <input
              type="range"
              min="360"
              max="490"
              step="0.1"
              value={puckMass}
              onChange={(e) => setPuckMass(Number(e.target.value))}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--cyber-text-dim)', marginTop: '4px' }}>
              TPU 95A HF Unibody + Grade 12.9 M3 Bolts (437.8g)
            </div>
          </div>
        </div>

        {/* Live Weight Summary Readout */}
        <div className="weight-summary-bar">
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Total Weight Rollup:</span>
              <div style={{ fontFamily: 'var(--cyber-mono)', fontSize: '20px', fontWeight: 800, color: isOverweight ? 'var(--neon-crimson)' : '#fff' }}>
                {totalBudgetG} g <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>({(totalBudgetG / 453.592).toFixed(3)} lb)</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Weigh-in Limit:</span>
              <div style={{ fontFamily: 'var(--cyber-mono)', fontSize: '20px', fontWeight: 800, color: 'var(--neon-cyan)' }}>
                1,360.8 g <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>(3.000 lb)</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase' }}>Allocation Margin:</span>
              <div
                style={{
                  fontFamily: 'var(--cyber-mono)',
                  fontSize: '20px',
                  fontWeight: 800,
                  color: isExactLimit ? 'var(--neon-green)' : isOverweight ? 'var(--neon-crimson)' : 'var(--neon-amber)',
                }}
              >
                {deltaG >= 0 ? `+${deltaG} g reserve` : `${deltaG} g over limit`}
              </div>
            </div>
          </div>

          <Link to="/bom" className="cyber-btn primary" style={{ padding: '10px 18px', fontSize: '12px' }}>
            VIEW INTERACTIVE BOM &amp; VENDORS ↗
          </Link>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          ALL TACTICAL COMBAT STATIONS & MODULES
          ---------------------------------------------------------------------- */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> ALL COMBAT STATIONS &amp; CAD MODULES
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              Complete engineering repository: physics simulation, firmware, BOM, CAD, and additive manufacturing
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <Link to="/lab" className="glass-panel hud-corner" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge">SIMULATOR</span>
              <span style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', color: '#fff' }}>01 // Combat Test Lab</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Spin up to 4,000 RPM on Canvas physics. Drive translation with the virtual RadioMaster Pocket,
              sweep simulated 360° LiDAR radar, and engage AI auto-ramming!
            </p>
          </Link>

          <Link to="/explorer" className="glass-panel hud-corner" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge amber">3D CAD</span>
              <span style={{ color: 'var(--neon-amber)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', color: '#fff' }}>02 // 3D Model Explorer</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Orbit and explode source CAD assemblies. Inspect TPU chassis pucks, titanium cleats, PropDrive motors,
              and 415 J AR500 hardened teeth.
            </p>
          </Link>

          <Link to="/video" className="glass-panel hud-corner" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-crimson)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge crimson">MEDIA REELS</span>
              <span style={{ color: 'var(--neon-crimson)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', color: '#fff' }}>03 // Combat Video Reels</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Broadcast studio with 4 high-speed impact breakdown reels, slow-mo killcam inspection,
              and 4-channel synchronized combat telemetry oscillographs.
            </p>
          </Link>

          <Link to="/build" className="glass-panel hud-corner" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge green">BUILD GUIDE</span>
              <span style={{ color: 'var(--neon-green)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', color: '#fff' }}>04 // Step-by-Step Build Guide</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Complete mechanical, electrical, and firmware assembly walkthrough. Torquing titanium cleats,
              soldering Teensy 4.0 flight controller, and DShot600 ESC calibration.
            </p>
          </Link>

          <Link to="/bom" className="glass-panel hud-corner" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-purple)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>PARTS &amp; BOM</span>
              <span style={{ color: 'var(--neon-purple)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', color: '#fff' }}>05 // BOM &amp; Hardware Lot</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Complete 3lb mass accounting (1,360.8g exact limit). Verified vendor links for motors, ESCs,
              Teensy MCU, SendCutSend armor lot, and spares kit.
            </p>
          </Link>

          <Link to="/firmware" className="glass-panel hud-corner" style={{ padding: '20px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge">FIRMWARE</span>
              <span style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '12px 0 6px', fontSize: '17px', color: '#fff' }}>06 // Firmware &amp; .ino Studio</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Browse the production Teensy 4.0 flight sketch. Live config generator for custom spin RPM,
              sensor baseline, latency, and SPARC failsafe timeouts.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
