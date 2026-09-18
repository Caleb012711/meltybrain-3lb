/* oxlint-disable react/immutability */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { cadModels } from '../data/content';
import { BUILD_GUIDE, STEP_ROLES, type BuildStepKey } from '../data/buildGuide';
import { useModelParts, usePrefersReducedMotion } from '../hooks/hooks';
import { ExplodingModel, FocusRig, GlErrorBoundary, ViewerLights, EMPTY_SET } from '../components/CadViewer';
import {
  ROLE_CSS,
  ROLE_LABELS,
  SHELL_MATERIAL_LABELS,
  SHELL_PROFILE_LABELS,
  massLabel,
  partLabel,
  type ShellMaterialPreset,
  type ShellProfilePreset,
} from '../components/materials';

// ---------- drive physics (arcade melty: no spin = no move) ----------
const RPM_MAX = 4000;
const TAU_UP = 0.9;
const TAU_DOWN = 1.3;
const MAX_SPEED = 8.5;
const K_ACCEL = 6.5;
const K_DRAG = 4.5;
const K_BRAKE = 6.0;
const GRIP_LO = 1400;
const GRIP_HI = 3100;
const GRIP_EXP = 2.8;
const HALF = 15;
const BOT_R = 2.0;
// Rest height: model normalizes to ~4 units long, ~1.1 thick → half-thickness.
const REST_Y = 0.56;
const BOUNCE = 0.45;
const TRAIL_N = 120;

type DriveState = {
  pos: THREE.Vector2;
  vel: THREE.Vector2;
  rpm: number;
  throttleSm: number;
  spinAngle: number;
  visOmega: number;
  hitT: number;
};

type DriveInput = {
  move: THREE.Vector2;
  throttle: boolean;
  brake: boolean;
};

function stepDrive(st: DriveState, inp: DriveInput, dt: number) {
  const d = Math.min(dt, 1 / 30);
  const target = inp.brake ? 0 : inp.throttle ? RPM_MAX : 0;
  const tau = inp.brake ? 0.5 : inp.throttle ? TAU_UP : TAU_DOWN;
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
  // brake = strong approach-to-zero only (no extra multiplier so K_BRAKE means what it says)
  st.pos.x += st.vel.x * d;
  st.pos.y += st.vel.y * d;
  const lim = HALF - BOT_R;
  // Per-axis resolve with min rebound so slow rolls still kick off the wall.
  // Cooldown stops machine-gun re-trigger while grinding without freezing visual spin.
  if (st.hitT > 0) {
    st.hitT -= d;
  } else {
    let hit = false;
    if (st.pos.x > lim || st.pos.x < -lim) {
      const sgn = st.pos.x > 0 ? 1 : -1;
      st.pos.x = sgn * lim;
      st.vel.x *= -BOUNCE;
      st.vel.y *= 0.85; // wall scrub bleeds tangent speed
      if (Math.abs(st.vel.x) < 2.5) st.vel.x = -sgn * 2.5;
      st.rpm *= 0.82; // wall impact drops weapon rotational kinetic energy
      hit = true;
    }
    if (st.pos.y > lim || st.pos.y < -lim) {
      const sgn = st.pos.y > 0 ? 1 : -1;
      st.pos.y = sgn * lim;
      st.vel.y *= -BOUNCE;
      st.vel.x *= 0.85;
      if (Math.abs(st.vel.y) < 2.5) st.vel.y = -sgn * 2.5;
      st.rpm *= 0.82; // wall impact drops weapon rotational kinetic energy
      hit = true;
    }
    if (hit) st.hitT = 0.12;
  }
  const omegaTrue = ((st.rpm * 2 * Math.PI) / 60) * 0.05;
  const omegaWant = Math.min(omegaTrue, 8);
  st.visOmega += (omegaWant - st.visOmega) * (1 - Math.exp(-d / 0.3));
  st.spinAngle += st.visOmega * d;
  st.throttleSm += (((inp.throttle && !inp.brake) ? 1 : 0) - st.throttleSm) * (1 - Math.exp(-8 * d));
  return grip;
}

const HANDLED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyX',
  'ShiftLeft', 'ShiftRight',
]);

function DriveBot({
  stateRef,
  inputRef,
  parts,
  reduced,
  circularShell = true,
  shellMaterial = 'titanium',
  shellProfile = 'body',
}: {
  stateRef: React.MutableRefObject<DriveState>;
  inputRef: React.MutableRefObject<DriveInput>;
  parts: Parameters<typeof ExplodingModel>[0]['parts'];
  reduced: boolean;
  circularShell?: boolean;
  shellMaterial?: ShellMaterialPreset;
  shellProfile?: ShellProfilePreset;
}) {
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const st = stateRef.current;
    stepDrive(st, inputRef.current, delta);
    if (group.current) group.current.position.set(st.pos.x, REST_Y, st.pos.y);
    if (spinner.current && !reduced) spinner.current.rotation.z = st.spinAngle;
  });
  return (
    // CAD is Z-up with the weapon axis along Z; level it flat (rotation.x)
    // so the ring lies horizontal on the arena floor, then spin the inner
    // group about its own Z — which is world-vertical after leveling.
    <group ref={group} position={[0, REST_Y, 0]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group ref={spinner}>
          <ExplodingModel
            url="cad/main-cad.glb"
            parts={parts}
            explode={0}
            wireframe={false}
            xray={false}
            spin={false}
            colorMode="role"
            circularShell={circularShell}
            shellMaterial={shellMaterial}
            shellProfile={shellProfile}
            selected={null}
            hovered={null}
            hidden={EMPTY_SET}
            isolated={null}
            onSelect={() => undefined}
            onHover={() => undefined}
          />
          {/* heading LED on the rim — rotates with the bot, the steering cue.
              When circularShell is active, CircularOuterShell provides integrated optical beacons. */}
          {!circularShell && (
            <mesh position={[1.1, 0, 0.6]}>
              <sphereGeometry args={[0.13, 16, 16]} />
              <meshBasicMaterial color="#12b76a" toneMapped={false} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

const _camDir = new THREE.Vector2();
const _camWant = new THREE.Vector3();
const _camLook = new THREE.Vector3();

const _aiD = new THREE.Vector2();
const _aiN = new THREE.Vector2();
const _aiLead = new THREE.Vector2();

function RivalBot({
  selfRef,
  foeRef,
  parts,
  reduced,
  circularShell = true,
  shellProfile = 'body',
}: {
  selfRef: React.MutableRefObject<DriveState>;
  foeRef: React.MutableRefObject<DriveState>;
  parts: Parameters<typeof ExplodingModel>[0]['parts'];
  reduced: boolean;
  circularShell?: boolean;
  shellProfile?: ShellProfilePreset;
}) {
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const inp = useRef<DriveInput>({ move: new THREE.Vector2(1, 0), throttle: true, brake: false });
  useFrame(({ clock }, delta) => {
    const me = selfRef.current;
    const foe = foeRef.current;
    // seek with velocity lead + strafe wobble; flee to spin up; avoid walls
    const lim = HALF - BOT_R - 3;
    if (Math.abs(me.pos.x) > lim || Math.abs(me.pos.y) > lim) {
      _aiD.set(-me.pos.x, -me.pos.y).normalize();
      inp.current.move.set(_aiD.y * 0.6 + _aiD.x, -_aiD.x * 0.6 + _aiD.y).normalize();
    } else if (me.rpm < 1200) {
      _aiD.copy(me.pos).sub(foe.pos);
      if (_aiD.lengthSq() > 1e-6) inp.current.move.copy(_aiD.normalize());
    } else {
      _aiLead.copy(foe.pos).addScaledVector(foe.vel, 0.35);
      _aiD.copy(_aiLead).sub(me.pos);
      if (_aiD.lengthSq() > 1e-6) {
        _aiD.normalize();
        const w = Math.sin(clock.elapsedTime * 2) * 0.3;
        inp.current.move.set(_aiD.x + -_aiD.y * w, _aiD.y + _aiD.x * w).normalize();
      }
    }
    inp.current.throttle = true;
    inp.current.brake = false;
    stepDrive(me, inp.current, delta);
    // collide: split penetration, reflect approach, both lose RPM
    _aiN.copy(me.pos).sub(foe.pos);
    const d = _aiN.length();
    const minD = BOT_R * 2;
    if (d > 1e-4 && d < minD) {
      _aiN.divideScalar(d);
      const push = (minD - d) / 2;
      me.pos.addScaledVector(_aiN, push);
      foe.pos.addScaledVector(_aiN, -push);
      const pairs: [DriveState, number][] = [[me, 1], [foe, -1]];
      for (const [s, sgn] of pairs) {
        const vn = s.vel.dot(_aiN) * sgn;
        if (vn < 0) s.vel.addScaledVector(_aiN, -(1 + BOUNCE) * vn * sgn);
        s.rpm *= 0.75;
      }
    }
    if (group.current) group.current.position.set(me.pos.x, REST_Y, me.pos.y);
    if (spinner.current && !reduced) spinner.current.rotation.z = me.spinAngle;
  });
  return (
    <group ref={group} position={[8, REST_Y, 8]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <group ref={spinner}>
          <ExplodingModel
            url="cad/main-cad.glb"
            parts={parts}
            explode={0}
            wireframe={false}
            xray={false}
            spin={false}
            colorMode="role"
            circularShell={circularShell}
            shellMaterial="tpu-stealth"
            shellProfile={shellProfile}
            selected={null}
            hovered={null}
            hidden={EMPTY_SET}
            isolated={null}
            onSelect={() => undefined}
            onHover={() => undefined}
          />
        </group>
      </group>
      {/* red ring marker: this one is the rival (flat on the floor, not the bot) */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.6, 32]} />
        <meshBasicMaterial color="#c81e1e" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function DriveCam({
  stateRef,
  top,
  reduced,
}: {
  stateRef: React.MutableRefObject<DriveState>;
  top: boolean;
  reduced: boolean;
}) {
  const look = useRef(new THREE.Vector3(0, 1.6, 0));
  const dir = useRef(new THREE.Vector2(0, 1));
  useFrame(({ camera }, delta) => {
    const st = stateRef.current;
    if (top) {
      _camWant.set(st.pos.x, 40, st.pos.y + 0.01);
    } else {
      // chase: sit behind velocity, fall back to last heading at rest
      const sp = st.vel.length();
      if (sp > 1) dir.current.copy(st.vel).divideScalar(sp);
      _camDir.copy(dir.current);
      _camWant.set(
        THREE.MathUtils.clamp(st.pos.x - _camDir.x * 7.5, -HALF - 0.5, HALF + 0.5),
        2.6 - Math.min(0.6, sp * 0.08),
        THREE.MathUtils.clamp(st.pos.y - _camDir.y * 7.5, -HALF - 0.5, HALF + 0.5)
      );
      // never inside the bot
      const dx = _camWant.x - st.pos.x;
      const dz = _camWant.z - st.pos.y;
      const dd = Math.hypot(dx, dz);
      if (dd < 4 && dd > 1e-4) {
        _camWant.x = st.pos.x + (dx / dd) * 4;
        _camWant.z = st.pos.y + (dz / dd) * 4;
      }
      if (camera instanceof THREE.PerspectiveCamera) {
        const wantFov = 42 + Math.min(10, (sp / MAX_SPEED) * 10);
        if (Math.abs(camera.fov - wantFov) > 0.1) {
          camera.fov += (wantFov - camera.fov) * 0.1;
          camera.updateProjectionMatrix();
        }
      }
    }
    if (reduced || top) {
      camera.position.copy(_camWant);
      look.current.set(st.pos.x, top ? 0 : 1.6, st.pos.y);
      if (camera instanceof THREE.PerspectiveCamera && camera.fov !== 42) {
        camera.fov = 42;
        camera.updateProjectionMatrix();
      }
    } else {
      const k = 1 - Math.exp(-3.0 * Math.min(delta, 0.05));
      camera.position.lerp(_camWant, k);
      _camLook.set(st.pos.x, 1.6 - Math.min(0.3, st.vel.length() * 0.05), st.pos.y);
      look.current.lerp(_camLook, 1 - Math.exp(-4.0 * Math.min(delta, 0.05)));
    }
    camera.lookAt(look.current);
  });
  return null;
}

function DriveTrail({
  stateRef,
  on,
  gen,
}: {
  stateRef: React.MutableRefObject<DriveState>;
  on: boolean;
  gen: number;
}) {
  const count = useRef(0);
  const acc = useRef(0);
  const [lineObj] = useState(() => {
    const buf = new Float32Array(TRAIL_N * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    g.setDrawRange(0, 0);
    const m = new THREE.LineBasicMaterial({ color: '#e8490f', transparent: true, opacity: 0.7 });
    return new THREE.Line(g, m);
  });

  useEffect(() => {
    count.current = 0;
    acc.current = 0;
    lineObj.geometry.setDrawRange(0, 0);
  }, [gen, lineObj]);

  useEffect(
    () => () => {
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    },
    [lineObj]
  );

  // oxlint-disable-next-line react(immutability)
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
    const posAttr = lineObj.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const last = count.current > 0 ? count.current - 1 : -1;
    if (last >= 0) {
      const dx = st.pos.x - arr[last * 3];
      const dz = st.pos.y - arr[last * 3 + 2];
      if (dx * dx + dz * dz < 0.0025) return;
    }
    if (count.current >= TRAIL_N) {
      arr.copyWithin(0, 3);
      count.current = TRAIL_N - 1;
    }
    // oxlint-disable-next-line react(immutability)
    arr[count.current * 3] = st.pos.x;
    arr[count.current * 3 + 1] = 0.06;
    arr[count.current * 3 + 2] = st.pos.y;
    count.current += 1;
    posAttr.needsUpdate = true;
    lineObj.geometry.setDrawRange(0, count.current);
  });

  if (!on) return null;
  return <primitive object={lineObj} />;
}

const ARENA_EDGE = new THREE.EdgesGeometry(new THREE.BoxGeometry(2 * HALF, 0.02, 2 * HALF));

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
        <meshStandardMaterial color="#f7f8fa" roughness={0.95} />
      </mesh>
      <gridHelper args={[2 * HALF, 2 * HALF, '#c3c8d0', '#e5e7eb']} position={[0, 0.01, 0]} />
      <lineSegments geometry={ARENA_EDGE} position={[0, 0.02, 0]}>
        <lineBasicMaterial color="#1a1d21" />
      </lineSegments>
      {walls.map(([x, , z, w, d], i) => (
        <mesh key={i} position={[x, 0.3, z]}>
          <boxGeometry args={[w, 0.6, d]} />
          <meshStandardMaterial color="#22252a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function BuildCanvas({
  modelId: mid,
  bparts: bp,
  selected: sel,
  focus,
  homeKey,
  reduced,
  hidden: hid,
  isolated: iso,
  explode,
  circularShell = true,
  shellMaterial = 'titanium',
  shellProfile = 'body',
  onSelect,
  onFocus,
}: {
  modelId: string;
  bparts: Parameters<typeof ExplodingModel>[0]['parts'];
  selected: number | null;
  focus: number | null;
  homeKey: number;
  reduced: boolean;
  hidden: Set<number>;
  isolated: number | null;
  explode: number;
  circularShell?: boolean;
  shellMaterial?: ShellMaterialPreset;
  shellProfile?: ShellProfilePreset;
  onSelect: (i: number | null) => void;
  onFocus: (i: number | null) => void;
}) {
  const model = cadModels.find((m) => m.id === mid) ?? cadModels[0];
  return (
    <div style={{ position: 'relative' }}>
      <Canvas
        camera={{ position: [4.4, 3.1, 5.4], fov: 42 }}
        dpr={[1, 1.5]}
        style={{ cursor: 'grab' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor('#ffffff', 1);
        }}
        role="img"
        aria-label={`Build guide model, ${model.label}. Model orbit is pointer-only; full part control is in the list below.`}
        onPointerMissed={() => onSelect(null)}
        onDoubleClick={() => {
          if (sel !== null) onFocus(sel);
        }}
      >
        <ViewerLights />
        <gridHelper args={[12, 24, '#c3c8d0', '#e5e7eb']} position={[0, -0.62, 0]} />
        <Suspense fallback={null}>
          {/* CAD is Z-up: level the ring flat. */}
          <group rotation={[-Math.PI / 2, 0, 0]}>
            <ExplodingModel
              url={model.glb}
              parts={bp}
              explode={explode}
              wireframe={false}
              xray={false}
              spin={false}
              colorMode="role"
              circularShell={circularShell}
              shellMaterial={shellMaterial}
              shellProfile={shellProfile}
              selected={sel}
              hovered={null}
              hidden={hid}
              isolated={iso}
              onSelect={onSelect}
              onHover={() => undefined}
            />
          </group>
        </Suspense>
        <FocusRig idx={focus} homeKey={homeKey} reduced={reduced} />
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
    </div>
  );
}

function TourRow({ n, tour, text }: { n: number; tour: { idx: number; done: boolean[] }; text: string }) {
  const isDone = tour.done[n];
  const isCurrent = tour.idx === n && !isDone;
  return (
    <li
      aria-current={isCurrent ? 'step' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '6px 0',
        padding: '6px 12px',
        borderRadius: 'var(--radius)',
        background: isCurrent ? 'var(--accent-wash)' : isDone ? '#f0fdf4' : 'transparent',
        border: `1px solid ${isCurrent ? '#fed7aa' : isDone ? '#bbf7d0' : 'transparent'}`,
        color: isDone ? 'var(--ok)' : isCurrent ? 'var(--accent-text)' : 'var(--steel)',
        fontWeight: isCurrent || isDone ? 650 : 500,
        fontSize: '13.5px',
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isDone ? 'var(--ok)' : isCurrent ? 'var(--accent-graphic)' : 'var(--inset)',
          color: isDone || isCurrent ? '#ffffff' : 'var(--muted)',
          fontSize: '11px',
          fontFamily: 'ui-monospace, monospace',
          fontWeight: 700,
          flex: 'none',
        }}
        aria-hidden="true"
      >
        {isDone ? '✓' : n + 1}
      </span>
      <span>{text}</span>
    </li>
  );
}

function useSpinAudio(
  stateRef: React.MutableRefObject<DriveState>,
  enabled: boolean
) {
  const ac = useRef<AudioContext | null>(null);
  const nodes =
    useRef<{ osc: OscillatorNode; oct: OscillatorNode; gain: GainNode } | null>(null);
  useEffect(() => {
    if (!enabled) {
      ac.current?.suspend();
      return;
    }
    if (!ac.current) {
      const Ctx = window.AudioContext;
      if (!Ctx) return;
      ac.current = new Ctx();
      const osc = ac.current.createOscillator();
      osc.type = 'sawtooth';
      const oct = ac.current.createOscillator();
      oct.type = 'sine';
      const g2 = ac.current.createGain();
      g2.gain.value = 0.3;
      const gain = ac.current.createGain();
      gain.gain.value = 0;
      const lp = ac.current.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      osc.connect(lp);
      oct.connect(g2);
      g2.connect(lp);
      lp.connect(gain);
      gain.connect(ac.current.destination);
      osc.start();
      oct.start();
      nodes.current = { osc, oct, gain };
    }
    void ac.current.resume();
    return () => {
      ac.current?.suspend();
    };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const st = stateRef.current;
      if (!nodes.current || !ac.current) return;
      const c = Math.min(1, Math.max(0, (st.rpm - 2000) / 2000));
      const f = 60 + c * 70;
      const t = ac.current.currentTime;
      nodes.current.osc.frequency.setTargetAtTime(Math.max(1, f), t, 0.05);
      nodes.current.oct.frequency.setTargetAtTime(Math.max(1, f * 2), t, 0.05);
      nodes.current.gain.gain.setTargetAtTime(
        st.throttleSm * 0.08 * (st.rpm > 50 ? 1 : 0),
        t,
        0.08
      );
    }, 100);
    return () => window.clearInterval(id);
  }, [enabled, stateRef]);
}

export function Studio() {
  const reduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<'drive' | 'build'>('drive');
  const [armed, setArmed] = useState(false);
  const [top, setTop] = useState(false);
  const [trailOn, setTrailOn] = useState(!reduced);
  const [brakeUi, setBrakeUi] = useState(false);
  const [help, setHelp] = useState(false);
  const [hud, setHud] = useState({ rpm: 0, speed: 0, thr: 0, grip: 0, x: 0, y: 0 });
  const [srText, setSrText] = useState('Stopped. Focus the viewport, then drive.');
  const [glFailed, setGlFailed] = useState(false);
  const [circularShell, setCircularShell] = useState(true);
  const [shellMaterial, setShellMaterial] = useState<ShellMaterialPreset>('titanium');
  const [shellProfile, setShellProfile] = useState<ShellProfilePreset>('body');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const helpBtnRef = useRef<HTMLButtonElement | null>(null);
  const helpRef = useRef(false);
  helpRef.current = help;
  const helpCardRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<DriveState>({
    pos: new THREE.Vector2(0, 0),
    vel: new THREE.Vector2(0, 0),
    rpm: 0,
    throttleSm: 0,
    spinAngle: 0,
    visOmega: 0,
    hitT: 0,
  });
  const rivalRef = useRef<DriveState>({
    pos: new THREE.Vector2(8, 8),
    vel: new THREE.Vector2(0, 0),
    rpm: 0,
    throttleSm: 0,
    spinAngle: 0,
    visOmega: 0,
    hitT: 0,
  });
  const [rivalOn, setRivalOn] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  useSpinAudio(stateRef, soundOn);
  const [tour, setTour] = useState<null | { idx: number; done: boolean[] }>(null);
  useEffect(() => {
    try {
      if (!window.localStorage.getItem('studio-drive-tour-v1')) setTour({ idx: 0, done: [false, false, false, false, false] });
    } catch {
      /* private mode */
    }
  }, []);
  const dismissTourRef = useRef(() => {});
  const dismissTour = () => {
    setTour(null);
    try {
      window.localStorage.setItem('studio-drive-tour-v1', '1');
    } catch {
      /* private mode */
    }
  };
  dismissTourRef.current = dismissTour;
  // tour advance from live drive state
  useEffect(() => {
    if (!tour || tour.done.every(Boolean)) return;
    const st = stateRef.current;
    const speed = st.vel.length();
    const moved = Math.hypot(st.pos.x, st.pos.y);
    const checks = [
      armed,
      st.rpm >= 3000,
      speed > 1 && moved > 2,
      brakeUi && speed < 0.5,
      st.rpm < 20 && speed < 0.1 && (stateRef.current as { toured?: boolean }).toured === true,
    ];
    const idx = tour.idx;
    if (idx < 5 && checks[idx]) {
      const done = tour.done.slice();
      done[idx] = true;
      const next = done.every(Boolean) ? idx : Math.min(4, idx + 1);
      if (done.every(Boolean)) {
        try {
          window.localStorage.setItem('studio-drive-tour-v1', '1');
        } catch {
          /* ignore */
        }
      }
      setTour({ idx: next, done });
      setSrText(`Tour step ${idx + 1} of 5 complete.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hud, armed, brakeUi]);
  const inputRef = useRef<DriveInput>({ move: new THREE.Vector2(0, 0), throttle: false, brake: false });
  const keysRef = useRef(new Set<string>());
  const keyThr = useRef(false);
  const syncThr = () => {
    inputRef.current.throttle = keyThr.current || thrTouchRef.current;
  };
  const thrTouchRef = useRef(false);
  const joyRef = useRef<{ x: number; y: number } | null>(null);
  const parts = useModelParts('full');

  // build-guide mode state
  const [modelId, setModelId] = useState('full');
  const [selected, setSelected] = useState<number | null>(null);
  const [bFocus, setBFocus] = useState<number | null>(null);
  const [bHome, setBHome] = useState(0);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [isolated, setIsolated] = useState<number | null>(null);
  const [bExplode, setBExplode] = useState(0);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState<'all' | BuildStepKey>('all');
  const bparts = useModelParts(modelId);
  const bmodel = cadModels.find((m) => m.id === modelId) ?? cadModels[0];
  const buildListRef = useRef<HTMLUListElement | null>(null);

  const trailGen = useRef(0);
  const disarm = () => {
    setArmed(false);
    keysRef.current.clear();
    inputRef.current.move.set(0, 0);
    keyThr.current = false;
    thrTouchRef.current = false;
    inputRef.current.throttle = false;
    inputRef.current.brake = false;
    setBrakeUi(false);
    joyRef.current = null;
    setStick({ x: 0, y: 0 });
    setThrTouch(false);
    setSrText('Stopped. Focus the viewport, then drive.');
  };

  const resetDrive = () => {
    trailGen.current += 1;
    (stateRef.current as { toured?: boolean }).toured = true;
    for (const st of [stateRef.current, rivalRef.current]) {
      st.pos.set(st === rivalRef.current ? 8 : 0, st === rivalRef.current ? 8 : 0);
      st.vel.set(0, 0);
      st.rpm = 0;
      st.spinAngle = 0;
      st.throttleSm = 0;
      st.visOmega = 0;
      st.hitT = 0;
    }
    setSrText('Drive reset to arena center at 0 RPM.');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (helpRef.current) {
        setHelp(false);
        helpBtnRef.current?.focus();
      } else {
        dismissTourRef.current();
      }
    };
    const f = () => disarm();
    const onVis = () => {
      if (document.hidden) disarm();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', f);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', f);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // HUD numbers at 10 Hz; screen-reader state-class announcements at ~4 s
  useEffect(() => {
    if (mode !== 'drive') return;
    let lastSr = '';
    let lastSrAt = 0;
    const id = window.setInterval(() => {
      const st = stateRef.current;
      const speed = st.vel.length();
      const grip =
        Math.pow(Math.min(1, Math.max(0, (st.rpm - GRIP_LO) / (GRIP_HI - GRIP_LO))), GRIP_EXP);
      setHud({
        rpm: Math.round(st.rpm),
        speed,
        thr: st.throttleSm,
        grip,
        x: st.pos.x,
        y: st.pos.y,
      });
      const now = performance.now();
      if (armed && now - lastSrAt > 4000) {
        const cls =
          speed < 0.1 && st.rpm < 20
            ? 'Stopped'
            : st.rpm < GRIP_LO
              ? 'Spinning up'
              : grip > 0.9
                ? 'Full grip'
                : 'Gripping';
        const txt = inputRef.current.brake
          ? `${cls}. Brake engaged.`
          : `${cls}. ${Math.round(st.rpm)} RPM.`;
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
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      keyThr.current = true;
      syncThr();
    }
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
        keyThr.current = false;
        syncThr();
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
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [thrTouch, setThrTouch] = useState(false);
  const onStick = (e: React.PointerEvent, phase: 'down' | 'move' | 'up') => {
    const el = stickRef.current;
    if (!el) return;
    if (phase === 'down') {
      if (stickId.current !== null) return;
      setArmed(true);
      stickId.current = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
    if (e.pointerId !== stickId.current) return;
    if (phase === 'up') {
      stickId.current = null;
      joyRef.current = null;
      setStick({ x: 0, y: 0 });
      pollKeys();
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
    setStick({ x: dx, y: dy });
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: armed ? 'var(--ok)' : 'var(--line-strong)',
                      boxShadow: armed ? '0 0 0 2px rgba(26, 107, 50, 0.25)' : 'none',
                    }}
                  />
                  <span>{armed ? 'ARMED' : 'STANDBY'}</span>
                </span>
                <span>
                  RPM <b>{hud.rpm}</b> <span style={{ color: 'var(--muted)', fontSize: '11px' }}>/ {RPM_MAX}</span>
                </span>
                <span
                  className="rpm-track"
                  role="progressbar"
                  aria-label="Weapon RPM"
                  aria-valuenow={hud.rpm}
                  aria-valuemin={0}
                  aria-valuemax={RPM_MAX}
                >
                  <span className="rpm-fill" style={{ width: `${(hud.rpm / RPM_MAX) * 100}%` }} />
                </span>
                <span>
                  SPD <b>{hud.speed.toFixed(1)}</b> <span style={{ color: 'var(--muted)', fontSize: '11px' }}>u/s</span>
                </span>
                <span>
                  THR <b>{Math.round(hud.thr * 100)}%</b>
                </span>
                <span>
                  AUTH <b>{Math.round(hud.grip * 100)}%</b>
                </span>
                <span className="hud-pill" title="Armor Ring Configuration">
                  ARMOR <b style={{ color: 'var(--accent-graphic)' }}>{circularShell ? '◯ CIRCULAR' : '◻ STOCK'}</b>
                </span>
                {circularShell && (
                  <span className="hud-pill" title="Active Material Preset">
                    MAT <b>{shellMaterial === 'titanium' ? 'Ti-6Al-4V' : shellMaterial === 'aluminum' ? '7075-Al' : shellMaterial === 'carbon' ? 'CF Twill' : shellMaterial === 'tpu-orange' ? 'TPU-Orange' : 'TPU-Stealth'}</b>
                  </span>
                )}
                {brakeUi && (
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                    BRAKE ■
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
                      <ViewerLights />
                      <Suspense fallback={null}>
                        <DriveArena />
                        <DriveBot
                          stateRef={stateRef}
                          inputRef={inputRef}
                          parts={parts}
                          reduced={reduced}
                          circularShell={circularShell}
                          shellMaterial={shellMaterial}
                          shellProfile={shellProfile}
                        />
                        <DriveTrail stateRef={stateRef} on={trailOn && !reduced} gen={trailGen.current} />
                        {rivalOn && (
                          <RivalBot
                            selfRef={rivalRef}
                            foeRef={stateRef}
                            parts={parts}
                            reduced={reduced}
                            circularShell={circularShell}
                            shellProfile={shellProfile}
                          />
                        )}
                      </Suspense>
                      <DriveCam stateRef={stateRef} top={top} reduced={reduced} />
                    </Canvas>
                  </GlErrorBoundary>
                )}
              </div>
              <div className="viewer-bar" role="toolbar" aria-label="Drive controls">
                <button
                  className={`mini drive-btn ${armed ? 'hot' : ''}`}
                  aria-pressed={armed}
                  onClick={() => {
                    if (armed) {
                      disarm();
                    } else {
                      setArmed(true);
                      rootRef.current?.focus();
                      setSrText('Armed. Hold Shift to spin up, WASD to translate.');
                    }
                  }}
                  title={armed ? 'Disarm weapon & drive' : 'Arm weapon & drive'}
                >
                  {armed ? 'Disarm' : 'Arm'}
                </button>
                <button className="mini drive-btn" onClick={resetDrive}>
                  Reset (R)
                </button>
                <button
                  className="mini drive-btn"
                  aria-pressed={brakeUi}
                  onPointerDown={() => {
                    setArmed(true);
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
                  onPointerCancel={() => {
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
                  className="mini drive-btn"
                  aria-pressed={rivalOn}
                  onClick={() => {
                    setRivalOn((v) => !v);
                    setSrText(rivalOn ? 'Rival off.' : 'Rival on.');
                  }}
                >
                  Rival {rivalOn ? 'on' : 'off'}
                </button>
                <button
                  className="mini drive-btn"
                  aria-pressed={circularShell}
                  onClick={() => {
                    setCircularShell((v) => !v);
                    setSrText(!circularShell ? 'Circular armor shell active.' : 'Stock CAD shell active.');
                  }}
                  title="Toggle circularized outer shell vs stock CAD squarish solid_080"
                >
                  Shell {circularShell ? '◯ Circular' : '◻ Stock'}
                </button>
                {circularShell && (
                  <select
                    className="mini drive-btn"
                    aria-label="Shell material"
                    value={shellMaterial}
                    onChange={(e) => setShellMaterial(e.target.value as ShellMaterialPreset)}
                    style={{ minHeight: 44, padding: '0 8px', background: 'var(--surface)' }}
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
                    className="mini drive-btn"
                    aria-label="Shell profile"
                    value={shellProfile}
                    onChange={(e) => setShellProfile(e.target.value as ShellProfilePreset)}
                    style={{ minHeight: 44, padding: '0 8px', background: 'var(--surface)' }}
                  >
                    <option value="body">Body (R 1.25)</option>
                    <option value="perimeter">Armor Ring (R 2.05)</option>
                    <option value="hybrid">Dual Hybrid</option>
                  </select>
                )}
                <button
                  className="mini drive-btn"
                  aria-pressed={soundOn}
                  onClick={() => {
                    setSoundOn((v) => !v);
                    setSrText(soundOn ? 'Spin audio off.' : 'Spin audio on.');
                  }}
                >
                  Sound {soundOn ? 'on' : 'off'}
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
                  aria-valuemin={-1} aria-valuemax={1} aria-valuenow={Math.round(stick.x * 10) / 10} aria-valuetext={`x ${stick.x.toFixed(1)}, y ${stick.y.toFixed(1)}`}
                  tabIndex={0}
                  onPointerDown={(e) => void onStick(e, 'down')}
                  onPointerMove={(e) => void onStick(e, 'move')}
                  onPointerUp={(e) => void onStick(e, 'up')}
                  onPointerCancel={(e) => void onStick(e, 'up')}
                  onKeyDown={(e) => {
                    const step = 0.25;
                    setStick((prev) => {
                      let { x, y } = prev;
                      if (e.key === 'ArrowLeft') x = Math.max(-1, x - step);
                      else if (e.key === 'ArrowRight') x = Math.min(1, x + step);
                      else if (e.key === 'ArrowUp') y = Math.max(-1, y - step);
                      else if (e.key === 'ArrowDown') y = Math.min(1, y + step);
                      else if (e.key === '0' || e.key === ' ') { x = 0; y = 0; }
                      else return prev;
                      e.preventDefault();
                      joyRef.current = { x, y };
                      pollKeys();
                      return { x, y };
                    });
                  }}
                >
                  <span
                    className="joystick-knob"
                    style={{
                      left: `${50 + (joyRef.current?.x ?? 0) * 38}%`,
                      top: `${50 + (joyRef.current?.y ?? 0) * 38}%`,
                    }}
                  />
                </div>
                <button
                  className="mini drive-btn"
                  aria-pressed={thrTouch}
                  style={{ flex: 1, minHeight: 64 }}
                  onPointerDown={() => {
                    setArmed(true);
                  }}
                  onClick={() => {
                    setArmed(true);
                    setSrText(thrTouch ? 'Throttle off.' : 'Throttle full. Hold WASD to translate.');
                    setThrTouch((v) => {
                      thrTouchRef.current = !v;
                      syncThr();
                      return !v;
                    });
                  }}
                >
                  Throttle: {thrTouch ? 'ON' : 'OFF'}
                </button>
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
                Sim aid only: under ~1400 RPM this sim gives zero authority, ramping to full
                past ~3100. The real lesson is the same shape — hold Shift for RPM <i>while</i>{' '}
                holding WASD; spin and steer together. Walls scrub spin in real life — expect
                stall, not bounce. See /firmware.
              </p>
            </header>
            <div className="readout">
              <dl>
                <dt>RPM</dt>
                <dd>{hud.rpm} / {RPM_MAX}</dd>
                <dt>Speed</dt>
                <dd>{hud.speed.toFixed(2)} sim u/s</dd>
                <dt>Throttle</dt>
                <dd>{Math.round(hud.thr * 100)} %</dd>
                <dt>Authority (sim)</dt>
                <dd>{Math.round(hud.grip * 100)} %</dd>
                <dt>Armor Shell</dt>
                <dd>{circularShell ? `◯ ${SHELL_MATERIAL_LABELS[shellMaterial]} (${SHELL_PROFILE_LABELS[shellProfile]})` : '◻ Stock CAD solid_080 (~137.7 × 131.5 mm)'}</dd>
                <dt>Balance</dt>
                <dd>{circularShell ? '100% rotational symmetry · <0.02 mm runout' : 'Asymmetric envelope'}</dd>
                <dt>Position</dt>
                <dd>
                  {hud.x.toFixed(1)}, {hud.y.toFixed(1)}
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
                        setBFocus(null);
                        setBHome((k) => k + 1);
                        setHidden(new Set());
                        setIsolated(null);
                        setQuery('');
                        setRoleFilter('all');
                        setStepFilter('all');
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
                        style={{ minHeight: 36, padding: '0 6px', background: 'var(--surface)' }}
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
                        style={{ minHeight: 36, padding: '0 6px', background: 'var(--surface)' }}
                      >
                        <option value="body">Body (R 1.25)</option>
                        <option value="perimeter">Armor Ring (R 2.05)</option>
                        <option value="hybrid">Dual Hybrid</option>
                      </select>
                    )}
                  </>
                )}
              </div>
              {glFailed ? (
                <div className="viewer-fallback">
                  <img
                    src="eyeliner_summer_2025_render.webp"
                    alt="Overhead render of the Eyeliner 3lb meltybrain (3D unavailable)"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : (
              <GlErrorBoundary onFail={() => setGlFailed(true)}>
                <BuildCanvas
                  modelId={modelId}
                  bparts={bparts}
                  selected={selected}
                  focus={bFocus}
                  homeKey={bHome}
                  reduced={reduced}
                  hidden={hidden}
                  isolated={isolated}
                  explode={bExplode}
                  circularShell={circularShell}
                  shellMaterial={shellMaterial}
                  shellProfile={shellProfile}
                  onSelect={setSelected}
                  onFocus={setBFocus}
                />
              </GlErrorBoundary>
              )}
              <p className="status" role="status">
                {bmodel.label} · {bparts.length} parts ·{' '}
                {isolated !== null
                  ? `showing isolated #${isolated}`
                  : `${bparts.filter((_, i) => !hidden.has(i)).length} visible`} · click a part for
                placement guidance
              </p>
              {isolated !== null && (
                <p className="status">
                  Isolated #{isolated} —{' '}
                  <button className="mini" onClick={() => setIsolated(null)}>
                    Exit isolate
                  </button>
                </p>
              )}
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
                  style={{ minHeight: 44, flex: 1 }}
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
                  style={{ minHeight: 44, flex: 1 }}
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
            <ul
              className="part-list"
              aria-label="Parts"
              aria-busy={bparts.length === 0}
              ref={buildListRef}
            >
              {bparts.length === 0 &&
                Array.from({ length: 8 }, (_, i) => (
                  <li key={`sk-${i}`} aria-hidden="true">
                    <span className="row-main" style={{ background: 'var(--inset)', height: 44, width: '100%' }} />
                  </li>
                ))}
              {bparts.length > 0 &&
                entries.map(({ i, p }) => (
                <li key={i} data-idx={i} style={{ padding: 0 }}>
                  <button
                    type="button"
                    aria-pressed={selected === i}
                    aria-label={`Select part ${i}, ${p.role}`}
                    onClick={() => {
                      setSelected(selected === i ? null : i);
                      if (selected !== i && !p.dropped_from_glb) setIsolated(i);
                    }}
                    onFocus={() => {
                      const el = buildListRef.current?.querySelector(`[data-idx="${i}"]`);
                      el?.scrollIntoView({ block: 'nearest' });
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
              )
              )}
            {bparts.length > 0 && entries.length === 0 && (
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
                    <dt>Mass</dt>
                    <dd>{massLabel(bparts[selected].role, bparts[selected].vol_cm3)}</dd>
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
                    <button
                      className="mini"
                      onClick={() => selected !== null && setBFocus(selected)}
                      disabled={selected === null}
                    >
                      Zoom to part
                    </button>
                    <button
                      className="mini"
                      onClick={() => {
                        setBFocus(null);
                        setBHome((k) => k + 1);
                      }}
                    >
                      Reset view
                    </button>
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

      {tour && !tour.done.every(Boolean) && (
        <div style={{ marginTop: 12 }}>
          <div role="dialog" aria-label="60-second drive tutorial">
            <h3>
              Drive check ({tour.done.filter(Boolean).length}/5)
              <span className="stamp todo">60 s tour</span>
            </h3>
            <ol style={{ margin: '8px 0', paddingLeft: 20 }}>
              <TourRow n={0} tour={tour} text="Click the viewport (DRIVING shows)" />
              <TourRow n={1} tour={tour} text="Hold Shift to 3000+ RPM" />
              <TourRow n={2} tour={tour} text="Hold WASD too — move 2+ units" />
              <TourRow n={3} tour={tour} text="Tap Space — brake to near stop" />
              <TourRow n={4} tour={tour} text="Press R — reset to zero" />
            </ol>
            <div className="btn-row" style={{ margin: 0 }}>
              <button className="mini drive-btn" onClick={dismissTour}>Skip tour (Esc)</button>
            </div>
          </div>
        </div>
      )}
      {tour && tour.done.every(Boolean) && (
        <p className="status">
          <span className="stamp ok">Drive check done</span>{' '}
          <button className="mini" onClick={() => setTour({ idx: 0, done: [false, false, false, false, false] })}>Replay tour</button>
        </p>
      )}
      <div className="viewer" style={{ marginTop: 24 }}>
        <div className="viewer-bar" style={{ borderTop: 'none', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              Fight reel <span className="stamp ok">60 FPS</span> <span className="stamp todo">Seed 7</span>
            </h2>
            <span className="meta">Deterministic physics simulation — 22 s bout with staged finish</span>
          </div>
          <a className="btn" href="fight-night.mp4" download style={{ minHeight: 36, lineHeight: '34px', padding: '0 14px', fontSize: '12.5px' }}>
            Download MP4 (22 s)
          </a>
        </div>
        <div style={{ background: '#0a0c0e', display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <video
            controls
            playsInline
            preload="metadata"
            poster="fight-poster.jpg"
            src="fight-night.mp4"
            aria-label="Rendered fight: Eyeliner versus rival bot, Eyeliner wins by knockout"
            style={{ width: '100%', maxWidth: 640, aspectRatio: '1 / 1', display: 'block', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <a href="fight-night.mp4" download>Download the fight reel (MP4, 22 s)</a>
          </video>
        </div>
        <p className="status" style={{ borderTop: '1px solid var(--line)' }}>
          Rendered offline by <code>tools/fight_render.py</code> (deterministic seed 7):
          Eyeliner seeks with velocity lead, the rival runs the repo's wobble policy,
          hits cost both bots 0.75× RPM — same spin-up taus and grip curve as this page's
          sim. The late-fight KO is staged (rival throttle cut) to show the full arc.
          Re-render any time — no browser needed.
        </p>
      </div>
      {help && (
        <>
          <div className="backdrop" aria-hidden="true" onClick={() => { setHelp(false); helpBtnRef.current?.focus(); }} />
          <div className="help-overlay">
            <div
              className="help-card"
              role="dialog"
              aria-modal="true"
              aria-label="Drive keys"
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setHelp(false);
                  helpBtnRef.current?.focus();
                  return;
                }
                if (e.key !== 'Tab') return;
                const card = helpCardRef.current;
                if (!card) return;
                const items = Array.from(
                  card.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
                ).filter((el) => el.getClientRects().length > 0);
                if (items.length === 0) return;
                const firstEl = items[0];
                const lastEl = items[items.length - 1];
                if (e.shiftKey && document.activeElement === firstEl) {
                  e.preventDefault();
                  lastEl.focus();
                } else if (!e.shiftKey && document.activeElement === lastEl) {
                  e.preventDefault();
                  firstEl.focus();
                }
              }}
              ref={(el) => {
                helpCardRef.current = el;
                if (el) {
                  const btn = el.querySelector<HTMLElement>('button');
                  btn?.focus();
                }
              }}
            >
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
