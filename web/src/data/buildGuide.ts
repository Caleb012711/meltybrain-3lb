import type { PartRole } from '../components/materials';

export type BuildStepKey = '3' | '4' | '5';

export type GuideEntry = {
  role: PartRole;
  where: string;
  stepDetail: string;
  note: string;
  caution?: string;
  links: { to: string; label: string }[];
};

export const BUILD_GUIDE: Record<PartRole, GuideEntry> = {
  'weapon-steel': {
    role: 'weapon-steel',
    where: 'Outer spinning band — symmetric 2-tooth ring and teeth. No rim, bolt, or lightening holes.',
    stepDetail: 'BS4 Assemble frame (01 §4) + BS1 order metal first',
    note: 'Teeth pair measures 55.6 cm³ in CAD: 436 g in AR500 steel, 246 g in Grade 5 titanium — build Ti to make the 1310 g target (Liftoff steel precedent: 241 g tapered). Taper mid-span to tune — never drill to lighten. Ring bolts 12.9 + Loctite 243, star pattern, 24 h cure.',
    caution: 'Balance on a point jig, level in 4+ orientations. 3–5 g off means hop at 3000 RPM.',
    links: [
      { to: '/build', label: 'Build step 4' },
      { to: '/onshape', label: 'Export tooth STEP/DXF' },
    ],
  },
  'chassis-alu': {
    role: 'chassis-alu',
    where: 'Top and bottom plates sandwiching the TPU shell — structure between ring and pods.',
    stepDetail: 'BS4 Assemble frame (01 §4) + BS1 order metal first',
    note: '6061-T6, 0.063–0.080 in, plus a narrow poly LED window (never full-poly plates). Snug diagonal star pattern. Plates and structure run ~300–400 g; the big 80 cm³ body must be aluminum or pocketed — never steel.',
    links: [
      { to: '/build', label: 'Build step 4' },
      { to: '/pcbway', label: 'Order plates' },
    ],
  },
  'pod-metal': {
    role: 'pod-metal',
    where: 'Wheel pods per Wheel Pod.step — 6 mm dead axle, two 626 bearings, aluminum hubs, Ti cleats last.',
    stepDetail: 'BS4 Assemble frame (01 §3)',
    note: 'Press the outer race only; freeze the bearing, warm the housing. Shim endplay under 1 mm — must spin free with zero grind. Phase 1 rubber to learn, Phase 2 1.55 in Ti cleats. Cleats are sharp: install last.',
    links: [
      { to: '/build', label: 'Build step 4' },
      { to: '/explorer', label: 'Inspect pod' },
    ],
  },
  'fastener-dark': {
    role: 'fastener-dark',
    where: 'Everywhere symmetric — ring sandwich, pod stack, plate stack. Most tiny solids are thread artifacts.',
    stepDetail: 'BS4 Assemble frame (01 §1, §4, §5)',
    note: '12.9 black oxide + blue 243. Hand-thread every bolt first, never force. Symmetric layout; keep 2–3 g trim screws for final balance — never drill the ring. Heuristic warning: tiny hardware all reads as fastener, verify alloy in CAD.',
    caution: 'Stats-only parts (thread specks) have no viewer mesh — isolate and hide stay disabled.',
    links: [
      { to: '/build', label: 'Build steps' },
      { to: '/bom', label: 'BOM + cost' },
    ],
  },
  'shell-tpu': {
    role: 'shell-tpu',
    where: 'Interior cradle and shell halves, pod guards, battery tray, Pi/BEC and LED mounts — sandwiched between the 6061 plates.',
    stepDetail: 'BS3 Print plastics + BS4 sandwich (01 §4) + BS5 battery strap',
    note: 'TPU 95A at 1.21 g/cc, branch-E budget 80–120 g. Test-fit in PLA, fight in TPU. 4–6 walls, 30–60% gyroid, heat-set inserts — never tap TPU. Battery strapped in TPU: a shift means unbalance.',
    links: [
      { to: '/printing', label: 'Slicing guide' },
      { to: '/build', label: 'Build steps' },
    ],
  },
  'electro-green': {
    role: 'electro-green',
    where: 'Keepout placeholder — not a real PCB. Center: dual H3LIS331DLTR opposed at 45° on short stiff SPI near CG, RX over CRSF to the MCU UART, Pi Zero 2W on TPU standoffs via UART plus 5 V / 3 A BEC.',
    stepDetail: 'BS5 Wire on the bench, no weapon energy (02)',
    note: 'Chain: battery → link → ESCs → motors, MCU ← RX + accel + LEDs. XT30/XT60, 16–20 AWG silicone, twist and separate power from signal, 4700 uF on 5 V. Accel flex means noisy RPM. Green LED is front — if you cannot see heading, you cannot drive. Never power the MCU from Pi USB.',
    caution: 'Green volumes are heuristic keepouts — verify against the BOM and stack list.',
    links: [
      { to: '/build', label: 'Build step 5' },
      { to: '/firmware', label: 'Firmware + failsafe' },
    ],
  },
};

export const STEP_ROLES: Record<BuildStepKey, PartRole[]> = {
  '3': ['shell-tpu'],
  '4': ['weapon-steel', 'chassis-alu', 'pod-metal', 'fastener-dark'],
  '5': ['electro-green', 'shell-tpu'],
};
