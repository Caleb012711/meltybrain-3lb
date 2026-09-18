# Gauntlet Round 22 — 3D Render Audit (studio env rig + role materials + Studio/Hero bots)

Date: 2026-09-18 · Scope: `web/src` (read-only audit, no source edits) · Auditor: OpenCode/Muse Spark
Skills applied (read in full from disk): `.opencode/skills/robotics-design-patterns/SKILL.md`,
`.opencode/skills/robotics-software-principles/SKILL.md`. Lens used throughout: HAL/abstraction,
single-responsibility, fail-safe defaults + graceful degradation, separation of rates,
configuration-over-code, observability ("diagnose a 2 AM failure from logs alone").

Premise under test: shared procedural studio env rig (`ViewerLights` in
`src/components/CadViewer.tsx`, drei `Environment` + `Lightformer` children, no network) applied to
all 6 canvases; role materials in `src/components/materials.ts` are the ORIGINAL metal palette;
Studio RivalBot uses `colorMode="role"` with red ring marker; heading LED sphere reduced to r=0.13.

## Verdict: NO-GO (blocks on F1; F2/F3 strongly recommended same pass)

The env-map fix itself verifies clean (6/6 canvases, fully procedural, no network fetch). But the
bot still renders broken in 4 of 6 canvases for an independent reason: the CAD/GLB is Z-up and only
the two Studio drive bots level it flat — every other canvas shows the assembly standing on edge,
with Hero shadow planes slicing through the body. Separately, the drive bots float ~1.5 units above
the floor and the heading LED floats detached in mid-air off the narrow axis. Fixing env lighting
without fixing orientation/placement leaves the model looking broken from the default camera.

---

## 1. Canvas inventory — env map + boundary + suspense coverage (all 6 found)

| # | Canvas | `ViewerLights` inside | `GlErrorBoundary` | `Suspense` | Notes |
|---|--------|----------------------|-------------------|------------|-------|
| 1 | `CadViewer.tsx:565` (demo) | yes (`:577`) | yes (`:564`) | `fallback={null}` + DOM `LoaderBar` (`:617`) | reference impl |
| 2 | `HeroStage.tsx:165` (`HeroScene`, scroll) | yes (`:180`) | yes — wraps `<HeroScene>` at `:421` (boundary outside component, catches canvas errors) | `fallback={null}` + poster cover until `ready` | ok |
| 3 | `HeroStage.tsx:375` (reduced-motion `ParkedBot`) | yes (`:387`) | yes (`:374`) | `fallback={null}` | ok |
| 4 | `Studio.tsx:424` (`BuildCanvas`) | yes (`:441`) | **NO — missing** (see F4) | `fallback={null}`, no loader | boundary gap |
| 5 | `Studio.tsx:989` (drive arena) | yes (`:999`) | yes (`:988`) | `fallback={null}`, no loader (arena is procedural so first paint is instant; bots pop in) | ok |
| 6 | `Explorer.tsx:138` | yes (`:155`) | yes (`:137`) | `fallback={null}` + list skeletons (3D area blank-white while loading) | ok |

Env-rig correctness (pass): `ViewerLights` (`CadViewer.tsx:34-51`) uses `<Environment resolution={256}>`
with **children only** — no `files=`, no `preset=` — so there is no network fetch; safe on static
hosts/offline as commented. Hemisphere 0.9 + 3 directionals + 4 Lightformers is a sane studio.
Per-canvas cost note: each mounted canvas renders its own 256px env scene; only 1 canvas is mounted
at a time per route (Studio drive/build are mode-conditional, Hero reduced/scroll are exclusive), so
this is acceptable — just don't mount drive + build simultaneously in future (F10).

## 2. Critical / High findings

### F1 — CRITICAL — Z-up CAD rendered un-leveled in 4 of 6 canvases (bot stands on edge)
- Where: `CadViewer.tsx:152-164` (normalize/center, **no up-axis rotation**); `HeroStage.tsx:50-69`
  (`RollingBot`, no leveling); `HeroStage.tsx:71-92` (`ParkedBot`, no leveling);
  `Explorer.tsx:158-172`; `Studio.tsx:444-458` (`BuildCanvas`). Contrast the only correct call sites:
  `Studio.tsx:120-122` (`DriveBot`) and `Studio.tsx:215` (`RivalBot`) wrap in
  `<group rotation={[-Math.PI/2,0,0]}>` with the comment "CAD is Z-up … level it flat".
- Evidence (measured, not assumed): `tools/cad_convert.py` does **no** axis conversion (STEP mm →
  trimesh → GLB, `:273-286`), and the shipped `public/cad/main-cad.glb` measures
  extents **X 134.5 × Y 222.0 × Z 62.4 mm** (thin axis = Z). Chassis plates confirm it, e.g.
  `solid_078` bbox `[128.1, 136.7, 3.5]` (thin in Z). In three.js Y-up, thin must be Y to lie flat.
  Without the `-90° X` level, the 128 mm cover plates stand vertical (edge-on) from the default
  camera `CadViewer.tsx:566` / `Explorer.tsx:139` `[4.4, 3.1, 5.4]`.
- Why it reads "broken": edge-on assembly + explode vectors firing sideways + grid 0.2 below an
  edge-standing bot. Hero `RollingBot` (`HeroStage.tsx:43-47`) even rolls the vertical disc about Z
  like a wheel with hop math — a melty drives flat, so the hero motion concept is wrong too.
- Skills lens: same-model-different-convention is a HAL failure (Pattern 5 / Principle 2 — caller
  must know the hardware convention). The leveling knowledge lives in two call sites instead of one
  abstraction (Principle 1, 3).
- Fix (one place, not six): add an exported `LevelZUp` (or `FlatBot`) wrapper next to `ViewerLights`
  in `CadViewer.tsx` containing the `rotation={[-Math.PI/2,0,0]}` group, use it in **all** bot
  placements (demo, Explorer, BuildCanvas, Rolling/Parked, drive keeps behavior identical). Couple
  with F6 (grid height) — after leveling, model half-thickness is ~0.56 units (4/222 scale), so the
  `gridHelper` at `y=-2.2` (`CadViewer.tsx:578`, `Explorer.tsx:156`, `Studio.tsx:442`) must move to
  ≈ `-0.6`, and Hero `ContactShadows`/ground constants must be re-derived (see F3).

### F2 — HIGH — Drive bots float ~1.5 units; heading LED floats detached off-body
- Where: `Studio.tsx:113` (`group position y=2.05`), `Studio.tsx:214` (rival same), LED
  `Studio.tsx:139-142` (`position=[2.4,0,0]`, `sphereGeometry args=[0.13,16,16]`).
- Math: normalized scale = `4/222 ≈ 0.018`; leveled half-thickness = `62.4/2×0.018 ≈ 0.56`; correct
  rest height ≈ **0.55**, not 2.05 → the bot hovers ~1.5 units. There are no shadows in the drive
  scene to betray it, but the chase cam (`Studio.tsx:243-300`, height 2.6 looking at 1.6) sees a
  hovering bot, and the rival ring sits at world `y=0.15` (`2.05-1.9`), ~1.4 below the hull — the
  ring reads as a separate floor decal, not a marker *on* the rival.
- LED axis is wrong, not just small: spinner-local X survives the `-90° X` level as world X, whose
  half-extent is only `134.5/2×0.018 ≈ 1.21`. LED at `x=2.4` is ~2× the body half-width — floating in
  air off the narrow side. The wide-axis rim is at ≈2.0 (local Y pre-rotation). r=0.13 is
  additionally ~3% of body width and sub-pixel at chase distance 7.5+ even with `toneMapped={false}`.
- Skills lens: magic numbers with no derivation (Principle 8 — configuration over code). The "2.05"
  compensates for nothing in the normalize path and will silently break again on any remodel.
- Fix: derive from the normalized extents (or a `BOT_REST_Y` constant with a comment showing the
  derivation): rest `y ≈ 0.55`; LED to wide-axis rim, e.g. local `[0, 1.9, 0.35]` (sits on rim,
  slightly proud so it reads top-down *and* at chase angle), keep `r=0.13` (size is fine once
  attached) or bump to 0.16. Mirror-check rival ring inner radius vs footprint (X-half 1.21 /
  Z-half 2.0 — a circular 2.2–2.6 ring is loose on X; consider `2.05–2.35`).

### F3 — HIGH — Hero `ContactShadows` planes slice through the (un-leveled) body
- Where: `HeroStage.tsx:185-194` (`position y=-0.83`, bot root at `ground=-0.7` with half-height
  ≈2.0 un-leveled → body spans ≈ `-2.7…+1.3`, plane cuts the lower third);
  `HeroStage.tsx:391` (same `-0.83` for `ParkedBot`).
- Fix: falls out of F1 — after leveling, half-height ≈0.56, so shadow plane ≈ `ground-0.6`. Also
  `ROLL_R=1.5` (`HeroStage.tsx:8`) disagrees with the true scaled rolling radius (≈2.0 wide-axis);
  re-derive hop/rotation or drop the wheel-roll metaphor once the bot lies flat (a flat melty should
  *spin*, not wheel-roll — spinner rotation about world Y + scroll-linked yaw reads correctly).

## 3. Medium findings

### F4 — MEDIUM — `BuildCanvas` has no `GlErrorBoundary` (only canvas without one)
- Where: `Studio.tsx:396-482` returns bare `<div><Canvas>`; call site `Studio.tsx:1237-1249` mounts it
  with no boundary. All other canvases have one (§1 table). A GLB/decode throw here unmounts the
  whole Studio route instead of degrading.
- Skills lens: fail-safe defaults / graceful degradation (Pattern 6, Principle 7, 12) — the app
  already established the poster/fallback pattern; this is the one place it wasn't applied.
- Fix: wrap `<BuildCanvas>` at the call site exactly like the drive canvas (`Studio.tsx:988`), reusing
  the existing `glFailed` state (currently drive-only) or a small local one.

### F5 — MEDIUM — `ROLE_CSS` legend dots do not match `ROLE_PARAMS` for 2 of 6 roles
- Where: `materials.ts:20-27` vs `:32-39`. Measured: `chassis-alu` legend `#8a94a0` vs material
  `#c9ced4` (**MISMATCH** — mid-gray dot, near-white render); `fastener-dark` `#33373c` vs `#2e3237`
  (small but exact-check fails); other four roles match exactly.
- Blast radius: legends in `Studio.tsx:1265-1272`, `Explorer.tsx:282-292`, and per-row dots
  (`Studio.tsx:1354-1358`, `Explorer.tsx:390-394`) all consume `ROLE_CSS`, so the legend lies about
  the two most common hardware colors (fastener-dark = 110/145 parts).
- Fix: single-source it — derive `ROLE_CSS` from `ROLE_PARAMS` (e.g. `'#'+new THREE.Color(p.color).getHexString()`)
  or vice versa; assert equality in a unit test.

### F6 — MEDIUM — Stale hard-coded counts and grid coupling
- `Home.tsx:144` says "145 solids, 96 meshed"; `CadViewer.tsx:278` comment says "96 nodes". Measured
  from `public/cad/main-cad.parts.json`: **145 entries, 56 `dropped_from_glb`, 89 meshed**
  (`wheel-pod`: 25/11/14; teeth/undercutter unaffected). Fix both strings/comments or, better,
  compute from the manifest (Principle 8).
- Grid coupling (see F1): `gridHelper args=[12,24] … position y=-2.2` is correct *only* for the
  current edge-on orientation (bottom ≈-2.0). After the F1 fix it must be ≈-0.6. Not "stale" today —
  but the constant is unexplained; comment the derivation (`bottom = -2 + margin` today).

### F7 — MEDIUM — Rival distinguishability is thin: identical role paint + one flat ring
- Where: `Studio.tsx:217-231` — RivalBot renders the *same* GLB with the *same* `colorMode="role"`,
  same lighting; the only differences are the floor ring (`:235-238`, flat at y≈0.15, occluded by the
  hull itself at low chase angles) and the *absence* of the player's (currently detached, F2) LED.
- At top-down distance with spin blur, the two bots are near-indistinguishable; red-ring-only
  fails red-green color vision edge cases combined with the green player LED.
- Fix (cheap, keeps `colorMode="role"` premise): tint rival shells (e.g. reuse the existing
  `matForIndex`/emissive path with a red `emissiveIntensity`, or a second ring standing vertical as a
  beacon), and/or add a HUD off-screen/edge indicator. At minimum re-verify visually at chase
  distance after F2, with the ring radius tightened to the true footprint.

### F8 — MEDIUM — `xraySelMat` is dead code: selection invisible in x-ray mode
- Where: defined `CadViewer.tsx:133-143`, disposed `:144-150`, but the material pass `:298-300`
  assigns `xrayMat` unconditionally and returns before the selected/hovered emissive logic (`:310`).
- Fix: `o.material = selected===idx ? xraySelMat : xrayMat` (or delete `xraySelMat` if x-ray
  selection is unwanted). Also note the x-ray pass skips `mat.wireframe` sync — harmless while the
  toolbars force mutual exclusivity (`CadViewer.tsx:664-680`, `Explorer.tsx:237-256`), but the
  invariant lives in UI handlers, not the material pass (Principle 7 — enforce in one place).

## 4. Low findings (fix opportunistically)

- **L1 — `meshCount` missing from material-effect deps** (`CadViewer.tsx:312`; lint flags it too).
  Pre-manifest index colors use `meshCount` as hue denominator (`:306`), then never recompute when it
  resolves — index hues shift/shock on manifest arrival. Add `meshCount` to deps.
- **L2 — Index hues go stale after manifest load.** `indexMats` are cleared only on `meshCount`
  change (`CadViewer.tsx:174-183`); mats created pre-manifest with the fallback denominator persist.
  Clear/re-key on `parts.length` change too (only affects `colorMode="index"`).
- **L3 — Studio build "visible" count includes stats-only parts** (`Studio.tsx:1250-1256` counts
  `bparts.filter(!hidden)` = up to 145; Explorer correctly reports `meshed - hidden.size`,
  `Explorer.tsx:270-272`). Use the Explorer formula.
- **L4 — Studio build `hidden` state is unwired**: initialized/reset (`Studio.tsx:655-656,1213`) and
  passed through (`:1244-1245`) but no hide/isolate-exit affordance exists in the build list
  (`:1328-1366` only select + auto-isolate) — dead prop surface. Either wire hide toggles (copy
  Explorer `toggleHide`) or remove the prop.
- **L5 — "Zoom to part" enabled for stats-only parts** (`Studio.tsx:1414-1420` disables only on
  `selected===null`; Explorer guards `dropped_from_glb` at `Explorer.tsx:85,95`). `FocusRig`
  (`CadViewer.tsx:377-382`) silently no-ops for dropped idx — safe, but the button promises a zoom it
  never performs. Disable + tooltip like Explorer.
- **L6 — `onCreated` inconsistency**: drive canvas (`Studio.tsx:992-995`) omits `outputColorSpace`;
  reduced-motion hero canvas (`HeroStage.tsx:379-382`) omits `outputColorSpace` + exposure. Harmless
  (three defaults to sRGB) — set all three lines everywhere for uniformity.
- **L7 — `StlOverlay` leaks on unmount** (`CadViewer.tsx:431-459`, `:529-532`): previous-geometry
  disposal on replace/Remove is correct, but unmount with an overlay mounted never disposes `stlGeo`.
  Add an unmount effect. (Drive `DriveTrail` `:327-333`, `ARENA_EDGE` module-level, and role/plain
  clone cleanup `:248-258` are all correct — verified.)
- **L8 — `loadParts` swallows failures silently** (`CadViewer.tsx:55-71`: `catch → []`). Whole-bot
  gray (`fastener-dark` fallback) with zero signal is exactly the un-diagnosable 2 AM failure
  Principle 10 warns about. Log once (`console.warn` with modelId + url) and surface a "roles
  unavailable — showing base metals" status line.
- **L9 — Role-mode first-paint flash**: before the manifest arrives every mesh renders
  `fastener-dark` (`CadViewer.tsx:270`), then pops to true roles. Acceptable, but prefer holding the
  poster/skeleton until `parts.length>0` in Explorer/Build (Hero already does this right).
- **L10 — Studio build list has no loading skeleton** (maps `bparts` directly; empty during fetch),
  unlike Explorer (`Explorer.tsx:352-357`). Copy the skeleton rows.

## 5. Verified-correct (no action)

- **Parts indexing with `dropped_from_glb` gaps: CORRECT.** `cad_convert.py:281-296` writes GLB nodes
  as `solid_{originalIdx:03d}` and `parts.json` rows for *all* 145 solids in order; the viewer parses
  `/^solid_(\d+)$/` up the ancestor chain (`CadViewer.tsx:209-221`) and indexes `parts[idx]`
  (`:270`) — never bounded by mesh count. `matForIndex` total prefers `parts.length` (`:306`).
  Explorer/Studio guards for hide/isolate/focus on dropped entries are present and safe.
- **Clone/dispose discipline: CORRECT** (one L7 exception). Per-mesh role/plain clones with
  dispose-before-recreate + unmount cleanup (`:229-258`); `indexMats` map disposal (`:174-183`);
  shared `xrayMat` intentionally never per-mesh disposed; `roleMaterial()` template cache is only
  ever copied from, never mutated (`:271-273`); `DoubleSide` everywhere so sheet solids never cull;
  metalness restrained 0.0–0.75 so roles read with *and* without env (matches the file comment).
- **X-ray/wireframe paths: sound** modulo F8. Mutual exclusivity enforced in both toolbars; visibility
  (`hidden`/`isolated`) runs in its own effect (`:279-287`, cheap per slider tick, no allocs) —
  a clean separation-of-rates split (Principle 6).
- **Scale normalize `4/maxDim`: consistent** in `ExplodingModel` (`:152-164`) and `StlOverlay`
  (`:432-447`); STL overlay and GLB align (both Z-up, both centered) — orientation fix must cover
  both together (put the level *outside* both, at the placement-group level).
- **Tone mapping / clear colors / dpr**: `NeutralToneMapping` + exposure 1.0 everywhere; white clear
  for workshop canvases, transparent for hero; `dpr={[1,1.5]}` (hero mobile `[1,1]`) — sane.
- **Frameloop discipline**: hero scroll canvas `frameloop={inView?'always':'never'}` + IO-gated
  (`HeroStage.tsx:166,273-280`); `DriveTrail` samples at 20 Hz (`Studio.tsx:342`) not per-frame —
  good rate hygiene. `spin && !reduced` respected in all four spinnable canvases.
- **Route-level resilience**: `App.tsx:19-29` + `Home.tsx:113-124` suspense shells with poster
  fallbacks; `preloadAll`/`preloadExplorer` exported for route prefetch.

## 6. `npm run lint` / `npm run build` (run by auditor, 2026-09-18)

- `npm run lint` → **exit 0, warnings only** (oxlint). Relevant to this audit: only one
  render-logic warning — `CadViewer.tsx:306:66 react-hooks(exhaustive-deps): missing dependency
  'meshCount'` (filed above as L1). Remainder are fast-refresh component-export style notes
  (`CadViewer.tsx:73,744`, `Explorer.tsx:477`, `Bom.tsx:4`), `set-state-in-effect` notes on
  mount-sync effects, and mutability notes on the `shared`/`lineObj` ref patterns — no errors.
- `npm run build` → **PASS** (`tsc -b && vite build`, 743 ms, 589 modules). Output noted for
  follow-up only: `CadViewer-*.js ~1026 kB (gzip ~278 kB)` dominates the bundle (three+drei) —
  consider route-lazying the workshop canvases if FCP regresses; not a render-correctness issue.

## 7. Skill-application notes (why this shape of audit)

- *Design Patterns, P5 HAL / P7 sim-to-real*: orientation convention leaking into 6 call sites is
  the same defect class as hardware leaking into application code — fixed by one leveling
  abstraction all placements depend on.
- *Principles P1 SRP*: `ExplodingModel` (~230 lines: fetch-join + normalize + explode + materials +
  picking) is a god component that made F1/F8 easy to miss; any refactor should split
  normalize → explode → paint → pick into composable units (P11) rather than adding a 7th concern.
- *P7/P12 fail-safe + graceful degradation*: poster/`GlErrorBoundary`/stats-only guards are the
  codebase's best-established pattern — F4 is literally the one canvas where it was forgotten.
- *P8 configuration over code*: F2/F3/F6 are all unexplained constants (2.05, 2.4, −0.83, −2.2,
  ROLL_R 1.5, spread 2.6) that each encode an assumption about geometry; deriving them from the
  normalized bounding box (with the derivation in a comment) prevents the next remodel from
  silently re-breaking the look.
- *P10 observe everything*: L8 — a failed `parts.json` fetch currently degrades the entire paint
  system with no log line; one `warn` + status affordance closes the hole.

## 8. Proposed fix order (single pass, ~1–2 h)

1. F1 leveling wrapper + use in all 6 placements (fixes orientation everywhere incl. Hero motion).
2. F6 grid/shadow/ground constants re-derived in the same diff (they're coupled to F1).
3. F2 rest height + LED placement (same visual-verification session, chase + top cams).
4. F5 single-source legend colors (+ test). 5. F4 boundary. 6. F7 rival marker. 7. F8/L1–L10 sweep.
Re-verify visually: default orbit view (plates horizontal), explode slider, index/role/plain modes,
x-ray+select, dropped-part Zoom (no-op + disabled), drive chase + top, hero scroll + reduced-motion,
all at mobile + desktop widths.

*Read-only audit — no source files modified. All line refs pinned to the working tree as of 2026-09-18.*
