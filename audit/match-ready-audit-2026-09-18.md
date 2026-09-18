# Match-Ready Audit — one-time, 18 Sep 2026 (NOT a reusable prompt)

> This file is a frozen snapshot of an audit of THIS repo on THIS date.
> Do not reuse it as a template — paths, numbers, and findings below were
> verified against the tree on 2026-09-18. For future hardening runs use
> `/gauntlet`. Screenshots live in `./screenshots/` (see its README).

## 0. How to work this file

1. Load skills via the `skill` tool first: `robotics-software-principles`,
   `robotics-design-patterns`, `robotics-testing`, `robot-bringup`,
   `robotics-security`, `robot-perception`, `ros2-web-integration`, plus
   superpowers `systematic-debugging` + `verification-before-completion`.
   Cite which skill drove each verdict in §7.
2. Work gates A–F in order. Each gate is GO / NO-GO — a NO-GO stops the line.
   Fixes go back through `/gauntlet <area>`; this audit only records evidence.
3. Every screenshot referenced below must exist in `./screenshots/` with the
   exact filename before its gate can be GO.

## 1. Baseline verified by the auditor on 2026-09-18 (do not re-derive, re-verify)

- `cd web && npm run lint` → **exit 0, warnings only.** Warning clusters:
  - `web/src/pages/Studio.tsx:315-318` — `DriveTrail` reads/mutates
    `lastGen`/`count` refs **during render** (`react/refs` ×4) plus
    `react/immutability` at :356/:360 (`lineObj` mutated post-hook).
    Per `robotics-software-principles` (rate separation) this is the highest-risk
    site item: trail-graph mutation interleaved with render.
  - `web/src/components/HeroStage.tsx:29` — prop/hook-arg mutation
    (`react/immutability` ×2).
  - `web/src/components/CadViewer.tsx:483,488` — `setState` synchronously in
    effect (cascading renders); `:158-159` ref `.current` in effect cleanup;
    `:284` `useEffect` missing dep `meshCount`; `:51,:724` fast-refresh
    mixed exports.
  - `web/src/pages/Explorer.tsx:76-82` — manual memoization the React Compiler
    cannot preserve; `:38,:49` set-state-in-effect. `web/src/hooks/hooks.ts`
    — set-state-in-effect ×4.
- `cd web && npm run build` → **clean** (`tsc -b` + vite, 589 modules, 848 ms).
  Chunk sizes (gzip): `CadViewer` **972.73 kB (259.57 kB gzip)** — the single
  biggest perf lever on the site; `index` 254.74 (81.70); `Studio` 34.25 (11.79);
  `Pages` 27.25 (8.51). Any Gate E perf claim must move the CadViewer number.
- GLB payloads in `web/public/cad/`: `main-cad.glb` 4.1 MB, `wheel-pod.glb`
  2.3 MB, `undercutter-config.glb` 844 KB, `standard-weapon-teeth.glb` 716 KB.
- `render.yaml:52-64` — `buildFilter.paths` lists `tools/cad_convert.py` and all
  four root STEP files **twice** (copy-paste duplicate). Harmless but must be
  deduped before Gate E is GO.
- `firmware/` contains **only `README.md`** — `firmware/failsafe-test.mp4`
  (required by `firmware/README.md` §D and `build-guide/03-testing-and-driving.md`
  "Done when") **does not exist**. Gate A is NO-GO until filmed.
- `BOM.md:60-65` — weight-budget split is **blank** (`___ g` for frame, weapon,
  motors+ESCs, battery, fasteners, total). Gate B is NO-GO until filled from a
  real scale.
- `manufacturing/P1-mass-audit.md` — Branch E (Ti weapon band ~200–250 g + alu
  plates ~300–400 g + TPU ~80–120 g) is the **only branch that flies**
  (~1000–1250 g + electronics). The 80.1 cm³ body solid (629 g steel / 355 g Ti /
  216 g alu) MUST NOT be steel. Gate B evidence must show which branch was built.
- Weight-cap wording is inconsistent: `P1-mass-audit` + `build-guide/03` say
  **1361 g**, `BOM.md` + README tracker say **1360 g**. Pick one before Gate B.
- `P1-mass-audit.md:39-45` re-run recipe points at `/tmp/opencode/step_audit.py`
  (stale scratch path) — flag if anyone re-runs it.
- Sim physics (`web/src/pages/Studio.tsx:12-89`, `stepDrive`): RPM_MAX 4000,
  TAU_UP 0.9 / TAU_DOWN 1.3, GRIP_LO 1400, GRIP_HI 3100, GRIP_EXP 2.8,
  K_ACCEL 6.5 / K_DRAG 4.5 / K_BRAKE 6.0, wall BOUNCE 0.45 + 2.5 u/s minimum
  rebound, collision costs both bots `rpm *= 0.75`, rival AI leads with 0.35 s
  velocity prediction + strafe wobble. Audit these against bench behavior in
  Gate C — note the sim **bounces** off walls while the real bot **stalls/scrubs**
  (the UI copy already admits this; verify the admission is still on-screen).

## 2. Gate A — failsafe film (HARD NO-GO — verified missing)

1. Confirm `firmware/failsafe-test.mp4` still absent: `ls firmware/`.
2. Film per `firmware/README.md` §D: TX-off → STOP/brake <1 s with timestamp;
   re-arm requires deliberate action (show it); brown-out test (yank Pi if
   fitted) → MCU still failsafes; boot interlock (power on with throttle high →
   stays disarmed).
3. Save as `firmware/failsafe-test.mp4`, add still as
   `./screenshots/12-failsafe-video-still.png`.
4. GO only when: video in repo + still in folder + checklist §D all ticked.

## 3. Gate B — weigh-in ≤ cap (NO-GO — budget blank)

1. Resolve 1360 vs 1361 g in `BOM.md:56`, `manufacturing/P1-mass-audit.md:5`,
   `build-guide/03-testing-and-driving.md:23`, README tracker. One number
   everywhere (auditor recommends 1360 g fight-ready + 1310 g build target
   per the audit's 50 g margin rule).
2. Fill `BOM.md:60-65` blanks from a real scale; photo scale →
   `./screenshots/11-scale-weight.png`.
3. State which P1 branch was built (must be E or lighter) + Pi/BEC grams if fitted.
4. GO only when: scale photo ≤ cap + BOM filled + branch stated, all three agreeing.

## 4. Gate C — sim-vs-bench truth (re-verify, don't trust §1)

With `npm run preview` serving `dist/` (screenshot `10-preview-proof.png`):
1. Drive `/studio`: hold Shift with no WASD → no translation (no-RPM-no-move).
   Release Shift at speed → authority decays per TAU_DOWN 1.3 (feel check).
2. Brake (Space) → strong stop; R → reset + rival reset; Esc/blur → disarm;
   HUD RPM/SPD/THR/AUTH track the sim state at 10 Hz.
3. Rival ON: collide → both lose RPM (0.75×), penetration split, no tunneling.
4. Confirm the on-screen "walls scrub spin in real life — expect stall, not
   bounce" admission is present (it justifies the BOUNCE 0.45 sim simplification).
5. Capture `02-studio-drive.png` + `03-studio-build.png` (part selected, placement
   card visible). GO only when 1–4 pass as filmed/captured behavior.

## 5. Gate D — pit + advisory-AI wiring (bench check)

Per `firmware/README.md` §E and the autonomy ladder (`build-guide/03:15-17`,
T0→T4, T3/T4 never drive):
1. BEC 5V/3A → Pi on TPU standoffs; Teensy NOT powered from Pi USB in-bot.
2. UART Teensy @115200; CRSF telemetry reaches the Pocket; pit dashboard shows
   RPM/G/batt/temp.
3. YOLOv8 + LLM hints human-gated; driver approval step demonstrated.
4. `Layout.tsx:79-85` footer failsafe/advisory notice renders on every route.
GO only when 1–4 are bench-demonstrated, not just documented.

## 6. Gate E — site match pack (needs the duplicate fix + shots)

1. Dedupe `render.yaml:52-64` buildFilter; re-verify headers (nosniff, DENY,
   Referrer-Policy, Permissions-Policy, immutable `/assets/*`, no-cache
   `index.html` + `*.parts.json` + manifest).
2. `npm run lint` (warnings triaged — Studio trail-refs item either fixed or
   written up as accepted risk) + `npm run build` clean + `preview` smoke of
   `/`, `/studio`, `/explorer`, `/build`, `/pcbway`, `/bom`, `/firmware`.
3. Capture `01-home-hero.png`, `04-explorer.png`, `05-bom.png`,
   `06-firmware.png`, `07-mobile-home.png`, `08-mobile-drive.png`.
4. Keyboard-only full drive (no mouse), 360 px mobile, reduced-motion ON pass.
GO only when build clean + all 7 shots in folder + a11y passes logged.

## 7. Verdict (fill this in — the whole point of the file)

| Gate | GO / NO-GO | Evidence (file:line or screenshot) | Skill that drove it |
|---|---|---|---|
| A failsafe film | NO-GO (2026-09-18: mp4 absent) | `ls firmware/` | `robot-bringup`, `robotics-security` |
| B weigh-in | NO-GO (2026-09-18: BOM blanks) | `BOM.md:60-65` | `robotics-software-principles` |
| C sim truth | UNTESTED | needs `02/03/10` shots | `robotics-design-patterns` |
| D pit wiring | UNTESTED | bench demo | `ros2-web-integration`, `robot-perception` |
| E site pack | UNTESTED | needs `render.yaml` dedupe + `01/04/05/06/07/08` | `robotics-testing`, systematic-debugging |

Overall: **NO-GO** until A + B flip with files in repo, then C–E re-verified.
Residual risks carried forward: CadViewer 972 kB chunk; Studio trail-ref
render-mutation; 1360-vs-1361 wording; stale `/tmp/opencode` re-run path.
