als---
description: Run 5-loop x 10-agent gauntlet to make the site and bot better. Use for full hardening passes.
agent: build
---

# Master Gauntlet — Site + Bot (5 loops x 10 agents)

Focus override: $ARGUMENTS
If empty, cover BOTH site (`web/`) and bot (physical 3lb meltybrain: `firmware/README.md`, `web/src/pages/Studio.tsx` drive physics, `BOM.md`, `manufacturing/`, `build-guide/`).

## Scope (source of truth)

- Site: `web/src/App.tsx`, `web/src/pages/` (Home, Studio, Explorer, Bom, Engineering, Pages), `web/src/components/` (CadViewer, HeroStage, Layout), `web/src/data/`, `web/README.md`, `render.yaml`
- Bot: `firmware/README.md` (Teensy 4.0 + H3LIS331DL + AM32 DShot600 + SBUS/ELRS, failsafe mandatory), `web/src/pages/Studio.tsx` `stepDrive()` physics, `BOM.md`, `manufacturing/P1-mass-audit.md`, `manufacturing/materials-guide.md`, `build-guide/`
- Constraints: light-mode pit-sheet aesthetic, hash routing (no rewrites), `prefers-reduced-motion`, GLB per-solid nodes, mass truth in `*.parts.json`, weight cap 1361g (3 lb = 1360.8 g), advisory-only pit AI per SPARC 6.4.3

## Step 0 — Load skills (required, do first)

Use the native `skill` tool:

1. List skills to confirm discovery.
2. Load and apply (at least):
   - `robotics-software-principles` — SOLID, fail-safe defaults, graceful degradation
   - `robotics-design-patterns` — FSM/safety/watchdog thinking for spin + failsafe + rival AI
   - `robotics-testing` — pytest/launch_testing mindset → translate to `oxlint` + `tsc` + `vite build` + manual drive-test checklist
   - `robot-bringup` — boot interlock, systemd/watchdog analogies, graceful shutdown, log rotation
   - `robotics-security` — failsafe isolation, e-stop separation, telemetry exposure review
   - `robot-perception` — pit-camera / optical-flow claims review (advisory only, never drives)
   - `ros2-web-integration` — telemetry dashboard / WebSocket patterns for pit Pi UI
3. Load superpowers skills via `skill` tool: `systematic-debugging`, `verification-before-completion`, `brainstorming` (if present — list first, load what exists). Apply their workflows: reproduce → fix → verify, no unverified claims.

Cite in your final report which skills drove which changes.

## The 10 subagents (spawn ALL 10 in parallel every loop)

Dispatch with the `task` tool, `subagent_type: "general"` (use `"explore"` for agents 2+3 if read-heavy). Each gets: scope files, applicable skills, current loop number + prior loop's unresolved list, and instruction to return: FINDINGS (file:line + severity) + PROPOSED DIFFS (minimal) + VERIFY STEPS. No agent edits files — main agent applies edits after dedupe.

1. **site-ux-a11y** — Keyboard/ARIA in Studio viewport + joystick, focus traps, Esc/blur disarm, screen-reader HUD, mobile touch, `prefers-reduced-motion`, light-mode contrast. Skills: superpowers a11y habits.
2. **site-3d-perf** — `CadViewer.tsx`, `HeroStage.tsx`, `Studio.tsx` Canvas: DPR caps, tone mapping, DoubleSide cost, GLB sizes (main-cad 4MB), explode/isolate paths, `GlErrorBoundary` fallback, memory disposal. Skills: `robotics-software-principles` (rate separation).
3. **site-pages-correctness** — Routes in `App.tsx`, lazy pages, `buildGuide.ts`/`content.ts` vs `build-guide/`, BOM weights vs P1 audit, dead links, hash-routing safety. Skills: `verification-before-completion`.
4. **bot-physics-fidelity** — `stepDrive()` in `Studio.tsx`: RPM tau up/down, GRIP_LO 1400 / GRIP_HI 3100 curve, K_ACCEL/DRAG/BRAKE, wall scrub vs real stall, collision RPM loss (0.75x), rival AI lead/wobble. Must match `firmware/README.md` intent: no RPM = no move. Skills: `robotics-design-patterns`, `robotics-software-principles`.
5. **bot-firmware-failsafe** — `firmware/README.md` + `build-guide/03-testing-and-driving.md`: TX-off stop <1s, brown-out behavior, boot interlock, config backup, match-day freeze, one-gain-at-a-time logging. Flag anything the site teaches that violates this. Skills: `robot-bringup`, `robotics-security`.
6. **bot-mechanical-mass** — `BOM.md` + `manufacturing/P1-mass-audit.md` + `materials-guide.md` vs site Bom/Parts pages: 1361g cap, steel-vs-Ti branches, heuristic role colors labeled as heuristic. Skills: `robotics-software-principles` (fail-safe defaults).
7. **docs-consistency** — `README.md`, `web/README.md`, `build-guide/00-start-here.md`, `manufacturing/pcbway/README.md`, `ORDER-CHECKLIST.md`: tracker steps match pages, export instructions match `tools/cad_convert.py`, no stale CAD numbers. Skills: `verification-before-completion`.
8. **qa-testing** — Run `cd web && npm run lint`, `npm run build`, `npm run preview` (report failures with logs). Drive-test checklist: arm → spin-up → translate → brake → reset → rival on/off. Skills: `robotics-testing`, `systematic-debugging`.
9. **deploy-security-perf** — `render.yaml` (static, Node 22.12, headers, asset caching, buildFilter), bundle audit, telemetry/pit-Pi pages must be advisory-only, no secrets in client. Skills: `robotics-security`, `ros2-web-integration`.
10. **red-team-critic** — Break everything: spam keys, hold Shift forever, yank focus mid-drive, isolate every part, block WebGL, 320px viewport, wrong CAD units. Rank top 5 risks with repro steps. Skills: all — adversarial.

## Loop protocol (exactly 5 loops, escalating bar)

- **Loop 1 — crashes & lies:** broken builds, runtime exceptions, dead routes, failsafe violations, wrong weights. Fix all P0.
- **Loop 2 — correctness:** physics curve vs real melty truth, HUD numbers match sim, BOM/audit/CAD agree, guides match firmware.
- **Loop 3 — UX/a11y:** keyboard-only full drive, SR announcements, touch joystick, reduced-motion, mobile 360px, contrast.
- **Loop 4 — perf/hardening:** bundle + GLB load, DPR, memoization, trail buffer, camera lerp, deploy headers/cache, error boundaries.
- **Loop 5 — polish & freeze:** copy tone, spec plates, final `lint` + `build` clean, drive-test video checklist, docs updated.

Per loop:
1. Spawn all 10 agents in parallel (single block of `task` calls).
2. Dedupe findings (severity P0 > P1 > P2), drop contradicts-physics suggestions.
3. Apply minimal diffs (preserve aesthetic + routing + Z-up CAD leveling).
4. Verify: `cd web && npm run lint && npm run build` must pass before next loop. Log failures + fixes.
5. Carry unresolved P1/P2 to next loop with higher scrutiny. Stop only after loop 5.

## Done criteria

- `npm run lint` + `npm run build` clean, `preview` smoke-tested
- Studio drive: no-RPM-no-move holds, brake/reset/disarm reliable, rival collision sane, HUD truthful
- Failsafe + advisory-only AI statements present and consistent everywhere
- Weights ≤1361g story consistent (BOM ↔ audit ↔ site)
- Final report: per-loop summary, skills cited per change, files changed, verify logs, residual risks + next-match test plan
