import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import { cadHref, cadModels } from '../data/content';
import { useModelParts, usePrefersReducedMotion } from '../hooks/hooks';
import { indexColor, roleMaterial, type PartInfo } from './materials';
import { useTheme } from '../hooks/useTheme';

export type ColorMode = 'role' | 'index' | 'plain';

export const EMPTY_SET: Set<number> = new Set();

export class GlErrorBoundary extends Component<
  { onFail: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
const EMISSIVE_ORANGE = new THREE.Color('#e8490f');

import { CircularOuterShell } from './CircularShell';
import { TOP_ARMOR_PART_INDEX, TopArmorPlate } from './TopArmorPlate';
import { WheelPodAssembly } from './WheelPodAssembly';
import { PrecisionDetails } from './PrecisionDetails';
import {
  type ShellMaterialPreset,
  type ShellProfilePreset,
  type TopShellFinishPreset,
  type LighteningPocketPreset,
  type BeaconWindowPreset,
  type WheelTreadType,
  type PrecisionDetailsConfig,
} from './materials';

// Shared studio lighting for every 3D canvas on the site. Metals need an
// environment map or they render near-black: this builds one procedurally
// (Lightformers only — no network fetch, safe on static hosts and offline).
export function ViewerLights() {
  const { theme } = useTheme();
  return (
    <>
      <hemisphereLight args={['#fffaf1', theme === 'dark' ? '#404640' : '#c9c8bd', theme === 'dark' ? 1.15 : 0.95]} />
      <directionalLight position={[5, 8, 4]} intensity={2.2} />
      <directionalLight position={[-6, 3, -6]} intensity={1.0} color="#dfe8ff" />
      <directionalLight position={[-2, 2, 6]} intensity={0.5} color="#ffffff" />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer form="circle" intensity={4.5} position={[0, 5, -9]} scale={2} />
          <Lightformer form="rect" intensity={2.5} position={[-5, 1, -1]} scale={[3, 2]} />
          <Lightformer form="rect" intensity={2.5} position={[5, 1, 0]} scale={[3, 2]} />
          <Lightformer form="rect" intensity={1.5} position={[0, 5, 5]} scale={[6, 2]} color="#fff4e8" />
          <Lightformer form="ring" intensity={2} position={[0, -2, 0]} scale={4} color="#e0e8ff" />
        </group>
      </Environment>
    </>
  );
}

export function ExplodingModel({
  url,
  parts,
  explode,
  wireframe,
  xray,
  spin,
  colorMode,
  selected,
  hovered,
  hidden,
  isolated,
  circularShell = false,
  // LiftOff Rev6 TPU shell default: TPU 95A tub is LiftOff-correct; Ti only for ring/cleats.
  shellMaterial = 'tpu-orange',
  shellProfile = 'body',
  topShell = false,
  topShellFinish = 'titanium',
  topShellPocket = 'radial',
  topShellBeacon = 'flush-prism',
  wheelPodEnhanced = false,
  wheelTread = 'urethane',
  wheelCutaway = false,
  precisionHardware = false,
  precisionConfig,
  onSelect,
  onHover,
}: {
  url: string;
  parts: PartInfo[];
  explode: number;
  wireframe: boolean;
  xray: boolean;
  spin: boolean;
  colorMode: ColorMode;
  selected: number | null;
  hovered: number | null;
  hidden: Set<number>;
  isolated: number | null;
  circularShell?: boolean;
  shellMaterial?: ShellMaterialPreset;
  shellProfile?: ShellProfilePreset;
  topShell?: boolean;
  topShellFinish?: TopShellFinishPreset;
  topShellPocket?: LighteningPocketPreset;
  topShellBeacon?: BeaconWindowPreset;
  wheelPodEnhanced?: boolean;
  wheelTread?: WheelTreadType;
  wheelCutaway?: boolean;
  precisionHardware?: boolean;
  precisionConfig?: PrecisionDetailsConfig;
  onSelect: (i: number | null) => void;
  onHover: (i: number | null) => void;
}) {
  const gltf = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const base = useRef(new Map<string, { pos: THREE.Vector3; dir: THREE.Vector3 }>());
  // Index-color materials keyed by ORIGINAL solid idx (not mesh order):
  // dropped_from_glb gaps make meshCount-based slots collide (solid_120 vs solid_24).
  const indexMats = useRef(new Map<number, THREE.MeshStandardMaterial>());
  const xrayMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a94a6',
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );
  const xraySelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e8490f',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );
  useEffect(
    () => () => {
      xrayMat.dispose();
      xraySelMat.dispose();
    },
    [xrayMat, xraySelMat]
  );

  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(s);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 4 / maxDim;
    s.scale.setScalar(scale);
    const c2 = center.clone().multiplyScalar(scale);
    s.position.sub(c2);
    s.updateMatrixWorld(true);
    return s;
  }, [gltf]);

  const meshCount = useMemo(() => {
    let n = 0;
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) n += 1;
    });
    return n;
  }, [scene]);

  useEffect(() => {
    const mats = indexMats.current;
    mats.forEach((m) => m.dispose());
    mats.clear();
    // Sized lazily per original idx on first use (see material effect) —
    // meshCount is smaller than max original idx once degenerates drop.
    return () => {
      mats.forEach((m) => m.dispose());
      mats.clear();
    };
  }, [meshCount]);

  const matForIndex = (idx: number, total: number) => {
    let m = indexMats.current.get(idx);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color: indexColor(idx, Math.max(1, total)),
        metalness: 0.55,
        roughness: 0.45,
        side: THREE.DoubleSide,
      });
      m.emissive.copy(EMISSIVE_ORANGE);
      m.emissiveIntensity = 0;
      indexMats.current.set(idx, m);
    }
    return m;
  };

  // One-time per model: part index, explode vectors, per-mesh material clones.
  // Clones are per-mesh so selection/wireframe never leak across same-role parts.
  useEffect(() => {
    base.current.clear();
    const root = new THREE.Box3().setFromObject(scene).getCenter(new THREE.Vector3());
    let k = 0;
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      let idx = k;
      let p: THREE.Object3D | null = o;
      while (p) {
        const m = /^solid_(\d+)$/.exec(p.name);
        if (m) {
          // Node names are authoritative (written by tools/cad_convert.py).
          // Original indices survive degenerate-dropping, so do NOT bound by mesh count.
          const n = parseInt(m[1], 10);
          if (Number.isFinite(n) && n >= 0) idx = n;
          break;
        }
        p = p.parent;
      }
      o.userData.partIndex = idx;
      k += 1;
      const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
      const dir = c.clone().sub(root);
      if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
      dir.normalize();
      base.current.set(o.uuid, { pos: o.position.clone(), dir });
      // dispose previous clones, then make fresh per-mesh clones
      const old = o.userData.clones as
        | { role: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial }
        | undefined;
      old?.role.dispose();
      old?.plain.dispose();
      const roleClone = roleMaterial('fastener-dark').clone();
      roleClone.emissive.copy(EMISSIVE_ORANGE);
      roleClone.emissiveIntensity = 0;
      const plainSrc = (Array.isArray(o.material) ? o.material[0] : o.material) as THREE.Material;
      const plainClone = (
        plainSrc instanceof THREE.MeshStandardMaterial
          ? plainSrc.clone()
          : new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: 0.6, roughness: 0.5 })
      ) as THREE.MeshStandardMaterial;
      plainClone.emissive.copy(EMISSIVE_ORANGE);
      plainClone.emissiveIntensity = 0;
      o.userData.clones = { role: roleClone, plain: plainClone };
    });
    return () => {
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const old = o.userData.clones as
          | { role: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial }
          | undefined;
        old?.role.dispose();
        old?.plain.dispose();
        delete o.userData.clones;
      });
    };
  }, [scene, meshCount]);

  // Apply role from parts.json to the per-mesh clones (runs when manifest arrives).
  useEffect(() => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const clones = o.userData.clones as
        | { role: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial }
        | undefined;
      if (!clones) return;
      const idx = (o.userData.partIndex as number) ?? 0;
      const template = roleMaterial(parts[idx]?.role ?? 'fastener-dark');
      clones.role.color.copy(template.color);
      clones.role.metalness = template.metalness;
      clones.role.roughness = template.roughness;
    });
  }, [scene, parts]);

  // Position + visibility only (cheap per slider tick — no material allocs).
  // Spread 2.6: full assembly needs room for ~89 meshed nodes to read as separate parts.
  const isMainCad = url.includes('main-cad');
  const isWheelPod = url.includes('wheel-pod');
  const showCircularShell = circularShell && isMainCad;

  useEffect(() => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const idx = (o.userData.partIndex as number) ?? 0;
      const rec = base.current.get(o.uuid);
      if (rec) o.position.copy(rec.pos).addScaledVector(rec.dir, explode * 2.6);
      if (isWheelPod && wheelPodEnhanced) {
        o.visible = false;
      } else if (idx === 80 && showCircularShell) {
        o.visible = false;
      } else {
        o.visible = !hidden.has(idx) && (isolated === null || isolated === idx);
      }
    });
  }, [scene, explode, hidden, isolated, showCircularShell, isWheelPod, wheelPodEnhanced]);

  // Material mode only (runs on mode/selection toggles, not on explode).
  useEffect(() => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const idx = (o.userData.partIndex as number) ?? 0;
      const clones = o.userData.clones as
        | { role: THREE.MeshStandardMaterial; plain: THREE.MeshStandardMaterial }
        | undefined;
      if (!clones) return;
      if (xray) {
        o.material = selected === idx ? xraySelMat : xrayMat;
        return;
      }
      const mat =
        colorMode === 'role'
          ? clones.role
          : colorMode === 'index'
            ? matForIndex(idx, parts.length > 0 ? parts.length : meshCount)
            : clones.plain;
      o.material = mat;
      mat.wireframe = wireframe;
      mat.emissiveIntensity = selected === idx ? 0.45 : hovered === idx ? 0.22 : 0;
    });
  }, [scene, colorMode, wireframe, xray, xrayMat, xraySelMat, meshCount, selected, hovered, parts]);

  useFrame((_, delta) => {
    // Spin about local Z: callers level Z-up CAD flat, which maps local Z to
    // world-vertical — the weapon axis. (Y would tumble end-over-end.)
    if (spin && group.current) group.current.rotation.z += delta * 0.5;
  });

  const pick = (obj: THREE.Object3D): number | null => {
    const idx = obj.userData.partIndex as number | undefined;
    return typeof idx === 'number' ? idx : null;
  };

  return (
    <group ref={group}>
      <primitive
        object={scene}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(pick(e.object));
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(pick(e.object));
        }}
        onPointerOut={() => {
          onHover(null);
        }}
      />
      {showCircularShell && (
        // partIndex 80 = circular body shell (explode -1.5Z).
        // Perimeter ring hoop is 82 with explode +0.5Z once split out of
        // CircularOuterShell (currently shares the body group — see TODO in
        // TopArmorPlate.tsx); top armor below is 81 so selection /
        // isolate / hide never collide.
        <CircularOuterShell
          material={shellMaterial}
          profile={shellProfile}
          wireframe={wireframe}
          xray={xray}
          selected={selected === 80}
          hovered={hovered === 80}
          visible={!hidden.has(80) && (isolated === null || isolated === 80)}
          explode={explode}
          onSelect={() => onSelect(80)}
          onHover={(h) => onHover(h ? 80 : null)}
        />
      )}
      {isMainCad && topShell && (
        // partIndex 81 = top armor plate (explode +1.8Z), distinct from body 80.
        <TopArmorPlate
          finish={topShellFinish}
          pocketStyle={topShellPocket}
          beaconWindow={topShellBeacon}
          wireframe={wireframe}
          xray={xray}
          selected={selected === TOP_ARMOR_PART_INDEX}
          hovered={hovered === TOP_ARMOR_PART_INDEX}
          visible={!hidden.has(TOP_ARMOR_PART_INDEX) && (isolated === null || isolated === TOP_ARMOR_PART_INDEX)}
          explode={explode}
          onSelect={() => onSelect(TOP_ARMOR_PART_INDEX)}
          onHover={(h) => onHover(h ? TOP_ARMOR_PART_INDEX : null)}
        />
      )}
      {isMainCad && precisionHardware && (
        <PrecisionDetails
          config={precisionConfig}
          wireframe={wireframe}
          xray={xray}
          explode={explode}
          visible={isolated === null}
        />
      )}
      {isMainCad && wheelPodEnhanced && (
        <group>
          {/* Left Pod Assembly */}
          <group position={[-0.68, 0, -0.05]} scale={0.78}>
            <WheelPodAssembly
              treadType={wheelTread}
              explode={explode}
              wireframe={wireframe}
              xray={xray}
              showBearingsCutaway={wheelCutaway}
            />
          </group>
          {/* Right Pod Assembly */}
          <group position={[0.68, 0, -0.05]} rotation={[0, 0, Math.PI]} scale={0.78}>
            <WheelPodAssembly
              treadType={wheelTread}
              explode={explode}
              wireframe={wireframe}
              xray={xray}
              showBearingsCutaway={wheelCutaway}
            />
          </group>
        </group>
      )}
      {isWheelPod && wheelPodEnhanced && (
        <group scale={3.2}>
          <WheelPodAssembly
            treadType={wheelTread}
            explode={explode}
            wireframe={wireframe}
            xray={xray}
            showBearingsCutaway={wheelCutaway}
            selected={selected !== null}
            hovered={hovered !== null}
            onSelect={() => onSelect(selected === 12 ? null : 12)}
            onHover={(h) => onHover(h ? 12 : null)}
          />
        </group>
      )}
    </group>
  );
}

const _fFromT = new THREE.Vector3();
const _fFromP = new THREE.Vector3();
const _fToT = new THREE.Vector3();
const _fToP = new THREE.Vector3();
const HOME_POS = new THREE.Vector3(4.4, 3.1, 5.4);
const HOME_TGT = new THREE.Vector3(0, 0, 0);

export function FocusRig({
  idx,
  homeKey,
  reduced,
}: {
  idx: number | null;
  homeKey: number;
  reduced: boolean;
}) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3;
    update: () => void;
    addEventListener?: (t: string, f: () => void) => void;
    removeEventListener?: (t: string, f: () => void) => void;
  } | null;
  const anim = useRef(false);
  const t = useRef(0);

  useEffect(() => {
    if (!controls) return;
    if (idx === null) {
      _fFromT.copy(controls.target);
      _fFromP.copy(camera.position);
      _fToT.copy(HOME_TGT);
      _fToP.copy(HOME_POS);
    } else {
      let found: THREE.Object3D | null = null;
      scene.traverse((o) => {
        if (!found && o.userData.partIndex === idx && (o as THREE.Mesh).isMesh && o.visible) {
          found = o;
        }
      });
      if (!found) {
        scene.traverse((o) => {
          if (!found && o.userData.partIndex === idx && (o as THREE.Mesh).isMesh) {
            found = o;
          }
        });
      }
      if (!found) return;
      const box = new THREE.Box3().setFromObject(found);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z);
      const fov = (camera as THREE.PerspectiveCamera).fov
        ? ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
        : 0.7;
      const dist = THREE.MathUtils.clamp((maxSize * 2.0) / Math.tan(fov / 2), 0.8, 8);
      _fFromT.copy(controls.target);
      _fFromP.copy(camera.position);
      _fToT.copy(center);
      const dir = camera.position.clone().sub(controls.target);
      if (dir.lengthSq() < 1e-6) dir.set(0.4, 0.35, 1);
      dir.normalize();
      _fToP.copy(center).addScaledVector(dir, dist);
    }
    if (reduced) {
      controls.target.copy(_fToT);
      camera.position.copy(_fToP);
      controls.update();
      return;
    }
    t.current = 0;
    anim.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, homeKey, scene, camera, controls, reduced]);

  useEffect(() => {
    if (!controls?.addEventListener) return;
    const stop = () => {
      anim.current = false;
    };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener?.('start', stop);
  }, [controls]);

  useFrame((_, delta) => {
    if (!anim.current || !controls) return;
    t.current += delta / 0.6;
    const k = t.current >= 1 ? 1 : 1 - Math.pow(1 - t.current, 3);
    controls.target.lerpVectors(_fFromT, _fToT, k);
    camera.position.lerpVectors(_fFromP, _fToP, k);
    controls.update();
    if (t.current >= 1) anim.current = false;
  });
  return null;
}

function StlOverlay({ geometry }: { geometry: THREE.BufferGeometry | null }) {
  const normalized = useMemo(() => {
    if (!geometry) return null;
    const g = geometry.clone();
    g.center();
    g.computeBoundingBox();
    const bb = g.boundingBox;
    if (bb) {
      // Same normalize path as ExplodingModel (4/maxDim, centered at origin).
      const size = new THREE.Vector3();
      bb.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      g.scale(4 / maxDim, 4 / maxDim, 4 / maxDim);
      g.center();
    }
    return g;
  }, [geometry]);
  useEffect(() => {
    return () => {
      normalized?.dispose();
    };
  }, [normalized]);
  if (!normalized) return null;
  return (
    <mesh geometry={normalized} position={[0, 0, 0]}>
      <meshStandardMaterial color="#1a6b32" roughness={0.6} transparent opacity={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

function LoaderBar({ onDone }: { onDone: () => void }) {
  const { progress, active } = useProgress();
  useEffect(() => {
    if (!active) onDone();
  }, [active, onDone]);
  if (!active) return null;
  return (
      <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        background: 'var(--surface)',
        border: '1px solid #d4d7dd',
        borderTop: '3px solid #1a1d21',
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 13,
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      LOADING CAD — {Math.round(progress)}%
    </div>
  );
}

export function CadViewer({ compact = false }: { compact?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { theme } = useTheme();
  const [modelId, setModelId] = useState('full');
  const [explode, setExplode] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('role');
  const [circularShell, setCircularShell] = useState(false);
  // LiftOff Rev6 TPU shell default: TPU 95A tub is LiftOff-correct; Ti only for ring/cleats.
  const [shellMaterial, setShellMaterial] = useState<ShellMaterialPreset>('tpu-orange');
  const [shellProfile, setShellProfile] = useState<ShellProfilePreset>('body');
  const [topShell, setTopShell] = useState(false);
  const [topShellFinish, setTopShellFinish] = useState<TopShellFinishPreset>('titanium');
  const [topShellPocket, setTopShellPocket] = useState<LighteningPocketPreset>('radial');
  const [topShellBeacon, setTopShellBeacon] = useState<BeaconWindowPreset>('flush-prism');
  const [wheelPodEnhanced, setWheelPodEnhanced] = useState(false);
  const [wheelTread, setWheelTread] = useState<WheelTreadType>('urethane');
  const [wheelCutaway, setWheelCutaway] = useState(false);
  const [precisionHardware, setPrecisionHardware] = useState(false);
  const [spinOverride, setSpinOverride] = useState<boolean | null>(null);
  const spin = spinOverride ?? !reduced;
  const [stlGeo, setStlGeo] = useState<THREE.BufferGeometry | null>(null);
  const [stlName, setStlName] = useState('');
  const [stlErr, setStlErr] = useState('');
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const parts = useModelParts(modelId);
  const stlInput = useRef<HTMLInputElement | null>(null);

  const selectModel = (id: string) => {
    setModelId(id);
    setReady(false);
    setFailed(false);
  };

  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];

  const onStlFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      setStlErr('STL over 20 MB — export a single part first.');
      return;
    }
    setStlErr('');
    try {
      const buf = await f.arrayBuffer();
      const { STLLoader } = (await import(
        'three/examples/jsm/loaders/STLLoader.js'
      )) as unknown as { STLLoader: new () => { parse(b: ArrayBuffer): THREE.BufferGeometry } };
      const geo = new STLLoader().parse(buf);
      geo.computeVertexNormals();
      setStlGeo((prev) => {
        prev?.dispose();
        return geo;
      });
      setStlName(f.name);
    } catch {
      setStlErr('Could not parse that STL — is it a binary or ASCII .stl file?');
    }
  };

  if (failed) {
    return (
      <div className="viewer">
        <div className="viewer-fallback">
          <img src="eyeliner_summer_2025_render.webp" alt="Overhead render of the Eyeliner 3lb meltybrain" loading="lazy" decoding="async" />
        </div>
        <div className="viewer-bar">
          <span className="meta">3D failed to load — the render and STEP downloads still work.</span>
          <button className="mini" onClick={() => setFailed(false)}>
            Retry 3D
          </button>
        </div>
        <p className="status">
          {model.label} · {model.solids} solids · STEP {model.stepSize} ·{' '}
          <a href={cadHref(model.step)} download>
            Download STEP
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="viewer">
      <div style={{ position: 'relative' }}>
        <GlErrorBoundary onFail={() => setFailed(true)}>
        <Canvas
          camera={{ position: [4.4, 3.1, 5.4], fov: 42 }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.NeutralToneMapping;
            gl.toneMappingExposure = 1.0;
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.setClearColor('#000000', 0);
          }}
          role="img"
          aria-label={`3D model of Eyeliner combat robot, ${model.label}`}
        >
          <color attach="background" args={[theme === 'dark' ? '#20211f' : '#eeece5']} />
          <ViewerLights />
          <gridHelper args={[12, 24, theme === 'dark' ? '#4a4842' : '#c9c5ba', theme === 'dark' ? '#2b2b28' : '#e2ded4']} position={[0, -0.62, 0]} />
          <Suspense fallback={null}>
            {/* CAD is Z-up: level the ring flat. */}
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <ExplodingModel
                url={model.glb}
                parts={parts}
                explode={explode}
                wireframe={wireframe}
                xray={xray}
                spin={spin && !reduced}
                colorMode={colorMode}
                selected={null}
                hovered={null}
                hidden={EMPTY_SET}
                isolated={null}
                circularShell={circularShell}
                shellMaterial={shellMaterial}
                shellProfile={shellProfile}
                topShell={topShell}
                topShellFinish={topShellFinish}
                topShellPocket={topShellPocket}
                topShellBeacon={topShellBeacon}
                wheelPodEnhanced={wheelPodEnhanced}
                wheelTread={wheelTread}
                wheelCutaway={wheelCutaway}
                precisionHardware={precisionHardware}
                onSelect={() => undefined}
                onHover={() => undefined}
              />
            </group>
            <StlOverlay geometry={stlGeo} />
          </Suspense>
          <OrbitControls
            enableDamping
            autoRotate={false}
            makeDefault
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            minDistance={0.8}
            maxDistance={22}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 2 + 0.1}
            zoomToCursor
            onChange={(e) => {
              const c = e?.target;
              if (c && c.target && c.target.length() > 3) {
                c.target.setLength(3);
                c.update();
              }
            }}
          />
        </Canvas>
        </GlErrorBoundary>
        {!ready && <LoaderBar onDone={() => setReady(true)} />}
      </div>
      <div className="viewer-bar" role="toolbar" aria-label="CAD viewer controls">
        <div className="tabs" role="radiogroup" aria-label="Model">
          {cadModels.map((m) => (
            <button
              key={m.id}
              className="tab"
              role="radio"
              aria-checked={modelId === m.id}
              aria-pressed={modelId === m.id}
              onClick={() => selectModel(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <label className="meta">
          Explode{' '}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
            aria-label="Exploded view"
          />
        </label>
        {!compact && (
          <label className="meta">
            Color{' '}
            <select
              aria-label="Color mode"
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as ColorMode)}
              style={{ minHeight: 44 }}
            >
              <option value="role">By heuristic role</option>
              <option value="index">By part #</option>
              <option value="plain">Plain</option>
            </select>
          </label>
        )}
        {modelId === 'full' && (
          <>
            <button
              className="mini"
              aria-pressed={circularShell}
              onClick={() => setCircularShell((v) => !v)}
              title="Toggle circularized outer shell vs stock CAD squarish solid_080"
            >
              Shell {circularShell ? '◯ Circular' : '◻ Stock'}
            </button>
            {circularShell && (
              <select
                className="mini select-pill"
                aria-label="Shell material"
                value={shellMaterial}
                onChange={(e) => setShellMaterial(e.target.value as ShellMaterialPreset)}
                style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
              >
                <option value="titanium">Ti-6Al-4V</option>
                <option value="aluminum">7075-Al</option>
                <option value="carbon">Carbon Fiber</option>
                <option value="tpu-orange">TPU Orange</option>
                <option value="tpu-stealth">TPU Stealth</option>
              </select>
            )}
            {circularShell && (
              <select
                className="mini select-pill"
                aria-label="Shell profile"
                value={shellProfile}
                onChange={(e) => setShellProfile(e.target.value as ShellProfilePreset)}
                style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
              >
                <option value="body">Body (R 1.25)</option>
                <option value="perimeter">Armor Ring (R 2.05)</option>
                <option value="hybrid">Dual Hybrid</option>
              </select>
            )}
            <button
              className="mini"
              aria-pressed={topShell}
              onClick={() => setTopShell((v) => !v)}
              title="Toggle top armor plate with countersunk holes & optical beacon"
            >
              Top Armor {topShell ? '◯ Active' : 'Off'}
            </button>
            {topShell && (
              <select
                className="mini select-pill"
                aria-label="Top shell finish"
                value={topShellFinish}
                onChange={(e) => setTopShellFinish(e.target.value as TopShellFinishPreset)}
                style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
              >
                <option value="titanium">Ti-6Al-4V Finish</option>
                <option value="aluminum">7075-Al Anodized</option>
                <option value="carbon">Carbon Fiber</option>
                <option value="billet">Billet Milled</option>
                <option value="polycarbonate">Smoked Polycarb</option>
              </select>
            )}
            {topShell && (
              <select
                className="mini select-pill"
                aria-label="Lightening pockets"
                value={topShellPocket}
                onChange={(e) => setTopShellPocket(e.target.value as LighteningPocketPreset)}
                style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
              >
                <option value="radial">Radial (-35%)</option>
                <option value="isogrid">Isogrid (-45%)</option>
                <option value="solid">Solid Billet</option>
              </select>
            )}
            {topShell && (
              <select
                className="mini select-pill"
                aria-label="Optical beacon window"
                value={topShellBeacon}
                onChange={(e) => setTopShellBeacon(e.target.value as BeaconWindowPreset)}
                style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
              >
                <option value="flush-prism">Flush Prism</option>
                <option value="diffuse-dome">Diffuse Dome</option>
                <option value="recessed-slit">Recessed Slit</option>
              </select>
            )}
            <button
              className="mini"
              aria-pressed={precisionHardware}
              onClick={() => setPrecisionHardware((v) => !v)}
              title="Toggle precision hardware: standoffs, fasteners, central bearing stack, timing belt, wiring, accelerometer"
            >
              Hardware {precisionHardware ? '⚙ Full' : 'Off'}
            </button>
            <select
              className="mini select-pill"
              aria-label="Wheel pod tread"
              value={wheelTread}
              onChange={(e) => setWheelTread(e.target.value as WheelTreadType)}
              style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
            >
              <option value="urethane">60A Urethane Tread</option>
              <option value="ti-cleats">Ti Cleats</option>
            </select>
          </>
        )}
        {modelId === 'pod' && (
          <>
            <button
              className="mini"
              aria-pressed={wheelPodEnhanced}
              onClick={() => setWheelPodEnhanced((v) => !v)}
              title="Toggle precision engineered wheel pod assembly vs raw CAD"
            >
              Pod {wheelPodEnhanced ? 'Precision 3D' : 'Raw CAD'}
            </button>
            {wheelPodEnhanced && (
              <select
                className="mini select-pill"
                aria-label="Wheel pod tread"
                value={wheelTread}
                onChange={(e) => setWheelTread(e.target.value as WheelTreadType)}
                style={{ minHeight: 44, padding: '0 6px', background: 'var(--surface)' }}
              >
                <option value="urethane">60A Urethane Tread</option>
                <option value="ti-cleats">1.55" Ti Cleats</option>
              </select>
            )}
            {wheelPodEnhanced && (
              <button
                className="mini"
                aria-pressed={wheelCutaway}
                onClick={() => setWheelCutaway((v) => !v)}
                title="Toggle 626ZZ ball bearing raceway cutaway view"
              >
                Bearings {wheelCutaway ? 'Cutaway' : 'Sealed'}
              </button>
            )}
          </>
        )}
        <button
          className="mini"
          aria-pressed={xray}
          onClick={() => {
            setXray((v) => !v);
            if (!xray) setWireframe(false);
          }}
        >
          X-ray
        </button>
        <button
          className="mini"
          aria-pressed={wireframe}
          onClick={() => {
            setWireframe((v) => !v);
            if (!wireframe) setXray(false);
          }}
        >
          Wireframe
        </button>
        <button
          className="mini"
          aria-pressed={spin}
          disabled={reduced}
          title={reduced ? 'Disabled: reduced motion' : undefined}
          onClick={() => setSpinOverride((prev) => !(prev ?? !reduced))}
        >
          {spin ? 'Pause spin' : 'Spin'}
        </button>
        <button
          className="mini"
          type="button"
          onClick={() => stlInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              stlInput.current?.click();
            }
          }}
        >
          View your STL
        </button>
        <input
          ref={stlInput}
          type="file"
          accept=".stl"
          aria-label="Upload an STL to preview"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          onChange={(e) => {
            void onStlFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {stlName && (
          <button
            className="mini"
            onClick={() => {
              stlGeo?.dispose();
              setStlGeo(null);
              setStlName('');
            }}
          >
            Remove {stlName}
          </button>
        )}
      </div>
      {stlErr && (
        <p className="status" role="alert" style={{ color: 'var(--danger)' }}>
          {stlErr}
        </p>
      )}
      <p className="status">{circularShell || topShell || wheelPodEnhanced || precisionHardware
        ? 'Visual approximation: decorative geometry is enabled. Downloads remain the original source files.'
        : 'Original source geometry. Role colors are inferred; material specifications are unverified.'}</p>
      <p className="status path" role="status">
        <b>{model.label}</b> <i>·</i> {model.solids} solids, heuristic roles <i>·</i>{' '}
        <a href={cadHref(model.step)} download>
          STEP {model.stepSize}
        </a>{' '}
        <i>·</i> <a href={cadHref(model.glb)} download>GLB</a>
        {stlName ? ` · overlay: ${stlName}` : ''} · drag to orbit, scroll to zoom
      </p>
    </div>
  );
}
