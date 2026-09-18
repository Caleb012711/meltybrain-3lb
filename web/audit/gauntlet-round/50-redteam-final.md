# 50 — Red-team final (quality attacker, post-fix wave)

Skills read and named: `robotics-security` (SROS2/DDS, network, e-stop, supply-chain) and
`robotics-testing` (pyramid, mocks, property/golden-file, anti-patterns). Attack lens applied to
QUALITY: Euler/leveling, routing/assets, state edges, mobile/touch, a11y, plus `npm run lint` + `npm run build`.
Lint: 0 errors, warnings only (fast-refresh, set-state-in-effect, ref-during-render).
Build: clean (`tsc -b && vite build`, ~1.07 s). Manifest checked: 145 parts, 56 dropped stats-only, zero bad bboxes.

## Ranked findings (repro + file:line + severity)

1. [Low-Med] Joystick pointer-capture-loss deadlock — `src/pages/Studio.tsx:838-874`.
   Repro: touch-drag stick, OS gesture/alert fires `lostpointercapture` (no handler; only
   `onPointerCancel`→up is wired). `stickId.current` stays non-null, so the `phase==='down'`
   guard (`if (stickId.current !== null) return`) blocks every future drag — stick dead until
   remount. Also no `releasePointerCapture` on up. Fix: handle `onLostPointerCapture` same as up.
2. [Low-Med] Route-change focus loss (SPA + sticky pill nav + drawer) — `src/components/Layout.tsx:39-45`,
   `src/components/Sidebar.tsx:42-45`. Repro: open drawer, Tab into a drawer link, click it —
   `onClose()` on pathname change drops focus to `<body>`; `ScrollToTop` scrolls but never moves
   `document.activeElement` or an `h1[tabindex=-1]`. SR users get no route announcement.
   Fix: focus main heading on pathname change, return focus to trigger when drawer closes via navigation.
3. [Low] Cloned GLTF scenes never dispose geometry on model switch — `src/components/CadViewer.tsx:152-164`.
   Repro: toggle Full→Pod→Teeth→Undercutter repeatedly; `gltf.scene.clone(true)` per switch leaks
   GPU buffers (only clones/xray/indexMats are disposed). Long explorer sessions grow memory.
   Fix: traverse old clone and dispose geometries/materials on `[scene]` cleanup.
4. [Low] `FocusRig` flies camera to hidden/isolated-away parts — `src/components/CadViewer.tsx:380-384`,
   `src/pages/Explorer.tsx:143-145`. Repro: hide #N (eye), then double-click its list row
   (focus still fires via selection path) — camera animates to an invisible target; user sees empty
   viewport drift. `Box3.setFromObject` ignores `visible=false`, so no NaN, just confusion.
   Fix: skip `visible===false` meshes in the focus search, or clear focus on hide.
5. [Low/Info] `DriveTrail` generation sniffed during render — `src/pages/Studio.tsx:317-322` (lint `refs`
   warnings confirm). Repro: press Reset (R) mid-trail — `trailGen.current` bumps, but `gen` prop is
   read from a ref during render so React may reuse the memo without clearing; stale orange trail
   persists one lap. Fix: lift trail generation into `useState`.
6. [Info, verified clean] Level/spin/explode composition — `CadViewer.tsx:314-318,583`,
   `Studio.tsx:122-148`, `HeroStage.tsx:47-56`. Inner `rotation.z` sits *inside* the `-PI/2 X`
   leveler, so local Z maps to world-vertical (weapon axis). Explode dirs are computed in CAD Z-up
   frame before leveling — radial in ring plane. No tumble bug.
7. [Info, verified clean] Hash-routing + assets — `main.tsx:9` (HashRouter), `content.ts:19`
   (`encodeURI`), `vite.config.ts:6` (`base:'./'`). Relative `cad/...` fetches resolve against the
   document, not the `#/` hash; spaces in `Main CAD.step`/`Wheel Pod.step` encode correctly;
   disk case (`Main CAD.step` vs `main-cad.glb`) matches code exactly; `.parts.json`/`.stl`
   derivations exist on disk. Corrupt-`localStorage` tour is existence-checked only, no `JSON.parse`.
   SR live regions are 4 s state-class gated (`Studio.tsx:727-765`), not 10 Hz. 360 px CSS audited:
   drawer + 2-col proof/stack grids + `overflow-x:auto` table wraps — no overflow found.

## Verdict: GO

No blockers. Five lows/infos, all with repro + location above. Ship; fix #1–#2 in the next pass.
