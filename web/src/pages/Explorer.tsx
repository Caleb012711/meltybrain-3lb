import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { cadHref, cadModels } from '../data/content';
import { usePrefersReducedMotion } from '../hooks/hooks';
import { ExplodingModel, GlErrorBoundary, useModelParts, type ColorMode } from '../components/CadViewer';
import { ROLE_CSS, ROLE_LABELS, massLabel, partLabel, type PartInfo } from '../components/materials';
import { Reveal } from '../components/Layout';

function roleOf(parts: PartInfo[], i: number): string {
  return parts[i]?.role ?? 'fastener-dark';
}

export function Explorer() {
  const reduced = usePrefersReducedMotion();
  const [modelId, setModelId] = useState('full');
  const [explode, setExplode] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [xray, setXray] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('role');
  const [spin, setSpin] = useState(!reduced);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [isolated, setIsolated] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [failed, setFailed] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const parts = useModelParts(modelId);
  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];

  useEffect(() => {
    setSelected(null);
    setHidden(new Set());
    setIsolated(null);
    setQuery('');
    setRoleFilter('all');
    setFailed(false);
  }, [modelId]);

  useEffect(() => {
    if (reduced) setSpin(false);
  }, [reduced]);

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
    const list: { i: number; p: PartInfo | null }[] = [];
    for (let i = 0; i < count; i++) {
      const p = parts[i] ?? null;
      if (roleFilter !== 'all' && roleOf(parts, i) !== roleFilter) continue;
      if (query) {
        const hay = `${i} ${p?.role ?? ''} ${p?.bbox_mm.join('x') ?? ''} ${p?.vol_cm3 ?? ''}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) continue;
      }
      list.push({ i, p });
    }
    return list;
  }, [count, parts, query, roleFilter]);

  const rolesPresent = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < count; i++) s.add(roleOf(parts, i));
    return Array.from(s);
  }, [count, parts]);

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
    setHidden(new Set());
    setIsolated(null);
    setExplode(0);
    setWireframe(false);
    setXray(false);
    setQuery('');
    setRoleFilter('all');
  };

  const sel = selected !== null ? parts[selected] ?? null : null;

  return (
    <div className="page explorer-page">
      <p className="spec-plate">
        <span>EYELINER-3LB / REV9 / SHEET EX-01</span>
        <span>Explorer — part level</span>
      </p>
      <h1>3D explorer</h1>
      <p className="lede">
        Every solid in the real assemblies, auto-colored by material role from measured
        volume and bounding box. Click a part in the model or the list to inspect it,
        isolate it, or hide it. Roles are a size heuristic — the ring, teeth, plates,
        and shell check out; tiny hardware all reads as fasteners.
      </p>

      <div className="explorer-grid">
        <div>
          <div className="viewer">
            <div style={{ position: 'relative' }}>
              {failed ? (
                <div className="viewer-fallback">
                  <img src="eyeliner_summer_2025_render.webp" alt="Overhead render of the Eyeliner 3lb meltybrain" loading="lazy" decoding="async" />
                </div>
              ) : (
                <GlErrorBoundary onFail={() => setFailed(true)}>
                <Canvas
                  camera={{ position: [4.4, 3.1, 5.4], fov: 42 }}
                  dpr={[1, 1.5]}
                  onCreated={({ gl }) => gl.setClearColor('#ffffff')}
                  role="img"
                  aria-label={`3D explorer, ${model.label}, ${count} parts`}
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
                      selected={selected}
                      hovered={hovered}
                      hidden={hidden}
                      isolated={isolated}
                      onSelect={setSelected}
                      onHover={setHovered}
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
            <p className="status" role="status">
              {model.label} · {count} parts{parts.length > 0 && <> ({meshed} meshed, {count - meshed} thread specks stats-only)</>} · {meshed - hidden.size} meshed visible
              {isolated !== null && <> · isolated #{isolated} — <button className="mini" onClick={() => setIsolated(null)}>Exit isolate</button></>}
              {hovered !== null && <> · hover #{hovered}</>}
            </p>
            <div className="legend" aria-label="Heuristic material roles, verify in CAD">
              <span className="meta" style={{ width: '100%' }}>
                Heuristic roles from size — verify alloy in CAD, not measured:
              </span>
              {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => (
                <span key={r}>
                  <span className="role-dot" style={{ background: ROLE_CSS[r] }} aria-hidden="true" />
                  {ROLE_LABELS[r]}
                </span>
              ))}
            </div>
          </div>

          <Reveal>
            <div className="step" style={{ marginTop: 12 }}>
              <h3>Direct downloads — {model.label}</h3>
              <p className="path">
                <b>cad/</b>
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
              </div>
              <p className="meta">
                STEP is the source — open it in Onshape, export single bodies, then order.
                STL here is assembly reference only, not print-ready; print STLs come from{' '}
                <Link to="/printing">your own exports</Link>.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="part-panel">
          <header>
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
                style={{ minHeight: 40, flex: 1 }}
              >
                <option value="all">All roles ({count})</option>
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
                      <b>#{i} {role}</b>
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
                <b>Part #{selected}</b>{' '}
                <span className="stamp todo">{sel.role} · heuristic</span>{' '}
                {sel.dropped_from_glb && <span className="stamp todo">stats only</span>}
                <dl>
                  <dt>Volume</dt>
                  <dd>{sel.vol_cm3} cm³</dd>
                  <dt>Mass</dt>
                  <dd>{massLabel(sel.role, sel.vol_cm3)}</dd>
                  <dt>BBox</dt>
                  <dd>{sel.bbox_mm.map((d) => d.toFixed(1)).join(' × ')} mm</dd>
                  <dt>CAD faces</dt>
                  <dd>{sel.faces}</dd>
                  <dt>Node</dt>
                  <dd>{sel.node}</dd>
                </dl>
                <div className="btn-row" style={{ margin: '8px 0 0' }}>
                  <button className="mini" onClick={() => selected !== null && isolatePart(selected)} disabled={selected !== null && !!parts[selected]?.dropped_from_glb} title={selected !== null && parts[selected]?.dropped_from_glb ? 'Stats-only part has no viewer mesh' : undefined}>
                    Isolate
                  </button>
                  <button className="mini" onClick={() => toggleHide(selected)}>
                    {hidden.has(selected) ? 'Show' : 'Hide'}
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
    </div>
  );
}

export function preloadExplorer() {
  for (const m of cadModels) useGLTF.preload(m.glb);
}
