import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';

import {
  type ShellMaterialPreset,
  type ShellProfilePreset,
} from './materials';

interface CircularShellProps {
  material?: ShellMaterialPreset;
  profile?: ShellProfilePreset;
  wireframe?: boolean;
  xray?: boolean;
  selected?: boolean;
  hovered?: boolean;
  visible?: boolean;
  explode?: number;
  onSelect?: () => void;
  onHover?: (hovered: boolean) => void;
}

const FASTENER_COUNT = 8;
const EMISSIVE_ORANGE = new THREE.Color('#e8490f');
const HEADING_GREEN = new THREE.Color('#00ff66');

export function CircularOuterShell({
  material = 'titanium',
  profile = 'body',
  wireframe = false,
  xray = false,
  selected = false,
  hovered = false,
  visible = true,
  explode = 0,
  onSelect,
  onHover,
}: CircularShellProps) {
  const groupRef = useRef<THREE.Group>(null);

  // God Node split → shell-tpu (body tub) / weapon-steel (perimeter hoop) / chassis-alu roles.
  // Single Responsibility + Interface Segregation: body and ring get small,
  // focused materials instead of one shared shellMat God Node.
  // Body (R1.25 tub) = shell-tpu: color follows material preset, physical
  // response forced to TPU (metalness ~0.05, roughness ~0.88).
  // Perimeter hoop (R2.05 ring) = weapon-steel AR500 (#3b4046, metalness 0.75,
  // roughness 0.5) regardless of preset — default steel.
  const bodyShellMat = useMemo(() => {
    if (xray) {
      return new THREE.MeshStandardMaterial({
        color: selected ? '#e8490f' : '#8a94a6',
        transparent: true,
        opacity: selected ? 0.55 : 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }

    let color = '#b8bfc7';

    switch (material) {
      case 'aluminum':
        color = '#d4d9df';
        break;
      case 'carbon':
        color = '#1c1e22';
        break;
      case 'tpu-orange':
        color = '#f05510';
        break;
      case 'tpu-stealth':
        color = '#27323f';
        break;
      case 'titanium':
      default:
        color = '#b0b7c0';
        break;
    }

    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.05,
      roughness: 0.88,
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
  }, [material, xray, wireframe, selected, hovered]);

  // Perimeter hoop weapon-steel (AR500 dark #3b4046, metalness 0.75, roughness 0.5).
  // Forced steel look regardless of body material preset.
  const ringSteelMat = useMemo(() => {
    if (xray) {
      return new THREE.MeshStandardMaterial({
        color: selected ? '#e8490f' : '#8a94a6',
        transparent: true,
        opacity: selected ? 0.55 : 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    }
    const mat = new THREE.MeshStandardMaterial({
      color: '#3b4046',
      metalness: 0.75,
      roughness: 0.5,
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
  }, [xray, wireframe, selected, hovered]);

  // Clean up split materials on unmount / preset change
  useEffect(() => {
    return () => {
      bodyShellMat.dispose();
      ringSteelMat.dispose();
    };
  }, [bodyShellMat, ringSteelMat]);

  // Fastener hardware material
  const boltMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#2a2d32',
      metalness: 0.85,
      roughness: 0.3,
      wireframe,
    });
  }, [wireframe]);

  useEffect(() => {
    return () => {
      boltMat.dispose();
    };
  }, [boltMat]);

  // Heading LED optical window materials
  const ledLensMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: HEADING_GREEN,
      toneMapped: false,
    });
  }, []);

  const slotBezelMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#15171a',
      metalness: 0.8,
      roughness: 0.4,
    });
  }, []);

  useEffect(() => {
    return () => {
      ledLensMat.dispose();
      slotBezelMat.dispose();
    };
  }, [ledLensMat, slotBezelMat]);

  // Geometry dimensions in CAD local coordinate frame:
  // solid_080 was centered at X=0, Y=0.004, Z=-0.246 with height 0.396.
  // In CAD local frame, Z is the vertical weapon/spin axis.
  const zOffset = -0.246 - explode * 1.5;
  const showBody = profile === 'body' || profile === 'hybrid';
  const showPerimeter = profile === 'perimeter' || profile === 'hybrid';

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        child.userData.partIndex = 80;
      });
    }
  }, [showBody, showPerimeter]);

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
      position={[0, 0, zOffset]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* ===================================================================
          1. BODY CIRCULAR SHELL (R_outer ~ 1.255, R_inner ~ 1.175, H ~ 0.41)
          Direct circular replacement for squarish solid_080 (~137.7 x 131.5 mm).
          Continuous seamless geometry without z-fighting or protruding chamfers.
          =================================================================== */}
      {showBody && (
        <group>
          {/* Main cylindrical outer shell wall (from Z = -0.18 to +0.18) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={bodyShellMat}>
            <cylinderGeometry args={[1.255, 1.255, 0.36, 64, 1, true]} />
          </mesh>

          {/* Inner wall for solid thickness (from Z = -0.205 to +0.205) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={bodyShellMat}>
            <cylinderGeometry args={[1.175, 1.175, 0.41, 64, 1, true]} />
          </mesh>

          {/* Top chamfered rim (bevels from R=1.255 at Z=+0.18 to R=1.23 at Z=+0.205) */}
          <mesh position={[0, 0, 0.1925]} rotation={[Math.PI / 2, 0, 0]} material={bodyShellMat}>
            <cylinderGeometry args={[1.23, 1.255, 0.025, 64, 1, true]} />
          </mesh>
          {/* Top flat ring flange (Z = +0.205, R=1.175 to 1.23) */}
          <mesh position={[0, 0, 0.205]} rotation={[0, 0, 0]} material={bodyShellMat}>
            <ringGeometry args={[1.175, 1.23, 64]} />
          </mesh>

          {/* Bottom chamfered skid lip (bevels from R=1.255 at Z=-0.18 to R=1.23 at Z=-0.205) */}
          <mesh position={[0, 0, -0.1925]} rotation={[Math.PI / 2, 0, 0]} material={bodyShellMat}>
            <cylinderGeometry args={[1.255, 1.23, 0.025, 64, 1, true]} />
          </mesh>
          {/* Bottom flat ring flange (Z = -0.205, R=1.175 to 1.23) */}
          <mesh position={[0, 0, -0.205]} rotation={[Math.PI, 0, 0]} material={bodyShellMat}>
            <ringGeometry args={[1.175, 1.23, 64]} />
          </mesh>

          {/* Mid-body reinforcement armor belt (horizontal rib) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={bodyShellMat}>
            <cylinderGeometry args={[1.268, 1.268, 0.07, 64, 1, true]} />
          </mesh>

          {/* Heading Indicator Bezel & Optical System on forward perimeter (+X, 0).
              VISUALIZATION-ONLY — excluded from mass/inertia: single +X bezel
              breaks rotational symmetry (3-5g @ 60mm @ 4000RPM ≈ 52N hop).
              Do not add to mass rollup; symmetric flight config omits it. */}
          <group position={[1.245, 0, 0.0]}>
            {/* Outer bezel housing */}
            <mesh position={[-0.015, 0, 0]} material={slotBezelMat}>
              <boxGeometry args={[0.05, 0.18, 0.09]} />
            </mesh>
            {/* Forward dual emerald optical lenses pointing along +X */}
            <mesh position={[0.012, -0.045, 0]} rotation={[0, Math.PI / 2, 0]} material={ledLensMat}>
              <cylinderGeometry args={[0.024, 0.024, 0.018, 16]} />
            </mesh>
            <mesh position={[0.012, 0.045, 0]} rotation={[0, Math.PI / 2, 0]} material={ledLensMat}>
              <cylinderGeometry args={[0.024, 0.024, 0.018, 16]} />
            </mesh>
          </group>

          {/* Top-deck optical heading prism on upper flange (visible in top-down cam).
              VISUALIZATION-ONLY — excluded from mass/inertia with the +X bezel above. */}
          <mesh position={[1.2025, 0, 0.206]} material={ledLensMat}>
            <boxGeometry args={[0.038, 0.06, 0.012]} />
          </mesh>

          {/* Precision socket head cap screws along upper mounting flange.
              Full-circle symmetric (8x) — visualization-only, excluded from mass. */}
          {Array.from({ length: FASTENER_COUNT }, (_, i) => {
            const angle = (i * 2 * Math.PI) / FASTENER_COUNT;
            const radius = 1.2025; // perfectly centered on [1.175, 1.23] flange
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <group key={`fastener-${i}`} position={[x, y, 0.205]}>
                {/* Bolt head */}
                <mesh position={[0, 0, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={boltMat}>
                  <cylinderGeometry args={[0.018, 0.018, 0.012, 16]} />
                </mesh>
                {/* Recessed socket hex indentation */}
                <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={slotBezelMat}>
                  <cylinderGeometry args={[0.010, 0.010, 0.005, 6]} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* ===================================================================
          2. PERIMETER ARMOR RING HOOP (R_outer ~ 2.05, R_inner ~ 1.97, H ~ 0.39)
          Combat perimeter armor band encircling outer impact weapon teeth.
          weapon-steel role: AR500 hoop clamped by sandwich — LiftOff: no bolt
          holes in rim, so no PERIMETER_FASTENERS ring bolts rendered here.
          =================================================================== */}
      {showPerimeter && (
        <group>
          {/* Outer armor hoop cylindrical band (from Z = -0.17 to +0.17) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={ringSteelMat}>
            <cylinderGeometry args={[2.05, 2.05, 0.34, 64, 1, true]} />
          </mesh>
          {/* Inner hoop wall (from Z = -0.195 to +0.195) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={ringSteelMat}>
            <cylinderGeometry args={[1.97, 1.97, 0.39, 64, 1, true]} />
          </mesh>

          {/* Chamfered top & bottom edges */}
          <mesh position={[0, 0, 0.1825]} rotation={[Math.PI / 2, 0, 0]} material={ringSteelMat}>
            <cylinderGeometry args={[2.02, 2.05, 0.025, 64, 1, true]} />
          </mesh>
          <mesh position={[0, 0, 0.195]} rotation={[0, 0, 0]} material={ringSteelMat}>
            <ringGeometry args={[1.97, 2.02, 64]} />
          </mesh>

          <mesh position={[0, 0, -0.1825]} rotation={[Math.PI / 2, 0, 0]} material={ringSteelMat}>
            <cylinderGeometry args={[2.05, 2.02, 0.025, 64, 1, true]} />
          </mesh>
          <mesh position={[0, 0, -0.195]} rotation={[Math.PI, 0, 0]} material={ringSteelMat}>
            <ringGeometry args={[1.97, 2.02, 64]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
