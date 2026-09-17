import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { cadModels } from '../data/content';
import { BUILD_GUIDE, STEP_ROLES, type BuildStepKey } from '../data/buildGuide';
import { usePrefersReducedMotion } from '../hooks/hooks';
import { ExplodingModel, GlErrorBoundary, useModelParts, EMPTY_SET } from '../components/CadViewer';
import { ROLE_CSS, ROLE_LABELS, partLabel } from '../components/materials';

// ---------- drive physics (arcade melty: no spin = no move) ----------
const RPM_MAX = 4000;
const TAU_UP = 1.2;
const TAU_DOWN = 2.0;
const MAX_SPEED = 8.0;
const K_ACCEL = 3.5;
const K_DRAG = 1.5;
const K_BRAKE = 6.0;
const GRIP_LO = 600;
const GRIP_HI = 3000;
const GRIP_EXP = 1.2;
const HALF = 15;
const BOT_R = 2.0;
const BOUNCE = 0.35;
const TRAIL_N = 120;

type DriveState = {
  pos: THREE.Vector2;
  vel: THREE.Vector2;
  rpm: number;
  throttleSm: number;
  spinAngle: number;
};

type DriveInput = {
  move: THREE.Vector2;
  throttle: boolean;
  brake: boolean;
};

function stepDrive(st: DriveState, inp: DriveInput, dt: number) {
  const d = Math.min(dt, 1 / 30);
  const target = inp.throttle ? RPM_MAX : 0;
  const tau = inp.throttle ? TAU_UP : TAU_DOWN;
  st.rpm += (target - st.rpm) * (1 - Math.exp(-d / tau));
  if (Math.abs(target - st.rpm) < 1) st.rpm = target;
  const grip = Math.pow(
    Math.min(1, Math.max(0, (st.rpm - GRIP_LO) / (GRIP_HI - GRIP_LO))),
    GRIP_EXP
  );
  const k = inp.brake ? K_BRAKE : grip > 0.05 ? K_ACCEL : K_DRAG;
  const tvx = inp.move.x * MAX_SPEED * grip;
  const tvy = inp.move.y * MAX_SPEED * grip;
  st.vel.x += (tvx - st.vel.x) * (1 - Math.exp(-k * d));
  st.vel.y += (tvy - st.vel.y) * (1 - Math.exp(-k * d));
  if (inp.brake) st.vel.multiplyScalar(Math.exp(-2.0 * d));
  st.pos.x += st.vel.x * d;
  st.pos.y += st.vel.y * d;
  const lim = HALF - BOT_R;
  if (st.pos.x > lim) { st.pos.x = lim; st.vel.x *= -BOUNCE; }
  if (st.pos.x < -lim) { st.pos.x = -lim; st.vel.x *= -BOUNCE; }
  if (st.pos.y > lim) { st.pos.y = lim; st.vel.y *= -BOUNCE; }
  if (st.pos.y < -lim) { st.pos.y = -lim; st.vel.y *= -BOUNCE; }
  const omega = ((st.rpm * 2 * Math.PI) / 60) * 0.05;
  st.spinAngle += omega * d;
  st.throttleSm += ((inp.throttle ? 1 : 0) - st.throttleSm) * (1 - Math.exp(-8 * d));
  return grip;
}

const HANDLED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyX',
]);

function DriveBot({
  stateRef,
  inputRef,
  parts,
  reduced,
}: {
  stateRef: React.MutableRefObject<DriveState>;
  inputRef: React.MutableRefObject<DriveInput>;
  parts: Parameters<typeof ExplodingModel>[0]['parts'];
  reduced: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const st = stateRef.current;
    stepDrive(st, inputRef.current, delta);
    if (group.current) group.current.position.set(st.pos.x, 1.6, st.pos.y);
    if (spinner.current && !reduced) spinner.current.rotation.y = st.spinAngle;
  });
  return (
    <group ref={group} position={[0, 1.6, 0]}>
      <group ref={spinner}>
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
    </group>
  );
}

function DriveCam({
  stateRef,
  top,
}: {
  stateRef: React.MutableRefObject<DriveState>;
  top: boolean;
}) {
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const desired = useRef(new THREE.Vector3(0, 11, 9));
  useFrame(({ camera }, delta) => {
    const st = stateRef.current;
    if (top) {
      desired.current.set(st.pos.x, 26, st.pos.y + 0.01);
    } else {
      // Arena-level: ride down on the floor behind the bot, velocity lead.
      desired.current.set(
        THREE.MathUtils.clamp(st.pos.x + st.vel.x * 0.55, -HALF - 2, HALF + 2),
        2.6,
        THREE.MathUtils.clamp(st.pos.y + 7.5 + st.vel.y * 0.55, -HALF - 2, HALF + 2)
      );
    }
    const k = 1 - Math.exp(-3.0 * Math.min(delta, 0.05));
    camera.position.lerp(desired.current, k);
    const ly = top ? 0 : 1.0;
    look.current.lerp(
      new THREE.Vector3(st.pos.x, ly, st.pos.y),
      1 - Math.exp(-4.0 * Math.min(delta, 0.05))
    );
    camera.lookAt(look.current);
  });
  return null;
}

function DriveTrail({
  stateRef,
  on,
}: {
  stateRef: React.MutableRefObject<DriveState>;
  on: boolean;
}) {
  const buf = useMemo(() => new Float32Array(TRAIL_N * 3), []);
  const count = useRef(0);
  const acc = useRef(0);
  const lineObj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    g.setDrawRange(0, 0);
    const m = new THREE.LineBasicMaterial({ color: '#e8490f', transparent: true, opacity: 0.7 });
    return new THREE.Line(g, m);
  }, [buf]);
  useEffect(
    () => () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    },
    [lineObj]
  );
  useFrame((_, delta) => {
    if (!on) {
      if (count.current !== 0) {
        count.current = 0;
        lineObj.geometry.setDrawRange(0, 0);
      }
      return;
    }
    acc.current += delta;
    if (acc.current < 0.05) return;
    acc.current = 0;
    const st = stateRef.current;
    const last = count.current > 0 ? count.current - 1 : -1;
    if (last >= 0) {
      const dx = st.pos.x - buf[last * 3];
      const dz = st.pos.y - buf[last * 3 + 2];
      if (dx * dx + dz * dz < 0.0025) return;
    }
    if (count.current >= TRAIL_N) {
      buf.copyWithin(0, 3);
      count.current = TRAIL_N - 1;
    }
    buf[count.current * 3] = st.pos.x;
    buf[count.current * 3 + 1] = 0.06;
    buf[count.current * 3 + 2] = st.pos.y;
    count.current += 1;
    lineObj.geometry.attributes.position.needsUpdate = true;
    lineObj.geometry.setDrawRange(0, count.current);
  });
  if (!on) return null;
  return <primitive object={lineObj} />;
}

function DriveArena() {
  const walls: [number, number, number, number, number][] = [
    [0, 0.5, -HALF - 0.2, 2 * HALF + 0.8, 0.4],
    [0, 0.5, HALF + 0.2, 2 * HALF + 0.8, 0.4],
    [-HALF - 0.2, 0.5, 0, 0.4, 2 * HALF + 0.8],
    [HALF + 0.2, 0.5, 0, 0.4, 2 * HALF + 0.8],
  ];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[2 * HALF + 1, 2 * HALF + 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>
      <gridHelper args={[2 * HALF, 2 * HALF, '#c9c6b8', '#e2e0d8']} position={[0, 0.01, 0]} />
      {walls.map(([x, y, z, w, d], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[w, 1, d]} />
          <meshStandardMaterial color="#3f4752" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BuildCanvas({
  modelId: mid,
  bparts: bp,
  selected: sel,
  hidden: hid,
  isolated: iso,
  explode,
  onSelect,
}: {
  modelId: string;
  bparts: Parameters<typeof ExplodingModel>[0]['parts'];
  selected: number | null;
  hidden: Set<number>;
  isolated: number | null;
  explode: number;
  onSelect: (i: number | null) => void;
}) {
  const model = cadModels.find((m) => m.id === mid) ?? cadModels[0];
  return (
    <div style={{ position: 'relative' }}>
      <Canvas
        camera={{ position: [4.4, 3.1, 5.4], fov: 42 }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => gl.setClearColor('#ffffff')}
        role="img"
        aria-label={`Build guide model, ${model.label}`}
      >
        <hemisphereLight args={['#ffffff', '#d0d5db', 1.1]} />
        <directionalLight position={[5, 8, 4]} intensity={2.0} />
        <gridHelper args={[12, 24, '#c9c6b8', '#e2e0d8']} position={[0, -2.2, 0]} />
        <Suspense fallback={null}>
          <ExplodingModel
            url={model.glb}
            parts={bp}
            explode={explode}
            wireframe={false}
            xray={false}
            spin={false}
            colorMode="role"
            selected={sel}
            hovered={null}
            hidden={hid}
            isolated={iso}
            onSelect={onSelect}
            onHover={() => undefined}
          />
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
    </div>
  );
}

export function Studio() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<'drive' | 'build'>('drive');
  const [armed, setArmed] = useState(false);
  const [top, setTop] = useState(false);
  const [trailOn, setTrailOn] = useState(!reduced);
  const [brakeUi, setBrakeUi] = useState(false);
  const [help, setHelp] = useState(false);
  const [hud, setHud] = useState({ rpm: 0, speed: 0, thr: 0, grip: 0 });
  const [srText, setSrText] = useState('Stopped. Focus the viewport, then drive.');
  const [glFailed, setGlFailed] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);
  const stateRef = useRef<DriveState>({
    pos: new THREE.Vector2(0, 0),
    vel: new THREE.Vector2(0, 0),
    rpm: 0,
    throttleSm: 0,
    spinAngle: 0,
  });
  const inputRef = useRef<DriveInput>({ move: new THREE.Vector2(0, 0), throttle: false, brake: false });
  const keysRef = useRef(new Set<string>());
  const joyRef = useRef<{ x: number; y: number } | null>(null);
  const parts = useModelParts('full');

  // build-guide mode state
  const [modelId, setModelId] = useState('full');
  const [selected, setSelected] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [isolated, setIsolated] = useState<number | null>(null);
  const [bExplode, setBExplode] = useState(0);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState<'all' | BuildStepKey>('all');
  const bparts = useModelParts(modelId);
  const bmodel = cadModels.find((m) => m.id === modelId) ?? cadModels[0];

  const disarm = () => {
    setArmed(false);
    keysRef.current.clear();
    inputRef.current.move.set(0, 0);
    inputRef.current.throttle = false;
    inputRef.current.brake = false;
    setBrakeUi(false);
  };

  const resetDrive = () => {
    const st = stateRef.current;
    st.pos.set(0, 0);
    st.vel.set(0, 0);
    st.rpm = 0;
    st.spinAngle = 0;
    st.throttleSm = 0;
  };

  // HUD + screen-reader telemetry at ~10 Hz / 1.2 Hz
  useEffect(() => {
    if (mode !== 'drive') return;
    let lastSr = '';
    let lastSrAt = 0;
    const id = window.setInterval(() => {
      const st = stateRef.current;
      const speed = st.vel.length();
      const grip =
        Math.pow(Math.min(1, Math.max(0, (st.rpm - GRIP_LO) / (GRIP_HI - GRIP_LO))), GRIP_EXP);
      setHud({ rpm: Math.round(st.rpm), speed, thr: st.throttleSm, grip });
      const now = performance.now();
      if (armed && now - lastSrAt > 800) {
        const txt =
          speed < 0.1 && st.rpm < 20
            ? 'Stopped.'
            : `Throttle ${Math.round(st.throttleSm * 100)} percent. ${Math.round(st.rpm)} RPM. ${speed.toFixed(1)} units per second. Position ${st.pos.x.toFixed(1)}, ${st.pos.y.toFixed(1)}.`;
        if (txt !== lastSr) {
          lastSr = txt;
          lastSrAt = now;
          setSrText(txt);
        }
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [mode, armed]);

  const isEditable = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

  const pollKeys = () => {
    const k = keysRef.current;
    const j = joyRef.current;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (j) {
      x += j.x;
      y += j.y;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    inputRef.current.move.set(x, y);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!armed || isEditable(e.target)) return;
    if (HANDLED.has(e.code)) e.preventDefault();
    if (e.code === 'Escape') {
      disarm();
      rootRef.current?.blur();
      return;
    }
    if (e.repeat) {
      if (e.code === 'KeyR') return;
    }
    if (e.code === 'KeyR' && !e.repeat) {
      resetDrive();
      return;
    }
    keysRef.current.add(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') inputRef.current.throttle = true;
    if (e.code === 'Space' || e.code === 'KeyX') {
      inputRef.current.brake = true;
      setBrakeUi(true);
    }
    pollKeys();
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    keysRef.current.delete(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (!keysRef.current.has('ShiftLeft') && !keysRef.current.has('ShiftRight')) {
        inputRef.current.throttle = false;
      }
    }
    if (e.code === 'Space' || e.code === 'KeyX') {
      if (!keysRef.current.has('Space') && !keysRef.current.has('KeyX')) {
        inputRef.current.brake = false;
        setBrakeUi(false);
      }
    }
    if (armed) pollKeys();
    else inputRef.current.move.set(0, 0);
  };

  // touch joystick
  const stickRef = useRef<HTMLDivElement | null>(null);
  const stickId = useRef<number | null>(null);
  const onStick = (e: React.PointerEvent, phase: 'down' | 'move' | 'up') => {
    const el = stickRef.current;
    if (!el) return;
    if (phase === 'down') {
      stickId.current = e.pointerId;
      el.setPointerCapture(e.pointerId);
    }
    if (phase === 'up' || e.pointerId !== stickId.current) {
      if (phase === 'up') {
        stickId.current = null;
        joyRef.current = null;
        pollKeys();
      }
      return;
    }
    const r = el.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    if (Math.hypot(dx, dy) < 0.12) {
      dx = 0;
      dy = 0;
    }
    joyRef.current = { x: dx, y: dy };
    pollKeys();
  };

  const entries = useMemo(() => {
    const list = bparts
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => {
        if (roleFilter !== 'all' && p.role !== roleFilter) return false;
        if (stepFilter !== 'all' && !(STEP_ROLES[stepFilter] as string[]).includes(p.role)) return false;
        if (query) {
          const hay = `${p.node} ${p.role} ${p.vol_cm3}`.toLowerCase();
          if (!hay.includes(query.toLowerCase())) return false;
        }
        return true;
      });
    return list;
  }, [bparts, query, roleFilter, stepFilter]);

  const rolesPresent = useMemo(() => {
    const s = new Set(bparts.map((p) => p.role));
    return Array.from(s);
  }, [bparts]);

  const selGuide = selected !== null && bparts[selected] ? BUILD_GUIDE[bparts[selected].role as keyof typeof BUILD_GUIDE] : null;

  return (
    <div className="page studio-page">
      <p className="spec-plate">
        <span>EYELINER-3LB / REV9 / SHEET ST-01</span>
        <span>3D Studio — drive + build</span>
      </p>
      <h1>
        3D Studio <span className="stamp ok">Live</span>{' '}
        <span className="stamp todo">Heuristic colors</span>
      </h1>
      <p className="lede">
        Drive the bot around the arena floor, or step the build guide part by part.
        Driving teaches the melty truth: hold <span className="mono">Shift</span> to spin up —
        with no RPM, there is no translation.
      </p>

      <div className="stack-tabs" role="radiogroup" aria-label="Studio mode">
        <button
          className="stack-tab"
          role="radio"
          aria-checked={mode === 'drive'}
          aria-pressed={mode === 'drive'}
          onClick={() => setMode('drive')}
        >
          Drive
        </button>
        <button
          className="stack-tab"
          role="radio"
          aria-checked={mode === 'build'}
          aria-pressed={mode === 'build'}
          onClick={() => setMode('build')}
        >
          Build guide
        </button>
      </div>

      {mode === 'drive' ? (
        <div className="studio-grid">
          <div>
            <div className="viewer">
              <div className="hud-top" aria-hidden="true">
                <span>
                  RPM <b>{hud.rpm}</b>/4000
                </span>
                <span className="rpm-track">
                  <span className="rpm-fill" style={{ width: `${(hud.rpm / 4000) * 100}%` }} />
                </span>
                <span>
                  SPD <b>{hud.speed.toFixed(1)}</b> u/s
                </span>
                <span>
                  THR <b>{Math.round(hud.thr * 100)}%</b>
                </span>
                <span>
                  GRIP <b>{Math.round(hud.grip * 100)}%</b>
                </span>
                {brakeUi && (
                  <span>
                    <b>BRAKE ■</b>
                  </span>
                )}
              </div>
              <div
                ref={rootRef}
                tabIndex={0}
                role="region"
                aria-roledescription="drivable 3D viewport"
                aria-label="3D Studio drive viewport. Focus, then drive with WASD or arrows plus Shift throttle."
                aria-describedby="drive-help drive-status"
                data-driving={armed}
                className="drive-viewport"
                onFocus={() => setArmed(true)}
                onBlur={disarm}
                onClick={() => rootRef.current?.focus()}
                onKeyDown={onKeyDown}
                onKeyUp={onKeyUp}
                style={{ position: 'relative' }}
              >
                {glFailed ? (
                  <div className="viewer-fallback">
                    <img
                      src="eyeliner_summer_2025_render.webp"
                      alt="Overhead render of the Eyeliner 3lb meltybrain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <GlErrorBoundary onFail={() => setGlFailed(true)}>
                    <Canvas
                      dpr={[1, 1.5]}
                      camera={{ position: [0, 11, 9], fov: 42 }}
                      onCreated={({ gl }) => {
                        gl.toneMapping = THREE.NeutralToneMapping;
                        gl.setClearColor('#ffffff', 1);
                      }}
                      role="img"
                      aria-label="Top-down arena with the drivable Eyeliner robot"
                    >
                      <hemisphereLight args={['#ffffff', '#d0d5db', 1.1]} />
                      <directionalLight position={[5, 8, 4]} intensity={2.0} />
                      <Suspense fallback={null}>
                        <DriveArena />
                        <DriveBot
                          stateRef={stateRef}
                          inputRef={inputRef}
                          parts={parts}
                          reduced={reduced}
                        />
                        <DriveTrail stateRef={stateRef} on={trailOn && !reduced} />
                      </Suspense>
                      <DriveCam stateRef={stateRef} top={top} />
                    </Canvas>
                  </GlErrorBoundary>
                )}
              </div>
              <div className="viewer-bar" role="toolbar" aria-label="Drive controls">
                <button className="mini drive-btn" onClick={resetDrive}>
                  Reset (R)
                </button>
                <button
                  className="mini drive-btn"
                  aria-pressed={brakeUi}
                  onPointerDown={() => {
                    inputRef.current.brake = true;
                    setBrakeUi(true);
                  }}
                  onPointerUp={() => {
                    inputRef.current.brake = false;
                    setBrakeUi(false);
                  }}
                  onPointerLeave={() => {
                    inputRef.current.brake = false;
                    setBrakeUi(false);
                  }}
                >
                  Brake (Space)
                </button>
                <button
                  className="mini drive-btn"
                  aria-pressed={trailOn}
                  disabled={reduced}
                  title={reduced ? 'Trails off: reduced motion' : undefined}
                  onClick={() => setTrailOn((v) => !v)}
                >
                  Trail {trailOn ? 'on' : 'off'}
                </button>
                <button
                  className="mini drive-btn"
                  aria-pressed={top}
                  onClick={() => setTop((v) => !v)}
                >
                  {top ? 'Arena cam' : 'Top cam'}
                </button>
                <button
                  ref={helpBtnRef}
                  className="mini drive-btn"
                  onClick={() => setHelp(true)}
                >
                  Keys (?)
                </button>
                <span className="meta">{armed ? 'DRIVING — Esc releases' : 'Click viewport to drive'}</span>
              </div>
              <div className="touch-row">
                <div
                  ref={stickRef}
                  className="joystick"
                  role="slider"
                  aria-label="Drive stick"
                  aria-valuetext={`x ${joyRef.current?.x.toFixed(1) ?? '0.0'}, y ${joyRef.current?.y.toFixed(1) ?? '0.0'}`}
                  tabIndex={0}
                  onPointerDown={(e) => void onStick(e, 'down')}
                  onPointerMove={(e) => void onStick(e, 'move')}
                  onPointerUp={(e) => void onStick(e, 'up')}
                  onPointerCancel={(e) => void onStick(e, 'up')}
                >
                  <span
                    className="joystick-knob"
                    style={{
                      left: `${50 + (joyRef.current?.x ?? 0) * 38}%`,
                      top: `${50 + (joyRef.current?.y ?? 0) * 38}%`,
                    }}
                  />
                </div>
                <label className="meta" style={{ flex: 1 }}>
                  Throttle (Shift)
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={1}
                    defaultValue={0}
                    aria-label="Throttle hold"
                    style={{ width: '100%', minHeight: 44 }}
                    onChange={(e) => {
                      inputRef.current.throttle = e.target.value === '1';
                    }}
                  />
                </label>
              </div>
              <p id="drive-status" role="status" aria-live="polite" aria-atomic="true" className="status mono">
                {srText}
              </p>
              <p id="drive-help" className="status">
                <span className="mono">WASD/arrows</span> move · <span className="mono">Shift</span> hold to spin up ·{' '}
                <span className="mono">Space</span> brake · <span className="mono">R</span> reset ·{' '}
                <span className="mono">Esc</span> releases the viewport.
              </p>
            </div>
          </div>
          <div className="part-panel">
            <header>
              <b>Drive readout</b>
              <p className="meta" style={{ margin: '8px 0 0' }}>
                Grip rises with RPM: under ~600 nothing translates, past ~3000 it grips fully.
                That is the whole melty lesson — spin first, then steer.
              </p>
            </header>
            <div className="readout">
              <dl>
                <dt>RPM</dt>
                <dd>{hud.rpm} / 4000</dd>
                <dt>Speed</dt>
                <dd>{hud.speed.toFixed(2)} u/s</dd>
                <dt>Throttle</dt>
                <dd>{Math.round(hud.thr * 100)} %</dd>
                <dt>Grip</dt>
                <dd>{Math.round(hud.grip * 100)} %</dd>
                <dt>Position</dt>
                <dd>
                  {stateRef.current.pos.x.toFixed(1)}, {stateRef.current.pos.y.toFixed(1)}
                </dd>
              </dl>
              <div className="btn-row" style={{ margin: '8px 0 0' }}>
                <Link className="btn" to="/firmware">
                  How the real spin loop works
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="studio-grid">
          <div>
            <div className="viewer">
              <div className="viewer-bar" role="toolbar" aria-label="Build model">
                <div className="tabs" role="radiogroup" aria-label="Model">
                  {cadModels.map((m) => (
                    <button
                      key={m.id}
                      className="tab"
                      role="radio"
                      aria-checked={modelId === m.id}
                      aria-pressed={modelId === m.id}
                      onClick={() => {
                        setModelId(m.id);
                        setSelected(null);
                        setHidden(new Set());
                        setIsolated(null);
                      }}
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
                    value={bExplode}
                    onChange={(e) => setBExplode(Number(e.target.value))}
                    aria-label="Exploded view"
                  />
                </label>
              </div>
              <BuildCanvas
                modelId={modelId}
                bparts={bparts}
                selected={selected}
                hidden={hidden}
                isolated={isolated}
                explode={bExplode}
                onSelect={setSelected}
              />
              <p className="status" role="status">
                {bmodel.label} · {bparts.length} parts · click a part for placement guidance
                {isolated !== null && (
                  <>
                    {' '}· isolated #{isolated} —{' '}
                    <button className="mini" onClick={() => setIsolated(null)}>
                      Exit isolate
                    </button>
                  </>
                )}
              </p>
              <div className="legend" aria-label="Heuristic material roles, verify in CAD">
                {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => (
                  <span key={r}>
                    <span className="role-dot" style={{ background: ROLE_CSS[r] }} aria-hidden="true" />
                    {ROLE_LABELS[r]}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="part-panel">
            <header>
              <input
                type="search"
                aria-label="Search parts"
                placeholder="Search # / role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <select
                  aria-label="Filter by material role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{ minHeight: 40, flex: 1 }}
                >
                  <option value="all">All roles</option>
                  {rolesPresent.map((r) => (
                    <option key={r} value={r}>
                      {(ROLE_LABELS as Record<string, string>)[r] ?? r}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by build step"
                  value={stepFilter}
                  onChange={(e) => setStepFilter(e.target.value as 'all' | BuildStepKey)}
                  style={{ minHeight: 40, flex: 1 }}
                >
                  <option value="all">All steps</option>
                  <option value="3">Step 3 print</option>
                  <option value="4">Step 4 frame</option>
                  <option value="5">Step 5 wire</option>
                </select>
              </div>
              <p className="meta" style={{ margin: '8px 0 0' }}>
                {entries.length}/{bparts.length} shown
              </p>
            </header>
            <ul className="part-list" aria-label="Parts">
              {entries.map(({ i, p }) => (
                <li key={i} data-idx={i} style={{ padding: 0 }}>
                  <button
                    type="button"
                    aria-pressed={selected === i}
                    aria-label={`Select part ${i}, ${p.role}`}
                    onClick={() => {
                      setSelected(selected === i ? null : i);
                      if (selected !== i && !p.dropped_from_glb) setIsolated(i);
                    }}
                    style={{
                      all: 'unset',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                      minWidth: 0,
                      padding: '8px 0 8px 12px',
                      cursor: 'pointer',
                      background: selected === i ? 'var(--accent-wash)' : 'transparent',
                      boxShadow: selected === i ? 'inset 3px 0 0 var(--accent-graphic)' : 'none',
                    }}
                  >
                    <span
                      className="role-dot"
                      style={{ background: ROLE_CSS[p.role as keyof typeof ROLE_CSS] ?? '#999' }}
                      aria-hidden="true"
                    />
                    <span className="row-main">
                      <b>#{i} {p.role}</b>
                      <span>{partLabel(p, i)}</span>
                    </span>
                  </button>
                </li>
              ))}
              {entries.length === 0 && (
                <li>
                  <span className="row-main">
                    <b>No parts match</b>
                    <span>Clear the search or filters.</span>
                  </span>
                  <button
                    className="mini"
                    onClick={() => {
                      setQuery('');
                      setRoleFilter('all');
                      setStepFilter('all');
                    }}
                  >
                    Clear filters
                  </button>
                </li>
              )}
            </ul>
            <div className="readout placement-card" aria-live="polite">
              {selected !== null && bparts[selected] && selGuide ? (
                <>
                  <b>
                    Part #{selected}
                  </b>{' '}
                  <span className="stamp todo">{bparts[selected].role} · heuristic</span>{' '}
                  {bparts[selected].dropped_from_glb && <span className="stamp todo">stats only</span>}
                  <p style={{ margin: '8px 0' }}>
                    <b>Where it goes:</b> {selGuide.where}
                  </p>
                  <dl>
                    <dt>Build step</dt>
                    <dd>{selGuide.stepDetail}</dd>
                    <dt>Volume</dt>
                    <dd>{bparts[selected].vol_cm3} cm³</dd>
                    <dt>BBox</dt>
                    <dd>{bparts[selected].bbox_mm.map((d) => d.toFixed(1)).join(' × ')} mm</dd>
                  </dl>
                  <p style={{ margin: '8px 0' }}>{selGuide.note}</p>
                  {selGuide.caution && (
                    <div className="warn" style={{ margin: '8px 0' }}>
                      {selGuide.caution}
                    </div>
                  )}
                  <div className="btn-row" style={{ margin: '8px 0 0' }}>
                    {selGuide.links.map((l) => (
                      <Link key={l.to + l.label} className="btn" to={l.to}>
                        {l.label}
                      </Link>
                    ))}
                    <button className="mini" onClick={() => setSelected(null)}>
                      Clear
                    </button>
                  </div>
                </>
              ) : (
                <span className="meta">Select a part for placement guidance — where it goes, which step, which fasteners.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {help && (
        <>
          <div className="backdrop" aria-hidden="true" onClick={() => { setHelp(false); helpBtnRef.current?.focus(); }} />
          <div className="help-overlay">
            <div className="help-card" role="dialog" aria-modal="true" aria-label="Drive keys">
              <h3>Drive keys</h3>
              <table>
                <tbody>
                  <tr><td><kbd className="mono">W A S D</kbd> / arrows</td><td>Translate intent</td></tr>
                  <tr><td><kbd className="mono">Shift</kbd> hold</td><td>Throttle — spin up to 4000 RPM</td></tr>
                  <tr><td><kbd className="mono">Space</kbd> / <kbd className="mono">X</kbd></td><td>Brake</td></tr>
                  <tr><td><kbd className="mono">R</kbd></td><td>Reset pose</td></tr>
                  <tr><td><kbd className="mono">Esc</kbd></td><td>Release the viewport</td></tr>
                </tbody>
              </table>
              <p className="meta">Keys only work while the viewport is focused — click it first. No spin means no move.</p>
              <button className="mini drive-btn" onClick={() => { setHelp(false); helpBtnRef.current?.focus(); }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

}
