import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { ExplodingModel, GlErrorBoundary, useModelParts, EMPTY_SET } from './CadViewer';
import { useIsMobile, usePrefersReducedMotion } from '../hooks/hooks';

const ROLL_R = 1.5;
const parked = { x0: -7.2, x1: 7.2, ground: -0.7 };
const mobileCfg = { x0: -3.4, x1: 3.4, ground: -0.55 };
const DRIVE_START = 0.15;
const DRIVE_END = 0.7;

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
    const ds = mobile ? 0.12 : DRIVE_START;
    const de = mobile ? 0.68 : DRIVE_END;
    const drive = ease(clamp01((s.smooth - ds) / (de - ds)));
    const x = cfg.x0 + (cfg.x1 - cfg.x0) * drive;
    const dx = x - prev.current;
    prev.current = x;
    s.x = x;
    // end fade via scale (no material traversal): parks off-screen at both ends
    const fade = Math.min(clamp01((s.smooth - 0.1) / 0.08), 1 - clamp01((s.smooth - 0.72) / 0.1));
    const eFade = fade * fade * (3 - 2 * fade);
    const baseScale = mobile ? 0.62 : 1.0;
    g.visible = eFade > 0.02;
    g.scale.setScalar(Math.max(0.001, baseScale * (0.4 + 0.6 * eFade)));
    const rolling = clamp01(Math.abs(dx) * 30);
    const hop = (0.5 - 0.5 * Math.cos((2 * x) / ROLL_R)) * 0.05 * rolling * eFade;
    g.position.set(x, cfg.ground + hop, Math.sin(drive * Math.PI) * 0.6);
    g.rotation.set(0, 0.35 + drive * 0.25, 0);
    g.rotation.z -= dx / ROLL_R;
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
    <group position={[-2.2, parked.ground, 0]} rotation={[0, 0.4, 0]}>
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

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function CameraRig({ shared, mobile }: { shared: React.MutableRefObject<Shared>; mobile: boolean }) {
  const look = useRef(new THREE.Vector3(0, -0.3, 0));
  useFrame(({ camera }, delta) => {
    const ds = mobile ? 0.12 : DRIVE_START;
    const de = mobile ? 0.68 : DRIVE_END;
    const drive = ease(clamp01((shared.current.smooth - ds) / (de - ds)));
    const win = Math.sin(drive * Math.PI);
    const x = shared.current.x;
    const k = 1 - Math.exp(-6 * Math.min(delta, 0.05));
    const tz = mobile ? 10.4 : 9.2;
    _camTarget.set(x * 0.32 * win, 0.6 - win * 0.15, tz - drive * 0.6);
    camera.position.lerp(_camTarget, k);
    _lookTarget.set(x * 0.3 * win, -0.3, 0);
    look.current.lerp(_lookTarget, k);
    camera.lookAt(look.current);
  });
  return null;
}

function SplitLine({ text, register }: { text: string; register: (el: HTMLSpanElement) => void }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, wi) => (
        <span key={wi} style={{ display: 'inline', overflowWrap: 'break-word' }}>
          {w.split('').map((ch, ci) => (
            <span
              key={ci}
              aria-hidden="true"
              ref={register}
              className="hero-ch"
              style={{
                display: 'inline-block',
                padding: '0 0.08em',
                borderRadius: 3,
              }}
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

function HeroReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

function HeroScene({
  shared,
  mobile,
  cameraRef,
  inView,
  onReady,
}: {
  shared: React.MutableRefObject<Shared>;
  mobile: boolean;
  cameraRef: React.MutableRefObject<THREE.Camera | null>;
  inView: boolean;
  onReady: () => void;
}) {
  return (
    <Canvas
      frameloop={inView ? 'always' : 'never'}
      dpr={[1, mobile ? 1 : 1.5]}
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
        <HeroReady onReady={onReady} />
      </Suspense>
      <ContactShadows
        position={[0, mobile ? -0.68 : -0.83, 0]}
        scale={10}
        far={2.2}
        resolution={256}
        blur={3.5}
        opacity={0.22}
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
  const hudRef = useRef<HTMLSpanElement | null>(null);
  const [glFailed, setGlFailed] = useState(false);
  const shared = useRef<Shared>({ p: 0, smooth: 0, x: parked.x0 });
  const centers = useRef<number[]>([]);

  const register = (el: HTMLSpanElement | null) => {
    if (el) {
      if (!letters.current.includes(el)) letters.current.push(el);
    } else {
      letters.current = letters.current.filter((n) => n.isConnected);
    }
  };

  // Stage-relative centers: botPx is computed in stage space.
  const measure = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const sl = stage.getBoundingClientRect().left;
    centers.current = letters.current.map((el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2 - sl;
    });
  };

  const clearLetters = () => {
    for (const el of letters.current) {
      el.style.transform = '';
      el.style.background = '';
      el.style.color = '';
      el.style.willChange = 'auto';
    }
  };

  const [inView, setInView] = useState(true);
  const [ready, setReady] = useState(false);
  const [posterGone, setPosterGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setPosterGone(true), 350);
    return () => window.clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    let visible = true;
    const onScroll = () => {
      const rect = stage.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      shared.current.p = total > 0 ? clamp01(-rect.top / total) : 0;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => {
      measure();
      onScroll();
    });
    ro.observe(stage);
    const text = stage.querySelector('.hero-text');
    if (text) ro.observe(text);
    if (document.fonts) {
      void document.fonts.ready.then(() => measure());
    }
    measure();
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        setInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    io.observe(stage);
    const proj = new THREE.Vector3();
    let lastX = Number.NaN;
    let wasStyling = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const cam = cameraRef.current;
      const stageEl = stageRef.current;
      const hud = hudRef.current;
      if (hud) {
        const p = shared.current.p;
        const label = p < 0.15 ? 'ENTER' : p < 0.7 ? 'CROSSING' : p < 0.88 ? 'EXIT' : 'DONE';
        const txt = `SCROLL ${Math.round(p * 100)}% — ${label}`;
        if (hud.textContent !== txt) hud.textContent = txt;
      }
      if (!cam || !stageEl) return;
      if (Math.abs(shared.current.x - lastX) < 0.03) return;
      lastX = shared.current.x;
      const w = stageEl.clientWidth;
      proj.set(shared.current.x, mobile ? -0.55 : -0.7, 0).project(cam);
      const botPx = (proj.x * 0.5 + 0.5) * w;
      const sigma = mobile ? 110 : 90;
      const tiltOn = !mobile;
      const styling = shared.current.p > 0.05 && shared.current.p < 0.95;
      if (styling !== wasStyling) {
        wasStyling = styling;
        for (const el of letters.current) el.style.willChange = styling ? 'transform' : 'auto';
      }
      for (let i = 0; i < letters.current.length; i++) {
        const el = letters.current[i];
        const cx = centers.current[i];
        if (cx === undefined) continue;
        const d = cx - botPx;
        const ad = Math.abs(d);
        const fall = Math.exp(-(d * d) / (2 * sigma * sigma));
        if (tiltOn && styling) {
          const gate = ad < 160 ? 1 - ad / 160 : 0;
          const tilt = Math.max(-8, Math.min(8, -d * 0.045)) * gate;
          const lift = -8 * fall;
          const t = `translateY(${lift.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;
          if (el.style.transform !== t) el.style.transform = t;
        } else if (!tiltOn) {
          el.style.transform = '';
          el.style.willChange = 'auto';
        }
        const hi = Math.round(fall * 100) / 100;
        const bg = styling && hi > 0.03 ? `rgba(232,73,15,${(0.14 * hi).toFixed(3)})` : 'transparent';
        if (el.style.background !== bg) el.style.background = bg;
        const fg = styling && hi > 0.65 ? '#9a2f00' : '';
        if (el.style.color !== fg) el.style.color = fg;
      }
      // blob tracks the end-fade so it never pops in detached
      const e = shared.current.smooth;
      const fade = Math.min(clamp01((e - 0.1) / 0.08), 1 - clamp01((e - 0.72) / 0.1));
      const blob = blobRef.current;
      if (blob) {
        blob.style.left = `${botPx}px`;
        blob.style.opacity = (0.85 * fade).toFixed(2);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
      io.disconnect();
      clearLetters();
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
        <p className="hero-kicker">3 lb translational-drift combat robot</p>
        <div className="viewer" style={{ marginTop: 16 }}>
          {glFailed ? (
            <div className="hero-poster" style={{ position: 'static', padding: 24 }}>
              <img src="eyeliner_summer_2025_render.webp" alt="Overhead render of the Eyeliner 3lb meltybrain" loading="lazy" decoding="async" style={{ maxWidth: '100%' }} />
            </div>
          ) : (
          <GlErrorBoundary onFail={() => setGlFailed(true)}>
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
            <directionalLight position={[-6, 3, -6]} intensity={0.9} color="#dfe8ff" />
            <directionalLight position={[-2, 2, 6]} intensity={0.35} color="#ffffff" />
            <Suspense fallback={null}>
              <ParkedBot />
            </Suspense>
            <ContactShadows position={[0, -0.83, 0]} scale={14} far={3.2} resolution={256} blur={2.6} opacity={0.42} color="#1a1e23" frames={1} />
          </Canvas>
          </GlErrorBoundary>
          )}
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
        {glFailed ? (
          <div className="hero-poster">
            <img src="eyeliner_summer_2025_render.webp" alt="Overhead render of the Eyeliner 3lb meltybrain" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        ) : (
        <>
          {!posterGone && (
            <div className="hero-poster" style={{ opacity: ready ? 0 : 1, transition: 'opacity 300ms linear' }}>
              <img src="eyeliner_summer_2025_render.webp" alt="Overhead render of the Eyeliner 3lb meltybrain" loading="eager" decoding="async" fetchPriority="high" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
          <GlErrorBoundary onFail={() => setGlFailed(true)}>
          <HeroScene
            key={mobile ? 'hero-m' : 'hero-d'}
            shared={shared}
            mobile={mobile}
            cameraRef={cameraRef}
            inView={inView}
            onReady={() => setReady(true)}
          />
          </GlErrorBoundary>
        </>
        )}
        <div className="hero-hud" aria-hidden="true">
          <span ref={hudRef}>SCROLL 0%</span>
          <span className="hero-hud-line" />
        </div>
      </div>
    </div>
  );
}
