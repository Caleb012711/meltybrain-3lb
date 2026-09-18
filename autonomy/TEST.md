# Autonomy TEST — Stage-Gate Test Manual (T0–T5, Eyeliner 3lb melty)

> Companion to `audit/autonomy-plan-2026-09-18.md` §1 (tiers + iron rules),
> `firmware/README.md` §C/§D, `build-guide/03-testing-and-driving.md`,
> `web/src/pages/Studio.tsx` `stepDrive()`.
> Status: PLAN. No stage may be skipped. A failed exit criterion = stop, fix, re-enter the same stage from the top.
> Default ship = human-gated T4. T5 is behind a compile flag + checklist + TRC pre-clear per SPARC §6.4.3.

Skills applied (read directly from `.opencode/skills/` — the `skill` tool registry in this session only exposes `customize-opencode`, so `robotics-testing`, `robotics-security` were loaded by file read; `systematic-debugging` superpower is not installed — hypothesis→predict→observe→log discipline below follows its pattern manually):
- `robotics-testing` — pyramid (unit → integration → sim → HIL → field), mock hardware, deterministic replay, golden-file trajectories, no-`sleep()` event-driven waits.
- `robotics-security` — e-stop independence, safety-controller isolation, command validation at the driver (T1 governor), watchdog independence.
- `robot-bringup` / `robot-perception` patterns referenced where noted (boot order, camera calibrate).

Iron rules (non-negotiable, from autonomy-plan §1):
1. Cloud NEVER drives. Intents only, via T3. Every intent carries a TTL.
2. T1 (Teensy) enforces RPM caps + geofence regardless of what T5 asks. T1 is the governor; T5 is advisory intent.
3. Pocket momentary switch = hardware-priority autonomy-kill + TX-loss failsafe. Tested like the failsafe film.
4. T0 is the failsafe. T1 watches T2; T1 ignores bad T2 frames; T3 loss → T2 continues alone; T3 commands expire 1 s; T4 hints expire 5 s.

Out of scope this round: custom PCB, motor/ESC changes, CAD re-model of ring body, cloud-vendor lock-in.

---

## 0. What you need before S0

- [ ] `firmware/README.md` §A/§B done: Teensy 4.0 LOCK, 2× H3LIS331DL @45°, AM32 DShot600 bidir @8 kHz, ELRS EP1/RP1 + Pocket bound, heading LEDs (green=front) verified at 0 RPM.
- [ ] Bench logbook (paper or `autonomy/LOGBOOK.md`): one line per run — date, stage, RPM cap, gain changed (ONE per run per §C), result.
- [ ] Measurement kit: phone slow-mo (≥240 fps for kill timing), USB-serial log of Teensy (`rpm,governor_state,last_rx_ms,last_t2_ms,last_t3_ms`), stopwatch, scale (≤1361 g fight-ready — see BOM weight-cap note), LiPo bag, wheel locks/covers, tether rope (S1), netted box/arena access (S2+).
- [ ] `base/setup.sh` GO green (camera FPS, ELRS RSSI, WiFi latency) before any T3/T4 test.
- [ ] Ledger columns for every test: `setup | stimulus | expected safe behavior | observed (measured) | PASS/FAIL | log file`.

Notation: `T-stop` = switch-edge → first brake command; `T-zero` = switch-edge → RPM < 100; `T-detect` = link-loss start → governor flags LOSS; `T-safe` = flag → safe state entered.

---

## 1. Sim-vs-real contract (read before trusting `/studio`)

`web/src/pages/Studio.tsx:12-89` `stepDrive()` constants (verified 2026-09-18):

| Sim param | Value | Real meaning | Trust? |
|---|---|---|---|
| `RPM_MAX` | 4000 | Liftoff target band 2000–4000; OpenMelt2 baseline to 3200 | Shape only — your ESC/motor/battery sags lower |
| `TAU_UP / TAU_DOWN` | 0.9 s / 1.3 s | Spin-up faster than spin-down | Qualitative — measure yours with tach |
| `GRIP_LO / GRIP_HI / GRIP_EXP` | 1400 / 3100 / 2.8 | No-RPM-no-move; authority ramps with RPM | Shape is the lesson (Studio readout `Studio.tsx:1167-1171` says this explicitly) |
| `K_ACCEL / K_DRAG / K_BRAKE` | 6.5 / 4.5 / 6.0 | Brake = strong approach-to-zero, no extra multiplier | Feel only |
| Wall | `BOUNCE 0.45` + min rebound 2.5 u/s + tangent `×0.85` + `hitT 0.12 s` cooldown | **REAL: stall/scrub, NOT bounce.** On-screen copy admits this (`Studio.tsx:1170-1171`: "Walls scrub spin in real life — expect stall, not bounce") | DO NOT TRUST for tactics — see RT-15 |
| Collision | both bots `rpm *= 0.75`, penetration split, no tunneling | Real hit = RPM loss + heading drift (single-accel drifts; dual-accel @45° recovers — firmware §B) | Magnitude is arcade; direction (you lose energy when you hit) is true |
| Rival AI | 0.35 s velocity lead + strafe wobble; flees below 1200 RPM; wall-avoid | A training dummy, not an opponent model | Do not tune T5 gains against it |

Rule: sim proves *logic* (TTL expiry branches, geofence clamp math, state transitions). Only bench/box/arena prove *physics*.

---

## 2. The floor T5 must beat (DeepMelt lessons)

DeepMelt = Liftoff fully-autonomous twin, 3–2 debut Nov 2022, IR-radar state machine, described as "drunken 3-year-old" baseline (autonomy-plan §0). Known failure modes from plan + firmware notes:

- **Drifts after hits** — single-accel OpenMelt2 mode (radius 3.9 cm default, LED offset 7%) loses heading after a 5 J-class hit; needs seconds to re-hold.
- **Drunken baseline** — wanders, orbits wrong way, wall-grinds instead of translating.
- **Beacon lesson** — IR-radar / IR beacon tracking is floodable (see RT-05).

T5 is GO for open-arena only if it beats this floor on MEASURED metrics (3-run median, same floor as DeepMelt anecdotes — wood/steel per build-guide/03):

| Metric | DeepMelt floor (fail if worse) | T5 exit bar (S3) | How measured |
|---|---|---|---|
| Straight-line 2 m @ 2500 RPM, no opponent | deviation > 0.6 m / toilet-bowls | ≤ 0.3 m lateral, no full orbit | tape + overhead video, 3 runs |
| Hit recovery (stick-punch ~5 J or wall tap at speed) | heading error > 30° for > 2 s | re-hold ≤ 1.0 s, heading error < 15° after 1 s | Teensy RPM/heading log + video |
| Opponent approach (static 30 cm box, 3 attempts from 2 m) | < 1/3 contacts | ≥ 2/3 contacts without wall-stall > 3 s | overhead cam + observer |
| Wall-stall rate (2-min free drive) | grinds > 10 s per stall, needs human help | self-extracts ≤ 3 s, zero human touches | timer + log `governor_state` |
| Autonomy-kill | N/A (no full-auto kill data) | `T-stop ≤ 500 ms`, `T-zero ≤ 1000 ms` every run | slow-mo + serial log (see §4) |
| False-drive on stale data | N/A | zero motion on expired intent/hint (see T5-03/T5-04) | injected-delay test, log |

If any row fails, T5 stays in S2. Ship T4 human-gated.

---

## 3. Stage gates S0 → S3

General rule: enter a stage only if ALL entry boxes ticked; leave only if ALL exit boxes ticked with numbers written in the log. Film every exit.

### S0 — Bench, NO weapon energy (firmware §B/§C + build-guide/03 steps 1–2)

Setup: wheels free or bot on stand, ring teeth OFF or covered, wheel locks nearby, LiPo bag, USB log running.
Entry:
- [ ] §B complete (RX, DShot, accel rest ~0, LEDs correct at 0 RPM).
- [ ] RPM cap set 1500–2000, soft start + current limit per ESC spec.
- [ ] One-gain-at-a-time rule understood; logbook open.

Tests (all must pass):
- [ ] S0-1 Heading: 500–1000 RPM slide command; LED = commanded dir. If orbits wrong way, flip offset 180° (build-guide/03). Record video.
- [ ] S0-2 No-RPM-no-move: throttle OFF + full stick → no translation (mirrors sim `grip=0` below 1400). PASS = < 5 cm drift in 5 s.
- [ ] S0-3 Failsafe film (firmware §D, see §4 thresholds): TX-off → STOP/brake; re-arm deliberate; brown-out (yank Pi if fitted) → MCU still failsafes; boot interlock (power on throttle-high → stays disarmed). Save `firmware/failsafe-test.mp4`.
- [ ] S0-4 Kill-switch timing baseline (manual mode): 5× Pocket kill → `T-stop ≤ 500 ms`, `T-zero ≤ 1000 ms`, no restart until re-arm. Log each.

Exit S0 → S1: all above PASS + video saved + RPM reads stable at rest (±50 RPM hand-off) + no loose fasteners.

### S1 — Test box, TETHERED, weapon teeth ON (low energy → full band)

Setup: closed test box / netted enclosure, tether rope slack, NOBODY in plane of spin, concrete floor, observer on kill switch, weapon teeth torqued + Loctite per frame guide.
Entry:
- [ ] S0 exit signed + weight ≤ cap + spares weighed separately (see RT-09).
- [ ] Tether rated > 5× bot weight, kill-switch holder OUTSIDE box with line of sight.
- [ ] RPM caps staged: 2000 → 3000 → 4000, heat-check motors/ESCs each step (build-guide/03 step 3).

Tests:
- [ ] S1-1 Spin-up curve: ramp 2000 → 3000 → 4000. Hop = STOP, re-balance (01). Log temps (touch + telemetry `temp` if present). PASS = no hop, no desync, temps < 80 °C case.
- [ ] S1-2 Translation trim: command forward, trim to straight (wood cleats bite, steel skates — re-trim per floor). PASS = §2 straight-line bar at 2000 then 3000 RPM.
- [ ] S1-3 Hit recovery blip: stick-punch / box-wall tap → must re-hold RPM, not toilet-bowl (build-guide/03 step 4). PASS = §2 hit-recovery bar, Pi log shows `rpm` dip + recover (if Pi fitted).
- [ ] S1-4 Tethered kill at speed: 3× kill at ≥3000 RPM → `T-stop ≤ 500 ms`, tether never goes taut from fly-out (bot stays in box third). Measure + log.
- [ ] S1-5 Link-loss (manual): TX off at speed → motors STOP/brake < 1 s (firmware §D), no restart until re-arm. 3/3 PASS.

Exit S1 → S2: S1-1..S1-5 PASS + 3-min pack sim (build-guide/03 step 5: drive + spin, weigh after, no loose fasteners) + failsafe video re-confirmed WITH teeth on.

### S2 — Netted arena, T2+T3 ON, T5 TEST-BOX ONLY (autonomy-plan §4 step 8)

Setup: full-size netted arena or caged test area, overhead cam calibrated (4-corner click), `base/setup.sh` GO, T2 Pi logging, T3 tracker publishing ~5 Hz, Pocket kill in driver's hand, second observer on arena power.
Entry:
- [ ] S1 exit signed + T2 watchdog configured (hold last-good ≤ 500 ms then safe-spin) + T3 TTL 1 s + T4 TTL 5 s verified in code review (grep TTL constants, record commit hash).
- [ ] Geofence polygon loaded = inner arena minus 0.5 m margin; RPM cap 4000 enforced in T1 (not in T5).
- [ ] T5 behind compile flag; flag state logged at boot.

Tests (manual-assist first, then T5 intents):
- [ ] S2-1 T2-alone: unplug T3 WiFi → T2 continues ≤ 500 ms hold then safe-spin, no freeze, no full-throttle. `T-detect ≤ 100 ms` (T2 frame gap), `T-safe ≤ 500 ms`. 3/3.
- [ ] S2-2 T3 link pull mid-run (T5-03): pull travel-router power → T3 commands expire in 1 s; bot must NOT continue last intent past TTL. Observe serial `last_t3_ms` + motion stop. 3/3.
- [ ] S2-3 Stale-hint rejection (T5-04): inject 6 s-delayed cloud hint → rejected + logged, zero motion change.
- [ ] S2-4 Geofence: command drive into net → T1 clamps/stops within `T-safe ≤ 200 ms`, overshoot ≤ 0.5 m. 3/3 directions.
- [ ] S2-5 Autonomy-kill at speed (T5-05): Pocket kill during T5 intent → `T-stop ≤ 500 ms`, T5 latched OFF until deliberate re-arm + re-enable checklist. 5/5.
- [ ] S2-6 Tracking accuracy (T5-01/02): static + moving target RMSE/latency bars (see §5). Must pass before any opponent-proxy run.
- [ ] S2-7 Opponent-proxy (foam box on stick, NO live opponent yet): 3 approaches from 2 m → §2 contact bar.

Exit S2 → S3: S2-1..S2-7 PASS + red-team RT-01..RT-12 PASS in S2 + TRC pre-clear letter drafted + T5 kill demo filmed in test box (autonomy-plan §4 step 8).

### S3 — Open arena (event or full-size practice), full-auto only if S2 clean

Setup: event arena or identical practice arena, TRC/event organizer briefed, failsafe video + weigh-in already accepted, spares kit packed (weighed — RT-09).
Entry:
- [ ] S2 exit signed + TRC pre-clear for T5 (or run T4 human-gated if not cleared) + match-day firmware FROZEN (no flash without re-test per firmware §D checklist).
- [ ] Config + logs backed up in `firmware/`; battery-fresh weigh-in photo.

Tests / match protocol:
- [ ] S3-1 Pre-match: link self-test (ELRS RSSI + WiFi latency + cam FPS GO), geofence re-calibrated to THIS arena, kill-switch live check at low RPM.
- [ ] S3-2 Match: T5 intent rate 10 Hz verified in log; any `T-stop` breach, geofence trip, or RPM-cap clamp = immediate post-match NO-GO review.
- [ ] S3-3 Post-match: 60 s link drill (LiPo bag), fastener check, log pull (RPM/G/batt/temp + max-RPM flashes), weigh after (hot battery ≠ change; loose screws = change).

Exit S3 (season): §2 floor beaten over ≥ 3 S3 runs + red-team RT-13..RT-18 attempted + residual-risk list updated. Any injury, arena-exit, or kill failure = T5 grounded to S2 pending fix + re-film.

---

## 4. Core safety tests (do these FIRST in every stage)

### F-01 TX-off failsafe (firmware §D — the film TRC asks for)
Setup: stage-appropriate energy (S0 no teeth, S1+ teeth in box). Camera on tripod showing TX screen + bot + timestamp (phone clock in frame).
Stimulus: TX power OFF at ≥2000 RPM (S1+) / any RPM (S0).
Expected: motors STOP/brake < 1 s; no restart until deliberate re-arm (stick-down + switch cycle, per your config — state it in log).
Observe/measure: slow-mo timestamp TX-OFF frame → last audible spin / ESC telemetry zero; serial `last_rx_ms` gap; PASS = `T-zero ≤ 1000 ms` (target ≤ 500 ms), 3/3 runs, video saved `firmware/failsafe-test.mp4` + still for audit.

### F-02 Pocket autonomy-kill (hardware priority)
Setup: T5 or T2-assist driving at speed. Kill = Pocket momentary switch (document which switch + EdgeTX mix in `radio/`).
Expected: T1 safe state regardless of T2/T3/T4 state; T5 latched OFF (re-enable requires checklist, not switch release alone — prevents bounce-restart, see RT-06).
Observe: logic/serial `governor_state: KILL` within `T-stop ≤ 500 ms`; 5/5 consecutive, including one kill DURING a wall scrub and one DURING a hit-recovery transient.
Anti-pattern (robotics-security §E-stop): kill MUST work with Pi dead, WiFi dead, cloud dead, laptop closed. Prove it by repeating F-02 with each of those killed (4 extra runs).

### F-03 Brown-out (yank Pi power if fitted — firmware §D)
Setup: T2 Pi powered via BEC; bot spinning S1 box.
Stimulus: unplug Pi 5 V (simulate brown-out/sag).
Expected: Teensy still failsafes; spin either holds governor-safe or brakes — NEVER full-throttle runaway, NEVER needs Pi to stop.
Observe: serial log continues (Teensy alive), `last_t2_ms` ages out → T1 hold ≤ 500 ms → safe-spin/brake per config. PASS = kill + TX-off still meet F-01/F-02 during Pi-dead window.

### F-04 Boot interlock
Setup: TX throttle HIGH + armed switch ON, then power bot.
Expected: stays DISARMED; requires throttle-low + deliberate arm.
Observe: LEDs show disarmed (document color/code); attempt stick input → zero motion. PASS 3/3, including after abrown-out reboot (combine with F-03 once).

### F-05 Link-loss detection timing (measured, not vibes)
Instrument: Teensy prints `now,last_rx,last_t2,last_t3,governor` at ≥ 50 Hz to USB-serial; laptop `scripts/link_loss_probe.py` (or manual stopwatch + video if no script yet — state method in log).
Thresholds (from autonomy-plan §1 + tightened where cheap):
- CRSF/ELRS RX loss → T0 flags LOSS `T-detect ≤ 200 ms`, safe `T-safe ≤ 1000 ms` (firmware §D < 1 s).
- T2 frame gap → T1 flags `T-detect ≤ 100 ms`, hold-last-good ≤ 500 ms then safe.
- T3 gap → T2 flags `T-detect ≤ 1000 ms`, commands expire 1 s (no motion on stale).
- T4 gap → hints expire 5 s; cloud 30 s stall (RT-03) must cause ZERO motion change after 5 s.
- Geofence breach → `T-safe ≤ 200 ms`, overshoot ≤ 0.5 m.
- RPM-cap breach (command 4500 when capped 4000) → clamped within 1 T1 cycle + `cap_flag` logged; sustained breach (3 s) → safe-spin + alert.
Log PASS/FAIL per threshold with numbers, not "felt fast".

---

## 5. T5-specific tests

### T5-01 Opponent-tracking accuracy (T3 overhead YOLO @ ~5 Hz + T2 fusion)
Setup: calibrated overhead cam (4-corner click, record homography + arena dims); test target = 30 cm box in bot colors + actual bot shell (two-target run); tape-measured ground-truth grid (1 m spacing).
Procedure: (a) static targets at 5 grid points, 10 s each; (b) hand-pushed target at ~1 m/s straight + weave; (c) spinning bot (2500 RPM) + static target (motion-blur case).
Expected: static RMSE ≤ 15 cm, moving RMSE ≤ 25 cm, end-to-end latency (photon → fused pose in T2 log) ≤ 300 ms, ID-switch < 1 per 30 s, no persistent swap with referee-striped decoy (see RT-11).
Observe: `base/` tracker log (`frame_ts,detect_ts,publish_ts`) + T2 fusion log; ground truth from tape + video overlay. Golden-file: save one 30 s sequence + detections as regression (robotics-testing golden-file pattern) — future tracker changes must not regress RMSE > 10%.

### T5-02 Intent quality (does T5 drive like better than drunken?)
Setup: S2 netted, foam proxy opponent, T5 intents at 10 Hz logged (`intent_ts,ttl,ttl_expiry,vx,vy`).
Procedure: 3× 2 m approaches + 2-min free drive.
Expected: §2 bars (contact ≥ 2/3, self-extract ≤ 3 s, no full-orbit). T1 governor log shows zero RPM-cap overrides except deliberate probe (see F-05).
Observe: overhead video + intent log replay (`scripts/replay_intents.py` or manual plot — state method). Property test: intents NEVER command outside geofence or above RPM cap even when proxy placed outside/beyond (place proxy outside net → intents must clamp, not chase through the wall).

### T5-03 Intent-TTL expiry — pull the link mid-run (THE T5 proof)
Setup: S2, T5 driving toward proxy, T3 publishing intents TTL = 1 s (record constant + commit).
Stimulus: pull travel-router power / `iptables DROP` T3→T2 mid-approach (3 runs).
Expected: motion attributable to T3 stops ≤ 1 s after last fresh intent; T2 falls back to hold-then-safe (≤ 500 ms hold per plan); NO coasting into the net on a stale "forward" intent.
Observe: serial `last_t3_ms` age + velocity decay plot; PASS = zero T3-attributed motion after `expiry + 200 ms` margin, 3/3. Event-driven wait in analysis (no `sleep()` guesses — robotics-testing anti-pattern §1): assert on log timestamps, not wall clock.
Variant: same test for T2→T1 (unplug UART TX): T1 must ignore bad frames + safe within 500 ms.

### T5-04 Stale-hint rejection (cloud advisory only)
Setup: T4 hints TTL = 5 s (record constant). Inject hints with backdated `hint_ts` (6 s, 10 s, 30 s old) + one future-dated hint (clock-skew case).
Expected: all stale/future-out-of-window hints REJECTED + counted in `stale_reject_total`; zero drive change; operator dashboard flags "STALE" (not silent drop — systematic-debugging: visible failure beats silent wrong behavior).
Observe: bridge log + dashboard screenshot; PASS = 4/4 rejected, fresh hint (age < 2 s) still accepted as control.

### T5-05 Autonomy-kill timing (5/5 at speed)
Setup: T5 full-auto approach at ≥ 2500 RPM, kill holder independent from T5 operator.
Stimulus: Pocket kill at random time (observer calls it, not driver anticipating).
Expected: `T-stop ≤ 500 ms`, `T-zero ≤ 1000 ms`, T5 latched OFF; re-arm requires (1) switch release + (2) deliberate re-enable (document sequence); switch bounce (see RT-06) must NOT re-enable.
Observe: slow-mo + `governor_state` log; 5/5 PASS required for S2 exit. Repeat one run with Pi dead + one with WiFi dead (kill independence per F-02).

### T5-06 RPM-cap + geofence governor proof (T1 overrules T5)
Setup: S2, deliberately malicious intent file (or `scripts/evil_intent.py`): commands 5000 RPM + waypoint 2 m outside arena.
Expected: T1 clamps to 4000 + clamps/translates waypoint to inside geofence; `cap_flag` + `geofence_clamp_total` increment; sustained violation → safe-spin + dashboard alert. T5 NEVER observed outside cap/fence in log.
Observe: governor log + dashboard alert screenshot. This is the robotics-security "safety controller on separate hardware enforces limits even if main compute compromised" pattern — T1 is that controller.

### T5-07 3-minute endurance + log rotation (robot-bringup)
Setup: S1/S2, 1080p Pi recording + telemetry as in a match.
Expected: full 3 min without log-fill stall, thermal throttle, or reboot; Pi SD has space for 2× matches (rotation working); post-run fastener check clean.
Observe: `df` before/after, `dmesg` for throttling, pack voltage curve. FAIL = any reboot (see RT-07) or lost log.

### T5-08 Sim-replay parity (Studio is a harness, not truth)
Setup: take one S2 intent log, step it through a Python port of `stepDrive()` (same constants) offline.
Expected: qualitative match (turns same direction, authority collapses below ~1400 RPM, brake stops faster) BUT wall interaction diverges (sim bounces, real stalls) — document the divergence run as the known-gap artifact.
Observe: side-by-side plot + one-paragraph gap note in logbook. Purpose: catch sign errors (180° LED/offset bugs — RT-08) before they cost a match.

---

## 6. RED TEAM — adversarial cases (each: setup / expected safe / observe)

> Run RT-01..RT-12 for S2 exit; RT-13..RT-18 for S3 season. Two people minimum (driver + kill holder). Log ambient (floor type, light, battery cycles) — melty trim is floor- and pack-dependent.

### RT-01 Brown-out Pi mid-fight
Setup: S1 box, T2 assist ON at 3000 RPM, BEC fed from fight pack (match wiring). Observer yanks Pi 5 V mid-translation (or sags pack with full-throttle punch if you have a programmable load — state method).
Expected safe: Teensy unaffected; T1 holds ≤ 500 ms then safe-spin/brake; kill + TX-off still meet F-01/F-02 Pi-dead. NEVER runaway, NEVER needs Pi to stop (firmware §E "Pi brown-out = Teensy must still failsafe").
Observe: Teensy serial continues; `last_t2_ms` ages; video shows controlled stop, not spin-up. PASS = F-02 repeated Pi-dead within thresholds.

### RT-02 WiFi death (travel router dies / arena WiFi storm)
Setup: S2, T5 on proxy approach. Stimulus: power off router mid-run (clean kill) + repeat with router ON but 50% packet loss (`tc qdisc loss 50%` on base laptop — closer to event reality).
Expected: T3 gap → intents expire 1 s → T2-alone safe behavior; dashboard shows LINK-LOST (not frozen GREEN — stale-green is a fail); recovery (router back) requires deliberate re-enable, not auto-lurch.
Observe: `last_t3_ms`, dashboard screenshot before/during/after, motion-stop timing ≤ 1 s + 200 ms margin. 3/3 (clean kill + lossy + recovery).

### RT-03 Cloud 30 s stall (hotspot dies mid-hint)
Setup: S2, T4 hints flowing (human-gated). Stimulus: block cloud egress 30 s (`iptables OUTPUT DROP` on bridge or phone hotspot airplane mode), including mid-hint.
Expected: ZERO drive change after hint TTL 5 s; bridge queues-or-drops with backpressure (no unbounded RAM growth); dashboard shows CLOUD-STALE; human gate stays the only path (no auto-apply on reconnect — queued hints older than TTL stay rejected per T5-04).
Observe: bridge log (`hint_ts,age_at_apply,accepted/rejected`), `free -m` before/after, reconnect behavior filmed. FAIL = any motion from a > 5 s-old hint or reconnect lurch.

### RT-04 Reflective floor blinding overhead cam
Setup: S2, overhead cam calibrated on matte floor; then lay polished steel / mylar sheet section (event floors vary) + aim a work light at grazing angle to force bloom.
Expected: tracker reports LOW-CONFIDENCE (not confident-wrong); T2 down-weights T3 (fusion covariance inflates) and falls back toward onboard flow; dashboard shows TRACK-DEGRADED; bot slows or holds — NEVER sprints on a hallucinated pose.
Observe: tracker confidence histogram + fusion-weight log + video of behavior change. PASS = degraded-flag within 2 s of bloom onset, no full-speed chase of a ghost. Mitigation logged (polarizer, exposure lock, matte arena cloth to bring).

### RT-05 Opponent with IR flood (DeepMelt beacon lesson)
Setup: S2 dusk-equivalent light; opponent proxy carries 850 nm IR LED array / halogen work light aimed at bot (simulates IR-flood bot + arena spots). If T2 uses IR-adjacent sensing or overhead cam without IR-cut, note filter state.
Expected: no lock-loss lurch; T2/T3 confidence drops rather than snapping to the flood; T1 caps/geofence hold regardless; driver/kill unaffected (separate link).
Observe: before/during/after detection overlays (does the box jump to the flood?), confidence trace, bot velocity. PASS = graceful degrade per RT-04 bar. Document filter (IR-cut on/off) + exposure settings that passed.

### RT-06 Kill-switch bounce (dirty momentary + nervous thumb)
Setup: bench + S1 box. Stimulus: 20 rapid kill taps (bounce rig: tap at ~10 Hz 2 s) + one 50 ms "graze" + release-mid-motion.
Expected: FIRST edge latches KILL; bounce does NOT toggle back to armed/auto; re-enable requires full deliberate sequence (document it); graze still kills (no debounce that eats a real press — debounce ≤ 50 ms, latch on first edge).
Observe: `governor_state` trace shows single KILL entry, no ARM flapping; switch electrical trace if available (scope/logic) else video + log timestamps. FAIL = any re-arm without the deliberate sequence.

### RT-07 Reboot mid-match (Teensy / Pi / base laptop each)
Setup: S2 netted, three sub-runs: (a) Teensy reset button at speed, (b) Pi power cycle, (c) base laptop lid-close / `kill -9 tracker`.
Expected: (a) Teensy reboots DISARMED (boot interlock F-04), motors braked, no spin-up on boot; (b) per RT-01; (c) per RT-02. In ALL cases kill still works during the reboot window (kill is T0/Pocket, not the rebooted component).
Observe: boot log (`boot_count`, `boot_cause`, `armed_at_boot=false`), video of (a) showing zero motion on reboot, serial gap timing. Record reboot-to-safe-arm time (info only, no threshold — but re-arm still needs deliberate action).

### RT-08 Wrong-side LED (green=back after a rushed reassembly)
Setup: bench, deliberately mount heading LED pair 180° off (or set offset +180° in config) — the classic post-repair trap (firmware §B "Wrong = un-drivable").
Expected: S0-1 catches it BEFORE any weapon run (bot orbits/walks opposite the stick at low RPM, no teeth). Test is a detection proof: observer unfamiliar with the change must call WRONG within 30 s of low-RPM slide.
Observe: video + logbook entry; fix = flip offset 180° + re-verify S0-1 + update config backup. Process fix: add LED photo to pre-stage checklist (green-front visible in arming photo).

### RT-09 Overweight-with-spares (scale says GO, event says NO)
Setup: weigh fight-ready bot + FULL spares kit separately (teeth pair, cleats, ESC, pack, fastener set per autonomy-plan §3 + BOM §4 tip). Use event scale if available (they read high more often than yours reads low — assume +20 g bias).
Expected: fight-ready ≤ 1361 g with 50 g margin target (build ≤ 1310 g per match-ready audit recommendation); spares NEVER assumed "in the bot" — each config (mid-cutter/undercutter/wedge) has its own mass card (steel 437 g vs Ti 246 g per teeth-pair volume 55.63 cm³ — plan §3) and is re-weighed after EVERY swap (< 10 min swap includes scale step).
Observe: scale photos (bot alone, spares tray, each blade config), BOM §4 blanks filled, branch (Ti comfort vs steel tight) stated. FAIL = any config over cap or "we'll leave the spare pack out to make weight" plan without a tested lighter config.

### RT-10 TX low-battery / model-mixup (wrong model, wrong endpoints)
Setup: bench, Pocket at low-battery warning + a second model slot with different endpoints/trims (the event-day mixup).
Expected: low-batt alarm BEFORE link degradation (Pocket voltage telemetry logged); wrong-model behavior caught by pre-stage stick check (S0-1 10 s slide) — endpoints wrong = trim visibly off at low RPM, no weapon run until fixed. RX-loss thresholds (F-05) still met on low batt.
Observe: voltage log, stick-check video, config-file hash (`radio/` Companion file) recorded in logbook. Process fix: one model per bot, named `EYELINER-FIGHT`, others archived.

### RT-11 YOLO mis-ID (striped referee, second bot, overhead rig shadow)
Setup: S2, add decoys: striped shirt on a chair at arena edge, second static shell, swinging arena-light shadow bar.
Expected: tracker holds correct IDs (no persistent swap > 1 s); confidence on decoy stays below track threshold; fusion rejects jumps > 1 m in one 5 Hz step (gating); dashboard shows both tracks with IDs stable.
Observe: track-ID timeline + overlay video; count ID-switches per 30 s (bar < 1). Golden-sequence saved with decoys for regression. FAIL = silent swap that drives T5 at the referee.

### RT-12 Arena lighting flicker + exposure hunt (50/60 Hz + auto-exposure)
Setup: S2 under LED shop lights (PWM dimmed to 50% if possible) + cam on AUTO exposure; then repeat with exposure locked + 100+ fps fixed.
Expected: AUTO run documents the failure (banding, pose jitter > 10 cm RMS on static target); LOCKED run meets T5-01 bars. Ship setting = locked exposure + fixed white balance (record values + commit).
Observe: static-target jitter RMS per setting, side-by-side logs. This is the "verify every claim against code" step: record the exact `v4l2`/tracker exposure lines that passed.

### RT-13 ESC desync / dShot dropout at full song
Setup: S1 box, 4000 RPM, full-throttle punch + rapid brake. Stimulus (if safely injectable): one motor bullet briefly high-R (spare-motor rig) or `dshot_telemetry_drop` log review after 10 punches.
Expected: desync = audible stutter + RPM disagreement → T1 detects (eRPM/telemetry divergence or accel-vs-command mismatch), cuts to safe-spin/brake, flags `ESC_FAULT`; NEVER single-motor full-throttle spin-out into the net.
Observe: eRPM logs both channels, accel trace, fault flag. Post-run: bullet/connector inspection photo (the usual root cause is connectors, not firmware).

### RT-14 Accelerometer saturation (±400 g clip on a big hit)
Setup: S1/S2, deliberate wall tap scaling up to match energy; log both H3LIS331DL @ 400 g full-scale.
Expected: clip flagged (`accel_sat_total` counts), heading coast on gyro/rigid model ≤ 300 ms, then re-converge per §2 hit bar; sustained saturation (> 500 ms) → safe-spin until readings sane. Single-accel drift lesson (firmware §B) is why TWO opposed @45° ship — prove one-sensor-unplugged still re-holds (degraded but safe) in one sub-run.
Observe: raw accel plot showing flat-top clip + recovery time; PASS = §2 hit bar met even with clipping, fault counter increments.

### RT-15 Wall-stall vs sim-bounce (the Studio lie, staged on purpose)
Setup: S2, drive into net/wall at 2500+ RPM and HOLD the command 3 s (sim says bounce-clear at 2.5 u/s min rebound + 0.12 s cooldown; real says scrub/stall).
Expected: real bot SCRUBS/STALLS (RPM sags, current rises, translation dies); T1/T2 detect stall (command-vs-velocity mismatch + RPM sag) within 1 s and cut to back-off/re-spin maneuver or brake — NOT held full-throttle grind; ESC/motor temps stay < 80 °C; no belt/bearing damage on inspection.
Observe: current/RPM/velocity plot during the 3 s grind + thermal spot check + post-run hardware photo. Purpose: burn the sim-vs-real gap into muscle memory before S3 tactics rely on wall bounces that don't exist.

### RT-16 Geofence mis-calibration (corners clicked in wrong order)
Setup: S2, deliberately calibrate overhead homography with corners swapped (mirror) + one run with scale off by 20% (wrong arena selected).
Expected: pre-run sanity gate catches it: commanded 1 m step at low RPM must match overhead-reported 1 m ± 20 cm or T3 is declared UNCALIBRATED and T5 stays disabled (interlock, not warning). If somehow armed, T1's independent geofence (Teensy-side, not cam-side) still contains the bot.
Observe: sanity-gate log (`cal_check: FAIL`), interlock proof (T5 enable rejected), T1 containment. Fix = re-click order card taped to the tote lid (photo in log).

### RT-17 Stale firmware config after blade swap (gains for the wrong weapon)
Setup: swap mid-cutter → undercutter (or wedge) WITHOUT loading its gain card (the rushed-pit mistake). Attempt S1 spin.
Expected: post-swap ritual (autonomy-plan §3: hand-spin → 1000 RPM → balance jig) + config-hash check catches mismatch BEFORE full RPM: vibration/RPM-hold error exceeds gate at 1000 RPM → STOP, load correct card, re-verify. Mass card re-weigh per RT-09 in the same stop.
Expected process: one hex size swap < 10 min INCLUDING scale + 1000 RPM check (time it 3×, record median).
Observe: vibration log + hash mismatch screenshot + swap timer. FAIL = full-RPM run on the wrong card.

### RT-18 Pack-sag brown-out under spin-up punch (low + hot pack)
Setup: S1 box, most-cycles pack at storage charge then topped (worst realistic IR), 2× 4S 550 mAh parallel per BOM. Full-throttle spin-up from rest while logging pack V + 5 V rail + Teensy `brownout_reset_total`.
Expected: sag (~1 V per Engineering page note) stays above T0/BEC dropout; if rail dips, behavior = F-03 (Teensy safe, Pi may reboot, bot does NOT run away); test ABORTS to battery-rotation fix (that pack becomes practice-only, labeled).
Observe: V-trace (spin-up sag depth + recovery), rail trace, reset counter. Record per-pack cycle count + IR if charger reports it; retire threshold written on the pack (tape + logbook agree).

---

## 7. Logging, sign-off, TRC mapping

Every run logs (minimum): date/stage/operator/kill-holder, firmware hash + T5 flag state, RPM cap, gain changed (or "none"), floor/lighting/pack ID, thresholds measured (not "pass" alone), video/log filenames.
Sign-off block per stage (copy/paste):

```
Stage __ exit: S0-_/S1-_/S2-_/S3-_ all PASS with numbers above.
Failsafe video: firmware/failsafe-test.mp4 hash ____. Scale photo: ____.
T5 flag: OFF/ON (commit ____). TRC pre-clear: N/A / drafted / granted ____.
Signed: __________  Date: ______  Next stage approved: YES / NO
```

TRC pre-clear packet (SPARC §6.4.3): failsafe film + S2 kill demo film + F-05 numbers + T5-03/TTL proof + T5-06 governor proof + this TEST.md hash + firmware freeze hash. Default if not granted: fight T4 human-gated (Pocket drives, hints advisory only).

---

## 8. Systematic-debugging footer (how to fail well)

On ANY fail: (1) write the hypothesis BEFORE touching gains ("I think X because log shows Y"); (2) predict what one change will move; (3) change ONE gain/thing; (4) re-run the SAME stimulus; (5) log observed-vs-predicted. Never change two gains + the floor + the pack in one run. Flaky = uncontrolled variable (usually pack sag, floor dust, loose fastener, or WiFi) — fix the rig before blaming the controller. Keep the failed log; golden regressions (T5-01 sequence, intent replay T5-08) must still pass after the fix.
