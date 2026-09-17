import { Link } from 'react-router';
import { buildSteps, trackerText } from '../data/content';
import { Reveal } from '../components/Layout';
import { DownloadCards } from './Bom';

export function Build() {
  return (
    <div className="page">
      <p className="eyebrow">Build — beginner path</p>
      <h1>Build in 8 steps</h1>
      <p className="lede">Zero experience OK. Eight steps in order. P0 first: read SPARC plus TRC beetle rules, then message TRC now if you run any DIY handset. Metal lead time drives the schedule.</p>
      <div className="warn">
        <b>Safety first:</b> LiPo bag, never charge unattended. Wheel locks on until the arena or test box. Link pull under 60 s. Concrete floor, no people or pets in the plane of spin.
      </div>
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
      <div className="warn danger">
        <b>P1 gate — do not pay yet:</b> no metal order until STEP volume × density says ≤1310 g
        target. Branch B/D (steel ring plus solid chassis) prove overweight as-drawn. If the 80 cm³
        body is solid in CAD, pocket and lighten it — or go TPU plus aluminum sandwich — first.
      </div>
      <div className="warn">
        <b>Do NOT upload</b> <code>Main CAD.step</code> (17.7 MB assembly), <code>Wheel Pod.step</code>, STLs, or G-code. PCBWay quotes <b>one solid per file</b>. Export in Onshape first, then upload.
      </div>
      <h2>Source to export map</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Root STEP (do not upload)</th><th scope="col">Export each as</th><th scope="col">Lands in</th></tr></thead>
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
          <thead><tr><th scope="col">Part</th><th scope="col">Pick</th><th scope="col">Finish / tolerance</th></tr></thead>
          <tbody>
            <tr><td>Chassis, structure, motor mounts</td><td><b>6061-T6 aluminum</b></td><td>As-machined, general ISO 2768-m</td></tr>
            <tr><td>Weapon hub, high load</td><td><b>7075-T6</b> or 4140 steel per CAD notes</td><td>H7 bearing bores only, note in comments</td></tr>
            <tr><td>Teeth</td><td><b>AR500 0.25 in</b> default — Liftoff tapered precedent 241–326 g; Eyeliner as-drawn 55.63 cm³ ≈ 437 g steel / 246 g Ti. Taper to tune, never drill; Ti only as relief valve (saves ~190 g a pair)</td><td>As-cut, quantity 2 plus spares</td></tr>
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
      <p className="meta">Empty now — here is the action: export NN-name-material.step to manufacturing/pcbway/cnc/ and NN-name-thickness-material.dxf to sheet-metal/, fill ORDER-CHECKLIST.md, cut an Onshape version V1-cnc-ready. Flat AR500 alt: send the same DXF to SendCutSend or OSH Cut.</p>
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
          <thead><tr><th scope="col">Prints (plastic)</th><th scope="col">Never prints — PCBWay metal</th></tr></thead>
          <tbody>
            <tr><td>TPU shell and cradle halves, pod guards, LED mount, Pi and BEC mount, battery tray, bench wheel locks</td><td>Ring, teeth, plates, shafts</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Materials</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Use</th><th scope="col">For</th></tr></thead>
          <tbody>
            <tr><td><b>TPU 95A</b> (Overture, SainSmart, Cheetah)</td><td>Shell, cradle, guards — the shock absorber. LiftOff retired HDPE and UHMW for this.</td></tr>
            <tr><td>PETG / ABS-ASA</td><td>Jigs, pit stand, LED mounts — not impact structure.</td></tr>
            <tr><td>PLA</td><td>Fit-check only. Shatters in fights.</td></tr>
          </tbody>
        </table>
      </div>
      <h2>TPU 95A profile (Orca, Bambu, PrusaSlicer)</h2>      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Setting</th><th scope="col">Value</th></tr></thead>
          <tbody>
            <tr><td>Printer</td><td>Direct drive strongly preferred. Bowden plus TPU jams — direct drive or pick another project.</td></tr>
            <tr><td>Nozzle / bed</td><td>225–240 °C per spool after a temp tower. Bed 40–60 °C with glue on smooth plate.</td></tr>
            <tr><td>Speed / retraction</td><td>20–35 mm/s. Retraction off or 1 mm max. Pressure advance off to start.</td></tr>
            <tr><td>Walls / infill</td><td>4–6 perimeters, 5–6 top and bottom layers, 30–60% gyroid. Dense cradle, not hollow, never 100% solid.</td></tr>
            <tr><td>Drying</td><td>65 °C for 4–6 hours. Wet TPU strings, pops, and delaminates — the number one beginner failure.</td></tr>
            <tr><td>Finish</td><td>Heat-set M3/M4 inserts at 200–220 °C. Never tap TPU. Test-fit in cheap PLA or PETG first, then TPU; weigh prints into the BOM (TPU is 1.21 g/cc).</td></tr>
          </tbody>
        </table>
      </div>
      <h2>Downloads — pod reference pack</h2>
      <p className="meta">No print STLs yet — export NN-name.stl from Onshape (binary, about 0.1 mm chord) into 3d-printing/stl/. The pod reference below is assembly geometry, not print-ready.</p>
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
    ['Radio', 'ELRS receiver plus handset over CRSF into Teensy UART. FHSS link, failsafe throttle-cut, filmed.', '1'],
    ['Battery', 'Two 4S 550 mAh in parallel, XT30, 16–20 AWG silicone, removable link under 60 s, strapped in TPU so packs cannot shift.', '2+ sets'],
    ['Weapon', '0.25 in AR500 teeth, symmetric 2-tooth, no holes. Liftoff tapered precedent 241–326 g; Eyeliner as-drawn 55.63 cm³ ≈ 437 g steel / 246 g Ti — taper mid-span toward precedent or Ti-swap.', '1 + spares'],
    ['Wheels', 'Rubber set to learn, 1.55 in titanium cleats to fight.', '2 + spares'],
    ['AI kit', 'Onboard Pi Zero 2W plus wide camera on an isolated BEC (about 40 g). Pit overhead camera plus laptop YOLO and cloud hints.', '1 set'],
  ];
  return (
    <div className="page">
      <p className="eyebrow">Parts — locked to LiftOff Rev9</p>
      <h1>Buy this — locked spec</h1>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Item</th><th scope="col">Spec</th><th scope="col">Qty</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td className="mono">{r[2]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">Full tick-box BOM with vendor-link column lives in <code>BOM.md</code>. Cap is 1361 g — weigh every subassembly.</p>
      <h2>Blade lab — what the winners run</h2>
      <div className="step">
        <h3>AR500 ring, blunt symmetric teeth, no holes</h3>
        <p>
          Project Liftoff's hard lessons, all confirmed in competition: a pointed tooth
          embeds in the arena wall — run it blunt. A single tooth plus counterweight throws
          the chassis when the tooth stops on impact — run symmetric 2-tooth. Bolt holes
          through the rim start cracks — remove them and taper mid-span instead (Liftoff's
          precedent: 326 g down to 241 g). Our teeth measure 55.63 cm³ a pair in CAD: 437 g in
          steel, 246 g in titanium — so steel is the energy king but titanium is the relief valve that buys ~190 g of margin.
          Steel carries 1.77× the energy of titanium at equal volume, which is exactly why the
          Ti-swap is the relief valve, not the default.
        </p>
      </div>
      <div className="step">
        <h3>Bite beats tip speed</h3>
        <p>
          Fewer teeth mean deeper bites — going from 1 tooth to 2 halves it. Usable tooth
          height ≈ attack speed × 60 ÷ (RPM × teeth); make teeth stick out about 1.5× your
          max bite so slow engagements still connect. A melty closes fast once spinning,
          which is why the symmetric 2-tooth works: full-width hits with real engagement.
          Sources: RioBotz §6.3 bite math, RunAmok spinner FAQ, JustCuz spinner design.
        </p>
      </div>
      <div className="step">
        <h3>Modular configs</h3>
        <p>
          Liftoff Rev8+ runs swappable mid-cutter, undercutter, and flying-wedge configs —
          reach against other horizontals, low attacks against big wheels. This repo ships
          both <code>Standard Weapon Teeth.step</code> and <code>Undercutter Config.step</code>;
          compare them in the <Link to="/explorer">3D explorer</Link> before ordering steel.
        </p>
      </div>
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
          <thead><tr><th scope="col"></th><th scope="col">OpenMelt2 (learn)</th><th scope="col">LiftOff Rev9 (fight)</th></tr></thead>
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
        <p>Battery to link (XT60 mains, 16 AWG — XT30 is 30 A continuous and inadequate per 48 A pack path) to AM32 boards to PROPDRIVEs (18 AWG minimum on short motor leads). ELRS CRSF to Teensy UART. Dual accelerometers on short stiff SPI within ~20 mm of the spin center (a ±400 g H3LIS331 saturates above ~2800 RPM at 45 mm and above ~3450 RPM at 30 mm — mount close or accept an RPM ceiling). 4700 uF across 5 V, 10:1 divider for battery sense. Green LED means front, raised and inset so it reads across the arena. Never power the Teensy from Pi USB inside the bot.</p>
      </div>
      <div className="step">
        <h3>Tune: bench, slide, 2k, 3k, 4k</h3>
        <p>Bench with no weapon energy. Low-RPM slide to check the LED matches the stick. Trim straight for the floor. Ramp 2000, heat-check, 3000, heat-check, 4000. Blip-test hit recovery — it must re-hold RPM, not toilet-bowl. One gain at a time, log RPM, g, battery, and temperature on the Pi.</p>
      </div>
      <div className="step">
        <h3>Failsafe — film this</h3>
        <p>TX-off stops or brakes the bot in under 1 s, with no restart without a deliberate re-arm. Yank Pi power — the MCU must still failsafe. It must never boot armed with throttle high. Save firmware/failsafe-test.mp4, freeze the firmware version, back up config and logs. Show TRC at check-in.</p>
      </div>
      <div className="step">
        <h3>Dual-camera AI, both, advisory only</h3>
        <p>Onboard Pi Zero 2W plus wide camera over UART: optical-flow trim, RPM hold, 1080p log to SD, telemetry back to the handset. Pit overhead camera plus laptop: YOLO tracks both bots, cloud model suggests strategy for the driver to approve. Reference: DeepMelt. DIY handset is a trainer until TRC pre-clears §6.4.3. Match radio is the RadioMaster Pocket plus EP1/RP1.</p>
      </div>
    </div>
  );
}
