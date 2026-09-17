import { Link } from 'react-router';
import { cadHref, cadModels, costRows, sparesRows, type CostRow } from '../data/content';

export function formatUsd(n: number | null): string {
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
        Everything to buy, with 2026 US street-price estimates. Stamps: Priced means a listing checked Sep 2026, Range means the fab quote moves. BOM.md carries no live prices — the vendor and SKU column is yours to fill. Priced rows are checked
        listings; range rows move with fab quotes. Verify before ordering — prices drift.
      </p>
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
      <h2>Weight budget — 1361 g cap</h2>
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
      <div className="btn-row">
        <Link className="btn primary" to="/explorer">Inspect parts in 3D</Link>
        <Link className="btn" to="/parts">Parts specs</Link>
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
