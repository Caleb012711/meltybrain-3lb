import { Link } from 'react-router';
import { buildSteps, trackerText } from '../data/content';
import { Reveal } from '../components/Layout';
import { DownloadCards } from './Bom';

export function Build() {
  return (
    <div className="page">
      <p className="eyebrow">Build — beginner path</p>
      <h1>Build in 8 steps</h1>
      <p className="lede">Do these in order. Tick boxes. Ask your event organizers early about radio and autonomy rules.</p>
      {buildSteps.map((s) => (
        <Reveal key={s.n}>
          <div className="step">
            <h3>{s.n} · {s.title}</h3>
            <p>{s.body}</p>
          </div>
        </Reveal>
      ))}
      <div className="tracker">
        <h3>Tracker — copy to a GitHub issue</h3>
        <pre>{trackerText}</pre>
      </div>
      <div className="btn-row">
        <Link className="btn primary" to="/onshape">Next: open CAD in Onshape</Link>
        <Link className="btn" to="/parts">Parts list</Link>
      </div>
    </div>
  );
}

export function Onshape() {
  return (
    <div className="page">
      <p className="eyebrow">Onshape — zero-install CAD</p>
      <h1>From assembly to order-ready files</h1>
      <p className="lede">
        Onshape runs in a browser, imports STEP in millimeters, and exports exactly what
        PCBWay and your slicer need. Do this once per source assembly, one document per STEP
        to stay beginner-safe.
      </p>
      <div className="warn">
        <b>Rule:</b> one file, one solid, millimeters. PCBWay rejects multi-body assemblies.
        Never upload <code>Main CAD.step</code> itself.
      </div>
      {[
        { t: '1 · Import and verify scale', b: 'New document, Import tab, drag the STEP, units Millimeter, keep Import as assembly. Display units to mm with 3 decimals. Measure a known M3 clearance hole: it must read about 3.2 mm (M4 about 4.2 mm). Overall footprint is roughly 150–250 mm. If holes read 0.126 in or the bot is 25.4× off, delete and re-import in mm — never Scale to fix.' },
        { t: '2 · Split into per-part studios', b: 'Create one Part Studio per physical part (01-chassis-base, 02-weapon-hub, 03-tooth-std, 04-wheel-pod-hub, 05-shaft-6mm, 06-top-armor). Use Derived to pull exactly one solid body into each. The Parts list at the bottom must show exactly 1 solid. Thick 3D metal goes to CNC, constant-thickness flats to sheet, TPU and PETG bodies to print.' },
        { t: '3 · Export CNC parts as STEP', b: 'Right-click the part, Export as STEP, AP214, mm, single file. Name NN-name-material.step (01-chassis-base-6061.step, 02-weapon-hub-7075.step, 03-tooth-std-ar500.step). Drop into manufacturing/pcbway/cnc/. Re-import each export to an empty studio to confirm one solid and 3.2 mm holes.' },
        { t: '4 · Export flats as DXF', b: 'Right-click the largest flat face, Export face as DXF, mm, 1:1, R14 or 2013. Name NN-name-thickness-material.dxf (01-top-armor-2mm-5052.dxf) into manufacturing/pcbway/sheet-metal/. Outlines plus holes on one layer only — no title block, no dimensions. Face export avoids the Drawing border trap.' },
        { t: '5 · Export plastics as STL', b: 'Right-click the part, Export as STL, binary, mm, Fine (about 0.1 mm chord). Name NN-name.stl into 3d-printing/stl/. One part per file. STLs never go to PCBWay; STEP never goes to the slicer for final prints.' },
        { t: '6 · Version it', b: 'History clock, Create version V1-cnc-ready with the exported filenames in the note. Fill manufacturing/pcbway/ORDER-CHECKLIST.md from that version before paying.' },
      ].map((s) => (
        <Reveal key={s.t}>
          <div className="step"><h3>{s.t}</h3><p>{s.b}</p></div>
        </Reveal>
      ))}
      <div className="btn-row">
        <Link className="btn primary" to="/pcbway">Next: order from PCBWay</Link>
        <Link className="btn" to="/">Back to viewer</Link>
      </div>
    </div>
  );
}

export function Pcbway() {
  return (
    <div className="page">
      <p className="eyebrow">PCBWay — machining order pack</p>
      <h1>Send this to PCBWay</h1>
      <div className="warn">
        <b>Do NOT upload</b> <code>Main CAD.step</code> (17.7 MB assembly), <code>Wheel Pod.step</code>, STLs, or G-code. PCBWay quotes <b>one solid per file</b>. Export in Onshape first, then upload.
      </div>
      <h2>Source to export map</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Root STEP (do not upload)</th><th>Export each as</th><th>Lands in</th></tr></thead>
          <tbody>
            <tr><td className="mono">Main CAD.step</td><td>Machined bodies to STEP AP214 mm, one solid per file. Flat armor to DXF.</td><td className="mono">pcbway/cnc/ · sheet-metal/</td></tr>
            <tr><td className="mono">Wheel Pod.step</td><td>Same: one body, one STEP.</td><td className="mono">pcbway/cnc/</td></tr>
            <tr><td className="mono">Standard Weapon Teeth.step</td><td>Each tooth to STEP for CNC, or DXF if flat waterjet.</td><td className="mono">cnc/ or sheet-metal/</td></tr>
            <tr><td className="mono">Undercutter Config.step</td><td>Same as teeth. Order one config plus spares.</td><td className="mono">cnc/ or sheet-metal/</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Materials to pick on the quote</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Part</th><th>Pick</th><th>Finish / tolerance</th></tr></thead>
          <tbody>
            <tr><td>Chassis, structure, motor mounts</td><td><b>6061-T6 aluminum</b></td><td>As-machined, general ISO 2768-m</td></tr>
            <tr><td>Weapon hub, high load</td><td><b>7075-T6</b> or 4140 steel per CAD notes</td><td>H7 bearing bores only, note in comments</td></tr>
            <tr><td>Teeth</td><td><b>AR500 / Hardox</b> default, Grade 5 titanium alt</td><td>As-cut, quantity 2 plus spares</td></tr>
            <tr><td>Shafts, standoffs</td><td><b>303 stainless or 6061</b></td><td>As-machined</td></tr>
            <tr><td>Flat armor (DXF)</td><td><b>5052-H32 or 6061, 1.5–3 mm</b>, match CAD</td><td>Laser only</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Five-minute check before you pay</h2>
      <div className="step">
        <p>Every file opens in the PCBWay preview. Units read mm with M3 at 3.2 mm. One part per file with NN-name-material names. Materials and thicknesses match the tables. Teeth spares added. Bearing fits noted H7/h6. Shipping leaves room for a re-order. Save the quote PDF in the folder.</p>
      </div>
      <p className="meta">US alternate for flat AR500: SendCutSend or OSH Cut waterjet from the same DXF. CNC teeth stay on PCBWay.</p>
      <h2>Source assemblies (not order-ready — export first)</h2>
      <p className="meta">CNC and DXF order files do not exist yet — export single bodies in Onshape first.</p>
      <DownloadCards modelId="full" />
      <div className="btn-row">
        <Link className="btn primary" to="/printing">Next: printing guide</Link>
        <Link className="btn" to="/onshape">Back to Onshape</Link>
      </div>
    </div>
  );
}

export function Printing() {
  return (
    <div className="page">
      <p className="eyebrow">3D printing — unsliced on purpose</p>
      <h1>No G-code here</h1>
      <div className="warn">
        <b>Someone else's G-code crashes nozzles.</b> We ship <b>STL only</b>; you slice for <b>your printer and your spool</b>. Preview any STL in the <Link to="/">hero viewer</Link>.
      </div>
      <h2>What prints, what never prints</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Prints (plastic)</th><th>Never prints — PCBWay metal</th></tr></thead>
          <tbody>
            <tr><td>TPU shell and cradle halves, pod guards, LED mount, Pi and BEC mount, battery tray, bench wheel locks</td><td>Ring, teeth, plates, shafts</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Materials</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Use</th><th>For</th></tr></thead>
          <tbody>
            <tr><td><b>TPU 95A</b> (Overture, SainSmart, Cheetah)</td><td>Shell, cradle, guards — the shock absorber. LiftOff retired HDPE and UHMW for this.</td></tr>
            <tr><td>PETG / ABS-ASA</td><td>Jigs, pit stand, LED mounts — not impact structure.</td></tr>
            <tr><td>PLA</td><td>Fit-check only. Shatters in fights.</td></tr>
          </tbody>
        </table>
      </div>
      <h2>TPU 95A profile (Orca, Bambu, PrusaSlicer)</h2>      <div className="table-wrap">
        <table>
          <thead><tr><th>Setting</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Printer</td><td>Direct drive strongly preferred. Bowden plus TPU jams.</td></tr>
            <tr><td>Nozzle / bed</td><td>225–240 °C per spool after a temp tower. Bed 40–60 °C with glue on smooth plate.</td></tr>
            <tr><td>Speed / retraction</td><td>20–35 mm/s. Retraction off or 1 mm max. Pressure advance off to start.</td></tr>
            <tr><td>Walls / infill</td><td>4–6 perimeters, 5–6 top and bottom layers, 30–60% gyroid. Dense cradle, not hollow, never 100% solid.</td></tr>
            <tr><td>Drying</td><td>65 °C for 4–6 hours. Wet TPU strings, pops, and delaminates — the number one beginner failure.</td></tr>
            <tr><td>Finish</td><td>Heat-set M3/M4 inserts at 200–220 °C. Never tap TPU. Weigh prints into the BOM budget (TPU is 1.21 g/cc).</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Downloads — pod reference pack</h2>
      <p className="meta">Print STLs are exported per plastic body from Onshape — nothing to download yet. The pod reference below is assembly geometry, not print-ready.</p>
      <DownloadCards modelId="pod" />
      <div className="btn-row">
        <Link className="btn primary" to="/firmware">Next: firmware</Link>
        <Link className="btn" to="/pcbway">Back to PCBWay</Link>
      </div>
    </div>
  );
}

export function Parts() {
  const rows: [string, string, string][] = [
    ['Motors', 'PROPDRIVE v2 2836 1200KV, 82 g, 48 A max, 3–4S. Hubmotor build: 6 mm dead axle, two 626 bearings, aluminum hubs.', '2 + 1 spare'],
    ['ESCs', 'AM32 55 A board, DShot600 bidirectional with eRPM telemetry. Not SimonK.', '1 + spare'],
    ['MCU', 'Teensy 4.0 lockable without pins. Cortex-M7 at 600 MHz, soldered direct.', '1 + 1 spare'],
    ['Accelerometers', 'H3LIS331DLTR at ±400 g. Two Adafruit 4627 breakouts to learn, two bare chips opposed at 45° on the final PCB.', '2 + 2'],
    ['Radio', 'ELRS receiver plus handset over CRSF into Teensy UART. Failsafe throttle-cut verified.', '1'],
    ['Battery', 'Two 4S 550 mAh in parallel, strapped in TPU so they cannot shift.', '2+ sets'],
    ['Weapon', '0.25 in AR500 ring, symmetric 2-tooth, no holes, tapered toward 241 g.', '1 + spares'],
    ['Wheels', 'Rubber set to learn, 1.55 in titanium cleats to fight.', '2 + spares'],
    ['AI kit', 'Onboard Pi Zero 2W plus wide camera on an isolated BEC (about 40 g). Pit overhead camera plus laptop YOLO and cloud hints.', '1 set'],
  ];
  return (
    <div className="page">
      <p className="eyebrow">Parts — locked to LiftOff Rev9</p>
      <h1>Buy this, not almost-this</h1>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Item</th><th>Spec</th><th>Qty</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td className="mono">{r[2]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">Full tick-box BOM with vendor-link column lives in <code>BOM.md</code>. Cap is 1361 g — weigh every subassembly.</p>
    </div>
  );
}

export function Firmware() {
  return (
    <div className="page">
      <p className="eyebrow">Firmware + AI camera</p>
      <h1>Teensy spins, Pi watches, cloud suggests</h1>
      <div className="warn danger">
        <b>Safety ladder:</b> T0 failsafe, T1 Teensy spin at 8 kHz DShot600, T2 onboard Pi assist at 50–100 Hz, T3 pit dashboard near 5 Hz, T4 cloud hints in seconds. T3 and T4 <b>never drive</b>. TX-off stops the bot in under one second, filmed.
      </div>
      <h2>OpenMelt2 learning rig to LiftOff fight stack</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>OpenMelt2 (learn)</th><th>LiftOff Rev9 (fight)</th></tr></thead>
          <tbody>
            <tr><td>MCU</td><td>Arduino Micro</td><td>Teensy 4.0 at 600 MHz</td></tr>
            <tr><td>Sensing</td><td>Single H3LIS331, 3.9 cm radius default</td><td>Dual H3LIS331DLTR, opposed at 45°, SPI</td></tr>
            <tr><td>Drive</td><td>Binary or 490 Hz PWM, SimonK</td><td>DShot600 bidirectional at 8 kHz, AM32</td></tr>
            <tr><td>Spin</td><td>To about 3200 RPM, drifts after hits</td><td>2000–4000 RPM, survives center shifts</td></tr>
          </tbody>
        </table>
      </div>
      <div className="step">
        <h3>Wiring, locked</h3>
        <p>Battery to link to AM32 boards to PROPDRIVEs. ELRS CRSF to Teensy UART. Dual accelerometers on short stiff SPI near the center of gravity. 4700 uF across 5 V, 10:1 divider for battery sense. Green LED means front, raised and inset so it reads across the arena. Never power the Teensy from Pi USB inside the bot.</p>
      </div>
      <div className="step">
        <h3>Tune: bench, slide, 2k, 3k, 4k</h3>
        <p>Bench with no weapon energy. Low-RPM slide to check the LED matches the stick. Trim straight for the floor. Ramp 2000, heat-check, 3000, heat-check, 4000. Blip-test hit recovery — it must re-hold RPM, not toilet-bowl. One gain at a time, log RPM, g, battery, and temperature on the Pi.</p>
      </div>
      <div className="step">
        <h3>Dual-camera AI, both, advisory only</h3>
        <p>Onboard Pi Zero 2W plus wide camera over UART: optical-flow trim, RPM hold, 1080p log to SD, telemetry back to the handset. Pit overhead camera plus laptop: YOLO tracks both bots, cloud model suggests strategy for the driver to approve. Reference: DeepMelt. Full autonomy needs event pre-clear.</p>
      </div>
    </div>
  );
}
