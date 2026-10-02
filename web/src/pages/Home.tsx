import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';

const ModelShowcase = lazy(() => import('../components/ModelShowcase').then((m) => ({ default: m.ModelShowcase })));

export function Home() {
  return (
    <div className="page overview-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Topline Status Bar */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cyber-badge">TACTICAL CYBER-STATION // COMBAT ARCHITECTURE</span>
          <span className="cyber-badge green">ALL SYSTEMS READY</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span className="cyber-badge amber">WEIGHT: ≤1,360.8 g CAP (3 LB)</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="overview-hero" aria-labelledby="overview-title" style={{ padding: '20px 0 40px' }}>
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <span className="cyber-badge crimson">3,500 RPM KINETIC STRIKE</span>
            <span className="cyber-badge amber">DSHOT600 8kHz</span>
            <span className="cyber-badge">CRSF 250Hz</span>
          </div>

          <h1 id="overview-title" style={{ fontSize: 'clamp(38px, 6vw, 76px)', letterSpacing: '-0.05em', margin: '0 0 16px', lineHeight: 1.05, color: '#fff' }}>
            EYELINER <span style={{ color: 'var(--neon-cyan)', fontSize: '0.65em' }}>/ 3 LB</span>
          </h1>

          <p className="overview-subtitle" style={{ fontSize: 'clamp(18px, 2.2vw, 26px)', color: 'var(--neon-amber)', margin: '0 0 16px' }}>
            Next-Gen Autonomous Meltybrain Combat Robot.
          </p>

          <p className="overview-description" style={{ color: 'var(--cyber-text-muted)', fontSize: '15px', lineHeight: 1.6, maxWidth: '44ch', margin: '0 0 24px' }}>
            High-speed rotational translation weapon. Spun up to 3,500 RPM, guided by dual ±400g H3LIS331
            accelerometers, pulsed stroboscopic optical beacon, and autonomous LiDAR opponent auto-ramming.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link className="cyber-btn primary" to="/lab" style={{ padding: '12px 24px', fontSize: '14px' }}>
              ⚡ ENTER COMBAT LAB
            </Link>
            <Link className="cyber-btn" to="/explorer" style={{ padding: '12px 20px', fontSize: '14px' }}>
              🛰️ 3D MODEL EXPLORER
            </Link>
            <Link className="cyber-btn amber" to="/cyberdeck" style={{ padding: '12px 20px', fontSize: '14px' }}>
              🎮 RADIOMASTER STATION
            </Link>
          </div>
        </div>

        <div className="glass-panel hud-corner" style={{ padding: '16px', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Suspense fallback={<div className="model-showcase-stage" role="status" style={{ color: 'var(--neon-cyan)' }}>INITIALIZING 3D TACTICAL VIEWER…</div>}>
            <ModelShowcase />
          </Suspense>
        </div>
      </section>

      {/* Cyber Combat Station Navigation Modules */}
      <section style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> TACTICAL COMBAT STATIONS &amp; MODULES
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              Integrated engineering suites: physics simulation, firmware kernel, telemetry, and 3D printing
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

          {/* Station 3: Firmware & .ino Explorer */}
          <Link to="/firmware" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-green)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge green">KERNEL</span>
              <span style={{ color: 'var(--neon-green)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>03 // Firmware &amp; .ino Studio</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Browse the production Teensy 4.0 flight sketch. Live config generator for custom spin RPM,
              sensor baseline, latency, and SPARC failsafe timeouts.
            </p>
          </Link>

          {/* Station 4: RadioMaster Tactical Station */}
          <Link to="/cyberdeck" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-purple)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>GROUND LINK</span>
              <span style={{ color: 'var(--neon-purple)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>04 // RadioMaster Cyberdeck</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              RadioMaster Pocket ELRS 2.4GHz hardware layout, EdgeTX model skeleton, CRSF wiring crossover,
              and live telemetry downlinks.
            </p>
          </Link>

          {/* Station 5: 3D Printing & Slicer Studio */}
          <Link to="/printing" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-cyan)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge">ADDITIVE MFG</span>
              <span style={{ color: 'var(--neon-cyan)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>05 // 3D Printing &amp; Slicer</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Bambu Studio / OrcaSlicer profiles (TPU 95A HF, PA6-CF, PETG HF). 17 direct STL downloads,
              Bambu preset export (.ini), and material cost calculator.
            </p>
          </Link>

          {/* Station 6: Bill of Materials & Cost */}
          <Link to="/bom" className="glass-panel hud-corner" style={{ padding: '22px', textDecoration: 'none', color: 'inherit', borderLeft: '3px solid var(--neon-crimson)', transition: 'all 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="cyber-badge crimson">BOM &amp; SPEC</span>
              <span style={{ color: 'var(--neon-crimson)', fontSize: '18px' }}>↗</span>
            </div>
            <h3 style={{ margin: '14px 0 6px', fontSize: '18px', color: '#fff' }}>06 // BOM, Weight &amp; Cost</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
              Full 3lb weight budget accounting (1,360.8g cap). Verified vendor links for motors, ESCs,
              Teensy MCU, SendCutSend armor lot, and spares kit.
            </p>
          </Link>

        </div>
      </section>
    </div>
  );
}
