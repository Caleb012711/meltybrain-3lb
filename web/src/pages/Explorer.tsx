import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { cadHref, cadModels } from '../data/content';
import { useModelParts, usePrefersReducedMotion } from '../hooks/hooks';
import { ExplodingModel, FocusRig, GlErrorBoundary, ViewerLights, type ColorMode } from '../components/CadViewer';
import {
  ROLE_CSS,
  ROLE_LABELS,
  massLabel,
  partLabel,
  type PartInfo,
} from '../components/materials';
import { Reveal } from '../components/Layout';
import { useTheme } from '../hooks/useTheme';
import './Explorer.css';

function roleOf(parts: PartInfo[], i: number): string {
  return parts[i]?.role ?? 'fastener-dark';
}

export function Explorer() {
  const reduced = usePrefersReducedMotion();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedModel = searchParams.get('model');
  const modelId = cadModels.some((m) => m.id === requestedModel) ? requestedModel! : 'full';
  const [explode, setExplode] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('role');
  const [spin, setSpin] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [homeKey, setHomeKey] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [isolated, setIsolated] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [failed, setFailed] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const parts = useModelParts(modelId);
  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];

  const selectModel = (id: string) => {
    setSearchParams({ model: id });
  };

  useEffect(() => {
    setSelected(null);
    setHovered(null);
    setFocusIdx(null);
    setHomeKey((k) => k + 1);
    setHidden(new Set());
    setIsolated(null);
    setQuery('');
    setRoleFilter('all');
    setFailed(false);
    setExplode(modelId === 'bench-case' ? 0.45 : 0);
    if (modelId === 'bench-case') setSpin(false);
  }, [modelId]);

  useEffect(() => {
    if (selected === null) return;
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const count = parts.length > 0 ? parts.length : model.solids;
  const meshed = useMemo(
    () => parts.filter((p) => !p.dropped_from_glb).length,
    [parts]
  );

  const entries = useMemo(() => {
    const total = parts.length > 0 ? parts.length : model.solids;
    const list: { i: number; p: PartInfo | null }[] = [];
    for (let i = 0; i < total; i++) {
      const p = parts[i] ?? null;
      if (roleFilter !== 'all' && roleOf(parts, i) !== roleFilter) continue;
      if (query) {
        const hay = `${i} ${p?.name ?? ''} ${p?.role ?? ''} ${p?.bbox_mm.join('x') ?? ''} ${p?.vol_cm3 ?? ''}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) continue;
      }
      list.push({ i, p });
    }
    return list;
  }, [parts, model.solids, query, roleFilter]);

  const rolesPresent = useMemo(() => {
    const total = parts.length > 0 ? parts.length : model.solids;
    const s = new Set<string>();
    for (let i = 0; i < total; i++) s.add(roleOf(parts, i));
    return Array.from(s);
  }, [parts, model.solids]);

  const toggleHide = (i: number) => {
    if (parts[i]?.dropped_from_glb) return;
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const isolatePart = (i: number) => {
    if (parts[i]?.dropped_from_glb) return;
    setIsolated(i);
  };

  const reset = () => {
    setSelected(null);
    setHovered(null);
    setFocusIdx(null);
    setHomeKey((k) => k + 1);
    setHidden(new Set());
    setIsolated(null);
    setExplode(0);
    setWireframe(false);
    setXray(false);
    setSpin(false);
    setQuery('');
    setRoleFilter('all');
  };

  const sel = selected !== null ? parts[selected] ?? null : null;

  return (
    <div className="page explorer-page">
      <p className="spec-plate">
        <span>EYELINER / MODEL LIBRARY</span>
        <span>Explorer — part level</span>
      </p>
      <h1>3D explorer</h1>
      <p className="lede">
        Source geometry, part by part. Explore the original assemblies and accessory
        prototypes, inspect their dimensions, and see how the pieces fit together.
      </p>

      <div className="explorer-grid">
        <div>
          <div className="viewer">
            <div className="model-caption">
              <div><span className="model-eyebrow">{model.accessory ? 'Accessory prototype' : 'Source CAD assembly'}</span><strong>{model.label}</strong></div>
              <span className="model-provenance">{model.glb.split('/').pop()}</span>
            </div>
            <div className="explorer-canvas" style={{ position: 'relative' }}>
              {failed ? (
                <div className="viewer-fallback">
                  {(model.id === 'bench-case' || model.id === 'full') && <img src={model.id === 'bench-case' ? 'accessories/xiao-bench-case.png' : 'eyeliner_summer_2025_render.webp'} alt={`${model.label} reference preview`} loading="lazy" decoding="async" />}
                  <p role="status">Interactive 3D is unavailable. You can still inspect the part list and download the source files.</p>
                  <button className="mini" onClick={() => setFailed(false)}>Retry 3D</button>
                </div>
              ) : (
                <GlErrorBoundary onFail={() => setFailed(true)}>
                <Canvas
                  camera={{ position: [4.4, 3.1, 5.4], fov: 42 }}
                  dpr={[1, 1.5]}
                  style={{ cursor: hovered !== null ? 'pointer' : 'grab' }}
                  onPointerMissed={() => setSelected(null)}
                  onDoubleClick={() => {
                    if (selected !== null) setFocusIdx(selected);
                  }}
                  onCreated={({ gl }) => {
                    gl.toneMapping = THREE.NeutralToneMapping;
                    gl.toneMappingExposure = 1.0;
                    gl.outputColorSpace = THREE.SRGBColorSpace;
                    gl.setClearColor('#000000', 0);
                  }}
                  role="img"
                  aria-label={`3D explorer, ${model.label}, ${count} parts`}
                >
                  <color attach="background" args={[theme === 'dark' ? '#20211f' : '#eeece5']} />
                  <ViewerLights />
                  <gridHelper args={[12, 24, theme === 'dark' ? '#4a4842' : '#c9c5ba', theme === 'dark' ? '#2b2b28' : '#e2ded4']} position={[0, model.accessory ? -0.9 : -0.62, 0]} />
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
                        selected={selected}
                        hovered={hovered}
                        hidden={hidden}
                        isolated={isolated}
                        onSelect={setSelected}
                        onHover={setHovered}
                      />
                    </group>
                  </Suspense>
                  <FocusRig idx={focusIdx} homeKey={homeKey} reduced={reduced} />
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
              )}
            </div>
            <div className="viewer-bar" role="toolbar" aria-label="Explorer controls">
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
              <label className="meta">
                Color{' '}
                <select
                  aria-label="Color mode"
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as ColorMode)}
                  style={{ minHeight: 44 }}
                >
                  <option value="role">{model.accessory ? 'By case part' : 'By heuristic role'}</option>
                  <option value="index">By part #</option>
                  <option value="plain">Plain</option>
                </select>
              </label>
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
              <button className="mini" onClick={reset}>
                Reset
              </button>
            </div>
            <p className="model-interaction-note">Drag to orbit · Scroll to zoom · Select a part to inspect</p>
            <p className="status" role="status">
              {model.label} · {count} parts{parts.length > 0 && <> ({meshed} meshed, {count - meshed} thread specks stats-only)</>} ·{' '}
              {isolated !== null ? `showing isolated #${isolated}` : `${meshed - hidden.size} meshed visible`}
            </p>
            {isolated !== null && (
              <p className="status">
                Isolated #{isolated} —{' '}
                <button className="mini" onClick={() => setIsolated(null)}>
                  Exit isolate
                </button>
              </p>
            )}
            <div className="legend" role="group" aria-label={model.accessory ? 'Case parts' : 'Heuristic material roles, verify in CAD'}>
              <span className="meta" style={{ width: '100%' }}>
                {model.accessory ? 'Prototype body and lid; colors identify parts, not filament certification.' : 'Heuristic roles from size — verify alloy in CAD, not measured:'}
              </span>
              {(rolesPresent as (keyof typeof ROLE_LABELS)[]).map((r) => (
                <span key={r}>
                  <span className="role-dot" style={{ background: ROLE_CSS[r] }} aria-hidden="true" />
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          </div>

          <Reveal>
            <div className="step" style={{ marginTop: 12 }}>
              <h2>Direct downloads — {model.label}</h2>
              <p className="path">
                <b>{model.accessory ? 'accessories' : 'cad'}</b>
                <i>/</i>
                {model.step.split('/').pop()} <i>·</i> {model.stepSize} <i>·</i> {model.solids} solids
              </p>
              <div className="btn-row">
                <a className="btn primary" href={cadHref(model.step)} download>
                  STEP {model.stepSize}
                </a>
                <a className="btn" href={cadHref(model.glb)} download>
                  GLB (viewer mesh)
                </a>
                <a className="btn" href={cadHref(model.glb.replace(/\.glb$/, '.stl'))} download>
                  STL (reference)
                </a>
                {model.accessory && (
                  <a className="btn" href={cadHref(model.glb.replace(/\.glb$/, '.zip'))} download>
                    Print package (.ZIP)
                  </a>
                )}
              </div>
              <p className="meta">
                {model.accessory
                  ? 'Prototype geometry for inspection. Physical fit is unverified; review the print guidance before use. The ZIP includes separate STLs, editable CAD, and parameters.'
                  : 'STEP is the source. Viewer STLs are assembly references, not individual print files.'}{' '}
                <Link to="/printing">Print guidance</Link>.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="part-panel">
          <header>
            <h2 className="parts-heading">Parts <span>{count}</span></h2>
            <input
              type="search"
              aria-label="Search parts"
              placeholder="Search # / role / dims…"
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
                <option value="all">All roles ({parts.length > 0 ? count : '…'})</option>
                {rolesPresent.map((r) => (
                  <option key={r} value={r}>
                    {(ROLE_LABELS as Record<string, string>)[r] ?? r}
                  </option>
                ))}
              </select>
            </div>
            <p className="meta" style={{ margin: '8px 0 0' }}>
              {entries.length}/{count} shown
            </p>
          </header>
          <ul className="part-list" ref={listRef} aria-label="Parts">
            {parts.length === 0 &&
              Array.from({ length: 8 }, (_, i) => (
                <li key={`sk-${i}`} aria-hidden="true">
                  <span className="row-main" style={{ background: 'var(--inset)', height: 44, width: '100%' }} />
                </li>
              ))}
            {parts.length > 0 &&
              entries.map(({ i, p }) => {
              const role = roleOf(parts, i);
              return (
                <li
                  key={i}
                  data-idx={i}
                  className={hidden.has(i) ? 'hidden-row' : ''}
                  style={{ padding: 0 }}
                >
                  <button
                    type="button"
                    aria-pressed={selected === i}
                    aria-label={`Select part ${i}, ${role}`}
                    onClick={() => setSelected(selected === i ? null : i)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
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
                      style={{ background: ROLE_CSS[role as keyof typeof ROLE_CSS] ?? '#999' }}
                      aria-hidden="true"
                    />
                    <span className="row-main">
                      <b>#{i} {p?.name ?? role}</b>
                      <span>{p ? partLabel(p, i) : `${model.solids} solids (manifest loading…)`}</span>
                    </span>
                  </button>
                  <button
                    className="eye"
                    aria-label={hidden.has(i) ? `Show part ${i}` : `Hide part ${i}`}
                    aria-pressed={hidden.has(i)}
                    disabled={!!p?.dropped_from_glb}
                    title={p?.dropped_from_glb ? 'Stats-only part has no viewer mesh' : undefined}
                    onClick={() => toggleHide(i)}
                    style={{ marginRight: 12 }}
                  >
                    {hidden.has(i) ? '＋' : '−'}
                  </button>
                </li>
              );
              })}
            {parts.length > 0 && entries.length === 0 && (
              <li>
                <span className="row-main">
                  <b>No parts match “{query}”</b>
                  <span>Clear the search or role filter.</span>
                </span>
                <button
                  className="mini"
                  onClick={() => {
                    setQuery('');
                    setRoleFilter('all');
                  }}
                >
                  Clear filters
                </button>
              </li>
            )}
          </ul>
          <div className="readout" aria-live="polite">
            {sel !== null && selected !== null ? (
              <>
                <b>{sel.name ?? `Part #${selected}`}</b>{' '}
                <span className="stamp todo">{model.accessory ? 'Fit-test prototype' : `${sel.role} · heuristic`}</span>{' '}
                {sel.dropped_from_glb && <span className="stamp todo">stats only</span>}
                <dl>
                  <dt>Volume</dt>
                  <dd>{sel.vol_cm3} cm³</dd>
                  <dt>{model.accessory ? 'Print mass' : 'Estimated mass'}</dt>
                  <dd>{massLabel(sel.role, sel.vol_cm3)}</dd>
                  <dt>BBox</dt>
                  <dd>{sel.bbox_mm.map((d) => d.toFixed(1)).join(' × ')} mm</dd>
                  <dt>CAD faces</dt>
                  <dd>{sel.faces}</dd>
                  <dt>Node</dt>
                  <dd>{sel.node}</dd>
                </dl>
                <div className="btn-row" style={{ margin: '8px 0 0' }}>
                  <button className="mini" onClick={() => { setFocusIdx(selected); setHomeKey((k) => k + 1); }} disabled={!!sel.dropped_from_glb}>Focus</button>
                  <button className="mini" onClick={() => selected !== null && isolatePart(selected)} disabled={selected !== null && !!parts[selected]?.dropped_from_glb} title={selected !== null && parts[selected]?.dropped_from_glb ? 'Stats-only part has no viewer mesh' : undefined}>
                    Isolate
                  </button>
                  <button
                    className="mini"
                    onClick={() => toggleHide(selected)}
                    disabled={selected !== null && !!parts[selected]?.dropped_from_glb}
                    title={selected !== null && parts[selected]?.dropped_from_glb ? 'Stats-only part has no viewer mesh' : undefined}
                  >
                    {selected !== null && hidden.has(selected) ? 'Show' : 'Hide'}
                  </button>
                  <button className="mini" onClick={() => setSelected(null)}>
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <span className="meta">Select a part in the model or list for dims and volume.</span>
            )}
          </div>
        </div>
      </div>

      {/* Key Part Inspection Showcase Section */}
      <section className="key-parts-showcase" style={{ marginTop: '48px', borderTop: '1px solid var(--cyber-border)', paddingTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '22px', color: 'var(--neon-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="cyber-dot" /> CRITICAL COMBAT SUBASSEMBLIES &amp; PART INSPECTION
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--cyber-text-muted)' }}>
              Detailed engineering analysis for chassis, titanium traction cleats, brushless hubmotors, and AR500 teeth
            </span>
          </div>
          <Link to="/lab" className="cyber-btn primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
            SPIN TEST IN LAB ↗
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* 1. Main Combat Chassis */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge">CHASSIS CORE</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>Main Combat Chassis Puck</h3>
              </div>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => { selectModel('full'); setExplode(0.35); }}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Elastomeric unibody puck housing twin PropDrive motors, dual 4S batteries, and Teensy flight controller.
              Clamped between 3.5mm top/bottom armor plates via 16× M3 12.9 grade bolts.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Bambu TPU 95A HF / PA6-CF</div>
              <div><strong>Mass:</strong> ~180 g (90% Gyroid)</div>
              <div><strong>Diameter:</strong> Ø140.0 mm OD</div>
              <div><strong>Hardware:</strong> 16× M3×35mm (Loctite 243)</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="stl/eyeliner_combat_v01-chassis.stl" download>
                DOWNLOAD STL (4.1 MB)
              </a>
            </div>
          </div>

          {/* 2. Titanium Cleat Wheels */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge amber">TRACTION SYSTEM</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>Titanium Cleat Wheels</h3>
              </div>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => selectModel('pod')}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              6-disc symmetric star cleat stack with 1.55 in OD. Waterjet cut from Grade 5 titanium annealed sheet.
              Delivers &gt;1.5 friction coefficient on wood floors to achieve aggressive translation while spinning at 3,500 RPM.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Ti-6Al-4V Annealed (0.040")</div>
              <div><strong>Mass:</strong> 14.2 g / wheel assembly</div>
              <div><strong>Tire OD:</strong> 1.55 in (39.4 mm)</div>
              <div><strong>Traction μ:</strong> &gt;1.5 Wood / 0.35 Steel</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="stl/titanium_cleat_disc_1.55in.stl" download>
                DOWNLOAD STL (1.3 MB)
              </a>
            </div>
          </div>

          {/* 3. PropDrive v2 2836 1200KV Motors */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge green">DRIVE MOTORS</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>PropDrive v2 2836 1200KV</h3>
              </div>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => selectModel('pod')}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Dual 12-pole brushless outrunner hubmotors converted with 6mm hardened dead-axles and dual 626 high-speed bearings.
              Driven by 55A AM32 ESC running bidirectional DShot600 at 8 kHz.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>KV Rating:</strong> 1200 KV (4S LiPo: 16.8V)</div>
              <div><strong>Mass:</strong> 82 g each (164 g pair)</div>
              <div><strong>Peak Current:</strong> 48 A / motor</div>
              <div><strong>Shaft:</strong> 6 mm precision ground axle</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <Link to="/bom" className="cyber-btn" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }}>
                VIEW IN BOM ($44 PAIR)
              </Link>
            </div>
          </div>

          {/* 4. AR500 Hardened Kinetic Impact Teeth */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-crimson)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge crimson">KINETIC WEAPON</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>AR500 Hardened Weapon Teeth</h3>
              </div>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => selectModel('teeth')}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Symmetric 2-tooth strike geometry. Delivers 1,200 Joules of kinetic energy at 3,500 RPM.
              Optionally swappable for Ti-6Al-4V teeth to save 191 g for heavy top armor configs.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Hardened AR500 (500 HBW)</div>
              <div><strong>Mass:</strong> 437 g pair steel / 246 g Ti</div>
              <div><strong>Kinetic Energy:</strong> ~1.2 kJ @ 3,500 RPM</div>
              <div><strong>Tip Speed:</strong> 88 MPH @ 3,500 RPM</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="cad/standard-weapon-teeth.stl" download>
                DOWNLOAD STL (2.0 MB)
              </a>
            </div>
          </div>

          {/* 5. Dual H3LIS331DLTR ±400g Sensor Mount */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge">KINEMATICS</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>Dual Accel Rigid Mount</h3>
              </div>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => selectModel('accel-mount')}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Two-piece precision clamping bracket holding dual H3LIS331DLTR sensors opposed at 50 mm baseline (25 mm radius).
              Zero sensor plane flexure under 400g centripetal load.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Bambu PETG HF / PETG-CF</div>
              <div><strong>Radius:</strong> R1 = 25 mm, R2 = 25 mm</div>
              <div><strong>Full Scale:</strong> +/-400g (12-bit SPI)</div>
              <div><strong>Bandwidth:</strong> 1 kHz ODR (Zero Aliasing)</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="accessories/dual-accel-mount.stl" download>
                DOWNLOAD STL (689 KB)
              </a>
            </div>
          </div>

          {/* 6. TPU Dual 4S LiPo Shock Cradle */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge amber">ENERGY STORAGE</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>TPU Battery Cradle</h3>
              </div>
              <button
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => selectModel('battery-cradle')}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Viscoelastic energy-absorbing tray containing dual 4S 550mAh 95C Tattu R-Line LiPo packs in parallel.
              Protects pouch cells against 100g arena rebound shocks.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Bambu TPU 95A HF</div>
              <div><strong>Capacity:</strong> 4S 1100mAh Total (95C)</div>
              <div><strong>Mass:</strong> 26.5 g printed tray</div>
              <div><strong>Connectors:</strong> XT30 Parallel Harness</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="accessories/tpu-battery-cradle.stl" download>
                DOWNLOAD STL (295 KB)
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}

for (const m of cadModels) {
  useGLTF.preload(m.glb);
}
