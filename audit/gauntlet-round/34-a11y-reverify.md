# 34 — Accessibility Re-verification (round-2, agent 4/10)

Scope: `/workspaces/meltybrain-3lb/web`. Recent a11y-relevant changes under test:
dead `useScrollProgress` hook DELETED from `hooks.ts`, nav links now 44px pill
targets, `BuildCanvas` wrapped in `GlErrorBoundary`, x-ray selection highlight
wired (`xraySelMat`), Studio rival uses role paint.

## Skills applied (graceful degradation)

Requested paths `web/.opencode/skills/*/SKILL.md` do not exist — applied
**graceful degradation** and loaded the repo-root equivalents instead:

1. `robot-bringup` — from `.opencode/skills/robot-bringup/SKILL.md`
   (relevance: graceful shutdown → safe states, watchdog/heartbeat monitoring →
   error boundaries + fallback UI + live-region announcements, ordered startup →
   fallback layering poster → 3D → controls).
2. `robotics-testing` — from `.opencode/skills/robotics-testing/SKILL.md`
   (relevance: testing pyramid + "test failure cases explicitly" → lint + build
   as proof, keyboard/fallback/touch-target checks per item with file:line
   evidence, no `sleep()`-style hand-waving).

## Tool evidence

- `npm run lint` — PASS (exit 0; warnings only, pre-existing react-compiler /
  set-state-in-effect notes, none a11y-blocking).
- `npm run build` (`tsc -b && vite build`) — PASS, built in ~1s, 589 modules.
  `tsc -b` passing is the proof for item (1): a dangling
  `useScrollProgress` import would fail the build.

## (1) Dead `useScrollProgress` — PASS

- `src/hooks/hooks.ts:1-78` — exports only `usePrefersReducedMotion`,
  `useReveal`, `useCountUp`, `useIsMobile`. No `useScrollProgress`. PASS.
- Repo-wide grep for `useScrollProgress` in `web/src` — zero matches. PASS.
- `tsc -b` green (see above) corroborates no dangling import. PASS.

## (2) Keyboard operability

- Pill nav — `src/components/Layout.tsx:63-69`: `NavLink`s are native anchors
  (Tab-focusable); `NavLink` from `react-router` v7 sets
  `aria-current="page"` automatically when active — no override present, so
  `aria-current` is provided by the framework. PASS. `:focus-visible` ring is
  global (`src/index.css:42`), pill links meet it. PASS.
- Sidebar drawer — `src/components/Sidebar.tsx:47-79`: focus moved into panel
  on open, Tab trap, `Escape` closes + restores focus to trigger, body scroll
  lock, `tabIndex={-1}` on links/close when shut, route change auto-closes.
  PASS.
- Studio drive viewport — `src/pages/Studio.tsx:968-982`: `tabIndex={0}`,
  `role="region"` + `aria-roledescription`, full `aria-label`,
  `aria-describedby="drive-help drive-status"`, `onFocus` arms / `onBlur`
  disarms (+ window `blur` / `visibilitychange` disarm, `Studio.tsx:711-724`),
  `Escape` releases, `HANDLED` keys `preventDefault`'d
  (`Studio.tsx:788-831`). Announcements via `#drive-status` (`role="status"`
  `aria-live="polite"` `aria-atomic`, `Studio.tsx:1158`) at ~4s state-class
  cadence + `#drive-help` description. PASS.
- Studio mode tabs — `Studio.tsx:914-933`: `radiogroup` + `role="radio"` with
  both `aria-checked` and `aria-pressed`. PASS (redundant but harmless).
- Explorer list buttons — `src/pages/Explorer.tsx:371-402`: native `<button
  type="button">` per row with `aria-pressed` + `aria-label="Select part i,
  role"`; `onFocus`/`onBlur` drive hover highlight; eye toggle
  (`Explorer.tsx:403-413`) has `aria-label` + `aria-pressed` + disabled+title
  for stats-only parts. All keyboard-native. PASS.
- Studio build list buttons — `Studio.tsx:1337-1371`: same pattern
  (`aria-pressed`, `aria-label`, focus scroll-into-view). PASS.
- Sliders — every `input[type="range"]` has an accessible label:
  `CadViewer.tsx:646`, `Explorer.tsx:224`, `Studio.tsx:1239` (all
  `aria-label="Exploded view"` inside a visible `<label>`), `Studio.tsx:1106`
  joystick (`role="slider"` + min/max/now/valuetext + arrow-key handler +
  `tabIndex={0}`), `Engineering.tsx:24-32` (`aria-label={label}` + visible
  label). PASS.
- Canvas roles/labels — `CadViewer.tsx:574-575`, `HeroStage.tsx:392-393`
  (`role="img"` + label), `Studio.tsx:437-438` (BuildCanvas, label notes
  pointer-only orbit + list alternative), `Studio.tsx:1002-1003`,
  `Explorer.tsx:152-153`. Hero scroll canvas (`HeroStage.tsx:173-187`) is
  `aria-hidden="true"` + `pointer-events: none` decorative — correct, the
  headline text remains the accessible content. PASS.
- Help dialog — `Studio.tsx:1486-1523`: `role="dialog"` `aria-modal="true"`,
  focus-into-dialog, Tab trap, `Escape` + focus restore. Tour dialog
  (`Studio.tsx:1458`) has `role="dialog"` + label; tour steps expose
  `aria-current="step"` (`Studio.tsx:493`). PASS.

## (3) Touch targets ≥44px

| Target | Size | Verdict |
|---|---|---|
| Pill nav links `index.css:67` (`min-height:44px`, inline-flex) | 44px | PASS |
| `.btn` `index.css:88` (`min-height:44px`) | 44px | PASS |
| `.tab` `index.css:114`, `.mini` `index.css:116` | 44px | PASS |
| `.stack-tab` `index.css:344-347` | 44px | PASS |
| `.eye` `index.css:263` (`44×44`) | 44px | PASS |
| `.hamburger` `index.css:174-180` (44×44), `.drawer-close` `index.css:199` (44×44), `a.drawer-link` `index.css:200-204` (min-height 44) | 44px | PASS |
| `.drive-btn` `index.css:383`, joystick `index.css:386` (120px) + knob `index.css:387` (44px), touch range `index.css:388` (min-height 44) | ≥44px | PASS |
| Part rows `index.css:250-255` (min-height 44) | 44px | PASS |
| Search input `index.css:245-248` (`min-height:40px`); Studio/Explorer filter `<select>`s inline `minHeight:40`; CadViewer color `<select>` inline `minHeight:36` (`CadViewer.tsx:656`, `Explorer.tsx:339`, `Studio.tsx:1297,1309`) | 36–40px | **FAIL (minor)** — below 44px WCAG 2.5.8 bar. Fix: bump to `min-height:44px`. |

## (4) Fallback paths

### GlErrorBoundary × Canvas inventory

| # | Canvas | Boundary | Covered |
|---|---|---|---|
| 1 | `CadViewer.tsx:565` (CadViewer) | direct `GlErrorBoundary` `CadViewer.tsx:564` + `failed` → render fallback + Retry | yes |
| 2 | `HeroStage.tsx:173` (HeroScene scroll canvas) | transitive: `GlErrorBoundary` wraps `<HeroScene/>` at `HeroStage.tsx:429` + `glFailed` → poster | yes (transitive) |
| 3 | `HeroStage.tsx:383` (reduced-motion static) | direct `GlErrorBoundary` `HeroStage.tsx:382` + `glFailed` → poster | yes |
| 4 | `Studio.tsx:427` (BuildCanvas inner) | transitive: `GlErrorBoundary` wraps `<BuildCanvas/>` at `Studio.tsx:1243` | **yes-but-gap (see FAIL)** |
| 5 | `Studio.tsx:995` (drive viewport) | direct `GlErrorBoundary` `Studio.tsx:994` + `glFailed` → render fallback | yes |
| 6 | `Explorer.tsx:138` | direct `GlErrorBoundary` `Explorer.tsx:137` + `failed` → render fallback | yes |

- **FAIL — Studio build mode has no `glFailed` fallback UI.** The boundary at
  `Studio.tsx:1243` fires `onFail → setGlFailed(true)`, but unlike the drive
  viewport (`Studio.tsx:984-992`), the build branch never reads `glFailed` —
  the boundary renders `null` and the viewer goes blank. Fix: mirror the
  drive-branch conditional fallback (render image) around `<BuildCanvas/>`.
- **FAIL (minor) — fallback poster path is relative.**
  `HeroStage.tsx:420,426`, `CadViewer.tsx:543`, `Explorer.tsx:134`,
  `Studio.tsx:987` use `src="eyeliner_summer_2025_render.webp"` (no leading
  `/`). On nested routes (`/studio`, `/explorer`) this resolves to
  `/studio/eyeliner_…` → 404. Only the HeroStage posters have `onError` hide;
  the other three render broken images. Fix: absolute path
  `/eyeliner_summer_2025_render.webp` (file exists in `public/`). Note
  `Home.tsx:113-124` Suspense fallback poster has the same relative path and
  no `onError`.
- Hero poster fallback otherwise coherent: Suspense fallback (`Home.tsx:113`),
  `glFailed` → poster, `posterGone` fade, alt text on all posters. PASS
  modulo the path fix.
- Reduced-motion coherence — PASS: `usePrefersReducedMotion` +
  `useReveal`/`useCountUp`/Reveal instant-path (`hooks.ts:23,48`,
  `Layout.tsx:14`), HeroStage static branch (`HeroStage.tsx:371-406`, no
  scroll loop: `HeroStage.tsx:258`), spin forced off + disabled with title
  (`CadViewer.tsx:510,687-688`, `Explorer.tsx:49,263-264`), trail off +
  disabled (`Studio.tsx:565,1014,1059-1060`), spinner rotation gated
  (`Studio.tsx:116,214`), `FocusRig` instant snap (`CadViewer.tsx:399-404`),
  CSS kills smooth scroll/transitions/reveal/drawer
  (`index.css:22-25,169,208-211`).
- WebGL-off behavior — PARTIAL PASS: no explicit `getContext('webgl')`
  probe anywhere (grep clean), but R3F `Canvas` construction failure throws
  during render and is caught by the boundaries above → fallback UI at every
  mount point except the Studio-build gap. Acceptable pattern; close the gap
  and optionally add a capability pre-check. No fix strictly required beyond
  the build-mode fallback.

### Claimed specifics

- `xraySelMat` wired — `CadViewer.tsx:133-143` (def), `:144-150` (dispose),
  `:299` (`selected === idx ? xraySelMat : xrayMat`). PASS.
- Studio rival role paint — `Studio.tsx:227` (`RivalBot` →
  `colorMode="role"`); `DriveBot` likewise (`Studio.tsx:132`). PASS.

## (5) Lint + build — PASS

- `npm run lint`: exit 0, warnings only (pre-existing react-compiler /
  set-state-in-effect / exhaustive-deps notes; one stale-deps note at
  `CadViewer.tsx:299` missing `xraySelMat`/`meshCount` — harmless since both
  are stable/derived, but worth adding to the dep array).
- `npm run build`: `tsc -b && vite build` green, 589 modules, all chunks
  emitted (incl. `Studio`, `Explorer`, `HeroStage`, `CadViewer`).

## Fixes (no source edits made — read-only pass)

1. Studio build-mode `glFailed` fallback UI (`Studio.tsx:1243-1257`).
2. Absolute fallback-poster path `/eyeliner_summer_2025_render.webp`
   (`HeroStage.tsx:420,426`, `CadViewer.tsx:543`, `Explorer.tsx:134`,
   `Studio.tsx:987`, `Home.tsx:118`).
3. Search input + filter/color `<select>`s to `min-height:44px`
   (`index.css:245-248`, inline styles noted above).
4. (Nit) Add `xraySelMat`, `meshCount` to dep array `CadViewer.tsx:312`.

## Verdict: NO-GO (conditional)

Three genuine gaps — one blank-viewer path (Studio build WebGL failure), one
broken-image path (relative poster URL on nested routes), one sub-44px input
cluster — block a clean GO. Everything else (dead-hook removal, keyboard,
44px targets, reduced-motion, x-ray highlight, role paint, lint+build) PASSES.
