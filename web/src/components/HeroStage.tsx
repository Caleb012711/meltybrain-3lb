import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ExplodingModel, useModelParts, EMPTY_SET } from './CadViewer';
import { useIsMobile, usePrefersReducedMotion } from '../hooks/hooks';

const ROLL_R = 1.5;
const parked = { x0: -4.6, x1: 4.6, ground: -1.55 };
const mobileCfg = { x0: -2.9, x1: 2.9, ground: -1.35 };

type Shared = { p: number; smooth: number; x: number };

const ease = (s: number) => s * s * (3 - 2 * s);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function RollingBot({ shared, mobile }: { shared: React.MutableRefObject<Shared>; mobile: boolean }) {
  const group = useRef<THREE.Group>(null);
  const parts = useModelParts('full');
  const cfg = mobile ? mobileCfg : parked;
  const prev = useRef(0);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const s = shared.current;
    s.smooth += (s.p - s.smooth) * (1 - Math.exp(-6 * Math.min(delta, 0.05)));
    const e = ease(clamp01(s.smooth));
    const x = cfg.x0 + (cfg.x1 - cfg.x0) * e;
    const dx = x - prev.current;
    prev.current = x;
    s.x = x;
    const speed = Math.min(1, Math.abs(dx) * 30 + 0.12);
    const hop = Math.abs(Math.sin((x / ROLL_R) * 2)) * 0.05 * speed;
    g.position.set(x, cfg.ground + hop, Math.sin(e * Math.PI) * 0.3);
    g.rotation.set(0, 0.35 + e * 0.25, 0);
    g.rotation.z -= dx / ROLL_R;
    if (mobile) g.scale.setScalar(0.72);
  });

  return (
    <group ref={group}>
      <ExplodingModel
        url="cad/main-cad.glb"
        parts={parts}
        explode={0}
        wireframe={false}
        xray={false}
        spin={false}
        colorMode="role"
        selected={null}
        hovered={null}
        hidden={EMPTY_SET}
        isolated={null}
        onSelect={() => undefined}
        onHover={() => undefined}
      />
    </group>
  );
}

function ParkedBot() {
  const parts = useModelParts('full');
  return (
    <group position={[-2.2, parked.ground, 0]} rotation={[0, 0.4, 0.5]}>
      <ExplodingModel
        url="cad/main-cad.glb"
        parts={parts}
        explode={0}
        wireframe={false}
        xray={false}
        spin={false}
        colorMode="role"
        selected={null}
        hovered={null}
        hidden={EMPTY_SET}
        isolated={null}
        onSelect={() => undefined}
        onHover={() => undefined}
      />
    </group>
  );
}

function CameraRig({ shared, mobile }: { shared: React.MutableRefObject<Shared>; mobile: boolean }) {
  const look = useRef(new THREE.Vector3(0, -0.3, 0));
  useFrame(({ camera }, delta) => {
    const e = ease(clamp01(shared.current.smooth));
    const x = shared.current.x;
    const k = 1 - Math.exp(-3.2 * Math.min(delta, 0.05));
    const tz = mobile ? 10.4 : 9.2;
    camera.position.lerp(new THREE.Vector3(x * 0.32, 0.6 - Math.sin(e * Math.PI) * 0.15, tz - e * 0.6), k);
    look.current.lerp(new THREE.Vector3(x * 0.45, -0.3, 0), k);
    camera.lookAt(look.current);
  });
  return null;
}

function SplitLine({ text, register }: { text: string; register: (el: HTMLSpanElement) => void }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, wi) => (
        <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
          {w.split('').map((ch, ci) => (
            <span
              key={ci}
              aria-hidden="true"
              ref={register}
              className="hero-ch"
              style={{ display: 'inline-block', willChange: 'transform' }}
            >
              {ch}
            </span>
          ))}
          {wi < words.length - 1 ? <span aria-hidden="true">&nbsp;</span> : null}
        </span>
      ))}
    </>
  );
}

function HeroScene({
  shared,
  mobile,
  cameraRef,
}: {
  shared: React.MutableRefObject<Shared>;
  mobile: boolean;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
}) {
  return (
    <Canvas
      dpr={[1, mobile ? 1 : 1.75]}
      gl={{ antialias: true, alpha: true, stencil: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.6, mobile ? 10.4 : 9.2], fov: mobile ? 40 : 36, near: 0.1, far: 60 }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.setClearColor('#000000', 0);
        cameraRef.current = camera;
      }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <hemisphereLight args={['#ffffff', '#d8dce2', 1.0]} />
      <directionalLight position={[4, 7, 3]} intensity={2.2} />
      <directionalLight position={[-6, 3, -6]} intensity={0.9} color="#dfe8ff" />
      <directionalLight position={[-2, 2, 6]} intensity={0.35} color="#ffffff" />
      <Suspense fallback={null}>
        <RollingBot shared={shared} mobile={mobile} />
      </Suspense>
      <ContactShadows
        position={[0, -1.68, 0]}
        scale={14}
        far={3.2}
        resolution={mobile ? 256 : 512}
        blur={2.6}
        opacity={0.42}
        color="#1a1e23"
        frames={Infinity}
      />
      <CameraRig shared={shared} mobile={mobile} />
    </Canvas>
  );
}

export function HeroStage() {
  const reduced = usePrefersReducedMotion();
  const mobile = useIsMobile();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const letters = useRef<HTMLSpanElement[]>([]);
  const blobRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const shared = useRef<Shared>({ p: 0, smooth: 0, x: parked.x0 });
  const centers = useRef<number[]>([]);

  const register = (el: HTMLSpanElement | null) => {
    if (el && !letters.current.includes(el)) letters.current.push(el);
  };

  const measure = () => {
    centers.current = letters.current.map((el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    });
  };

  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    const onScroll = () => {
      const rect = stage.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      shared.current.p = total > 0 ? clamp01(-rect.top / total) : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      measure();
      onScroll();
    });
    measure();
    const proj = new THREE.Vector3();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const cam = cameraRef.current;
      const stageEl = stageRef.current;
      if (!cam || !stageEl) return;
      const w = stageEl.clientWidth;
      proj.set(shared.current.x, -1.2, 0).project(cam);
      const botPx = (proj.x * 0.5 + 0.5) * w;
      const sigma = mobile ? 180 : 140;
      const tiltOn = !mobile;
      for (let i = 0; i < letters.current.length; i++) {
        const el = letters.current[i];
        const cx = centers.current[i];
        if (cx === undefined) continue;
        const d = cx - botPx;
        const ad = Math.abs(d);
        const fall = Math.exp(-(d * d) / (2 * sigma * sigma));
        if (tiltOn) {
          const gate = ad < 260 ? 1 - ad / 260 : 0;
          const tilt = Math.max(-14, Math.min(14, -d * 0.045)) * gate;
          const lift = -18 * fall;
          el.style.transform = `translateY(${lift.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
        }
        const hi = Math.round(fall * 100) / 100;
        el.style.background = hi > 0.03 ? `rgba(232,73,15,${(0.22 * hi).toFixed(3)})` : 'transparent';
        el.style.color = hi > 0.5 ? '#b23600' : '';
      }
      const blob = blobRef.current;
      if (blob) {
        blob.style.left = `${botPx}px`;
        blob.style.opacity = '0.85';
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, mobile]);

  const headline = useMemo(
    () => (
      <>
        <SplitLine text="SPIN THE WHOLE BOT." register={register} />
        <br />
        <SplitLine text="DRIVE LIKE IT'S STANDING STILL." register={register} />
      </>
    ),
    []
  );

  if (reduced) {
    return (
      <div className="hero-static">
        <h1 className="hero-giant">SPIN THE WHOLE BOT. DRIVE LIKE IT'S STANDING STILL.</h1>
        <div className="viewer" style={{ marginTop: 16 }}>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0.6, 9.2], fov: 36 }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.NeutralToneMapping;
              gl.setClearColor('#000000', 0);
            }}
            style={{ height: 380 }}
            role="img"
            aria-label="3D model of the Eyeliner meltybrain robot"
          >
            <hemisphereLight args={['#ffffff', '#d8dce2', 1.0]} />
            <directionalLight position={[4, 7, 3]} intensity={2.2} />
            <Suspense fallback={null}>
              <ParkedBot />
            </Suspense>
            <ContactShadows position={[0, -1.68, 0]} scale={14} far={3.2} resolution={256} blur={2.6} opacity={0.42} color="#1a1e23" frames={1} />
          </Canvas>
        </div>
      </div>
    );
  }

  return (
    <div ref={stageRef} className="hero-scroll" style={{ height: mobile ? '180vh' : '250vh' }}>
      <div className="hero-sticky">
        <div className="hero-text">
          <h1 className="hero-giant" aria-label="Spin the whole bot. Drive like it's standing still.">
            {headline}
          </h1>
          <p className="hero-kicker">3 lb translational-drift combat robot — scroll to roll it across the words</p>
        </div>
        <div ref={blobRef} className="hero-shadow-blob" aria-hidden="true" />
        <Suspense
          fallback={
            <div className="hero-poster">
              <img src="eyeliner_summer_2025_render.png" alt="Overhead render of the Eyeliner 3lb meltybrain" />
            </div>
          }
        >
          <HeroScene shared={shared} mobile={mobile} cameraRef={cameraRef} />
        </Suspense>
        <div className="hero-hud" aria-hidden="true">
          <span>SCROLL</span>
          <span className="hero-hud-line" />
        </div>
      </div>
    </div>
  );
}
