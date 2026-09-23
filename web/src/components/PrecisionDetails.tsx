import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type PrecisionDetailsConfig } from './materials';

export interface PrecisionDetailsProps {
  config?: PrecisionDetailsConfig;
  wireframe?: boolean;
  xray?: boolean;
  explode?: number;
  visible?: boolean;
}

// 6 chassis standoff locations (connecting base plate to top deck)
const STANDOFF_POSITIONS = [
  { x: 0.65, y: 0.52 },
  { x: -0.65, y: 0.52 },
  { x: 0.82, y: 0.0 },
  { x: -0.82, y: 0.0 },
  { x: 0.65, y: -0.52 },
  { x: -0.65, y: -0.52 },
];

// Structural hardware fastener coordinates
const PERIMETER_FASTENER_LOCATIONS = [
  { x: 1.05, y: 0.42 },
  { x: -1.05, y: 0.42 },
  { x: 1.05, y: -0.42 },
  { x: -1.05, y: -0.42 },
  { x: 0.35, y: 0.95 },
  { x: -0.35, y: 0.95 },
  { x: 0.35, y: -0.95 },
  { x: -0.35, y: -0.95 },
];

export function PrecisionDetails({
  config = {
    fasteners: true,
    standoffs: true,
    bearings: true,
    timingDrive: true,
    wiring: true,
    accelerometer: true,
  },
  wireframe = false,
  xray = false,
  explode = 0,
  visible = true,
}: PrecisionDetailsProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Materials
  const blackFastenerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1d20', // Grade 12.9 black oxide
        metalness: 0.85,
        roughness: 0.3,
        wireframe,
      }),
    [wireframe]
  );

  const standoffMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: xray ? '#8a94a6' : '#c4a652', // Brass / Gold hard anodized hex standoff
        transparent: xray,
        opacity: xray ? 0.35 : 1.0,
        metalness: xray ? 0.2 : 0.88,
        roughness: xray ? 0.5 : 0.28,
        wireframe,
      }),
    [wireframe, xray]
  );

  const bearingChromeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d0d7e2',
        metalness: 0.98,
        roughness: 0.1,
        wireframe,
      }),
    [wireframe]
  );

  const rubberSealMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1b2d42',
        metalness: 0.2,
        roughness: 0.65,
        wireframe,
      }),
    [wireframe]
  );

  const pulleyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#a0a8b4',
        metalness: 0.92,
        roughness: 0.25,
        wireframe,
      }),
    [wireframe]
  );

  const beltMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#151719', // Neoprene fiberglass-reinforced belt
        metalness: 0.05,
        roughness: 0.85,
        wireframe,
      }),
    [wireframe]
  );

  const channelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2d333b', // 3D printed TPU wiring channel
        metalness: 0.08,
        roughness: 0.75,
        wireframe,
      }),
    [wireframe]
  );

  const wireRedMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d92727', // High-temp silicone wire (positive bus)
        roughness: 0.45,
      }),
    []
  );

  const wireBlackMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1c1f24', // Ground return bus
        roughness: 0.45,
      }),
    []
  );

  const wirePhaseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2570d8', // Motor phase lead
        roughness: 0.45,
      }),
    []
  );

  const pcbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0d4a22', // ENIG gold-plated solder mask PCB
        metalness: 0.35,
        roughness: 0.4,
      }),
    []
  );

  const icPackageMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#16181b', // LGA/QFN molded epoxy sensor package
        metalness: 0.6,
        roughness: 0.35,
      }),
    []
  );

  const damperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3689c9', // Sorbothane blue vibration damping isolators
        roughness: 0.6,
      }),
    []
  );

  useEffect(() => {
    return () => {
      blackFastenerMat.dispose();
      standoffMat.dispose();
      bearingChromeMat.dispose();
      rubberSealMat.dispose();
      pulleyMat.dispose();
      beltMat.dispose();
      channelMat.dispose();
      wireRedMat.dispose();
      wireBlackMat.dispose();
      wirePhaseMat.dispose();
      pcbMat.dispose();
      icPackageMat.dispose();
      damperMat.dispose();
    };
  }, [
    blackFastenerMat,
    standoffMat,
    bearingChromeMat,
    rubberSealMat,
    pulleyMat,
    beltMat,
    channelMat,
    wireRedMat,
    wireBlackMat,
    wirePhaseMat,
    pcbMat,
    icPackageMat,
    damperMat,
  ]);

  if (!visible) return null;

  // Standoff height spans from base plate (Z = -0.16) to top deck (Z = +0.20)
  const standoffHeight = 0.36;
  const standoffMidZ = 0.02 + explode * 0.5;

  return (
    <group ref={groupRef}>
      {/* ===================================================================
          1. HEXAGONAL THREADED STANDOFFS
          =================================================================== */}
      {config.standoffs && (
        <group>
          {STANDOFF_POSITIONS.map((pos, i) => (
            <group key={`standoff-${i}`} position={[pos.x, pos.y, standoffMidZ]}>
              {/* 6-sided hex prism standoff */}
              <mesh rotation={[Math.PI / 2, 0, 0]} material={standoffMat}>
                <cylinderGeometry args={[0.032, 0.032, standoffHeight, 6]} />
              </mesh>
              {/* Top M3 threaded stud */}
              <mesh position={[0, 0, standoffHeight / 2 + 0.02]} rotation={[Math.PI / 2, 0, 0]} material={blackFastenerMat}>
                <cylinderGeometry args={[0.014, 0.014, 0.04, 16]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ===================================================================
          2. PRECISION HARDWARE FASTENERS (M2.5 & M3 SOCKET HEAD CAP SCREWS)
          =================================================================== */}
      {config.fasteners && (
        <group>
          {PERIMETER_FASTENER_LOCATIONS.map((pos, i) => (
            <group key={`shcs-${i}`} position={[pos.x, pos.y, 0.205 + explode * 1.2]}>
              {/* Cylindrical knurled cap screw head */}
              <mesh rotation={[Math.PI / 2, 0, 0]} material={blackFastenerMat}>
                <cylinderGeometry args={[0.024, 0.024, 0.022, 16]} />
              </mesh>
              {/* Recessed hexagonal drive socket */}
              <mesh position={[0, 0, 0.006]} rotation={[Math.PI / 2, 0, 0]} material={pulleyMat}>
                <cylinderGeometry args={[0.012, 0.012, 0.01, 6]} />
              </mesh>
              {/* Threaded shank penetrating through chassis */}
              <mesh position={[0, 0, -0.06]} rotation={[Math.PI / 2, 0, 0]} material={blackFastenerMat}>
                <cylinderGeometry args={[0.013, 0.013, 0.1, 16]} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ===================================================================
          3. WEAPON HUB CENTRAL BEARING STACK (DUAL PRECISION BEARINGS)
          =================================================================== */}
      {config.bearings && (
        <group position={[0, 0, 0.0 + explode * 0.2]}>
          {/* Upper precision bearing */}
          <group position={[0, 0, 0.08]}>
            {/* Polished outer race */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={bearingChromeMat}>
              <cylinderGeometry args={[0.36, 0.36, 0.05, 48, 1, true]} />
            </mesh>
            {/* Polished inner race */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={bearingChromeMat}>
              <cylinderGeometry args={[0.26, 0.26, 0.05, 48, 1, true]} />
            </mesh>
            {/* Rubber / metal shield */}
            <mesh position={[0, 0, 0.025]} rotation={[0, 0, 0]} material={rubberSealMat}>
              <ringGeometry args={[0.265, 0.355, 48]} />
            </mesh>
          </group>

          {/* Lower precision bearing */}
          <group position={[0, 0, -0.08]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={bearingChromeMat}>
              <cylinderGeometry args={[0.36, 0.36, 0.05, 48, 1, true]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={bearingChromeMat}>
              <cylinderGeometry args={[0.26, 0.26, 0.05, 48, 1, true]} />
            </mesh>
            <mesh position={[0, 0, -0.025]} rotation={[Math.PI, 0, 0]} material={rubberSealMat}>
              <ringGeometry args={[0.265, 0.355, 48]} />
            </mesh>
          </group>
        </group>
      )}

      {/* ===================================================================
          4. TIMING BELT & DRIVE PULLEY SYSTEM
          =================================================================== */}
      {config.timingDrive && (
        <group position={[0, 0, -0.05 + explode * 0.1]}>
          {/* Main central drive pulley with individual gear teeth */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={pulleyMat}>
            <cylinderGeometry args={[0.38, 0.38, 0.06, 48]} />
          </mesh>
          {/* Top & bottom retaining flanges */}
          <mesh position={[0, 0, 0.032]} rotation={[0, 0, 0]} material={pulleyMat}>
            <ringGeometry args={[0.26, 0.42, 48]} />
          </mesh>
          <mesh position={[0, 0, -0.032]} rotation={[0, 0, 0]} material={pulleyMat}>
            <ringGeometry args={[0.26, 0.42, 48]} />
          </mesh>

          {/* Timing belt profile wrapped around the drive assembly */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={beltMat}>
            <cylinderGeometry args={[0.405, 0.405, 0.055, 48, 1, true]} />
          </mesh>
        </group>
      )}

      {/* ===================================================================
          5. PRINTED WIRING CHANNELS & FLEXIBLE SILICONE HARNESS
          =================================================================== */}
      {config.wiring && (
        <group position={[0, 0, -0.12 + explode * 0.3]}>
          {/* Left wiring channel guide */}
          <mesh position={[-0.45, 0.18, 0]} material={channelMat}>
            <boxGeometry args={[0.22, 0.045, 0.03]} />
          </mesh>
          {/* Right wiring channel guide */}
          <mesh position={[0.45, 0.18, 0]} material={channelMat}>
            <boxGeometry args={[0.22, 0.045, 0.03]} />
          </mesh>

          {/* Heavy gauge high-current DC power bus wires (Red & Black) */}
          <mesh position={[0, 0.32, 0.01]} rotation={[0, 0, Math.PI / 2]} material={wireRedMat}>
            <cylinderGeometry args={[0.015, 0.015, 0.72, 16]} />
          </mesh>
          <mesh position={[0, 0.36, 0.01]} rotation={[0, 0, Math.PI / 2]} material={wireBlackMat}>
            <cylinderGeometry args={[0.015, 0.015, 0.72, 16]} />
          </mesh>

          {/* 3-phase high-flex brushless motor phase leads */}
          <mesh position={[-0.35, -0.22, 0.01]} rotation={[0, 0, 0.4]} material={wirePhaseMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.38, 16]} />
          </mesh>
          <mesh position={[0.35, -0.22, 0.01]} rotation={[0, 0, -0.4]} material={wirePhaseMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.38, 16]} />
          </mesh>
        </group>
      )}

      {/* ===================================================================
          6. PRECISION MELTYBRAIN ACCELEROMETER & IMU PEDESTAL MOUNT
          =================================================================== */}
      {config.accelerometer && (
        <group position={[0.18, 0.0, -0.06 + explode * 0.4]}>
          {/* Aluminum mounting bracket pedestal */}
          <mesh position={[0, 0, -0.02]} material={channelMat}>
            <boxGeometry args={[0.14, 0.14, 0.025]} />
          </mesh>

          {/* 4x Sorbothane anti-vibration damping isolators */}
          {[
            [-0.055, -0.055],
            [0.055, -0.055],
            [-0.055, 0.055],
            [0.055, 0.055],
          ].map(([dx, dy], k) => (
            <mesh key={`damp-${k}`} position={[dx, dy, -0.005]} material={damperMat}>
              <cylinderGeometry args={[0.012, 0.012, 0.015, 12]} />
            </mesh>
          ))}

          {/* Sensor PCB with ENIG gold contacts */}
          <mesh position={[0, 0, 0.008]} material={pcbMat}>
            <boxGeometry args={[0.12, 0.12, 0.008]} />
          </mesh>

          {/* High-g H3LIS331DL / BMI088 IC accelerometer package */}
          <mesh position={[0, 0, 0.016]} material={icPackageMat}>
            <boxGeometry args={[0.045, 0.045, 0.012]} />
          </mesh>

          {/* Decoupling SMT capacitors */}
          <mesh position={[0.035, 0, 0.014]} material={standoffMat}>
            <boxGeometry args={[0.012, 0.02, 0.008]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
