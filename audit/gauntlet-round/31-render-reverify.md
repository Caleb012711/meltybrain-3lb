# Gauntlet Round 31 — Render Re-verify (round-2 verification of Z-up fixes)

Scope: `web/` (React+Vite+three.js site). Round 1: Z-up CAD rendered standing-on-edge; fixes just applied (leveler wrappers, REST_Y, ViewerLights, xray, role colors, error boundaries).
Method: read every file listed (no skimming), measured `public/cad/main-cad.glb` bbox with node+three, ran `npm run lint` + `npm run build` in `web/`. READ-ONLY — no source edits.

Skills applied (read from disk; note: task path `web/.opencode/...` does not exist — skills live at repo-root `.opencode/skills/`):
- `.opencode/skills/robotics-design-patterns/SKILL.md` (`robotics-design-patterns`) — lens: leveler as a frame-convention adapter at the scene boundary (HAL pattern); spin must be expressed in the CAD-local weapon frame; FocusRig must stay in world frame.
- `.opencode/skills/robotics-software-principles/SKILL.md` (`robotics-software-principles`) — lens: single responsibility (wrappers contain ONLY the model), fail-safe defaults (WebGL fallbacks), physical-consequence scrutiny (grounding/clipping is the 3D equivalent of crashing into a wall).

Ground truth measured from `public/cad/main-cad.glb` (normalized exactly as `ExplodingModel` does: scale 4/maxDim, bbox-centered):
- GLB raw bbox: X 134.5 × Y 222.0 × Z 62.4 → Z-up confirmed, weapon axis = CAD Z, ring plane = CAD XY.
- Normalized: 2.423 × 4.000 × 1.123. Leveled via Rx(−90°): X 2.423 (half-width **1.212** ✓ "±1.2 rim"), Y 1.123 (half-thickness **0.562**), Z 4.000.

## Item 1 — HeroStage RollingBot Euler / roll sign / ParkedBot / ContactShadows: CONDITIONAL PASS (fix correct, grounding wrong)

- `src/components/HeroStage.tsx:50` — `g.rotation.set(0, 0.35 + drive*0.25, roll.current)` OUTSIDE inner leveler (`:56` `rotation={[-Math.PI/2,0,0]}`): **PASS**. With default XYZ order and x=0, q = qy(yaw)·qz(roll): no accumulating Y-component, so no weapon-axis spin. Roll about world Z is the correct rolling axis for +X travel; yaw applied last keeps the 3/4 view stable. Structure matches the `:47-48` comment.
- Roll sign (`:49` `roll.current -= dx / ROLL_R`): **PASS**. +X travel needs ω<0 about +Z for no-slip (contact-point velocity must oppose travel); decrement is correct.
- `ParkedBot` (`:80-81` yaw-only outer + inner leveler): **PASS**, sits flat.
- ContactShadows plane vs leveled extent: **FAIL (new finding F-3)**. Shadow at `:194` y=−0.83 vs bot center `ground` −0.7 (gap 0.13), but measured flat half-thickness is 0.562 → bot bottom −1.26, sunk **0.43** through the shadow plane at full scale (mobile `:10,194`: bottom −0.90 vs −0.68, sunk 0.22). Edge-on roll phase dips to −1.91. `ROLL_R=1.5` also exceeds measured rolling half-width 1.21 → ~24% under-rotation (slip look). Minor: XYZ-vs-comment wording (`:47` "yaw then roll" — actually roll composes first) and yawed roll-plane vs X-travel sideslip ~0.35–0.6 rad are stylized, acceptable.

## Item 2 — Leveler wrappers (Explorer / BuildCanvas / CadViewer demo): PASS + 2 new findings

- `Explorer.tsx:159-175` leveler wraps ONLY `<ExplodingModel>`; grid `:156`, `FocusRig` `:177`, `OrbitControls` `:178` outside: **PASS**.
- `Studio.tsx:448-464` (BuildCanvas) same pattern; grid `:445`, `FocusRig` `:466`, controls `:467` outside: **PASS**.
- `CadViewer.tsx:581-597` (demo) same; grid `:578`, `StlOverlay` `:598` outside: **PASS** structurally — but the demo component is **dead code** (see F-5).
- `FocusRig` (`CadViewer.tsx:350-429`) is world-space: `Box3.setFromObject` (`:383`) resolves world matrices including the leveler, controls operate outside it: **PASS**, unaffected.
- **FAIL (new finding F-1)**: `ExplodingModel` turntable spins the wrong axis post-leveler. `:315` `group.current.rotation.y += …` rotates about CAD-local Y (the 222 mm long horizontal axis, NOT the weapon axis Z). Inside the leveler this maps to world −Z (horizontal) → Explorer (`Explorer.tsx:166` `spin` defaults ON) and the demo (`:588`) do slow end-over-end **tumbles** (12.6 s/flip, long-axis tips reach y≈−2.0) instead of a turntable. Fix: `rotation.z +=` (CAD Z = weapon axis → world-vertical after leveling). Safe: all other callers pass `spin={false}`.
- **FAIL (new finding F-4)**: grids float. `Explorer.tsx:156`, `Studio.tsx:445`, `CadViewer.tsx:578` grids at y=−2.2 (correct when the model stood on edge, bottom −2.0) but leveled flat bottom is −0.562 → model hovers **~1.64** above the grid. Fix: grid y ≈ −0.6.

## Item 3 — Studio REST_Y / LED / rival distinguishability: MIXED

- `REST_Y=0.56` (`Studio.tsx:26`; comment `:25-26` matches measured half-thickness 0.562): used in `DriveBot` initial `:122` + per-frame `:115`, `RivalBot` initial `:217` + per-frame `:213`: **PASS** (bottom kisses floor at −0.002).
- LED (`:142` `[1.1, 0, 0.2]`, r=0.13, CAD-local frame `:140-141` x=width/z=up description correct): **FAIL (new finding F-2)** — buried. Rim at x=1.212, top surface z=0.562: LED center is 0.11 inside the rim and 0.36 below the top face; sphere pokes ≤0.018 radially → occluded by the opaque shell, steering cue invisible. Fix: e.g. `[1.0, 0, 0.62]` (proud of top face near rim), verify visually.
- Rival distinguishability: **FAIL (new finding F-6, HIGH)**. Both bots share GLB + `colorMode="role"` (`:132,:227`); the only differentiator, the red ring (`:238-241`), sits at group-relative y=−1.9 → world y = 0.56−1.9 = **−1.34, under the opaque arena floor** (floor y=0, `DriveArena` `:381`) → invisible. Bots identical in-drive. Fix: ring y ≈ −0.5 (world ≈0.06); ring radii 2.2–2.6 correctly encircle the 1.21×2.0 footprint, flat rotation ✓.

## Item 4 — ViewerLights / xray / role hex / BuildCanvas boundary: PASS

- 6 canvases, all with `<ViewerLights />`: HeroScene (`HeroStage.tsx:188`), reduced static (`:395`), demo (`CadViewer.tsx:577`), Explorer (`Explorer.tsx:155`), drive (`Studio.tsx:1005`), BuildCanvas (`Studio.tsx:444`): **PASS**.
- Procedural, no network: sole `Environment` (`CadViewer.tsx:41`) uses children `<Lightformer>` mode, no `preset`/`files` anywhere: **PASS**.
- `xraySelMat` (`:133-143`, wired `:299`, disposed `:144-150`): **PASS** — reachable via Explorer (xray+selected). Note: demo passes `selected={null}` (`:591`) so orange-selected-in-xray is unreachable there (moot, demo dead).
- `ROLE_CSS` vs `ROLE_PARAMS` hex: all six match (`#3b4046/#c9ced4/#a49d92/#2e3237/#33404e/#0f6a3a` ≡ `0x…`, `materials.ts:20-39`): **PASS**.
- `BuildCanvas` `GlErrorBoundary` at call site (`Studio.tsx:1243`): **PASS** (note: null-fallback, no poster image unlike drive `:984-993`).

## Item 5 — lint + build: PASS

- `npm run lint`: exit 0, **0 errors** (warnings only, pre-existing classes: exhaustive-deps incl. `CadViewer.tsx:299` missing `xraySelMat`/`meshCount` — harmless, both effectively static; `DriveTrail` immutability/refs-during-render `Studio.tsx:318-321,359-363`; Explorer memo/compiler hints).
- `npm run build` (`tsc -b && vite build`): **PASS** (~838 ms; `CadViewer` chunk 1025 kB / 278 kB gzip — three.js, expected).

## New findings summary

| ID | Sev | Location | Issue | Fix |
|----|-----|----------|-------|-----|
| F-1 | HIGH | `CadViewer.tsx:315`, affects `Explorer.tsx:166` | Default-ON spin tumbles model end-over-end (rotation about CAD Y, not weapon axis Z) | `rotation.z += delta*0.5` |
| F-6 | HIGH | `Studio.tsx:238` | Rival red ring at world y=−1.34, under floor → rivals indistinguishable | ring y −1.9 → ≈−0.5 |
| F-2 | MED | `Studio.tsx:142` | Heading LED fully embedded in shell (0.36 below surface) → invisible steering cue | move proud, e.g. `[1.0,0,0.62]` |
| F-3 | MED | `HeroStage.tsx:9-10,46,193-194` + ParkedBot `:80,399` | Bot sunk 0.43 (desktop) / 0.22 (mobile) through ContactShadows plane; ROLL_R 1.5 vs measured 1.21 | ground = shadow+0.562 (desktop ≈−0.27); ROLL_R ≈1.2 |
| F-4 | LOW | `Explorer.tsx:156`, `Studio.tsx:445`, `CadViewer.tsx:578` | Grids at −2.2 leftover from edge-standing era; flat model floats ~1.64 | grid y ≈ −0.6 |
| F-5 | LOW | `CadViewer.tsx:431-459,488-745,747-749` | `CadViewer` demo + `StlOverlay` + `preloadAll` dead (no imports); overlay also lacks leveler (Z-up STL would stand on edge) | delete or re-level + wire up |
| — | INFO | `HeroStage.tsx:193` | `ContactShadows frames={Infinity}` re-renders every frame on scroll hero | consider capped frames |

## Verdict: NO-GO

Round-1 frame fixes are structurally correct (levelers model-only, Euler/sign/rest-height/lighting/roles/boundaries all verify), lint+build green — but two HIGH findings block: Explorer's default spin is a tumble (F-1) and the drive-mode rival is invisible/identical (F-6), plus a buried LED (F-2) and sunk hero grounding (F-3). All have one-line fixes; re-verify visually after.
