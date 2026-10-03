/* oxlint-disable react/no-unescaped-entities */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import '../cyber-combat.css';
import './BuildGuide.css';

interface BuildStepItem {
  id: string;
  title: string;
  desc: string;
  badge?: string;
  safety?: boolean;
}

interface BuildPhase {
  id: string;
  num: number;
  title: string;
  subtitle: string;
  estTime: string;
  targetWeightImpact: string;
  tools: string[];
  materials: string[];
  specs: { label: string; value: string }[];
  deepDive: {
    heading: string;
    paragraphs: string[];
    callout?: {
      type: 'warning' | 'danger' | 'tip';
      title: string;
      body: string;
    };
  };
  steps: BuildStepItem[];
}

const PHASES_DATA: BuildPhase[] = [
  {
    id: 'phase-1',
    num: 1,
    title: 'Procurement & Custom Fabrication',
    subtitle: 'SendCutSend DXFs, PCBWay CNC ordering, raw consumables & alloy tolerances',
    estTime: '5–8 days (lead-time driven)',
    targetWeightImpact: '683 g (raw metal subtotal)',
    tools: ['Digital vernier calipers (0.01 mm)', 'Thread pitch gauge (M2/M2.5/M3)', 'Deburring tool & 400-grit emery paper'],
    materials: [
      '0.25" AR500 steel plate (laser/waterjet cut)',
      '6061-T6 2.0 mm & 3.0 mm plate',
      '7075-T6 weapon hubs & bearing housings (CNC milled)',
      'Grade 5 Ti-6Al-4V cleat plates',
      'Bambu TPU 95A High-Flow filament (1 kg)',
      'Smooth-On PMC-780 urethane elastomer (2 lb kit)',
    ],
    specs: [
      { label: 'Bearing Bore Fit', value: '19.000 mm H7 (+0.015 / -0.000 mm)' },
      { label: 'Dead Axle Shaft Fit', value: '6.000 mm h6 (+0.000 / -0.008 mm)' },
      { label: 'Fastener Clearances', value: 'M3: 3.2 mm · M4: 4.2 mm' },
      { label: 'AR500 Hardness', value: '477–534 HBW (surface & through-core)' },
    ],
    deepDive: {
      heading: 'Precision Tolerancing & Vendor Ordering Gates',
      paragraphs: [
        'Do not place metal orders until your CAD export strictly separates each body into a single solid. Uploading multi-body STEP files results in rejected quotes or incorrect origin offsets. Export machined 7075-T6 weapon hubs and motor mount blocks to STEP AP214 in millimeters with explicit H7 (+0.015/-0.000 mm) bore callouts for the 626ZZ bearings.',
        'For flat armor plates (top/bottom sandwich and AR500 teeth), export 1:1 DXFs with zero title blocks or dimension callouts. For SendCutSend, ensure internal hole diameters exceed material thickness (e.g., minimum hole Ø6.35 mm in 0.25" AR500) or specify pierce-point offset to avoid edge blowouts on your impact tooth roots.',
      ],
      callout: {
        type: 'danger',
        title: 'P1 Mass Gate — Verify Before Paying',
        body: 'Do not pay for metal fabrication until your CAD calculated dry mass is ≤1,245 g. Branch B steel weapon teeth measure 55.63 cm³ per pair (437 g). If your chassis plate pocketing is skipped, total weight will breach the 1,360.8 g (3.0 lb) legal cap! Titanium teeth (246 g) serve as an immediate 191 g relief valve if needed.',
      },
    },
    steps: [
      {
        id: 'p1_s1',
        title: 'Export 1-solid STEP files for CNC hubs (PCBWay)',
        desc: 'Export 02-weapon-hub-7075.step and 04-wheel-pod-hub.step from Onshape. Confirm 1 solid per file and check that M3 clearance reads exactly 3.2 mm.',
        badge: 'CAD / STEP',
      },
      {
        id: 'p1_s2',
        title: 'Export 1:1 DXFs for SendCutSend laser/waterjet',
        desc: 'Export top/bottom 6061-T6 plates and AR500 symmetric tooth profiles. Remove title blocks, dimensions, and hidden layers. Check scale is 1:1 mm.',
        badge: 'CAD / DXF',
      },
      {
        id: 'p1_s3',
        title: 'Order Bambu TPU 95A HF filament & vacuum dry',
        desc: 'Acquire 100% genuine TPU 95A High-Flow. Pre-dry filament in a dedicated dehydrator at 65°C for 8 hours prior to printing structural pod bumpers.',
        badge: 'Consumables',
      },
      {
        id: 'p1_s4',
        title: 'Order Smooth-On PMC-780 Urethane & Ease Release 200',
        desc: 'Procure Shore 80A industrial casting urethane, Mann Ease Release 200 aerosol, and mixing cups with 0.1 g digital scale resolution.',
        badge: 'Casting Chem',
      },
      {
        id: 'p1_s5',
        title: 'Receive & micrometer-inspect machined bearing bores',
        desc: 'Check 626ZZ bearing bores on received CNC parts using bore calipers. Ensure diameter is within 19.000–19.015 mm (H7 tolerance).',
        badge: 'QC Inspect',
      },
    ],
  },
  {
    id: 'phase-2',
    num: 2,
    title: '3D Printing & Silicone/Urethane Tire Vacuum & Pressure Casting',
    subtitle: 'Split mold prep, release agent, 1:1 mixing, degas, 16h cure, cleat core bonding',
    estTime: '18–24 hours (including cure cycles)',
    targetWeightImpact: '94 g (tires + bumpers + battery cradle)',
    tools: ['Vacuum degassing chamber (-29 inHg pump)', '45–50 PSI pressure casting pot', 'Gram scale (0.1 g precision)', 'Heat gun / curing oven (65°C)'],
    materials: [
      'Smooth-On PMC-780 Urethane (Part A & Part B)',
      'Mann Ease Release 200',
      'Titanium cleat skeleton inserts (waterjet Grade 5 Ti)',
      'Loctite 401 Prism / Sil-Poxy bonding primer',
      'Acetone & 80-grit aluminum oxide abrasive',
      'Bambu TPU 95A HF for internal shock cradles',
    ],
    specs: [
      { label: 'Tire Durometer', value: 'Shore 80A (high abrasion combat grip)' },
      { label: 'Degassing Pressure', value: '-29 inHg (-0.98 bar) for 5–7 min' },
      { label: 'Pot Curing Pressure', value: '45–50 PSI (3.1–3.4 bar) for 16h' },
      { label: 'TPU Infill Setting', value: '100% Solid concentric, 6 walls' },
    ],
    deepDive: {
      heading: 'Zero-Delamination Cleat Embedding & Vacuum Degassing',
      paragraphs: [
        'Meltybrain tires endure brutal 400g centripetal acceleration combined with extreme torsional shear during directional translation pulses. Standard 3D-printed slip-on tires will instantly delaminate or shed their rims at 3,500 RPM. We overcome this using a composite vacuum-cast tire where waterjet titanium traction cleats are mechanically keyed directly inside a Shore 80A polyurethane matrix.',
        'Prepare the titanium cleat inserts by sandblasting with 80-grit media (or hand-scuffing vigorously) to create deep mechanical keying. Wash twice in pure acetone to eliminate oils. Apply a micro-layer of Loctite 401 cyanoacrylate primer to the bonding tangs. Mount the cleat core into the split mold registration slots.',
        'Mix PMC-780 Parts A and B at exactly 1:1 by weight. Place the mixing cup into the vacuum chamber and pull down to 29 inHg. Watch the mixture rise 3× in volume as dissolved air expands, then pull until the foam collapses completely (approx. 5 minutes). Pour into the pre-warmed mold in a pencil-thin stream. Clamp the mold and immediately transfer into your pressure pot at 50 PSI for a 16-hour cure. This crushes any microscopic bubbles to invisible points, producing tear-proof tires.',
      ],
      callout: {
        type: 'warning',
        title: 'Safety Directive: Pressure Pot Rating Verification',
        body: 'Only use certified pressure vessels with functional safety relief valves and burst discs. Never exceed the rated PSI of your casting chamber. Wear safety goggles and hearing protection during pressurization and bleed-off.',
      },
    },
    steps: [
      {
        id: 'p2_s1',
        title: 'Print split tire molds in PETG or Tough Resin at 0.12 mm',
        desc: 'Print upper and lower tire mold halves with alignment dowels, sprue funnel, and dual air bleed risers. Ensure smooth wall finish.',
        badge: '3D Print',
      },
      {
        id: 'p2_s2',
        title: 'Print TPU 95A internal shock cradles at 100% solid infill',
        desc: 'Slice battery cradle and motor pod shock absorbers with 6 perimeters and 100% concentric infill. No hollow infill allowed.',
        badge: '3D Print',
      },
      {
        id: 'p2_s3',
        title: 'Abrade & chemically prime titanium cleat inserts',
        desc: 'Sandblast cleat tangs with 80-grit oxide, acetone degrease, and brush with Loctite 401 bonding primer for chemical adhesion.',
        badge: 'Surface Prep',
      },
      {
        id: 'p2_s4',
        title: 'Apply 2 light coats of Ease Release 200 to mold cavities',
        desc: 'Spray mold halves evenly, allow 5 minutes flash-off, buff with soft cloth, and apply second light mist to prevent sticking.',
        badge: 'Mold Prep',
      },
      {
        id: 'p2_s5',
        title: 'Degas PMC-780 urethane down to -29 inHg for 5 minutes',
        desc: 'Weigh 1:1 A/B ratio on 0.1 g scale. Vacuum degas until bubbling peaks and collapses completely to eliminate air voids.',
        badge: 'Vacuum Process',
      },
      {
        id: 'p2_s6',
        title: 'Pour thin stream into mold & cure at 50 PSI for 16 hours',
        desc: 'Slowly pour into sprue port. Seal mold in pressure pot at 45–50 PSI. Allow 16-hour room temperature cure before demolding.',
        badge: 'Pressure Cure',
      },
    ],
  },
  {
    id: 'phase-3',
    num: 3,
    title: 'Drivetrain Assembly & Dead Axle Fitment',
    subtitle: 'Pressing 626ZZ bearings into Ti cleat hubs, 6mm ground axles, Loctite 680, motor mounting',
    estTime: '3–4 hours',
    targetWeightImpact: '215 g (drivetrain + motors + axles)',
    tools: ['Bench arbor press or bench vise with brass jaws', '18.5 mm outer-race bearing press arbor', 'M3 2.5 mm hex driver with torque limiter', 'Freezer (-18°C) & heat gun (100°C)'],
    materials: [
      'PROPDRIVE v2 2836 1200KV brushless outrunners (pair)',
      '626ZZ ABEC-7 chrome steel bearings (4 required)',
      '6 mm precision ground W-1 drill rod dead axles (h6 tolerance)',
      'Loctite 680 cylindrical retaining compound',
      'Loctite 243 medium blue threadlocker',
      'Stainless steel 6 mm ID precision shims (0.1 mm & 0.2 mm)',
      'M3 Grade 12.9 socket head cap screws',
    ],
    specs: [
      { label: 'Bearing Dimensions', value: '6 mm ID × 19 mm OD × 6 mm Width (626ZZ)' },
      { label: 'Loctite 680 Shear Strength', value: '28 MPa (4,000 PSI) gap-filling to 0.15 mm' },
      { label: 'Motor Mount Bolt Torque', value: '1.8 N·m (Loctite 243 on Grade 12.9)' },
      { label: 'Pod Endplay Clearance', value: '0.50 mm – 0.80 mm maximum' },
    ],
    deepDive: {
      heading: 'Dead Axle Mechanics & Press Fit Protocol',
      paragraphs: [
        'Eyeliner uses dual hubmotors spinning on 6 mm precision ground dead axles. The dead axle carries all bending loads from weapon impacts, while the motor rotor drives the titanium cleat hub through an internal tooth spline. If a bearing is pressed incorrectly by pressing on the inner race or rubber seal, the raceways will brinell, creating severe drag and premature bearing blowout under 300g loads.',
        'Thermal differential fitting is required: place your 626ZZ bearings into the freezer (-18°C) for 1 hour. Warm the CNC 7075 cleat hubs to 80°C using a hot plate or heat gun. The bearing will drop in or require only finger pressure. If using an arbor press, strictly apply pressure to the 18.5 mm outer race sleeve. Never press the center.',
        'Degrease the 6 mm ground dead axle with rapid-drying brake cleaner. Apply a uniform film of Loctite 680 retaining compound to the chassis clamp joint. Slide the axle through the bearings with precision shims installed to achieve exactly 0.5–0.8 mm endplay. Allow the anaerobic compound to cure undisturbed for 24 hours.',
      ],
      callout: {
        type: 'warning',
        title: 'Assembly Rule: Outer Race Only',
        body: 'Pressing against the inner bearing ring while installing into a housing transfers 100% of the press force across the steel balls, permanently indenting the raceway. Always use a dedicated stepped socket or pressing arbor that contacts only the outer race perimeter.',
      },
    },
    steps: [
      {
        id: 'p3_s1',
        title: 'Freeze 626ZZ bearings & heat CNC hubs to 80°C',
        desc: 'Chill bearings at -18°C for 60 min. Heat wheel hubs with heat gun to 80°C to achieve effortless thermal clearance.',
        badge: 'Thermal Prep',
      },
      {
        id: 'p3_s2',
        title: 'Press dual 626ZZ bearings using 18.5 mm outer-race socket',
        desc: 'Seat bearings square into the hub bore. Apply pressure strictly to outer race until fully seated against internal shoulder.',
        badge: 'Press Fit',
      },
      {
        id: 'p3_s3',
        title: 'Micrometer check 6 mm dead axles & degrease with solvent',
        desc: 'Verify axle diameter is 5.992–6.000 mm. Clean axle and chassis clamp bore thoroughly with acetone or brake cleaner.',
        badge: 'Clean & Spec',
      },
      {
        id: 'p3_s4',
        title: 'Apply Loctite 680 retaining compound to chassis axle lock',
        desc: 'Apply 360° film of Loctite 680 to axle mating bore. Insert axle with twist motion to distribute compound evenly.',
        badge: 'Chemical Lock',
      },
      {
        id: 'p3_s5',
        title: 'Shim wheel pod endplay to 0.5–0.8 mm clearance',
        desc: 'Stack 6 mm stainless shims between bearing inner race and motor bell. Test spin by hand; ensure zero binding and <0.8 mm axial play.',
        badge: 'Shimming',
      },
      {
        id: 'p3_s6',
        title: 'Mount PROPDRIVE 2836 motors with Loctite 243 at 1.8 N·m',
        desc: 'Fasten motor stators using M3 Grade 12.9 socket head screws with Loctite 243 blue threadlocker. Torque each screw to 1.8 N·m.',
        badge: 'Fastener Torque',
      },
    ],
  },
  {
    id: 'phase-4',
    num: 4,
    title: 'Central Electronics, Power Harness & Sensor Soldering',
    subtitle: 'Teensy 4.0 pinouts, SPI bus wiring for dual H3LIS331DL ±400g sensors, DShot600, XT60 safety link',
    estTime: '4–6 hours',
    targetWeightImpact: '168 g (electronics + wiring harness + packs)',
    tools: ['Temperature-controlled soldering station (350°C–380°C)', '60/40 Rosin Core or SAC305 Lead-Free solder', 'Heat shrink tubing & heat gun', 'Digital multimeter with continuity & diode check'],
    materials: [
      'PJRC Teensy 4.0 (Cortex-M7 @ 600 MHz, no header pins)',
      'Dual ST H3LIS331DLTR ±400g SPI Accelerometers (Adafruit 4627 or bare custom PCB)',
      'AM32 55A 4-in-1 Brushless ESC (Bidirectional DShot600)',
      'ExpressLRS 2.4 GHz Receiver (CRSF serial protocol)',
      'High-flux Green Optical Heading Strobe LED + MOSFET driver',
      '14 AWG & 20 AWG ultra-flexible silicone wire',
      'Amass XT60PW / XT60 removable safety power link',
      '1000 µF 35V Low-ESR Rubycon/Panasonic electrolytic capacitor bank',
    ],
    specs: [
      { label: 'SPI Bus Frequency', value: '10 MHz SPI Mode 3 (CPOL=1, CPHA=1)' },
      { label: 'DShot Protocol', value: 'DShot600 Bidirectional @ 8 kHz update rate' },
      { label: 'CRSF Telemetry Baud', value: '420,000 baud serial on Teensy Serial1 (Pin 0/1)' },
      { label: 'Power Harness Capacity', value: '60 A continuous, 120 A burst (14 AWG silicone)' },
    ],
    deepDive: {
      heading: 'High-Frequency SPI Signal Integrity & Power Rail Decoupling',
      paragraphs: [
        'A meltybrain robot rotates at up to 4,000 RPM (66.7 revolutions per second). Centripetal acceleration at a 25 mm radius reaches approximately 447g. To calculate rotational velocity with microsecond precision, we read two ST H3LIS331DL ±400g accelerometers placed diametrically opposed or at precision dual radii ($r_1 = 25.0\\text{ mm}$, $r_2 = 35.0\\text{ mm}$) over high-speed hardware SPI.',
        'Brushless motor switching generates massive EMI noise that can corrupt SPI transactions if wiring is sloppy. Keep the SPI bus leads (SCK on Pin 13, MOSI on Pin 11, MISO on Pin 12, CS1 on Pin 10, CS2 on Pin 9) under 50 mm in length. Twist the SCK and GND lines together, and solder a 0.1 µF ceramic bypass capacitor directly between VDD and GND pins on each accelerometer breakout.',
        'Wire the AM32 55A ESC with dedicated twisted signal/GND pairs for Motor Left (Pin 2) and Motor Right (Pin 3). Solder the 1000 µF 35V low-ESR capacitor bank directly across the main ESC battery pads with leads cut shorter than 10 mm. This capacitor absorbs inductive voltage spikes that would otherwise blow the MOSFET gates during rapid melty regenerative braking.',
      ],
      callout: {
        type: 'danger',
        title: 'Safety Link Mandate: Series Positive Mains',
        body: 'The XT60 removable link must be wired in series with the positive battery rail before any BEC or ESC distribution. Pulling the link must mechanically sever all battery power instantly. Never wire accessories or supervisor boards in bypass around the safety link.',
      },
    },
    steps: [
      {
        id: 'p4_s1',
        title: 'Direct-solder Teensy 4.0 pads with silicone wire leads',
        desc: 'Tin Teensy 4.0 castellated edge pads. Direct-solder 28 AWG high-flex silicone wire. Do not use tall pin headers to save vertical height.',
        badge: 'MCU Solder',
      },
      {
        id: 'p4_s2',
        title: 'Wire SPI bus for Dual H3LIS331DL accelerometers (Pins 9–13)',
        desc: 'Connect SCK (Pin 13), MOSI (Pin 11), MISO (Pin 12), CS1 (Pin 10), and CS2 (Pin 9). Keep wire lengths <50 mm and twist clock with GND.',
        badge: 'SPI Bus',
      },
      {
        id: 'p4_s3',
        title: 'Solder 0.1 µF bypass capacitors adjacent to sensor VDD/GND',
        desc: 'Position 100 nF ceramic capacitors directly across accelerometer power pads to filter high-frequency brushless switching ripple.',
        badge: 'Filtering',
      },
      {
        id: 'p4_s4',
        title: 'Solder 1000 µF 35V Low-ESR capacitor across ESC battery pads',
        desc: 'Cut capacitor leads to under 8 mm. Solder directly to AM32 main battery pads with heat shrink insulating the exposed metal cans.',
        badge: 'ESC Decouple',
      },
      {
        id: 'p4_s5',
        title: 'Wire DShot600 signals (Pins 2 & 3) with dedicated grounds',
        desc: 'Connect Left ESC signal to Teensy Pin 2, Right ESC signal to Pin 3. Run individual ground return wires for each ESC channel.',
        badge: 'DShot Leads',
      },
      {
        id: 'p4_s6',
        title: 'Construct XT60 removable safety link harness (14 AWG)',
        desc: 'Solder XT60 inline with the positive battery rail. Attach bright neon red pull loop accessible through top chassis slot under 60 s.',
        badge: 'Safety Link',
      },
      {
        id: 'p4_s7',
        title: 'Multimeter continuity & isolation check before power application',
        desc: 'Verify zero continuity between Vin and GND. Verify diode forward voltage on 5V rail. Confirm zero short to chassis metal.',
        badge: 'QC Continuity',
      },
    ],
  },
  {
    id: 'phase-5',
    num: 5,
    title: 'Chassis Sandwich Clamping & Threaded Insert Installation',
    subtitle: 'Soldering iron heat-set insert installation at 230°C, neoprene battery damping, plate sandwich torque sequence',
    estTime: '2–3 hours',
    targetWeightImpact: '380 g (chassis plates + fasteners + armor)',
    tools: ['Soldering iron with specialized brass conical insert tip', 'Calibrated torque wrench (0.5–5.0 N·m)', 'M3 & M4 hex bits', 'Threadlocker primer'],
    materials: [
      'Top 2.0 mm 6061-T6 aluminum plate',
      'Bottom 3.0 mm 6061-T6 aluminum plate',
      'M3 × 5.7 mm brass heat-set threaded inserts (Ruthex / McMaster)',
      '3.0 mm closed-cell neoprene damping foam (Poron XRD)',
      'M3 Grade 12.9 alloy steel socket head cap screws',
      'M3 Belleville conical spring washers',
      'Loctite 243 medium blue threadlocker',
    ],
    specs: [
      { label: 'Insert Iron Temp', value: '230°C (optimized for TPU 95A / PETG)' },
      { label: 'Insert Sink Depth', value: '0.20 mm sub-flush from plastic surface' },
      { label: 'Stage 1 Snug Torque', value: '0.8 N·m in star crisscross pattern' },
      { label: 'Final Plate Bolt Torque', value: '2.0 N·m (M3 Grade 12.9 with Belleville washers)' },
    ],
    deepDive: {
      heading: 'Heat-Set Insert Physics & Fastener Retention',
      paragraphs: [
        'A meltybrain chassis experiences continuous centripetal expansion forces combined with shock vibrations exceeding 100g during tooth impacts. Threaded inserts installed crooked or overheated will pull right out of plastic bulkheads under combat stress.',
        'Use a dedicated conical heat-set insert tip on your soldering iron set to 230°C. Never use a standard chisel or screwdriver tip, as it will push plastic down into the internal M3 threads. Position the insert vertically over the printed pilot hole. Press gently downward in a single smooth motion until the insert sinks 0.2 mm below flush. Immediately withdraw the iron and hold light pressure with a flat brass block for 5 seconds while the plastic recrystallizes around the outer diagonal knurling.',
        'Apply 3 mm closed-cell neoprene foam (or Poron XRD) inside the battery cradle pocket. LiPo batteries expand slightly under discharge and will suffer puncture damage if allowed to chatter against aluminum plates during high-G spin. Assemble the top and bottom plates around the TPU bumper using M3 Grade 12.9 fasteners and Belleville conical spring washers. Tighten in a 3-stage star pattern (0.8 N·m -> 1.4 N·m -> 2.0 N·m).',
      ],
      callout: {
        type: 'tip',
        title: 'Pro Tip: Belleville Spring Washers',
        body: 'Aluminum chassis plates and TPU bumpers have different thermal expansion coefficients. Installing Belleville conical washers maintains constant preload on the M3 bolts even as the TPU compresses over hours of combat vibration.',
      },
    },
    steps: [
      {
        id: 'p5_s1',
        title: 'Install brass M3 heat-set inserts at 230°C with conical tip',
        desc: 'Set iron to 230°C. Press inserts straight into TPU/PETG bulkheads until 0.2 mm sub-flush. Allow 60 seconds to cool fully.',
        badge: 'Inserts',
      },
      {
        id: 'p5_s2',
        title: 'Inspect insert threads with M3 tap or screw test',
        desc: 'Thread an M3 bolt by hand into every insert to ensure zero melted plastic has contaminated the internal threads.',
        badge: 'QC Threads',
      },
      {
        id: 'p5_s3',
        title: 'Adhere 3 mm closed-cell neoprene foam in battery cradle',
        desc: 'Cut neoprene strips to line the floor and side walls of the TPU battery pocket. Test-fit 4S LiPo packs for snug compression fit.',
        badge: 'Shock Damping',
      },
      {
        id: 'p5_s4',
        title: 'Stage chassis sandwich with TPU bumper and motor pods',
        desc: 'Align bottom 3.0 mm 6061 plate, TPU structural bumper, central electronics tray, and top 2.0 mm 6061 armor plate.',
        badge: 'Alignment',
      },
      {
        id: 'p5_s5',
        title: 'Tighten perimeter bolts in 3-stage star pattern to 2.0 N·m',
        desc: 'Apply Loctite 243. Follow crisscross star pattern: Stage 1 at 0.8 N·m, Stage 2 at 1.4 N·m, and final torque at 2.0 N·m.',
        badge: 'Torque Spec',
      },
      {
        id: 'p5_s6',
        title: 'Verify chassis rigidity & dial indicator plate flatness',
        desc: 'Mount chassis on flat granite surface plate. Check that plate gap is uniform and total runout is under 0.15 mm across span.',
        badge: 'QC Tolerance',
      },
    ],
  },
  {
    id: 'phase-6',
    num: 6,
    title: 'Firmware Flashing & Radio Configuration',
    subtitle: 'Teensy Loader .ino flash, EdgeTX model setup on RadioMaster Pocket, 500Hz CRSF packet rate, switch assign',
    estTime: '2–3 hours',
    targetWeightImpact: '0 g (software configuration)',
    tools: ['PC / Mac with Arduino IDE & Teensyduino', 'RadioMaster Pocket EdgeTX transmitter', 'Micro-USB data cable (shielded)'],
    materials: [
      'eyeliner_meltybrain.ino production flight code',
      'EdgeTX 2.9+ firmware on RadioMaster Pocket',
      'ExpressLRS 3.3+ receiver firmware',
    ],
    specs: [
      { label: 'MCU Clock', value: '600 MHz Cortex-M7 (Fastest with LTO)' },
      { label: 'CRSF Packet Rate', value: '500 Hz (2.0 ms latency)' },
      { label: 'Switch SA (2-pos)', value: 'Disarmed / Armed (Emergency Cut)' },
      { label: 'Switch SB (3-pos)', value: 'Mode: Spin / Melty Translate / Overdrive' },
    ],
    deepDive: {
      heading: 'CRSF Protocol Setup & 500 Hz Packet Rate Binding',
      paragraphs: [
        'Meltybrain translational drift control requires real-time heading phase modulation at up to 66 Hz. Standard 50 Hz PWM or 100 Hz SBUS radio links introduce up to 20 ms of jitter—equal to an entire robot rotation at combat speeds! We mandate ExpressLRS over the Crossfire (CRSF) protocol operating at a 500 Hz packet rate.',
        'Configure the RadioMaster Pocket in EdgeTX: create model "EYELINER-3LB". Set Internal RF module to CRSF, Packet Rate to 500 Hz, and Switch Mode to "Wide" (12 channels). Assign Channel 1 to Throttle (Spin Rate), Channel 2 to Aileron (Translation X), Channel 3 to Elevator (Translation Y), and Channel 4 to Rudder (Heading Trim).',
        'Assign 2-position switch SA as the Master Arm switch. When SA is DOWN, throttle output is forced to -100% (disarmed). Assign 3-position switch SB for Flight Modes: Position 1 = Spin Only (learning mode), Position 2 = Meltybrain Translational Navigation, Position 3 = High-Rate Overdrive (3,500 RPM full combat). Assign momentary switch SH to trigger optical strobe zero-point calibration.',
      ],
      callout: {
        type: 'danger',
        title: 'Failsafe Imperative: CRSF No Pulses',
        body: 'In EdgeTX Model Setup, scroll to Failsafe and select "Custom" or "No Pulses". Verify that turning off the transmitter causes the ELRS receiver to immediately stop emitting serial packets. The Teensy firmware detects packet loss within 20 ms and triggers immediate regenerative motor braking.',
      },
    },
    steps: [
      {
        id: 'p6_s1',
        title: 'Compile & flash eyeliner_meltybrain.ino via Teensy Loader',
        desc: 'Open Arduino IDE, select Teensy 4.0, 600 MHz, Optimize: Fastest. Compile and flash firmware over shielded micro-USB cable.',
        badge: 'Teensy Flash',
      },
      {
        id: 'p6_s2',
        title: 'Verify USB Serial diagnostics at 115200 baud',
        desc: 'Open Serial Monitor. Confirm [SYSTEM] Dual H3LIS331DL detected: S1 OK, S2 OK and zero-G calibration offset <0.25g.',
        badge: 'Telemetry Check',
      },
      {
        id: 'p6_s3',
        title: 'Configure EdgeTX model on RadioMaster Pocket at 500 Hz CRSF',
        desc: 'Create EYELINER-3LB profile, select internal ELRS module, 500 Hz packet rate, and calibrate left/right gimbal travel to 1000–2000 µs.',
        badge: 'EdgeTX Setup',
      },
      {
        id: 'p6_s4',
        title: 'Map channels Ch1–Ch4 & configure switches SA, SB, SH',
        desc: 'Map Throttle (Ch1), X translation (Ch2), Y translation (Ch3). Set SA to Arm/Disarm, SB to Mode, and SH to Strobe zero reset.',
        badge: 'Channel Map',
      },
      {
        id: 'p6_s5',
        title: 'Set ELRS Failsafe to "No Pulses" & verify bench motor cutoff',
        desc: 'Program receiver failsafe. Spin motors at 5% on bench (no teeth); turn off RadioMaster Pocket; confirm motors stop in <0.2 s.',
        badge: 'Failsafe Test',
      },
    ],
  },
  {
    id: 'phase-7',
    num: 7,
    title: 'Dynamic Balancing & Pit Spin Testing',
    subtitle: 'Static knife-edge balance jig, adding tungsten/lead trim weights, low-RPM optical phase calibration, safe pit box spin-up to 3,500 RPM',
    estTime: '3–5 hours',
    targetWeightImpact: 'Trim weights: 6–18 g (tungsten putty / brass washers)',
    tools: ['Dual knife-edge precision balance jig (hardened ground steel blades)', 'Blast-rated 3/8" (9.5 mm) Lexan polycarbonate pit test box', 'Optical laser tachometer', 'Digital vibration logging telemetry'],
    materials: [
      'High-density tungsten adhesive putty (density 18.0 g/cm³)',
      'Brass M3 precision balance trim washers (0.5 g & 1.0 g)',
      'High-adhesion kapton tape / epoxy encapsulation',
    ],
    specs: [
      { label: 'Static Balance Target', value: 'Neutral equilibrium across 8 compass angles' },
      { label: 'Low-RPM Strobe Cal', value: '600–800 RPM in test box' },
      { label: 'Combat Spin Speed', value: '3,500 RPM (up to 4,000 RPM peak)' },
      { label: 'Vibration Metric', value: '<0.15g RMS residual eccentricity acceleration' },
    ],
    deepDive: {
      heading: 'Static Knife-Edge Balancing & Optical Strobe Phase Alignment',
      paragraphs: [
        'A meltybrain robot is a flywheel rotating on its own vertical axis. If the Center of Mass (CoM) is displaced from the rotational geometric axis by even 0.5 mm, the centrifugal force at 3,500 RPM will exceed 150 N, causing violent hopping, severe tracking loss, and cracked chassis plates. Static balancing must be dialed in prior to any high-RPM spin testing.',
        'Place the robot onto a dual knife-edge balance jig using a 6 mm hardened ground arbor through the central bearing axis. Release gently. The heavy side will rotate downward. Add tungsten putty or brass trim washers to the perimeter balance pockets on the light side until the robot remains completely motionless at any angle (12, 3, 6, and 9 o\'clock).',
        'Place the balanced robot inside a certified blast-rated pit box (minimum 3/8" Lexan walls). Spin up to 600–800 RPM. Look through the Lexan shield at the green optical heading strobe LED. Push the RadioMaster translation stick forward. If the virtual heading beacon illuminates 30° clockwise of true forward, adjust MELTY_PHASE_OFFSET_DEG in firmware until the strobe aligns true forward with the joystick vector. Once aligned, perform step-up spin tests to 3,500 RPM while monitoring telemetry.',
      ],
      callout: {
        type: 'danger',
        title: 'Safety Warning: Plane of Spin Hazard',
        body: 'Never spin a meltybrain robot in an open room or pit table! At 3,500 RPM, stored kinetic energy exceeds 1,200 Joules. A thrown tooth or fractured wheel hub will pierce drywall and shatter standard acrylic. All spin tests above 500 RPM must be performed inside a sealed 3/8" polycarbonate enclosure with zero personnel in the horizontal spin plane.',
      },
    },
    steps: [
      {
        id: 'p7_s1',
        title: 'Mount robot on dual knife-edge ground steel balance arbor',
        desc: 'Rest central dead axle arbor on level knife edges. Allow assembly to settle freely; mark heavy point with paint pen.',
        badge: 'Static Jig',
      },
      {
        id: 'p7_s2',
        title: 'Apply tungsten putty / brass washers until neutral in 8 angles',
        desc: 'Add trim weight to perimeter pockets until robot remains static in all orientations. Encapsulate putty with drop of epoxy.',
        badge: 'Trim Mass',
      },
      {
        id: 'p7_s3',
        title: 'Place in 3/8" Lexan pit box & connect external kill switch',
        desc: 'Secure robot inside certified blast enclosure. Verify dual safety latches and connect tethered remote power cutoff.',
        badge: 'Pit Box Safety',
      },
      {
        id: 'p7_s4',
        title: 'Calibrate optical strobe heading phase at 600–800 RPM',
        desc: 'Spin at 700 RPM, command forward stick, observe green LED strobe alignment, and adjust MELTY_PHASE_OFFSET_DEG in code.',
        badge: 'Strobe Sync',
      },
      {
        id: 'p7_s5',
        title: 'Execute stepped spin-up: 1000 -> 2000 -> 3000 -> 3500 RPM',
        desc: 'Ramp RPM in steps, holding 15 seconds each. Verify smooth acoustics, zero mechanical hop, and <0.15g RMS accelerometer noise.',
        badge: 'RPM Ramp',
      },
      {
        id: 'p7_s6',
        title: 'Verify motor and ESC temperatures remain under 60°C',
        desc: 'After 2-minute 3,000 RPM run, disarm, pull link, and measure temperatures with infrared thermometer. Must be <60°C.',
        badge: 'Thermal QC',
      },
    ],
  },
  {
    id: 'phase-8',
    num: 8,
    title: 'NHRL Safety & Pre-Match Inspection Checklist',
    subtitle: '60-second power link removal test, weapon safety lock pin, fail-safe radio cutoff verification',
    estTime: '1 hour (pre-event & pit prep)',
    targetWeightImpact: 'Final legal combat limit: ≤1,360.8 g (3.00 lb)',
    tools: ['Calibrated digital legal-for-trade scale (0.1 g resolution)', 'Hardened steel weapon locking pin with neon streamer', 'Pit stopwatch / timer', 'Fireproof LiPo charging bunker / Bat-Safe'],
    materials: [
      'Official competition legal compliance sticker',
      'Spare 4S 550 mAh LiPo flight packs (4 sets charged to storage 3.85V/cell)',
      'Spare titanium cleats & M3 Grade 12.9 hardware',
    ],
    specs: [
      { label: 'Weight Limit', value: '1,360.8 g (3.000 lb) strict cap · Target: 1,310 g' },
      { label: 'Safety Link Pull Time', value: '<60 seconds with gloved hand (NHRL Rule §3.2)' },
      { label: 'Radio Failsafe Stop', value: '<1.0 second from transmitter shutoff' },
      { label: 'Weapon Lock', value: 'Hardened steel pin through rotor tooth recess' },
    ],
    deepDive: {
      heading: 'Passing NHRL Technical Inspection on First Attempt',
      paragraphs: [
        'Before entering the arena at NHRL (National Havoc Robot League) or any SPARC-sanctioned combat event, your robot must pass rigorous technical safety inspection. The three most common failure points for rotating weapons and meltybrains are: (1) exceeding the 3.00 lb weight cap, (2) failing the 60-second removable link test, and (3) radio failsafe lag exceeding 1.0 second.',
        'Practice the Removable Power Link extraction with heavy combat safety gloves. The safety link must have a bright neon red pull loop and be positioned so pit marshals can extract it in under 60 seconds without placing fingers inside the weapon spin plane or having to flip an unstable robot.',
        'Always install the mechanical weapon safety lock pin before carrying the robot through the pits. The pin must mechanically jam the rotor against the central frame, preventing rotation even if the motors were accidentally commanded. Keep your "REMOVE BEFORE FLIGHT" safety banner visible at all times until the arena door is locked.',
      ],
      callout: {
        type: 'danger',
        title: 'LiPo Pit Safety Rules',
        body: 'All LiPo batteries must be charged inside a sealed, fireproof LiPo bunker (Bat-Safe or steel ammo can with flame arrestor) at 1C charge rate. Never charge unattended or above 4.20V per cell. Any pack with puffy casing or cellular imbalance >0.05V must be safely discharged in a saltwater bucket.',
      },
    },
    steps: [
      {
        id: 'p8_s1',
        title: 'Weigh robot in full combat trim on calibrated scale',
        desc: 'Place full robot with batteries, safety link, and weapon teeth on calibrated scale. Must register ≤1360.8 g (target 1310 g).',
        badge: 'Weigh-In',
      },
      {
        id: 'p8_s2',
        title: 'Conduct 60-second removable link extraction drill',
        desc: 'Have a teammate time you pulling the XT60 safety link with gloved hands without inverting the robot. Must complete in <60 s.',
        badge: 'NHRL §3.2',
      },
      {
        id: 'p8_s3',
        title: 'Install mechanical weapon lock pin with high-vis streamer',
        desc: 'Insert steel locking pin through the chassis rotor into the tooth recess. Verify zero spin is possible. Pin remains until arena load.',
        badge: 'Weapon Lock',
      },
      {
        id: 'p8_s4',
        title: 'Film official 1.0-second failsafe motor cutoff test',
        desc: 'Spin motors in test box; switch off transmitter power; record video showing complete motor stop within 1.0 second.',
        badge: 'Failsafe Proof',
      },
      {
        id: 'p8_s5',
        title: 'Verify LiPo battery storage voltage (3.85V/cell)',
        desc: 'Check all 4S battery sets with digital cell checker. Confirm internal resistance <15 mΩ/cell and voltages balanced.',
        badge: 'Battery QC',
      },
    ],
  },
];

export function BuildGuide() {
  // Persistence state
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('eyeliner_build_completed_steps');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activePhaseId, setActivePhaseId] = useState<string>('phase-1');
  const [activeSchematic, setActiveSchematic] = useState<'mcu' | 'axle' | 'chassis' | 'power'>('mcu');
  const [workshopMode, setWorkshopMode] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eyeliner_build_completed_steps', JSON.stringify(completedSteps));
    } catch (e) {
      console.warn('Could not save step progress to localStorage', e);
    }
  }, [completedSteps]);

  // Workshop mode body class
  useEffect(() => {
    if (workshopMode) {
      document.body.classList.add('workshop-print-mode');
    } else {
      document.body.classList.remove('workshop-print-mode');
    }
    return () => {
      document.body.classList.remove('workshop-print-mode');
    };
  }, [workshopMode]);

  // Total steps calculations
  const allStepIds = useMemo(() => {
    return PHASES_DATA.flatMap((p) => p.steps.map((s) => s.id));
  }, []);

  const totalSteps = allStepIds.length;
  const completedCount = useMemo(() => {
    return allStepIds.filter((id) => !!completedSteps[id]).length;
  }, [allStepIds, completedSteps]);

  const progressPct = useMemo(() => {
    return Math.round((completedCount / totalSteps) * 100);
  }, [completedCount, totalSteps]);

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      return next;
    });
  };

  const markPhaseComplete = (phase: BuildPhase) => {
    setCompletedSteps((prev) => {
      const next = { ...prev };
      phase.steps.forEach((s) => {
        next[s.id] = true;
      });
      return next;
    });
  };

  const resetAllSteps = () => {
    if (window.confirm('Reset all checklist progress across all 8 phases?')) {
      setCompletedSteps({});
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="build-guide-page">
      {/* Printable Sheet Header (visible in print & workshop mode) */}
      <div className="workshop-sheet-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', letterSpacing: '-0.02em' }}>
              EYELINER 3LB MELTYBRAIN // WORKSHOP & TECHNICAL INSPECTION MANUAL
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>
              SPARC / NHRL 3.0 lb Combat Class · Official Field Checklist & Assembly Manual
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'monospace' }}>
            <div>BUILD ID: EYELINER-REV3.2</div>
            <div>STATUS: {progressPct}% COMPLETE ({completedCount}/{totalSteps} STEPS)</div>
            <div>TARGET DRY MASS: 1,310 g / CAP 1,360.8 g</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12, borderTop: '1px solid #ddd', paddingTop: 8, fontSize: '12px' }}>
          <div><strong>Lead Builder:</strong> _____________________</div>
          <div><strong>Date:</strong> _____________________</div>
          <div><strong>Scale Weigh-In:</strong> _______ g</div>
          <div><strong>Inspector Sign:</strong> _____________________</div>
        </div>
      </div>

      {/* Hero Station Banner */}
      <div className="bg-header-card glass-panel-elevated hud-corner">
        <div className="bg-header-top">
          <div className="bg-title-group">
            <span className="cyber-badge cyber-badge-cyan">COMBAT SPEC // LEVEL 0 TO ARENA</span>
            <h1>
              <span>EYELINER 3LB</span>
              <span className="bg-title-gradient">STEP-BY-STEP BUILD GUIDE</span>
            </h1>
            <p className="bg-lede">
              The definitive, authentic engineering and assembly manual for the <strong>Eyeliner 3 lb Meltybrain</strong> combat robot.
              Covers all 8 rigorous phases from raw SendCutSend sheet and PCBWay CNC machining to vacuum silicone tire casting,
              precision dead axle fitment, 500 Hz CRSF telemetry, and NHRL pre-match safety inspection.
            </p>
          </div>

          <div className="bg-action-bar">
            <button
              className={`bg-action-btn ${workshopMode ? 'active' : ''}`}
              onClick={() => setWorkshopMode((v) => !v)}
              title="Toggle high-contrast printable workshop mode"
            >
              <span>📋</span>
              <span>{workshopMode ? 'Exit Workshop Mode' : 'Workshop Checklist View'}</span>
            </button>
            <button className="bg-action-btn" onClick={handlePrint} title="Print official checklist sheet">
              <span>🖨️</span>
              <span>Print Checklist</span>
            </button>
            <button className="bg-action-btn" onClick={resetAllSteps} title="Clear saved step progress">
              <span>🔄</span>
              <span>Reset Progress</span>
            </button>
          </div>
        </div>

        {/* Progress Station */}
        <div className="bg-progress-station">
          <div className="bg-progress-meta">
            <div>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>OVERALL BUILD READINESS: </span>
              <span style={{ fontWeight: 800, fontSize: '15px' }}>{progressPct}% COMPLETED</span>
            </div>
            <div style={{ color: 'var(--cyber-text-dim)' }}>
              {completedCount} of {totalSteps} Verified Steps Done
            </div>
          </div>

          <div className="bg-progress-bar-track">
            <div className="bg-progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="bg-stats-row">
            <div className="bg-stat-box">
              <span className="label">Total Phases</span>
              <span className="val">8 PHASES</span>
            </div>
            <div className="bg-stat-box">
              <span className="label">Weight Budget</span>
              <span className="val">≤ 1,360.8 g</span>
            </div>
            <div className="bg-stat-box">
              <span className="label">Combat RPM</span>
              <span className="val">3,500 RPM</span>
            </div>
            <div className="bg-stat-box">
              <span className="label">Control Loop</span>
              <span className="val">8 kHz DShot</span>
            </div>
            <div className="bg-stat-box">
              <span className="label">Safety Link</span>
              <span className="val">&lt; 60 s Pull</span>
            </div>
          </div>
        </div>
      </div>

      {/* High-Visibility Tactical Safety Callout Banner */}
      <div className="bg-safety-banner">
        <div className="bg-safety-icon" aria-hidden="true">⚠️</div>
        <div className="bg-safety-content">
          <h3>MANDATORY COMBAT ROBOTICS SAFETY DIRECTIVES</h3>
          <p>
            A 3 lb meltybrain spinning at 3,500 RPM stores over <strong>1,200 Joules</strong> of kinetic energy—equivalent to a high-velocity projectile.
            Observe standard safety protocols without exception:
          </p>
          <div className="bg-safety-tags">
            <span className="bg-safety-tag">🛡️ EYE & EAR PROTECTION AT ALL TIMES</span>
            <span className="bg-safety-tag">🔋 LIPO CHARGE IN FIREPROOF BUNKER</span>
            <span className="bg-safety-tag">🔒 HARDENED WEAPON LOCK PIN INSTALLED IN PITS</span>
            <span className="bg-safety-tag">🚫 NO PERSONNEL IN HORIZONTAL SPIN PLANE</span>
            <span className="bg-safety-tag">📦 3/8" LEXAN ENCLOSURE FOR HIGH-RPM RUNS</span>
          </div>
        </div>
      </div>

      {/* Phase Jump Navigation Ribbon */}
      <div className="bg-phase-nav">
        {PHASES_DATA.map((p) => {
          const phaseDone = p.steps.every((s) => completedSteps[s.id]);
          const phaseCount = p.steps.filter((s) => completedSteps[s.id]).length;
          return (
            <button
              key={p.id}
              className={`bg-phase-pill ${activePhaseId === p.id ? 'active' : ''} ${phaseDone ? 'complete' : ''}`}
              onClick={() => {
                setActivePhaseId(p.id);
                const el = document.getElementById(p.id);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span>Phase {p.num}</span>
              <span className="badge">
                {phaseCount}/{p.steps.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Interactive Schematics & Pinout Viewer */}
      <div className="bg-schematics-card glass-panel hud-corner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="cyber-badge cyber-badge-cyan">TACTICAL SCHEMATICS</span>
            <h2 style={{ fontSize: '22px', margin: '4px 0 0' }}>Technical Architecture & Pinout Diagrams</h2>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--cyber-text-muted)' }}>
            Click tabs below to inspect core system layouts and electrical pinouts.
          </p>
        </div>

        <div className="bg-schematic-tabs">
          <button
            className={`bg-schematic-tab ${activeSchematic === 'mcu' ? 'active' : ''}`}
            onClick={() => setActiveSchematic('mcu')}
          >
            1. Teensy 4.0 Pinout & MCU Wiring
          </button>
          <button
            className={`bg-schematic-tab ${activeSchematic === 'axle' ? 'active' : ''}`}
            onClick={() => setActiveSchematic('axle')}
          >
            2. Dead Axle & 626ZZ Hub Bearing Fit
          </button>
          <button
            className={`bg-schematic-tab ${activeSchematic === 'chassis' ? 'active' : ''}`}
            onClick={() => setActiveSchematic('chassis')}
          >
            3. Chassis Sandwich & Torque Sequence
          </button>
          <button
            className={`bg-schematic-tab ${activeSchematic === 'power' ? 'active' : ''}`}
            onClick={() => setActiveSchematic('power')}
          >
            4. Power Harness & XT60 Safety Link
          </button>
        </div>

        <div className="bg-svg-container">
          {activeSchematic === 'mcu' && (
            <svg viewBox="0 0 860 360" width="100%" height="auto" style={{ maxWidth: 860 }}>
              <defs>
                <linearGradient id="mcuGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0d1b2a" />
                  <stop offset="100%" stopColor="#1b263b" />
                </linearGradient>
                <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Teensy 4.0 Main PCB Board */}
              <rect x="260" y="40" width="340" height="280" rx="14" fill="url(#mcuGrad)" stroke="#00f0ff" strokeWidth="2" />
              <text x="430" y="75" fill="#00f0ff" fontSize="16" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                TEENSY 4.0 (CORTEX-M7 @ 600 MHz)
              </text>
              <text x="430" y="95" fill="#94a3b8" fontSize="11" fontFamily="var(--cyber-mono)" textAnchor="middle">
                CENTRAL MELTYBRAIN FLIGHT COMPUTER
              </text>

              {/* Micro-USB Port */}
              <rect x="395" y="25" width="70" height="18" rx="3" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
              <text x="430" y="38" fill="#94a3b8" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">USB PROGRAM</text>

              {/* Left Side Pins (Digital & DShot & Serial) */}
              {/* Pin 0 & 1 - CRSF UART */}
              <rect x="270" y="115" width="80" height="24" rx="4" fill="#1e293b" stroke="#00ff88" strokeWidth="1.5" />
              <text x="310" y="131" fill="#00ff88" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P0/P1: CRSF</text>
              <line x1="270" y1="127" x2="160" y2="127" stroke="#00ff88" strokeWidth="2" strokeDasharray="3 3" />
              <rect x="40" y="110" width="120" height="34" rx="6" fill="#0f172a" stroke="#00ff88" strokeWidth="1.5" />
              <text x="100" y="127" fill="#00ff88" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">ELRS RX</text>
              <text x="100" y="138" fill="#94a3b8" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">500Hz CRSF (420k)</text>

              {/* Pin 2 & 3 - DShot ESC */}
              <rect x="270" y="150" width="80" height="24" rx="4" fill="#1e293b" stroke="#ffaa00" strokeWidth="1.5" />
              <text x="310" y="166" fill="#ffaa00" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P2/P3: DShot</text>
              <line x1="270" y1="162" x2="160" y2="162" stroke="#ffaa00" strokeWidth="2" />
              <rect x="40" y="148" width="120" height="38" rx="6" fill="#0f172a" stroke="#ffaa00" strokeWidth="1.5" />
              <text x="100" y="165" fill="#ffaa00" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">AM32 55A ESC</text>
              <text x="100" y="178" fill="#94a3b8" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">DShot600 (8 kHz)</text>

              {/* Pin 6 - Optical Strobe */}
              <rect x="270" y="185" width="80" height="24" rx="4" fill="#1e293b" stroke="#00ff88" strokeWidth="1.5" />
              <text x="310" y="201" fill="#00ff88" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P6: LED GATE</text>
              <line x1="270" y1="197" x2="160" y2="197" stroke="#00ff88" strokeWidth="2" />
              <circle cx="100" cy="207" r="16" fill="#00ff88" opacity="0.3" filter="url(#neonGlow)" />
              <circle cx="100" cy="207" r="10" fill="#00ff88" stroke="#ffffff" strokeWidth="2" />
              <text x="100" y="235" fill="#00ff88" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">GREEN BEACON</text>

              {/* Power Pins (5V Vin & GND) */}
              <rect x="270" y="225" width="80" height="24" rx="4" fill="#1e293b" stroke="#ff2a55" strokeWidth="1.5" />
              <text x="310" y="241" fill="#ff2a55" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">VIN (5V) / GND</text>
              <line x1="270" y1="237" x2="160" y2="237" stroke="#ff2a55" strokeWidth="2" />
              <rect x="40" y="245" width="120" height="34" rx="6" fill="#0f172a" stroke="#ff2a55" strokeWidth="1.5" />
              <text x="100" y="262" fill="#ff2a55" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">5V 3A UBEC</text>
              <text x="100" y="273" fill="#94a3b8" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">Filtered 5.0V Rail</text>

              {/* Right Side Pins - High-Speed Hardware SPI Bus */}
              <rect x="510" y="115" width="80" height="24" rx="4" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              <text x="550" y="131" fill="#00f0ff" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P10: CS1</text>

              <rect x="510" y="145" width="80" height="24" rx="4" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              <text x="550" y="161" fill="#00f0ff" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P9: CS2</text>

              <rect x="510" y="175" width="80" height="24" rx="4" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              <text x="550" y="191" fill="#00f0ff" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P11: MOSI</text>

              <rect x="510" y="205" width="80" height="24" rx="4" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              <text x="550" y="221" fill="#00f0ff" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P12: MISO</text>

              <rect x="510" y="235" width="80" height="24" rx="4" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
              <text x="550" y="251" fill="#00f0ff" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">P13: SCK</text>

              {/* SPI Interconnect Lines to Dual Accelerometers */}
              <path d="M 590 127 L 680 127" stroke="#00f0ff" strokeWidth="2" />
              <path d="M 590 157 L 650 157 L 650 200 L 680 200" stroke="#00f0ff" strokeWidth="2" />
              <path d="M 590 187 L 670 187 L 670 145 L 680 145" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 2" />
              <path d="M 590 247 L 660 247 L 660 160 L 680 160" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="3 2" />

              {/* Sensor 1 Box */}
              <rect x="680" y="105" width="150" height="60" rx="8" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              <text x="755" y="125" fill="#00f0ff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                H3LIS331DL #1
              </text>
              <text x="755" y="142" fill="#94a3b8" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">
                ±400g (Radius = 25.0 mm)
              </text>
              <text x="755" y="156" fill="#00ff88" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">
                SPI Mode 3 @ 10 MHz
              </text>

              {/* Sensor 2 Box */}
              <rect x="680" y="180" width="150" height="60" rx="8" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              <text x="755" y="200" fill="#00f0ff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                H3LIS331DL #2
              </text>
              <text x="755" y="217" fill="#94a3b8" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">
                ±400g (Radius = 35.0 mm)
              </text>
              <text x="755" y="231" fill="#00ff88" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">
                Differential RPM Tracking
              </text>

              {/* Bottom Internal Buses Status */}
              <rect x="290" y="265" width="280" height="36" rx="6" fill="#05080f" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <text x="430" y="287" fill="#94a3b8" fontSize="11" fontFamily="var(--cyber-mono)" textAnchor="middle">
                IntervalTimer: 1000 µs (1.0 kHz Loop ISR)
              </text>
            </svg>
          )}

          {activeSchematic === 'axle' && (
            <svg viewBox="0 0 860 360" width="100%" height="auto" style={{ maxWidth: 860 }}>
              <defs>
                <linearGradient id="steelAxle" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="50%" stopColor="#f8fafc" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
                <linearGradient id="hubTi" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
                <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#ffaa00" strokeWidth="1.5" />
                </pattern>
              </defs>

              <text x="430" y="32" fill="#00f0ff" fontSize="15" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                DEAD AXLE & 626ZZ BEARING FITMENT CROSS-SECTION
              </text>

              {/* 6mm Ground Precision Dead Axle (Fixed) */}
              <rect x="60" y="165" width="740" height="30" rx="3" fill="url(#steelAxle)" stroke="#0f172a" strokeWidth="2" />
              <text x="430" y="185" fill="#0f172a" fontSize="12" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">
                6.000 mm PRECISION GROUND DEAD AXLE (h6 TOLERANCE W-1 TOOL STEEL)
              </text>

              {/* Left Chassis Clamping Block with Loctite 680 */}
              <rect x="100" y="125" width="90" height="110" rx="6" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" />
              <rect x="100" y="162" width="90" height="36" fill="url(#hatch)" opacity="0.35" />
              <text x="145" y="145" fill="#00f0ff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">CHASSIS CLAMP</text>
              <text x="145" y="215" fill="#ffaa00" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">LOCTITE 680</text>
              <text x="145" y="227" fill="#94a3b8" fontSize="8" fontFamily="var(--cyber-mono)" textAnchor="middle">ANAEROBIC LOCK</text>

              {/* Right Chassis Clamping Block */}
              <rect x="670" y="125" width="90" height="110" rx="6" fill="#1e293b" stroke="#00f0ff" strokeWidth="2" />
              <rect x="670" y="162" width="90" height="36" fill="url(#hatch)" opacity="0.35" />
              <text x="715" y="145" fill="#00f0ff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">CHASSIS CLAMP</text>
              <text x="715" y="215" fill="#ffaa00" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">LOCTITE 680</text>
              <text x="715" y="227" fill="#94a3b8" fontSize="8" fontFamily="var(--cyber-mono)" textAnchor="middle">ANAEROBIC LOCK</text>

              {/* Rotating Wheel Hub Assembly (Center) */}
              <rect x="250" y="80" width="360" height="200" rx="10" fill="url(#hubTi)" stroke="#64748b" strokeWidth="2" />

              {/* Bearing 1 (Left 626ZZ) */}
              <rect x="270" y="135" width="35" height="90" fill="#0f172a" stroke="#00ff88" strokeWidth="2" />
              <circle cx="287" cy="150" r="6" fill="#cbd5e1" stroke="#0f172a" />
              <circle cx="287" cy="210" r="6" fill="#cbd5e1" stroke="#0f172a" />
              <text x="287" y="184" fill="#00ff88" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">626</text>

              {/* Bearing 2 (Right 626ZZ) */}
              <rect x="555" y="135" width="35" height="90" fill="#0f172a" stroke="#00ff88" strokeWidth="2" />
              <circle cx="572" cy="150" r="6" fill="#cbd5e1" stroke="#0f172a" />
              <circle cx="572" cy="210" r="6" fill="#cbd5e1" stroke="#0f172a" />
              <text x="572" y="184" fill="#00ff88" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">626</text>

              {/* Precision Shims 0.5mm */}
              <rect x="240" y="155" width="6" height="50" fill="#ffaa00" />
              <rect x="614" y="155" width="6" height="50" fill="#ffaa00" />
              <text x="243" y="148" fill="#ffaa00" fontSize="8" fontFamily="var(--cyber-mono)" textAnchor="middle">SHIM</text>
              <text x="617" y="148" fill="#ffaa00" fontSize="8" fontFamily="var(--cyber-mono)" textAnchor="middle">SHIM</text>

              {/* Outrunner Stator & Rotor Coils in Hub */}
              <rect x="330" y="105" width="200" height="30" fill="#ea580c" opacity="0.8" rx="4" />
              <rect x="330" y="225" width="200" height="30" fill="#ea580c" opacity="0.8" rx="4" />
              <text x="430" y="124" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                PROPDRIVE 2836 1200KV STATOR
              </text>
              <text x="430" y="244" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                HIGH-FLUX NEODYMIUM ROTOR BELL
              </text>

              {/* Outer Cast Urethane Tire & Titanium Cleats */}
              <rect x="250" y="60" width="360" height="20" fill="#10b981" rx="4" />
              <rect x="250" y="280" width="360" height="20" fill="#10b981" rx="4" />
              <text x="430" y="74" fill="#022c22" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">
                CAST SHORE 80A URETHANE TREAD WITH BONDED GRADE 5 TITANIUM CLEATS
              </text>
              <text x="430" y="294" fill="#022c22" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">
                ENDPLAY SPACING: 0.50 mm – 0.80 mm SHIMMED CLEARANCE
              </text>
            </svg>
          )}

          {activeSchematic === 'chassis' && (
            <svg viewBox="0 0 860 360" width="100%" height="auto" style={{ maxWidth: 860 }}>
              <text x="430" y="32" fill="#00f0ff" fontSize="15" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                CHASSIS SANDWICH STACK & STAR TORQUE SEQUENCE
              </text>

              {/* Exploded Sandwich View (Left Half) */}
              <g transform="translate(60, 50)">
                <text x="140" y="18" fill="#94a3b8" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700">EXPLODED MECHANICAL STACK</text>

                {/* Top 2mm Plate */}
                <rect x="20" y="30" width="240" height="14" rx="3" fill="#38bdf8" />
                <text x="140" y="42" fill="#082f49" fontSize="9" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                  TOP ARMOR: 2.0 mm 6061-T6 (M3 C'SUNK)
                </text>

                {/* Brass Heat Set Inserts */}
                <circle cx="50" cy="56" r="5" fill="#f59e0b" />
                <circle cx="230" cy="56" r="5" fill="#f59e0b" />
                <text x="140" y="60" fill="#f59e0b" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">
                  RUTHEX M3 HEAT-SET INSERTS (230°C)
                </text>

                {/* TPU Bumper & Cradle */}
                <rect x="20" y="70" width="240" height="40" rx="6" fill="#0284c7" opacity="0.8" />
                <text x="140" y="94" fill="#ffffff" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                  TPU 95A HIGH-FLOW CRADLE & BUMPERS
                </text>

                {/* 3mm Neoprene Cushion */}
                <rect x="40" y="115" width="200" height="10" rx="2" fill="#64748b" />
                <text x="140" y="123" fill="#ffffff" fontSize="8" fontFamily="var(--cyber-mono)" textAnchor="middle">
                  3.0 mm NEOPRENE SHOCK DAMPING LINER
                </text>

                {/* Dual 4S LiPo Packs */}
                <rect x="50" y="130" width="180" height="35" rx="4" fill="#dc2626" />
                <text x="140" y="152" fill="#ffffff" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                  DUAL 4S 550mAh 95C LiPo PACKS
                </text>

                {/* Bottom 3mm Plate */}
                <rect x="20" y="175" width="240" height="20" rx="3" fill="#0284c7" />
                <text x="140" y="189" fill="#ffffff" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                  BOTTOM CHASSIS: 3.0 mm 6061-T6
                </text>

                {/* AR500 Weapon Teeth */}
                <rect x="10" y="202" width="260" height="18" rx="4" fill="#475569" stroke="#ff2a55" strokeWidth="2" />
                <text x="140" y="215" fill="#ff2a55" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">
                  0.25" AR500 SYMMETRIC TEETH (2×)
                </text>
              </g>

              {/* Star Torque Pattern (Right Half) */}
              <g transform="translate(480, 50)">
                <text x="150" y="18" fill="#94a3b8" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                  STAR PATTERN TORQUE SEQUENCE (2.0 N·m)
                </text>

                {/* Circular Chassis Top View */}
                <circle cx="150" cy="130" r="100" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />

                {/* Star Pattern Lines */}
                <path d="M 150 45 L 150 215 M 76 87 L 224 173 M 224 87 L 76 173" stroke="rgba(0, 240, 255, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />

                {/* Bolt Locations 1 through 6 */}
                {/* Bolt 1: Top */}
                <circle cx="150" cy="45" r="14" fill="#ff2a55" />
                <text x="150" y="50" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">1</text>

                {/* Bolt 2: Bottom-Right */}
                <circle cx="224" cy="173" r="14" fill="#ffaa00" />
                <text x="224" y="178" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">2</text>

                {/* Bolt 3: Top-Left */}
                <circle cx="76" cy="87" r="14" fill="#00ff88" />
                <text x="76" y="92" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">3</text>

                {/* Bolt 4: Bottom */}
                <circle cx="150" cy="215" r="14" fill="#00f0ff" />
                <text x="150" y="220" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">4</text>

                {/* Bolt 5: Top-Right */}
                <circle cx="224" cy="87" r="14" fill="#a855f7" />
                <text x="224" y="92" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">5</text>

                {/* Bolt 6: Bottom-Left */}
                <circle cx="76" cy="173" r="14" fill="#f43f5e" />
                <text x="76" y="178" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">6</text>

                <text x="150" y="255" fill="#94a3b8" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">
                  Stage 1: 0.8 N·m · Stage 2: 1.4 N·m · Final: 2.0 N·m
                </text>
                <text x="150" y="270" fill="#ffaa00" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">
                  Install M3 Belleville conical washers to lock tension
                </text>
              </g>
            </svg>
          )}

          {activeSchematic === 'power' && (
            <svg viewBox="0 0 860 360" width="100%" height="auto" style={{ maxWidth: 860 }}>
              <text x="430" y="32" fill="#00f0ff" fontSize="15" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">
                HIGH-CURRENT POWER HARNESS & REMOVABLE SAFETY LINK
              </text>

              {/* Battery Pack 1 */}
              <rect x="50" y="70" width="140" height="60" rx="8" fill="#1e293b" stroke="#ff2a55" strokeWidth="2" />
              <text x="120" y="95" fill="#ff2a55" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">LIPO PACK #1</text>
              <text x="120" y="112" fill="#94a3b8" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">4S 550mAh 95C (XT30)</text>

              {/* Battery Pack 2 */}
              <rect x="50" y="150" width="140" height="60" rx="8" fill="#1e293b" stroke="#ff2a55" strokeWidth="2" />
              <text x="120" y="175" fill="#ff2a55" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">LIPO PACK #2</text>
              <text x="120" y="192" fill="#94a3b8" fontSize="10" fontFamily="var(--cyber-mono)" textAnchor="middle">4S 550mAh 95C (XT30)</text>

              {/* Parallel Bus Junction */}
              <path d="M 190 90 L 250 90 L 250 130 L 280 130" stroke="#ff2a55" strokeWidth="3" />
              <path d="M 190 170 L 250 170 L 250 130" stroke="#ff2a55" strokeWidth="3" />
              <circle cx="250" cy="130" r="5" fill="#ff2a55" />
              <text x="250" y="115" fill="#ff2a55" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">PARALLEL (+)</text>

              <path d="M 190 110 L 230 110 L 230 250 L 520 250" stroke="#000000" strokeWidth="4" />
              <path d="M 190 110 L 230 110 L 230 250 L 520 250" stroke="#475569" strokeWidth="2" />
              <path d="M 190 190 L 230 190 L 230 250" stroke="#475569" strokeWidth="2" />
              <text x="230" y="270" fill="#94a3b8" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">COMMON MAIN RETURN (-)</text>

              {/* XT60 Removable Link (MANDATORY IN SERIES ON POSITIVE RAIL) */}
              <rect x="280" y="105" width="110" height="50" rx="8" fill="#dc2626" stroke="#f87171" strokeWidth="2" />
              <text x="335" y="128" fill="#ffffff" fontSize="11" fontFamily="var(--cyber-mono)" fontWeight="800" textAnchor="middle">XT60 SAFETY</text>
              <text x="335" y="142" fill="#ffffff" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">POWER LINK</text>

              {/* High-Vis Red Pull Cord Loop */}
              <path d="M 335 105 C 335 60, 390 60, 390 90 C 390 105, 360 105, 360 105" fill="none" stroke="#ff2a55" strokeWidth="3" strokeDasharray="3 2" />
              <text x="390" y="55" fill="#ff2a55" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="700">60-SEC PULL CORD</text>

              {/* Power Rail after Link */}
              <line x1="390" y1="130" x2="480" y2="130" stroke="#ff2a55" strokeWidth="3" />

              {/* 1000µF Low-ESR Capacitor Bank */}
              <rect x="440" y="160" width="60" height="70" rx="6" fill="#1e293b" stroke="#00ff88" strokeWidth="2" />
              <line x1="470" y1="130" x2="470" y2="160" stroke="#ff2a55" strokeWidth="2" />
              <line x1="470" y1="230" x2="470" y2="250" stroke="#475569" strokeWidth="2" />
              <text x="470" y="185" fill="#00ff88" fontSize="9" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">1000 µF</text>
              <text x="470" y="198" fill="#00ff88" fontSize="8" fontFamily="var(--cyber-mono)" textAnchor="middle">35V Low-ESR</text>
              <text x="470" y="218" fill="#94a3b8" fontSize="7" fontFamily="var(--cyber-mono)" textAnchor="middle">RUBYCON</text>

              {/* AM32 55A 4-in-1 ESC Box */}
              <rect x="520" y="90" width="160" height="175" rx="10" fill="#0f172a" stroke="#00f0ff" strokeWidth="2" />
              <text x="600" y="115" fill="#00f0ff" fontSize="12" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">AM32 55A ESC</text>
              <text x="600" y="130" fill="#94a3b8" fontSize="9" fontFamily="var(--cyber-mono)" textAnchor="middle">4-in-1 BIDIRECTIONAL</text>

              {/* Motor 1 & 2 Leads from ESC */}
              <path d="M 680 135 L 750 135" stroke="#ffaa00" strokeWidth="2" />
              <circle cx="780" cy="135" r="22" fill="#1e293b" stroke="#ffaa00" strokeWidth="2" />
              <text x="780" y="139" fill="#ffaa00" fontSize="9" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">MOTOR L</text>

              <path d="M 680 200 L 750 200" stroke="#ffaa00" strokeWidth="2" />
              <circle cx="780" cy="200" r="22" fill="#1e293b" stroke="#ffaa00" strokeWidth="2" />
              <text x="780" y="204" fill="#ffaa00" fontSize="9" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">MOTOR R</text>

              {/* UBEC Tap (5V) */}
              <line x1="420" y1="130" x2="420" y2="85" stroke="#ff2a55" strokeWidth="2" />
              <rect x="360" y="55" width="120" height="30" rx="4" fill="#1e293b" stroke="#00ff88" strokeWidth="1.5" />
              <text x="420" y="73" fill="#00ff88" fontSize="10" fontFamily="var(--cyber-mono)" fontWeight="700" textAnchor="middle">5V 3A UBEC → MCU</text>
            </svg>
          )}
        </div>

        <div className="bg-schematic-legend">
          <div className="bg-legend-item">
            <span className="bg-legend-dot" style={{ background: '#00f0ff' }} />
            <span>High-Speed SPI Bus (10 MHz)</span>
          </div>
          <div className="bg-legend-item">
            <span className="bg-legend-dot" style={{ background: '#00ff88' }} />
            <span>CRSF Telemetry (500 Hz / 420k Baud)</span>
          </div>
          <div className="bg-legend-item">
            <span className="bg-legend-dot" style={{ background: '#ffaa00' }} />
            <span>DShot600 Motor Signals (8 kHz)</span>
          </div>
          <div className="bg-legend-item">
            <span className="bg-legend-dot" style={{ background: '#ff2a55' }} />
            <span>16.8V High-Current Mains (XT60 Kill Link)</span>
          </div>
        </div>
      </div>

      {/* Main 8-Phase Step-by-Step Build Card Stack */}
      <div className="bg-phases-list" style={{ marginTop: 40 }}>
        {PHASES_DATA.map((phase) => {
          const phaseDone = phase.steps.every((s) => completedSteps[s.id]);
          const phaseCount = phase.steps.filter((s) => completedSteps[s.id]).length;

          return (
            <section key={phase.id} id={phase.id} className={`bg-phase-card glass-panel ${phaseDone ? 'all-complete' : ''}`}>
              <div className="bg-phase-header">
                <div className="bg-phase-title-wrap">
                  <div className="bg-phase-number">0{phase.num}</div>
                  <div>
                    <span className="cyber-badge cyber-badge-cyan">PHASE {phase.num} OF 8</span>
                    <h2>{phase.title}</h2>
                    <div className="bg-phase-subtitle">{phase.subtitle}</div>
                  </div>
                </div>

                <div className="bg-phase-meta">
                  <span className="cyber-badge cyber-badge-amber">⏱️ {phase.estTime}</span>
                  <span className="cyber-badge cyber-badge-purple">⚖️ {phase.targetWeightImpact}</span>
                  <button
                    className="bg-action-btn"
                    onClick={() => markPhaseComplete(phase)}
                    title={`Mark all ${phase.steps.length} steps in Phase ${phase.num} complete`}
                  >
                    <span>✓</span>
                    <span>Complete Phase</span>
                  </button>
                </div>
              </div>

              {/* Specs & Requirements Matrix */}
              <div className="bg-phase-specs">
                <div className="bg-spec-pill-box">
                  <h4>🔧 Required Tools & Jigs</h4>
                  <ul>
                    {phase.tools.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-spec-pill-box">
                  <h4>📦 Materials & Consumables</h4>
                  <ul>
                    {phase.materials.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-spec-pill-box">
                  <h4>📐 Engineering Tolerances</h4>
                  <ul>
                    {phase.specs.map((sp, idx) => (
                      <li key={idx}>
                        <strong>{sp.label}:</strong> {sp.value}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Technical Deep Dive */}
              <div className="bg-deep-dive">
                <h3>🔍 Technical Architecture & Pit Experience: {phase.deepDive.heading}</h3>
                {phase.deepDive.paragraphs.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}

                {phase.deepDive.callout && (
                  <div className={`bg-callout ${phase.deepDive.callout.type}`}>
                    <div style={{ fontSize: '18px' }}>
                      {phase.deepDive.callout.type === 'danger' ? '🚨' : phase.deepDive.callout.type === 'warning' ? '⚠️' : '💡'}
                    </div>
                    <div>
                      <strong>{phase.deepDive.callout.title}: </strong>
                      {phase.deepDive.callout.body}
                    </div>
                  </div>
                )}
              </div>

              {/* Actionable Step Checkboxes */}
              <div className="bg-step-group">
                <div className="bg-step-group-header">
                  <span>Phase {phase.num} Work Tasks ({phaseCount}/{phase.steps.length} Completed)</span>
                  <span style={{ fontSize: '11px', color: 'var(--cyber-text-dim)' }}>Click item to toggle state</span>
                </div>

                <div className="bg-checklist">
                  {phase.steps.map((st) => {
                    const isDone = !!completedSteps[st.id];
                    return (
                      <label key={st.id} className={`bg-check-item ${isDone ? 'done' : ''}`}>
                        <input
                          type="checkbox"
                          className="bg-check-input"
                          checked={isDone}
                          onChange={() => toggleStep(st.id)}
                        />
                        <div className="bg-check-body">
                          <div className="bg-check-title">{st.title}</div>
                          <div className="bg-check-desc">{st.desc}</div>
                        </div>
                        {st.badge && <span className="bg-check-badge">{st.badge}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="btn-row" style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Link className="btn primary" to="/firmware">Next: Inspect Firmware & .ino ↗</Link>
        <Link className="btn" to="/lab">Test in ⚡ Combat Lab ↗</Link>
        <Link className="btn" to="/bom">Locked BOM & Costs ↗</Link>
        <Link className="btn" to="/explorer">Open 3D CAD Explorer ↗</Link>
      </div>
    </div>
  );
}
