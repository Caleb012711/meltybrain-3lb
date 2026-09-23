import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type ThreeEvent } from '@react-three/fiber';
import { type WheelTreadType } from './materials';

export interface WheelPodAssemblyProps {
  treadType?: WheelTreadType;
  explode?: number;
  wireframe?: boolean;
  xray?: boolean;
  showBearingsCutaway?: boolean;
  showMotorDetails?: boolean;
  selected?: boolean;
  hovered?: boolean;
  visible?: boolean;
  onSelect?: () => void;
  onHover?: (h: boolean) => void;
}

const EMISSIVE_ORANGE = new THREE.Color('#e8490f');
const BEARING_BALL_COUNT = 8;
const CHEVRON_TREAD_COUNT = 24;
const CLEAT_TOOTH_COUNT = 16;

export function WheelPodAssembly({
  treadType = 'urethane',
  explode = 0,
  wireframe = false,
  xray = false,
  showBearingsCutaway = false,
  showMotorDetails = true,
  selected = false,
  hovered = false,
  visible = true,
  onSelect,
  onHover,
}: WheelPodAssemblyProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Materials
  const aluMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: xray ? '#8a94a6' : '#d0d6de',
        transparent: xray,
        opacity: xray ? 0.35 : 1.0,
        metalness: xray ? 0.2 : 0.88,
        roughness: xray ? 0.5 : 0.28,
        wireframe,
      }),
    [wireframe, xray]
  );

  const bracketMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: xray ? '#6a7280' : '#2b2f36',
        transparent: xray,
        opacity: xray ? 0.35 : 1.0,
        metalness: xray ? 0.2 : 0.72,
        roughness: xray ? 0.5 : 0.38,
        wireframe,
      }),
    [wireframe, xray]
  );

  const steelAxleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8b929c',
        metalness: 0.95,
        roughness: 0.18,
        wireframe,
      }),
    [wireframe]
  );

  const bearingSteelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#bcc5d1',
        metalness: 0.96,
        roughness: 0.12,
        wireframe,
      }),
    [wireframe]
  );

  const bearingShieldMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2a4563',
        metalness: 0.3,
        roughness: 0.6,
        wireframe,
      }),
    [wireframe]
  );

  const motorCanMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1c20',
        metalness: 0.85,
        roughness: 0.3,
        wireframe,
      }),
    [wireframe]
  );

  const copperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d46e38',
        metalness: 0.7,
        roughness: 0.35,
      }),
    []
  );

  const urethaneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e84e1b', // High-visibility performance cast urethane
        metalness: 0.05,
        roughness: 0.78,
        wireframe,
      }),
    [wireframe]
  );

  const tiCleatMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa0a8',
        metalness: 0.94,
        roughness: 0.25,
        wireframe,
      }),
    [wireframe]
  );

  const hardwareMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a1d21',
        metalness: 0.9,
        roughness: 0.25,
        wireframe,
      }),
    [wireframe]
  );

  useEffect(() => {
    return () => {
      aluMat.dispose();
      bracketMat.dispose();
      steelAxleMat.dispose();
      bearingSteelMat.dispose();
      bearingShieldMat.dispose();
      motorCanMat.dispose();
      copperMat.dispose();
      urethaneMat.dispose();
      tiCleatMat.dispose();
      hardwareMat.dispose();
    };
  }, [
    aluMat,
    bracketMat,
    steelAxleMat,
    bearingSteelMat,
    bearingShieldMat,
    motorCanMat,
    copperMat,
    urethaneMat,
    tiCleatMat,
    hardwareMat,
  ]);

  // Handle selection / hover highlights
  useEffect(() => {
    const highlight = (mat: THREE.MeshStandardMaterial) => {
      if (selected) {
        mat.emissive.copy(EMISSIVE_ORANGE);
        mat.emissiveIntensity = 0.45;
      } else if (hovered) {
        mat.emissive.copy(EMISSIVE_ORANGE);
        mat.emissiveIntensity = 0.22;
      } else {
        mat.emissiveIntensity = 0;
      }
    };
    [aluMat, bracketMat, urethaneMat, tiCleatMat].forEach(highlight);
  }, [selected, hovered, aluMat, bracketMat, urethaneMat, tiCleatMat]);

  if (!visible) return null;

  // Explode offsets along local wheel spindle axis (X)
  const expBracket = -explode * 0.9;
  const expMotor = -explode * 0.4;
  const expBearing1 = -explode * 0.15;
  const expHub = 0;
  const expBearing2 = explode * 0.25;
  const expAxle = explode * 0.6;
  const expTread = explode * 0.35;

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

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* ===================================================================
          1. CNC 7075-T6 MOTOR BRACKET & CLAMP MOUNT
          =================================================================== */}
      <group position={[expBracket, 0, 0]}>
        {/* Chassis mounting base plate */}
        <mesh position={[-0.42, 0, -0.16]} material={bracketMat}>
          <boxGeometry args={[0.08, 0.52, 0.06]} />
        </mesh>
        {/* Chassis mounting fastener holes */}
        <mesh position={[-0.42, -0.21, -0.16]} rotation={[0, 0, 0]} material={hardwareMat}>
          <cylinderGeometry args={[0.016, 0.016, 0.065, 12]} />
        </mesh>
        <mesh position={[-0.42, 0.21, -0.16]} rotation={[0, 0, 0]} material={hardwareMat}>
          <cylinderGeometry args={[0.016, 0.016, 0.065, 12]} />
        </mesh>

        {/* Upright split-clamp bracket arm */}
        <mesh position={[-0.38, 0, 0]} material={bracketMat}>
          <boxGeometry args={[0.08, 0.44, 0.42]} />
        </mesh>
        {/* Clamp bore cutout */}
        <mesh position={[-0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={hardwareMat}>
          <cylinderGeometry args={[0.18, 0.18, 0.082, 32, 1, true]} />
        </mesh>
        {/* Split pinch clamp gap and M3 clamp bolt */}
        <mesh position={[-0.38, 0.22, 0]} material={hardwareMat}>
          <boxGeometry args={[0.082, 0.008, 0.14]} />
        </mesh>
        <mesh position={[-0.38, 0.24, 0.04]} rotation={[0, Math.PI / 2, 0]} material={hardwareMat}>
          <cylinderGeometry args={[0.018, 0.018, 0.11, 16]} />
        </mesh>
      </group>

      {/* ===================================================================
          2. PROPDRIVE 2836 1200KV BRUSHLESS MOTOR ASSEMBLY
          =================================================================== */}
      {showMotorDetails && (
        <group position={[expMotor, 0, 0]}>
          {/* Motor stator housing & cooling fins */}
          <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={bracketMat}>
            <cylinderGeometry args={[0.17, 0.17, 0.12, 32]} />
          </mesh>
          {/* Copper windings visible inside motor vents */}
          <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={copperMat}>
            <cylinderGeometry args={[0.15, 0.15, 0.10, 16]} />
          </mesh>
          {/* Rotating motor bell / outrunner can */}
          <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={motorCanMat}>
            <cylinderGeometry args={[0.18, 0.18, 0.14, 32]} />
          </mesh>
          {/* Motor face cooling slots */}
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i * 2 * Math.PI) / 6;
            const cy = Math.cos(a) * 0.11;
            const cz = Math.sin(a) * 0.11;
            return (
              <mesh key={`vent-${i}`} position={[-0.07, cy, cz]} material={hardwareMat}>
                <boxGeometry args={[0.008, 0.025, 0.045]} />
              </mesh>
            );
          })}
          {/* Motor rear knurled collar */}
          <mesh position={[-0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={motorCanMat}>
            <cylinderGeometry args={[0.182, 0.182, 0.03, 32]} />
          </mesh>
        </group>
      )}

      {/* ===================================================================
          3. PRECISION 6MM HARDENED DEAD AXLE & RETAINING HARDWARE
          =================================================================== */}
      <group position={[expAxle, 0, 0]}>
        {/* Ground 6mm dead axle shaft extending through the assembly */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={steelAxleMat}>
          <cylinderGeometry args={[0.045, 0.045, 0.88, 32]} />
        </mesh>
        {/* Axle retaining circlip snap rings */}
        <mesh position={[-0.39, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={hardwareMat}>
          <cylinderGeometry args={[0.058, 0.058, 0.012, 16]} />
        </mesh>
        <mesh position={[0.39, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={hardwareMat}>
          <cylinderGeometry args={[0.058, 0.058, 0.012, 16]} />
        </mesh>
        {/* Precision tuning shims (under 1mm endplay) */}
        <mesh position={[-0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steelAxleMat}>
          <cylinderGeometry args={[0.065, 0.065, 0.006, 24]} />
        </mesh>
        <mesh position={[0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steelAxleMat}>
          <cylinderGeometry args={[0.065, 0.065, 0.006, 24]} />
        </mesh>
      </group>

      {/* ===================================================================
          4. DUAL 626ZZ DEEP GROOVE PRECISION BALL BEARINGS
          =================================================================== */}
      {/* Inner Bearing (Position: -0.14) */}
      <group position={[expBearing1 - 0.14, 0, 0]}>
        {/* Outer race (OD: 19mm ~ 0.14 CAD) */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={bearingSteelMat}>
          <cylinderGeometry args={[0.138, 0.138, 0.048, 32, 1, true]} />
        </mesh>
        {/* Inner race (ID: 6mm ~ 0.045 CAD) */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={bearingSteelMat}>
          <cylinderGeometry args={[0.052, 0.052, 0.048, 32, 1, true]} />
        </mesh>
        {/* Bearing shields / seals */}
        {!showBearingsCutaway ? (
          <>
            <mesh position={[-0.022, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={bearingShieldMat}>
              <ringGeometry args={[0.053, 0.136, 32]} />
            </mesh>
            <mesh position={[0.022, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={bearingShieldMat}>
              <ringGeometry args={[0.053, 0.136, 32]} />
            </mesh>
          </>
        ) : (
          /* Cutaway view: Chrome steel balls in cage */
          Array.from({ length: BEARING_BALL_COUNT }, (_, b) => {
            const angle = (b * 2 * Math.PI) / BEARING_BALL_COUNT;
            const by = Math.cos(angle) * 0.095;
            const bz = Math.sin(angle) * 0.095;
            return (
              <mesh key={`ball1-${b}`} position={[0, by, bz]} material={bearingSteelMat}>
                <sphereGeometry args={[0.026, 12, 12]} />
              </mesh>
            );
          })
        )}
      </group>

      {/* Outer Bearing (Position: +0.14) */}
      <group position={[expBearing2 + 0.14, 0, 0]}>
        {/* Outer race */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={bearingSteelMat}>
          <cylinderGeometry args={[0.138, 0.138, 0.048, 32, 1, true]} />
        </mesh>
        {/* Inner race */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={bearingSteelMat}>
          <cylinderGeometry args={[0.052, 0.052, 0.048, 32, 1, true]} />
        </mesh>
        {/* Bearing shields */}
        {!showBearingsCutaway ? (
          <>
            <mesh position={[-0.022, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={bearingShieldMat}>
              <ringGeometry args={[0.053, 0.136, 32]} />
            </mesh>
            <mesh position={[0.022, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={bearingShieldMat}>
              <ringGeometry args={[0.053, 0.136, 32]} />
            </mesh>
          </>
        ) : (
          /* Chrome steel balls in cage */
          Array.from({ length: BEARING_BALL_COUNT }, (_, b) => {
            const angle = (b * 2 * Math.PI) / BEARING_BALL_COUNT;
            const by = Math.cos(angle) * 0.095;
            const bz = Math.sin(angle) * 0.095;
            return (
              <mesh key={`ball2-${b}`} position={[0, by, bz]} material={bearingSteelMat}>
                <sphereGeometry args={[0.026, 12, 12]} />
              </mesh>
            );
          })
        )}
      </group>

      {/* Internal precision tubular bearing spacer sleeve between bearings */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={steelAxleMat}>
        <cylinderGeometry args={[0.058, 0.058, 0.22, 24, 1, true]} />
      </mesh>

      {/* ===================================================================
          5. PRECISION MACHINED 7075 ALUMINUM WHEEL HUB
          =================================================================== */}
      <group position={[expHub, 0, 0]}>
        {/* Central hub cylinder with bearing counterbores */}
        <mesh rotation={[0, 0, Math.PI / 2]} material={aluMat}>
          <cylinderGeometry args={[0.22, 0.22, 0.28, 32]} />
        </mesh>
        {/* Outer hub clamping flange */}
        <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={aluMat}>
          <cylinderGeometry args={[0.28, 0.28, 0.04, 32]} />
        </mesh>
        {/* Inner hub drive shoulder */}
        <mesh position={[-0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={aluMat}>
          <cylinderGeometry args={[0.26, 0.26, 0.04, 32]} />
        </mesh>
        {/* Weight-relieving pocket holes in hub face */}
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i * 2 * Math.PI) / 5;
          const py = Math.cos(a) * 0.18;
          const pz = Math.sin(a) * 0.18;
          return (
            <mesh key={`hub-hole-${i}`} position={[0.13, py, pz]} rotation={[0, 0, Math.PI / 2]} material={hardwareMat}>
              <cylinderGeometry args={[0.035, 0.035, 0.045, 16]} />
            </mesh>
          );
        })}
      </group>

      {/* ===================================================================
          6. TIRE TREAD: CAST URETHANE TREAD VS TITANIUM CLEATS
          =================================================================== */}
      {treadType === 'urethane' ? (
        /* High-traction Shore 60A Cast Urethane Tire with molded chevron treads */
        <group position={[expTread, 0, 0]}>
          {/* Base urethane tire band */}
          <mesh rotation={[0, 0, Math.PI / 2]} material={urethaneMat}>
            <cylinderGeometry args={[0.35, 0.35, 0.28, 36]} />
          </mesh>
          {/* Directional chevron grip ribs along the tire circumference */}
          {Array.from({ length: CHEVRON_TREAD_COUNT }, (_, i) => {
            const a = (i * 2 * Math.PI) / CHEVRON_TREAD_COUNT;
            const ty = Math.cos(a) * 0.352;
            const tz = Math.sin(a) * 0.352;
            return (
              <group key={`chevron-${i}`} position={[0, ty, tz]} rotation={[a, 0, 0]}>
                <mesh position={[-0.05, 0, 0]} rotation={[0, 0, 0.25]} material={urethaneMat}>
                  <boxGeometry args={[0.12, 0.022, 0.024]} />
                </mesh>
                <mesh position={[0.05, 0, 0]} rotation={[0, 0, -0.25]} material={urethaneMat}>
                  <boxGeometry args={[0.12, 0.022, 0.024]} />
                </mesh>
              </group>
            );
          })}
        </group>
      ) : (
        /* Laser-Cut Grade 5 Titanium Cleat Wheel for biting wood arena floors */
        <group position={[expTread, 0, 0]}>
          {/* Titanium base ring */}
          <mesh rotation={[0, 0, Math.PI / 2]} material={tiCleatMat}>
            <cylinderGeometry args={[0.33, 0.33, 0.26, 32]} />
          </mesh>
          {/* Sharp laser-cut titanium tooth cleats */}
          {Array.from({ length: CLEAT_TOOTH_COUNT }, (_, i) => {
            const a = (i * 2 * Math.PI) / CLEAT_TOOTH_COUNT;
            const ty = Math.cos(a) * 0.34;
            const tz = Math.sin(a) * 0.34;
            return (
              <group key={`cleat-${i}`} position={[0, ty, tz]} rotation={[a, 0, 0]}>
                <mesh position={[0, 0, 0.03]} rotation={[0, 0, 0]} material={tiCleatMat}>
                  <boxGeometry args={[0.22, 0.032, 0.048]} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
}
