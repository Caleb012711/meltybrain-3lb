import * as THREE from 'three';

export type PartRole =
  | 'weapon-steel'
  | 'chassis-alu'
  | 'pod-metal'
  | 'fastener-dark'
  | 'shell-tpu'
  | 'electro-green';

export const ROLE_LABELS: Record<PartRole, string> = {
  'weapon-steel': 'Weapon steel (AR500)',
  'chassis-alu': 'Chassis aluminum (6061)',
  'pod-metal': 'Pod metal (Ti/hub)',
  'fastener-dark': 'Fastener (12.9 black)',
  'shell-tpu': 'Shell (TPU 95A)',
  'electro-green': 'Electronics keepout',
};

export const ROLE_CSS: Record<PartRole, string> = {
  'weapon-steel': '#3b4046',
  'chassis-alu': '#c9ced4',
  'pod-metal': '#a49d92',
  'fastener-dark': '#2e3237',
  'shell-tpu': '#33404e',
  'electro-green': '#0f6a3a',
};

// MeshStandardMaterial params: metalness restrained so roles read correctly
// with AND without the procedural studio env map (full metal goes black
// without image-based lighting). DoubleSide so thin sheet solids never cull.
const ROLE_PARAMS: Record<PartRole, THREE.MeshStandardMaterialParameters> = {
  'weapon-steel': { color: 0x3b4046, metalness: 0.75, roughness: 0.5, side: THREE.DoubleSide },
  'chassis-alu': { color: 0xc9ced4, metalness: 0.7, roughness: 0.42, side: THREE.DoubleSide },
  'pod-metal': { color: 0xa49d92, metalness: 0.75, roughness: 0.36, side: THREE.DoubleSide },
  'fastener-dark': { color: 0x2e3237, metalness: 0.65, roughness: 0.55, side: THREE.DoubleSide },
  'shell-tpu': { color: 0x33404e, metalness: 0.0, roughness: 0.88, side: THREE.DoubleSide },
  'electro-green': { color: 0x0f6a3a, metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide },
};

const cache = new Map<PartRole, THREE.MeshStandardMaterial>();

export function roleMaterial(role: string): THREE.MeshStandardMaterial {
  const r = (Object.keys(ROLE_PARAMS) as PartRole[]).includes(role as PartRole)
    ? (role as PartRole)
    : 'fastener-dark';
  let m = cache.get(r);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ ...ROLE_PARAMS[r] });
    cache.set(r, m);
  }
  return m;
}

export function indexColor(i: number, n: number): THREE.Color {
  return new THREE.Color(`hsl(${Math.round((i / Math.max(1, n)) * 360)}, 55%, 45%)`);
}

export interface PartInfo {
  node: string; // solid_000
  role: string;
  vol_cm3: number;
  bbox_mm: [number, number, number];
  faces: number;
  dropped_from_glb?: boolean; // thread speck: stats only, no viewer mesh
}

export function partLabel(p: PartInfo, index: number): string {
  const dims = p.bbox_mm.map((d) => d.toFixed(1)).join('×');
  return `#${index} ${p.role} · ${dims} mm · ${p.vol_cm3} cm³ · ${massLabel(p.role, p.vol_cm3)}`;
}

// Mass from measured volume × material density. Weapon shows both sides of
// the steel-vs-titanium decision; keepouts show an aluminum reference.
export function massLabel(role: string, volCm3: number): string {
  const g = (d: number) => `${(volCm3 * d).toFixed(1)} g`;
  if (role === 'weapon-steel') return `${g(7.85)} steel / ${g(4.43)} Ti`;
  if (role === 'shell-tpu') return `${g(1.21)} TPU`;
  if (role === 'electro-green') return `${g(2.7)} alu ref (keepout)`;
  if (role === 'chassis-alu') return `${g(2.7)} alu`;
  if (role === 'pod-metal') return `${g(2.7)} alu / ${g(4.43)} Ti`;
  return `${g(7.85)} steel`;
}
