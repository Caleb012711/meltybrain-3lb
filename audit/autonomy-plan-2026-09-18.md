# Autonomy Plan — Eyeliner 3lb full-auto + cam base + Pocket + modular blades (18 Sep 2026)

> Status: PLAN. Execution = the 10-agent deep gauntlet round defined in §8.
> Research grounded 2026-09-18: RadioMaster Pocket reviews (FPV Drone Guide,
> Unmanned Tech, Roborear: ~$65–80 / ~£50–65 ELRS, hall gimbals, best value);
> NHRL wiki DeepMelt (fully autonomous Liftoff twin, 3–2 debut Nov 2022, IR-radar
> state machine, "drunken 3-year-old"); Project Liftoff page (2025 newly modular
> weapon: swappable mid-cutter / undercutter / flying wedge; Teensy 4.0 + dual
> H3LIS331DL + dShot600 @8 kHz; hybrid cleat/silicone wheels).

## §0. Verdicts up front

1. **RadioMaster Pocket ELRS: YES, best at the price — with exact spec.**
   Hall gimbals + internal ELRS 2.4 GHz + EdgeTX + nano bay at ~$65–80 is
   unmatched under ~$100; next step up (TX12 MKII ~$90–100) buys screen/channels
   a melty doesn't need (8 channels is plenty: throttle/arm/mode/autonomy-kill +
   CRSF telemetry back). Buy: **Pocket ELRS (NOT CC2500), Mode 2, correct
   FCC/LBT region, 2× flat-top unprotected 18650 (NOT included, protected cells
   don't fit)** + ELRS EP1/RP1 receiver (CRSF to Teensy UART). Configure in
   EdgeTX Companion (1.3″ screen is painful standalone). For autonomy the Pocket
   stays as the **safety link + kill switch** even when the bot drives itself.
2. **Modular blades: YES — copy Liftoff 2025.** Swappable mid-cutter (=
   `Standard Weapon Teeth.step` on hand), undercutter (= `Undercutter Config.step`
   on hand), wedge. One bolt-circle + tapered register interface, per-config mass
   card, sub-10-minute swap, spares kit.
3. **Full autonomy: feasible, DeepMelt-proven, but ONLY as T5 on top of T0–T4**
   with an onboard governor, a base station, and a TRC pre-clear path. Nobody
   rips out the Teensy loop — autonomy *commands*, the MCU *governs*.

## §1. Autonomy stack (extends the T0–T4 ladder in build-guide/03)

| Tier | Where | Rate | Job | Failsafe |
|---|---|---|---|---|
| T0 | Teensy 4.0 | always | failsafe/brake, boot interlock, RX-loss stop <1 s | IS the failsafe |
| T1 | Teensy 4.0 | ~1 kHz spin | RPM/heading hold, dShot600 @8 kHz, dual H3LIS331DL @45° | T0 watches T1 |
| T2 | Onboard Pi Zero 2W | 50–100 Hz | optical-flow trim, hit recovery, RPM-hold, 1080p log to SD | T1 ignores bad T2 frames; T2 watchdog → T1 holds last-good ≤500 ms then safe-spin |
| T3 | Pit base (laptop) | ~5 Hz | overhead-cam YOLO track both bots, dashboard, one-tap gain push | link loss → T2 continues alone, T3 commands expire in 1 s |
| T4 | Cloud models | seconds | VLM strategy hints (human-gated until cleared) | hints advisory-only, expire in 5 s |
| **T5** | **T2+T3 fused** | **10 Hz intent** | **FULL AUTO: track → predict → drive-intent → T1 governor executes** | **ANY of: Pocket kill-switch, T0 watchdog, T3 link-loss >1 s, geofence/arena-exit, RPM-cap breach → instant T1 safe state. Autonomy needs TRC pre-clear per SPARC §6.4.3 — default ship = human-gated T4, T5 behind a compile flag + checklist.** |

Iron rules: cloud NEVER drives (intents only, via T3); every intent carries a
TTL; T1 enforces RPM caps + arena geofence regardless of what T5 asks; the
Pocket's momentary switch is a hardware-priority kill (tested like the failsafe film).

## §2. The cam base (pit-side, easy setup = the whole point)

One plastic tote: laptop + USB overhead camera + tripod + travel router + Pocket.
- `base/setup.sh` — ONE command: installs deps, pulls container, checks camera,
  runs link self-test (ELRS RSSI + WiFi latency + camera FPS), prints GO/NO-GO.
- `base/docker-compose.yml` — tracker (YOLO), dashboard (RPM/G/batt/temp),
  cloud bridge (batches frames+hints, handles drops), all pinned versions.
- Overhead cam maps pixels→arena once per event (4-corner click calibrate);
  T3 publishes opponent pose at ~5 Hz; T2 fuses with onboard optical flow.
- No-build alternative: documented manual path (pip + python) for laptops that
  can't run docker.

## §3. Modular blades interface (locks geometry + ops)

- **Interface:** single bolt circle (size/TPI + torque + Loctite 243 from
  01-frame-assembly), tapered register for concentricity, symmetric-only rule
  (NO extra holes — crack starters), trim-screw balance points (never drill).
- **Configs:** A standard mid-cutter teeth (fight default), B undercutter
  (forks/wedges), C wedge (control). Per-config mass card (teeth-pair volume
  55.63 cm³ → 437 g steel / 246 g Ti) with branch (Ti comfort vs steel tight).
- **Good blades spec:** tooth height vs bite math, leading-edge chamfer (no
  knife edges that fold), spare teeth pre-balanced as pairs, swap <10 min with
  one hex size, post-swap spin-check ritual (hand-spin → 1000 RPM → balance jig).
- **Spares kit:** teeth pair, cleats, ESC, pack, fastener set (extends BOM §4).

## §4. Ease-of-setup ladder (beginner → fight → auto)

1. `base/setup.sh` GO green. 2. Flash baseline (OpenMelt2 rig → Teensy).
3. Bind Pocket (Companion file provided, `radio/`). 4. Bench spin, no weapon.
5. Failsafe film. 6. Weigh-in. 7. T2 Pi on (assist). 8. T5 auto ONLY in test
box with kill-switch demo filmed. Every step has a Done checkbox and a
"stuck? →" pointer. No step assumes prior FPV/EdgeTX knowledge.

## §5. Skills the gauntlet must use (as many as apply — all 10 robotics + superpowers)

`robotics-software-principles` (governor/fail-safe defaults), `robotics-design-patterns`
(FSM/BT for T5 modes, HAL for sensor swap), `robot-perception` (overhead+onboard
tracking, calibration), `robotics-testing` (bench→box→arena progression, mock
hardware), `robot-bringup` (base boot order, watchdogs, log rotation),
`robotics-security` (kill-switch isolation, e-stop separation, link-loss behavior),
`ros2-web-integration` (dashboard/bridge patterns — plain HTTP/WS, no ROS required),
`docker-ros2-development` (container patterns for the base), `ros2`/`ros1`
(only where message-passing patterns genuinely help — do NOT force ROS onto the
Teensy), superpowers `systematic-debugging`, `verification-before-completion`,
`brainstorming`.

## §6. Out of scope (say so explicitly in outputs)

No custom PCB this round, no motor/ESC changes, no CAD re-modeling of the ring
body, no cloud-vendor lock-in (any OpenAI/Anthropic-class VLM via one adapter).

## §7. Done criteria for the round

New dirs `autonomy/`, `base/`, `radio/`, `manufacturing/blades/` with READMEs a
beginner can follow; `BOM.md` + site `/bom` + `/firmware` + `/engineering`
consistent with new content; `npm run lint` + `npm run build` still clean;
verdict table (GO/NO-GO per pillar + residual risks + TRC pre-clear letter draft).

## §8. Gauntlet round (10 deep agents — the actual execution order below)

Each agent: FIRST use the `skill` tool to list + load its assigned skills (name
them in the report), work the scope until truly done (this is a 10+ minute task
per agent: read every file in scope, verify every claim against code/CAD/docs,
iterate, do not summarize-and-stop), write its FULL report + diffs to
`audit/gauntlet-round/<agent>.md`, and return a ≤15-line summary. Main agent
dedupes, applies, verifies, reports.
