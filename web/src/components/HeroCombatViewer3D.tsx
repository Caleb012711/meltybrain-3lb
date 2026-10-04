import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export type WeaponMode = 'A' | 'B' | 'C' | 'D';
export type LightingPreset = 'cyber' | 'studio' | 'arena' | 'ir';

export interface WeaponModeInfo {
  id: WeaponMode;
  name: string;
  shortName: string;
  keJoules: number;
  tipSpeedMph: number;
  centripetalG: number;
  description: string;
  badge: string;
  color: string;
}

export const WEAPON_MODES: Record<WeaponMode, WeaponModeInfo> = {
  A: {
    id: 'A',
    name: 'Mode A: 2-Tooth High-KE Ring',
    shortName: '2-Tooth High-KE Ring',
    keJoules: 415,
    tipSpeedMph: 145,
    centripetalG: 780,
    description: 'Symmetric dual hardened AR500 steel strike teeth (0.25" plate). Balanced impact frequency for maximum structural energy transfer.',
    badge: '415 J // BALANCED STRIKE',
    color: 'var(--neon-crimson, #ff2a55)',
  },
  B: {
    id: 'B',
    name: 'Mode B: Single Deep-Bite Razor + Tungsten Wedge',
    shortName: 'Single Deep-Bite Razor',
    keJoules: 442,
    tipSpeedMph: 154,
    centripetalG: 840,
    description: 'Single asymmetric 24mm deep-bite chisel tooth paired with 19.3 g/cm³ polished tungsten counterweight wedge. 2× deeper bite depth per revolution.',
    badge: '442 J // DEEP BITE RAZOR',
    color: 'var(--neon-amber, #ffaa00)',
  },
  C: {
    id: 'C',
    name: 'Mode C: Low-Profile Undercutter Scoop',
    shortName: 'Undercutter Scoop',
    keJoules: 388,
    tipSpeedMph: 138,
    centripetalG: 720,
    description: 'Low-slung 20° bevelled AR500 ground scoop plate that slides beneath opponent chassis to sever drive tires and pop bots into the air.',
    badge: '388 J // GROUND SCOOP',
    color: 'var(--neon-cyan, #00f0ff)',
  },
  D: {
    id: 'D',
    name: 'Mode D: Skirt-Breaker Can-Opener',
    shortName: 'Skirt-Breaker Can-Opener',
    keJoules: 428,
    tipSpeedMph: 148,
    centripetalG: 805,
    description: 'Dual upward-raked serrated shark teeth engineered to hook under titanium side skirts, puncture sheet armor, and rip chassis panels apart.',
    badge: '428 J // ARMOR PUNCTURE',
    color: 'var(--neon-purple, #a855f7)',
  },
};

interface RobotModelProps {
  weaponMode: WeaponMode;
  rpm: number;
  isSpinning: boolean;
  exploded: number;
  strobeLaser: boolean;
}

function RobotModel({ weaponMode, rpm, isSpinning, exploded, strobeLaser }: RobotModelProps) {
  const spinningGroupRef = useRef<THREE.Group>(null);
  const currentRpmRef = useRef(0);
  const laserRef = useRef<THREE.Mesh>(null);
  const strobeLightRef = useRef<THREE.PointLight>(null);

  // Smooth rotation update
  useFrame((_, delta) => {
    const targetRpm = isSpinning ? rpm : 0;
    // Smooth acceleration / deceleration
    currentRpmRef.current = THREE.MathUtils.damp(currentRpmRef.current, targetRpm, 3.5, delta);

    if (spinningGroupRef.current && currentRpmRef.current > 0.5) {
      // Scale visual rotation rate for smooth WebGL rendering
      const radPerSec = (currentRpmRef.current / 60) * Math.PI * 2 * 0.18;
      spinningGroupRef.current.rotation.y += radPerSec * delta;
    }

    // Laser strobe beacon pulsing
    if (laserRef.current && strobeLaser) {
      if (currentRpmRef.current > 50) {
        // Melty pulse: synchronous strobe flash
        const time = performance.now() * 0.01;
        const pulse = 0.55 + 0.45 * Math.sin(time * (currentRpmRef.current / 100));
        laserRef.current.scale.set(1 + pulse * 0.2, 1, 1 + pulse * 0.2);
        if (strobeLightRef.current) {
          strobeLightRef.current.intensity = 2.5 + pulse * 3.5;
        }
      } else {
        laserRef.current.scale.set(1, 1, 1);
        if (strobeLightRef.current) {
          strobeLightRef.current.intensity = 2.0;
        }
      }
    }
  });

  // Materials
  const materials = useMemo(() => {
    return {
      // TPU 95A Frosted translucent combat unibody
      chassisTpu: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#4ec5dc'),
        roughness: 0.3,
        metalness: 0.08,
        transmission: 0.62,
        thickness: 18,
        ior: 1.48,
        transparent: true,
        opacity: 0.9,
      }),
      // Polycarbonate Smoked Armor Plates
      polycarbonatePlate: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#121720'),
        roughness: 0.22,
        metalness: 0.15,
        transmission: 0.6,
        thickness: 3.5,
        ior: 1.58,
        transparent: true,
        opacity: 0.85,
      }),
      // Titanium Cleat Wheels (Ti-6Al-4V)
      titaniumCleats: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#a8b0ba'),
        roughness: 0.28,
        metalness: 0.92,
      }),
      // Silicone Tire Tread
      siliconeTread: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cb532b'),
        roughness: 0.92,
        metalness: 0.02,
      }),
      // Machined Aluminum Motor Bell
      motorAluminum: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d0d5dc'),
        roughness: 0.2,
        metalness: 0.88,
      }),
      motorDark: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#22262d'),
        roughness: 0.4,
        metalness: 0.7,
      }),
      copperCoils: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#b86536'),
        roughness: 0.35,
        metalness: 0.75,
      }),
      // AR500 Hardened Strike Steel
      ar500Steel: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#383e4a'),
        roughness: 0.25,
        metalness: 0.92,
      }),
      // Tungsten Counterweight (Dense Gold/Brass)
      tungstenWedge: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d4af37'),
        roughness: 0.18,
        metalness: 0.96,
      }),
      // 4S LiPo Battery Pack (Kevlar Wrap)
      batteryKevlar: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1c2026'),
        roughness: 0.6,
        metalness: 0.1,
      }),
      batteryGoldXt30: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffb700'),
        roughness: 0.3,
        metalness: 0.85,
      }),
      // Avionics PCB & Chips
      pcbGreen: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0f4d2a'),
        roughness: 0.45,
        metalness: 0.2,
      }),
      chipBlack: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0a0c10'),
        roughness: 0.3,
        metalness: 0.4,
      }),
      ledGreenGlow: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00ff88'),
      }),
      ledRedGlow: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff2a55'),
      }),
      // Laser Beacon
      laserStrobe: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00ff88'),
        transparent: true,
        opacity: 0.85,
      }),
      laserFloorSpot: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00ff88'),
        transparent: true,
        opacity: 0.4,
      }),
      // Fasteners (Grade 12.9 Alloy Steel)
      fastenerAlloy: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#8892a0'),
        roughness: 0.2,
        metalness: 0.95,
      }),
      // Motion blur disc
      motionBlurMat: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00f0ff'),
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      }),
    };
  }, []);

  // Exploded displacements
  const topPlateY = 13 + exploded * 45;
  const bottomPlateY = -13 - exploded * 45;
  const motorLeftX = -36 - exploded * 40;
  const motorRightX = 36 + exploded * 40;
  const cleatLeftX = -54 - exploded * 65;
  const cleatRightX = 54 + exploded * 65;
  const battery1Z = -28 - exploded * 42;
  const battery2Z = 28 + exploded * 42;
  const avionicsY = 6 + exploded * 28;
  const lidarZ = 46 + exploded * 48;
  const lidarY = 14 + exploded * 32;
  const weaponY = exploded * 18;

  // Generate 36 cleat teeth positions
  const cleatTeethAngles = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => (i * Math.PI * 2) / 36);
  }, []);

  // Perimeter bolt positions
  const boltPositions = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI * 2) / 8 + Math.PI / 8;
      const radius = 64;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number];
    });
  }, []);

  return (
    <group ref={spinningGroupRef} position={[0, 0, 0]}>
      {/* 1. Main Frosted TPU Unibody Chassis Puck */}
      <mesh material={materials.chassisTpu} position={[0, 0, 0]}>
        <cylinderGeometry args={[60, 60, 24, 64]} />
      </mesh>

      {/* Internal Core Cavity Detail (hollow rim look) */}
      <mesh material={materials.motorDark} position={[0, 0, 0]}>
        <cylinderGeometry args={[32, 32, 24.2, 32]} />
      </mesh>

      {/* 2. Top Armor Plate (Smoked Makrolon Polycarbonate) */}
      <group position={[0, topPlateY, 0]}>
        <mesh material={materials.polycarbonatePlate}>
          <cylinderGeometry args={[70, 70, 3.5, 64]} />
        </mesh>
        {/* Top Plate Fasteners */}
        {boltPositions.map(([bx, bz], i) => (
          <mesh key={`top-bolt-${i}`} material={materials.fastenerAlloy} position={[bx, 1.9, bz]}>
            <cylinderGeometry args={[2.8, 2.8, 0.6, 12]} />
          </mesh>
        ))}
        {/* Center Logo Disk */}
        <mesh material={materials.fastenerAlloy} position={[0, 1.85, 0]}>
          <cylinderGeometry args={[14, 14, 0.4, 32]} />
        </mesh>
        <mesh material={materials.ledGreenGlow} position={[0, 2.1, 0]}>
          <ringGeometry args={[10, 12, 32]} />
        </mesh>
      </group>

      {/* 3. Bottom Skid Plate Armor */}
      <group position={[0, bottomPlateY, 0]}>
        <mesh material={materials.polycarbonatePlate}>
          <cylinderGeometry args={[70, 70, 3.5, 64]} />
        </mesh>
        {boltPositions.map(([bx, bz], i) => (
          <mesh key={`bot-bolt-${i}`} material={materials.fastenerAlloy} position={[bx, -1.9, bz]}>
            <cylinderGeometry args={[2.8, 2.8, 0.6, 12]} />
          </mesh>
        ))}
      </group>

      {/* 4. Left Drive Motor Pod */}
      <group position={[motorLeftX, 0, 0]}>
        <mesh material={materials.motorAluminum} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[14, 14, 16, 24]} />
        </mesh>
        <mesh material={materials.copperCoils} rotation={[0, 0, Math.PI / 2]} position={[4, 0, 0]}>
          <cylinderGeometry args={[10, 10, 12, 16]} />
        </mesh>
        <mesh material={materials.fastenerAlloy} rotation={[0, 0, Math.PI / 2]} position={[-10, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 14, 12]} />
        </mesh>
      </group>

      {/* Left 36T Titanium Cleat Wheel & Silicone Tire */}
      <group position={[cleatLeftX, 0, 0]}>
        {/* Central Hub Rim */}
        <mesh material={materials.titaniumCleats} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[17, 17, 8, 32]} />
        </mesh>
        {/* Dual Silicone Tread Rings */}
        <mesh material={materials.siliconeTread} rotation={[0, 0, Math.PI / 2]} position={[-2, 0, 0]}>
          <torusGeometry args={[17.2, 2.2, 12, 32]} />
        </mesh>
        <mesh material={materials.siliconeTread} rotation={[0, 0, Math.PI / 2]} position={[2, 0, 0]}>
          <torusGeometry args={[17.2, 2.2, 12, 32]} />
        </mesh>
        {/* 36 Machined Titanium Cleats (4.185mm Clearance) */}
        {cleatTeethAngles.map((angle, i) => (
          <mesh
            key={`cleat-left-${i}`}
            material={materials.titaniumCleats}
            position={[0, Math.sin(angle) * 19.5, Math.cos(angle) * 19.5]}
            rotation={[angle, 0, 0]}
          >
            <boxGeometry args={[7.5, 3.2, 1.8]} />
          </mesh>
        ))}
      </group>

      {/* 5. Right Drive Motor Pod */}
      <group position={[motorRightX, 0, 0]}>
        <mesh material={materials.motorAluminum} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[14, 14, 16, 24]} />
        </mesh>
        <mesh material={materials.copperCoils} rotation={[0, 0, -Math.PI / 2]} position={[-4, 0, 0]}>
          <cylinderGeometry args={[10, 10, 12, 16]} />
        </mesh>
        <mesh material={materials.fastenerAlloy} rotation={[0, 0, -Math.PI / 2]} position={[10, 0, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 14, 12]} />
        </mesh>
      </group>

      {/* Right 36T Titanium Cleat Wheel & Silicone Tire */}
      <group position={[cleatRightX, 0, 0]}>
        <mesh material={materials.titaniumCleats} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[17, 17, 8, 32]} />
        </mesh>
        <mesh material={materials.siliconeTread} rotation={[0, 0, -Math.PI / 2]} position={[-2, 0, 0]}>
          <torusGeometry args={[17.2, 2.2, 12, 32]} />
        </mesh>
        <mesh material={materials.siliconeTread} rotation={[0, 0, -Math.PI / 2]} position={[2, 0, 0]}>
          <torusGeometry args={[17.2, 2.2, 12, 32]} />
        </mesh>
        {cleatTeethAngles.map((angle, i) => (
          <mesh
            key={`cleat-right-${i}`}
            material={materials.titaniumCleats}
            position={[0, Math.sin(angle) * 19.5, Math.cos(angle) * 19.5]}
            rotation={[angle, 0, 0]}
          >
            <boxGeometry args={[7.5, 3.2, 1.8]} />
          </mesh>
        ))}
      </group>

      {/* 6. Quick-Swap Dual 4S LiPo Battery Cartridge */}
      <group position={[0, 0, battery1Z]}>
        <mesh material={materials.batteryKevlar}>
          <boxGeometry args={[44, 18, 22]} />
        </mesh>
        {/* Yellow XT30 Connector */}
        <mesh material={materials.batteryGoldXt30} position={[16, 0, -12]}>
          <boxGeometry args={[6, 8, 5]} />
        </mesh>
      </group>

      <group position={[0, 0, battery2Z]}>
        <mesh material={materials.batteryKevlar}>
          <boxGeometry args={[44, 18, 22]} />
        </mesh>
        <mesh material={materials.batteryGoldXt30} position={[-16, 0, 12]}>
          <boxGeometry args={[6, 8, 5]} />
        </mesh>
      </group>

      {/* 7. Central Avionics Bay (Teensy 4.0 & Dual H3LIS331DL Accelerometers) */}
      <group position={[0, avionicsY, 0]}>
        {/* PCB Board */}
        <mesh material={materials.pcbGreen}>
          <boxGeometry args={[28, 1.6, 36]} />
        </mesh>
        {/* Teensy 4.0 ARM Cortex-M7 Chip */}
        <mesh material={materials.chipBlack} position={[0, 1.4, 0]}>
          <boxGeometry args={[12, 1.5, 18]} />
        </mesh>
        {/* Accelerometer 1 (r1 = 44mm) */}
        <mesh material={materials.fastenerAlloy} position={[-10, 1.2, 6]}>
          <boxGeometry args={[3, 1, 3]} />
        </mesh>
        {/* Accelerometer 2 (r2 = 28mm) */}
        <mesh material={materials.fastenerAlloy} position={[10, 1.2, -6]}>
          <boxGeometry args={[3, 1, 3]} />
        </mesh>
        {/* Avionics Status LEDs */}
        <mesh material={materials.ledGreenGlow} position={[-8, 1.3, -12]}>
          <boxGeometry args={[1.5, 0.8, 1.5]} />
        </mesh>
        <mesh material={materials.ledRedGlow} position={[8, 1.3, -12]}>
          <boxGeometry args={[1.5, 0.8, 1.5]} />
        </mesh>
      </group>

      {/* 8. Micro-LiDAR Opponent Tracker Sensor Bay */}
      <group position={[0, lidarY, lidarZ]}>
        {/* PA6-CF Mount */}
        <mesh material={materials.motorDark}>
          <boxGeometry args={[16, 12, 14]} />
        </mesh>
        {/* Optical Sensor Glass Apertures */}
        <mesh material={materials.ledGreenGlow} position={[-3.5, 0, 7.5]}>
          <cylinderGeometry args={[2.5, 2.5, 1, 16]} />
        </mesh>
        <mesh material={materials.ledRedGlow} position={[3.5, 0, 7.5]}>
          <cylinderGeometry args={[2.5, 2.5, 1, 16]} />
        </mesh>
      </group>

      {/* 9. WEAPON SYSTEM INTERCHANGE (Modes A, B, C, D) */}
      <group position={[0, weaponY, 0]}>
        {/* MODE A: 2-Tooth High-KE Ring (415 J) */}
        {weaponMode === 'A' && (
          <group>
            {/* AR500 Steel Outer Ring */}
            <mesh material={materials.ar500Steel}>
              <ringGeometry args={[70, 76.2, 64]} />
            </mesh>
            <mesh material={materials.ar500Steel} position={[0, 0, 0]}>
              <cylinderGeometry args={[76.2, 76.2, 6.35, 64, 1, true]} />
            </mesh>
            {/* Symmetric Strike Tooth 1 (+X) */}
            <group position={[76.2, 0, 0]}>
              <mesh material={materials.ar500Steel} position={[6, 0, -4]}>
                <boxGeometry args={[16, 6.35, 18]} />
              </mesh>
              <mesh material={materials.fastenerAlloy} position={[14, 0, -4]} rotation={[0, 0.4, 0]}>
                <boxGeometry args={[6, 6.35, 12]} />
              </mesh>
            </group>
            {/* Symmetric Strike Tooth 2 (-X) */}
            <group position={[-76.2, 0, 0]}>
              <mesh material={materials.ar500Steel} position={[-6, 0, 4]}>
                <boxGeometry args={[16, 6.35, 18]} />
              </mesh>
              <mesh material={materials.fastenerAlloy} position={[-14, 0, 4]} rotation={[0, 0.4, 0]}>
                <boxGeometry args={[6, 6.35, 12]} />
              </mesh>
            </group>
          </group>
        )}

        {/* MODE B: Single Deep-Bite Razor + Tungsten Wedge */}
        {weaponMode === 'B' && (
          <group>
            {/* Base Support Ring */}
            <mesh material={materials.ar500Steel}>
              <ringGeometry args={[68, 74, 64]} />
            </mesh>
            {/* Single Massive Deep-Bite Razor Tooth (+X) */}
            <group position={[74, 0, 0]}>
              <mesh material={materials.ar500Steel} position={[12, 0, -6]}>
                <boxGeometry args={[26, 8, 22]} />
              </mesh>
              {/* Razor Chisel Edge */}
              <mesh material={materials.fastenerAlloy} position={[24, 0, -6]} rotation={[0, 0.5, 0]}>
                <boxGeometry args={[8, 8, 14]} />
              </mesh>
            </group>
            {/* Tungsten Heavy Counterbalance Wedge (-X) */}
            <group position={[-68, 0, 0]}>
              <mesh material={materials.tungstenWedge} position={[-7, 0, 0]}>
                <boxGeometry args={[16, 12, 34]} />
              </mesh>
              {/* Clamping Hardware */}
              <mesh material={materials.fastenerAlloy} position={[-7, 7, 8]}>
                <cylinderGeometry args={[2.5, 2.5, 3, 12]} />
              </mesh>
              <mesh material={materials.fastenerAlloy} position={[-7, 7, -8]}>
                <cylinderGeometry args={[2.5, 2.5, 3, 12]} />
              </mesh>
            </group>
          </group>
        )}

        {/* MODE C: Low-Profile Undercutter Scoop */}
        {weaponMode === 'C' && (
          <group position={[0, -6, 0]}>
            {/* Bevelled Ground Scoop Plate */}
            <mesh material={materials.ar500Steel} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[65, 84, 64]} />
            </mesh>
            {/* Low-profile Leading Wedges */}
            <mesh material={materials.fastenerAlloy} position={[0, -2, 78]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[48, 2.5, 14]} />
            </mesh>
            <mesh material={materials.fastenerAlloy} position={[0, -2, -78]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[48, 2.5, 14]} />
            </mesh>
            {/* Pop-up lifting fins */}
            <mesh material={materials.ar500Steel} position={[68, 3, 0]} rotation={[0, 0, 0.3]}>
              <boxGeometry args={[18, 4, 18]} />
            </mesh>
            <mesh material={materials.ar500Steel} position={[-68, 3, 0]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[18, 4, 18]} />
            </mesh>
          </group>
        )}

        {/* MODE D: Skirt-Breaker Can-Opener */}
        {weaponMode === 'D' && (
          <group>
            {/* Base Ring */}
            <mesh material={materials.ar500Steel}>
              <ringGeometry args={[69, 76, 64]} />
            </mesh>
            {/* Upward Hook Tooth 1 (+X) */}
            <group position={[76, 2, 0]}>
              <mesh material={materials.ar500Steel} position={[8, 4, -4]} rotation={[0, 0, 0.35]}>
                <boxGeometry args={[18, 8, 16]} />
              </mesh>
              {/* Serrated Can-Opener Spur */}
              <mesh material={materials.fastenerAlloy} position={[15, 8, -4]} rotation={[0, 0, 0.6]}>
                <coneGeometry args={[4, 10, 8]} />
              </mesh>
            </group>
            {/* Upward Hook Tooth 2 (-X) */}
            <group position={[-76, 2, 0]}>
              <mesh material={materials.ar500Steel} position={[-8, 4, 4]} rotation={[0, 0, -0.35]}>
                <boxGeometry args={[18, 8, 16]} />
              </mesh>
              <mesh material={materials.fastenerAlloy} position={[-15, 8, 4]} rotation={[0, 0, -0.6]}>
                <coneGeometry args={[4, 10, 8]} />
              </mesh>
            </group>
          </group>
        )}
      </group>

      {/* 10. Motion Blur Kinetic Ring (scales with RPM) */}
      {isSpinning && rpm > 600 && (
        <mesh material={materials.motionBlurMat} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[70, 86, 64]} />
        </mesh>
      )}

      {/* 11. Optical Heading Strobe Laser Beam */}
      {strobeLaser && (
        <group position={[0, lidarY, lidarZ]}>
          {/* Forward Collimated Strobe Laser Beam */}
          <mesh ref={laserRef} material={materials.laserStrobe} position={[0, 0, 100]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 200, 16]} />
          </mesh>
          {/* Laser Floor Spot Ahead */}
          <mesh material={materials.laserFloorSpot} position={[0, -lidarY - 14, 200]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[12, 24]} />
          </mesh>
          <pointLight ref={strobeLightRef} color="#00ff88" intensity={2.5} distance={180} />
        </group>
      )}
    </group>
  );
}

function GroundArenaGrid() {
  return (
    <group position={[0, -17, 0]}>
      {/* Dark Tactical Arena Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#060910" roughness={0.85} metalness={0.25} />
      </mesh>
      {/* Concentric Range Rings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[99.5, 100.5, 64]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[149.5, 150.5, 64]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[199.5, 200.5, 64]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.1} />
      </mesh>
      {/* Crosshairs */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[400, 0.8]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 400]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function LightingRig({ preset }: { preset: LightingPreset }) {
  if (preset === 'studio') {
    return (
      <>
        <ambientLight color="#252830" intensity={1.4} />
        <directionalLight position={[70, 140, 90]} intensity={3.8} color="#ffffff" castShadow />
        <directionalLight position={[-80, 60, 40]} intensity={2.0} color="#adc8e6" />
        <directionalLight position={[0, 60, -110]} intensity={2.4} color="#ffe8cc" />
        <pointLight position={[0, 90, 0]} intensity={1.5} color="#ffffff" />
      </>
    );
  }

  if (preset === 'arena') {
    return (
      <>
        <ambientLight color="#141108" intensity={0.6} />
        <directionalLight position={[0, 180, 0]} intensity={4.5} color="#ffaa22" />
        <pointLight position={[-120, 40, -120]} intensity={2.5} color="#ff2a55" />
        <pointLight position={[120, 40, 120]} intensity={2.5} color="#ffaa00" />
      </>
    );
  }

  if (preset === 'ir') {
    return (
      <>
        <ambientLight color="#02140a" intensity={0.8} />
        <directionalLight position={[50, 120, 70]} intensity={3.5} color="#00ff88" />
        <directionalLight position={[-60, 40, -60]} intensity={2.2} color="#00f0ff" />
        <pointLight position={[0, -10, 0]} intensity={1.5} color="#00ff88" />
      </>
    );
  }

  // Default: 'cyber'
  return (
    <>
      <ambientLight color="#070c18" intensity={0.9} />
      <directionalLight position={[80, 120, 80]} intensity={3.4} color="#00f0ff" />
      <directionalLight position={[-80, 50, -80]} intensity={2.6} color="#ff2a85" />
      <directionalLight position={[0, 80, -90]} intensity={1.8} color="#7c3aed" />
      <pointLight position={[0, 40, 60]} intensity={1.5} color="#00ff88" />
    </>
  );
}

export interface HeroCombatViewer3DProps {
  weaponMode: WeaponMode;
  rpm: number;
  isSpinning: boolean;
  exploded: number;
  strobeLaser: boolean;
  lightingPreset: LightingPreset;
}

export function HeroCombatViewer3D({
  weaponMode,
  rpm,
  isSpinning,
  exploded,
  strobeLaser,
  lightingPreset,
}: HeroCombatViewer3DProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Canvas
        camera={{ position: [0, 85, 145], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor('#000000', 0);
        }}
      >
        <LightingRig preset={lightingPreset} />
        <GroundArenaGrid />
        <Suspense fallback={null}>
          <RobotModel
            weaponMode={weaponMode}
            rpm={rpm}
            isSpinning={isSpinning}
            exploded={exploded}
            strobeLaser={strobeLaser}
          />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={65}
          maxDistance={280}
          maxPolarAngle={Math.PI / 2 + 0.05}
        />
      </Canvas>
    </div>
  );
}
