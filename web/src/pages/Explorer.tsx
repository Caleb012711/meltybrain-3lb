import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import {
  REV5_PARTS,
  CAMERA_PRESETS,
  Rev5Model,
  CameraPresetRig,
  SpinUpGroup,
  STUDIO_LIGHTING_PRESETS,
  Rev5StudioLighting,
  CINEMATIC_TRACKS,
  Rev5CinematicDirector,
  Rev5VideoModal,
  type CameraPreset,
  type StudioLightingPreset,
  type CinematicTrackId,
  type VideoRecordingResult,
} from '../components/Rev5Showcase';
import './Explorer.css';

function roleOf(parts: PartInfo[], i: number): string {
  return parts[i]?.role ?? 'fastener-dark';
}

export function Explorer() {
  const reduced = usePrefersReducedMotion();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedModel = searchParams.get('model');
  
  // Default to Rev 5 3D Model Showcase
  const isRev5 = requestedModel === 'rev5' || !requestedModel;
  const modelId = isRev5 ? 'rev5' : cadModels.some((m) => m.id === requestedModel) ? requestedModel! : 'rev5';

  // Rev 5 States
  const [rev5Explode, setRev5Explode] = useState(0);
  const [rev5Wireframe, setRev5Wireframe] = useState(false);
  const [rev5Xray, setRev5Xray] = useState(false);
  const [rev5Spin, setRev5Spin] = useState(false);
  const [rev5Rpm, setRev5Rpm] = useState(0);
  const [rev5SelectedId, setRev5SelectedId] = useState<string | null>(null);
  const [rev5HoveredId, setRev5HoveredId] = useState<string | null>(null);
  const [rev5IsolatedId, setRev5IsolatedId] = useState<string | null>(null);
  const [rev5ActivePreset, setRev5ActivePreset] = useState<CameraPreset | null>('isometric');
  const [rev5SubsystemFilter, setRev5SubsystemFilter] = useState('all');
  const [rev5Query, setRev5Query] = useState('');

  // Dynamic Studio Lighting & 3D Video Turntable States
  const [studioLighting, setStudioLighting] = useState<StudioLightingPreset>('combatArena');
  const [selectedCinematicTrack, setSelectedCinematicTrack] = useState<CinematicTrackId>('orbit360');
  const [isRecording, setIsRecording] = useState(false);
  const [isCinematicPreviewing, setIsCinematicPreviewing] = useState(false);
  const [cinematicProgress, setCinematicProgress] = useState(0);
  const [cinematicElapsed, setCinematicElapsed] = useState(0);
  const [cinematicDuration, setCinematicDuration] = useState(6.5);
  const [forcedCinematicRpm, setForcedCinematicRpm] = useState<number | undefined>(undefined);
  const [recordedVideo, setRecordedVideo] = useState<VideoRecordingResult | null>(null);

  // Camera animation target for Rev 5
  const [camTargetPos, setCamTargetPos] = useState<[number, number, number] | null>(CAMERA_PRESETS.isometric.pos);
  const [camTargetLookAt, setCamTargetLookAt] = useState<[number, number, number] | null>(CAMERA_PRESETS.isometric.target);
  const [isCamAnimating, setIsCamAnimating] = useState(false);

  // Legacy GLB Explorer States
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
  const [isolated, setIsIsolated] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [failed, setFailed] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  const parts = useModelParts(modelId === 'rev5' ? 'full' : modelId);
  const model = cadModels.find((m) => m.id === modelId) ?? cadModels[0];

  const selectModel = (id: string) => {
    setSearchParams({ model: id });
  };

  // Reset Rev 5 state when switching models
  useEffect(() => {
    if (isRev5) {
      setRev5Explode(0);
      setRev5SelectedId(null);
      setRev5HoveredId(null);
      setRev5IsolatedId(null);
      setRev5ActivePreset('isometric');
      setCamTargetPos(CAMERA_PRESETS.isometric.pos);
      setCamTargetLookAt(CAMERA_PRESETS.isometric.target);
      setIsCamAnimating(true);
      setRev5Spin(false);
      setRev5Rpm(0);
      setIsRecording(false);
      setIsCinematicPreviewing(false);
      setForcedCinematicRpm(undefined);
    } else {
      setSelected(null);
      setHovered(null);
      setFocusIdx(null);
      setHomeKey((k) => k + 1);
      setHidden(new Set());
      setIsIsolated(null);
      setQuery('');
      setRoleFilter('all');
      setFailed(false);
      setExplode(modelId === 'bench-case' ? 0.45 : 0);
      if (modelId === 'bench-case') setSpin(false);
    }
  }, [modelId, isRev5]);

  // Handle Rev 5 Camera Preset Selection
  const applyPreset = useCallback((presetKey: CameraPreset) => {
    const preset = CAMERA_PRESETS[presetKey];
    setRev5ActivePreset(presetKey);
    setCamTargetPos(preset.pos);
    setCamTargetLookAt(preset.target);
    setIsCamAnimating(true);
    setIsCinematicPreviewing(false);
    setIsRecording(false);
    setForcedCinematicRpm(undefined);

    if (preset.explode !== undefined) {
      setRev5Explode(preset.explode);
    }
  }, []);

  // Handle Automated 3D Video Turntable Recording & Cinematic Tracks
  const handleStartRecording = useCallback((trackId: CinematicTrackId) => {
    setSelectedCinematicTrack(trackId);
    setIsCinematicPreviewing(false);
    setIsCamAnimating(false);
    setRev5ActivePreset(null);
    setCinematicProgress(0);
    setCinematicElapsed(0);
    setIsRecording(true);
  }, []);

  const handleStartCinematicPreview = useCallback((trackId: CinematicTrackId) => {
    setSelectedCinematicTrack(trackId);
    setIsRecording(false);
    setIsCamAnimating(false);
    setRev5ActivePreset(null);
    setCinematicProgress(0);
    setCinematicElapsed(0);
    setIsCinematicPreviewing(true);
  }, []);

  const handleStopCinematic = useCallback(() => {
    setIsRecording(false);
    setIsCinematicPreviewing(false);
    setForcedCinematicRpm(undefined);
  }, []);

  // Handle Rev 5 Part Selection with Camera Focus
  const handleSelectRev5Part = useCallback((id: string | null) => {
    setRev5SelectedId(id);
    if (!id) return;

    const part = REV5_PARTS.find((p) => p.id === id);
    if (part) {
      setCamTargetPos(part.focusCameraPos);
      setCamTargetLookAt(part.focusTarget);
      setIsCamAnimating(true);
      setRev5ActivePreset(null);
    }
  }, []);

  // Filtered Rev 5 Parts
  const filteredRev5Parts = useMemo(() => {
    return REV5_PARTS.filter((part) => {
      if (rev5SubsystemFilter !== 'all' && part.subsystem !== rev5SubsystemFilter) return false;
      if (rev5Query.trim()) {
        const queryLower = rev5Query.toLowerCase();
        const hay = `${part.name} ${part.subsystem} ${part.material} ${part.fasteners}`.toLowerCase();
        if (!hay.includes(queryLower)) return false;
      }
      return true;
    });
  }, [rev5SubsystemFilter, rev5Query]);

  const rev5Subsystems = useMemo(() => {
    const set = new Set<string>();
    REV5_PARTS.forEach((p) => set.add(p.subsystem));
    return Array.from(set);
  }, []);

  const selectedRev5Spec = useMemo(() => {
    return REV5_PARTS.find((p) => p.id === rev5SelectedId) ?? null;
  }, [rev5SelectedId]);

  // Legacy GLB parts list memo
  const count = parts.length > 0 ? parts.length : model.solids;

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
    setIsIsolated(i);
  };

  const resetLegacy = () => {
    setSelected(null);
    setHovered(null);
    setFocusIdx(null);
    setHomeKey((k) => k + 1);
    setHidden(new Set());
    setIsIsolated(null);
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
        <span>EYELINER / 3D CAD EXPLORER</span>
        <span>{isRev5 ? 'Rev 5 Combat Assembly — Authentic STLs' : 'Source CAD — Part Level'}</span>
      </p>
      <h1>3D Explorer</h1>
      <p className="lede">
        Inspect the full mechanical stack of Eyeliner Rev 5. Explore authentic combat STLs, slide through
        the 3D exploded view, examine engineering tolerances, and download manufacturing assets directly.
      </p>

      <div className="explorer-grid">
        <div>
          <div className="viewer">
            <div className="model-caption">
              <div>
                <span className="model-eyebrow">
                  {isRev5 ? 'Full Rev 5 Combat Robot' : model.accessory ? 'Accessory prototype' : 'Source CAD assembly'}
                </span>
                <strong>{isRev5 ? 'Rev 5 Interactive Assembly (Authentic STLs)' : model.label}</strong>
              </div>
              <span className="model-provenance">
                {isRev5 ? '12 authentic combat STLs · 690g core stack' : model.glb.split('/').pop()}
              </span>
            </div>

            <div className="explorer-canvas" style={{ position: 'relative' }}>
              {isRev5 ? (
                <>
                  {/* Live Recording & Turntable Progress HUD Overlay */}
                  {isRecording && (
                    <div className="rev5-recording-hud" role="status" aria-live="assertive">
                      <div className="rev5-recording-header">
                        <div className="rev5-rec-badge">
                          <span className="rec-pulse-dot" />
                          <span>REC 60 FPS WEBGL</span>
                        </div>
                        <span className="rev5-recording-title">
                          {CINEMATIC_TRACKS[selectedCinematicTrack].name} · {STUDIO_LIGHTING_PRESETS[studioLighting].name}
                        </span>
                        <button
                          type="button"
                          className="mini"
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            background: 'rgba(255, 23, 68, 0.25)',
                            borderColor: '#ff1744',
                            color: '#ff1744',
                          }}
                          onClick={handleStopCinematic}
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="rev5-recording-bar-container">
                        <div
                          className="rev5-recording-bar-fill"
                          style={{ width: `${cinematicProgress}%` }}
                        />
                      </div>
                      <div className="rev5-recording-footer">
                        <span>Direct Canvas Stream (60 FPS) · MediaRecorder</span>
                        <span className="rev5-recording-timer">
                          {cinematicProgress}% · {cinematicElapsed.toFixed(1)}s / {cinematicDuration.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cinematic Preview HUD Overlay */}
                  {isCinematicPreviewing && (
                    <div className="rev5-recording-hud preview" role="status">
                      <div className="rev5-recording-header">
                        <div className="rev5-rec-badge preview">
                          <span className="cyber-dot" style={{ background: 'var(--accent-graphic)' }} />
                          <span>PREVIEWING CAMERA TRACK</span>
                        </div>
                        <span className="rev5-recording-title">
                          {CINEMATIC_TRACKS[selectedCinematicTrack].name}
                        </span>
                        <button
                          type="button"
                          className="mini"
                          onClick={handleStopCinematic}
                        >
                          Stop
                        </button>
                      </div>
                      <div className="rev5-recording-bar-container">
                        <div
                          className="rev5-recording-bar-fill"
                          style={{ width: `${cinematicProgress}%`, background: 'var(--accent-graphic)' }}
                        />
                      </div>
                      <div className="rev5-recording-footer">
                        <span>Automated Cinematic Trajectory</span>
                        <span className="rev5-recording-timer">
                          {cinematicProgress}% · {cinematicElapsed.toFixed(1)}s / {cinematicDuration.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Live Spin Up Telemetry HUD Overlay */}
                  <div className="rev5-hud-overlay" style={{ top: isRecording || isCinematicPreviewing ? 74 : 14 }}>
                    <div className="rev5-hud-badge">
                      <span className="cyber-dot" style={{ background: rev5Spin ? '#00ff66' : 'var(--accent-graphic)' }} />
                      <span>SPIN VELOCITY:</span>
                      <span className="rpm-val">{rev5Rpm.toLocaleString()} RPM</span>
                      {rev5Spin && (
                        <span style={{ color: '#00ff66', fontSize: '10px' }}>
                          (~{Math.round((rev5Rpm / 3500) * 88)} MPH TIP)
                        </span>
                      )}
                    </div>
                    {rev5IsolatedId && (
                      <div className="rev5-hud-badge" style={{ borderColor: 'var(--neon-amber)' }}>
                        <span style={{ color: 'var(--neon-amber)' }}>ISOLATING:</span>
                        <span>{REV5_PARTS.find((p) => p.id === rev5IsolatedId)?.name}</span>
                        <button
                          type="button"
                          className="mini"
                          style={{ padding: '2px 6px', fontSize: '10px', marginLeft: 6 }}
                          onClick={() => setRev5IsolatedId(null)}
                        >
                          Show All
                        </button>
                      </div>
                    )}
                  </div>

                  <GlErrorBoundary onFail={() => setFailed(true)}>
                    <Canvas
                      camera={{ position: [140, 110, 150], fov: 42 }}
                      dpr={[1, 1.5]}
                      style={{ cursor: rev5HoveredId !== null ? 'pointer' : 'grab' }}
                      onPointerMissed={() => handleSelectRev5Part(null)}
                      onCreated={({ gl }) => {
                        gl.toneMapping = THREE.NeutralToneMapping;
                        gl.toneMappingExposure = 1.15;
                        gl.outputColorSpace = THREE.SRGBColorSpace;
                        gl.setClearColor('#000000', 0);
                      }}
                      role="img"
                      aria-label="Rev 5 3D Model Showcase"
                    >
                      <color attach="background" args={[STUDIO_LIGHTING_PRESETS[studioLighting].bgColor]} />
                      
                      {/* Dynamic Studio Lighting Rig */}
                      <Rev5StudioLighting presetId={studioLighting} />

                      {/* Ground Plane Grid with Studio Preset Tinting */}
                      <gridHelper
                        args={[
                          360,
                          36,
                          STUDIO_LIGHTING_PRESETS[studioLighting].gridColors[0],
                          STUDIO_LIGHTING_PRESETS[studioLighting].gridColors[1],
                        ]}
                        position={[0, -55, 0]}
                      />

                      <Suspense fallback={null}>
                        <SpinUpGroup
                          spinUp={rev5Spin && !reduced}
                          forcedRpm={forcedCinematicRpm}
                          onRpmUpdate={setRev5Rpm}
                        >
                          <Rev5Model
                            explode={rev5Explode}
                            wireframe={rev5Wireframe}
                            xray={rev5Xray}
                            selectedId={rev5SelectedId}
                            hoveredId={rev5HoveredId}
                            isolatedId={rev5IsolatedId}
                            onSelect={handleSelectRev5Part}
                            onHover={setRev5HoveredId}
                          />
                        </SpinUpGroup>
                      </Suspense>

                      <CameraPresetRig
                        targetPos={camTargetPos}
                        targetLookAt={camTargetLookAt}
                        isAnimating={isCamAnimating}
                        onAnimationEnd={() => setIsCamAnimating(false)}
                      />

                      {(isRecording || isCinematicPreviewing) && (
                        <Rev5CinematicDirector
                          activeTrack={selectedCinematicTrack}
                          presetId={studioLighting}
                          isRunning={isRecording || isCinematicPreviewing}
                          isRecording={isRecording}
                          onProgress={(pct, elapsed, total) => {
                            setCinematicProgress(pct);
                            setCinematicElapsed(elapsed);
                            setCinematicDuration(total);
                          }}
                          onExplodeUpdate={(exp) => setRev5Explode(exp)}
                          onSpinUpdate={(spinActive, rpm) => {
                            setRev5Spin(spinActive);
                            setForcedCinematicRpm(rpm);
                          }}
                          onComplete={(result) => {
                            setIsRecording(false);
                            setIsCinematicPreviewing(false);
                            setForcedCinematicRpm(undefined);
                            if (result) {
                              setRecordedVideo(result);
                            }
                          }}
                        />
                      )}

                      <OrbitControls
                        enableDamping
                        dampingFactor={0.05}
                        makeDefault
                        minDistance={35}
                        maxDistance={500}
                        zoomToCursor
                        enabled={!isRecording && !isCinematicPreviewing}
                        onStart={() => {
                          setIsCamAnimating(false);
                          setRev5ActivePreset(null);
                        }}
                      />
                    </Canvas>
                  </GlErrorBoundary>
                </>
              ) : failed ? (
                <div className="viewer-fallback">
                  <p role="status">Interactive 3D is unavailable for this CAD file. You can still inspect the parts and download source files.</p>
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
                    <gridHelper
                      args={[12, 24, theme === 'dark' ? '#4a4842' : '#c9c5ba', theme === 'dark' ? '#2b2b28' : '#e2ded4']}
                      position={[0, model.accessory ? -0.9 : -0.62, 0]}
                    />
                    <Suspense fallback={null}>
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
                    />
                  </Canvas>
                </GlErrorBoundary>
              )}
            </div>

            {/* Viewer Controls Toolbar */}
            <div className="viewer-bar" role="toolbar" aria-label="Explorer controls">
              <div className="rev5-controls-cluster">
                {/* Model Selector Tabs */}
                <div className="tabs" role="radiogroup" aria-label="CAD Model Selection">
                  <button
                    className="tab"
                    role="radio"
                    aria-checked={isRev5}
                    aria-pressed={isRev5}
                    onClick={() => selectModel('rev5')}
                    style={{ fontWeight: isRev5 ? 600 : 400 }}
                  >
                    ⚡ Rev 5 Interactive STLs
                  </button>
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

                {/* Rev 5 Specific Camera Presets & Exploded Slider */}
                {isRev5 ? (
                  <>
                    {/* Dynamic Studio Lighting Presets */}
                    <div className="rev5-lighting-bar">
                      <span className="rev5-presets-label">Studio Lighting:</span>
                      {(Object.keys(STUDIO_LIGHTING_PRESETS) as StudioLightingPreset[]).map((key) => {
                        const preset = STUDIO_LIGHTING_PRESETS[key];
                        const isActive = studioLighting === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`rev5-lighting-btn ${isActive ? 'active' : ''}`}
                            onClick={() => setStudioLighting(key)}
                            title={preset.description}
                          >
                            <span className="preset-dot" style={{ background: preset.dotColor }} />
                            <span>{preset.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* 3D Turntable Video Generator & Cinematic Showcase Suite */}
                    <div className="rev5-cinematic-bar">
                      <div className="rev5-cinematic-selector">
                        <span className="rev5-presets-label">Cinematic Reel:</span>
                        <div className="rev5-reel-chips">
                          {(Object.keys(CINEMATIC_TRACKS) as CinematicTrackId[]).map((key) => {
                            const track = CINEMATIC_TRACKS[key];
                            const isSel = selectedCinematicTrack === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                className={`rev5-reel-btn ${isSel ? 'active' : ''}`}
                                onClick={() => setSelectedCinematicTrack(key)}
                                title={track.description}
                              >
                                {track.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rev5-cinematic-actions">
                        <button
                          type="button"
                          className="rev5-preview-btn"
                          onClick={() => handleStartCinematicPreview(selectedCinematicTrack)}
                          disabled={isRecording || isCinematicPreviewing}
                          title="Preview camera track trajectory without recording"
                        >
                          {isCinematicPreviewing ? '⏹ Stop' : '▶ Preview Track'}
                        </button>
                        <button
                          type="button"
                          className="rev5-record-cta"
                          onClick={() => handleStartRecording(selectedCinematicTrack)}
                          disabled={isRecording}
                          title="Record 60 FPS WebGL stream using MediaRecorder"
                        >
                          <span className="record-circle" />
                          <span>{isRecording ? 'RECORDING 60 FPS…' : '🎬 RECORD 3D VIDEO'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="rev5-presets-bar">
                      <span className="rev5-presets-label">Camera Presets:</span>
                      {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => {
                        const preset = CAMERA_PRESETS[key];
                        const isActive = rev5ActivePreset === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`rev5-preset-btn ${isActive ? 'active' : ''}`}
                            onClick={() => applyPreset(key)}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="rev5-sliders-row">
                      {/* Exploded View Slider */}
                      <div className="rev5-slider-block">
                        <label className="rev5-slider-label" htmlFor="rev5-explode-slider">
                          Exploded View <span className="rev5-slider-val">{Math.round(rev5Explode * 100)}%</span>
                        </label>
                        <input
                          id="rev5-explode-slider"
                          type="range"
                          className="rev5-slider-input"
                          min={0}
                          max={1}
                          step={0.01}
                          value={rev5Explode}
                          onChange={(e) => {
                            setRev5Explode(Number(e.target.value));
                            setRev5ActivePreset(null);
                          }}
                          aria-label="Rev 5 Exploded View Slider"
                        />
                      </div>

                      {/* Display Mode & Spin Up Toggles */}
                      <div className="rev5-action-toggles">
                        <button
                          type="button"
                          className={`rev5-spin-btn ${rev5Spin ? 'active' : ''}`}
                          onClick={() => setRev5Spin((v) => !v)}
                          disabled={reduced}
                          title={reduced ? 'Reduced motion preference active' : 'Simulate 3500 RPM spin-up with optical heading beacon'}
                        >
                          <span className="rev5-spin-dot" />
                          {rev5Spin ? 'Spinning (3,500 RPM)' : 'Spin Up'}
                        </button>
                        <button
                          type="button"
                          className="mini"
                          aria-pressed={rev5Xray}
                          onClick={() => {
                            setRev5Xray((v) => !v);
                            if (!rev5Xray) setRev5Wireframe(false);
                          }}
                        >
                          X-ray
                        </button>
                        <button
                          type="button"
                          className="mini"
                          aria-pressed={rev5Wireframe}
                          onClick={() => {
                            setRev5Wireframe((v) => !v);
                            if (!rev5Wireframe) setRev5Xray(false);
                          }}
                        >
                          Wireframe
                        </button>
                        <button
                          type="button"
                          className="mini"
                          onClick={() => {
                            setRev5Explode(0);
                            setRev5Wireframe(false);
                            setRev5Xray(false);
                            setRev5Spin(false);
                            setRev5SelectedId(null);
                            setRev5IsolatedId(null);
                            applyPreset('isometric');
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Legacy GLB controls */
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <button className="mini" aria-pressed={xray} onClick={() => setXray((v) => !v)}>
                      X-ray
                    </button>
                    <button className="mini" aria-pressed={wireframe} onClick={() => setWireframe((v) => !v)}>
                      Wireframe
                    </button>
                    <button className="mini" aria-pressed={spin} onClick={() => setSpin((v) => !v)}>
                      {spin ? 'Pause spin' : 'Spin'}
                    </button>
                    <button className="mini" onClick={resetLegacy}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="model-interaction-note">
              Drag to orbit · Scroll to zoom · Click any component in 3D or the parts panel to inspect engineering specs
            </p>
          </div>

          {/* Direct Downloads Card */}
          <Reveal>
            <div className="step" style={{ marginTop: 12 }}>
              <h2>Direct Downloads — {isRev5 ? 'Rev 5 Combat Assembly' : model.label}</h2>
              <p className="path">
                <b>stl</b>
                <i>/</i>
                {isRev5 ? '12 authentic manufacturing STLs' : model.step.split('/').pop()}
              </p>
              <div className="btn-row" style={{ flexWrap: 'wrap' }}>
                {isRev5 ? (
                  <>
                    <a className="btn primary" href="stl/eyeliner_chassis_puck.stl" download>
                      Chassis Puck STL (5.4 MB)
                    </a>
                    <a className="btn" href="stl/eyeliner_top_plate.stl" download>
                      Top Armor Plate STL (5.1 MB)
                    </a>
                    <a className="btn" href="stl/eyeliner_bottom_plate.stl" download>
                      Bottom Armor Plate STL (4.6 MB)
                    </a>
                    <a className="btn" href="stl/eyeliner_wheel_cleat_left.stl" download>
                      Titanium Cleat STL (558 KB)
                    </a>
                    <a className="btn" href="stl/eyeliner_lidar_mount.stl" download>
                      LiDAR Mount STL (706 KB)
                    </a>
                  </>
                ) : (
                  <>
                    <a className="btn primary" href={cadHref(model.step)} download>
                      STEP {model.stepSize}
                    </a>
                    <a className="btn" href={cadHref(model.glb)} download>
                      GLB (viewer mesh)
                    </a>
                    <a className="btn" href={cadHref(model.glb.replace(/\.glb$/, '.stl'))} download>
                      STL (reference)
                    </a>
                  </>
                )}
              </div>
              <p className="meta">
                {isRev5
                  ? 'Ready for slicing in Bambu Studio / OrcaSlicer. Check the printing guide for TPU 95A and PA6-CF settings.'
                  : 'STEP is the primary source of truth. STLs are exported for reference.'}{' '}
                <Link to="/printing">View print guidance</Link>.
              </p>
            </div>
          </Reveal>
        </div>

        {/* Right Sidebar: Parts List & Component Inspector Card */}
        <div className="part-panel">
          {isRev5 ? (
            <>
              <header>
                <h2 className="parts-heading">
                  Components <span>{REV5_PARTS.length} subassemblies</span>
                </h2>
                <input
                  type="search"
                  aria-label="Search Rev 5 components"
                  placeholder="Search parts, alloy, fasteners…"
                  value={rev5Query}
                  onChange={(e) => setRev5Query(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <select
                    aria-label="Filter by subsystem"
                    value={rev5SubsystemFilter}
                    onChange={(e) => setRev5SubsystemFilter(e.target.value)}
                    style={{ minHeight: 44, flex: 1 }}
                  >
                    <option value="all">All subsystems ({REV5_PARTS.length})</option>
                    {rev5Subsystems.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="meta" style={{ margin: '8px 0 0' }}>
                  {filteredRev5Parts.length}/{REV5_PARTS.length} shown
                </p>
              </header>

              <ul className="part-list" aria-label="Rev 5 components">
                {filteredRev5Parts.map((part) => {
                  const isSel = rev5SelectedId === part.id;
                  return (
                    <li key={part.id} style={{ padding: 0 }}>
                      <button
                        type="button"
                        aria-pressed={isSel}
                        aria-label={`Select ${part.name}`}
                        onClick={() => handleSelectRev5Part(isSel ? null : part.id)}
                        onMouseEnter={() => setRev5HoveredId(part.id)}
                        onMouseLeave={() => setRev5HoveredId(null)}
                        style={{
                          all: 'unset',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flex: 1,
                          minWidth: 0,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          background: isSel ? 'var(--accent-wash)' : 'transparent',
                          boxShadow: isSel ? 'inset 3px 0 0 var(--accent-graphic)' : 'none',
                        }}
                      >
                        <span
                          className="role-dot"
                          style={{
                            background: part.color,
                            boxShadow: isSel ? `0 0 6px ${part.color}` : 'none',
                          }}
                          aria-hidden="true"
                        />
                        <span className="row-main">
                          <b>{part.name}</b>
                          <span>
                            {part.subsystem} · {part.massG} g
                          </span>
                        </span>
                      </button>
                      <a
                        href={`stl/${part.stlFile}`}
                        download
                        className="eye"
                        title={`Download ${part.stlFile} (${part.stlSize})`}
                        aria-label={`Download ${part.name} STL`}
                        style={{ marginRight: 10, textDecoration: 'none', fontSize: 13 }}
                      >
                        ⤓
                      </a>
                    </li>
                  );
                })}
              </ul>

              {/* Engineering Component Inspector Card */}
              <div className="rev5-inspector-card" aria-live="polite">
                {selectedRev5Spec ? (
                  <>
                    <div className="rev5-inspector-header">
                      <div>
                        <span className="rev5-subsystem-tag">{selectedRev5Spec.subsystem}</span>
                        <h3 className="rev5-part-title">{selectedRev5Spec.name}</h3>
                      </div>
                      <span className="cyber-badge" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        {selectedRev5Spec.massG} g
                      </span>
                    </div>

                    <table className="rev5-specs-table">
                      <tbody>
                        <tr>
                          <td className="spec-lbl">Subsystem</td>
                          <td className="spec-val">
                            <strong>{selectedRev5Spec.subsystem}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td className="spec-lbl">Mass (g)</td>
                          <td className="spec-val">
                            {selectedRev5Spec.massG} g{' '}
                            <span style={{ color: 'var(--muted)', fontSize: '10.5px' }}>
                              ({((selectedRev5Spec.massG / 1361) * 100).toFixed(1)}% of 3lb cap)
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td className="spec-lbl">Material</td>
                          <td className="spec-val">{selectedRev5Spec.material}</td>
                        </tr>
                        <tr>
                          <td className="spec-lbl">Manufacturing</td>
                          <td className="spec-val">{selectedRev5Spec.manufacturing}</td>
                        </tr>
                        <tr>
                          <td className="spec-lbl">Fasteners Used</td>
                          <td className="spec-val">{selectedRev5Spec.fasteners}</td>
                        </tr>
                      </tbody>
                    </table>

                    <a
                      href={`stl/${selectedRev5Spec.stlFile}`}
                      download
                      className="rev5-download-cta"
                    >
                      <span>⤓ DOWNLOAD STL</span>
                      <span style={{ opacity: 0.8, fontSize: '11px' }}>({selectedRev5Spec.stlSize})</span>
                    </a>

                    <div className="rev5-part-actions">
                      <button
                        type="button"
                        className="mini"
                        onClick={() => {
                          setCamTargetPos(selectedRev5Spec.focusCameraPos);
                          setCamTargetLookAt(selectedRev5Spec.focusTarget);
                          setIsCamAnimating(true);
                        }}
                      >
                        Focus Camera
                      </button>
                      <button
                        type="button"
                        className="mini"
                        onClick={() =>
                          setRev5IsolatedId(
                            rev5IsolatedId === selectedRev5Spec.id ? null : selectedRev5Spec.id
                          )
                        }
                      >
                        {rev5IsolatedId === selectedRev5Spec.id ? 'Exit Isolate' : 'Isolate Part'}
                      </button>
                      <button
                        type="button"
                        className="mini"
                        onClick={() => handleSelectRev5Part(null)}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </>
                ) : (
                  <span className="meta">
                    Click any part in the 3D model or the list to open engineering specifications, mass breakdown, and direct STL download.
                  </span>
                )}
              </div>
            </>
          ) : (
            /* Legacy GLB Part Panel */
            <>
              <header>
                <h2 className="parts-heading">
                  Parts <span>{count}</span>
                </h2>
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
                      <li key={i} data-idx={i} className={hidden.has(i) ? 'hidden-row' : ''} style={{ padding: 0 }}>
                        <button
                          type="button"
                          aria-pressed={selected === i}
                          aria-label={`Select part ${i}, ${role}`}
                          onClick={() => setSelected(selected === i ? null : i)}
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
                            <b>
                              #{i} {p?.name ?? role}
                            </b>
                            <span>{p ? partLabel(p, i) : `${model.solids} solids (manifest loading…)`}</span>
                          </span>
                        </button>
                        <button
                          className="eye"
                          aria-label={hidden.has(i) ? `Show part ${i}` : `Hide part ${i}`}
                          aria-pressed={hidden.has(i)}
                          disabled={!!p?.dropped_from_glb}
                          onClick={() => toggleHide(i)}
                          style={{ marginRight: 12 }}
                        >
                          {hidden.has(i) ? '＋' : '−'}
                        </button>
                      </li>
                    );
                  })}
              </ul>
              <div className="readout" aria-live="polite">
                {sel !== null && selected !== null ? (
                  <>
                    <b>{sel.name ?? `Part #${selected}`}</b>{' '}
                    <span className="stamp todo">{model.accessory ? 'Fit-test prototype' : `${sel.role} · heuristic`}</span>
                    <dl>
                      <dt>Volume</dt>
                      <dd>{sel.vol_cm3} cm³</dd>
                      <dt>{model.accessory ? 'Print mass' : 'Estimated mass'}</dt>
                      <dd>{massLabel(sel.role, sel.vol_cm3)}</dd>
                      <dt>BBox</dt>
                      <dd>{sel.bbox_mm.map((d) => d.toFixed(1)).join(' × ')} mm</dd>
                    </dl>
                    <div className="btn-row" style={{ margin: '8px 0 0' }}>
                      <button className="mini" onClick={() => isolatePart(selected)}>
                        Isolate
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
            </>
          )}
        </div>
      </div>

      {/* Critical Combat Subassemblies & Part Inspection Showcase */}
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
          {/* Main Combat Chassis Puck */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge">CHASSIS CORE</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>Main Combat Chassis Puck</h3>
              </div>
              <button
                type="button"
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  selectModel('rev5');
                  handleSelectRev5Part('chassis_puck');
                  setRev5Explode(0.35);
                }}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Elastomeric unibody puck housing twin PropDrive motors, dual 4S batteries, and flight controller.
              Clamped between 3.5mm top/bottom armor plates via 16× M3 12.9 grade bolts.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Bambu TPU 95A HF</div>
              <div><strong>Mass:</strong> ~180 g (90% Gyroid)</div>
              <div><strong>Diameter:</strong> Ø140.0 mm OD</div>
              <div><strong>Hardware:</strong> 16× M3×35mm (Loctite 243)</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="stl/eyeliner_chassis_puck.stl" download>
                DOWNLOAD STL (5.4 MB)
              </a>
            </div>
          </div>

          {/* Titanium Cleat Wheels */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-amber)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge amber">TRACTION SYSTEM</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>Titanium Cleat Wheels</h3>
              </div>
              <button
                type="button"
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  selectModel('rev5');
                  handleSelectRev5Part('wheel_cleat_left');
                  applyPreset('cleatDrive');
                }}
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
              <div><strong>Mass:</strong> 14.2 g / wheel disc</div>
              <div><strong>Tire OD:</strong> 1.55 in (39.4 mm)</div>
              <div><strong>Traction μ:</strong> &gt;1.5 Wood / 0.35 Steel</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="stl/eyeliner_wheel_cleat_left.stl" download>
                DOWNLOAD STL (558 KB)
              </a>
            </div>
          </div>

          {/* PropDrive v2 2836 1200KV Motors */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-green)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge green">DRIVE MOTORS</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>PropDrive v2 2836 1200KV</h3>
              </div>
              <button
                type="button"
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  selectModel('rev5');
                  handleSelectRev5Part('motor_left');
                  applyPreset('cleatDrive');
                }}
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
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="stl/eyeliner_motor_left.stl" download>
                DOWNLOAD STL (19 KB)
              </a>
            </div>
          </div>

          {/* AI Micro-LiDAR Bay */}
          <div className="glass-panel hud-corner" style={{ padding: '20px', borderLeft: '3px solid var(--neon-cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="cyber-badge">AVIONICS &amp; LIDAR</span>
                <h3 style={{ margin: '8px 0 4px', fontSize: '17px', color: '#fff' }}>AI Micro-LiDAR Sensor Bay</h3>
              </div>
              <button
                type="button"
                className="cyber-btn"
                style={{ padding: '4px 10px', fontSize: '11px' }}
                onClick={() => {
                  selectModel('rev5');
                  handleSelectRev5Part('lidar_mount');
                  applyPreset('lidarBay');
                }}
              >
                VIEW 3D ↗
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--cyber-text-muted)', margin: '8px 0 14px' }}>
              Rigid carbon-fiber reinforced sensor bracket holding micro-ranging optics for autonomous arena mapping,
              opponent relative bearing calculation, and real-time collision vector estimation.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '4px' }}>
              <div><strong>Material:</strong> Bambu PA6-CF</div>
              <div><strong>Mass:</strong> 6.8 g</div>
              <div><strong>Interface:</strong> I2C / UART 115200</div>
              <div><strong>Range:</strong> 0.05m – 4.00m (30 Hz)</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <a className="cyber-btn primary" style={{ flex: 1, padding: '6px', fontSize: '11px', textAlign: 'center' }} href="stl/eyeliner_lidar_mount.stl" download>
                DOWNLOAD STL (706 KB)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3D Turntable Video Preview & Download Modal */}
      {recordedVideo && (
        <Rev5VideoModal
          videoResult={recordedVideo}
          onClose={() => setRecordedVideo(null)}
          onRecordAgain={() => {
            setRecordedVideo(null);
            handleStartRecording(selectedCinematicTrack);
          }}
        />
      )}
    </div>
  );
}

for (const m of cadModels) {
  useGLTF.preload(m.glb);
}
