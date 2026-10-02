import { useState } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';

type RecordEntry = { timestamp?: string; batteryVoltage?: number; temperatureC?: number; note?: string };
const exampleRecords: RecordEntry[] = [
  { timestamp: '2026-09-28T14:02:10Z', batteryVoltage: 16.4, temperatureC: 24.2, note: 'Pre-flight battery 4S charged. Calibration zero offset: 0.12g.' },
  { timestamp: '2026-09-28T14:02:45Z', batteryVoltage: 15.9, temperatureC: 28.5, note: 'Spin test 1,500 RPM reached. Dual H3LIS331 differential tracking verified.' },
  { timestamp: '2026-09-28T14:03:15Z', batteryVoltage: 15.4, temperatureC: 36.1, note: '3,500 RPM full spin. Centripetal 342G steady state. Optical strobe locked.' },
  { timestamp: '2026-09-28T14:03:30Z', batteryVoltage: 15.2, temperatureC: 38.0, note: 'Translation modulation active. RF cut failsafe triggered: stop in 0.82s.' },
];

const CODE_MODULES: Record<string, { filename: string; language: string; description: string; code: string }> = {
  ino: {
    filename: 'eyeliner_meltybrain.ino',
    language: 'arduino',
    description: 'Main Arduino / Teensy 4.0 combat sketch with 8 kHz DShot600, dual accelerometer SPI polling, and phase-locked loop heading beacon.',
    code: `/*
 * EYELINER 3LB MELTYBRAIN - PRODUCTION FLIGHT SKETCH
 * Target: PJRC Teensy 4.0 (Cortex-M7 @ 600 MHz)
 * Esc: AM32 55A 4-in-1 Bidirectional DShot600 via SPI
 * Sensors: 2x ST H3LIS331DLTR +/-400g SPI Accelerometers
 */

#include "melty_config.h"
#include "melty_core.h"
#include <SPI.h>

static MeltyCore_t melty;
static IntervalTimer controlLoopTimer;

// Hardware Pins
const int PIN_ACCEL1_CS = 10;
const int PIN_ACCEL2_CS = 9;
const int PIN_LED_STROBE = 6;
const int PIN_ESC_MOTOR_L = 2;
const int PIN_ESC_MOTOR_R = 3;

void setup() {
  Serial.begin(115200);
  Serial1.begin(420000); // CRSF ExpressLRS input
  
  pinMode(PIN_LED_STROBE, OUTPUT);
  digitalWrite(PIN_LED_STROBE, LOW);
  
  SPI.begin();
  SPI.beginTransaction(SPISettings(10000000, MSBFIRST, SPI_MODE3));
  
  // Initialize Meltybrain Kinematic Core
  melty_core_init(&melty, MELTY_ACCEL_RADIUS_1_M, MELTY_ACCEL_RADIUS_2_M);
  
  // Start high-precision 1 kHz / 8 kHz control ISR
  controlLoopTimer.begin(onControlLoopInterrupt, 1000); // 1000 us = 1 kHz
  Serial.println(F("[SYSTEM] Eyeliner Meltybrain Armed and Ready."));
}

void loop() {
  // Process incoming CRSF RC packets from RadioMaster Pocket
  while (Serial1.available() >= 12) {
    uint8_t buf[12];
    Serial1.readBytes(buf, 12);
    // Parse CRSF sticks: Roll (CH1), Pitch (CH2), Throttle (CH3), Arm (CH5)
    MeltyRCInput_t rc;
    rc.ch_trans_x = (float)(buf[0] - 128) / 128.0f;
    rc.ch_trans_y = (float)(buf[1] - 128) / 128.0f;
    rc.ch_throttle = (float)buf[2] / 255.0f;
    rc.switch_arm = buf[4] > 180;
    rc.link_quality_pct = buf[8];
    melty_core_update_rc(&melty, &rc);
  }
}

void onControlLoopInterrupt() {
  uint32_t now_us = micros();
  
  // Read both +/-400g H3LIS331 sensors simultaneously over SPI
  H3LIS331_RawSample_t s1 = readAccelerometer(PIN_ACCEL1_CS);
  H3LIS331_RawSample_t s2 = readAccelerometer(PIN_ACCEL2_CS);
  
  // Step kinematic equations & DShot modulation
  melty_core_step(&melty, &s1, &s2, MELTY_CONTROL_LOOP_DT, now_us);
  
  // Output optical heading flash
  digitalWrite(PIN_LED_STROBE, melty.heading.led_active ? HIGH : LOW);
  
  // Send DShot600 pulses to left and right hubmotors
  dshot_write(PIN_ESC_MOTOR_L, melty.drive.dshot_cmd_left);
  dshot_write(PIN_ESC_MOTOR_R, melty.drive.dshot_cmd_right);
}
`,
  },
  config: {
    filename: 'melty_config.h',
    language: 'c',
    description: 'Core geometry, sensor baseline, and combat speed limits.',
    code: `/*
 * EYELINER 3LB COMBAT MELTYBRAIN HARDWARE CONFIGURATION
 */
#ifndef MELTY_CONFIG_H
#define MELTY_CONFIG_H

#define MELTY_ACCEL_RADIUS_1_M            (0.025f) /* Sensor 1 radius: 25mm */
#define MELTY_ACCEL_RADIUS_2_M            (0.025f) /* Sensor 2 radius: 25mm */
#define MELTY_ACCEL_BASELINE_M            (0.050f) /* Total opposed baseline: 50mm */
#define MELTY_GRAVITY_MSS                 (9.80665f)

#define MELTY_MAX_OPERATING_RPM           (3500.0f) /* Operational spin cap */
#define MELTY_MAX_LIMIT_RPM               (4000.0f) /* Absolute failsafe trip */
#define MELTY_MIN_TRANSLATE_RPM           (800.0f)  /* Minimum spin for translation */

#define MELTY_CONTROL_LOOP_HZ             (1000.0f)
#define MELTY_CONTROL_LOOP_DT             (1.0f / MELTY_CONTROL_LOOP_HZ)
#define MELTY_RC_TIMEOUT_MS               (100)     /* SPARC link loss cutoff */
#define MELTY_VBAT_CRITICAL_MV            (12000)   /* 3.0V/cell 4S LiPo */

#define MELTY_DEFAULT_MOTOR_LATENCY_S     (0.0035f) /* 3.5ms mechanical latency */
#define MELTY_MAX_MODULATION_DEPTH        (0.65f)   /* 65% throttle modulation */
#define MELTY_LED_WINDOW_RAD              (0.2618f) /* ~15 deg heading arc */

#endif /* MELTY_CONFIG_H */
`,
  },
  kinematics: {
    filename: 'dual_h3lis331.c',
    language: 'c',
    description: 'Opposed accelerometer differential math for true RPM derivation and Center-of-Rotation (COR) drift tracking.',
    code: `/*
 * Dual H3LIS331 Opposed Accelerometer Differential Kinematics
 * Eliminates weapon impact shock and center-of-rotation displacement.
 */
#include "dual_h3lis331.h"
#include <math.h>

void dual_h3lis331_update(DualAccelTracker_t *trk,
                          const H3LIS331_RawSample_t *s1_raw,
                          const H3LIS331_RawSample_t *s2_raw,
                          float dt,
                          float spin_sign) {
    if (!trk || dt <= 0.0f) return;

    // Convert raw ADC LSB to m/s^2 at +/-400g
    float a1 = s1_raw->radial_lsb * H3LIS331_SCALE_400G_MSS_PER_LSB;
    float a2 = s2_raw->radial_lsb * H3LIS331_SCALE_400G_MSS_PER_LSB;

    // Baseline differential: omega^2 = (a1 + a2) / (r1 + r2)
    float baseline = trk->r1_m + trk->r2_m;
    float total_centripetal = a1 + a2;

    if (total_centripetal > 0.0f && baseline > 0.001f) {
        float omega2 = total_centripetal / baseline;
        trk->omega_rad_s = spin_sign * sqrtf(omega2);
        trk->rpm = fabsf(trk->omega_rad_s) * (60.0f / (2.0f * (float)M_PI));
    } else {
        trk->omega_rad_s = 0.0f;
        trk->rpm = 0.0f;
    }

    // Dynamic Center of Rotation (COR) offset tracking
    // r_cor = (a1 - a2) / (2 * omega^2)
    if (fabsf(trk->omega_rad_s) > 50.0f) {
        float omega2 = trk->omega_rad_s * trk->omega_rad_s;
        trk->cor_shift_m = (a1 - a2) / (2.0f * omega2);
    }
}
`,
  },
  drive: {
    filename: 'melty_drive.c',
    language: 'c',
    description: 'Phase-synchronized motor throttle modulation for translational sliding.',
    code: `/*
 * Meltybrain Translational Drive Modulation
 * Synthesizes vector heading by modulating motor throttle once per revolution.
 */
#include "melty_drive.h"
#include <math.h>

void melty_drive_modulate(MeltyDrive_t *drv,
                          float ch_throttle,
                          float trans_mag,
                          float trans_angle,
                          float current_heading_rad,
                          float omega_rad_s,
                          float current_rpm) {
    if (!drv) return;

    if (current_rpm < MELTY_MIN_TRANSLATE_RPM || trans_mag < 0.05f) {
        // Pure spin mode: equal symmetric throttle
        drv->throttle_left = ch_throttle;
        drv->throttle_right = ch_throttle;
        return;
    }

    // Lead angle compensation for motor electrical/mechanical latency
    float latency_rad = omega_rad_s * MELTY_DEFAULT_MOTOR_LATENCY_S;
    float effective_angle = current_heading_rad + latency_rad;

    // Sinusoidal modulation depth
    float phase_diff = effective_angle - trans_angle;
    float modulation = cosf(phase_diff) * (trans_mag * MELTY_MAX_MODULATION_DEPTH);

    // Apply differential power to opposed hubmotors
    drv->throttle_left = fminf(1.0f, fmaxf(0.0f, ch_throttle + modulation));
    drv->throttle_right = fminf(1.0f, fmaxf(0.0f, ch_throttle - modulation));

    // Convert to DShot600 standard command frame (0 to 2047)
    drv->dshot_cmd_left = (uint16_t)(48 + drv->throttle_left * 1999);
    drv->dshot_cmd_right = (uint16_t)(48 + drv->throttle_right * 1999);
}
`,
  },
};

export function Firmware() {
  const [selectedFile, setSelectedFile] = useState<string>('ino');

  // Live Config Generator Parameters
  const [cfgRpm, setCfgRpm] = useState(3500);
  const [cfgRadius, setCfgRadius] = useState(25); // mm
  const [cfgModDepth, setCfgModDepth] = useState(65); // %
  const [cfgLatency, setCfgLatency] = useState(3.5); // ms
  const [cfgFailsafeMs, setCfgFailsafeMs] = useState(100); // ms
  const [cfgLedArc, setCfgLedArc] = useState(15); // degrees
  const [cfgVbatCutoff, setCfgVbatCutoff] = useState(12.0); // V

  // Telemetry Log Desk States
  const [records, setRecords] = useState<RecordEntry[]>(exampleRecords);
  const [source, setSource] = useState('example_run_telemetry.json');
  const [feedback, setFeedback] = useState('');

  // Generated config header code string
  const generatedHeader = `/*
 * EYELINER 3LB CUSTOM AUTO-GENERATED CONFIG
 * Exported from Cyber-Combat Station Firmware Studio
 */
#ifndef MELTY_CUSTOM_CONFIG_H
#define MELTY_CUSTOM_CONFIG_H

#define MELTY_MAX_OPERATING_RPM       (${cfgRpm}.0f)
#define MELTY_ACCEL_RADIUS_1_M        (${(cfgRadius / 1000).toFixed(4)}f)
#define MELTY_ACCEL_RADIUS_2_M        (${(cfgRadius / 1000).toFixed(4)}f)
#define MELTY_MAX_MODULATION_DEPTH    (${(cfgModDepth / 100).toFixed(2)}f)
#define MELTY_MOTOR_LATENCY_S         (${(cfgLatency / 1000).toFixed(5)}f)
#define MELTY_RC_TIMEOUT_MS           (${cfgFailsafeMs})
#define MELTY_LED_WINDOW_RAD          (${((cfgLedArc * Math.PI) / 180).toFixed(4)}f)
#define MELTY_VBAT_CRITICAL_MV        (${Math.round(cfgVbatCutoff * 1000)})

#endif /* MELTY_CUSTOM_CONFIG_H */
`;

  const copyToClipboard = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback(msg);
      setTimeout(() => setFeedback(''), 3000);
    } catch {
      setFeedback('Clipboard access restricted.');
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="page firmware-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Breadcrumb */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="cyber-badge">SYSTEM // FIRMWARE &amp; .INO CODE EXPLORER</span>
          <span className="cyber-badge green">TEENSY 4.0 CORTEX-M7</span>
          <span className="cyber-badge amber">DSHOT600 8kHz</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/lab" className="cyber-btn primary" style={{ padding: '6px 14px', fontSize: '11px' }}>
            TEST IN COMBAT LAB ↗
          </Link>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginTop: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '0 0 8px', letterSpacing: '-0.04em', color: '#fff' }}>
          Firmware &amp; .ino Code Explorer
        </h1>
        <p style={{ color: 'var(--cyber-text-muted)', fontSize: '16px', maxWidth: '80ch', margin: 0 }}>
          Inspect the deterministic C and Arduino flight code running the 3lb meltybrain robot.
          Generate custom hardware headers live and flash directly via Teensyduino / PlatformIO.
        </p>
      </div>

      {/* Two-Column Grid: Code Explorer (Left) vs Live Config Generator & Telemetry Desk (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) 460px', gap: '24px' }}>
        
        {/* Left Column: Code Module Explorer */}
        <div className="glass-panel hud-corner" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* File Tab Selector */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
            {Object.entries(CODE_MODULES).map(([key, mod]) => (
              <button
                key={key}
                className={`cyber-btn ${selectedFile === key ? 'primary' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setSelectedFile(key)}
              >
                {mod.filename}
              </button>
            ))}
          </div>

          {/* Module Description & Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 240, 255, 0.06)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              {CODE_MODULES[selectedFile].description}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => copyToClipboard(CODE_MODULES[selectedFile].code, `${CODE_MODULES[selectedFile].filename} copied.`)}
              >
                COPY CODE
              </button>
              <button
                className="cyber-btn primary"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => downloadFile(CODE_MODULES[selectedFile].code, CODE_MODULES[selectedFile].filename)}
              >
                DOWNLOAD
              </button>
            </div>
          </div>

          {/* Code Viewer with Syntax Highlighting */}
          <div style={{ background: '#050811', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#0a0f1d', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '11px', color: 'var(--cyber-text-dim)' }}>
              <span>{CODE_MODULES[selectedFile].filename}</span>
              <span>READ-ONLY EMBEDDED KERNEL</span>
            </div>
            <pre style={{ margin: 0, padding: '16px', fontSize: '12px', lineHeight: 1.6, color: '#e2e8f0', overflowX: 'auto', maxHeight: '520px', fontFamily: 'var(--cyber-mono)' }}>
              <code>{CODE_MODULES[selectedFile].code}</code>
            </pre>
          </div>
        </div>

        {/* Right Column: Live Config Generator + Telemetry Desk */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Live Config Generator */}
          <div className="glass-panel hud-corner" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--neon-cyan)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> LIVE CONFIG GENERATOR
            </h2>
            <p style={{ color: 'var(--cyber-text-muted)', fontSize: '12px', margin: '0 0 16px' }}>
              Tweak parameters to auto-generate customized <code>melty_custom_config.h</code>.
            </p>

            {/* Slider Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Max Target Spin RPM:</span>
                  <strong style={{ color: 'var(--neon-cyan)' }}>{cfgRpm} RPM</strong>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="4000"
                  step="50"
                  value={cfgRpm}
                  onChange={(e) => setCfgRpm(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#00f0ff' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Sensor 1 &amp; 2 Radius:</span>
                  <strong style={{ color: 'var(--neon-amber)' }}>{cfgRadius} mm</strong>
                </div>
                <input
                  type="range"
                  min="15"
                  max="40"
                  step="1"
                  value={cfgRadius}
                  onChange={(e) => setCfgRadius(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#ffaa00' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Translation Modulation Depth:</span>
                  <strong style={{ color: 'var(--neon-green)' }}>{cfgModDepth}%</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  step="5"
                  value={cfgModDepth}
                  onChange={(e) => setCfgModDepth(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#00ff88' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Motor Response Latency:</span>
                  <strong style={{ color: '#fff' }}>{cfgLatency} ms</strong>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.1"
                  value={cfgLatency}
                  onChange={(e) => setCfgLatency(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#00f0ff' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>SPARC Failsafe Timeout:</span>
                  <strong style={{ color: 'var(--neon-crimson)' }}>{cfgFailsafeMs} ms</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={cfgFailsafeMs}
                  onChange={(e) => setCfgFailsafeMs(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#ff2a55' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Heading Strobe Arc Window:</span>
                  <strong style={{ color: 'var(--neon-green)' }}>{cfgLedArc}°</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={cfgLedArc}
                  onChange={(e) => setCfgLedArc(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: '#00ff88' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Critical Battery Cutoff:</span>
                  <strong style={{ color: 'var(--neon-amber)' }}>{cfgVbatCutoff.toFixed(1)} V</strong>
                </div>
                <input
                  type="range"
                  min="11.0"
                  max="14.8"
                  step="0.1"
                  value={cfgVbatCutoff}
                  onChange={(e) => setCfgVbatCutoff(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: '#ffaa00' }}
                />
              </div>
            </div>

            {/* Generated Header Output */}
            <div style={{ marginTop: '16px', background: '#050811', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '10px' }}>
              <pre style={{ margin: 0, fontSize: '11px', color: '#4ade80', overflowX: 'auto', maxHeight: '130px' }}>
                {generatedHeader}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                className="cyber-btn primary"
                style={{ flex: 1, padding: '8px', fontSize: '11px' }}
                onClick={() => downloadFile(generatedHeader, 'melty_custom_config.h')}
              >
                DOWNLOAD CONFIG (.H)
              </button>
              <button
                className="cyber-btn"
                style={{ flex: 1, padding: '8px', fontSize: '11px' }}
                onClick={() => copyToClipboard(generatedHeader, 'Generated header copied.')}
              >
                COPY HEADER
              </button>
            </div>
            {feedback && <div style={{ color: 'var(--neon-green)', fontSize: '11px', marginTop: '8px', textAlign: 'center' }}>{feedback}</div>}
          </div>

          {/* Telemetry Log Desk */}
          <div className="glass-panel hud-corner" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--neon-amber)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="cyber-dot" style={{ background: 'var(--neon-amber)' }} />
                EQUIPMENT LOG REVIEW
              </h2>
              <span className="cyber-badge" style={{ fontSize: '9px' }}>{source}</span>
            </div>
            <p style={{ color: 'var(--cyber-text-muted)', fontSize: '12px', margin: '8px 0 12px' }}>
              Review recorded battery voltage, motor temperatures, and match telemetry.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              {records.map((r, i) => (
                <div key={i} style={{ padding: '6px 10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px', fontSize: '11px', borderLeft: '2px solid var(--neon-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>{r.timestamp?.slice(11, 19)}</span>
                    <span style={{ color: 'var(--neon-amber)' }}>{r.batteryVoltage}V · {r.temperatureC}°C</span>
                  </div>
                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>{r.note}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button
                className="cyber-btn"
                style={{ flex: 1, padding: '6px', fontSize: '11px' }}
                onClick={() => {
                  setRecords(exampleRecords);
                  setSource('example_run_telemetry.json');
                  setFeedback('Loaded example log.');
                }}
              >
                RELOAD SYNTHETIC LOG
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
