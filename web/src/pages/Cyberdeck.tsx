import { useState } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';

export function Cyberdeck() {
  const [activeTab, setActiveTab] = useState<'schematic' | 'dock' | 'channels' | 'wiring' | 'safety' | 'telemetry'>('schematic');
  const [simLinkActive, setSimLinkActive] = useState(true);

  return (
    <div className="page cyberdeck-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Status */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="cyber-badge">TACTICAL STATION // CYBERDECK</span>
          <span className="cyber-badge green">CRSF 420K BAUD</span>
          <span className="cyber-badge amber">EXPRESSLRS 2.4GHz</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/lab" className="cyber-btn primary" style={{ padding: '6px 14px', fontSize: '11px' }}>
            LAUNCH COMBAT LAB ↗
          </Link>
        </div>
      </div>

      {/* Cyberdeck Header */}
      <div style={{ marginTop: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '0 0 8px', letterSpacing: '-0.04em', color: '#fff' }}>
          RadioMaster Pocket Tactical Station
        </h1>
        <p style={{ color: 'var(--cyber-text-muted)', fontSize: '16px', maxWidth: '80ch', margin: 0 }}>
          The hardened ground-control link for Eyeliner 3lb Meltybrain. ExpressLRS 2.4 GHz Mode 2 handset,
          custom EdgeTX 2.10 multirotor profile, and SPARC-compliant hardware failsafe override.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          className={`cyber-btn ${activeTab === 'schematic' ? 'primary' : ''}`}
          onClick={() => setActiveTab('schematic')}
        >
          🎮 HANDSET SCHEMATIC
        </button>
        <button
          className={`cyber-btn ${activeTab === 'dock' ? 'primary' : ''}`}
          onClick={() => setActiveTab('dock')}
        >
          🏗️ 3D CYBERDECK DOCK
        </button>
        <button
          className={`cyber-btn ${activeTab === 'channels' ? 'primary' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          📋 EDGETX CHANNEL MAP
        </button>
        <button
          className={`cyber-btn ${activeTab === 'wiring' ? 'primary' : ''}`}
          onClick={() => setActiveTab('wiring')}
        >
          ⚡ CRSF → TEENSY UART
        </button>
        <button
          className={`cyber-btn ${activeTab === 'safety' ? 'primary' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          🛡️ SPARC SAFETY &amp; FAILSAFE
        </button>
        <button
          className={`cyber-btn ${activeTab === 'telemetry' ? 'primary' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          📡 CRSF TELEMETRY STREAM
        </button>
      </div>

      {/* Tab 1: Hardware Schematic */}
      {activeTab === 'schematic' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 1fr', gap: '24px' }}>
          <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> RadioMaster Pocket ELRS Layout
            </h2>
            <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
              Compact 288 g transmitter with Hall X5 nano gimbals, removable stick ends, 128×64 mono backlit LCD,
              and 250 mW internal ExpressLRS RF module.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
              <div className="glass-panel" style={{ padding: '14px', borderLeft: '3px solid var(--neon-cyan)' }}>
                <strong style={{ color: '#fff', fontSize: '14px' }}>LEFT GIMBAL (Mode 2)</strong>
                <div style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '4px' }}>
                  <strong>Vertical (CH3):</strong> Throttle / Spin Rate (0 to 3,500 RPM)<br />
                  <strong>Horizontal (CH4):</strong> Virtual Heading Trim (Fine zero-drift azimuth bias)
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', borderLeft: '3px solid var(--neon-amber)' }}>
                <strong style={{ color: '#fff', fontSize: '14px' }}>RIGHT GIMBAL (Mode 2)</strong>
                <div style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '4px' }}>
                  <strong>Vertical (CH2):</strong> Pitch / Forward-Reverse Translation Vector<br />
                  <strong>Horizontal (CH1):</strong> Roll / Left-Right Strafe Translation Vector
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', borderLeft: '3px solid var(--neon-crimson)' }}>
                <strong style={{ color: '#fff', fontSize: '14px' }}>SWITCH SA (Top-Left 3-Position)</strong>
                <div style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '4px' }}>
                  <strong>Safety Arming Interlock (CH5):</strong> UP/MID = Disarmed (-100). DOWN = Armed (+100).
                  Two disarmed slots prevent accidental bumps when carrying in the pit bag.
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '14px', borderLeft: '3px solid var(--neon-green)' }}>
                <strong style={{ color: '#fff', fontSize: '14px' }}>SWITCH SF (Momentary Right Shoulder)</strong>
                <div style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '4px' }}>
                  <strong>AUTONOMY-KILL (CH7):</strong> Held down = Autonomy/Auto-ramming permitted.<br />
                  Released = Instant hardware fallback to manual RC control and disarm latch.
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', marginTop: 0 }}>
              Hardware Specifications
            </h2>
            <div className="table-wrap" style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>RF Protocol</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: '#fff' }}>ExpressLRS 2.4 GHz (CRSF v3)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>Packet Rate</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'var(--neon-green)' }}>250 Hz (4 ms packet period)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>RF Output Power</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>250 mW (FCC) / 100 mW (LBT)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>Operating Voltage</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: '#fff' }}>6.6–8.4 V DC (2× 18650 flat-top)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>Batteries</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: '#fff' }}>2× Samsung 35E / Molicel M35A (Unprotected)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>Firmware OS</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: '#fff' }}>EdgeTX 2.10 (BlackPearl template)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--cyber-text-muted)' }}>Receiver in Bot</td>
                    <td style={{ padding: '10px 0', fontWeight: 'bold', color: 'var(--neon-amber)' }}>RadioMaster RP1 / Happymodel EP1 (0.5g)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '24px', padding: '14px', background: 'rgba(0, 240, 255, 0.08)', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
              <strong style={{ color: 'var(--neon-cyan)', fontSize: '13px' }}>PRO-TIP: RECTANGULAR WINDOW ANTENNA ROUTING</strong>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                Carbon fiber and aluminum armor plates attenuate 2.4 GHz signals by &gt;25 dB. Route the RP1 dipole T-antenna
                directly through the polycarbonate optical diffuser window on top of the robot to ensure clean spherical coverage.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: 3D Printed Cyberdeck Dock */}
      {activeTab === 'dock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', color: 'var(--neon-purple)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="cyber-dot" style={{ background: 'var(--neon-purple)' }} />
                  RadioMaster Pocket Custom Cyberdeck Dock &amp; Ground Station
                </h2>
                <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>
                  Heavy-duty combat pit station integrating transmitter cradle, 7" telemetry display, and quick-swap battery bay
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="cyber-badge" style={{ color: 'var(--neon-purple)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>PA6-CF NYLON</span>
                <span className="cyber-badge green">M3 HEATSETS</span>
                <span className="cyber-badge">NEODYMIUM LATCH</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '24px' }}>
              <div className="glass-panel" style={{ overflow: 'hidden', padding: '14px', borderTop: '3px solid var(--neon-purple)' }}>
                <img
                  src="/cad/cyberdeck_dock_detail.png"
                  alt="RadioMaster Pocket Dock Detail"
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}
                />
                <h3 style={{ margin: '12px 0 6px', fontSize: '16px', color: '#fff' }}>Transmitter Cradle &amp; Snap Dock</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Contoured TPU-lined pocket holds the RadioMaster Pocket firmly with zero slip. Recessed channels protect gimbal sticks and top antenna during transit.
                </p>
              </div>

              <div className="glass-panel" style={{ overflow: 'hidden', padding: '14px', borderTop: '3px solid var(--neon-cyan)' }}>
                <img
                  src="/cad/cyberdeck_base_station.png"
                  alt="Cyberdeck Base Station Assembly"
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}
                />
                <h3 style={{ margin: '12px 0 6px', fontSize: '16px', color: '#fff' }}>Base Station Enclosure</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Unified clamshell housing supporting an adjustable-tilt 7" IPS display bracket, USB-C telemetry pass-through, and external SMA dipole antenna mount.
                </p>
              </div>

              <div className="glass-panel" style={{ overflow: 'hidden', padding: '14px', borderTop: '3px solid var(--neon-amber)' }}>
                <img
                  src="/cad/cyberdeck_screen_case.png"
                  alt="Cyberdeck Screen Bezel"
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}
                />
                <h3 style={{ margin: '12px 0 6px', fontSize: '16px', color: '#fff' }}>Display Bezel &amp; Sunshade</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Recessed screen frame with integrated sunshade flaps. Eliminates arena floodlight glare during driver line-of-sight operations.
                </p>
              </div>

              <div className="glass-panel" style={{ overflow: 'hidden', padding: '14px', borderTop: '3px solid var(--neon-green)' }}>
                <img
                  src="/cad/cyberdeck_internals.png"
                  alt="Cyberdeck Internal Routing"
                  style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--cyber-border-faint)' }}
                />
                <h3 style={{ margin: '12px 0 6px', fontSize: '16px', color: '#fff' }}>Internal Bus &amp; Power Routing</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Cable management tunnels for CP2102 UART telemetry tap, 5V/3A UBEC power rail, dual 18650 cell carrier, and safety isolation switch.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px' }}>
                <strong style={{ color: 'var(--neon-purple)', fontSize: '13px' }}>🖨️ PRINT SPECIFICATION</strong>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Material: Bambu PA6-CF or PETG-HF<br />
                  Walls: 5 loops | Infill: 40% Gyroid<br />
                  Layer height: 0.16mm Optimal<br />
                  Hardware: 14× M3×6mm brass heatset inserts
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px' }}>
                <strong style={{ color: 'var(--neon-cyan)', fontSize: '13px' }}>🔋 POWER ARCHITECTURE</strong>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Cells: 2× 18650 Li-Ion (parallel 1S2P or 2S)<br />
                  Runtime: &gt;8.5 hours continuous telemetry<br />
                  Charging: USB-C PD 15W onboard module<br />
                  Protection: Over-discharge &amp; thermal cutoff
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '16px' }}>
                <strong style={{ color: 'var(--neon-amber)', fontSize: '13px' }}>⚡ PIT TELEMETRY BRIDGE</strong>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--cyber-text-muted)', lineHeight: 1.5 }}>
                  Interface: EdgeTX AUX serial port<br />
                  Baud rate: 420,000 baud CRSF / 115,200 NMEA<br />
                  Outputs: Live Combat Lab telemetry feed, CSV blackbox logger, and battery cell health monitor
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: EdgeTX Channel Map */}
      {activeTab === 'channels' && (
        <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', marginTop: 0 }}>
            EdgeTX Model Channel Configuration (Locked Specification)
          </h2>
          <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
            Configured via EdgeTX Companion. Pre-flight stick interlocks are permanently enabled so the radio refuses
            to transmit RF if the arming switch is toggled active during boot.
          </p>

          <div className="table-wrap" style={{ overflowX: 'auto', marginTop: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--cyber-border)', textAlign: 'left', color: 'var(--neon-cyan)' }}>
                  <th style={{ padding: '12px 10px' }}>CH</th>
                  <th style={{ padding: '12px 10px' }}>Function</th>
                  <th style={{ padding: '12px 10px' }}>Physical Control</th>
                  <th style={{ padding: '12px 10px' }}>Range / Values</th>
                  <th style={{ padding: '12px 10px' }}>Failsafe Preset</th>
                  <th style={{ padding: '12px 10px' }}>Meltybrain Role</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH1</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>Roll (Aileron)</td>
                  <td style={{ padding: '12px 10px' }}>Right Stick Horizontal</td>
                  <td style={{ padding: '12px 10px' }}>-100 to +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-green)' }}>Center (0)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>Translation Vector X</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH2</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>Pitch (Elevator)</td>
                  <td style={{ padding: '12px 10px' }}>Right Stick Vertical</td>
                  <td style={{ padding: '12px 10px' }}>-100 to +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-green)' }}>Center (0)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>Translation Vector Y</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH3</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>Throttle (Spin)</td>
                  <td style={{ padding: '12px 10px' }}>Left Stick Vertical</td>
                  <td style={{ padding: '12px 10px' }}>-100 to +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-crimson)', fontWeight: 'bold' }}>-100 (CUT)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>0 to 3,500 RPM Base Power</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH4</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>Yaw (Heading Trim)</td>
                  <td style={{ padding: '12px 10px' }}>Left Stick Horizontal</td>
                  <td style={{ padding: '12px 10px' }}>-100 to +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-green)' }}>Center (0)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>Azimuth Bias Correction</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH5</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--neon-crimson)' }}>ARM INTERLOCK</td>
                  <td style={{ padding: '12px 10px' }}>Switch SA (3-Pos)</td>
                  <td style={{ padding: '12px 10px' }}>UP/MID: -100 · DOWN: +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-crimson)', fontWeight: 'bold' }}>-100 (DISARM)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>Master Motor Enable Gate</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH6</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold' }}>Drive Profile Mode</td>
                  <td style={{ padding: '12px 10px' }}>Switch SB (3-Pos)</td>
                  <td style={{ padding: '12px 10px' }}>-100 / 0 / +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-green)' }}>0 (Normal)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>Normal / Acro / Orbit-Lock</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <td style={{ padding: '12px 10px', fontFamily: 'monospace', color: 'var(--neon-amber)' }}>CH7</td>
                  <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>AUTONOMY-KILL</td>
                  <td style={{ padding: '12px 10px' }}>Switch SF (Momentary)</td>
                  <td style={{ padding: '12px 10px' }}>Released: -100 · Held: +100</td>
                  <td style={{ padding: '12px 10px', color: 'var(--neon-crimson)', fontWeight: 'bold' }}>-100 (KILL)</td>
                  <td style={{ padding: '12px 10px', color: 'var(--cyber-text-muted)' }}>Hardware Priority Kill Switch</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: CRSF -> Teensy Wiring */}
      {activeTab === 'wiring' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', marginTop: 0 }}>
              CRSF Receiver → Teensy 4.0 Pinout Crossover
            </h2>
            <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
              CRSF (Crossfire Protocol) runs full-duplex asynchronous UART at 420,000 baud 8N1.
              Always wire TX to RX and RX to TX on the SAME hardware serial port.
            </p>

            <div className="table-wrap" style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--cyber-border)', textAlign: 'left', color: 'var(--neon-cyan)' }}>
                    <th style={{ padding: '8px' }}>RP1 / EP1 Pad</th>
                    <th style={{ padding: '8px' }}>Direction</th>
                    <th style={{ padding: '8px' }}>Teensy 4.0 Pad</th>
                    <th style={{ padding: '8px' }}>Function</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--neon-crimson)' }}>5V / VCC</td>
                    <td style={{ padding: '10px 8px' }}>← IN</td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>5V / VIN (Regulated UBEC)</td>
                    <td style={{ padding: '10px 8px', color: 'var(--cyber-text-muted)' }}>Power (NOT 3.3V)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>GND</td>
                    <td style={{ padding: '10px 8px' }}>—</td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold' }}>GND (Star ground)</td>
                    <td style={{ padding: '10px 8px', color: 'var(--cyber-text-muted)' }}>Ground reference</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>TX Pad</td>
                    <td style={{ padding: '10px 8px' }}>→ OUT</td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--neon-cyan)' }}>Pin 0 (RX1 / Serial1)</td>
                    <td style={{ padding: '10px 8px', color: 'var(--cyber-text-muted)' }}>Control stick stream</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--neon-amber)' }}>RX Pad</td>
                    <td style={{ padding: '10px 8px' }}>← IN</td>
                    <td style={{ padding: '10px 8px', fontWeight: 'bold', color: 'var(--neon-amber)' }}>Pin 1 (TX1 / Serial1)</td>
                    <td style={{ padding: '10px 8px', color: 'var(--cyber-text-muted)' }}>Downlink telemetry</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255, 42, 85, 0.1)', borderRadius: '6px', border: '1px solid rgba(255, 42, 85, 0.3)' }}>
              <strong style={{ color: 'var(--neon-crimson)', fontSize: '12px' }}>CRITICAL WIRING RULE</strong>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--cyber-text-muted)' }}>
                Never power the receiver from an unbuffered 3.3V rail or an SBUS pad. ESP-based ELRS receivers enter bootloader
                mode if their RX line is pulled low at power-on.
              </p>
            </div>
          </div>

          <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', marginTop: 0 }}>
              Serial Configuration in Firmware
            </h2>
            <pre style={{ background: '#050811', padding: '16px', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.2)', fontSize: '12px', color: '#e2e8f0', overflowX: 'auto' }}>
{`// Teensy 4.0 CRSF Port Setup
#define CRSF_SERIAL_PORT  Serial1
#define CRSF_BAUD_RATE    420000

void crsf_init() {
    CRSF_SERIAL_PORT.begin(CRSF_BAUD_RATE);
    // 8 data bits, no parity, 1 stop bit
    // Rx FIFO depth set to 64 bytes
}

// 50Hz Telemetry downlink to RadioMaster
void send_telemetry_packet(uint16_t rpm, uint16_t vbat_mv, int16_t gs) {
    uint8_t packet[12];
    packet[0] = CRSF_ADDRESS_RADIO_TRANSMITTER;
    packet[1] = 10; // length
    packet[2] = CRSF_FRAMETYPE_CUSTOM_TELEMETRY;
    // ... payload encoding with CRC8
    CRSF_SERIAL_PORT.write(packet, 12);
}`}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 4: SPARC Safety & Failsafe */}
      {activeTab === 'safety' && (
        <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--neon-crimson)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="cyber-dot" style={{ background: 'var(--neon-crimson)' }} />
            SPARC Combat Failsafe &amp; Safety Compliance
          </h2>
          <p style={{ color: 'var(--cyber-text-muted)', fontSize: '14px' }}>
            Under SPARC Rule §6.4 and NHRL safety guidelines, all kinetic combat weapons must demonstrate
            a positive spin-down to zero weapon energy within 60 seconds (target: &lt;1.0s active motor cutoff) upon loss of RF signal.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid var(--neon-crimson)' }}>
              <strong style={{ color: '#fff', fontSize: '15px' }}>TEST 1: RF LINK LOSS (&lt;100 MS)</strong>
              <p style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '8px' }}>
                Turn off transmitter while motors are spinning. Firmware watchdog in <code>melty_failsafe.c</code> triggers within
                100 ms of missing CRSF frames, instantly forcing DShot throttle commands to 0.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid var(--neon-amber)' }}>
              <strong style={{ color: '#fff', fontSize: '15px' }}>TEST 2: POWER BROWNOUT ISOLATION</strong>
              <p style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '8px' }}>
                A 5V 3A dedicated UBEC powers the receiver and Teensy MCU isolated from motor phase spikes.
                If supervisor SBC or camera crashes, the primary RC failsafe loop remains 100% active.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '16px', borderTop: '3px solid var(--neon-green)' }}>
              <strong style={{ color: '#fff', fontSize: '15px' }}>TEST 3: PHYSICAL COMBAT LINK</strong>
              <p style={{ fontSize: '13px', color: 'var(--cyber-text-muted)', marginTop: '8px' }}>
                Removable XT60 high-current link plug mounted flush in the chassis puck. Allows pit crew
                to de-energize the entire 4S battery circuit in under 2 seconds without reaching near teeth.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: CRSF Telemetry Stream */}
      {activeTab === 'telemetry' && (
        <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', color: 'var(--neon-green)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="cyber-dot" style={{ background: 'var(--neon-green)' }} />
                Real-Time CRSF Downlink Stream (Simulated 50Hz)
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                Direct telemetry packets received from Teensy MCU via ExpressLRS downlink
              </span>
            </div>
            <button
              className={`cyber-btn ${simLinkActive ? 'primary' : ''}`}
              onClick={() => setSimLinkActive(!simLinkActive)}
            >
              {simLinkActive ? 'PAUSE STREAM' : 'RESUME STREAM'}
            </button>
          </div>

          <div
            style={{
              background: '#04070e',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: '6px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#4ade80',
              height: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div>[00:00:01.020] LINK_ESTABLISHED: CRSF 420000 baud · Rate 250Hz · Binding: EYELINER_V3</div>
            <div>[00:00:01.040] RX_RSSI: -38 dBm · SNR: +11.2 dB · LQ: 100% · Ant: 1</div>
            <div>[00:00:01.060] TELEMETRY_FRAME: RPM: 3482 | ACCEL_S1: 341.2G | ACCEL_S2: 338.9G | COR_SHIFT: 0.8mm</div>
            <div>[00:00:01.080] VBAT: 15.68V (4S) | CELL_MIN: 3.91V | TEMP_MCU: 38.4°C | AM32_STATUS: OK</div>
            <div>[00:00:01.100] HEADING_PLL: LOCKED | STROBE_ACTIVE: YES | WINDOW: 15.0° | MOD_DEPTH: 65%</div>
            <div>[00:00:01.120] RC_INPUT: CH1=0.00 CH2=0.45 CH3=0.98 CH4=0.00 CH5=ARMED CH7=MANUAL</div>
            <div>[00:00:01.140] DSHOT600: MOTOR_L=1820us MOTOR_R=1410us | PHASE_DELTA: 180.0°</div>
            <div style={{ color: '#00f0ff' }}>[00:00:01.160] LIDAR_SWEEP: OPPONENT_LOCKED: TOMBSTONE_JR [R=1.42m AZ=128° VEL=-0.8m/s]</div>
            <div>[00:00:01.180] TELEMETRY_FRAME: RPM: 3491 | ACCEL_S1: 342.9G | ACCEL_S2: 340.1G</div>
          </div>
        </div>
      )}
    </div>
  );
}
