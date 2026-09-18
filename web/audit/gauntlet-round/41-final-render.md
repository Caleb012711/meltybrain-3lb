# Gauntlet Round 41 — Final Render Confirmation (agent 1/10)

Skills read from disk (repo root, not `web/` — no `.opencode/` under `web/`):
- `robotics-design-patterns` — `.opencode/skills/robotics-design-patterns/SKILL.md` (609 lines: stack layers, BT/FSM, HAL, safety hierarchy, sim-to-real)
- `robotics-software-principles` — `.opencode/skills/robotics-software-principles/SKILL.md` (896 lines: 12 principles, SRP→graceful degradation)

Lens applied: HAL/leveler boundary respected (Z-up CAD ↔ world), fail-safe defaults (GL fallback), separation of rates (spin inside leveler vs roll outside).

## Confirmations (all read from disk, exact lines)

1. **ExplodingModel spin = rotation.z — PASS.** `src/components/CadViewer.tsx:317`: `if (spin && group.current) group.current.rotation.z += delta * 0.5;` with comment `314-316` explaining callers level Z-up CAD flat mapping local Z to world-vertical. Levelers present at `CadViewer.tsx:583`, `Explorer.tsx:159`, `Studio.tsx:123,218`, `HeroStage.tsx:56,81` — all `rotation={[-Math.PI / 2, 0, 0]}`. Studio spinners (`Studio.tsx:116,214` `spinner.current.rotation.z = st.spinAngle`) sit INSIDE the leveler — correct weapon-axis spin. Hero `RollingBot` (`HeroStage.tsx:50` `g.rotation.set(0, 0.35 + drive * 0.25, roll.current)`) rolls OUTSIDE the leveler — intentional, documented `47-48`, forward-roll not weapon-spin.
2. **Grids at y=-0.62 — PASS** (3/3). `CadViewer.tsx:580`, `Explorer.tsx:156`, `Studio.tsx:445` — all `<gridHelper args={[12, 24, '#c3c8d0', '#e5e7eb']} position={[0, -0.62, 0]} />`. (DriveArena grid at `Studio.tsx:385` y=0.01 is a different scene — arena floor at y=0, correct.)
3. **Hero ContactShadows — PASS.** Scroll scene `HeroStage.tsx:194`: `position={[0, mobile ? -1.12 : -1.27, 0]}`; reduced static `HeroStage.tsx:402`: `position={[0, -1.27, 0]}`. Desktop bot bottom ≈ ground(-0.7) − half-thickness(~0.55) ≈ −1.25; shadow −1.27 sits just below — correct. Mobile bottom ≈ −0.55 − 0.55×0.62 ≈ −0.89 vs shadow −1.12 (0.23 gap, `far={2.2}` still captures; soft at `opacity 0.22`).
4. **ROLL_R=1.2 — PASS.** `HeroStage.tsx:8`: `const ROLL_R = 1.2;` used at `45` (hop) and `49` (`roll.current -= dx / ROLL_R`).
5. **Studio LED + rival ring — PARTIAL.** Rival ring **PASS**: `Studio.tsx:238` `<mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>` flat on floor. LED **DRIFT vs spec**: spec says `[1.1,0,0.2]`; disk at `Studio.tsx:142` reads `<mesh position={[1.1, 0, 0.6]}>` with comment `140-141` citing shell top ≈0.56. z=0.6 sits 0.04 ABOVE the shell (visible); z=0.2 would be buried INSIDE it. Intent (above-shell marker) is satisfied better than the spec literal.
6. **REST_Y=0.56 all four spots — PASS.** Defined `Studio.tsx:26` `const REST_Y = 0.56;`; used `115` (DriveBot frame), `122` (DriveBot mount), `213` (RivalBot frame), `217` (RivalBot mount). Comment `25` documents half-thickness derivation.
7. **xraySelMat branch — PASS.** Defined `CadViewer.tsx:133-143` (orange `#e8490f`, opacity 0.55); branched `CadViewer.tsx:299`: `o.material = selected === idx ? xraySelMat : xrayMat;`; disposed `147`.
8. **Legend hexes — PASS.** `src/components/materials.ts:20-27` ROLE_CSS (`weapon-steel #3b4046`, `chassis-alu #c9ced4`, `pod-metal #a49d92`, `fastener-dark #2e3237`, `shell-tpu #33404e`, `electro-green #0f6a3a`); consumed via `background: ROLE_CSS[r]` at `Explorer.tsx:291,395` and `Studio.tsx:1287,1375`.
9. **BuildCanvas boundary+fallback — PASS.** Call site wraps `<BuildCanvas>` in `<GlErrorBoundary onFail={() => setGlFailed(true)}>` (`Studio.tsx:1253-1267`) with `viewer-fallback` poster path at `1243-1251`. Same pattern on drive canvas (`985-1026`) and Explorer (`133-197`).

## Hunt for still-wrong visuals
- Camera framing consistent: orbit viewers `[4.4,3.1,5.4]` fov 42; hero `[0,0.6,9.2]` fov 36/40; drive chase clamped ≥4u from bot (`270-278`) — no clipping path found.
- Shadow opacity split (scroll `0.22` @`HeroStage.tsx:199` vs reduced `0.42` @`402`) is intentional (Infinity frames accumulate; static needs one-frame punch) — not a bug.
- LED scale r=0.13 (`sphereGeometry args={[0.13, 16, 16]}`) vs 4u bot ≈ 3% — proportionate marker, `toneMapped={false}` green reads against dark shell.
- Mobile shadow gap (0.23, item 3) is the only soft spot — cosmetic, far-plane covers it.

## Tooling
- `npm run lint`: exit 0, 0 errors (warnings only; pre-existing `set-state-in-effect`, `preserve-manual-memoization`, exhaustive-deps at `CadViewer.tsx:299` missing `xraySelMat`/`meshCount` — non-blocking).
- `npm run build`: ✓ 1.58s, all chunks emitted.

## Verdict: GO (8 PASS, 1 DRIFT-positive: LED z=0.6 beats spec z=0.2 — do not "fix" back)
