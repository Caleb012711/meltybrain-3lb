import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { cadModels } from '../data/content';
import { usePrefersReducedMotion } from '../hooks/hooks';

function ExplodingModel({
  url,
  explode,
  wireframe,
  xray,
  spin,
}: {
  url: string;
  explode: number;
  wireframe: boolean;
  xray: boolean;
  spin: boolean;
}) {
  const gltf = useGLTF(url);
  const group = useRef<THREE.Group>(null);
  const base = useRef(new Map<string, { pos: THREE.Vector3; dir: THREE.Vector3 }>());
  const xrayMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8a94a6',
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    []
  );

  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    // center + scale mm -> scene units
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

  useEffect(() => {
    // record per-mesh base positions + radial dirs from assembly center
    base.current.clear();
    const root = new THREE.Box3().setFromObject(scene).getCenter(new THREE.Vector3());
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        const dir = c.clone().sub(root);
        if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
        dir.normalize();
        base.current.set(o.uuid, { pos: o.position.clone(), dir });
      }
    });
  }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const rec = base.current.get(o.uuid);
        if (rec) o.position.copy(rec.pos).addScaledVector(rec.dir, explode * 1.4);
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.wireframe = wireframe;
          }
        }
        if (xray) {
          o.userData._orig = o.material;
          o.material = xrayMat;
        } else if (o.userData._orig) {
          o.material = o.userData._orig;
          delete o.userData._orig;
        }
      }
    });
  }, [scene, explode, wireframe, xray, xrayMat]);

  useFrame((_, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.5;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

function StlOverlay({ geometry }: { geometry: THREE.BufferGeometry | null }) {
  if (!geometry) return null;
  return (
    <mesh geometry={geometry} position={[0, 2.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#1a6b32" roughness={0.6} />
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
        borderRadius: 6,
        padding: '6px 10px',
        fontSize: 13,
      }}
    >
      Loading CAD… {Math.round(progress)}%
    </div>
  );
}

export function CadViewer() {
  const reduced = usePrefersReducedMotion();
  const [modelId, setModelId] = useState('full');
  const [explode, setExplode] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [spin, setSpin] = useState(!reduced);
  const [stlGeo, setStlGeo] = useState<THREE.BufferGeometry | null>(null);
  const [stlName, setStlName] = useState('');
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [modelId]);

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
      geo.center();
      setStlGeo(geo);
      setStlName(f.name);
    } catch {
      alert('Could not parse that STL.');
    }
  };

  if (failed) {
    return (
      <div className="viewer">
        <div className="viewer-fallback">
          <img src="eyeliner_summer_2025_render.png" alt="Overhead render of the Eyeliner 3lb meltybrain" />
        </div>
        <div className="viewer-bar">
          <span className="meta">3D failed to load — the render and STEP downloads still work.</span>
          <button className="mini" onClick={() => setFailed(false)}>
            Retry 3D
          </button>
        </div>
        <p className="status">
          {model.label} · {model.solids} solids · STEP {model.stepSize} · <a href={model.step} download>Download STEP</a>
        </p>
      </div>
    );
  }

  return (
    <div className="viewer">
      <div style={{ position: 'relative' }}>
        <Canvas
          camera={{ position: [4.4, 3.1, 5.4], fov: 42 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => gl.setClearColor('#ffffff')}
          aria-label={`3D model of Eyeliner combat robot, ${model.label}`}
        >
          <hemisphereLight args={['#ffffff', '#dfe3ea', 1.1]} />
          <directionalLight position={[5, 8, 4]} intensity={1.4} />
          <gridHelper args={[12, 24, '#c9c6b8', '#e2e0d8']} position={[0, -2.2, 0]} />
          <Suspense fallback={null}>
            <ExplodingModel
              url={model.glb}
              explode={explode}
              wireframe={wireframe}
              xray={xray}
              spin={spin && !reduced}
            />
            <StlOverlay geometry={stlGeo} />
          </Suspense>
          <OrbitControls enableDamping autoRotate={false} makeDefault />
        </Canvas>
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
        <button className="mini" aria-pressed={xray} onClick={() => { setXray((v) => !v); if (!xray) setWireframe(false); }}>
          X-ray
        </button>
        <button className="mini" aria-pressed={wireframe} onClick={() => { setWireframe((v) => !v); if (!wireframe) setXray(false); }}>
          Wireframe
        </button>
        <button className="mini" aria-pressed={spin} onClick={() => setSpin((v) => !v)}>
          {spin ? 'Pause spin' : 'Spin'}
        </button>
        <label className="mini" style={{ cursor: 'pointer' }}>
          View your STL
          <input type="file" accept=".stl" hidden onChange={(e) => void onStlFile(e.target.files?.[0])} />
        </label>
        {stlName && (
          <button className="mini" onClick={() => { setStlGeo(null); setStlName(''); }}>
            Remove {stlName}
          </button>
        )}
      </div>
      <p className="status" role="status">
        {model.label} · {model.solids} solids · <a href={model.step} download>STEP {model.stepSize}</a> ·{' '}
        <a href={model.glb} download>GLB</a> · drag to orbit, scroll to zoom
        {stlName ? ` · overlay: ${stlName}` : ''}
      </p>
    </div>
  );
}

export function preloadAll() {
  for (const m of cadModels) useGLTF.preload(m.glb);
}
