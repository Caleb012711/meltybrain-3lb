# Gauntlet Round 23 — Regression + A11y Audit (pill nav, progress-bar removal, pill restyle, hero badges)

> Scope: `web/` recent uncommitted changes vs `HEAD`: (a) `ScrollProgressBar` deleted from `Layout.tsx`, `#progress-bar` CSS removed, `useScrollProgress` still exported in `hooks.ts`; (b) nav rebuilt as floating pill (`.nav-pill`); (c) buttons/tabs/minis/cards/viewers restyled pill + shadows; (d) hero badge row (`.hero-badges`/`.pill`) in `Home.tsx` replacing spec-plate there.
> Method: full read of `Layout.tsx`, `Sidebar.tsx`, `HeroStage.tsx`, `CadViewer.tsx`, `Explorer.tsx`, `Studio.tsx` (all), `Home.tsx`, `Pages.tsx`, `Bom.tsx`, `Engineering.tsx`, `App.tsx`, `index.css` (all 394 lines), `hooks.ts`, `content.ts`; `rg` sweeps for `progress-bar|ScrollProgressBar|useScrollProgress|spec-plate|nav-pill|hero-badges`; `git diff HEAD` for the four changed files; `npm run lint` + `npm run build` executed in `web/`.
> Read-only: no source files edited.

## 0. Skills applied (with honest fallback)

- Instructed: read `.opencode/skills/robotics-testing/SKILL.md` + `.opencode/skills/robot-bringup/SKILL.md` fully from disk (`skill` tool in this session only exposes `customize-opencode`, so bodies were read directly — same fallback pattern as round 10).
- From `robotics-testing` (577 lines): regression-testing mindset → golden-file thinking (diff HEAD as the "golden", every visual change needs a named counter-check), failure-case-first (every fallback path exercised on paper: GL fail, poster missing, reduced-motion, WebGL-off), no-`sleep()` determinism (checked rAF/scroll-listener cleanup rather than timing vibes).
- From `robot-bringup` (graceful degradation, watchdog, ordered startup/shutdown, `ExecStartPre` health gates): applied as "every fallback path must still bring the page to a safe state" — audited `GlErrorBoundary` → poster/STEP-download safe states, reduced-motion as the degraded mode, and shutdown hygiene (listener/observer/rAF disposal in `HeroStage`, `Sidebar`, `hooks.ts`).

## 1. Progress-bar removal — VERIFIED fully gone, one dead export remains

- `rg` for `progress-bar|ScrollProgressBar` across `web/src`: **zero matches**. `git diff` confirms `ScrollProgressBar` component + `<ScrollProgressBar />` usage + `useScrollProgress` import removed from `src/components/Layout.tsx`, and `#progress-bar` rule removed from `src/index.css`. No dead CSS.
- Remaining: `src/hooks/hooks.ts:66` `export function useScrollProgress()` (~27 lines, rAF-throttled scroll listener) now has **zero consumers** (only its own definition matches `useScrollProgress`).

| # | Location | Severity | Finding + proposed fix |
|---|---|---|---|
| F1 | `hooks.ts:66` | Low (dead code) | Remove the now-unused `useScrollProgress` export (or keep deliberately with a `// retained for future use` comment). It is tree-shaken so no bundle cost, but it invites accidental re-adding of the removed bar and keeps an untested scroll-listener pattern in the codebase. Fix: delete lines 66–93. |

## 2. `.spec-plate` — INTACT wherever it should remain

- CSS rule exists and is untouched in shape: `src/index.css:214-223` (top 3px ink rule, mono 12px, last-span accent). Still used in 5 places: `src/App.tsx:22` (route-loading fallback), `src/pages/Explorer.tsx:116`, `src/pages/Studio.tsx:894`, `src/pages/Bom.tsx:63`, `src/pages/Engineering.tsx:68`. All use the two-`<span>` shape the CSS targets. **PASS.**
- `src/pages/Home.tsx:108-112` intentionally replaces the hero spec-plate with `.hero-badges` (per brief). No orphan `.spec-plate` reference remains in `Home.tsx`. **PASS** (one a11y nit on the replacement itself → F4 below).

## 3. A11y pass — new pill nav

### 3a. Keyboard focus visibility — PASS with one hardening nit

- Global rule `src/index.css:42` (`:focus-visible` ink outline + paper gap + `--accent-graphic` outer ring) covers the new `.nav nav a` pill links, hamburger (`.hamburger`, `Sidebar.tsx:15-25`), drawer links/close, and all pill buttons. Active-state overrides exist for `.btn.primary` / pressed tabs (`index.css:43`) and part-list buttons (`index.css:44`). Focus is therefore visible everywhere including the new pills.

| # | Location | Severity | Finding + proposed fix |
|---|---|---|---|
| F2 | `index.css:42-43,69` | Low | `.nav nav a.active` (white on `--ink`) relies on the global ring only; the 2px `--ink` outline segment abuts the ink pill at 2px offset and contributes little. The outer orange ring still carries visibility, so this is hardening, not a failure. Fix (optional): `.nav nav a.active:focus-visible { outline-color: #fff; }` mirroring the existing `.btn.primary:focus-visible` pattern. |

### 3b. Active indication — PASS (no fix)

- Task suspected "NavLink active class only". Verified against installed `react-router`: `node_modules/react-router/dist/development/chunk-*.mjs` defaults `aria-current="page"` on active `NavLink`s, and neither `src/components/Layout.tsx:65` nor `src/components/Sidebar.tsx:116-124` overrides the `aria-current` prop — so both the pill nav and drawer links **do** expose `aria-current="page"` in the DOM plus the visual `.active` style (`index.css:69`, `:206`). Recommend a 30-second DOM spot-check (activate any route, inspect link) rather than a code change. Drawer active also adds inset accent bar. **No fix.**

### 3c. Hamburger + sidebar focus trap/return — PASS with one nit

- `src/components/Sidebar.tsx:47-79`: on open, body scroll locks, first link/close is focused, `Escape` closes **and returns focus to the trigger** (`56`, also on backdrop `87-88` and close button `105-108`), Tab wraps inside `panelRef`. Closed state sets `tabIndex={-1}` on all drawer links + close (`110,121`), `aria-hidden={!open}` + conditional `aria-modal` (`97-99`), backdrop `hidden` (`85`). At `≤900px` the inline pill nav hides (`index.css:207`) so the drawer is the single path — correct. Reduced-motion disables the slide (`208-211`) while keeping `visibility` semantics. **Solid implementation.**

| # | Location | Severity | Finding + proposed fix |
|---|---|---|---|
| F3 | `Sidebar.tsx:42-45` | Low | Route-change auto-close (`useEffect` on `location.pathname`) calls `onClose()` **without** returning focus; the focused drawer link unmounts into `tabIndex=-1` hidden content, dropping focus to `<body>` for keyboard users. Fix: in the pathname effect, `triggerRef.current?.focus({ preventScroll: true })` only if `document.activeElement` is inside the drawer, or move focus to the new page `h1`/`main`. |

### 3d. Touch targets — one real finding

| # | Location | Severity | Finding + proposed fix |
|---|---|---|---|
| F5 | `index.css:67` | Medium | `.nav nav a { padding: 8px 12px; font-size: 14px; }` with no `min-height` renders ~38px tall — below the 44px task bar (passes WCAG 2.5.8's 24px minimum, fails the 44px brief). Everything else already meets 44px: `.btn` (`88`), `.tab`/`.mini` (`114,116`), `.stack-tab` (`344-347`), `.hamburger` (`175`), `.drawer-close` (`199`), `a.drawer-link` (`200-204`), `.eye` (`263`), joystick (120px, `386`). Fix: `.nav nav a { padding: 10px 14px; min-height: 44px; display: inline-flex; align-items: center; }`. Note the pill has horizontal scroll + `scrollbar-width: none` (`65-66`), so slightly taller pills don't break the layout. |

### 3e. 360px layout — fits in practice, one fragile rule

- `≤420px` rules (`index.css:129`): brand shrinks to 13px with ellipsis, brand thumb hidden (`.brand img { display: none }`), inline nav already hidden `≤900px` so the pill holds only hamburger + brand. Content rows (`.btn-row`, `.proof`, `.hero-sticky` un-rounding) all collapse correctly.

| # | Location | Severity | Finding + proposed fix |
|---|---|---|---|
| F6 | `index.css:62 + 129` | Low | `.brand { flex: none; }` (= `flex: 0 0 auto`, no shrink) contradicts the 420px `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` — true truncation never engages; the pill survives at 360px only because the string happens to fit (~254px used of ~328px). Fix: `.brand { flex: 1 1 auto; min-width: 0; }` and `.nav-left { min-width: 0; }`. |
| F4 | `Home.tsx:108` | Low | `.hero-badges` is a plain `<div>` with `aria-label="Build status"` — `aria-label` on a generic element with no role is ignored by AT. Fix: add `role="group"` (keeps the label) — `<div className="hero-badges" role="group" aria-label="Build status">`. |

## 4. Reduced-motion path — COHERENT, PASS

- `HeroStage.tsx:201,363-398`: `reduced` returns the static hero (headline + kicker + parked canvas in `.viewer`), and the scroll-tracking effect early-returns (`250`), so no scroll/resize/lebens listeners run in this mode. `Studio.tsx:555,559,1006-1008,1014,1052-1054`: `trailOn` initialises to `!reduced`, `DriveTrail on={trailOn && !reduced}` is double-gated, spinner rotation is gated (`114`, `211`), `DriveCam` snaps instead of lerping (`284-290`), Trail/Spin buttons are `disabled` with explanatory `title` (`1053-1054`, `CadViewer.tsx:684`). `CadViewer`/`Explorer` force `spin=false` under reduced motion. `Reveal` (`Layout.tsx:14-17`), `useReveal` (`hooks.ts:23-26`), `useCountUp` (`hooks.ts:48-51`) all short-circuit to final state. Global CSS (`index.css:22-25,169,208-211`) kills smooth scroll/transitions and pins `.reveal` visible + drawer snap. The recent pill/shadow restyle only adds `transition: transform/box-shadow` (killed by the global reduced rule) and radius/shadow — no motion semantics changed. **No fix.**

## 5. Graceful degradation (bringup-lens fallback audit)

| Path | Verdict |
|---|---|
| `GlErrorBoundary` (`CadViewer.tsx:13-28`) | Works: catches render/GL errors, calls `onFail`, renders `null`. No logging — acceptable for static site, but failures are silent in telemetry. Info only. |
| Hero non-reduced (`HeroStage.tsx:410-432`) | Works: `glFailed` swaps canvas → `.hero-poster` render; loading poster fades out on `ready`. Poster `<img>` has `onError → display:none` so a missing asset degrades to headline + HUD text rather than a broken icon. No Retry (→ F7). |
| Hero reduced (`HeroStage.tsx:368-394`) | Works: same poster swap inside `.viewer`. No Retry (→ F7). |
| Hero `Suspense` fallback (`Home.tsx:113-124`) | Works for slow chunk load (static headline + poster with explicit `width/height`, good alt). Chunk *load failure* has no `ErrorBoundary` (→ F8). |
| Studio drive (`Studio.tsx:978-1021`) | Works: `glFailed` → `.viewer-fallback` render; HUD/readout/controls stay live. No Retry (→ F7). |
| Explorer (`Explorer.tsx:132-195`) | Works: `glFailed` → fallback render. No Retry and no STEP link in the failed state (→ F7). Switching models resets `failed` (`37-46`), so recovery exists but is undiscoverable. |
| `CadViewer` compact (`CadViewer.tsx:539-559`) | **Reference implementation**: fallback render + "3D failed … STEP downloads still work" + **Retry 3D** + STEP link. Copy this pattern to the three sites above. |
| Studio **build** mode (`Studio.tsx:1197-1249` via `BuildCanvas`) | **Gap (→ F9):** `BuildCanvas` mounts a second `<Canvas>` + `ExplodingModel` with **no** `GlErrorBoundary` anywhere in the build branch. A GL crash there escapes to the route `Suspense` fallback ("Loading sheet…", `App.tsx:20-28`), which is a loading state, not an error state. |
| WebGL-off | Same coverage as GL-fail rows above (R3F context-creation throw is boundary-catchable); poster/STEP paths keep content readable. Missing-asset case degrades to text (headline/HUD/readouts intact). |
| `scroll-margin-top: 112px` (`index.css:73`) | Still clears the new floating pill (~72px tall incl. `top:12px` + margin) for `#hero/#how/#stack` anchors. PASS. |

| # | Location | Severity | Finding + proposed fix |
|---|---|---|---|
| F9 | `Studio.tsx:1237-1249` | Medium | Wrap `<BuildCanvas …/>` in `<GlErrorBoundary onFail={…}>` with the CadViewer-style fallback (poster + STEP link + Retry). Currently the only viewer on the site with zero GL containment. |
| F7 | `HeroStage.tsx:410-413,369-372`; `Studio.tsx:978-986`; `Explorer.tsx:132-135` | Low | Failed states offer no Retry (CadViewer `548-549` does). Fix: add `<button className="mini" onClick={reset}>Retry 3D</button>` resetting the local `glFailed/failed` flag (and `posterGone` in Hero). Explorer: also include the per-model STEP/GLB links already present in the healthy branch (`303-313`). |
| F8 | `Home.tsx:113-124` | Low | Lazy `HeroStage` import has `Suspense` but no error boundary — a chunk-load failure is not caught by `GlErrorBoundary` (inside the chunk). Fix: wrap the `Suspense` in a tiny route-local error boundary falling back to the existing `.hero-static` block. |

## 6. `npm run lint` / `npm run build` — both GREEN

- `npm run lint` (oxlint): **exit 0**, 0 errors, 27 warnings — all pre-existing idiom warnings (`set-state-in-effect` in `hooks.ts`/`CadViewer`/`Explorer`, `immutability` on THREE mut refs in `HeroStage`/`Studio`, `only-export-components` for shared `CadViewer`/`Bom` helpers). None introduced by the pill/progress/badge edits (no new warnings reference `Layout.tsx:47-72`, `.nav-pill`, `.hero-badges`, or removed `#progress-bar`).
- `npm run build` (`tsc -b && vite build`): **exit 0** in ~0.8s, 589 modules, all chunks emitted (`CadViewer` 1025 kB / 278 kB gzip is the known 3D chunk, under the 1200 kB `chunkSizeWarningLimit`). No type errors — dead `useScrollProgress` export typechecks fine.

## 7. Full findings index

| # | File:line | Sev | One-liner |
|---|---|---|---|
| F1 | `hooks.ts:66` | Low | Remove dead `useScrollProgress` export |
| F2 | `index.css:42-43,69` | Low | Optional explicit `:focus-visible` for `.active` pill |
| F3 | `Sidebar.tsx:42-45` | Low | Route-change close drops keyboard focus to body |
| F4 | `Home.tsx:108` | Low | `aria-label` on role-less div ignored → add `role="group"` |
| F5 | `index.css:67` | Medium | Pill nav links ~38px tall, below 44px bar |
| F6 | `index.css:62,129` | Low | `flex:none` defeats brand ellipsis at narrow widths |
| F7 | Hero/Studio-drive/Explorer failed states | Low | No Retry 3D (CadViewer has one) |
| F8 | `Home.tsx:113-124` | Low | No error boundary for HeroStage chunk-load failure |
| F9 | `Studio.tsx:1237-1249` | Medium | Build-mode canvas has no `GlErrorBoundary` at all |
| — | lint / build | Info | Both green (0 errors; 27 pre-existing warnings) |

## Verdict: **GO** (non-blocking; land F5 + F9 as fast follows)

Progress-bar removal is complete with no dead CSS; spec-plate, pill restyle, and hero badges are all wired to real rules and render paths; pill-nav a11y (focus visibility, `aria-current="page"` via NavLink default, drawer trap/return, 360px collapse) and reduced-motion coherence all pass; lint + build are green. The two Mediums (44px nav-link targets, unguarded Studio build canvas) and seven Lows affect edge cases only and have concrete one-line fixes above.
