# Screenshot Gauntlet — one-time looped audit, 18 Sep 2026 (NOT reusable)

> Frozen to THIS repo + THE 12 exhibits in `./screenshots/` (renamed from
> camera defaults 2026-09-18). Run loops below with the `task` tool
> (10 subagents per loop, 5 loops). For future generic hardening use `/gauntlet`.
> Baseline: `npm run lint` exit 0 warnings-only; `npm run build` clean (589
> modules, CadViewer chunk 972.73 kB / 259.57 gzip).

## Step 0 — load skills (required, before loop 1)

Use the native `skill` tool: list first, then load and apply at minimum
`robotics-software-principles`, `robotics-design-patterns`, `robotics-testing`,
`robot-bringup`, `robotics-security`, `robot-perception`,
`ros2-web-integration`, plus superpowers `systematic-debugging` and
`verification-before-completion`. Cite the driving skill per verdict in §4.

## §1. Confirmed exhibits (auditor-verified 2026-09-18 — agents re-verify, don't re-derive)

- **P0 EXHIBIT A — models render near-black with white speckles:**
  `01-model-dark-render.png` (closeup: black blotchy solids, sketch-like edge
  artifacts), `10-studio-drive.png` (bot is a black silhouette; heading LED is
  a flat oversized green disc), `12-explorer.png` (dark assembly ringed by white
  speckles although the footer reads "89 meshed visible" and 56 thread specks
  are supposed to be stats-only). Suspects: heuristic role materials in
  `web/src/components/materials.ts` with no environment lighting, `DoubleSide`
  + tone mapping interaction in `CadViewer.tsx`, and/or `dropped_from_glb`
  stats-only solids leaking a wireframe/points render path.
- **P1 EXHIBIT B — nav overflows:** `02-home-hero.png`, `03-overview-melty.png` —
  the "Firmware + AI" tab is clipped at the viewport right edge with no scroll
  affordance (~1500 px wide and already clipping).
- **P1 EXHIBIT C — cap-number drift:** `03-` strip says **1360.8 g**,
  `04-` step 7 says **1361 g**, `BOM.md:56` says **1360 g**,
  `build-guide/03-testing-and-driving.md:23` says **1361 g**. One number everywhere.
- **P1 EXHIBIT D — tip-speed contradiction:** `07-engineering-calcs.png` computes
  2900 RPM × 8 in → **216.9 mph** via v=π×D×RPM/336, but the P1 mass audit
  (§"Tip-speed check") and overview copy claim 8″@4000 RPM ≈ **95 mph, NOT 200+**.
  Both cannot hold under one formula — reconcile by hand (diameter-vs-radius or
  unit slip suspected) and fix whichever side is wrong, including the 2053 J
  weapon-KE figure that shares the RPM/diameter inputs.
- **P2 EXHIBIT E — hero wrap:** `02-` headline leaves a "THE W" orphan line —
  confirm the per-letter roll transform degrades gracefully at narrow widths.
- **Verified GOOD (regression-guard, do not break):** safety ladder + "never
  drive" advisory language consistent across `05-`, `06-`, footer
  (`Layout.tsx:79-85`); mass rollup internally consistent (Ti 1054.7 g /
  steel 1245.0 g, margins +255/+65 to 1310 g target, `09-`); Studio readout
  honestly states sim-bounce vs real-stall (`10-`, `11-`).
- **Still missing (physical, blocks match-ready):** `firmware/failsafe-test.mp4`
  absent (`ls firmware/` = README only), `BOM.md:60-65` weight split blank.
  Loops below cannot flip these — record as standing NO-GOs in §4.

## §2. The 10 subagents (spawn ALL 10 in parallel, every loop, via `task`)

`subagent_type: "general"` (`"explore"` allowed for 7+8). Each agent receives:
its exhibits (open the PNGs with the Read tool), its scope files, applicable
skills, the loop number + prior-loop unresolved list. Return per exhibit:
CONFIRMED / FIXED / REFUTED (with file:line), minimal diffs proposed (main
agent applies), and the exact re-screenshot needed. No agent edits files.

1. **render-black** — Exh. A (`01,10,12`). `CadViewer.tsx`, `HeroStage.tsx`,
   `materials.ts`, `*.parts.json` (`dropped_from_glb`), GLB node roles.
   Skills: `robotics-software-principles`, systematic-debugging.
2. **nav-overflow** — Exh. B (`02,03`). `Layout.tsx:60-77`, `Sidebar.tsx`,
   `index.css` nav rules. Must hold 360–2560 px. Skills: verification-before-completion.
3. **numbers-consistency** — Exh. C+D (`03,04,07,09` + `BOM.md`, P1 audit,
   `build-guide/03`, overview content). Recompute tip speed, KE, mass margins
   by hand; emit the single corrected value set. Skills: `robotics-testing`.
4. **hero-headline** — Exh. E (`02,03`). Rolling-letter transform, orphan
   control, `prefers-reduced-motion`, 360 px. Skills: verification-before-completion.
5. **studio-hud** — (`10,11`). `Studio.tsx` HUD/readout/buttons/SR live text;
   LED marker size; disarm-on-blur. Skills: `robotics-design-patterns`.
6. **explorer-list** — (`12`). Isolate/hide, role filter honesty ("heuristic"),
   stats-only disclosure, per-part mass labels vs `*.parts.json`.
   Skills: `robotics-software-principles`.
7. **firmware-copy** — (`05,06`). Every spec on-screen vs `firmware/README.md`:
   DShot600 @8 kHz, dual H3LIS331DL @45°, XT60+16AWG, T0–T4 ladder, re-arm
   behavior. Skills: `robot-bringup`, `robotics-security`.
8. **engineering-calcs** — (`07,08,09`). Re-derive tip speed, thin-ring KE,
   imbalance force, a=ω²r PASS band, spin-up energy budget INDEPENDENTLY of
   the page code; flag any formula that only agrees with itself.
   Skills: `robotics-testing`, `robotics-design-patterns`.
9. **perf-build** — `npm run lint` warning triage (Studio trail refs :315-318
   first), CadViewer 972 kB chunk split, GLB sizes, `render.yaml:52-64`
   buildFilter dedupe. Skills: systematic-debugging.
10. **red-team** — Break the 12 photographed states: WebGL off, 360 px,
    keyboard-only drive, spam Shift/Space/R, isolate-all-parts, block
    `/cad/*.glb`. Rank top 5 with repro steps. Skills: all, adversarial.

## §3. Loop protocol (exactly 5 loops)

- **L1 crashes & lies:** Exh. A root cause, Exh. D reconciliation, dead routes.
  All P0s fixed or proven non-issues with evidence.
- **L2 correctness:** Exh. C single-number sweep, copy-vs-README parity (agent 7),
  calc-vs-physics parity (agent 8). Re-screenshot every changed view into
  `./screenshots/` (same filenames, old ones to `./screenshots/loop1/`).
- **L3 UX/a11y:** Exh. B + E, keyboard-only drive, SR announcements, 360 px,
  reduced-motion. Fresh narrow-viewport shots required as evidence.
- **L4 perf/hardening:** lint warnings down, CadViewer chunk moved, headers +
  cache verified against `render.yaml`, error boundaries proven (WebGL-off shot).
- **L5 polish & freeze:** copy tone, spec plates, `lint` + `build` clean,
  `./screenshots/` fully refreshed, §4 verdict filled.
- Per loop: fan out 10 `task` calls in ONE block → dedupe (P0>P1>P2, drop
  contradicts-physics suggestions) → apply minimal diffs (keep pit-sheet
  aesthetic, hash routing, Z-up leveling) → `cd web && npm run lint && npm run
  build` must pass → carry unresolved items forward. Stop only after L5.

## §4. Verdict (fill at L5 — seeded with 2026-09-18 seed values)

| Item | Seed status | Evidence needed to flip |
|---|---|---|
| A black-model render | OPEN P0 (`01,10,12`) | Fixed render + 3 refreshed shots |
| B nav overflow | OPEN P1 (`02,03`) | 1440 px + 360 px shots, no clip |
| C cap drift 1360/1361 | OPEN P1 (`03,04`) | One number in 4 files |
| D tip-speed 95 vs 216.9 | OPEN P1 (`07` vs audit) | Hand derivation + corrected side |
| E hero orphan | OPEN P2 (`02`) | Narrow-width shot |
| Failsafe mp4 | STANDING NO-GO (physical) | `firmware/failsafe-test.mp4` in repo |
| BOM weight split | STANDING NO-GO (physical) | `BOM.md:60-65` filled + scale photo |

Overall: **NO-GO** until A–E are FIXED/refuted with refreshed screenshots AND
the two physical items land. List driving skill per row.
