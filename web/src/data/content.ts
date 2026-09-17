export const nav = [
  { to: '/', label: 'Overview' },
  { to: '/build', label: 'Build' },
  { to: '/onshape', label: 'Onshape' },
  { to: '/pcbway', label: 'PCBWay files' },
  { to: '/printing', label: '3D printing' },
  { to: '/parts', label: 'Parts' },
  { to: '/firmware', label: 'Firmware + AI' },
];

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
  { value: 95, prefix: '~', suffix: ' mph', label: 'tip speed, 8 in ring at 4000 RPM', decimals: 0 },
  { value: 241, prefix: '', suffix: ' g', label: 'AR500 ring target (Liftoff precedent)', decimals: 0 },
  { value: 8, prefix: '', suffix: ' kHz', label: 'DShot600 control loop', decimals: 0 },
];

export const buildSteps = [
  { n: '0', title: 'Rules + safety', body: 'Read SPARC plus your event rules. Removable link, failsafe (TX off stops spin under 1 s), LiPo bag, wheel locks. Message the organizer now if you run ELRS plus any DIY handset — it needs pre-clear. Cloud and pit software never drive.' },
  { n: '1', title: 'Order metal first', body: 'Longest lead time. Export Main CAD.step bodies to manufacturing/pcbway/cnc/*.step (one solid per file) and flat plates to sheet-metal/*.dxf (1:1 mm). AR500 0.25 in ring around 241 g, 6061-T6 plates, titanium cleats. See Onshape page, then PCBWay page.' },
  { n: '2', title: 'Order electronics', body: 'Two PROPDRIVE v2 2836 1200KV (82 g each), AM32 55 A board with bidirectional DShot600, Teensy 4.0 lockable without pins, two H3LIS331DLTR breakouts to start, ELRS receiver plus handset, two 4S 550 mAh packs in parallel.' },
  { n: '3', title: 'Print plastics', body: 'Test-fit in PLA, fight in TPU 95A. No pre-sliced G-code here — slice for your printer and your spool. Shell halves, pod guards, LED mount, Pi and BEC mount, battery tray, wheel locks.' },
  { n: '4', title: 'Assemble frame', body: 'Deburr, hand-thread every bolt, press 626 bearings straight, hubmotor dead axle with aluminum hubs, titanium cleats last. Ring bolts in 12.9 with Loctite 243 in a star pattern. Balance on a point jig until level in four or more orientations.' },
  { n: '5', title: 'Wire on the bench, no weapon energy', body: 'Battery to link to AM32 boards to motors. ELRS CRSF to Teensy UART. Dual accelerometers on short SPI near the center of gravity. 4700 uF on 5 V, twisted power and signal. Green LED means front, visible through the poly window.' },
  { n: '6', title: 'Flash and tune', body: 'Learn the config flow on OpenMelt2, then run the Teensy DShot600 build. Low-RPM slide, trim straight, then 2000 to 3000 to 4000 RPM. Change one gain at a time and log every run.' },
  { n: '7', title: 'Failsafe video and weigh-in', body: 'Film TX-off stop, confirm re-arm needs a deliberate action, confirm it never boots armed. Save firmware/failsafe-test.mp4. Scale must read 1361 g or less fight-ready. Pack spares: teeth, cleats, ESC, battery.' },
];

export const trackerText = `- [ ] P0 rules read + organizer pre-clear sent
- [ ] Metal ordered (cnc STEP + sheet DXF)
- [ ] Electronics ordered (BOM.md)
- [ ] Prints done + inserts set + weighed
- [ ] Frame assembled + balanced on point jig
- [ ] Bench-tested with no weapon energy
- [ ] Firmware flashed + heading LED correct + failsafe on video
- [ ] Straight translation at low then high RPM
- [ ] Total 1361 g or less + spares packed`;
