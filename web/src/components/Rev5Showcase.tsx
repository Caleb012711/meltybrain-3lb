import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

export interface Rev5PartSpec {
  id: string;
  name: string;
  subsystem: string;
  massG: number;
  material: string;
  manufacturing: string;
  fasteners: string;
  stlFile: string;
  stlSize: string;
  assembledPosition: [number, number, number];
  assembledRotation: [number, number, number];
  explodeDisplacement: [number, number, number];
  color: string;
  roughness: number;
  metalness: number;
  transmission?: number;
  thickness?: number;
  ior?: number;
  transparent?: boolean;
  opacity?: number;
  focusTarget: [number, number, number];
  focusCameraPos: [number, number, number];
  fallbackType: 'chassis' | 'plate' | 'cleat' | 'tire' | 'motor' | 'battery' | 'lidar';
}

export const REV5_PARTS: Rev5PartSpec[] = [
  {
    id: 'chassis_puck',
    name: 'Main Combat Chassis Puck',
    subsystem: 'Chassis & Structural Unibody',
    massG: 180,
    material: 'Bambu TPU 95A HF (Semi-translucent Frosted Combat TPU)',
    manufacturing: 'FDM 3D Print (90% Gyroid Infill, 6 Perimeters, 0.20mm Layer)',
    fasteners: '16× M3×35mm Grade 12.9 Alloy Steel Bolts + Loctite 243',
    stlFile: 'eyeliner_chassis_puck.stl',
    stlSize: '5.4 MB',
    assembledPosition: [0, 0, -12],
    assembledRotation: [0, 0, 0],
    explodeDisplacement: [0, 0, 0],
    color: '#8ec5d9',
    roughness: 0.32,
    metalness: 0.05,
    transmission: 0.72,
    thickness: 16,
    ior: 1.45,
    transparent: true,
    opacity: 0.88,
    focusTarget: [0, 0, 0],
    focusCameraPos: [130, 90, 130],
    fallbackType: 'chassis',
  },
  {
    id: 'top_plate',
    name: 'Top Armor Plate',
    subsystem: 'Top Armor & Avionics Protection',
    massG: 64,
    material: 'Dark Smoke Polycarbonate (Makrolon 3.5mm)',
    manufacturing: 'CNC Precision Milling with Chamfered Fastener Slots',
    fasteners: '8× M3 Flathead Countersunk Screws',
    stlFile: 'eyeliner_top_plate.stl',
    stlSize: '5.1 MB',
    assembledPosition: [0, 0, -12],
    assembledRotation: [0, 0, 0],
    explodeDisplacement: [0, 0, 70],
    color: '#161a22',
    roughness: 0.18,
    metalness: 0.12,
    transmission: 0.65,
    thickness: 3.5,
    ior: 1.586,
    transparent: true,
    opacity: 0.82,
    focusTarget: [0, 0, 14],
    focusCameraPos: [65, 75, 95],
    fallbackType: 'plate',
  },
  {
    id: 'bottom_plate',
    name: 'Bottom Skid Plate Armor',
    subsystem: 'Belly Armor & Ground Deflector',
    massG: 62,
    material: 'Dark Smoke Polycarbonate (Makrolon 3.5mm)',
    manufacturing: 'CNC Precision Milling / Waterjet with Chamfered Slots',
    fasteners: '8× M3 Low-Profile Screws',
    stlFile: 'eyeliner_bottom_plate.stl',
    stlSize: '4.6 MB',
    assembledPosition: [0, 0, -12],
    assembledRotation: [0, 0, 0],
    explodeDisplacement: [0, 0, -70],
    color: '#161a22',
    roughness: 0.18,
    metalness: 0.12,
    transmission: 0.65,
    thickness: 3.5,
    ior: 1.586,
    transparent: true,
    opacity: 0.82,
    focusTarget: [0, 0, -14],
    focusCameraPos: [65, 75, -95],
    fallbackType: 'plate',
  },
  {
    id: 'wheel_cleat_left',
    name: 'Left Titanium Wheel Cleat',
    subsystem: 'Traction & Ground Engagement',
    massG: 14.2,
    material: 'Ti-6Al-4V Grade 5 Titanium (Annealed)',
    manufacturing: 'Precision Abrasive Waterjet Cut (0.040" / 1.0mm)',
    fasteners: '3× M2.5 Hardened Ground Dowel Pins per hub',
    stlFile: 'eyeliner_wheel_cleat_left.stl',
    stlSize: '558 KB',
    assembledPosition: [-54, 0, -2],
    assembledRotation: [0, Math.PI / 2, 0],
    explodeDisplacement: [-110, 0, 0],
    color: '#9aa2ac',
    roughness: 0.26,
    metalness: 0.94,
    focusTarget: [-54, 0, -2],
    focusCameraPos: [-115, 30, 35],
    fallbackType: 'cleat',
  },
  {
    id: 'wheel_cleat_right',
    name: 'Right Titanium Wheel Cleat',
    subsystem: 'Traction & Ground Engagement',
    massG: 14.2,
    material: 'Ti-6Al-4V Grade 5 Titanium (Annealed)',
    manufacturing: 'Precision Abrasive Waterjet Cut (0.040" / 1.0mm)',
    fasteners: '3× M2.5 Hardened Ground Dowel Pins per hub',
    stlFile: 'eyeliner_wheel_cleat_right.stl',
    stlSize: '558 KB',
    assembledPosition: [54, 0, -2],
    assembledRotation: [0, -Math.PI / 2, 0],
    explodeDisplacement: [110, 0, 0],
    color: '#9aa2ac',
    roughness: 0.26,
    metalness: 0.94,
    focusTarget: [54, 0, -2],
    focusCameraPos: [115, 30, 35],
    fallbackType: 'cleat',
  },
  {
    id: 'silicone_tire_left',
    name: 'Left High-Grip Silicone Tire',
    subsystem: 'Traction & Shock Attenuation',
    massG: 18.5,
    material: 'Smooth-On Dragon Skin 20 (Terracotta Silicone)',
    manufacturing: '2-Part Vacuum Degassed Injection Mold (Shore 20A)',
    fasteners: 'Bonded to Titanium Cleat Rim via Sil-Poxy Primer',
    stlFile: 'eyeliner_silicone_tire_left.stl',
    stlSize: '16 KB',
    assembledPosition: [-50, 0, -2],
    assembledRotation: [0, Math.PI / 2, 0],
    explodeDisplacement: [-85, 0, 0],
    color: '#c25835',
    roughness: 0.92,
    metalness: 0.02,
    focusTarget: [-50, 0, -2],
    focusCameraPos: [-95, 25, 30],
    fallbackType: 'tire',
  },
  {
    id: 'silicone_tire_right',
    name: 'Right High-Grip Silicone Tire',
    subsystem: 'Traction & Shock Attenuation',
    massG: 18.5,
    material: 'Smooth-On Dragon Skin 20 (Terracotta Silicone)',
    manufacturing: '2-Part Vacuum Degassed Injection Mold (Shore 20A)',
    fasteners: 'Bonded to Titanium Cleat Rim via Sil-Poxy Primer',
    stlFile: 'eyeliner_silicone_tire_right.stl',
    stlSize: '16 KB',
    assembledPosition: [50, 0, -2],
    assembledRotation: [0, -Math.PI / 2, 0],
    explodeDisplacement: [85, 0, 0],
    color: '#c25835',
    roughness: 0.92,
    metalness: 0.02,
    focusTarget: [50, 0, -2],
    focusCameraPos: [95, 25, 30],
    fallbackType: 'tire',
  },
  {
    id: 'motor_left',
    name: 'Left Drive Motor (PropDrive 2836)',
    subsystem: 'Propulsion & Kinematic Drive',
    massG: 82,
    material: 'Machined 6061-T6 Aluminum / N52 Magnets / Steel Axle',
    manufacturing: 'Precision CNC Turning & Dynamic Spin Balancing (1200KV)',
    fasteners: '4× M3×6mm Socket Screws + Dual 626 High-Speed Bearings',
    stlFile: 'eyeliner_motor_left.stl',
    stlSize: '19 KB',
    assembledPosition: [-34, 0, 0],
    assembledRotation: [0, -Math.PI / 2, 0],
    explodeDisplacement: [-52, 0, -12],
    color: '#dbe0e6',
    roughness: 0.2,
    metalness: 0.88,
    focusTarget: [-34, 0, 0],
    focusCameraPos: [-72, 30, 25],
    fallbackType: 'motor',
  },
  {
    id: 'motor_right',
    name: 'Right Drive Motor (PropDrive 2836)',
    subsystem: 'Propulsion & Kinematic Drive',
    massG: 82,
    material: 'Machined 6061-T6 Aluminum / N52 Magnets / Steel Axle',
    manufacturing: 'Precision CNC Turning & Dynamic Spin Balancing (1200KV)',
    fasteners: '4× M3×6mm Socket Screws + Dual 626 High-Speed Bearings',
    stlFile: 'eyeliner_motor_right.stl',
    stlSize: '19 KB',
    assembledPosition: [34, 0, 0],
    assembledRotation: [0, Math.PI / 2, 0],
    explodeDisplacement: [52, 0, -12],
    color: '#dbe0e6',
    roughness: 0.2,
    metalness: 0.88,
    focusTarget: [34, 0, 0],
    focusCameraPos: [72, 30, 25],
    fallbackType: 'motor',
  },
  {
    id: 'battery_pack_1',
    name: 'Tattu 4S 650mAh Battery Pack A',
    subsystem: 'Energy Storage & High-Current Bus',
    massG: 74,
    material: 'Lithium-Polymer 95C Pouch Cell Core with Kevlar Wrap',
    manufacturing: 'Automated Cell Matching & Heavy Heatshrink Packaging',
    fasteners: 'TPU Shock Cradle Clamp + Amass XT30U Gold Connector',
    stlFile: 'eyeliner_battery_pack_1.stl',
    stlSize: '1.3 KB',
    assembledPosition: [0, -28, 0],
    assembledRotation: [0, 0, 0],
    explodeDisplacement: [0, -55, 0],
    color: '#20242a',
    roughness: 0.45,
    metalness: 0.18,
    focusTarget: [0, -28, 0],
    focusCameraPos: [50, -65, 45],
    fallbackType: 'battery',
  },
  {
    id: 'battery_pack_2',
    name: 'Tattu 4S 650mAh Battery Pack B',
    subsystem: 'Energy Storage & High-Current Bus',
    massG: 74,
    material: 'Lithium-Polymer 95C Pouch Cell Core with Kevlar Wrap',
    manufacturing: 'Automated Cell Matching & Heavy Heatshrink Packaging',
    fasteners: 'TPU Shock Cradle Clamp + Amass XT30U Gold Connector',
    stlFile: 'eyeliner_battery_pack_2.stl',
    stlSize: '1.3 KB',
    assembledPosition: [0, 28, 0],
    assembledRotation: [0, 0, 0],
    explodeDisplacement: [0, 55, 0],
    color: '#20242a',
    roughness: 0.45,
    metalness: 0.18,
    focusTarget: [0, 28, 0],
    focusCameraPos: [50, 65, 45],
    fallbackType: 'battery',
  },
  {
    id: 'lidar_mount',
    name: 'AI Micro-LiDAR Mount',
    subsystem: 'Autonomous Navigation & Sensor Bay',
    massG: 6.8,
    material: 'Bambu PA6-CF (Carbon Fiber Reinforced Polyamide)',
    manufacturing: 'High-Resolution FDM 3D Printing (0.12mm Layer Height)',
    fasteners: '2× M2×8mm Stainless Hex Socket Screws',
    stlFile: 'eyeliner_lidar_mount.stl',
    stlSize: '706 KB',
    assembledPosition: [0, 48, 14],
    assembledRotation: [0, 0, 0],
    explodeDisplacement: [0, 45, 95],
    color: '#141820',
    roughness: 0.65,
    metalness: 0.25,
    focusTarget: [0, 48, 16],
    focusCameraPos: [35, 80, 55],
    fallbackType: 'lidar',
  },
];

export type CameraPreset = 'isometric' | 'topArmor' | 'underside' | 'cleatDrive' | 'lidarBay' | 'exploded';

export const CAMERA_PRESETS: Record<CameraPreset, { label: string; pos: [number, number, number]; target: [number, number, number]; explode?: number }> = {
  isometric: {
    label: 'Isometric',
    pos: [140, 110, 150],
    target: [0, 0, 0],
  },
  topArmor: {
    label: 'Top Armor',
    pos: [0, 220, 2],
    target: [0, 0, 0],
  },
  underside: {
    label: 'Underside Clearance',
    pos: [0, -210, 35],
    target: [0, 0, 0],
  },
  cleatDrive: {
    label: 'Cleat Drive Closeup',
    pos: [-110, 25, 30],
    target: [-54, -2, 0],
  },
  lidarBay: {
    label: 'LiDAR Bay',
    pos: [0, 60, -85],
    target: [0, 14, -48],
  },
  exploded: {
    label: 'Exploded',
    pos: [180, 130, 180],
    target: [0, 0, 0],
    explode: 0.85,
  },
};

/** High-detail procedural geometry fallback generators */
function createProceduralGeometry(type: Rev5PartSpec['fallbackType']): THREE.BufferGeometry {
  switch (type) {
    case 'chassis': {
      const g = new THREE.CylinderGeometry(70, 70, 24, 48);
      g.computeVertexNormals();
      return g;
    }
    case 'plate': {
      const g = new THREE.CylinderGeometry(70, 70, 3.5, 48);
      g.computeVertexNormals();
      return g;
    }
    case 'cleat': {
      const shape = new THREE.Shape();
      const teeth = 12;
      for (let i = 0; i < teeth * 2; i++) {
        const angle = (i * Math.PI) / teeth;
        const r = i % 2 === 0 ? 19.68 : 14.5;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      const hole = new THREE.Path();
      hole.absarc(0, 0, 3.0, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 1.02,
        bevelEnabled: true,
        bevelThickness: 0.2,
        bevelSize: 0.2,
        bevelSegments: 2,
      });
      g.center();
      g.computeVertexNormals();
      return g;
    }
    case 'tire': {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 19.7, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, 14.0, 0, Math.PI * 2, true);
      shape.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 12.0,
        bevelEnabled: true,
        bevelThickness: 0.5,
        bevelSize: 0.5,
        curveSegments: 36,
      });
      g.center();
      g.computeVertexNormals();
      return g;
    }
    case 'motor': {
      const g = new THREE.CylinderGeometry(14, 14, 32, 32);
      g.center();
      g.computeVertexNormals();
      return g;
    }
    case 'battery': {
      const g = new THREE.BoxGeometry(60, 31, 24);
      g.computeVertexNormals();
      return g;
    }
    case 'lidar': {
      const g = new THREE.BoxGeometry(18, 20, 13);
      g.computeVertexNormals();
      return g;
    }
  }
}

/** Hook to load authentic STL with procedural fallback */
function useStlWithFallback(spec: Rev5PartSpec) {
  const fallback = useMemo(() => createProceduralGeometry(spec.fallbackType), [spec.fallbackType]);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>(fallback);
  const [isStl, setIsStl] = useState(false);

  useEffect(() => {
    let active = true;
    const loader = new STLLoader();
    const basePath = import.meta.env.BASE_URL ?? '/';
    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const fullUrl = `${cleanBase}stl/${spec.stlFile}`;

    loader.load(
      fullUrl,
      (loadedGeom) => {
        if (!active) return;
        loadedGeom.computeVertexNormals();
        loadedGeom.computeBoundingBox();
        setGeometry(loadedGeom);
        setIsStl(true);
      },
      undefined,
      (err) => {
        if (!active) return;
        console.warn(`Fallback to procedural geometry for ${spec.name} (${spec.stlFile}):`, err);
        // Continue using procedural fallback seamlessly
        setIsStl(false);
      }
    );

    return () => {
      active = false;
    };
  }, [spec.stlFile, spec.name]);

  return { geometry, isStl };
}

/** Individual Part Mesh in the 3D Scene */
export function Rev5PartMesh({
  spec,
  explode,
  wireframe,
  xray,
  isSelected,
  isHovered,
  isDimmed,
  onSelect,
  onHover,
}: {
  spec: Rev5PartSpec;
  explode: number;
  wireframe: boolean;
  xray: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { geometry } = useStlWithFallback(spec);

  // Compute current position smoothly displaced by exploded view slider
  const position = useMemo<[number, number, number]>(() => {
    const [ax, ay, az] = spec.assembledPosition;
    const [dx, dy, dz] = spec.explodeDisplacement;
    return [ax + dx * explode, ay + dy * explode, az + dz * explode];
  }, [spec.assembledPosition, spec.explodeDisplacement, explode]);

  const emissiveColor = isSelected ? '#00f0ff' : isHovered ? '#ffaa00' : '#000000';
  const emissiveIntensity = isSelected ? 0.65 : isHovered ? 0.35 : 0;
  const currentOpacity = isDimmed ? 0.15 : xray ? 0.35 : spec.opacity ?? 1.0;

  return (
    <group position={position} rotation={spec.assembledRotation}>
      <mesh
        geometry={geometry}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(spec.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(spec.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
      >
        {spec.transmission && !wireframe && !xray ? (
          <meshPhysicalMaterial
            color={spec.color}
            roughness={spec.roughness}
            metalness={spec.metalness}
            transmission={spec.transmission}
            thickness={spec.thickness ?? 10}
            ior={spec.ior ?? 1.5}
            transparent={true}
            opacity={currentOpacity}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            wireframe={wireframe}
          />
        ) : (
          <meshStandardMaterial
            color={spec.color}
            roughness={spec.roughness}
            metalness={spec.metalness}
            transparent={spec.transparent || xray || isDimmed}
            opacity={currentOpacity}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            wireframe={wireframe}
          />
        )}
      </mesh>
    </group>
  );
}

/** Smooth Camera Lerp Rig */
export function CameraPresetRig({
  targetPos,
  targetLookAt,
  isAnimating,
  onAnimationEnd,
}: {
  targetPos: [number, number, number] | null;
  targetLookAt: [number, number, number] | null;
  isAnimating: boolean;
  onAnimationEnd: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useThree((state) => state.controls) as any;

  useFrame(() => {
    if (!isAnimating || !targetPos || !targetLookAt) return;
    const destPos = new THREE.Vector3(...targetPos);
    const destTarget = new THREE.Vector3(...targetLookAt);

    camera.position.lerp(destPos, 0.08);

    if (controlsRef && controlsRef.target) {
      controlsRef.target.lerp(destTarget, 0.08);
      controlsRef.update();
    } else {
      camera.lookAt(destTarget);
    }

    if (camera.position.distanceTo(destPos) < 0.6) {
      camera.position.copy(destPos);
      if (controlsRef && controlsRef.target) {
        controlsRef.target.copy(destTarget);
        controlsRef.update();
      }
      onAnimationEnd();
    }
  });

  return null;
}

/** Spin Up Animation Controller with Meltybrain Heading LED Beacon */
export function SpinUpGroup({
  spinUp,
  forcedRpm,
  children,
  onRpmUpdate,
}: {
  spinUp: boolean;
  forcedRpm?: number;
  children: React.ReactNode;
  onRpmUpdate?: (rpm: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.PointLight>(null);
  const currentSpeed = useRef(0);
  const currentAngle = useRef(0);

  useFrame((_, delta) => {
    let targetSpeed = spinUp ? 18.0 : 0.0;
    if (forcedRpm !== undefined) {
      targetSpeed = (forcedRpm / 3500) * 18.0;
      currentSpeed.current = targetSpeed;
    } else {
      currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, delta * 2.5);
    }

    const effectiveRpm =
      forcedRpm !== undefined ? forcedRpm : Math.round((currentSpeed.current / 18.0) * 3500);

    if (groupRef.current && (currentSpeed.current > 0.001 || effectiveRpm > 0)) {
      currentAngle.current += currentSpeed.current * delta;
      groupRef.current.rotation.y = currentAngle.current;

      // Optical Heading Beacon strobe: pulses bright once per revolution as heading passes forward (angle ~ 0)
      if (beaconRef.current) {
        const normAngle = ((currentAngle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const inStrobeWindow = normAngle < 0.35 || normAngle > Math.PI * 2 - 0.35;
        beaconRef.current.intensity = inStrobeWindow && (spinUp || effectiveRpm > 200) ? 3.8 : 0.2;
      }

      if (onRpmUpdate) {
        onRpmUpdate(effectiveRpm);
      }
    } else if (onRpmUpdate && currentSpeed.current <= 0.001) {
      onRpmUpdate(0);
    }
  });

  const showCone = spinUp || (forcedRpm !== undefined && forcedRpm > 200);

  return (
    <group ref={groupRef}>
      {children}
      {/* Meltybrain Forward Heading LED Beacon */}
      <pointLight ref={beaconRef} position={[0, 16, -60]} color="#00ff66" distance={120} intensity={0.4} />
      {showCone && (
        <mesh position={[0, 15, -62]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[12, 45, 16, 1, true]} />
          <meshBasicMaterial color="#00ff66" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/** Complete Rev 5 3D Model Assembly */
export function Rev5Model({
  explode,
  wireframe,
  xray,
  selectedId,
  hoveredId,
  isolatedId,
  onSelect,
  onHover,
}: {
  explode: number;
  wireframe: boolean;
  xray: boolean;
  selectedId: string | null;
  hoveredId: string | null;
  isolatedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    // Rotate -90 deg on X so CAD Z is pointing up (+Y) in Three.js
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {REV5_PARTS.map((spec) => {
        const isSelected = selectedId === spec.id;
        const isHovered = hoveredId === spec.id;
        const isDimmed = isolatedId !== null && isolatedId !== spec.id;

        return (
          <Rev5PartMesh
            key={spec.id}
            spec={spec}
            explode={explode}
            wireframe={wireframe}
            xray={xray}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            onSelect={onSelect}
            onHover={onHover}
          />
        );
      })}
    </group>
  );
}

/* =========================================================================
   DYNAMIC LIGHTING STUDIO PRESETS
   ========================================================================= */

export type StudioLightingPreset =
  | 'combatArena'
  | 'neonCyberpunk'
  | 'industrialClean'
  | 'tacticalStealth';

export interface StudioLightingConfig {
  id: StudioLightingPreset;
  name: string;
  badge: string;
  dotColor: string;
  description: string;
  bgColor: string;
  gridColors: [string, string];
  ambientColor: string;
  ambientIntensity: number;
  lights: Array<{
    type: 'directional' | 'point';
    color: string;
    intensity: number;
    position: [number, number, number];
    castShadow?: boolean;
    distance?: number;
  }>;
}

export const STUDIO_LIGHTING_PRESETS: Record<StudioLightingPreset, StudioLightingConfig> = {
  combatArena: {
    id: 'combatArena',
    name: 'Combat Arena Red Alert',
    badge: 'RED ALERT',
    dotColor: '#ff1744',
    description: 'High-contrast red & cyan rim lights with intense battle arena atmosphere',
    bgColor: '#0c0508',
    gridColors: ['#ff1744', '#2d080f'],
    ambientColor: '#ff2244',
    ambientIntensity: 0.45,
    lights: [
      { type: 'directional', position: [150, 120, 100], color: '#ff1744', intensity: 3.2, castShadow: true },
      { type: 'directional', position: [-140, -40, -110], color: '#00e5ff', intensity: 2.4 },
      { type: 'directional', position: [0, 180, 0], color: '#ff5252', intensity: 1.8 },
      { type: 'directional', position: [0, -120, 40], color: '#00b0ff', intensity: 1.0 },
      { type: 'point', position: [0, 60, -30], color: '#ff1744', intensity: 2.0, distance: 180 },
    ],
  },
  neonCyberpunk: {
    id: 'neonCyberpunk',
    name: 'Neon Cyberpunk',
    badge: 'CYBERPUNK',
    dotColor: '#ff007f',
    description: 'Vibrant magenta and neon cyan rim lights with deep synthwave contrast',
    bgColor: '#090514',
    gridColors: ['#ff007f', '#1b0f38'],
    ambientColor: '#9900ff',
    ambientIntensity: 0.5,
    lights: [
      { type: 'directional', position: [130, 140, 100], color: '#ff007f', intensity: 3.0, castShadow: true },
      { type: 'directional', position: [-130, -50, -100], color: '#00f0ff', intensity: 2.6 },
      { type: 'directional', position: [0, 160, -60], color: '#bd00ff', intensity: 1.6 },
      { type: 'directional', position: [70, -100, -70], color: '#00ffff', intensity: 1.2 },
      { type: 'point', position: [0, 80, 50], color: '#ff0099', intensity: 2.2, distance: 160 },
    ],
  },
  industrialClean: {
    id: 'industrialClean',
    name: 'Industrial Cleanroom',
    badge: '6500K SHOWROOM',
    dotColor: '#e0e8f0',
    description: 'Neutral 6500K bright white showroom with studio grade shadow diffusion',
    bgColor: '#16191d',
    gridColors: ['#7d899b', '#2e353f'],
    ambientColor: '#ffffff',
    ambientIntensity: 1.05,
    lights: [
      { type: 'directional', position: [120, 160, 110], color: '#fafdff', intensity: 2.4, castShadow: true },
      { type: 'directional', position: [-120, 80, -100], color: '#e8f0fe', intensity: 1.4 },
      { type: 'directional', position: [0, -140, 0], color: '#ffffff', intensity: 0.9 },
      { type: 'directional', position: [0, 100, -130], color: '#f0f6ff', intensity: 1.2 },
      { type: 'point', position: [0, 110, 0], color: '#ffffff', intensity: 1.5, distance: 220 },
    ],
  },
  tacticalStealth: {
    id: 'tacticalStealth',
    name: 'Tactical Stealth',
    badge: 'STEALTH GOLD',
    dotColor: '#e5b842',
    description: 'Dark matte aesthetic with brushed titanium and warm gold accents',
    bgColor: '#0a0b0d',
    gridColors: ['#e5b842', '#211d13'],
    ambientColor: '#181b20',
    ambientIntensity: 0.4,
    lights: [
      { type: 'directional', position: [140, 120, 110], color: '#e5b842', intensity: 2.8, castShadow: true },
      { type: 'directional', position: [-130, -30, -110], color: '#4a5868', intensity: 0.9 },
      { type: 'directional', position: [-50, 130, -120], color: '#ffd700', intensity: 1.6 },
      { type: 'directional', position: [0, -90, 60], color: '#b38f28', intensity: 0.8 },
      { type: 'point', position: [-50, 40, 30], color: '#fff0b3', intensity: 2.0, distance: 150 },
    ],
  },
};

/** Dynamic Studio Lighting Rig */
export function Rev5StudioLighting({ presetId }: { presetId: StudioLightingPreset }) {
  const config = STUDIO_LIGHTING_PRESETS[presetId] ?? STUDIO_LIGHTING_PRESETS.industrialClean;

  return (
    <group>
      <ambientLight color={config.ambientColor} intensity={config.ambientIntensity} />
      {config.lights.map((l, idx) =>
        l.type === 'directional' ? (
          <directionalLight
            key={idx}
            position={l.position}
            color={l.color}
            intensity={l.intensity}
            castShadow={l.castShadow}
          />
        ) : (
          <pointLight
            key={idx}
            position={l.position}
            color={l.color}
            intensity={l.intensity}
            distance={l.distance}
          />
        )
      )}
    </group>
  );
}

/* =========================================================================
   CINEMATIC CAMERA TRACKS & TURNTABLE ANIMATION
   ========================================================================= */

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export type CinematicTrackId = 'orbit360' | 'explodedReel' | 'spinUpReel' | 'cleatMacro';

export interface CinematicTrackFrame {
  pos: [number, number, number];
  target: [number, number, number];
  explode?: number;
  spinUp?: boolean;
  rpm?: number;
}

export interface CinematicTrackConfig {
  id: CinematicTrackId;
  name: string;
  shortLabel: string;
  badge: string;
  description: string;
  durationSec: number;
  evaluate: (u: number) => CinematicTrackFrame;
}

export const CINEMATIC_TRACKS: Record<CinematicTrackId, CinematicTrackConfig> = {
  orbit360: {
    id: 'orbit360',
    name: '360° Studio Turntable Orbit',
    shortLabel: '360° Orbit',
    badge: 'STUDIO TURNTABLE',
    description: 'Smooth continuous 360° rotation around the unibody chassis with dynamic elevation',
    durationSec: 6.5,
    evaluate: (u: number) => {
      const angle = u * Math.PI * 2 - Math.PI * 0.25;
      const radius = 195;
      const y = 100 + 18 * Math.sin(u * Math.PI * 2);
      return {
        pos: [radius * Math.sin(angle), y, radius * Math.cos(angle)],
        target: [0, 0, 0],
        explode: 0,
        spinUp: false,
        rpm: 0,
      };
    },
  },
  explodedReel: {
    id: 'explodedReel',
    name: 'Exploded Assembly Reel',
    shortLabel: 'Exploded Reel',
    badge: 'EXPLODED REEL',
    description: 'Animates explode slider 0% to 100% and back while orbiting all layers',
    durationSec: 7.5,
    evaluate: (u: number) => {
      const angle = 0.5 + u * Math.PI * 1.5;
      const radius = 215;
      const y = 115 + 22 * Math.cos(u * Math.PI);

      let explode = 0;
      if (u < 0.12) {
        explode = 0;
      } else if (u < 0.55) {
        explode = smoothstep(0.12, 0.55, u);
      } else if (u < 0.78) {
        explode = 1.0;
      } else {
        explode = 1.0 - smoothstep(0.78, 1.0, u) * 0.65;
      }

      return {
        pos: [radius * Math.sin(angle), y, radius * Math.cos(angle)],
        target: [0, 5, 0],
        explode,
        spinUp: false,
        rpm: 0,
      };
    },
  },
  spinUpReel: {
    id: 'spinUpReel',
    name: '3,500 RPM Weapon Spin-Up Reel',
    shortLabel: '3,500 RPM Reel',
    badge: 'WEAPON SPIN-UP',
    description: 'Accelerates from 0 to 3,500 RPM with synchronized optical strobe beam',
    durationSec: 6.5,
    evaluate: (u: number) => {
      let pos: [number, number, number];
      let target: [number, number, number];

      if (u < 0.35) {
        const t = smoothstep(0, 0.35, u);
        pos = lerpVec3([100, 22, 115], [120, 55, 95], t);
        target = [0, 4, 0];
      } else if (u < 0.75) {
        const t = smoothstep(0.35, 0.75, u);
        const phi = -t * Math.PI * 0.8;
        const r = 175;
        pos = [r * Math.sin(phi + 0.9), 55 + 75 * t, r * Math.cos(phi + 0.9)];
        target = [0, 0, 0];
      } else {
        const t = smoothstep(0.75, 1.0, u);
        pos = lerpVec3([-95, 130, 95], [0, 185, 45], t);
        target = [0, 0, 0];
      }

      let rpm = 0;
      if (u < 0.15) {
        rpm = Math.round(smoothstep(0, 0.15, u) * 700);
      } else if (u < 0.65) {
        rpm = Math.round(700 + smoothstep(0.15, 0.65, u) * 2800);
      } else {
        rpm = 3500;
      }

      return {
        pos,
        target,
        explode: 0,
        spinUp: true,
        rpm,
      };
    },
  },
  cleatMacro: {
    id: 'cleatMacro',
    name: 'High-detail Macro Cleat & Weapon Zoom',
    shortLabel: 'Cleat & Weapon Macro',
    badge: 'MACRO CLEAT ZOOM',
    description: 'Macro zoom on Ti-6Al-4V cleat teeth, motor bearings, and weapon unibody',
    durationSec: 7.0,
    evaluate: (u: number) => {
      let pos: [number, number, number];
      let target: [number, number, number];

      if (u < 0.35) {
        const t = smoothstep(0, 0.35, u);
        pos = lerpVec3([-82, 16, 24], [-70, 22, 28], t);
        target = [-54, -2, 0];
      } else if (u < 0.70) {
        const t = smoothstep(0.35, 0.70, u);
        pos = lerpVec3([-70, 22, 28], [25, 52, 60], t);
        target = lerpVec3([-54, -2, 0], [0, 6, 0], t);
      } else {
        const t = smoothstep(0.70, 1.0, u);
        pos = lerpVec3([25, 52, 60], [140, 105, 140], t);
        target = [0, 0, 0];
      }

      return {
        pos,
        target,
        explode: 0.08,
        spinUp: false,
        rpm: 0,
      };
    },
  },
};

/* =========================================================================
   3D VIDEO TURNTABLE CAPTURE & DIRECTOR
   ========================================================================= */

export interface VideoRecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  fileExtension: string;
  durationSec: number;
  trackId: CinematicTrackId;
  trackName: string;
  presetName: string;
  sizeBytes: number;
}

export function getBestVideoMimeType(): { mimeType: string; extension: string } {
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
  ];

  if (typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined') {
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c.mime)) {
        return { mimeType: c.mime, extension: c.ext };
      }
    }
  }
  return { mimeType: 'video/webm', extension: 'webm' };
}

/** Cinematic Director Component running inside Three.js Canvas */
export function Rev5CinematicDirector({
  activeTrack,
  presetId,
  isRunning,
  isRecording,
  onProgress,
  onExplodeUpdate,
  onSpinUpdate,
  onComplete,
}: {
  activeTrack: CinematicTrackId;
  presetId: StudioLightingPreset;
  isRunning: boolean;
  isRecording: boolean;
  onProgress: (percent: number, elapsedSec: number, totalSec: number) => void;
  onExplodeUpdate?: (explode: number) => void;
  onSpinUpdate?: (spin: boolean, rpm: number) => void;
  onComplete: (videoResult: VideoRecordingResult | null) => void;
}) {
  const { gl, camera } = useThree();
  const controlsRef = useThree((state) => state.controls) as any;
  const elapsedRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRunningRef = useRef(isRunning);
  const isRecordingRef = useRef(isRecording);
  const activeTrackRef = useRef(activeTrack);
  const presetIdRef = useRef(presetId);

  useEffect(() => {
    isRunningRef.current = isRunning;
    isRecordingRef.current = isRecording;
    activeTrackRef.current = activeTrack;
    presetIdRef.current = presetId;
  }, [isRunning, isRecording, activeTrack, presetId]);

  useEffect(() => {
    if (!isRunning) {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch (e) {
          console.warn('Error stopping MediaRecorder:', e);
        }
      }
      elapsedRef.current = 0;
      return;
    }

    elapsedRef.current = 0;
    chunksRef.current = [];

    if (isRecording) {
      const canvas = gl.domElement as HTMLCanvasElement & {
        captureStream?: (fps?: number) => MediaStream;
      };

      if (typeof canvas.captureStream === 'function' && typeof MediaRecorder !== 'undefined') {
        try {
          const stream = canvas.captureStream(60);
          const { mimeType, extension } = getBestVideoMimeType();
          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 10000000,
          });

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };

          recorder.onstop = () => {
            if (chunksRef.current.length > 0) {
              const blob = new Blob(chunksRef.current, { type: mimeType });
              const url = URL.createObjectURL(blob);
              const track = CINEMATIC_TRACKS[activeTrackRef.current];
              const preset = STUDIO_LIGHTING_PRESETS[presetIdRef.current];
              onComplete({
                blob,
                url,
                mimeType,
                fileExtension: extension,
                durationSec: track.durationSec,
                trackId: activeTrackRef.current,
                trackName: track.name,
                presetName: preset.name,
                sizeBytes: blob.size,
              });
            } else {
              onComplete(null);
            }
          };

          recorder.start(100);
          recorderRef.current = recorder;
        } catch (err) {
          console.error('Failed to initialize MediaRecorder on 3D canvas:', err);
          onComplete(null);
        }
      } else {
        console.warn('MediaRecorder or canvas.captureStream not supported in this environment');
      }
    }
  }, [isRunning, isRecording, gl, onComplete]);

  useFrame((_, delta) => {
    if (!isRunning) return;

    const track = CINEMATIC_TRACKS[activeTrack];
    elapsedRef.current += delta;
    const u = Math.min(1.0, elapsedRef.current / track.durationSec);

    const frame = track.evaluate(u);

    camera.position.set(frame.pos[0], frame.pos[1], frame.pos[2]);

    if (controlsRef && controlsRef.target) {
      controlsRef.target.set(frame.target[0], frame.target[1], frame.target[2]);
      controlsRef.update();
    } else {
      camera.lookAt(frame.target[0], frame.target[1], frame.target[2]);
    }

    if (frame.explode !== undefined && onExplodeUpdate) {
      onExplodeUpdate(frame.explode);
    }

    if (onSpinUpdate) {
      onSpinUpdate(frame.spinUp ?? false, frame.rpm ?? 0);
    }

    const percent = Math.min(100, Math.round(u * 100));
    onProgress(percent, elapsedRef.current, track.durationSec);

    if (u >= 1.0) {
      if (isRecording && recorderRef.current && recorderRef.current.state === 'recording') {
        try {
          recorderRef.current.stop();
        } catch (e) {
          console.error('Error stopping MediaRecorder:', e);
        }
      } else if (!isRecording) {
        onComplete(null);
      }
    }
  });

  return null;
}

/* =========================================================================
   CINEMATIC VIDEO SHOWCASE PREVIEW MODAL
   ========================================================================= */

export function Rev5VideoModal({
  videoResult,
  onClose,
  onRecordAgain,
}: {
  videoResult: VideoRecordingResult;
  onClose: () => void;
  onRecordAgain: () => void;
}) {
  const downloadFilename = useMemo(
    () => `eyeliner_rev5_${videoResult.trackId}_${Date.now()}.${videoResult.fileExtension}`,
    [videoResult]
  );

  return (
    <div className="rev5-modal-backdrop" role="dialog" aria-modal="true" aria-label="3D Video Preview">
      <div className="rev5-modal-card">
        <div className="rev5-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="cyber-dot" style={{ background: '#ff1744', width: 9, height: 9 }} />
            <h2 className="rev5-modal-title">3D Turntable Video Rendered</h2>
          </div>
          <button
            type="button"
            className="mini"
            onClick={onClose}
            aria-label="Close modal"
            style={{ padding: '4px 10px', fontSize: 13 }}
          >
            ✕
          </button>
        </div>

        <div className="rev5-modal-video-box">
          <video
            src={videoResult.url}
            controls
            autoPlay
            loop
            playsInline
            className="rev5-modal-video"
          />
        </div>

        <div className="rev5-modal-specs">
          <div className="rev5-spec-pill">
            <span className="spec-name">Sequence Track:</span>
            <span className="spec-val">{videoResult.trackName}</span>
          </div>
          <div className="rev5-spec-pill">
            <span className="spec-name">Studio Lighting:</span>
            <span className="spec-val">{videoResult.presetName}</span>
          </div>
          <div className="rev5-spec-pill">
            <span className="spec-name">Capture Rate:</span>
            <span className="spec-val">60 FPS WebGL</span>
          </div>
          <div className="rev5-spec-pill">
            <span className="spec-name">Format:</span>
            <span className="spec-val">{videoResult.fileExtension.toUpperCase()}</span>
          </div>
          <div className="rev5-spec-pill">
            <span className="spec-name">Duration:</span>
            <span className="spec-val">{videoResult.durationSec.toFixed(1)}s</span>
          </div>
          <div className="rev5-spec-pill">
            <span className="spec-name">File Size:</span>
            <span className="spec-val">{(videoResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        </div>

        <div className="rev5-modal-actions">
          <a
            href={videoResult.url}
            download={downloadFilename}
            className="rev5-download-cta"
            style={{ flex: 1, padding: '12px 18px', fontSize: 13 }}
          >
            <span>⤓ DOWNLOAD {videoResult.fileExtension.toUpperCase()} CLIP</span>
            <span style={{ opacity: 0.8, fontSize: '11px' }}>
              ({(videoResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB)
            </span>
          </a>
          <button
            type="button"
            className="btn"
            onClick={onRecordAgain}
            style={{ minHeight: 44, padding: '0 16px', fontSize: 12 }}
          >
            🎬 Record Another
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            style={{ minHeight: 44, padding: '0 16px', fontSize: 12 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

