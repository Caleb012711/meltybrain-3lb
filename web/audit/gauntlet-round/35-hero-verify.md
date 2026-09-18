# Gauntlet Round-2 — Agent 5/10: Home Hero Verification

Scope (ONLY): `src/components/HeroStage.tsx` + hero CSS in `src/index.css` + hero section of `src/pages/Home.tsx`.
Restructure under test: outer group = position/scale/visibility + `rotation.set(0, yaw, rollAccum)`, inner group = Z-up leveler `[-PI/2,0,0]`, model inside.

Skills applied (read from disk at `/workspaces/meltybrain-3lb/.opencode/skills/`):
- **robotics-design-patterns** — Pattern 3 (FSM: explicit states, named outcomes, no implicit mode soup) used to judge scroll-drive state clarity.
- **robotics-software-principles** — **Principle 6 (Separation of Rates**: slow producers must feed fast consumers via buffers, never by direct blocking call) used to judge scroll-handler vs rAF-tick vs frameloop layering.

Tool runs (by me, this session): `npm run lint` — 0 errors, warnings only (2 hero-relevant, see §7). `npm run build` (`tsc -b && vite build`) — PASS, built in ~2s.

## Verdict: GO (with 3 minor FAILs, all low-severity, none blocking)

All 7 assigned items verified line-by-line below. The 3 FAILs are small correctness/robustness nits with one-line fixes noted; none break the hero on tested paths.

---

## (1) Euler order XYZ on outer group — PASS (with proof)

Code: `HeroStage.tsx:50` — `g.rotation.set(0, 0.35 + drive * 0.25, roll.current)` on the OUTER group; inner group `HeroStage.tsx:56` — `rotation={[-Math.PI/2, 0, 0]}`; model inside (`:57-71`).

- **Default order is XYZ** (THREE.Euler default; `rotation.set(x,y,z)` without a 4th arg keeps it). For order `'XYZ'`, three.js composes `R = Rx·Ry·Rz` (Z applied first, X last). With `x=0`: `R_outer = Ry(yaw)·Rz(roll)` — roll is applied first in the local frame, yaw outermost. That is the correct vehicle-like composition (heading outside, spin inside); the reverse would wobble the roll axis with yaw.
- **Roll is about the screen-plane axis**: camera sits at `z≈9–10` looking at origin (`HeroStage.tsx:115-119,177`), so the screen plane is world XY and screen-normal is Z. `Rz` rotates X→Y, i.e. in the screen plane — exactly a wheel rolling across the screen. **PASS.**
- **Yaw is about vertical**: `Ry` rotates about world Y (up). Yaw range `0.35→0.60 rad` is a slight heading change, never near gimbal flip. **PASS.**
- **Leveler placement correct**: CAD is Z-up (ring axis = +Z). Inner `Rx(-90°)`: `(0,0,1)→(0,1,0)` (since `y'=y·cos−z·sin=z`, `z'=y·sin+z·cos=−y`), so the ring axis becomes world +Y = flat/horizontal. Total chain `Ry·Rz·Rx(-90°)`: roll spins the leveled ring about world Z (rolling, not weapon-axis spin). The code comment (`:47-48`) matches the math. **PASS.**
- **Roll sign correct**: `roll.current -= dx / ROLL_R` (`:49`). For +X travel (`dx>0`), `dθ<0` about +Z. Contact point at bottom `(0,−r)`: `v_rot = ω×r = (0,0,ω)×(0,−r,0) = (+ωr,0,0)`; rolling without slipping needs backward contact velocity ⇒ `ω<0` ⇒ `θ` decreasing. **Sign is physically correct. PASS.**
- Hop `0.5−0.5·cos(2x/R)` (`:45`) bounces twice per roll revolution (`period πR` vs roll `2πR`) — plausible for a 2-tooth weapon; cosmetic only. **PASS (advisory-free).**

## (2) Fade/scale/hop math at scroll extremes — PASS

Code: `HeroStage.tsx:39-46`. `fade = min(clamp01((s−0.1)/0.08), 1−clamp01((s−0.72)/0.1))`, smoothed-then-eased (`:40`), `g.visible = eFade > 0.02` (`:42`), scale `max(0.001, base·(0.4+0.6·eFade))` (`:43`).

| p (smooth) | fade | visible | x (desktop) | verdict |
|---|---|---|---|---|
| 0 | `min(0, 1)=0` | false, scale 0.4 | −7.2 (off-screen; half-width ≈5.3 @16:9, ≈7.0 @21:9) | parked off-screen ✔ |
| 0.5 | `min(1,1)=1` | true, full scale | mid-travel | ✔ |
| 1 | `min(1, 0)=0` | false | +7.2 off-screen | parked off-screen ✔ |

- Fade-in window `p∈[0.1,0.18]` leads drive-start (`DRIVE_START=0.15`, `:11,33`); fade-out `[0.72,0.82]` trails drive-end (`0.7`, `:12`) — bot never pops. **PASS.**
- No material traversal (visibility+scale only) — cheap and GC-clean. **PASS.**
- Mobile (`mobileCfg`, `:10`; windows `0.12–0.68`, `:31-32`; scale 0.62): `±3.4` vs portrait half-width ≈1.9 (z=10.4, fov 40) — off-screen both ends. **PASS.**
- Two FAIL-minors (non-blocking):
  - **FAIL (minor)** — `prev = useRef(0)` (`:24`) but travel starts at `cfg.x0` (−7.2/−3.4). First `useFrame` computes `dx = x−0 ≈ −7.2`, slamming `roll.current += 4.8 rad` and `rolling=clamp01(|dx|·30)=1` (one-frame hop spike). Invisible on normal load (`eFade=0` ⇒ `visible=false`), but visible on restored-scroll load (`p>0`, `eFade>0`). Fix: init `prev` to `cfg.x0` (or snap on first frame).
  - **Advisory only** — on ≥32:9 ultrawide (half-width ≈10.6 > 7.2), the "parked" bot is visible at the frame edge at `p=0/1` (though `visible=false` still hides it — fade, not position, is doing the work there; composition holds, no action needed).

## (3) Letter measure / centers / ResizeObserver / fonts.ready — PASS with 1 minor FAIL

Code: `measure` (`:229-237`), observers (`:270-279`), tick (`:292-348`), `SplitLine` (`:124-150`), CSS `index.css:306-319`.

- Stage-relative centers (`rect.left − stage.left`) with `measure()` on mount + `ResizeObserver` on both stage and `.hero-text` + `document.fonts.ready.then(measure)` (`:277-279`) + `onScroll` re-fire on resize. **PASS.**
- **Stale centers on font swap: not possible here — PASS.** `index.css:30` body font is a system stack (`-apple-system, Segoe UI, Roboto…`), `hero-giant` sets no webfont (`index.css:314-318`); there is no `@font-face` in the stylesheet, so no late font swap can invalidate centers. `fonts.ready` is harmless belt-and-braces (also null-guarded: `if (document.fonts)`).
- `register` ref-callback (`:220-226`) dedupes via `includes` + prunes detached nodes; `headline` memoized `[]` over static text so `letters` order is stable and parallel to `centers`. Grid index-guard (`cx === undefined → continue`, `:319`). **PASS.**
- **FAIL (minor) — `&nbsp;` word joins defeat word-wrap on narrow screens.** `SplitLine` joins words with non-breaking spaces (`:143`) inside `display:inline` wrappers (`:129`), so each headline line is one unbreakable run that can only wrap via emergency char-level breaks (`overflowWrap:'break-word'`). Desktop is fine, but at 390px the 20-char `SPIN THE WHOLE BOT.` at ~39px (`index.css:309`) overflows its container and breaks mid-word (e.g. `THE W|HOLE`-style splits) instead of at word boundaries. Fix options: use normal spaces + `white-space` control, or keep `&nbsp;` only where orphans matter and allow breaks elsewhere.

## (4) Poster→GL handoff — PASS

Code: `HeroStage.tsx:249-255` (`ready`/`posterGone`), `:424-428` (poster), `:152-157` (`HeroReady`), `Home.tsx:113-124` (Suspense fallback).

- `HeroReady` fires `onReady` from inside `<Suspense>` ⇒ `ready` only after the GLB is loaded; poster fades (300ms CSS) then unmounts at 350ms — no flash, no overlap (poster and canvas share `z-index:3`, `index.css:328,337`, canvas later in DOM so it paints above during crossfade). **PASS.**
- LCP: poster `loading="eager"` + `fetchPriority="high"` (`:426`); asset exists (`public/eyeliner_summer_2025_render.webp`). `onError` hides a broken img in both paths (`:420,:426`) — GL path still shows the bot; if GL *and* poster both fail, hero degrades to headline text (acceptable graceful degradation). **PASS.**
- `Home.tsx` Suspense fallback is a static poster with explicit `width/height` (no CLS) and needs no JS. **PASS.**
- Advisory: `onReady={() => setReady(true)}` (`:436`) is a new closure each render so `HeroReady`'s effect re-runs per render — idempotent (`setReady(true)` bails out), zero user impact.

## (5) Frameloop / DPR / mobile config — PASS with 1 advisory

- `frameloop={inView ? 'always' : 'never'}` (`:174`) driven by `IntersectionObserver` (`:281-288`) — **GL loop truly stops off-view. PASS.**
- Per Principle 6 the three rates are correctly separated: scroll handler writes only `shared.p` + a rect read (`:263-267`, passive); the rAF `tick` owns all DOM writes (letter transforms, blob, HUD) and early-outs when hidden (`:294`) or `|Δx|<0.03` (`:305`); the R3F frameloop owns all GL mutation (`RollingBot`+`CameraRig` `useFrame`). No slow work blocks a fast loop. **PASS.**
- DPR `[1, mobile ? 1 : 1.5]` (`:175`) — mobile capped at 1. **PASS.** Mobile config sane: `180vh` stage, `0.12–0.68` drive window, `±3.4` travel, `0.62` scale, `z=10.4/fov 40`, `σ=110` (`:310`), tilt off (`:311`). **PASS.**
- Advisory (not a FAIL): the rAF `tick` loop itself never stops off-view (spins forever, early-returning on `!visible`) and `ContactShadows frames={Infinity}` (`:193-202`) re-renders the shadow map every frame incl. mobile. Both cheap; could use `frames={mobile?8:Infinity}`/demand but no defect.
- **FAIL (minor, Principle-6-adjacent)** — blob update sits *after* the `|Δx|<0.03` early return (`:305` → `:340-347`), but blob opacity derives from `smooth` via the fade window `[0.1,0.18]` while `x` is frozen before drive-start (`0.15` desktop). For `p∈[0.1,0.15]` the fade changes while `x` is static ⇒ tick returns early ⇒ blob opacity stale (same class of staleness affects letter highlights while the camera is still lerping after `x` settles). Fix: move the blob/fade update above the early return (or gate it on its own delta).

## (6) Reduced-motion + glFailed paths — PASS with 1 advisory

- `reduced` returns a fully static page (`:371-406`): plain `<h1>`, `ParkedBot` (`:77-100`, leveled identically `[-PI/2,0,0]`, no roll animation), scroll effect skipped (`:258`), `glFailed` swaps to poster (`:377-380`). Coherent, no motion. **PASS.**
- `glFailed` main path (`:418-421`) renders the poster; post-`posterGone` context loss also lands here. `GlErrorBoundary` (`CadViewer.tsx:13-28`) wraps both canvases. **PASS.**
- Advisory: the reduced-motion `Canvas` (`:383-394`) uses the default `always` frameloop to render a static scene (mitigated: `ContactShadows frames={1}`, `:399`). `frameloop="demand"`/`"never"` would remove the idle GPU cost; no user-visible defect.

## (7) Lint + build — PASS

- `npm run lint` (oxlint): **0 errors.** Hero-relevant warnings only: `HeroStage.tsx:30` `react(immutability)` ×2 — `s.smooth`/`s.x` mutation of the `shared` ref-object inside `useFrame`. This is the sanctioned pattern here (mutable `Shared` ref is the intentional scroll→frame buffer per Principle 6, never React state); warning is a lint heuristic, not a defect. Remaining warnings are pre-existing in `hooks.ts`, `CadViewer.tsx`, `Explorer.tsx`, `Studio.tsx`, `Bom.tsx` — outside this agent's scope.
- `npm run build` (`tsc -b && vite build`): **PASS**, ~2s, `HeroStage-48xcKQLN.js 12.72 kB (gzip 4.66 kB)`.

---

## Fix list (all small, offered — NOT applied, per READ-ONLY)

1. `HeroStage.tsx:24` — init `prev` to `cfg.x0` (first-frame roll jump on restored-scroll load).
2. `HeroStage.tsx:143` — replace inter-word `&nbsp;` with normal spaces (or scoped `&nbsp;`) so narrow screens wrap at word boundaries instead of mid-word.
3. `HeroStage.tsx:340-347` — move blob fade/position update above the `:305` early return (stale blob/highlight while `x` is static but `smooth`/camera still move).
4. Consider: `frameloop="demand"` on the reduced-motion canvas (`:383`); `ContactShadows frames={mobile ? 8 : Infinity}` (`:199`).
