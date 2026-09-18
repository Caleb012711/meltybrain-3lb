# 39 — Performance Verification (Round 2, Agent 9/10)

Scope: `web/` only. READ-ONLY (no source edits; this report is the sole write).
Method: principles read from disk, then every number below measured by running commands in `/workspaces/meltybrain-3lb/web`.

## Principles applied (read from disk)

1. **Robotics Software Principles, Principle 6 — Separation of Rates**
   (`.opencode/skills/robotics-software-principles/SKILL.md:463-525`):
   subsystems at different rates must never block each other; a slower producer
   communicates to a faster consumer via a buffer/sample, never by direct call.
   Applied here as: display-rate `useFrame` physics vs decoupled HUD/audio/SR timers
   vs scroll-driven hero vs demand-gated shadows — each rate audited separately.
2. **Docker ROS2 Development — resource-budget thinking**
   (`.opencode/skills/docker-ros2-development/SKILL.md`: per-service `deploy.resources`
   limits, `shm_size`, multi-stage minimal-runtime, layer-cache ordering).
   Applied here as: fixed byte/ms budgets per route chunk, per asset class, per Canvas
   mount (DPR cap ≈ GPU reservation, `frameloop` gating ≈ restart/scale-to-zero policy,
   hashed-asset immutability ≈ versioned image tags).

## (1) `npm run build` — chunk sizes (measured 2026-09-18, vite v8.3.0)

```
dist/assets/CadViewer-CBl8mSi2.js      1,025,754 B (1025.75 kB) │ gzip 278.29 kB (vite) / 274,703 B (gzip -c)
dist/assets/index-4VSAkgQc.js            254,384 B (254.38 kB)  │ gzip  81.59 kB (vite) /  80,664 B (gzip -c)
dist/assets/Studio-S0LzypoY.js            34,153 B │ gzip 11.76 kB
dist/assets/Pages-BYYIh2tc.js             27,249 B │ gzip  8.50 kB
dist/assets/index-CX9zJXE8.css            21,700 B │ gzip  4.90 kB
dist/assets/OrbitControls-DNIlcS9O.js     15,354 B │ gzip  4.70 kB
dist/assets/hero-CLDdwZDr.png             13,057 B (nav brand thumb, hashed → immutable)
dist/assets/HeroStage-48xcKQLN.js         12,727 B │ gzip  4.66 kB
dist/assets/Explorer--zub2vXn.js          10,996 B │ gzip  4.01 kB
dist/assets/jsx-runtime-CFEceaYG.js        8,557 B │ gzip  3.26 kB
dist/assets/Bom-DxJaHlUY.js                8,370 B │ gzip  2.19 kB
dist/assets/Engineering-CH65bP9J.js        7,464 B │ gzip  2.72 kB
dist/index.html                                991 B │ gzip 0.52 kB
JS total ≈ 1,405,008 B (1.34 MiB). dist/ total 53,936,535 B (cad/ dominates).
```

**Growth vs baseline: NO GROWTH.**
CadViewer shared chunk 1025.75 kB vs 1026 kB baseline (−0.25 kB, −0.02%);
gzip 278.29 kB vs 278 kB baseline (+0.29 kB, +0.1% — noise).
Index 254.38 kB vs ~254 kB baseline (flat). `chunkSizeWarningLimit: 1200` in
`vite.config.ts:9` silences the CadViewer warning — acknowledged, not a fix.
No manualChunks; OrbitControls already code-split (15.35 kB) out of the shared chunk.

## (2) CAD bytes + `render.yaml` cache headers vs `dist` output names

Measured `public/cad` (= `dist/cad`, byte-identical):

| File | Bytes | Header in `render.yaml` | Verdict |
|---|---|---|---|
| `main-cad.glb` | 4,223,944 (gzip-equiv 2,001,423) | `/cad/*.glb` → `public, max-age=3600` (L33) | ✓ correct (unhashed name, hourly revalidate) |
| `wheel-pod.glb` | 2,391,384 (gzip 1,220,609) | same | ✓ |
| `standard-weapon-teeth.glb` | 731,368 | same | ✓ |
| `undercutter-config.glb` | 860,712 | same | ✓ |
| `main-cad.parts.json` | 23,578 (gzip 1,955) | `/cad/*.parts.json` → `no-cache` (L36) | ✓ |
| `wheel-pod.parts.json` | 4,058 | same | ✓ |
| `undercutter-config.parts.json` | 1,650 | same | ✓ |
| `standard-weapon-teeth.parts.json` | 340 | same | ✓ |
| `manifest.json` | 761 | `no-cache` (L39) | ✓ |
| `main-cad.stl` | 10,323,984 | `/cad/*.stl` → `max-age=86400` (L45) | ✓ (download-only, never auto-fetched) |
| `wheel-pod.stl` / `standard-…stl` / `undercutter-…stl` | 5,799,584 / 1,999,984 / 2,461,284 | same | ✓ |
| `Main CAD.step` | 17,784,945 | `/cad/*.step` → `max-age=86400` (L42) | ✓ |
| `Wheel Pod.step` | 4,216,277 | same | ✓ |
| `Standard Weapon Teeth.step` | 301,113 | same | ✓ |
| `Undercutter Config.step` | 468,612 | same | ✓ |
| `dist/assets/*` (all hashed) | — | `/assets/*` → `immutable, max-age=31536000` (L30) | ✓ |
| `dist/index.html` | 991 | `/index.html` → `no-cache` (L48) | ✓ (HashRouter: single entry for all routes) |
| `dist/eyeliner_summer_2025_render.webp` (25,136) / `.png` (862,511) / `favicon.svg` / `icons.svg` | — | **NO matching rule** (only `/assets/*`) | ⚠ GAP — see saving #5 |

Totals: GLB 8,207,408 B (7.8 MB) · STL 20,584,836 B (19.6 MB) · STEP 22,770,947 B (21.7 MB).
STL/STEP are click-to-download only (Explorer `Pages`/`Explorer` download links) — zero
autoload cost. GLB gzip ratio ≈ 47–51% (already binary; gzip helps little — compression
must be geometric, see saving #1).

## (3) Per-Canvas cost audit (6 Canvas sites, ≤2 mounted at once per route)

`ViewerLights` = `Environment resolution={256}` procedural (Lightformers, no fetch) —
`CadViewer.tsx:41`. Cost is per-mount PMREM generation, paid on every Canvas mount:

| Canvas (`file:line`) | DPR | frameloop gate | ContactShadows | Env 256 | Notes |
|---|---|---|---|---|---|
| Hero main `HeroStage.tsx:173` | [1, mobile?1:1.5] | `inView?'always':'never'` + IO (L174,281) ✓ | `frames={Infinity}`, res 256 (L193–202) ⚠ | ✓ | Scroll-driven; rAF letter loop skips when hidden (`visible` flag, L294) and when \|dx\|<0.03 (L305) ✓ |
| Hero reduced-motion `HeroStage.tsx:383` | [1,1.5] | none (always) | `frames={1}` ✓ (L399) | ✓ | Only mounted for reduced-motion users; no gate needed but always-on |
| Drive `Studio.tsx:995` | [1,1.5] | none (always) ⚠ | none | ✓ | Keeps rendering at 60 fps when tab hidden/blurred (input disarmed on blur L711–724, canvas not gated) |
| Build `Studio.tsx:427` | [1,1.5] | none (always) | none (gridHelper) | ✓ | Mode-switched vs Drive — never co-mounted ✓ (good separation) |
| Explorer `Explorer.tsx:138` | [1,1.5] | none (always) | none (gridHelper) | ✓ | — |
| Compact `CadViewer.tsx:565` | [1,1.5] | none | none | ✓ | `CadViewer` component itself has no route import (only `ExplodingModel`/`ViewerLights` reused) — chunk is the shared three/fiber/drei bundle |

Separation-of-rates verdict (Principle 6): GOOD shape.
Physics runs at display rate with `dt` clamped to 1/30 (`Studio.tsx:47`).
Slow consumers are decoupled via buffers/timers, never blocking the frame loop:
HUD `setInterval 100 ms` = 10 Hz (`Studio.tsx:731`), spin-audio param updates 100 ms
(`Studio.tsx:542`), SR announcements gated to ~4 s (`Studio.tsx:745`),
trail sampled at 20 Hz (`acc<0.05` return, `Studio.tsx:346`) with min-displacement gate
0.0025 (`Studio.tsx:353`) and fixed `TRAIL_N=120` ring buffer = 360 floats, shifts via
`copyWithin` (`Studio.tsx:28,314,355`) — bounded, no allocs per frame.
Two violations: (a) hero `ContactShadows frames={Infinity}` couples a full extra
256² shadow pass to the 60 Hz display rate although the scene only changes on scroll;
(b) Drive canvas has no `frameloop`/visibility gating — render rate coupled to wall-clock
even when the page is hidden.

## (4) Lazy routes + Suspense + poster images

- `App.tsx:6-15`: 10/11 routes `lazy()` (Build/Onshape/Pcbway/Printing/Parts/Firmware/
  Explorer/Studio/Bom/Engineering); only `Home` eager. Single top-level `Suspense`
  (`App.tsx:19`) covers all routes ✓. `Home.tsx:7` additionally lazy-loads `HeroStage`
  with its own `Suspense` fallback ✓ (hero failure can't blank the page).
- Grouping note: `Pages.tsx:4` imports `DownloadCards` from `./Bom`, so the `Pages`
  chunk (27.2 kB) depends on the `Bom` chunk (8.4 kB) — both download for any Pages
  route. Small; acceptable.
- `preloadAll` (`CadViewer.tsx:747`) / `preloadExplorer` (`Explorer.tsx:480`) are
  defined but have no call sites found — dead code, no cost, no benefit.
- Posters: hero main poster `loading="eager" fetchPriority="high"` (`HeroStage.tsx:426`)
  ✓ correct LCP poster (removed 350 ms after ready, L253); all failure-fallback posters
  `loading="lazy"` (`HeroStage.tsx:379,420`, `CadViewer.tsx:543`, `Explorer.tsx:134`,
  `Studio.tsx:989`) ✓ correct (error paths only); `Home.tsx:118` Suspense-fallback img
  has no `loading` attr (= eager) ✓ correct; `Home.tsx:170` below-fold figure lazy +
  explicit `width=1600 height=1200` ✓ CLS-safe; nav brand thumb 34×22 bundled hashed
  (`Layout.tsx:59`, 13 kB) ✓ correct.
- `index.html:8-9` preloads `main-cad.glb` (4.2 MB) + `main-cad.parts.json` on EVERY
  entry — but HashRouter serves the same `index.html` for text-only routes
  (`/bom`, `/firmware`). Text visits pay a 4.2 MB fetch they never use (see saving #2).

## (5) Ranked cost table — top 5 concrete savings

| # | Change (`file:line`) | Saves | Basis (measured) |
|---|---|---|---|
| 1 | Compress GLBs geometrically — Draco/meshopt in `tools/cad_convert.py` output (`public/cad/*.glb`, total 8,207,408 B; `main-cad.glb` 4,223,944) | ~5,000 kB transfer on 3D routes (main → ~1.2–1.7 MB @ ~65%) | gzip only reaches 2,001,423 B (47%); binary mesh needs geometric compression, not transport compression |
| 2 | Remove `./cad/main-cad.glb` from preload (`web/index.html:8`; keep `parts.json` + poster) | 4,224 kB (2,001 kB gzip-equiv) on every non-3D entry | Same `index.html` serves `/bom` etc. (HashRouter); hero mounts ~instantly anyway and shows the eager poster meanwhile |
| 3 | Stop shipping `public/eyeliner_summer_2025_render.png` (862,511 B; zero `src/` references — only `.webp` used) | 863 kB deploy + CDN bytes | `du -b` + grep: all 8 img sites use `.webp`; `.png` ships dead in `dist/` |
| 4 | Hero shadow: `frames={Infinity}` → demand + `resolution 256→128` on mobile (`HeroStage.tsx:193-202`); gate Drive canvas on hidden (`Studio.tsx:995`) | ~1 extra 256² scene pass/frame (~1–2 ms/frame hero idle); 0 fps when drive tab hidden | Scene changes only on scroll (hero) / input (drive); rate decoupled per Principle 6 |
| 5 | Add `Cache-Control` for root static (`render.yaml:28-30` covers only `/assets/*`): `/*.webp`, `/*.png`, `/*.svg`, `/favicon.svg` → `public, max-age=86400` (keep `index.html` no-cache) | Eliminates revalidation on every navigation for 25 kB poster + icons | `dist/*.webp|*.png|*.svg` match no rule today; hashed `/assets/*` already immutable ✓ |

Honorable mentions (not top-5): rival bot on by default (`Studio.tsx:595`) doubles
main-cad draw calls (~96 nodes ×2) — consider default-off on mobile; dead
`preloadAll`/`preloadExplorer` — delete or wire to idle-prefetch; `useGLTF.preload`
of all 4 GLBs on hero mount would cost 8.2 MB — do NOT add without idle gating.

## Verdict inputs

No chunk growth (CadViewer −0.02%, index flat); all CAD/cache-header mappings verified
except root-image gap (#5, non-blocking); rates separated (HUD 10 Hz / audio 10 Hz /
SR 4 s / trail 20 Hz + displacement gate / dt clamp); lazy coverage 10/11 routes +
hero; posters eager/lazy correct. All findings are optimizations, none are regressions.
