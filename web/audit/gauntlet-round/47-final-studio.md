# Gauntlet Round-2 Final — Studio page (agent 7/10)

Scope (ONLY): `src/pages/Studio.tsx` (1556 lines, drive + build modes).
Skills read from disk at `/workspaces/meltybrain-3lb/.opencode/skills/`:
- `robotics-design-patterns` — P6 Safety Systems (watchdog/workspace-limit hierarchy) used to judge the disarm matrix + arena boundary; P7 Sim-to-Real Architecture (HAL boundary, same-interface sim/real) used to judge role-paint honesty + fallback paths.
- `robotics-software-principles` — P6 Separation of Rates (slow producers feed fast consumers via buffers) used to judge HUD interval vs `useFrame` loop layering; P7 Fail-Safe Defaults (safe until proven otherwise) used to judge disarm/reset/brake defaults.
Method: full read of `Studio.tsx` from disk; grep-traced `hidden`/`isolated`/disarm call sites; ran `npm run lint` (exit 0) + `npm run build` (success) myself 2026-09-18.

## (1) Round-2 fixes — all present: PASS
- REST_Y: `Studio.tsx:26` (`0.56`, comment cites ~1.1-thick model half-thickness); applied `DriveBot:115,122`, `RivalBot:213,217`. PASS.
- LED steering cue: green rim sphere `DriveBot:140-145` (`[1.1,0,0.6]`, `#12b76a`, inside spinner so it rotates with bot). PASS.
- Rival ring: red flat ring `RivalBot:237-241` (`#c81e1e`, floor-level, outside bot group per comment). PASS.
- Role paint: `colorMode="role"` at all three Studio `ExplodingModel` sites (`:132` drive, `:227` rival, `:456` build). PASS (P7: same honest heuristic lens as Explorer).
- Boundary: `DriveArena:372-397` walls + floor edge; per-axis clamp+rebound `stepDrive:64-84` (min-rebound 2.5, cooldown 0.12); cam clamp `:267-278`. PASS (P6 workspace-limit analogue).
- Fallback: drive `glFailed` `:984-992` + build `:1243-1251` (static render img) behind `GlErrorBoundary` (`:994`, `:1253`). PASS (P7 graceful degradation).

## (2) Disarm matrix + reset + brake — PASS (no handler broken)
- `disarm:672-685` clears armed/keys/move/throttle/brake/brakeUi/joy/stick/thrTouch + SR text. Wired: viewport blur `:978`, Esc `:791-795`, window blur `:716`, `visibilitychange` `:712-714`. Focus re-arms `:977`. `onKeyUp` zeroes move when disarmed `:830`. PASS (P7 fail-safe default = stopped).
- `resetDrive:687-699` zeroes both bots (pos/vel/rpm/spin/throttleSm/visOmega/hitT), bumps trail gen, sets `toured` for tour step 4. KeyR `:799-801` (repeat-guarded `:797`), Reset button `:1030`. PASS. Nit: reset preserves held throttle/brake inputs (pose reset, not disarm — acceptable, arguably intended).
- Brake: Space/KeyX down `:808-811`, up `:823-828` (only releases when neither held — correct chord handling); pointer Brake `:1036-1052` (down/up/leave/cancel all clear); HUD BRAKE flag `:962-966`; `K_BRAKE` approach-to-zero `:56,61`. PASS.
- Edit-wave damage: none found — all five disarm call sites, both brake paths, and reset still reference live state/refs. (Closure note: `disarm` at `:672` references `setStick`/`setThrTouch` declared `:836-837` — safe, only *called* post-render; no TDZ issue.)

## (3) Build-mode filters + isolate/hide/zoom — CONDITIONAL PASS (1 FAIL, minor)
- Filters 44px: search input CSS `index.css:245-246` (`min-height:44px`); role/step selects inline `minHeight:44` (`Studio.tsx:1308,1321`); `.mini`/`.tab`/`.drive-btn` all 44px (`index.css:114,116,386`); count line `:1329-1331`; AND-filter memo `:876-889`; empty path + Clear filters `:1386-1403`. PASS.
- Isolate: auto-isolate on select `:1354` (dropped-guard `!p.dropped_from_glb`), status + Exit-isolate `:1271-1283`, plumbed to canvas `:1262→460`, effect `CadViewer.tsx:285`. PASS. Nit: deselecting (toggle-off `:1353`) leaves `isolated` stale — banner persists after Clear until Exit-isolate.
- **FAIL (minor) — hide path dead:** `hidden` state (`:661`) is passed to canvas (`:1261→459`) and reset on model switch (`:1219`), but `setHidden` has NO other call site in Studio (grep: only `:1219` mutates) — no eye/hide button exists in build mode, unlike Explorer (`Explorer.tsx:403-412,463`). Status `:1273` always reports full count. State is plumbed but unreachable; harmless (nothing hidden that shouldn't be) but the "hide path" does not function as a path.
- Zoom: Zoom-to-part `:1433-1439` (`disabled={selected===null}`), Reset view `:1440-1448`, `FocusRig` `:466`, dbl-click focus `:440-442`, `onPointerMissed` deselect `:439`. PASS.

## (4) Lint + build — PASS
- `npm run lint`: exit 0, warnings only (Studio-scoped pre-existing: `react(refs)` render-time ref reads `:318-321` joystick knob, `react(immutability)` trail buffer `:359,363`).
- `npm run build` (`tsc -b && vite build`): success ~2.2s, `Studio-Bo-t4kss.js` 34.37 kB emitted, no type errors.

## Fresh-eyes notes (non-blocking)
- Tour completion gates on `toured===true` (`:627`), only set by reset — R is mandatory, matches tour text `:1479`. Coherent.
- Toggle label `:1070` shows the *destination* cam (`Arena cam` when top is on) — standard toggle phrasing, no defect.
- P6 rate separation holds: HUD interval at 10 Hz (`:731`), SR announcements throttled 4 s (`:745`), physics in `useFrame` — slow UI never blocks the fast loop.

## Verdict: GO
Round-2 fixes all hold; disarm/reset/brake matrix intact; lint 0 + build green. One minor FAIL (unreachable hide control in build mode) + two nits (stale isolate on deselect, reset preserves held inputs) — none safety- or render-blocking. No source edits made (READ-ONLY).
