export type NavAnchor = { hash: string; label: string };
export type NavEntry = { to: string; label: string; end?: boolean; anchors?: NavAnchor[] };

export const nav: NavEntry[] = [
  { to: '/', label: 'Overview', end: true },
  { to: '/studio', label: '3D Studio' },
  { to: '/explorer', label: 'Explorer' },
  { to: '/build', label: 'Build' },
  { to: '/onshape', label: 'Onshape' },
  { to: '/pcbway', label: 'PCBWay files' },
  { to: '/printing', label: '3D printing' },
  { to: '/parts', label: 'Parts' },
  { to: '/bom', label: 'BOM + cost' },
  { to: '/firmware', label: 'Firmware + AI' },
];

/** Encode public/cad hrefs (STEP names contain spaces). */
export const cadHref = (p: string) => encodeURI(p);

export type CadModel = {
  id: string;
  label: string;
  glb: string;
  step: string;
  stepSize: string;
  solids: number;
  note: string;
};

export const cadModels: CadModel[] = [
  {
    id: 'full', label: 'Full assembly',
    glb: 'cad/main-cad.glb', step: 'cad/Main CAD.step', stepSize: '17.7 MB',
    solids: 145, note: 'Source of truth. 319.9 cm³ across 145 solids. Never upload as-is.',
  },
  {
    id: 'pod', label: 'Wheel pod',
    glb: 'cad/wheel-pod.glb', step: 'cad/Wheel Pod.step', stepSize: '4.1 MB',
    solids: 25, note: 'Drive module. 12.3 cm³ across 25 solids.',
  },
  {
    id: 'teeth', label: 'Standard teeth',
    glb: 'cad/standard-weapon-teeth.glb', step: 'cad/Standard Weapon Teeth.step', stepSize: '295 KB',
    solids: 2, note: 'Symmetric 2-tooth set. 55.6 cm³ total, 218 g each in steel.',
  },
  {
    id: 'undercutter', label: 'Undercutter',
    glb: 'cad/undercutter-config.glb', step: 'cad/Undercutter Config.step', stepSize: '458 KB',
    solids: 10, note: 'Alternate weapon config. 45.4 cm³ across 10 solids.',
  },
];

export const proofStats = [
  { value: 1361, prefix: '≤', suffix: ' g', label: 'weight cap (3 lb = 1360.8 g)', decimals: 0 },
  { value: 95, prefix: '~', suffix: ' mph', label: 'tip speed IF 8 in spin dia at 4000 RPM — measure yours', decimals: 0 },
  { value: 241, prefix: '', suffix: ' g', label: 'AR500 ring 241–326 g range (Liftoff precedent)', decimals: 0 },
  { value: 8, prefix: '', suffix: ' kHz', label: 'DShot600 control loop', decimals: 0 },
];

export const buildSteps = [
  { n: '0', title: 'Rules + safety', body: 'Read SPARC plus your event rules. Match link: ELRS (FHSS, legal). DIY/custom handset: trainer/pit tool only until TRC pre-clears under SPARC §6.4.3 — message the organizer now. Removable link, failsafe (TX off stops spin under 1 s), LiPo bag, wheel locks. Cloud and pit software never drive.' },
  { n: '1', title: 'Order metal first', body: 'Longest lead time. Export Main CAD.step bodies to manufacturing/pcbway/cnc/*.step (one solid per file) and flat plates to sheet-metal/*.dxf (1:1 mm). Titanium teeth (246 g a pair — steel would be 436 g), 6061-T6 plates, titanium cleats. See Onshape page, then PCBWay page.' },
  { n: '2', title: 'Order electronics', body: 'Two PROPDRIVE v2 2836 1200KV (82 g each), AM32 55 A board with bidirectional DShot600, Teensy 4.0 lockable without pins, two H3LIS331DLTR breakouts to start, ELRS receiver plus handset, two 4S 550 mAh packs in parallel.' },
  { n: '3', title: 'Print plastics', body: 'Test-fit in PLA, fight in TPU 95A. No pre-sliced G-code here — slice for your printer and your spool. Shell halves, pod guards, LED mount, Pi and BEC mount, battery tray, wheel locks.' },
  { n: '4', title: 'Assemble frame', body: 'Deburr, hand-thread every bolt, press 626 bearings straight, hubmotor dead axle with aluminum hubs, titanium cleats last. Ring bolts in 12.9 with Loctite 243 in a star pattern. Balance on a point jig until level in four or more orientations.' },
  { n: '5', title: 'Wire on the bench, no weapon energy', body: 'Battery to link to AM32 boards to motors. ELRS CRSF to Teensy UART. Dual accelerometers on short SPI near the center of gravity. 4700 uF on 5 V, twisted power and signal. Green LED means front, visible through the poly window.' },
  { n: '6', title: 'Flash and tune', body: 'Learn the config flow on OpenMelt2, then run the Teensy DShot600 build. Low-RPM slide, trim straight, then 2000 to 3000 to 4000 RPM. Change one gain at a time and log every run.' },
  { n: '7', title: 'Failsafe video and weigh-in', body: 'Film TX-off stop under 1 s, brown-out (yank Pi power) still failsafes, confirm re-arm needs a deliberate action, confirm it never boots armed. Save firmware/failsafe-test.mp4. Scale must read 1361 g or less fight-ready. Pack spares: teeth, cleats, ESC, battery.' },
];

export const trackerText = `- [ ] P0 rules read + organizer pre-clear sent
- [ ] Metal ordered (cnc STEP + sheet DXF)
- [ ] Electronics ordered (BOM.md)
- [ ] Prints done + inserts set + weighed
- [ ] Frame assembled + balanced on point jig
- [ ] Bench-tested with no weapon energy
- [ ] Firmware flashed + heading LED correct + failsafe on video
- [ ] Straight translation at low then high RPM
- [ ] Scale ≤1361 g cap, target ≤1310 g (50 g margin) + spares packed`;

export type CostRow = {
  item: string;
  spec: string;
  qty: string;
  unitUsd: number | null;
  lineUsd: number | null;
  vendor: string;
  verified: boolean;
};

// ESTIMATES, US, Sep 2026. Verify before ordering.
export const costRows: CostRow[] = [
  { item: 'Motors', spec: 'PROPDRIVE v2 2836 1200KV, 82 g', qty: '2', unitUsd: 22, lineUsd: 44, vendor: 'HobbyKing', verified: true },
  { item: 'MCU', spec: 'Teensy 4.0 lockable, no pins', qty: '1', unitUsd: 20, lineUsd: 20, vendor: 'PJRC (street 20–33)', verified: true },
  { item: 'Accels (learn)', spec: 'Adafruit 4627 H3LIS331 breakout', qty: '2', unitUsd: 24.95, lineUsd: 49.9, vendor: 'Adafruit', verified: true },
  { item: 'Accels (fight PCB)', spec: 'H3LIS331DLTR bare chip', qty: '2', unitUsd: 12, lineUsd: 24, vendor: 'DigiKey / Mouser', verified: true },
  { item: 'ESC', spec: 'AM32 55 A 4-in-1, DShot bidir', qty: '1', unitUsd: 45, lineUsd: 45, vendor: 'NeutronRC / iFlight', verified: true },
  { item: 'Receiver', spec: 'ELRS 2.4 GHz EP1 / RP1', qty: '1', unitUsd: 19, lineUsd: 19, vendor: 'HappyModel', verified: true },
  { item: 'Handset (one-time)', spec: 'RadioMaster Pocket ELRS', qty: '1', unitUsd: 72, lineUsd: 72, vendor: 'RadioMaster', verified: true },
  { item: 'Batteries', spec: '4S 550 mAh 95C XT30 (2 flight sets)', qty: '4', unitUsd: 15, lineUsd: 60, vendor: 'Tattu R-Line', verified: true },
  { item: 'Armor lot', spec: 'AR500 ring + Ti cleats, cut', qty: '1 lot', unitUsd: 140, lineUsd: 140, vendor: 'SendCutSend (range 100–180)', verified: false },
  { item: 'Chassis', spec: '6061 plate, CNC milled', qty: '1 lot', unitUsd: 75, lineUsd: 75, vendor: 'PCBWay (range 45–110)', verified: false },
  { item: 'Filament', spec: 'TPU 95A 1 kg', qty: '1', unitUsd: 23, lineUsd: 23, vendor: 'Overture', verified: true },
  { item: 'Fasteners', spec: 'M3/M4 12.9 + nyloc kit', qty: '1 kit', unitUsd: 18, lineUsd: 18, vendor: 'Assortment kit', verified: true },
  { item: 'Bearings', spec: '626 6×19×6 (10-pack)', qty: '1', unitUsd: 8, lineUsd: 8, vendor: 'Budget 10-pack', verified: true },
  { item: 'Supervisor', spec: 'Pi Zero 2W, no header', qty: '1', unitUsd: 19, lineUsd: 19, vendor: 'Adafruit / PiShop', verified: true },
  { item: 'Camera', spec: 'Pi Camera Module 3 Wide', qty: '1', unitUsd: 38.5, lineUsd: 38.5, vendor: 'Adafruit', verified: true },
  { item: 'BEC', spec: '5 V 3 A UBEC 2–6S', qty: '1', unitUsd: 7, lineUsd: 7, vendor: 'HobbyKing / Adafruit', verified: true },
];

export const sparesRows: CostRow[] = [  { item: 'Spare motor', spec: 'PROPDRIVE 2836 1200KV', qty: '1', unitUsd: 22, lineUsd: 22, vendor: 'HobbyKing', verified: true },
  { item: 'Spare ESC', spec: 'AM32 55 A', qty: '1', unitUsd: 45, lineUsd: 45, vendor: 'Same as fight', verified: true },
  { item: 'Spare RX + accel', spec: 'EP1 + H3LIS331 breakout', qty: '1+1', unitUsd: 44, lineUsd: 44, vendor: '—', verified: true },
  { item: 'Spare LiPos', spec: '4S 550 mAh', qty: '2', unitUsd: 15, lineUsd: 30, vendor: '—', verified: true },
  { item: 'Hardware + wire', spec: 'Bullets, XT30, silicone wire', qty: '1 set', unitUsd: 20, lineUsd: 20, vendor: '—', verified: true },
];

export type StackGroup =
  | 'Compute' | 'Sensing' | 'Drive' | 'Link' | 'Power' | 'Weapon' | 'Vision+AI';

export type StackCard = {
  id: string;
  group: StackGroup;
  part: string;
  spec: string;
  role: string;
  stamp: 'Locked' | 'Estimate' | 'TODO-export';
};

export const stackCards: StackCard[] = [
  { id: 'mcu', group: 'Compute', part: 'Teensy 4.0 lockable, no pins', spec: 'Cortex-M7 600 MHz, 1024K RAM, 7× serial — solder direct', role: 'Runs DShot600-via-SPI at 8 kHz. An Arduino Micro cannot do this.', stamp: 'Locked' },
  { id: 'acc-learn', group: 'Sensing', part: 'Accels (learn) — Adafruit 4627 ×2', spec: 'H3LIS331 ±400 g, 16-bit, SPI — $24.95 ea', role: 'Bench rig. Confirm ~0 RPM at rest, rises on hand-spin.', stamp: 'Locked' },
  { id: 'acc-fight', group: 'Sensing', part: 'Accels (fight) — H3LIS331DLTR ×2', spec: 'Opposed at 45°, short SPI near CG, 4700 uF on 5 V', role: 'Deterministic heading that survives hits shifting the spin center.', stamp: 'Locked' },
  { id: 'motors', group: 'Drive', part: 'PROPDRIVE v2 2836 1200KV ×2', spec: '82 g ea, 48 A max, 3–4S, 12-pole — hubmotor build', role: 'Hubmotor: 6 mm dead axle, two 626 bearings, aluminum hubs.', stamp: 'Locked' },
  { id: 'esc', group: 'Drive', part: 'AM32 55 A 4-in-1', spec: 'DShot600 + bidirectional eRPM — not SimonK / 490 Hz', role: 'The 8 kHz loop that makes translation at spin possible.', stamp: 'Locked' },
  { id: 'wheels', group: 'Drive', part: 'Ti cleat wheels (Phase 2)', spec: '1.55 in Ti cleats — Phase 1 runs rubber to learn', role: 'Bite on wood and steel. Foam shreds on contact. Phase 1 fallback: rubber wheels to learn — do not wait on cleats.', stamp: 'TODO-export' },
  { id: 'rx', group: 'Link', part: 'ELRS EP1/RP1 receiver', spec: '2.4 GHz, CRSF to Teensy UART, failsafe throttle-cut', role: 'Telemetry back to the handset. Failsafe must be verified on video.', stamp: 'Locked' },
  { id: 'tx', group: 'Link', part: 'RadioMaster Pocket ELRS', spec: 'One-time buy — bind, confirm sticks in configurator', role: 'Driver input. Cloud and pit software never drive.', stamp: 'Locked' },
  { id: 'batt', group: 'Power', part: '2× 4S 550 mAh in parallel', spec: '95C XT30 — 4 packs makes 2 flight sets', role: 'Liftoff Rev5+ spec. Must fit the TPU cradle and make weight.', stamp: 'Locked' },
  { id: 'link', group: 'Power', part: 'Removable link + harness + BEC', spec: 'Combat link, XT30, 16–20 AWG + 5 V / 3 A UBEC', role: 'Legal arming plus isolated 5 V, so a Pi brown-out cannot fail the failsafe.', stamp: 'Locked' },
  { id: 'ring', group: 'Weapon', part: 'Teeth pair — titanium to make weight', spec: '55.6 cm³ measured: 436 g steel / 246 g Ti — no rim holes, taper to tune', role: 'Steel carries 1.77× the energy of Ti at equal volume, but 436 g of steel teeth blows the 1310 g target — Ti teeth at 246 g match Liftoff’s 241 g ring budget. Weigh yours.', stamp: 'Estimate' },
  { id: 'teeth', group: 'Weapon', part: 'Standard teeth + 12.9 hardware', spec: '55.6 cm³ pair, 218 g ea in steel — 12.9 + Loctite 243', role: 'Symmetric 2-tooth. Balance on a point jig or it hops at 3000 RPM. Fallback: order DXF waterjet teeth via SendCutSend while CNC exports are pending.', stamp: 'TODO-export' },
  { id: 'plates', group: 'Weapon', part: '6061-T6 plates + TPU cradle', spec: '6061 0.063–0.080 in + poly LED window + TPU 95A shell', role: 'Branch E formula: aluminum structure, TPU shock, never full-steel. Weigh yours.', stamp: 'Estimate' },
  { id: 'pi', group: 'Vision+AI', part: 'Pi Zero 2W supervisor', spec: 'No header, UART 115200 to Teensy, ~35–50 g with BEC', role: 'Logs RPM, g, and battery; RPM-hold trim plus telemetry. Budget in Branch E.', stamp: 'Locked' },
  { id: 'cam', group: 'Vision+AI', part: 'Pi Camera 3 Wide + pit/cloud', spec: 'Onboard 1080p and flow — pit YOLO plus LLM hints, advisory only', role: 'Post-match review plus human-gated hints. Never drives.', stamp: 'Locked' },
];

export const stackGroups: ('All' | StackGroup)[] = ['All', 'Compute', 'Sensing', 'Drive', 'Link', 'Power', 'Weapon', 'Vision+AI'];
