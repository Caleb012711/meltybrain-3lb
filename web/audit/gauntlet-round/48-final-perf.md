# Gauntlet Final Perf — Round 48 (agent 8/10)

Date (UTC): 2026-09-18 · Repo: `/workspaces/meltybrain-3lb/web` · Node v24.20.0 (engines wants 22.12.0) · vite 8.3.0

## Skills (read from disk)
- Requested paths `web/.opencode/skills/...` do NOT exist. Actual location: `/workspaces/meltybrain-3lb/.opencode/skills/...`
- Skill 1 named: **robotics-software-principles** — "Foundational software design principles applied specifically to robotics module development." P6 = **Principle 6: Separation of Rates — Respect Timing Boundaries** (safety 1000Hz / control 500–1000Hz / perception 10–30Hz / planning 1–10Hz; slow subsystems must talk via buffer, never block the fast loop — applied here as: frameloop gating + DPR caps + procedural env only).
- Skill 2 named: **docker-ros2-development** — "Best practices for Docker-based ROS2 development including multi-stage Dockerfiles, docker-compose, DDS discovery, GPU passthrough, dev-vs-deploy patterns (Humble/Jazzy/Rolling)."

## (1) Lint + Build — PASS
- `npm run lint` (oxlint): **0 errors**, 27 warnings (set-state-in-effect, exhaustive-deps, only-export-components, immutability/refs, preserve-manual-memoization — all pre-existing style/perf hints, none blocking). Exit 0. → PASS
- `npm run build` (`tsc -b && vite build`): success, 589 modules, 1.22s, no TS errors. → PASS
- Chunk sizes (vite reported):
  - `dist/index.html` 0.99 kB (gzip 0.51 kB)
  - `dist/assets/index-DP3VKXUG.css` 21.74 kB (gzip 4.89 kB)
  - `dist/assets/Engineering-Ok65qAL1.js` 7.46 kB (gzip 2.72 kB)
  - `dist/assets/Bom-Di6GGSI9.js` 8.37 kB (gzip 2.19 kB)
  - `dist/assets/jsx-runtime-CFEceaYG.js` 8.55 kB (gzip 3.26 kB)
  - `dist/assets/Explorer-BpFF4Ydq.js` 10.99 kB (gzip 4.01 kB)
  - `dist/assets/HeroStage-D40THKRo.js` 12.74 kB (gzip 4.65 kB)
  - `dist/assets/OrbitControls-ia8K7ZXO.js` 15.35 kB (gzip 4.70 kB)
  - `dist/assets/Pages-DcJQmsWi.js` 27.86 kB (gzip 8.64 kB)
  - `dist/assets/Studio-Bo-t4kss.js` 34.37 kB (gzip 11.78 kB)
  - `dist/assets/index-gSBBDd4h.js` 254.38 kB (gzip 81.58 kB)
  - `dist/assets/CadViewer-BO6q9eQQ.js` **1,025.75 kB (gzip 278.29 kB)** vs ~1,026 kB baseline → delta ≈ **−0.25 kB (−0.02%)**, no unexpected growth. → PASS
  - Static: `hero-CLDdwZDr.png` 13.05 kB.

## (2) dist/ serves (vite preview :4176) — PASS
- Started `npm run preview -- --port 4176`, curled, then killed (verified `000`/refused after kill):
  - `/` → 200 PASS
  - `/#/studio` → 200 PASS (hash never hits server; SPA shell)
  - `/#/explorer` → 200 PASS
  - `/#/engineering` → 200 PASS
  - `/#/firmware` → 200 PASS
- `/` body starts with `<!doctype html>` + preloads `./cad/main-cad.glb`, `./cad/main-cad.parts.json`. `dist/cad/` present in fresh build. → PASS

## (3) No new heavy deps — PASS
- `package.json` direct deps unchanged (6): `@react-three/drei ^10.7.8`, `@react-three/fiber ^9.7.0`, `react 19.2.0`, `react-dom 19.2.0`, `react-router ^7.18.4`, `three ^0.186.0`. Dev: types, plugin-react, oxlint, typescript, vite. No direct `postprocessing/leva/gsap/framer-motion/rapier` additions.
- `package-lock.json` v3, 135 packages; `maath / three-stdlib / zustand / rapier3d-compat / tunnel-rat` present ONLY as transitive drei deps (expected), not new direct deps. `git log` shows no recent package.json/lockfile change beyond base renovation commit. → PASS

## (4) Environment resolution / DPR / frameloop unchanged-by-accident — PASS
- `ViewerLights` (`src/components/CadViewer.tsx:41`): `<Environment resolution={256}>` + Lightformer-only (no network fetch). Unchanged.
- DPR caps intact everywhere: `CadViewer.tsx:569` `dpr={[1,1.5]}`; `HeroStage.tsx:175` `dpr={[1, mobile?1:1.5]}` + `:387` `dpr={[1,1.5]}`; `Studio.tsx:429,996` `dpr={[1,1.5]}`; `Explorer.tsx:140` `dpr={[1,1.5]}`. No `dpr={2}` / uncapped.
- Frameloop gating intact: `HeroStage.tsx:174` `frameloop={inView ? 'always':'never'}`; no stray `frameloop="always"` added on CadViewer/Studio/Explorer (default demand-driven). ContactShadows resolutions sane (256; hero `frames={Infinity}` animated / parked `frames={1}`).
- ToneMapping/clear-color blocks intact (NeutralToneMapping, sRGB, `#ffffff` opaque viewers / `#000000` transparent hero).

## Verdict: GO
All four gates PASS. Build healthy, bundle at baseline, dist serves all routes, no dep bloat, perf guards intact.
