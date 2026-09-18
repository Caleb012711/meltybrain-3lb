import { useState } from 'react';
import { Link } from 'react-router';

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  presets,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  presets?: { label: string; val: number }[];
}) {
  return (
    <div style={{ margin: '14px 0', padding: '12px 14px', background: 'var(--inset)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '13.5px', fontWeight: 650, color: 'var(--ink)' }}>{label}</span>
        <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-text)', background: '#ffffff', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--line-strong)' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{ width: '100%', minHeight: 28 }}
      />
      {presets && presets.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.val)}
              style={{
                fontSize: '12px',
                fontFamily: 'ui-monospace, monospace',
                padding: '6px 14px',
                minHeight: 32,
                borderRadius: 999,
                border: `1px solid ${value === p.val ? 'var(--ink)' : 'var(--line-strong)'}`,
                background: value === p.val ? 'var(--ink)' : 'var(--surface)',
                color: value === p.val ? '#ffffff' : 'var(--steel)',
                cursor: 'pointer',
                fontWeight: 650,
                boxShadow: value === p.val ? '0 2px 6px rgba(26,29,33,0.18)' : 'var(--shadow-sm)',
                transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MeterBar({
  value,
  max,
  safeMax,
  label,
  unit,
  color,
}: {
  value: number;
  max: number;
  safeMax?: number;
  label: string;
  unit: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const isOverSafe = safeMax !== undefined && value > safeMax;
  const barColor = color || (isOverSafe ? 'var(--danger)' : value > (safeMax || max) * 0.8 ? 'var(--accent-graphic)' : 'var(--ok)');

  return (
    <div style={{ margin: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 650, color: 'var(--steel)', marginBottom: 4 }}>
        <span>{label}</span>
        <span className="mono" style={{ color: isOverSafe ? 'var(--danger)' : 'var(--ink)' }}>
          {value.toFixed(1)} / {max} {unit}
        </span>
      </div>
      <div style={{ height: 10, background: 'var(--inset)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--line-strong)', position: 'relative' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            transition: 'width 0.15s ease, background-color 0.15s ease',
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

export function Engineering() {
  const [rpm, setRpm] = useState(3000);
  const [diaIn, setDiaIn] = useState(8);
  const [ti, setTi] = useState(false);
  const [attack, setAttack] = useState(3);
  const [imbG, setImbG] = useState(4);
  const [imbR, setImbR] = useState(65);
  const [accR, setAccR] = useState(20);

  // tip speed + KE (thin-ring model, teeth-pair mass)
  // mph = π·D(in)·RPM·60 / 63360 = π·D·RPM / 1056 (sanity: 8″ @ 4000 RPM ≈ 95 mph)
  const wMass = ti ? 0.2464 : 0.4367;
  const mph = (Math.PI * diaIn * rpm) / 1056;
  const ms = mph * 0.44704;
  const ke = 0.5 * wMass * ms * ms;

  // bite (2 teeth)
  const biteMm = ((attack * 60) / (rpm * 2)) * 1000;

  // balance force
  const om = (rpm * 2 * Math.PI) / 60;
  const forceN = (imbG / 1000) * (imbR / 1000) * om * om;

  // accel g
  const accG = (om * om * (accR / 1000)) / 9.81;
  const accPass = accG <= 400;
  const maxR = ((400 * 9.81) / (om * om)) * 1000;

  // spin-ups per pack
  const eSpin = 995 * Math.pow(rpm / 4000, 2);
  const spins = Math.floor(46800 / eSpin);

  return (
    <div className="page">
      <p className="spec-plate">
        <span>EYELINER-3LB / REV9 / SHEET ENG-01</span>
        <span>Engineering — the math</span>
      </p>
      <h1>Engineering calculators</h1>
      <p className="lede">
        Live physics & mass rollups computed directly from measured CAD volumes
        (teeth pair 55.63 cm³). Adjust sliders to inspect stress thresholds, tip speed, bite depth, and accelerometer load.
      </p>

      {/* Top Telemetry KPIs */}
      <div className="proof" aria-label="Key live metrics">
        <div>
          <b>{mph.toFixed(1)} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--steel)' }}>mph</span></b>
          <span>Tip Speed ({ms.toFixed(1)} m/s)</span>
        </div>
        <div>
          <b>{ke.toFixed(0)} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--steel)' }}>J</span></b>
          <span>Weapon KE ({ti ? 'Ti' : 'Steel'})</span>
        </div>
        <div>
          <b style={{ color: accPass ? 'var(--ink)' : 'var(--danger)' }}>
            {accG.toFixed(0)} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--steel)' }}>g</span>
          </b>
          <span>Accel ({accPass ? 'PASS' : 'SATURATED'})</span>
        </div>
        <div>
          <b>{forceN.toFixed(1)} <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--steel)' }}>N</span></b>
          <span>Centrifugal Shake</span>
        </div>
      </div>

      {/* 01 Weapon Energy */}
      <div className="step">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>01 · Tip speed & weapon kinetic energy</h3>
          <span className={`stamp ${ke > 200 ? 'ok' : 'todo'}`}>
            {ke > 200 ? 'High Energy (>200 J)' : 'Moderate Energy (<200 J)'}
          </span>
        </div>

        <SliderControl
          label="Body spin (RPM)"
          value={rpm}
          min={2000}
          max={4000}
          step={100}
          unit=" RPM"
          onChange={setRpm}
          presets={[
            { label: '2000 RPM (Idle)', val: 2000 },
            { label: '3000 RPM (Cruise)', val: 3000 },
            { label: '4000 RPM (Redline)', val: 4000 },
          ]}
        />
        <SliderControl
          label="Spin diameter (inches)"
          value={diaIn}
          min={5}
          max={9}
          step={0.1}
          unit=" in"
          onChange={setDiaIn}
          presets={[
            { label: '6.5″', val: 6.5 },
            { label: '7.5″', val: 7.5 },
            { label: '8.0″ (Standard)', val: 8.0 },
          ]}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius)' }}>
          <input
            id="ti-teeth-chk"
            type="checkbox"
            checked={ti}
            onChange={(e) => setTi(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-text)' }}
          />
          <label htmlFor="ti-teeth-chk" style={{ cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
            Grade 5 Titanium teeth (246 g) <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— unchecked = AR500 steel (437 g)</span>
          </label>
        </div>

        <MeterBar value={mph} max={120} label="Tip Speed relative to 120 mph target" unit="mph" />

        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td>Tip speed</td>
                <td className="mono"><b>{mph.toFixed(1)} mph ({ms.toFixed(1)} m/s)</b></td>
              </tr>
              <tr>
                <td>Weapon KE (thin-ring model)</td>
                <td className="mono"><b>{ke.toFixed(0)} J</b> ({Math.round(wMass * 1000)} g mass)</td>
              </tr>
              <tr>
                <td>Verdict</td>
                <td>
                  {ke > 200 ? 'Over 200 J at full width [model]. Severe hit potential.' : 'Under 200 J [model] — spin faster or measure a bigger Ø.'}{' '}
                  <span className="stamp todo">Model</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="meta">Equation: v = π × D × RPM / 1056. Measure YOUR spin Ø in CAD — the 331 mm bbox axis is reach, not diameter.</p>
      </div>

      {/* 02 Bite */}
      <div className="step">
        <h3>02 · Tooth bite depth (2-tooth symmetric)</h3>
        <SliderControl
          label="Attack closing speed (m/s)"
          value={attack}
          min={1}
          max={5}
          step={0.5}
          unit=" m/s"
          onChange={setAttack}
          presets={[
            { label: '1.5 m/s (Cautious)', val: 1.5 },
            { label: '3.0 m/s (Normal)', val: 3.0 },
            { label: '4.5 m/s (Full Charge)', val: 4.5 },
          ]}
        />
        <MeterBar value={biteMm} max={50} label="Bite Depth per Revolution" unit="mm" color="var(--accent-graphic)" />
        <p>
          Bite at {rpm} RPM: <b className="mono">{biteMm.toFixed(1)} mm</b> — make teeth stick out ~1.5× ({(biteMm * 1.5).toFixed(1)} mm)
          so slow engagements still connect. Faster spin halves bite: that is why 2 teeth at 4000 RPM can skate on flat armor without teeth protrusion.
        </p>
      </div>

      {/* 03 Balance */}
      <div className="step">
        <h3>03 · Dynamic balance shake force</h3>
        <SliderControl
          label="Residual imbalance mass (g)"
          value={imbG}
          min={1}
          max={5}
          step={0.5}
          unit=" g"
          onChange={setImbG}
        />
        <SliderControl
          label="Imbalance radius (mm)"
          value={imbR}
          min={40}
          max={100}
          step={5}
          unit=" mm"
          onChange={setImbR}
        />
        <p>
          At {rpm} RPM, {imbG} g at {imbR} mm shakes with <b className="mono">{forceN.toFixed(1)} N ({(forceN / 9.807).toFixed(2)} kgf)</b> centrifugal force.
          <br />
          <b>Fix:</b> add {(imbG * imbR / 65).toFixed(1)} g opposite at 65 mm using symmetric trim screws — never drill the AR500 ring.
          Target: level in 4+ orientations on the point jig.
        </p>
      </div>

      {/* 04 Accelerometer */}
      <div className="step">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>04 · Accelerometer range & placement check</h3>
          <span className={`stamp ${accPass ? 'ok' : 'ban'}`}>
            {accPass ? 'SENSOR OK (≤400 g)' : 'SATURATED (>400 g)'}
          </span>
        </div>
        <SliderControl
          label="Sensor mount radius from spin center (mm)"
          value={accR}
          min={10}
          max={65}
          step={1}
          unit=" mm"
          onChange={setAccR}
          presets={[
            { label: '15 mm (Recommended)', val: 15 },
            { label: '20 mm (Borderline)', val: 20 },
            { label: '30 mm (Saturates @ 3500)', val: 30 },
          ]}
        />
        <MeterBar value={accG} max={500} safeMax={400} label="Centripetal Acceleration on H3LIS331DLTR (±400 g rating)" unit="g" />
        <p>
          At {rpm} RPM the H3LIS331DLTR sees <b className="mono">{accG.toFixed(0)} g</b>.{' '}
          Max safe radius for {rpm} RPM is <b className="mono">{maxR.toFixed(1)} mm</b>.
        </p>
        <p className="meta">
          Mount within ~20 mm of center for the full 4000 RPM band, or accept an RPM ceiling (3454 RPM at 30 mm).
          Dual-opposed at 45° cancels offset but adds no range. a = ω²r.
        </p>
      </div>

      {/* 05 Battery Spin-ups */}
      <div className="step">
        <h3>05 · Electrical energy & spin-ups per battery pack</h3>
        <p>
          One spin-up to {rpm} RPM costs ~{(eSpin / 1000).toFixed(2)} kJ electrical (≈60% efficient).
          A 2× 4S 550 mAh set (13 Wh usable) funds about <b className="mono">{spins} spin-ups</b> pure —
          in a real match budget ~5–7 spin-ups plus cruise and carry the second set.
        </p>
      </div>

      {/* 06 Mass Rollup */}
      <div className="step">
        <h3>06 · Mass rollup (measured CAD + fixed electronics 409 g)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Subsystem</th>
                <th scope="col">Ti teeth</th>
                <th scope="col">Steel teeth</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Weapon (teeth pair 55.63 cm³)</td>
                <td className="mono">246.4 g</td>
                <td className="mono">436.7 g</td>
              </tr>
              <tr>
                <td>Plates + pods + shell + fasteners</td>
                <td className="mono" colSpan={2}>399.3 g (measured, either config)</td>
              </tr>
              <tr>
                <td>Electronics + flight pack + wiring</td>
                <td className="mono" colSpan={2}>409.0 g</td>
              </tr>
              <tr>
                <td><b>All-in (ONE weapon — never fly both staged)</b></td>
                <td className="mono"><b>1054.7 g</b></td>
                <td className="mono"><b>1245.0 g</b></td>
              </tr>
              <tr>
                <td>Margin to 1310 g target</td>
                <td className="mono ok-text"><b>+255 g</b></td>
                <td className="mono ok-text"><b>+65 g</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="meta">
          Steel is legal but tight — Ti is comfortable. CAD stages both weapon configs: flying both
          adds ~356 g steel (~201 g Ti) of phantom mass for the staged second config. Electro-green keepouts are placeholders, replaced by
          the fixed-electronics line above.
        </p>
      </div>

      {/* 07 Power Harness */}
      <div className="step">
        <h3>07 · Power & harness verdicts</h3>
        <p>
          2× 48 A max = 96 A combined vs ~104.5 A pack continuous — adequate with ~9% margin for
          bursts, not continuous stall. Expect ~1 V sag under full spin-up. Mains: <b>XT60 + 16 AWG</b>
          (XT30 is 30 A continuous — inadequate per pack path; 20 AWG fails, 18 AWG marginal short runs only).
          AM32 55 A per channel covers the 48 A motors; watch 4-in-1 board heat soak.
        </p>
      </div>

      <div className="btn-row">
        <Link className="btn primary" to="/bom">BOM + cost breakdown</Link>
        <Link className="btn" to="/studio">Drive in 3D studio</Link>
      </div>
    </div>
  );
}
