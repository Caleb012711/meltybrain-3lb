import { Link } from 'react-router';
import { cadHref, cadModels, costRows, sparesRows, type CostRow } from '../data/content';

function formatUsd(n: number | null): string {
  if (n === null) return '—';
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

function CostTable({ rows, caption }: { rows: CostRow[]; caption: string }) {
  const total = rows.reduce((s, r) => s + (r.lineUsd ?? 0), 0);
  return (
    <div className="table-wrap">
      <table>
        <caption className="meta" style={{ textAlign: 'left', padding: '8px 12px' }}>
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Spec</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit</th>
            <th scope="col">Line</th>
            <th scope="col">Vendor hint</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.item + r.spec}>
              <td>
                <b>{r.item}</b>{' '}
                <span className={`stamp ${r.verified ? 'ok' : 'todo'}`}>
                  {r.verified ? 'Priced' : 'Range'}
                </span>
              </td>
              <td>{r.spec}</td>
              <td className="mono">{r.qty}</td>
              <td className="mono">{formatUsd(r.unitUsd)}</td>
              <td className="mono">{formatUsd(r.lineUsd)}</td>
              <td>{r.vendor}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4}>
              <b>Subtotal</b>
            </td>
            <td className="mono">
              <b>{formatUsd(total)}</b>
            </td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Bom() {
  const buildTotal = costRows.reduce((s, r) => s + (r.lineUsd ?? 0), 0);
  const sparesTotal = sparesRows.reduce((s, r) => s + (r.lineUsd ?? 0), 0);
  return (
    <div className="page">
      <p className="spec-plate">
        <span>EYELINER-3LB / REV9 / SHEET BOM-01</span>
        <span>BOM — locked + costed</span>
      </p>
      <h1>BOM and cost</h1>
      <p className="lede">
        Complete procurement bill of materials with 2026 US street-price estimates.
        Every component is locked to LiftOff Rev9 competition geometry.
        Priced rows represent verified supplier listings; range rows reflect fabrication quotes.
      </p>

      {/* Executive KPI summary */}
      <div className="proof" aria-label="BOM key metrics summary">
        <div>
          <b>{formatUsd(buildTotal)}</b>
          <span>Build Total (w/ Handset)</span>
        </div>
        <div>
          <b>{formatUsd(sparesTotal)}</b>
          <span>Spares Budget</span>
        </div>
        <div>
          <b>≤1310 <span style={{ fontSize: '15px', color: 'var(--steel)' }}>g</span></b>
          <span>Design Weight Target</span>
        </div>
        <div>
          <b className="ok-text">+50.8 <span style={{ fontSize: '15px', color: 'var(--steel)' }}>g</span></b>
          <span>Safety Margin to 1360.8g</span>
        </div>
      </div>

      <CostTable rows={costRows} caption="Fight build — one bot plus two flight battery sets" />
      <div className="step">
        <h2>
          Build total <span className="mono">{formatUsd(buildTotal)}</span> <span className="stamp todo">Estimate</span>
        </h2>
        <p className="muted">
          About $590 excluding the handset ($662 with it) at listed prices; fab variance runs $592–737 plus tax and ship. Add spares near $161. Priced = listing checked Sep 2026; Range = fab quote moves — verify before ordering.
        </p>
      </div>

      <h2>Spares keep you in the event</h2>
      <CostTable rows={sparesRows} caption="Recommended spares — motors and ESCs die in meltybrains" />
      <div className="step">
        <h2>
          Spares total <span className="mono">{formatUsd(sparesTotal)}</span>{' '}
          <span className="stamp todo">Estimate</span>
        </h2>
        <p className="muted">
          Add a full spare armor lot ($100–180) if budget allows. Bring a calibrated scale,
          a lightening plan, and a backup 450 mAh pack option for weigh-in day.
        </p>
      </div>

      <h2>Weight budget — 1360.8 g (3.0 lb) legal cap</h2>
      <div style={{ margin: '14px 0', padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '13px', fontWeight: 600 }}>
          <span>Subsystem Allocation (1310 g Target)</span>
          <span className="mono ok-text">+50.8 g Legal Margin</span>
        </div>
        <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line-strong)' }} title="Weight allocation breakdown">
          <div style={{ width: '19%', background: '#b23600' }} title="Weapon (Ti): 246g (19%)" />
          <div style={{ width: '27%', background: '#3f4752' }} title="Plates & Structure: 350g (27%)" />
          <div style={{ width: '23%', background: '#12b76a' }} title="Motors & Pods: 300g (23%)" />
          <div style={{ width: '19%', background: '#0284c7' }} title="Electronics & Wiring: 250g (19%)" />
          <div style={{ width: '9%', background: '#f59e0b' }} title="Flight Battery: 120g (9%)" />
          <div style={{ width: '3%', background: '#bbf7d0' }} title="Buffer: 50.8g (3%)" />
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 10, fontSize: '11.5px', color: 'var(--steel)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b23600' }} /> Weapon (~246g)</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3f4752' }} /> Plates (300-400g)</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#12b76a' }} /> Drive (~300g)</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} /> Avionics (~250g)</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Battery (~120g)</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#bbf7d0' }} /> Margin (50.8g)</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Subsystem</th>
              <th scope="col">Target (estimate — weigh yours)</th>
              <th scope="col">Yours</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Weapon (teeth pair, 55.63 cm³)</td><td className="mono">~246 g (steel pair = 437 g flies at ~1245 g with ~65 g margin — legal but tight; Ti (~1055 g) is comfortable)</td><td className="mono">___ g</td></tr>
            <tr><td>Plates + structure (alu)</td><td className="mono">300–400 g</td><td className="mono">___ g</td></tr>
            <tr><td>Shell + cradle (TPU)</td><td className="mono">80–120 g</td><td className="mono">___ g</td></tr>
            <tr><td>Pods (hubs + cleats)</td><td className="mono">~50 g</td><td className="mono">___ g</td></tr>
            <tr><td>Motors + ESCs + wiring</td><td className="mono">~250 g</td><td className="mono">___ g</td></tr>
            <tr><td>Battery (1 flight set)</td><td className="mono">~120 g</td><td className="mono">___ g</td></tr>
            <tr><td>Pi + cam + BEC</td><td className="mono">35–50 g</td><td className="mono">___ g</td></tr>
            <tr><td><b>Total (cap 1360.8 g, target ≤ 1310 g)</b></td><td className="mono">1000–1250 g</td><td className="mono">___ g</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Locked spec — LiftOff Rev9, don't freestyle</h2>
      <p className="lede">
        One bot, one spec. Every row below is the locked part — the costed tables
        above are what it costs. Merged here from the old Parts page so the whole
        buy lives in one place.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Item</th><th scope="col">Spec</th><th scope="col">Qty</th></tr></thead>
          <tbody>
            <tr><td><b>Motors</b></td><td>PROPDRIVE v2 2836 1200KV, 82 g, 48 A max, 3–4S. Hubmotor build: 6 mm dead axle, two 626 bearings, aluminum hubs.</td><td className="mono">2 + 1 spare</td></tr>
            <tr><td><b>ESCs</b></td><td>AM32 55 A board, DShot600 bidirectional with eRPM telemetry. Not SimonK.</td><td className="mono">1 + spare</td></tr>
            <tr><td><b>MCU</b></td><td>Teensy 4.0 lockable without pins. Cortex-M7 at 600 MHz, soldered direct.</td><td className="mono">1 + 1 spare</td></tr>
            <tr><td><b>Accelerometers</b></td><td>H3LIS331DLTR at ±400 g. Two Adafruit 4627 breakouts to learn, two bare chips opposed at 45° on the final PCB.</td><td className="mono">2 + 2</td></tr>
            <tr><td><b>Radio</b></td><td>ELRS receiver plus handset over CRSF into Teensy UART. FHSS link, failsafe throttle-cut, filmed.</td><td className="mono">1</td></tr>
            <tr><td><b>Battery</b></td><td>Two 4S 550 mAh in parallel (XT30 packs) → XT60 mains harness, 16–20 AWG silicone, removable link under 60 s, strapped in TPU so packs cannot shift.</td><td className="mono">2+ sets</td></tr>
            <tr><td><b>Weapon</b></td><td>0.25 in AR500 teeth, symmetric 2-tooth, no holes. Liftoff tapered precedent 241–326 g; Eyeliner as-drawn 55.63 cm³ ≈ 437 g steel / 246 g Ti — taper mid-span toward precedent or Ti-swap.</td><td className="mono">1 + spares</td></tr>
            <tr><td><b>Wheels</b></td><td>Rubber set to learn, 1.55 in titanium cleats to fight.</td><td className="mono">2 + spares</td></tr>
            <tr><td><b>AI kit</b></td><td>Onboard Pi Zero 2W plus wide camera on an isolated BEC (about 40 g). Pit overhead camera plus laptop YOLO and cloud hints.</td><td className="mono">1 set</td></tr>
          </tbody>
        </table>
      </div>
      <div className="btn-row">
        <Link className="btn primary" to="/explorer">Inspect parts in 3D</Link>
        <Link className="btn" to="/build">Build guide</Link>
      </div>
    </div>
  );
}

export function DownloadCards({ modelId }: { modelId: string }) {
  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];
  return (
    <div className="dl-grid">
      <div className="dl-card">
        <h3>
          {model.label} <span className="fmt">STEP</span> <span className="stamp ok">Ready</span>
        </h3>
        <p className="path">
          <b>cad/</b>
          <i>/</i>
          {model.step.split('/').pop()}
        </p>
        <p className="verify">
          ✓ {model.stepSize} · {model.solids} solids · mm · source, do NOT upload to PCBWay
        </p>
        <div className="btn-row">
          <a className="btn primary" href={cadHref(model.step)} download>
            Download STEP
          </a>
        </div>
      </div>
      <div className="dl-card">
        <h3>
          {model.label} <span className="fmt">GLB + STL</span> <span className="stamp ok">Ready</span>
        </h3>
        <p className="path">
          <b>cad/</b>
          <i>/</i>
          {model.glb.split('/').pop()} <i>·</i> {model.glb.replace(/\.glb$/, '.stl').split('/').pop()}
        </p>
        <p className="verify">✓ viewer mesh + decimated-preview STL (do not measure — STEP is the source) · mm</p>
        <div className="btn-row">
          <a className="btn" href={cadHref(model.glb)} download>
            GLB
          </a>
          <a className="btn" href={cadHref(model.glb.replace(/\.glb$/, '.stl'))} download>
            STL
          </a>
          <Link className="btn" to="/explorer">
            Open in explorer
          </Link>
        </div>
      </div>
      <div className="dl-card">
        <h3>
          CNC exports <span className="fmt">STEP</span> <span className="stamp todo">TODO-export</span>
        </h3>
        <p className="path">
          manufacturing<b>/pcbway/cnc/</b>
          <i>NN-part-name-material.step</i>
        </p>
        <p className="verify">○ no files yet — nothing to verify</p>
        <div className="btn-row">
          <Link className="btn" to="/onshape">
            How to export
          </Link>
        </div>
      </div>
      <div className="dl-card">
        <h3>
          Print exports <span className="fmt">STL</span> <span className="stamp todo">TODO-export</span>
        </h3>
        <p className="path">
          3d-printing<b>/stl/</b>
          <i>NN-part-name.stl</i>
        </p>
        <p className="verify">○ no files yet — nothing to verify</p>
        <div className="btn-row">
          <Link className="btn" to="/printing">
            Slicing guide
          </Link>
        </div>
      </div>
    </div>
  );
}
