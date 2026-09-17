import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { cadHref, cadModels } from '../data/content';
import { usePrefersReducedMotion } from '../hooks/hooks';
import { indexColor, roleMaterial, type PartInfo } from './materials';

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

async function loadParts(modelId: string): Promise<PartInfo[]> {
  const base = cadModels.find((m) => m.id === modelId)?.glb ?? '';
  const url = base.replace(/\.glb$/, '.parts.json');
  try {
    const r = await fetch(url);
    if (!r.ok) return [];
    return (await r.json()) as PartInfo[];
  } catch {
    return [];
  }
}

export function useModelParts(modelId: string) {
  const [parts, setParts] = useState<PartInfo[]>([]);
  useEffect(() => {
    let live = true;
    void loadParts(modelId).then((p) => {
      if (live) setParts(p);
    });
    return () => {
      live = false;
    };
  }, [modelId]);
  return parts;
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
    indexMats.current.forEach((m) => m.dispose());
    indexMats.current.clear();
    // Sized lazily per original idx on first use (see material effect) —
    // meshCount is smaller than max original idx once degenerates drop.
    return () => {
      indexMats.current.forEach((m) => m.dispose());
      indexMats.current.clear();
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
  // Spread 2.6: full assembly needs room for 96 nodes to read as separate parts.
  useEffect(() => {
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const idx = (o.userData.partIndex as number) ?? 0;
      const rec = base.current.get(o.uuid);
      if (rec) o.position.copy(rec.pos).addScaledVector(rec.dir, explode * 2.6);
      o.visible = !hidden.has(idx) && (isolated === null || isolated === idx);
    });
  }, [scene, explode, hidden, isolated]);

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
        o.material = xrayMat;
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
  }, [scene, colorMode, wireframe, xray, xrayMat, selected, hovered, parts]);

  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.5;
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
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = '';
        }}
      />
    </group>
  );
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
        background: '#fff',
        border: '1px solid #c9c6b8',
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
  const [modelId, setModelId] = useState('full');
  const [explode, setExplode] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('role');
  const [spin, setSpin] = useState(!reduced);
  const [stlGeo, setStlGeo] = useState<THREE.BufferGeometry | null>(null);
  const [stlName, setStlName] = useState('');
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const parts = useModelParts(modelId);
  const stlInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [modelId]);

  useEffect(() => {
    if (reduced) setSpin(false);
  }, [reduced]);

  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];

  const onStlFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) {
      alert('STL over 20 MB — export a single part first.');
      return;
    }
    try {
      const buf = await f.arrayBuffer();
      const geo = new STLLoader().parse(buf);
      geo.computeVertexNormals();
      setStlGeo((prev) => {
        prev?.dispose();
        return geo;
      });
      setStlName(f.name);
    } catch {
      alert('Could not parse that STL.');
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
          onCreated={({ gl }) => gl.setClearColor('#ffffff')}
          role="img"
          aria-label={`3D model of Eyeliner combat robot, ${model.label}`}
        >
          <hemisphereLight args={['#ffffff', '#d0d5db', 1.1]} />
          <directionalLight position={[5, 8, 4]} intensity={2.2} />
          <directionalLight position={[-6, 3, -6]} intensity={1.0} color="#dfe8ff" />
          <gridHelper args={[12, 24, '#c9c6b8', '#e2e0d8']} position={[0, -2.2, 0]} />
          <Suspense fallback={null}>
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
              onSelect={() => undefined}
              onHover={() => undefined}
            />
            <StlOverlay geometry={stlGeo} />
          </Suspense>
          <OrbitControls
            enableDamping
            autoRotate={false}
            makeDefault
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            minDistance={3}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2 + 0.1}
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
              onClick={() => setModelId(m.id)}
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
              style={{ minHeight: 36 }}
            >
              <option value="role">By heuristic role</option>
              <option value="index">By part #</option>
              <option value="plain">Plain</option>
            </select>
          </label>
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
          onClick={() => setSpin((v) => !v)}
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

export function preloadAll() {
  for (const m of cadModels) useGLTF.preload(m.glb);
}
