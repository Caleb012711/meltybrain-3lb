import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import {
  type TopShellFinishPreset,
  type LighteningPocketPreset,
  type BeaconWindowPreset,
} from './materials';

export interface TopArmorPlateProps {
  finish?: TopShellFinishPreset;
  pocketStyle?: LighteningPocketPreset;
  beaconWindow?: BeaconWindowPreset;
  wireframe?: boolean;
  xray?: boolean;
  selected?: boolean;
  hovered?: boolean;
  visible?: boolean;
  explode?: number;
  /** Mirror to bottom deck (Z -0.218, same pockets). Default false = top deck. */
  bottomPlate?: boolean;
  /** Override selection/isolate/hide index. Defaults to 81 (top) or 83 (bottom). */
  partIndex?: number;
  onSelect?: () => void;
  onHover?: (hovered: boolean) => void;
}

// Armor sandwich partIndex allocation (must stay distinct for
// selection / isolate / hide / focus picking):
//   80 = circular body shell (CircularOuterShell body, explode -1.5Z)
//   81 = top armor plate (this file, explode +1.8Z)
//   82 = perimeter armor ring hoop (CircularOuterShell perimeter, explode +0.5Z —
//        TODO: split ring to its own partIndex + explode vector; currently shares
//        the body group at 80 / -1.5Z, which collapses hybrid explode readability)
//   83 = bottom armor plate mirror (this file with bottomPlate, explode -1.8Z)
export const BODY_SHELL_PART_INDEX = 80;
export const TOP_ARMOR_PART_INDEX = 81;
export const RING_HOOP_PART_INDEX = 82;
export const BOTTOM_ARMOR_PART_INDEX = 83;

// Hybrid explode stack (CAD local Z, multiplied by explode 0..1), bottom-to-top:
//   body -1.5Z, ring +0.5Z, top +1.8Z, bottom -1.8Z (mirror of top).
// Ring +0.5Z sits between body and top so the hybrid profile reads as
// separate hoops instead of z-fighting the body wall.
export const BODY_EXPLODE_Z = -1.5;
export const RING_EXPLODE_Z = 0.5;
export const TOP_EXPLODE_Z = 1.8;
export const BOTTOM_EXPLODE_Z = -1.8;

const FASTENER_POSITIONS = [
  { angle: Math.PI / 8, r: 1.12 },
  { angle: (3 * Math.PI) / 8, r: 1.12 },
  { angle: (5 * Math.PI) / 8, r: 1.12 },
  { angle: (7 * Math.PI) / 8, r: 1.12 },
  { angle: (9 * Math.PI) / 8, r: 1.12 },
  { angle: (11 * Math.PI) / 8, r: 1.12 },
  { angle: (13 * Math.PI) / 8, r: 1.12 },
  { angle: (15 * Math.PI) / 8, r: 1.12 },
  // Standoff tie-down points (inner radius)
  { angle: Math.PI / 4, r: 0.72 },
  { angle: (3 * Math.PI) / 4, r: 0.72 },
  { angle: (5 * Math.PI) / 4, r: 0.72 },
  { angle: (7 * Math.PI) / 4, r: 0.72 },
];

const RADIAL_POCKET_ANGLES = [
  Math.PI / 6,
  Math.PI / 2,
  (5 * Math.PI) / 6,
  (7 * Math.PI) / 6,
  (3 * Math.PI) / 2,
  (11 * Math.PI) / 6,
];

const EMISSIVE_ORANGE = new THREE.Color('#e8490f');
const HEADING_GREEN = new THREE.Color('#00ff66');

export function TopArmorPlate({
  finish = 'titanium',
  pocketStyle = 'radial',
  beaconWindow = 'flush-prism',
  wireframe = false,
  xray = false,
  selected = false,
  hovered = false,
  visible = true,
  explode = 0,
  bottomPlate = false,
  partIndex,
  onSelect,
  onHover,
}: TopArmorPlateProps) {
  const groupRef = useRef<THREE.Group>(null);
  const resolvedPartIndex = partIndex ?? (bottomPlate ? BOTTOM_ARMOR_PART_INDEX : TOP_ARMOR_PART_INDEX);

  // Tag every mesh so selection / isolate / hide / focus-pick can distinguish
  // top (81) / bottom (83) from body shell (80) and ring hoop (82).
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.traverse((child) => {
      child.userData.partIndex = resolvedPartIndex;
    });
  }, [resolvedPartIndex]);

  // Material for the top armor plate
  const plateMat = useMemo(() => {
    if (xray) {
      return new THREE.MeshStandardMaterial({
        color: selected ? '#e8490f' : '#8a94a6',
        transparent: true,
        opacity: selected ? 0.6 : 0.28,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    let color = '#b2b9c3';
    let metalness = 0.92;
    let roughness = 0.24;
    let transparent = false;
    let opacity = 1.0;

    switch (finish) {
      case 'aluminum':
        color = '#25292e';
        metalness = 0.75;
        roughness = 0.35;
        break;
      case 'carbon':
        color = '#181a1d';
        metalness = 0.18;
        roughness = 0.4;
        break;
      case 'billet':
        color = '#dce1e8';
        metalness = 0.95;
        roughness = 0.18;
        break;
      case 'polycarbonate':
        color = '#454e59';
        metalness = 0.08;
        roughness = 0.15;
        transparent = true;
        opacity = 0.62;
        break;
      case 'titanium':
      default:
        color = '#afb7c2';
        metalness = 0.92;
        roughness = 0.25;
        break;
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      transparent,
      opacity,
      wireframe,
      side: THREE.DoubleSide,
    });

    if (selected) {
      mat.emissive.copy(EMISSIVE_ORANGE);
      mat.emissiveIntensity = 0.45;
    } else if (hovered) {
      mat.emissive.copy(EMISSIVE_ORANGE);
      mat.emissiveIntensity = 0.22;
    }

    return mat;
  }, [finish, xray, wireframe, selected, hovered]);

  useEffect(() => {
    return () => {
      plateMat.dispose();
    };
  }, [plateMat]);

  // Fastener hardware material
  const screwMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1e2124',
        metalness: 0.88,
        roughness: 0.28,
        wireframe,
      }),
    [wireframe]
  );

  useEffect(() => {
    return () => {
      screwMat.dispose();
    };
  }, [screwMat]);

  // Optical beacon window materials (translucent polycarbonate prism)
  const windowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d0f8e0',
        metalness: 0.1,
        roughness: 0.08,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const beaconGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: HEADING_GREEN,
        toneMapped: false,
      }),
    []
  );

  const pocketRecessMat = useMemo(() => {
    const m = plateMat.clone();
    m.color.multiplyScalar(0.72);
    m.roughness = Math.min(1.0, m.roughness + 0.15);
    return m;
  }, [plateMat]);

  useEffect(() => {
    return () => {
      windowMat.dispose();
      beaconGlowMat.dispose();
      pocketRecessMat.dispose();
    };
  }, [windowMat, beaconGlowMat, pocketRecessMat]);

  // Position at top of robot: Z = +0.21 in CAD local coordinates
  // Explode vector moves upward (+Z). Bottom mirror uses Z = -0.218 with
  // mirrored explode (-1.8Z) and identical pockets.
  const zPosition =
    (bottomPlate ? -0.218 : 0.218) + explode * (bottomPlate ? BOTTOM_EXPLODE_Z : TOP_EXPLODE_Z);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect?.();
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover?.(true);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onHover?.(false);
  };

  if (!visible) return null;

  return (
    <group
      ref={groupRef}
      position={[0, 0, zPosition]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* 1. Main Top Armor Plate Ring Deck (R_inner: 0.38, R_outer: 1.23, thickness: 0.02) */}
      <mesh position={[0, 0, 0.01]} material={plateMat}>
        <ringGeometry args={[0.38, 1.23, 64]} />
      </mesh>
      <mesh position={[0, 0, -0.01]} rotation={[Math.PI, 0, 0]} material={plateMat}>
        <ringGeometry args={[0.38, 1.23, 64]} />
      </mesh>
      {/* Outer edge rim band */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={plateMat}>
        <cylinderGeometry args={[1.23, 1.23, 0.02, 64, 1, true]} />
      </mesh>
      {/* Inner weapon hub clearance rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={plateMat}>
        <cylinderGeometry args={[0.38, 0.38, 0.02, 48, 1, true]} />
      </mesh>

      {/* Outer beveled chamfer ring */}
      <mesh position={[0, 0, 0.01]} rotation={[0, 0, 0]} material={plateMat}>
        <ringGeometry args={[1.20, 1.23, 64]} />
      </mesh>

      {/* 2. Lightening Pockets — N-fold symmetric by construction, do not add
          per-pocket skips: radial 6x (60° spacing, -35%) and isogrid 8x
          (45° spacing + π/8 offset, -45%) must stay rotationally symmetric
          so the spinning mass stays balanced. */}
      {pocketStyle === 'radial' && (
        <group>
          {RADIAL_POCKET_ANGLES.map((angle, idx) => {
            const x = Math.cos(angle) * 0.88;
            const y = Math.sin(angle) * 0.88;
            return (
              <group key={`pocket-${idx}`} position={[x, y, 0.005]} rotation={[0, 0, angle]}>
                {/* Recessed pocket floor */}
                <mesh material={pocketRecessMat}>
                  <boxGeometry args={[0.26, 0.14, 0.01]} />
                </mesh>
                {/* Pocket boundary lip */}
                <mesh position={[0, 0, 0.005]} material={plateMat}>
                  <boxGeometry args={[0.28, 0.012, 0.012]} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {pocketStyle === 'isogrid' && (
        <group>
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i * 2 * Math.PI) / 8 + Math.PI / 8;
            const r = 0.85;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            return (
              <group key={`isogrid-${i}`} position={[x, y, 0.006]} rotation={[0, 0, angle]}>
                <mesh material={pocketRecessMat}>
                  <cylinderGeometry args={[0.07, 0.07, 0.008, 3]} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* 3. Countersunk Mounting Holes & Flush Fasteners — full 8+4 symmetry.
          Visualization-only note: the +X optical beacon at (0.96, 0) already
          clears the outer fasteners by ~0.37 in Y, so no fastener is skipped
          and N-fold/mirror symmetry is preserved. The previous
          `Math.abs(angle) < 0.22` check was dead code (no FASTENER angle is
          near 0, and it ignored 2π wraparound for 15π/8) and asymmetric.
          If a visual cutout is ever needed, use symmetric angular distance
          so both ± sides drop together, e.g.:
            const dX = Math.abs(Math.atan2(Math.sin(pos.angle), Math.cos(pos.angle)));
            if (dX < 0.45 && pos.r > 0.8) return null; // skips ±π/8 symmetrically
      */}
      {FASTENER_POSITIONS.map((pos, idx) => {
        const x = Math.cos(pos.angle) * pos.r;
        const y = Math.sin(pos.angle) * pos.r;
        return (
          <group key={`csk-${idx}`} position={[x, y, 0.01]}>
            {/* Conical countersink recess bevel */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={plateMat}>
              <cylinderGeometry args={[0.024, 0.014, 0.014, 16, 1, true]} />
            </mesh>
            {/* Countersunk flat head screw with Torx/hex indentation */}
            <mesh position={[0, 0, -0.002]} rotation={[Math.PI / 2, 0, 0]} material={screwMat}>
              <cylinderGeometry args={[0.022, 0.012, 0.008, 16]} />
            </mesh>
            {/* Internal hex/Torx socket */}
            <mesh position={[0, 0, 0.002]} rotation={[Math.PI / 2, 0, 0]} material={screwMat}>
              <cylinderGeometry args={[0.008, 0.008, 0.004, 6]} />
            </mesh>
          </group>
        );
      })}

      {/* 4. Translucent Sensor & Heading Optical Beacon Window */}
      <group position={[0.96, 0, 0.01]}>
        {/* Retention bezel frame */}
        <mesh position={[0, 0, 0.004]} material={screwMat}>
          <boxGeometry args={[0.07, 0.12, 0.012]} />
        </mesh>

        {/* Optical window according to beaconWindow preset */}
        {beaconWindow === 'flush-prism' && (
          <>
            <mesh position={[0.004, 0, 0.006]} material={windowMat}>
              <boxGeometry args={[0.05, 0.09, 0.014]} />
            </mesh>
            <mesh position={[0.004, 0, -0.002]} material={beaconGlowMat}>
              <boxGeometry args={[0.03, 0.05, 0.006]} />
            </mesh>
          </>
        )}

        {beaconWindow === 'diffuse-dome' && (
          <>
            <mesh position={[0.004, 0, 0.01]} rotation={[0, Math.PI / 2, 0]} material={windowMat}>
              <sphereGeometry args={[0.032, 16, 12, 0, Math.PI]} />
            </mesh>
            <mesh position={[0.004, 0, 0.002]} material={beaconGlowMat}>
              <sphereGeometry args={[0.018, 12, 8]} />
            </mesh>
          </>
        )}

        {beaconWindow === 'recessed-slit' && (
          <>
            <mesh position={[-0.005, 0, 0.002]} material={windowMat}>
              <boxGeometry args={[0.03, 0.08, 0.01]} />
            </mesh>
            <mesh position={[0, 0, -0.002]} material={beaconGlowMat}>
              <boxGeometry args={[0.018, 0.06, 0.004]} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

/** Bottom armor sandwich mirror: same annulus + pockets, mirrored to Z -0.218. */
export function BottomArmorPlate(props: Omit<TopArmorPlateProps, 'bottomPlate'>) {
  return <TopArmorPlate {...props} bottomPlate />;
}
