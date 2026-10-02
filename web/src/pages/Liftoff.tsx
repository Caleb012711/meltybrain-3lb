import { Link } from 'react-router';
import { Reveal } from '../components/Layout';
import { useCountUp, useModelParts, useReveal } from '../hooks/hooks';
import { cadModels } from '../data/content';

function Stat({
  value,
  prefix,
  suffix,
  label,
  active,
  decimals = 0,
}: {
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  active: boolean;
  decimals?: number;
}) {
  const scaled = Math.round(value * (decimals > 0 ? 100 : 1));
  const raw = useCountUp(scaled, active);
  const text = decimals > 0 ? (raw / 100).toFixed(decimals) : String(raw);
  return (
    <div className="stat">
      <b aria-label={`${prefix}${value}${suffix}`}>
        {prefix}
        {text}
        {suffix}
      </b>
      <span>{label}</span>
    </div>
  );
}

function ProofStrip() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div className="proof" ref={ref} aria-label="Key LiftOff figures">
      <Stat value={1361} prefix="≤" suffix=" g" label="weight cap (3 lb = 1360.8 g)" active={visible} />
      <Stat value={95} prefix="~" suffix=" mph" label="tip speed @ 8 in 4000 RPM — measure yours" active={visible} />
      <Stat value={1.77} prefix="" suffix="x" label="steel-over-Ti energy at equal volume" active={visible} decimals={2} />
      <Stat value={400} prefix="±" suffix=" g" label="dual H3LIS331DLTR accel range" active={visible} />
    </div>
  );
}

function SensorDiagram() {
  return (
    <div
      aria-label="Dual accelerometers opposed at 45 degrees near spin center"
      role="img"
      style={{
        position: 'relative',
        width: 168,
        height: 168,
        margin: '12px auto',
        borderRadius: '50%',
        border: '2px solid var(--line-strong)',
        background: 'var(--inset)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--ink)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#b23600',
          border: '2px solid #ffffff',
          boxShadow: '0 0 0 1px var(--line-strong)',
          transform: 'translate(-50%, -50%) rotate(45deg) translateX(28px)',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#0284c7',
          border: '2px solid #ffffff',
          boxShadow: '0 0 0 1px var(--line-strong)',
          transform: 'translate(-50%, -50%) rotate(45deg) translateX(-28px)',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: '50%',
          height: 1,
          background: 'var(--line-strong)',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
}

export function Liftoff() {
  const teethParts = useModelParts('teeth');
  const teethModel = cadModels.find((m) => m.id === 'teeth') ?? cadModels[0];
  const teethLive =
    teethParts.length > 0
      ? `${teethParts.length} parts in viewer manifest`
      : `${teethModel.solids} solids · ${teethModel.stepSize}`;

  return (
    <div className="page">
      <p className="spec-plate">
        <span>EYELINER-3LB / REFERENCE / SHEET LIFTOFF-01</span>
        <span>Why LiftOff works</span>
      </p>
      <h1>Why LiftOff works</h1>
      <p className="lede">
        Project LiftOff is an inspiration for this project. The{' '}
        <a href="https://wiki.nhrl.io/wiki/index.php?title=Project_LiftOff">NHRL project history</a>{' '}
        documents its evolution. It does not establish that our CAD matches a particular
        revision or validate the calculations below. Our component choices and physical fit remain under review.
      </p>
      <ProofStrip />

      <Reveal>
        <div className="step">
          <h3>1 · Mass budget — measure, don&apos;t guess</h3>
          <p>
            Teeth pair measures <b className="mono">55.63 cm³</b> in CAD:{' '}
            <b className="mono">436.7 g</b> in AR500 steel, <b className="mono">246.4 g</b> in Grade 5
            titanium. Plates plus pods plus shell plus fasteners weigh{' '}
            <b className="mono">399.3 g</b>; electronics plus flight pack plus wiring weigh{' '}
            <b className="mono">409.0 g</b>.
          </p>
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
              </tbody>
            </table>
          </div>
          <p className="meta">
            Live CAD: <code>{teethModel.step.split('/').pop()}</code> — {teethLive} · 55.63 cm³ pair.
          </p>
          <p className="meta">
            CAD stages both weapon configs: flying both adds ~356 g steel (~201 g Ti) of phantom mass
            for the staged second config. Electro-green keepouts are placeholders, replaced by the
            fixed-electronics line above.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="step">
          <h3>2 · Tip speed — v = D × RPM / 336</h3>
          <p>
            Tip speed in mph is <b className="mono">v = D(in) × RPM / 336</b>. An{' '}
            <b className="mono">8 in</b> ring at <b className="mono">4000 RPM</b> is{' '}
            <b className="mono">8 × 4000 / 336 = 95.2 mph</b> — not 200+.
          </p>
          <div className="warn">
            <b>Measure YOUR spin diameter first.</b> The 331 mm bbox axis is reach, not diameter.
            Verify in CAD before quoting tip speed.
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="step">
          <h3>3 · Bite — attack × 30000 / RPM</h3>
          <p>
            Two-tooth bite in mm is <b className="mono">Bite = attack(m/s) × 30000 / RPM</b>. At{' '}
            <b className="mono">3 m/s</b> closing and <b className="mono">3000 RPM</b>, bite is{' '}
            <b className="mono">3 × 30000 / 3000 = 30 mm</b>.
          </p>
          <p>
            Make teeth stick out about <b>1.5×</b> your max bite (here ~45 mm) so slow engagements
            still connect. Faster spin halves bite — that is why 2 teeth at 4000 RPM can skate without
            protrusion.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="step">
          <h3>4 · Kinetic energy — steel hits 1.77× harder</h3>
          <p>
            KE is <b className="mono">KE = ½mv²</b>. At equal volume and speed the steel pair carries{' '}
            <b className="mono">7.85</b> vs titanium <b className="mono">4.43</b>:{' '}
            <b className="mono">7.85 / 4.43 = 1.772</b> — steel hits <b>1.77× harder</b>.{' '}
            <span className="stamp ok">Energy king: steel</span>
          </p>
          <p>
            Titanium is the relief valve, not the default: swapping the teeth pair saves about{' '}
            <b className="mono">190 g</b> (436.7 g down to 246.4 g) and buys weigh-in margin.
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="step">
          <h3>5 · Sensing — dual H3LIS331 @ 45°</h3>
          <p>
            Two <b>H3LIS331DLTR ±400 g</b> accelerometers, opposed at <b>45°</b> on short stiff SPI near
            the center of gravity. Dual-opposed cancels offset so hits that shift the center of
            rotation don&apos;t break heading. Centripetal load is <b className="mono">a = ω²r</b> —
            mount <b>≤ 20 mm</b> from spin center for the full 4000 RPM band.
          </p>
          <SensorDiagram />
          <p className="meta">Red + blue dots: opposed pair at 45° about the spin center (black dot).</p>
        </div>
      </Reveal>

      <Reveal>
        <div className="step">
          <h3>6 · Drive — PropDrive 2836 hubmotors + DShot600</h3>
          <p>
            <b>PROPDRIVE v2 2836 1200KV</b> ×2 rebuilt as hubmotors per LiftOff Rev5: <b>6 mm</b> dead
            axle, <b>2× 626</b> bearings, machined aluminum inner and outer hubs, 1.55 in titanium
            cleat wheels. Shim endplay under 1 mm.
          </p>
          <p>
            <b>AM32 55 A</b> with bidirectional <b className="mono">DShot600 at 8 kHz</b> — the loop that
            makes translation at spin possible. Not SimonK / 490 Hz. <span className="stamp ok">Locked</span>
          </p>
        </div>
      </Reveal>

      <Reveal>
        <div className="step">
          <h3>7 · Shell — TPU + AR500 sandwich</h3>
          <p>
            <b>TPU 95A + AR500 sandwich</b>: print <b>4–6 walls</b> at <b>30–60% gyroid</b>, dense cradle
            not hollow, never 100% solid. No lightening holes, no bolt holes through the rim — holes
            start cracks. Tune mass by tapering mid-span (LiftOff <b className="mono">326 → 241 g</b>{' '}
            precedent), never by drilling.
          </p>
        </div>
      </Reveal>

      <div className="btn-row">
        <Link className="btn primary" to="/engineering">Engineering math</Link>
        <Link className="btn" to="/bom">BOM + cost</Link>
        <Link className="btn" to="/explorer">3D explorer</Link>
      </div>
    </div>
  );
}
