import { useState } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';

const COMBAT_PRINT_PROFILES = [
  {
    id: 'tpu-chassis',
    name: 'Combat Chassis Unibody — Bambu TPU 95A HF',
    role: 'Primary Combat Armor & Motor Housing',
    material: 'Bambu TPU 95A HF',
    walls: '7 Wall Loops (2.8 mm solid outer perimeter)',
    infill: '90% Gyroid (Isotropic multi-axis impact damping)',
    nozzleTemp: '235°C First Layer / 230°C Other',
    bedTemp: '45°C (Textured PEI with thin glue release)',
    volumetricSpeed: '3.2 mm³/s (Strict limit to prevent extruder buckling)',
    cooling: 'Part Fan 25% (Aux Fan 0% / OFF)',
    notes: 'Feed directly from external rear spool holder through PTFE. DO NOT FEED THROUGH AMS.',
    iniPreset: `[Filament: Bambu TPU 95A HF Combat]
Filament Type = TPU
Nozzle Temperature = 230 °C
Bed Temperature = 45 °C
Max Volumetric Speed = 3.2 mm³/s
Flow Ratio = 1.03
Pressure Advance = 0.048
Wall Loops = 7
Infill Density = 90%
Infill Pattern = Gyroid
Travel Speed = 150 mm/s
Acceleration = 1500 mm/s²`,
  },
  {
    id: 'pa6cf-stiff',
    name: 'High-Stiffness Core — Bambu PA6-CF',
    role: 'Motor Bulkheads & Axle Mounts',
    material: 'Bambu PA6-CF (Carbon Fiber Nylon)',
    walls: '6 Wall Loops (2.4 mm solid wall)',
    infill: '50% Gyroid',
    nozzleTemp: '280°C (Hardened Steel Nozzle required)',
    bedTemp: '100°C (Enclosed Chamber X1-C / P1S)',
    volumetricSpeed: '12.0 mm³/s',
    cooling: 'Part Fan 20% (Chamber door closed)',
    notes: 'Bake filament at 80°C for 8-12 hours before printing. Anneal part at 90°C for 6 hours.',
    iniPreset: `[Filament: Bambu PA6-CF High-Stiffness]
Filament Type = PA-CF
Nozzle Temperature = 280 °C
Bed Temperature = 100 °C
Max Volumetric Speed = 12.0 mm³/s
Wall Loops = 6
Infill Density = 50%
Infill Pattern = Gyroid`,
  },
  {
    id: 'petghf-sensor',
    name: 'Rigid Mounts — Bambu PETG HF',
    role: 'Dual Accelerometers & Electronic Cradles',
    material: 'Bambu PETG HF / PETG-CF',
    walls: '5 Wall Loops (2.0 mm solid wall)',
    infill: '40% Gyroid',
    nozzleTemp: '250°C',
    bedTemp: '70°C (Textured PEI)',
    volumetricSpeed: '14.0 mm³/s',
    cooling: 'Part Fan 40%',
    notes: 'Zero dynamic sensor deflection under 400g centripetal load. Hole compensation +0.15mm.',
    iniPreset: `[Filament: Bambu PETG HF Rigid]
Filament Type = PETG
Nozzle Temperature = 250 °C
Bed Temperature = 70 °C
Max Volumetric Speed = 14.0 mm³/s
Wall Loops = 5
Infill Density = 40%
Infill Pattern = Gyroid
XY Hole Compensation = +0.15 mm`,
  },
  {
    id: 'diffuser-optics',
    name: 'Heading Beacon — Bambu PETG Translucent',
    role: '120° Optical Diffuser Lens',
    material: 'Bambu PETG Translucent',
    walls: '100% Solid Aligned Rectilinear',
    infill: '100% (No air pockets)',
    nozzleTemp: '255°C (High temp maximizes optical transparency)',
    bedTemp: '70°C',
    volumetricSpeed: '4.0 mm³/s (Slow print eliminates micro-bubbles)',
    cooling: 'Part Fan 0% (OFF)',
    notes: 'Prints crystal clear for optimal stroboscopic virtual heading beam visibility.',
    iniPreset: `[Filament: Bambu PETG Translucent Lens]
Filament Type = PETG
Nozzle Temperature = 255 °C
Bed Temperature = 70 °C
Max Volumetric Speed = 4.0 mm³/s
Wall Loops = 99
Infill Density = 100%
Infill Pattern = Aligned Rectilinear`,
  },
];

const ALL_PRINTABLE_STLS = [
  // Combat Core
  { name: 'eyeliner_combat_v01-chassis.stl', cat: 'Combat Core', material: 'TPU 95A HF / PA6-CF', size: '4.1 MB', path: 'stl/eyeliner_combat_v01-chassis.stl', note: 'Primary 3lb combat unibody core absorbing kinetic shocks' },
  { name: 'eyeliner_combat_v01-top_plate.stl', cat: 'Combat Core', material: '6061-T6 / Carbon / PETG', size: '4.4 MB', path: 'stl/eyeliner_combat_v01-top_plate.stl', note: 'Top clamping plate with LED window cutouts' },
  { name: 'eyeliner_combat_v01-bottom_plate.stl', cat: 'Combat Core', material: '6061-T6 / Carbon / PETG', size: '4.0 MB', path: 'stl/eyeliner_combat_v01-bottom_plate.stl', note: 'Bottom skid plate with bearing pockets' },
  { name: 'titanium_cleat_disc_1.55in.stl', cat: 'Drive', material: 'Ti-6Al-4V / PETG Prototype', size: '1.3 MB', path: 'stl/titanium_cleat_disc_1.55in.stl', note: '1.55 in cleated traction disc for wood/steel arena floors' },
  
  // Sensors & Electronics Cradles
  { name: 'dual_accel_mount_base.stl', cat: 'Sensors', material: 'Bambu PETG HF', size: '452 KB', path: 'stl/dual_accel_mount_base.stl', note: 'Rigid base for dual opposed H3LIS331DL +/-400g sensors' },
  { name: 'dual_accel_mount_clamp.stl', cat: 'Sensors', material: 'Bambu PETG HF', size: '237 KB', path: 'stl/dual_accel_mount_clamp.stl', note: 'Clamping bracket eliminating dynamic high-G vibration' },
  { name: 'pi_cradle_base.stl', cat: 'Compute', material: 'Bambu PETG HF', size: '441 KB', path: 'stl/pi_cradle_base.stl', note: 'Vibration-isolated carrier for Pi Zero 2W / SBC' },
  { name: 'pi_cradle_cover.stl', cat: 'Compute', material: 'Bambu PETG HF', size: '130 KB', path: 'stl/pi_cradle_cover.stl', note: 'Protective top cover with heatsink ventilation chimney' },
  { name: 'tpu_isolation_grommet.stl', cat: 'Compute', material: 'Bambu TPU 95A HF', size: '84 KB', path: 'stl/tpu_isolation_grommet.stl', note: 'Shock isolation dampening bushing (print 4x)' },
  { name: 'battery_cradle.stl', cat: 'Power', material: 'Bambu TPU 95A HF', size: '295 KB', path: 'stl/battery_cradle.stl', note: 'Energy-absorbing cradle for 2x 4S 550mAh LiPo packs' },
  { name: 'led_mount_body.stl', cat: 'Optics', material: 'Bambu PETG HF (Black)', size: '280 KB', path: 'stl/led_mount_body.stl', note: 'Directional heading indicator mount with resistor bay' },
  { name: 'led_diffuser_lens.stl', cat: 'Optics', material: 'Bambu PETG Translucent', size: '22 KB', path: 'stl/led_diffuser_lens.stl', note: 'Snap-in 120° optical diffuser for virtual heading beam' },
  
  // Tire Molds & Bench Cases
  { name: 'silicone_tire_mold_base.stl', cat: 'Molding', material: 'Bambu PLA / PETG', size: '3.1 MB', path: 'stl/silicone_tire_mold_base.stl', note: 'Two-part compression mold base for casting custom tires' },
  { name: 'silicone_tire_mold_top.stl', cat: 'Molding', material: 'Bambu PLA / PETG', size: '4.8 MB', path: 'stl/silicone_tire_mold_top.stl', note: 'Compression mold lid with alignment guide pins' },
  { name: 'silicone_tire_core_mold.stl', cat: 'Molding', material: 'Bambu PLA / PETG', size: '231 KB', path: 'stl/silicone_tire_core_mold.stl', note: 'Core mandrel for wheel bearing cavity' },
  { name: 'xiao_case_body.stl', cat: 'Bench', material: 'Bambu PETG / PLA', size: '35 KB', path: 'stl/xiao_case_body.stl', note: 'Desktop bench storage enclosure body for XIAO MCU' },
  { name: 'xiao_case_lid.stl', cat: 'Bench', material: 'Bambu PETG / PLA', size: '59 KB', path: 'stl/xiao_case_lid.stl', note: 'Desktop bench storage friction-fit lid' },
];

export function Printing() {
  const [selectedProfile, setSelectedProfile] = useState<string>('tpu-chassis');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [feedback, setFeedback] = useState<string>('');

  // Slicer Cost Estimator State
  const [printMassG, setPrintMassG] = useState(180);
  const [spoolPriceUsd, setSpoolPriceUsd] = useState(28);
  const [spoolMassG, setSpoolMassG] = useState(1000);

  const activeProfile = COMBAT_PRINT_PROFILES.find((p) => p.id === selectedProfile) || COMBAT_PRINT_PROFILES[0];
  const calculatedCost = ((printMassG * spoolPriceUsd) / spoolMassG).toFixed(2);

  const categories = ['All', 'Combat Core', 'Sensors', 'Compute', 'Power', 'Optics', 'Drive', 'Molding', 'Bench'];
  const filteredStls = selectedCategory === 'All'
    ? ALL_PRINTABLE_STLS
    : ALL_PRINTABLE_STLS.filter((s) => s.cat === selectedCategory);

  const downloadIni = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_bambu_preset.ini`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback(`Downloaded ${name} preset.`);
    setTimeout(() => setFeedback(''), 3000);
  };

  return (
    <div className="page print-page cyber-container" style={{ padding: '24px 20px 80px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Breadcrumb */}
      <div className="overview-topline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="cyber-badge">MANUFACTURING // 3D PRINTING &amp; SLICER STUDIO</span>
          <span className="cyber-badge amber">BAMBU STUDIO / ORCASLICER</span>
          <span className="cyber-badge green">TPU 95A HF + PA6-CF</span>
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
          3D Printing &amp; Slicer Studio
        </h1>
        <p style={{ color: 'var(--cyber-text-muted)', fontSize: '16px', maxWidth: '80ch', margin: 0 }}>
          Production-grade slicing profiles and direct STL downloads for the 3lb combat meltybrain robot.
          Optimized for Bambu Lab X1-Carbon, P1S, P1P, and A1 Mini using high-impact engineering polymers.
        </p>
      </div>

      {/* Section 1: Bambu Studio Combat Process Profiles */}
      <div className="glass-panel hud-corner" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> BAMBU STUDIO &amp; ORCASLICER PROCESS PROFILES
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              Battle-proven parameters: wall count, gyroid infill, extrusion speeds, and thermal management
            </span>
          </div>

          <button
            className="cyber-btn primary"
            onClick={() => downloadIni(activeProfile.name, activeProfile.iniPreset)}
          >
            EXPORT PRESET (.INI) ↗
          </button>
        </div>

        {/* Profile Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--cyber-border)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          {COMBAT_PRINT_PROFILES.map((prof) => (
            <button
              key={prof.id}
              className={`cyber-btn ${selectedProfile === prof.id ? 'primary' : ''}`}
              style={{ fontSize: '12px', padding: '8px 14px' }}
              onClick={() => setSelectedProfile(prof.id)}
            >
              {prof.name.split('—')[0]}
            </button>
          ))}
        </div>

        {/* Profile Details Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 360px', gap: '24px', marginTop: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>{activeProfile.name}</h3>
              <span className="cyber-badge amber">{activeProfile.material}</span>
            </div>
            <p style={{ color: 'var(--cyber-text-muted)', fontSize: '13px', margin: '0 0 16px' }}>
              <strong>Role:</strong> {activeProfile.role}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>WALL BOUNDARY</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-green)', marginTop: '2px' }}>{activeProfile.walls}</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>SPARSE INFILL</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-cyan)', marginTop: '2px' }}>{activeProfile.infill}</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>HOTEND THERMAL</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--neon-amber)', marginTop: '2px' }}>{activeProfile.nozzleTemp}</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)' }}>BED THERMAL</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginTop: '2px' }}>{activeProfile.bedTemp}</div>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255, 170, 0, 0.08)', borderRadius: '6px', border: '1px solid rgba(255, 170, 0, 0.25)' }}>
              <strong style={{ color: 'var(--neon-amber)', fontSize: '12px' }}>CRITICAL FEEDING &amp; DRYING INSTRUCTION:</strong>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
                {activeProfile.notes}
              </p>
            </div>
          </div>

          {/* Slicer Config Code Snippet */}
          <div style={{ background: '#050811', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '6px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11px', color: 'var(--cyber-text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Bambu Studio Process Config Preview (.ini)
            </div>
            <pre style={{ margin: 0, fontSize: '11px', lineHeight: 1.5, color: '#4ade80', overflowX: 'auto', flex: 1, fontFamily: 'var(--cyber-mono)' }}>
              {activeProfile.iniPreset}
            </pre>
            <button
              className="cyber-btn"
              style={{ marginTop: '12px', padding: '6px', fontSize: '11px' }}
              onClick={() => downloadIni(activeProfile.name, activeProfile.iniPreset)}
            >
              DOWNLOAD PRESET FILE
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Direct STL Downloads Library */}
      <div className="glass-panel hud-corner" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', color: 'var(--neon-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> DIRECT PRODUCTION STL LIBRARY
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--cyber-text-muted)' }}>
              17 Verified 3D Print STLs: Combat Unibody, Shock Cradles, Tire Molds &amp; Accessories
            </span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`cyber-btn ${selectedCategory === cat ? 'primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* STL Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
          {filteredStls.map((stl) => (
            <div
              key={stl.name}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderLeft: '3px solid var(--neon-cyan)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#fff', wordBreak: 'break-all', fontFamily: 'var(--cyber-mono)' }}>
                    {stl.name}
                  </strong>
                  <span className="cyber-badge" style={{ fontSize: '9px', padding: '2px 6px' }}>
                    {stl.size}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--neon-amber)', marginTop: '4px' }}>
                  {stl.material}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 0' }}>
                  {stl.note}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <a
                  className="cyber-btn primary"
                  style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }}
                  href={stl.path}
                  download={stl.name}
                >
                  DOWNLOAD STL 💾
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Slicer Mass & Print Cost Calculator */}
      <div className="glass-panel hud-corner" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--neon-amber)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="cyber-dot" style={{ background: 'var(--neon-amber)' }} />
          SLICER MASS &amp; FILAMENT COST CALCULATOR
        </h2>
        <p style={{ color: 'var(--cyber-text-muted)', fontSize: '13px', margin: '0 0 20px' }}>
          Estimate print material expenditures including purge tower, supports, and infill packing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--cyber-text-muted)', marginBottom: '4px' }}>
              Sliced Model Mass (grams):
            </label>
            <input
              type="number"
              value={printMassG}
              onChange={(e) => setPrintMassG(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ width: '100%', padding: '8px 12px', background: '#050811', border: '1px solid var(--cyber-border)', color: '#fff', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--cyber-text-muted)', marginBottom: '4px' }}>
              Spool Price (USD $):
            </label>
            <input
              type="number"
              value={spoolPriceUsd}
              onChange={(e) => setSpoolPriceUsd(Math.max(0, parseFloat(e.target.value) || 0))}
              style={{ width: '100%', padding: '8px 12px', background: '#050811', border: '1px solid var(--cyber-border)', color: '#fff', borderRadius: '4px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--cyber-text-muted)', marginBottom: '4px' }}>
              Net Spool Weight (grams):
            </label>
            <input
              type="number"
              value={spoolMassG}
              onChange={(e) => setSpoolMassG(Math.max(1, parseFloat(e.target.value) || 1000))}
              style={{ width: '100%', padding: '8px 12px', background: '#050811', border: '1px solid var(--cyber-border)', color: '#fff', borderRadius: '4px' }}
            />
          </div>

          <div className="glass-panel" style={{ padding: '12px 18px', textAlign: 'center', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--neon-cyan)' }}>
            <div style={{ fontSize: '11px', color: 'var(--cyber-text-muted)', textTransform: 'uppercase' }}>Estimated Material Cost</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--neon-green)', marginTop: '2px' }}>
              ${calculatedCost}
            </div>
          </div>
        </div>
      </div>
      {feedback && <div style={{ color: 'var(--neon-green)', textAlign: 'center', marginTop: '16px' }}>{feedback}</div>}
    </div>
  );
}
