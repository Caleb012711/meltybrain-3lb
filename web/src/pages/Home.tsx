import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { buildSteps, cadModels, proofStats, trackerText } from '../data/content';
import { Reveal } from '../components/Layout';
import { useCountUp, useReveal } from '../hooks/hooks';

const CadViewer = lazy(() =>
  import('../components/CadViewer').then((m) => ({ default: m.CadViewer }))
);

function ProofStrip() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div className="proof" ref={ref} aria-label="Key specifications">
      {proofStats.map((s) => (
        <Stat key={s.label} {...s} active={visible} />
      ))}
    </div>
  );
}

function Stat({
  value,
  prefix,
  suffix,
  label,
  active,
}: {
  value: number;
  prefix: string;
  suffix: string;
  label: string;
  active: boolean;
}) {
  const v = useCountUp(value, active);
  return (
    <div className="stat">
      <b aria-label={`${prefix}${value}${suffix}`}>
        {prefix}
        {v}
        {suffix}
      </b>
      <span>{label}</span>
    </div>
  );
}

export function Home() {
  const copyTracker = () => {
    void navigator.clipboard?.writeText(trackerText).catch(() => undefined);
  };

  return (
    <div className="page">
      {/* 01 hero */}
      <section id="hero">
        <p className="eyebrow">01 — Eyeliner · 3 lb meltybrain · LiftOff Rev9 spec</p>
        <div className="hero-grid">
          <div>
            <h1>Spin the whole bot. Drive like it is standing still.</h1>
            <p className="lede">
              A 3 lb translational-drift combat robot: the entire body spins at 2000–4000 RPM
              while two hub motors modulate once per revolution to drive. Teensy 4.0, dual
              H3LIS331 accelerometers, PROPDRIVE 2836 1200KV hubmotors, AM32 with bidirectional
              DShot600, ELRS. This page is the full build path with the real CAD below.
            </p>
            <div className="btn-row">
              <Link className="btn primary" to="/build">Start build</Link>
              <Link className="btn" to="/onshape">Open in Onshape</Link>
              <Link className="btn" to="/pcbway">Get PCBWay files</Link>
            </div>
            <p className="meta">
              Source of truth: <code>Main CAD.step</code> (17.7 MB, 145 solids). Viewer loads
              converted GLB meshes; STEP downloads are linked per model.
            </p>
          </div>
          <div>
            <Suspense
              fallback={
                <div className="viewer">
                  <div className="viewer-fallback">
                    <img src="eyeliner_summer_2025_render.png" alt="Overhead render of the Eyeliner 3lb meltybrain" />
                  </div>
                  <p className="status">Loading 3D viewer…</p>
                </div>
              }
            >
              <CadViewer />
            </Suspense>
          </div>
        </div>
        <ProofStrip />
        <p className="meta">
          Tip-speed math: v(mph) = π × D(in) × RPM / 336. An 8 in ring at 4000 RPM is about
          95 mph — not 200+. Always verify your actual spin diameter before quoting numbers.
        </p>
      </section>

      {/* 02 render + how melty works */}
      <Reveal as="section">
        <section id="how" className="section">
          <p className="eyebrow">02 — How a melty works</p>
          <h2>Controlled drift, not a top</h2>
          <p className="lede">
            Two drive wheels spin the body up. An accelerometer measures the resulting
            g-force, the controller derives RPM and heading, and each motor is powered for a
            slice of every revolution. Shift the slice and the orbit becomes straight-line
            drive. OpenMelt2 proved the math to about 3200 RPM; LiftOff made it deterministic
            with two opposed accelerometers at 45 degrees so hits that move the center of
            rotation do not break tracking.
          </p>
          <figure className="render-figure">
            <img src="eyeliner_summer_2025_render.png" alt="Overhead render of the Eyeliner 3lb meltybrain" />
            <figcaption className="mono">
              eyeliner_summer_2025_render.png — steel ring plus TPU shell. Balance is everything:
              3–5 g off means violent hop at 3000 RPM.
            </figcaption>
          </figure>
        </section>
      </Reveal>

      {/* 03 anatomy */}
      <Reveal as="section">
        <section id="anatomy" className="section">
          <p className="eyebrow">03 — Anatomy</p>
          <h2>Ring, pods, electronics</h2>
          <div className="cards">
            <div className="card">
              <h3>Weapon: AR500 ring</h3>
              <p>Symmetric 2-tooth, 0.25 in, no lightening holes, no bolt holes through the rim. Holes start cracks; a single tooth plus counterweight throws the chassis on tooth-stop. Liftoff tapered 326 g down to 241 g.</p>
              <footer className="foot meta mono">Standard Weapon Teeth.step · 295 KB · 2 solids</footer>
            </div>
            <div className="card">
              <h3>Drive: hubmotor pods</h3>
              <p>PROPDRIVE 2836 1200KV cans rebuilt as hubmotors: 6 mm dead axle, two 626 bearings, machined aluminum inner and outer hubs, 1.55 in titanium cleat wheels. Wheels-out mounting trades top speed for spin-up torque.</p>
              <footer className="foot meta mono">Wheel Pod.step · 4.1 MB · 25 solids</footer>
            </div>
            <div className="card">
              <h3>Electronics: Teensy core</h3>
              <p>Teensy 4.0 lockable without pins, two H3LIS331DLTR at ±400 g opposed at 45°, AM32 55 A with bidirectional DShot600 at 8 kHz, ELRS receiver, two 4S 550 mAh packs in parallel. Pi Zero 2W plus camera rides along for logging only.</p>
              <footer className="foot meta mono">BOM.md · firmware/README.md</footer>
            </div>
          </div>
        </section>
      </Reveal>

      {/* 04 build path */}
      <Reveal as="section">
        <section id="build-path" className="section">
          <p className="eyebrow">04 — Build path, 8 steps</p>
          <h2>Do it in order, tick boxes</h2>
          {buildSteps.map((s) => (
            <div className="step" key={s.n}>
              <h3>{s.n} · {s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
          <div className="btn-row">
            <Link className="btn primary" to="/build">Full build guide</Link>
            <button className="btn" onClick={copyTracker}>Copy tracker</button>
          </div>
          <div className="tracker">
            <pre>{trackerText}</pre>
          </div>
        </section>
      </Reveal>

      {/* 05 CAD files */}
      <Reveal as="section">
        <section id="cad" className="section">
          <p className="eyebrow">05 — CAD files, actual sizes</p>
          <h2>Download the real assemblies</h2>
          <p className="lede">
            These live in the repo root. They are the source — not the order. Export single
            bodies from them in Onshape, then send the exports to PCBWay. Toggle the models
            in the hero viewer above; every row here links the same files.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>File</th><th>Size</th><th>Solids</th><th>Role</th><th>Get</th></tr>
              </thead>
              <tbody>
                {cadModels.map((m) => (
                  <tr key={m.id}>
                    <td className="mono">{m.step.split('/').pop()}</td>
                    <td className="mono">{m.stepSize}</td>
                    <td className="mono">{m.solids}</td>
                    <td>{m.note}</td>
                    <td><a href={m.step} download>STEP</a> · <a href={m.glb} download>GLB</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="btn-row">
            <Link className="btn" to="/onshape">How to export from Onshape</Link>
            <Link className="btn" to="/pcbway">What to send PCBWay</Link>
          </div>
        </section>
      </Reveal>

      {/* 06 teasers */}
      <Reveal as="section">
        <section id="more" className="section">
          <p className="eyebrow">06 — Metal, plastic, firmware</p>
          <h2>Three pages, no guesswork</h2>
          <div className="cards">
            <Link className="card" to="/pcbway">
              <h3>Send metal to PCBWay</h3>
              <p>CNC STEP one-solid-per-file in millimeters, sheet DXF 1:1 with cut outlines only, materials per part, the 5-minute pre-pay check.</p>
              <footer className="foot meta mono">manufacturing/pcbway/</footer>
            </Link>
            <Link className="card" to="/printing">
              <h3>Print plastics unsliced</h3>
              <p>STLs only, never G-code. TPU 95A profile for Orca, Bambu, and PrusaSlicer, drying, inserts, and the five beginner failure modes.</p>
              <footer className="foot meta mono">3d-printing/stl/</footer>
            </Link>
            <Link className="card" to="/firmware">
              <h3>Flash Teensy, add AI cam</h3>
              <p>OpenMelt2 learning rig to LiftOff fight stack, AM32 plus ELRS wiring, bench to 4000 RPM, failsafe filming, onboard Pi plus pit YOLO advisory loop.</p>
              <footer className="foot meta mono">firmware/README.md</footer>
            </Link>
          </div>
        </section>
      </Reveal>

      {/* 07 FAQ */}
      <Reveal as="section">
        <section id="faq" className="section">
          <p className="eyebrow">07 — Questions every builder asks</p>
          <h2>Weight, failsafe, cloud</h2>
          <div className="step">
            <h3>How do you make 1361 g?</h3>
            <p>Branch E from the mass audit: titanium weapon band around 200–250 g, aluminum plates and structure 300–400 g, TPU 80–120 g, pods about 50 g — all-in near 1000–1250 g before battery and wiring. Keep 50 g margin for wires, Loctite, and scale error. Titanium is the relief valve: swapping the teeth pair from steel to titanium saves about 190 g.</p>
          </div>
          <div className="step">
            <h3>What failsafe do inspectors want to see?</h3>
            <p>Transmitter off means motors stopped or braked in under one second, with no restart until a deliberate re-arm. Same behavior on Pi brown-out. It must never boot armed with throttle high. Film it and save firmware/failsafe-test.mp4.</p>
          </div>
          <div className="step">
            <h3>Does the cloud AI drive the bot?</h3>
            <p>No. The match link is FHSS ELRS with its own failsafe. The onboard Pi trims and logs at 50–100 Hz, the pit dashboard watches at about 5 Hz, and cloud vision plus strategy hints arrive in seconds, human-gated. Anything beyond advisory autonomy needs event pre-clear under SPARC §6.4.3.</p>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
