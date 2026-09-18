import { useState } from 'react';
import { Link } from 'react-router';

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="meta" style={{ display: 'block', margin: '10px 0' }}>
      {label}: <b className="mono">{value}{unit}</b>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={{ width: '100%', minHeight: 36 }}
      />
    </label>
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
  const accG = ((om * om * (accR / 1000)) / 9.81);
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
        Every number the build depends on, computed live from measured CAD volumes
        (teeth pair 55.63 cm³). Move the sliders — the verdicts update.
      </p>

      <div className="step">
        <h3>Tip speed + weapon energy</h3>
        <Slider label="Body spin" value={rpm} min={2000} max={4000} step={100} unit=" RPM" onChange={setRpm} />
        <Slider label="Spin diameter" value={diaIn} min={5} max={9} step={0.1} unit=" in" onChange={setDiaIn} />
        <label className="meta">
          <input type="checkbox" checked={ti} onChange={(e) => setTi(e.target.checked)} /> Titanium teeth
          (unchecked = AR500 steel)
        </label>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr><td>Tip speed</td><td className="mono"><b>{mph.toFixed(1)} mph / {ms.toFixed(1)} m/s</b></td></tr>
              <tr><td>Weapon KE (thin-ring model)</td><td className="mono"><b>{ke.toFixed(0)} J</b> ({Math.round(wMass * 1000)} g)</td></tr>
              <tr><td>Verdict</td><td>{ke > 200 ? 'Over 200 J at full width [model].' : 'Under 200 J [model] — spin faster or measure a bigger Ø.'} <span className="stamp todo">Model</span></td></tr>
            </tbody>
          </table>
        </div>
        <p className="meta">v = π × D × RPM / 1056. Measure YOUR spin Ø in CAD — the 331 mm bbox axis is reach, not diameter.</p>
      </div>

      <div className="step">
        <h3>Bite (2 teeth)</h3>
        <Slider label="Attack speed" value={attack} min={1} max={5} step={0.5} unit=" m/s" onChange={setAttack} />
        <p>Bite at {rpm} RPM: <b className="mono">{biteMm.toFixed(1)} mm</b> — make teeth stick out ~1.5× ({(biteMm * 1.5).toFixed(1)} mm) so slow engagements still connect. Faster spin halves bite: that is why 2 teeth at 4000 RPM can skate.</p>
      </div>

      <div className="step">
        <h3>Balance force</h3>
        <Slider label="Residual imbalance" value={imbG} min={1} max={5} step={0.5} unit=" g" onChange={setImbG} />
        <Slider label="Imbalance radius" value={imbR} min={40} max={100} step={5} unit=" mm" onChange={setImbR} />
        <p>At {rpm} RPM, {imbG} g at {imbR} mm shakes with <b className="mono">{forceN.toFixed(1)} N ({(forceN / 9.807).toFixed(2)} kgf)</b>. Fix: add {(imbG * imbR / 65).toFixed(1)} g opposite at 65 mm — symmetric trim screws, never drill the ring. Target: level in 4+ orientations on the point jig.</p>
      </div>

      <div className="step">
        <h3>Accelerometer range check</h3>
        <Slider label="Mount radius from spin center" value={accR} min={10} max={65} step={1} unit=" mm" onChange={setAccR} />
        <p>
          At {rpm} RPM the H3LIS331DLTR (±400 g) sees <b className="mono">{accG.toFixed(0)} g</b>{' '}
          <span className={`stamp ${accPass ? 'ok' : 'ban'}`}>{accPass ? 'PASS' : 'SATURATED'}</span>
        </p>
        <p className="meta">
          Max radius for {rpm} RPM is {maxR.toFixed(1)} mm — mount within ~20 mm of center for the full
          4000 RPM band, or accept an RPM ceiling (3454 RPM at 30 mm). Dual-opposed at 45° cancels
          offset but adds no range. a = ω²r.
        </p>
      </div>

      <div className="step">
        <h3>Spin-ups per pack</h3>
        <p>
          One spin-up to {rpm} RPM costs ~{(eSpin / 1000).toFixed(2)} kJ electrical (≈60% efficient).
          A 2× 4S 550 mAh set (13 Wh usable) funds about <b className="mono">{spins} spin-ups</b> pure —
          in a real match budget ~5–7 spin-ups plus cruise and carry the second set.
        </p>
      </div>

      <div className="step">
        <h3>Mass rollup (measured CAD + fixed electronics 409 g)</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Subsystem</th><th scope="col">Ti teeth</th><th scope="col">Steel teeth</th></tr></thead>
            <tbody>
              <tr><td>Weapon (teeth pair 55.63 cm³)</td><td className="mono">246.4 g</td><td className="mono">436.7 g</td></tr>
              <tr><td>Plates + pods + shell + fasteners</td><td className="mono" colSpan={2}>399.3 g (measured, either config)</td></tr>
              <tr><td>Electronics + flight pack + wiring</td><td className="mono" colSpan={2}>409.0 g</td></tr>
              <tr><td><b>All-in (ONE weapon — never fly both staged)</b></td><td className="mono"><b>1054.7 g</b></td><td className="mono"><b>1245.0 g</b></td></tr>
              <tr><td>Margin to 1310 g target</td><td className="mono"><b>+255 g</b></td><td className="mono"><b>+65 g</b></td></tr>
            </tbody>
          </table>
        </div>
        <p className="meta">
          Steel is legal but tight — Ti is comfortable. CAD stages both weapon configs: flying both
          adds ~356 g steel (~201 g Ti) of phantom mass for the staged second config. Electro-green keepouts are placeholders, replaced by
          the fixed-electronics line above.
        </p>
      </div>

      <div className="step">
        <h3>Power + harness verdicts</h3>
        <p>
          2× 48 A max = 96 A combined vs ~104.5 A pack continuous — adequate with ~9% margin for
          bursts, not continuous stall. Expect ~1 V sag under full spin-up. Mains: <b>XT60 + 16 AWG</b>
          (XT30 is 30 A continuous — inadequate per pack path; 20 AWG fails, 18 AWG marginal short runs only).
          AM32 55 A per channel covers the 48 A motors; watch 4-in-1 board heat soak.
        </p>
      </div>

      <div className="btn-row">
        <Link className="btn primary" to="/bom">BOM + cost</Link>
        <Link className="btn" to="/studio">Drive it</Link>
      </div>
    </div>
  );
}
