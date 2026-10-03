import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';

const ModelShowcase = lazy(() => import('../components/ModelShowcase').then((m) => ({ default: m.ModelShowcase })));

type HeroViewMode = 'render' | '3d' | 'underside' | 'internals';

export function Home() {
  const [heroView, setHeroView] = useState<HeroViewMode>('render');

  return (
    <div className="page overview-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Topline Status Bar */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="cyber-badge">TACTICAL CYBER-STATION // COMBAT ARCHITECTURE</span>
          <span className="cyber-badge green">SYSTEM REV: 5.0 COMBAT READY</span>
          <span className="cyber-badge">SPARC BEETLEWEIGHT 3LB</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="cyber-badge amber">WEIGHT: 1,222 g / 2.69 lb (CAP 1,360.8 g)</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="overview-hero" aria-labelledby="overview-title" style={{ padding: '20px 0 40px', display: 'grid', gridTemplateColumns: 'minmax(320px, 1.05fr) minmax(320px, 1.15fr)', gap: '36px', alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span className="cyber-badge crimson">3,500 RPM KINETIC STRIKE</span>
            <span className="cyber-badge amber">DSHOT600 8kHz</span>
            <span className="cyber-badge">CRSF 250Hz</span>
            <span className="cyber-badge green">AUTONOMOUS LIDAR</span>
          </div>

          <h1 id="overview-title" style={{ fontSize: 'clamp(36px, 5.5vw, 70px)', letterSpacing: '-0.05em', margin: '0 0 12px', lineHeight: 1.05, color: '#fff' }}>
            EYELINER <span style={{ color: 'var(--neon-cyan)', fontSize: '0.62em' }}>/ 3 LB</span>
          </h1>

          <p className="overview-subtitle" style={{ fontSize: 'clamp(17px, 2vw, 24px)', color: 'var(--neon-amber)', margin: '0 0 14px', fontWeight: 600 }}>
            Next-Gen Autonomous Meltybrain Combat Robot.
          </p>

          <p className="overview-description" style={{ color: 'var(--cyber-text-muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '52ch', margin: '0 0 20px' }}>
            High-speed rotational translation weapon with 1.2 kJ kinetic impact energy. Spun up to 3,500 RPM,
            translating via directional motor throttle differential pulsing, guided by dual ±400g H3LIS331DL
            accelerometers, pulsed stroboscopic optical beacon, and autonomous LiDAR opponent auto-ramming.
          </p>

          {/* Quick Stats Badges Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--neon-crimson)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Strike Speed</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--neon-crimson)', fontFamily: 'var(--cyber-mono)' }}>3,500 RPM</div>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>1.2 kJ kinetic energy</div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--neon-amber)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Combat Weight</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--neon-amber)', fontFamily: 'var(--cyber-mono)' }}>1,222g (2.69 lb)</div>
              <div style={{ fontSize: '11px', color: 'var(--neon-green)' }}>+138.8g ballast reserve</div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--neon-cyan)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Traction Drive</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: 'var(--cyber-mono)' }}>Ti-6Al-4V Cleats</div>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>Invertible drive wheels</div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--neon-green)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Centrifugal IMU</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-green)', fontFamily: 'var(--cyber-mono)' }}>Dual ±400G</div>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>H3LIS331DL SPI 10MHz</div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--neon-purple)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Auto-Targeting</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-purple)', fontFamily: 'var(--cyber-mono)' }}>Micro-LiDAR</div>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>360° opponent lock radar</div>
            </div>

            <div className="glass-panel" style={{ padding: '10px 14px', borderLeft: '3px solid var(--neon-cyan)' }}>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Motor Control</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-cyan)', fontFamily: 'var(--cyber-mono)' }}>DSHOT600 8kHz</div>
              <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>4S LiPo / AM32 ESCs</div>
            </div>
          </div>

          {/* Prominent Quick-Action Launch Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
            <Link className="cyber-btn primary" to="/lab" style={{ padding: '12px 16px', fontSize: '13px', justifyContent: 'flex-start' }}>
              ⚡ Combat Driving Simulator
            </Link>
            <Link className="cyber-btn" to="/explorer" style={{ padding: '12px 16px', fontSize: '13px', justifyContent: 'flex-start' }}>
              🔍 3D CAD Explorer
            </Link>
            <Link className="cyber-btn" to="/build" style={{ padding: '12px 16px', fontSize: '13px', justifyContent: 'flex-start' }}>
              🛠️ Step-by-Step Build Guide
            </Link>
            <Link className="cyber-btn" to="/bom" style={{ padding: '12px 16px', fontSize: '13px', justifyContent: 'flex-start' }}>
              📋 Interactive Parts &amp; BOM
            </Link>
            <Link className="cyber-btn" to="/firmware" style={{ padding: '12px 16px', fontSize: '13px', justifyContent: 'flex-start' }}>
              💻 Firmware &amp; .ino Studio
            </Link>
            <Link className="cyber-btn amber" to="/cyberdeck" style={{ padding: '12px 16px', fontSize: '13px', justifyContent: 'flex-start' }}>
              📻 RadioMaster &amp; Cyberdeck
            </Link>
          </div>
        </div>

        {/* Hero Showcase Stage (Rev 5 Photo-Accurate Render & 3D Interactive) */}
        <div className="glass-panel hud-corner" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Stage Viewport Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                className={`cyber-btn ${heroView === 'render' ? 'primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => setHeroView('render')}
              >
                📸 REV 5 RENDER
              </button>
              <button
                className={`cyber-btn ${heroView === '3d' ? 'primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => setHeroView('3d')}
              >
                🌐 3D CAD ORBIT
              </button>
              <button
                className={`cyber-btn ${heroView === 'underside' ? 'primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => setHeroView('underside')}
              >
                ⚙️ UNDERSIDE CLEATS
              </button>
              <button
                className={`cyber-btn ${heroView === 'internals' ? 'primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => setHeroView('internals')}
              >
                🧠 AVIONICS BAY
              </button>
            </div>
            <span className="cyber-badge" style={{ fontSize: '10px' }}>
              {heroView === 'render' && 'REV 5.0 PHOTO-ACCURATE'}
              {heroView === '3d' && 'INTERACTIVE WEBGL'}
              {heroView === 'underside' && 'INVERTIBLE DRIVE'}
              {heroView === 'internals' && 'DUAL SENSOR AVIONICS'}
            </span>
          </div>

          {/* Stage Display Area */}
          <div style={{ position: 'relative', width: '100%', minHeight: '400px', background: 'rgba(4, 7, 14, 0.75)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--cyber-border-faint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {heroView === 'render' && (
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <img
                  src="/cad/eyeliner_combat_v01.png"
                  alt="Eyeliner Rev 5 photo-accurate combat robot render"
                  style={{ width: '100%', height: '400px', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(8, 12, 21, 0.85)', backdropFilter: 'blur(10px)', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)', fontSize: '12px' }}>
                  <span style={{ color: '#fff' }}><strong>Rev 5 Complete Combat Assembly</strong> · Dual AR500 teeth &amp; Ti-6Al-4V cleat pods</span>
                  <Link to="/explorer" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>Explore CAD ↗</Link>
                </div>
              </div>
            )}

            {heroView === '3d' && (
              <div style={{ width: '100%', height: '400px' }}>
                <Suspense fallback={<div style={{ color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>INITIALIZING 3D TACTICAL VIEWER…</div>}>
                  <ModelShowcase />
                </Suspense>
              </div>
            )}

            {heroView === 'underside' && (
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <img
                  src="/cad/eyeliner_combat_v01_underside.png"
                  alt="Eyeliner underside showing invertible cleat drivetrain"
                  style={{ width: '100%', height: '400px', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(8, 12, 21, 0.85)', backdropFilter: 'blur(10px)', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)', fontSize: '12px' }}>
                  <span style={{ color: '#fff' }}><strong>Underside Cleat Pod Layout</strong> · Symmetrical invertible ground clearance</span>
                  <Link to="/build" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>Build Specs ↗</Link>
                </div>
              </div>
            )}

            {heroView === 'internals' && (
              <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <img
                  src="/cad/eyeliner_combat_v01_internals.png"
                  alt="Eyeliner internal avionics bay with dual H3LIS331DL accelerometers and Teensy 4.0"
                  style={{ width: '100%', height: '400px', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(8, 12, 21, 0.85)', backdropFilter: 'blur(10px)', padding: '8px 14px', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)', fontSize: '12px' }}>
                  <span style={{ color: '#fff' }}><strong>Avionics &amp; Sensor Routing</strong> · Dual ±400g H3LIS331DL &amp; Teensy 4.0</span>
                  <Link to="/firmware" style={{ color: 'var(--neon-green)', textDecoration: 'none', fontWeight: 600 }}>Firmware .ino ↗</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive Cards Section */}
      <section style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> TACTICAL ENGINEERING DEEP DIVES
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>
              Critical innovations driving autonomous meltybrain translation, target tracking, and combat durability
            </span>
          </div>
          <span className="cyber-badge green">ALL SYSTEMS VALIDATED</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px' }}>
          
          {/* Deep Dive 1: Invertible Cleat Drivetrain */}
          <div className="glass-panel hud-corner" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid var(--neon-cyan)' }}>
            <div>
              <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--cyber-border-faint)' }}>
                <img
                  src="/cad/eyeliner_cleat_wheel_detail.png"
                  alt="Ti-6Al-4V cleat wheel and invertible drive detail"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span className="cyber-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(8, 12, 21, 0.85)' }}>
                  DRIVETRAIN
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="cyber-badge">TI-6AL-4V WATERJET</span>
                <span className="cyber-badge green">INVERTIBLE CLEARANCE</span>
                <span className="cyber-badge amber">DUAL BE1806 2300KV</span>
              </div>

              <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: '#fff' }}>
                Invertible Cleat Drivetrain
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.6 }}>
                Meltybrain combat bots endure violent kinetic impacts that invert or toss the chassis across the arena.
                Eyeliner features a completely symmetrical top-and-bottom drive module: laser-waterjet Grade 5 Titanium
                (Ti-6Al-4V) cleat wheels paired with high-traction TPU dual rings provide 0.85 static friction against painted
                steel floors. The bot drives upside-down instantaneously with zero mechanical self-righting delay.
              </p>

              <div style={{ padding: '10px 12px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.15)', fontSize: '12px', color: 'var(--cyber-text-dim)', marginBottom: '16px' }}>
                <strong>Key Specs:</strong> 18 mm OD · 12-tooth Ti cleats · 240 g module mass · 4S overvoltage headroom
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <Link to="/explorer" className="cyber-btn primary" style={{ width: '100%', padding: '10px', fontSize: '12px' }}>
                EXPLORE CLEAT CAD ↗
              </Link>
              <Link to="/build" className="cyber-btn" style={{ padding: '10px 14px', fontSize: '12px' }}>
                ASSEMBLY
              </Link>
            </div>
          </div>

          {/* Deep Dive 2: Micro-LiDAR AI Auto-Ramming */}
          <div className="glass-panel hud-corner" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid var(--neon-purple)' }}>
            <div>
              <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--cyber-border-faint)' }}>
                <img
                  src="/cad/eyeliner_combat_v01_lidar_detail.png"
                  alt="Micro-LiDAR sensor and turret detail"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span className="cyber-badge" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(8, 12, 21, 0.85)', color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
                  TARGETING
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>TOF 58 SWEEPS/SEC</span>
                <span className="cyber-badge green">SUB-5MS GATING</span>
                <span className="cyber-badge crimson">AUTONOMOUS RAM</span>
              </div>

              <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: '#fff' }}>
                Micro-LiDAR AI Auto-Ramming
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.6 }}>
                As Eyeliner spins at 3,500 RPM (58.3 full sweeps per second), an embedded high-speed pulsed Time-of-Flight
                micro-LiDAR sensor scans a full 360° radar field. On-chip radial range gating filters arena boundaries,
                locking onto the opponent robot&apos;s azimuth and velocity. When auto-ram is triggered, the flight controller
                automatically adjusts motor phase pulse duty to charge the opponent with zero driver latency.
              </p>

              <div style={{ padding: '10px 12px', background: 'rgba(168, 85, 247, 0.05)', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.15)', fontSize: '12px', color: 'var(--cyber-text-dim)', marginBottom: '16px' }}>
                <strong>Key Specs:</strong> 4.0 m envelope · 15° beam width · &lt;5 ms pulse gating · Lead-angle trajectory solver
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <Link to="/lab" className="cyber-btn primary" style={{ width: '100%', padding: '10px', fontSize: '12px' }}>
                TEST IN SIMULATOR ↗
              </Link>
              <Link to="/firmware" className="cyber-btn" style={{ padding: '10px 14px', fontSize: '12px' }}>
                ALGORITHM
              </Link>
            </div>
          </div>

          {/* Deep Dive 3: Dual-Accelerometer Centrifugal Omega Estimation */}
          <div className="glass-panel hud-corner" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid var(--neon-green)' }}>
            <div>
              <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--cyber-border-faint)' }}>
                <img
                  src="/cad/eyeliner_combat_v01_internals.png"
                  alt="Dual H3LIS331DL accelerometer mounting and internal avionics"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span className="cyber-badge green" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(8, 12, 21, 0.85)' }}>
                  AVIONICS
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="cyber-badge green">DUAL H3LIS331DL ±400G</span>
                <span className="cyber-badge">SPI 10MHZ</span>
                <span className="cyber-badge amber">1,000HZ LOOP</span>
              </div>

              <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: '#fff' }}>
                Dual-Accelerometer Centrifugal Omega Estimation
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.6 }}>
                Standard MEMS gyroscopes clip and saturate at 2,000 deg/s (~333 RPM). Eyeliner bypasses this limit with
                two ±400g H3LIS331DL accelerometers mounted at precision calibrated radial distances r₁ and r₂ from the center
                of rotation. Differencing the two sensors completely cancels chassis translation acceleration, computing pure
                rotational velocity ω = √(Δa/Δr) up to 4,000+ RPM with sub-degree beacon phase lock.
              </p>

              <div style={{ padding: '10px 12px', background: 'rgba(0, 255, 136, 0.05)', borderRadius: '6px', border: '1px solid rgba(0, 255, 136, 0.15)', fontSize: '12px', color: 'var(--cyber-text-dim)', marginBottom: '16px' }}>
                <strong>Key Specs:</strong> 10 MHz SPI bus · 1,000 Hz filter loop · 0.05% phase jitter · Zero gyro drift
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <Link to="/firmware" className="cyber-btn primary" style={{ width: '100%', padding: '10px', fontSize: '12px' }}>
                BROWSE FIRMWARE .INO ↗
              </Link>
              <Link to="/engineering" className="cyber-btn" style={{ padding: '10px 14px', fontSize: '12px' }}>
                CALCS
              </Link>
            </div>
          </div>

          {/* Deep Dive 4: RadioMaster Pocket Custom Dock */}
          <div className="glass-panel hud-corner" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '3px solid var(--neon-amber)' }}>
            <div>
              <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--cyber-border-faint)' }}>
                <img
                  src="/cad/cyberdeck_dock_detail.png"
                  alt="RadioMaster Pocket custom 3D printed cyberdeck dock"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span className="cyber-badge amber" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(8, 12, 21, 0.85)' }}>
                  GROUND STATION
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <span className="cyber-badge amber">EDGETX 2.10</span>
                <span className="cyber-badge">CRSF 250HZ</span>
                <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>7" FPV CYBERDECK</span>
              </div>

              <h3 style={{ margin: '0 0 10px', fontSize: '19px', color: '#fff' }}>
                RadioMaster Pocket Custom Dock
              </h3>

              <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.6 }}>
                A field-ready, 3D printed cyberdeck docking station engineered specifically for the RadioMaster Pocket ELRS
                transmitter. Integrates a 7-inch sunlight-readable telemetry display, USB-C diagnostic pass-through to Combat Lab,
                magnetic quick-release handset latch, hot-swappable dual 18650 power pack, and an external SPARC-compliant
                hardware disarm switch for safe pit handling.
              </p>

              <div style={{ padding: '10px 12px', background: 'rgba(255, 170, 0, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 170, 0, 0.15)', fontSize: '12px', color: 'var(--cyber-text-dim)', marginBottom: '16px' }}>
                <strong>Key Specs:</strong> PA6-CF nylon print · M3 brass heatsets · 250 Hz packet rate · &lt;4 ms stick latency
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <Link to="/cyberdeck" className="cyber-btn amber" style={{ width: '100%', padding: '10px', fontSize: '12px' }}>
                OPEN CYBERDECK STATION ↗
              </Link>
              <Link to="/printing" className="cyber-btn" style={{ padding: '10px 14px', fontSize: '12px' }}>
                STL FILES
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* Cyber Combat Station Navigation Modules */}
      <section style={{ marginTop: '36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> ALL TACTICAL COMBAT STATIONS &amp; MODULES
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              Complete engineering repository: physics simulation, firmware, BOM, CAD, and additive manufacturing
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Station 1: Combat Test Lab */}
          <Link to="/lab" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-cyan)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge">SIMULATOR</span>
              <span style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>01 // Combat Test Lab</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Spin up to 3,500 RPM on Canvas physics. Drive translation with the virtual RadioMaster Pocket,
              sweep simulated 360° LiDAR radar, and engage AI auto-ramming!
            </p>
          </Link>

          {/* Station 2: 3D Model Explorer */}
          <Link to="/explorer" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-amber)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge amber">3D CAD</span>
              <span style={{ color: 'var(--neon-amber)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>02 // 3D Model Explorer</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Orbit and explode source CAD assemblies. Inspect TPU chassis pucks, titanium cleats, PropDrive motors,
              and 1.2 kJ AR500 hardened teeth.
            </p>
          </Link>

          {/* Station 3: Build Guide & Step-by-Step */}
          <Link to="/build" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-cyan)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge">ASSEMBLY GUIDE</span>
              <span style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>03 // Step-by-Step Build Guide</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Complete mechanical, electrical, and firmware assembly walkthrough. Torquing titanium cleats,
              soldering Teensy 4.0 flight controller, and DShot600 ESC calibration.
            </p>
          </Link>

          {/* Station 4: Bill of Materials & Cost */}
          <Link to="/bom" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-crimson)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge crimson">BOM &amp; SPEC</span>
              <span style={{ color: 'var(--neon-crimson)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>04 // BOM, Weight &amp; Cost</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Full 3lb weight budget accounting (1,222g actual vs 1,360.8g cap). Verified vendor links for motors, ESCs,
              Teensy MCU, SendCutSend armor lot, and spares kit.
            </p>
          </Link>

          {/* Station 5: Firmware & .ino Explorer */}
          <Link to="/firmware" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-green)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge green">KERNEL</span>
              <span style={{ color: 'var(--neon-green)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>05 // Firmware &amp; .ino Studio</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Browse the production Teensy 4.0 flight sketch. Live config generator for custom spin RPM,
              sensor baseline, latency, and SPARC failsafe timeouts.
            </p>
          </Link>

          {/* Station 6: RadioMaster Tactical Station */}
          <Link to="/cyberdeck" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-purple)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>GROUND LINK</span>
              <span style={{ color: 'var(--neon-purple)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>06 // RadioMaster Cyberdeck</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              RadioMaster Pocket ELRS 2.4GHz hardware layout, 3D printed cyberdeck dock renders, EdgeTX model skeleton,
              and live telemetry downlinks.
            </p>
          </Link>

          {/* Station 7: 3D Printing & Slicer Studio */}
          <Link to="/printing" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-cyan)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge">ADDITIVE MFG</span>
              <span style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>07 // 3D Printing &amp; Slicer</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Bambu Studio / OrcaSlicer profiles (TPU 95A HF, PA6-CF, PETG HF). 17 direct STL downloads,
              Bambu preset export (.ini), and material cost calculator.
            </p>
          </Link>

          {/* Station 8: Engineering Calcs & Physics */}
          <Link to="/engineering" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-amber)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge amber">PHYSICS</span>
              <span style={{ color: 'var(--neon-amber)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>08 // Engineering &amp; Physics</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Centrifugal acceleration equations, moment of inertia tensor, kinetic impact energy dissipation,
              and dynamic mass balance verification.
            </p>
          </Link>

        </div>
      </section>

      {/* Weight Budget Breakdown Bar */}
      <section className="glass-panel hud-corner" style={{ marginTop: '36px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" style={{ background: 'var(--neon-green)' }} />
              Combat Weight Budget Allocation (1,222.0 g / 1,360.8 g Max)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              138.8 g (10.2%) under the SPARC 3 lb limit — allows armor thickening or tungsten ballast
            </span>
          </div>
          <span className="cyber-badge green">COMPLIANT // 2.69 LB</span>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ width: '100%', height: '24px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', border: '1px solid var(--cyber-border-faint)', marginBottom: '14px' }}>
          <div style={{ width: '35.8%', background: 'var(--neon-crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }} title="AR500 Teeth & Armor: 437g (35.8%)">
            ARMOR 437g
          </div>
          <div style={{ width: '19.6%', background: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#000' }} title="Drivetrain & Motors: 240g (19.6%)">
            DRIVE 240g
          </div>
          <div style={{ width: '20.8%', background: 'var(--neon-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#000' }} title="TPU Chassis Pucks: 254g (20.8%)">
            CHASSIS 254g
          </div>
          <div style={{ width: '16.0%', background: 'var(--neon-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#000' }} title="4S LiPo Battery: 195g (16.0%)">
            BATT 195g
          </div>
          <div style={{ width: '7.8%', background: 'var(--neon-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' }} title="Avionics & Sensors: 96g (7.8%)">
            IMU 96g
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--cyber-text-dim)', flexWrap: 'wrap', gap: '8px' }}>
          <span>⚔️ AR500 Armor: 437g</span>
          <span>⚙️ Drivetrain (Motors + Cleats): 240g</span>
          <span>🛡️ TPU Pucks &amp; Diffuser: 254g</span>
          <span>🔋 4S 850mAh Battery: 195g</span>
          <span>🧠 Teensy + Dual IMU + LiDAR: 96g</span>
          <span style={{ color: 'var(--neon-green)', fontWeight: 600 }}>⚖️ Margin: 138.8g</span>
        </div>
      </section>
    </div>
  );
}
