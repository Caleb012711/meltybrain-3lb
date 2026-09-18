# Gauntlet Round Agent 10/10 — Test + Red-Team (T0–T5 stage gates, T5 proofs, ≥15 adversarial cases)

> Scope: `audit/autonomy-plan-2026-09-18.md` §1 (tiers + iron rules), `firmware/README.md` §C/§D, `build-guide/03-testing-and-driving.md`, `web/src/pages/Studio.tsx` `stepDrive()` sim-vs-real.
> Outputs: `autonomy/TEST.md` (new, operational manual) + this report. Docs/new files only — no code, no CAD, no config changes.

## 1. Skills (as instructed — with honest fallback)

Instructed: list via `skill` tool, then load `robotics-testing`, `robotics-security`, superpowers `systematic-debugging`.
Observed: `skill` tool registry in this session exposes exactly one skill — `customize-opencode`. Calls for `robotics-testing`, `robotics-security`, `systematic-debugging` all returned "not found".
Fallback (documented, not silent): loaded the repo's own skill bodies by direct read and applied them:
- `.opencode/skills/robotics-testing/SKILL.md` (577 lines — pyramid, mock hardware, golden-file, no-`sleep()`, deterministic replay) → drove §3 stage-gate structure, §5 T5-01 golden sequence + T5-03 event-driven timestamp asserts, §6 two-person/controlled-stimulus format.
- `.opencode/skills/robotics-security/SKILL.md` (896 lines — e-stop independence, safety-controller isolation, driver-level command validation, watchdog independence) → drove F-02 kill-independence matrix, T5-06 governor-overrules-malicious-intent, RT-06 latch-not-toggle, RT-07 reboot-disarmed.
- `systematic-debugging` (not installed anywhere in repo) → followed its pattern manually: hypothesis→predict→single-change→same-stimulus→log-observed-vs-predicted (§8 footer in TEST.md). No claim of loading it.
- Supporting patterns cited where used: `robot-bringup` (boot order/log rotation → T5-07), `robot-perception` (calibration/confidence-gating → T5-01, RT-04/05/11/12).

## 2. Method (10+ min deep pass — what was actually verified)

1. Read `audit/autonomy-plan-2026-09-18.md` in full (110 lines): extracted tier table T0–T5 rates/failsafes, iron rules (cloud never drives, TTL on every intent, T1 caps+geofence, Pocket momentary kill), T3 1 s / T4 5 s expiry, T2 ≤500 ms hold-then-safe, T5 10 Hz intent + compile-flag + TRC pre-clear per SPARC §6.4.3.
2. Read `firmware/README.md` in full (39 lines): §C one-gain-at-a-time + log each run; §D TX-off <1 s + brown-out (yank Pi) + boot interlock + film `firmware/failsafe-test.mp4`; §E BEC/TPU/UART-115200/CRSF + Pi brown-out = Teensy must still failsafe; match-day freeze.
3. Read `build-guide/03-testing-and-driving.md` in full (23 lines): low-RPM slide → trim → 2k→3k→4k + heat-check → hit-recovery blip → 3-min pack sim; confirmed autonomy ladder T0→T4 "T3/T4 never drive".
4. Read `web/src/pages/Studio.tsx:12-89` `stepDrive()` + `1167-1171` readout copy: extracted RPM_MAX 4000, TAU_UP 0.9 / TAU_DOWN 1.3, GRIP_LO 1400 / GRIP_HI 3100 / GRIP_EXP 2.8, K_ACCEL 6.5 / K_DRAG 4.5 / K_BRAKE 6.0, BOUNCE 0.45 + 2.5 u/s min rebound + tangent ×0.85 + hitT 0.12 s, collision `rpm *= 0.75`, rival 0.35 s lead + wobble; confirmed on-screen admission "Walls scrub spin in real life — expect stall, not bounce" is present — the central sim-vs-real hazard.
5. Checked `autonomy/`, `base/`, `radio/` (all empty), `audit/gauntlet-round/` (empty), `BOM.md` weight blanks + 1360-vs-1361 wording, `audit/match-ready-audit-2026-09-18.md` Gates A–E baseline (failsafe mp4 absent, BOM blanks, CadViewer chunk) to avoid duplicating that audit — this report tests autonomy, assumes Gates A/B still must flip.
6. Designed TEST.md stage gates so every iron-rule number has a measurement procedure (§4 F-05) and every sim simplification has a named real-world counter-test (RT-15 wall-stall, T5-08 replay parity).

## 3. Key decisions (and why)

1. **Four stages, no skipping: S0 bench-no-weapon → S1 test-box tethered → S2 arena-netted → S3 open-arena.** Maps 1:1 to autonomy-plan §4 ladder steps 4/5/8 + build-guide/03 sequence. Tether appears only in S1; T5 intents are S2-test-box-only until S2 exit + TRC pre-clear — matches "T5 auto ONLY in test box with kill-switch demo filmed".
2. **Measured thresholds, not vibes (§4 F-05):** Pocket kill `T-stop ≤ 500 ms / T-zero ≤ 1000 ms`; RX-loss detect ≤ 200 ms + safe ≤ 1000 ms (firmware §D <1 s); T2 gap detect ≤ 100 ms + hold ≤ 500 ms; T3 gap detect ≤ 1000 ms + 1 s expiry; T4 5 s expiry; geofence `T-safe ≤ 200 ms` + overshoot ≤ 0.5 m; RPM-cap clamp in 1 T1 cycle. Tightened where cheap (kill 500 ms vs failsafe 1 s) because kill is the T5 license to exist.
3. **T5 proofs are link-pull proofs, not demo videos:** T5-03 (pull router mid-approach, 3 runs, zero T3-attributed motion after expiry+200 ms), T5-04 (6/10/30 s stale + future-dated hints all rejected + counted), T5-06 (deliberately evil 5000 RPM + outside-fence intent clamped + flagged). A T5 that can't pass these with the network dead is not a T5.
4. **Kill latches OFF (RT-06).** Bounce must not re-arm; re-enable is a deliberate sequence. Debounce ≤ 50 ms, latch on first edge. This is the robotics-security e-stop rule applied to a momentary switch + nervous thumb.
5. **Sim is a logic harness, not physics (§1 table + T5-08 + RT-15).** `stepDrive()` gets the shape right (no-RPM-no-move, grip ramp, brake authority) and the walls wrong (bounce vs stall) — the file admits it on-screen. TEST.md therefore uses sim for replay/sign-checks and requires the staged wall-grind (RT-15) to burn the gap in before S3 tactics depend on bounces that don't exist.
6. **DeepMelt as a measured floor, not lore (§2 table).** "Drunken 3-year-old" → straight-line deviation, hit-recovery time, approach contacts, wall-stall self-extract, kill timing, stale-data motion. T5 must beat the floor on medians over 3 runs on the same floor type. Single-accel drift (firmware §B) is explicitly why dual-accel @45° + RT-14 one-sensor-unplugged run ship.
7. **18 red-team cases (brief called for ≥15; all 9 named cases included).** Each has setup / expected-safe / observe. RT-01..RT-12 gate S2 exit; RT-13..RT-18 gate the S3 season. Deliberate-error cases (RT-08 wrong LED, RT-16 swapped corners, RT-17 wrong gain card) are detection proofs — the unfamiliar observer must catch them at low energy.
8. **Weight honesty (RT-09).** Fight-ready ≤ 1360 g with 1310 g build target (match-ready audit margin), per-config mass cards (steel 437 g vs Ti 246 g teeth pairs), spares weighed separately, +20 g event-scale bias assumed. No "leave the spare pack out" plan without a tested lighter config.

## 4. Files written

- `autonomy/TEST.md` (new) — the operational manual: §0 kit/logbook, §1 sim-vs-real contract table, §2 DeepMelt floor metrics, §3 S0–S3 entry/exit checklists, §4 F-01..F-05 core safety (failsafe film protocol + timing instrumentation), §5 T5-01..T5-08 (tracking RMSE ≤15/25 cm + ≤300 ms, intent TTL pull-the-link, stale-hint rejection, 5/5 kill, governor-overrules-evil, endurance/log-rotation, replay parity), §6 RT-01..RT-18 adversarial catalog, §7 log/sign-off/TRC packet, §8 systematic-debugging footer.
- `audit/gauntlet-round/10-test-redteam.md` (this file).

No other files touched. `npm run lint` / `npm run build` unaffected (docs only).

## 5. Red-team coverage map (traceability)

| Brief requirement | Where |
|---|---|
| bench-no-weapon → tethered → netted → open-arena + entry/exit + measured thresholds (kill ms, link-loss detect, geofence) | TEST.md §3 S0–S3 + §4 F-05 threshold table |
| opponent-tracking accuracy | T5-01 (static ≤15 cm, moving ≤25 cm, ≤300 ms, <1 ID-switch/30 s, golden sequence) |
| intent-TTL expiry by pulling link mid-run | T5-03 (+ T2→T1 UART-pull variant), RT-02 |
| stale-hint rejection | T5-04 (6/10/30 s + future-dated, reject+count+flag) |
| autonomy-kill timing | F-02 + T5-05 (5/5, `T-stop ≤ 500 ms`, latch-OFF, Pi-dead/WiFi-dead repeats) |
| brown-out Pi mid-fight | RT-01 (+ F-03 yank-Pi protocol) |
| WiFi death | RT-02 (clean kill + 50% loss + recovery no-lurch) |
| cloud 30 s stall | RT-03 (5 s TTL, no unbounded queue, no reconnect lurch) |
| reflective floor blinding overhead cam | RT-04 (low-confidence + down-weight + TRACK-DEGRADED, ≤2 s flag) |
| opponent IR flood (DeepMelt beacon lesson) | RT-05 |
| kill-switch bounce | RT-06 (20-tap + graze, latch on first edge) |
| reboot mid-match | RT-07 (Teensy/Pi/base each; reboot disarmed) |
| wrong-side LED | RT-08 (deliberate 180° trap, 30 s detection at low RPM) |
| overweight-with-spares | RT-09 (per-config cards, 1310 g target, event-bias) |
| drifts-after-hits / drunken baseline as floor + metrics | §2 table + S1-3/S2-7/S3 exits + RT-14 saturation |
| each case: setup / expected / observe | all RT-01..RT-18 follow the triple |

Plus: RT-10 TX batt/model mixup, RT-11 YOLO mis-ID, RT-12 flicker/exposure, RT-13 ESC desync, RT-14 accel saturation, RT-15 wall-stall-vs-bounce, RT-16 geofence mis-cal, RT-17 wrong gain card after blade swap, RT-18 pack-sag brown-out.

## 6. Verdict

**GO for S0/S1 immediately (manual ladder) — CONDITIONAL-GO for S2 instrumentation — NO-GO for T5 open-arena (S3) until S2 exits + TRC pre-clear.**

| Pillar | Verdict | Basis |
|---|---|---|
| Stage-gate design | GO | S0–S3 with entry/exit + measured thresholds written; maps to plan §4 + build-guide/03 + firmware §C/§D |
| Core safety measurability (kill/link/geofence/RPM-cap) | GO (procedure) / UNTESTED (hardware) | F-05 gives instrumentation + numbers; no bot was run in this docs-only round |
| T5 proofs (TTL pull, stale reject, kill latch, governor override) | GO (procedure) / UNTESTED | T5-03/04/05/06 are falsifiable; need S2 hardware runs |
| Red-team breadth | GO | 18 cases, all 9 named + DeepMelt lessons, each with observe step |
| Sim-vs-real honesty | GO | §1 contract + RT-15 + T5-08; Studio on-screen stall admission verified present |
| T5 open-arena readiness | **NO-GO** | By design: needs S2 films + F-05 numbers + TRC pre-clear; default ship stays T4 human-gated |

This NO-GO is structural, not a failure — it is the iron rule working: autonomy commands, T1 governs, TRC clears.

## 7. Residual risks (carried, not closed)

1. No hardware was exercised — all thresholds are procedures awaiting S0–S2 numbers; first real kill-timing run may force threshold or debounce revision.
2. `systematic-debugging` superpower not installed — §8 footer is a manual approximation; adopt the real skill when available.
3. Skill-tool registry gap (only `customize-opencode` exposed) — future agents should note fallback reads as done here rather than claiming loads.
4. Event-arena unknowns (floor reflectivity, lighting PWM, WiFi storm, scale bias) are bounded by RT-02/04/09/12 but not eliminated — re-run S3-1 self-test at every venue.
5. Match-ready Gates A (failsafe mp4 absent) + B (BOM blanks, 1360-vs-1361 wording) from `audit/match-ready-audit-2026-09-18.md` still gate everything — TEST.md assumes they flip first.
6. Human factors: kill-holder discipline, single-gain-change discipline, post-swap scale step under time pressure — the three most likely real-world bypasses of this manual.
7. Cloud-adapter generality (any VLM via one adapter, no lock-in per plan §6) is untested against a pathological hint stream — RT-03 covers stall, not adversarial hint content; add a hint-schema fuzzer before S3 season.
