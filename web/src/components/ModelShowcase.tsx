import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { cadModels } from '../data/content';
import { useModelParts } from '../hooks/hooks';
import { EMPTY_SET, ExplodingModel, GlErrorBoundary, ViewerLights } from './CadViewer';
import { useTheme } from '../hooks/useTheme';
import '../pages/Explorer.css';

function ModelReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

/** A presentation of the checked-in source geometry, with no decorative replacements. */
export function ModelShowcase({ modelId = 'full' }: { modelId?: string }) {
  return <ModelShowcaseView key={modelId} modelId={modelId} />;
}

function ModelShowcaseView({ modelId }: { modelId: string }) {
  return <Showcase key={modelId} modelId={modelId} />;
}

function Showcase({ modelId }: { modelId: string }) {
  const { theme } = useTheme();
  const model = cadModels.find((entry) => entry.id === modelId) ?? cadModels[0];
  const parts = useModelParts(model.id);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [viewKey, setViewKey] = useState(0);

  const markReady = useCallback(() => setReady(true), []);

  return (
    <figure className="model-showcase" aria-busy={!ready && !failed}>
      <div className="model-showcase-stage">
        {!failed && (
          <GlErrorBoundary key={`${model.id}-${viewKey}`} onFail={() => setFailed(true)}>
            <Canvas
              camera={{ position: [3.2, 3.4, 4.0], fov: 38 }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, alpha: true }}
              onCreated={({ gl }) => {
                gl.toneMapping = THREE.NeutralToneMapping;
                gl.outputColorSpace = THREE.SRGBColorSpace;
                gl.setClearColor('#000000', 0);
              }}
              role="img"
              aria-label={`Interactive source CAD: ${model.label}. Drag to orbit and scroll to zoom.`}
            >
              <color attach="background" args={[theme === 'dark' ? '#20211f' : '#eeece5']} />
              <ViewerLights />
              <Suspense fallback={null}>
                <group rotation={[-Math.PI / 2, 0, 0]}>
                  <ExplodingModel
                    url={model.glb}
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
                <ModelReady onReady={markReady} />
              </Suspense>
              <OrbitControls enablePan={false} enableDamping minDistance={4} maxDistance={12} />
            </Canvas>
          </GlErrorBoundary>
        )}
        {(!ready || failed) && (
          <div className="model-showcase-placeholder" role="status">
            {failed ? (
              <>
                {model.id === 'full' && <img src="eyeliner_summer_2025_render.webp" alt="Reference render of the Eyeliner assembly" />}
                <p>Interactive 3D is unavailable. The source files are available in the explorer.</p>
              </>
            ) : <span>Loading source geometry…</span>}
          </div>
        )}
      </div>
      <figcaption>
        <div><span className="model-eyebrow">Source geometry</span><strong>{model.label}</strong></div>
        <button className="mini" onClick={() => { setFailed(false); setViewKey((key) => key + 1); }}>{failed ? 'Retry 3D' : 'Reset view'}</button>
      </figcaption>
    </figure>
  );
}
