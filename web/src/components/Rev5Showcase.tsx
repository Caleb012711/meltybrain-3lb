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
  children,
  onRpmUpdate,
}: {
  spinUp: boolean;
  children: React.ReactNode;
  onRpmUpdate?: (rpm: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const beaconRef = useRef<THREE.PointLight>(null);
  const currentSpeed = useRef(0);
  const currentAngle = useRef(0);

  useFrame((_, delta) => {
    const targetSpeed = spinUp ? 18.0 : 0.0; // ~3,500 RPM visually scaled
    currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, delta * 2.5);

    if (groupRef.current && currentSpeed.current > 0.001) {
      currentAngle.current += currentSpeed.current * delta;
      groupRef.current.rotation.y = currentAngle.current;

      // Optical Heading Beacon strobe: pulses bright once per revolution as heading passes forward (angle ~ 0)
      if (beaconRef.current) {
        const normAngle = ((currentAngle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        // Strobe window around 0 rad (+/- 0.3 rad)
        const inStrobeWindow = normAngle < 0.35 || normAngle > Math.PI * 2 - 0.35;
        beaconRef.current.intensity = inStrobeWindow && spinUp ? 3.5 : 0.2;
      }

      if (onRpmUpdate) {
        const displayRpm = Math.round((currentSpeed.current / 18.0) * 3500);
        onRpmUpdate(displayRpm);
      }
    } else if (onRpmUpdate && currentSpeed.current <= 0.001) {
      onRpmUpdate(0);
    }
  });

  return (
    <group ref={groupRef}>
      {children}
      {/* Meltybrain Forward Heading LED Beacon */}
      <pointLight ref={beaconRef} position={[0, 16, -60]} color="#00ff66" distance={120} intensity={0.4} />
      {spinUp && (
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
