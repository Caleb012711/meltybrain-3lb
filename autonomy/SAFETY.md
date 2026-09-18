# Autonomy Safety Manual — Eyeliner 3lb (T0–T5)

> Authority: this manual implements the iron rules in `audit/autonomy-plan-2026-09-18.md` §1 and the
> failsafe law in `firmware/README.md` §D/§E, `build-guide/02-electronics-setup.md` rules section,
> `build-guide/03-testing-and-driving.md`, and the every-route notice in
> `web/src/components/Layout.tsx` (footer, ll. 79–84: FHSS ELRS match link with failsafe; pit and
> cloud software never drive). Full rationale + contradiction audit:
> `audit/gauntlet-round/02-safety-case.md`. Default ship = human-gated T0–T4. T5 full auto is
> test-box-only, compile-flag-gated, and requires written TRC pre-clear per SPARC §6.4.3.

## 1. Tier model (what each tier may and may not do)

| Tier | Where / rate | Job | May | May NEVER |
|---|---|---|---|---|
| T0 safety | Teensy 4.0, always (~1 kHz loop) | Failsafe/brake, boot interlock, RX-loss stop <1 s | Cut power to motion, latch disarm, demand re-arm | Be blocked, voted down, or slowed by any higher tier |
| T1 governor | Teensy 4.0, ~1 kHz | RPM/heading hold, dShot600 @8 kHz, dual H3LIS331DL @45° | Execute vetted intents; clamp/reject over-cap or stale intents and log it | Execute an intent that fails TTL, caps, or kill-state checks |
| T2 assist | Pi Zero 2W, 50–100 Hz | Optical-flow trim, hit recovery, RPM-hold, 1080p SD log | Send bounded intents to the T1 mailbox; report health | Drive ESCs directly; mask T0; invent containment when T3 is stale |
| T3 base | Pit laptop, ~5 Hz | Overhead-cam YOLO (both bots), dashboard (RPM/G/batt/temp), one-tap gain push | Publish advisory poses + hints with TTL; display kill state | Drive the bot; serve as any e-stop path (no WiFi e-stop) |
| T4 cloud | Laptop/hotspot, seconds | VLM strategy hints, log review | Suggest ("opponent hugging left wall…") for driver approval | Move anything; hints expire in 5 s, advisory-only |
| T5 full auto | T2+T3 fused, 10 Hz intent | Track → predict → drive-intent → T1 executes | Request auto ONLY when flag + letter + fresh containment + test box/arena clearance all hold | Exist by default: compiled OUT unless `AUTONOMY_FULL_AUTO=1` (default 0) |

Iron rules: cloud NEVER drives (intents only, via T3); every intent carries a TTL; T1 enforces RPM
caps regardless of what T5 asks (geofence rule: T5 permitted only while fresh T3 containment +
onboard flow agree inside — see §5); the Pocket momentary switch is the highest-priority RC kill,
decoded in T0 ahead of everything, proven by film.

## 2. Kill-switch design (Pocket momentary → T0 priority path)

- Radio: RadioMaster Pocket ELRS (NOT CC2500), Mode 2, correct FCC/LBT region; 2× flat-top
  unprotected 18650 (protected cells don't fit); EdgeTX Companion for programming.
- Receiver: ELRS EP1/RP1, CRSF to Teensy UART. SBUS retained as bench fallback only; CRSF is the
  frozen match path so telemetry (RSSI, RPM, batt) reaches the Pocket + pit dashboard.
- Proposed channel map (freeze in `radio/` with Companion file + version): CH1/CH2 translate,
  CH3 arm (latching, deliberate), CH4 mode (manual / assist / auto-request), **CH5 autonomy-kill
  on the SH momentary, wired fail-safe: frame loss, RX failsafe, or released switch all read as
  KILL ASSERTED**, CH6 spin enable, CH7/CH8 spare + telemetry. RX failsafe values programmed to
  throttle-cut + disarm + kill-asserted, independent of the Teensy.
- Priority: T0 decodes CH5/failsafe flag/frame-gap FIRST every loop, before T1/T2/T5. Kill latches
  to DISARMED; releasing the momentary does NOT resume motion; re-arm is a deliberate stick+switch
  sequence (boot interlock: never boots armed with throttle high; no restart until re-arm).
- The kill shares no parser/buffer/task with the WiFi/UART intent path: a wedged Pi, flooded UART,
  or dead laptop cannot stall the CRSF read. True hardware stop remains the removable link
  (link pull kills everything; <60 s link drill; LiPo bag; wheel locks/covers ON until box).

## 3. Timing budgets (command cut, not physics)

"Motors STOP/brake <1 s" (firmware §D) means **brake commanded** in <1 s; a 4000 RPM ring's
physical spin-down is measured and reported, not budgeted.

- ELRS loss → RX failsafe frame: ≤100 ms (log actual LinkStatistics).
- T0 detect (kill / failsafe / gap): ≤1 loop period (~1 ms).
- T0 → ESC brake (dShot600): ≤10 ms.
- **Target finger/TX event → brake commanded: <150 ms (<1 s with >10× margin).**
- T2 hold on frame jitter: last-good ≤500 ms, then safe state (brake/stop).
- T3 commands expire 1 s; T3 silence >1 s → T2 onboard-only, T3 verdicts ignored.
- T4 hints expire 5 s, advisory-only, expire visibly in the log.
- Every budget line is a filmed/logged test: TX-off film, kill-switch demo (incl. laptop-OFF
  negative test proving the kill is not a WiFi path), Pi-UART-unplug log, WiFi-kill log,
  hint-expiry log.

## 4. E-stop / link-loss behavior per tier

- **T0:** any RX gap over threshold, kill-asserted, or failsafe flag → STOP/brake, latched disarm.
  Boot interlock checked every power-up. Link pull → power cut regardless of software.
- **T1:** drops bad/expired T2 frames; dual-accel disagree → cap RPM or stop (never dead-reckon
  through damage); executes T0 safe state within one cycle (brake, not coast).
- **T2:** UART/telemetry gap → flag degraded, stop publishing intents after hold window, keep
  logging (log the kill/loss itself). Brown-out of the Pi must leave T0 cutting normally —
  BEC 5V/3A on TPU standoffs; NEVER power the Teensy from Pi USB in-bot.
- **T3:** WiFi loss → T2 continues alone; all T3 frames carry TTL and are dropped at 1 s.
  Dashboard shows kill/loss state; it does not source it.
- **T4:** drops handled by the bridge; hints die at 5 s with no motion effect.
- **T5 (pre-cleared only):** ANY of Pocket kill, T0 watchdog, T3 loss >1 s, containment-exit,
  or RPM-cap breach → instant T1 safe state; 3 consecutive intent drops → degrade to T2-assist
  and notify pit; no auto re-request for N s after a kill without driver + spotter confirm.

## 5. Geofence + RPM caps

- **RPM caps:** bench/test cap 1500–2000 RPM; fight envelope ≤4000 RPM (Liftoff 2000–4000;
  OpenMelt2 heritage 3200 is a learning-rig number, not permission). T1 clamps every intent and
  logs rejections; pit dashboard flashes max-RPM. Proof: 2k→3k→4k ramp log with heat checks per
  `03-testing-and-driving.md`, plus cap-breach injection (over-cap intent → rejected + logged).
- **Geofence:** the Teensy alone cannot know absolute arena position, so T1 enforces the rule it
  CAN enforce: **no fresh containment → no auto.** T5 is permitted only while a fresh (≤1 s) T3
  arena polygon + opponent pose AND onboard flow agree the bot is inside; any disagreement,
  staleness, or exit verdict → T1 safe state. Overhead cam is calibrated per event (4-corner click);
  calibration record is part of the evidence pack. The Studio web sim (which bounces off walls)
  is NOT validation — the real bot stalls/scrubs, and autonomy is proven in the test box.

## 6. What must NEVER happen

N1 cloud/pit drives actuators directly. N2 autonomy masks the kill/failsafe. N3 boot-armed /
resume-after-brown-out / resume-on-stale-stick. N4 stale intent executes past TTL. N5 RPM over cap.
N6 auto outside the box / without spotter-on-kill / without written TRC yes. N7 Pi power takes down
MCU failsafe. N8 single-accel drift runaway after hits. N9 arena-exit under auto keeps driving.
N10 match-day flash/config change without re-test (freeze version; back up config + logs in
`firmware/`; one gain at a time). N11 e-stop depending on WiFi/ROS/laptop. N12 silent
expiry/mode change (run `base/setup.sh` GO/NO-GO: RSSI + latency + FPS — NO-GO blocks auto).
N13 people/pets in plane of spin, covers off outside the box, LiPo shortcuts (concrete floor,
bag, drill). Automatic response in every case: stop safely, latch, log. (Full table with evidence
per row: safety-case §5.)

## 7. Bringup / shutdown / test progression

Bringup: link check → T0 self-test + interlock → T1 sensors sane (RPM ~0 at rest) → ESC
beacon/direction → heading LEDs (green = front, visible through window) → T2 boot + UART handshake
→ T3 camera calibrate + `setup.sh` GO → T4 bridge optional → T5 ONLY if flag + letter + box.
Shutdown is the reverse down to link pull → LiPo to bag. Progression bench (no weapon energy) →
low-RPM slide 500–1000 → trim → 2k→3k→4k ramp → hit-recovery blip → 3-min match sim → test-box auto
with kill demo → arena auto only under written permission. Log RPM/accel/batt/temp every run;
rotate logs on both Pis.

## 8. Match-day freeze

Firmware version frozen; no flash at event without full re-test + new films. Config + logs backed
up in `firmware/`. Scale photo at the stated cap (1361 g everywhere — 3 lb = 1360.8 g). Spares packed (teeth, cleats, ESC,
pack, fasteners). `setup.sh` GO printout saved for the day. Spotter holds the Pocket, thumb on
kill, for every auto run.

## 9. TRC pre-clear letter — DRAFT (copy into email / event form, attach §10 pack)

> Subject: Pre-clear request — 3lb meltybrain Eyeliner: ELRS match link + supervised autonomy
> (SPARC §6.4.3)
>
> Dear [TRC / event organizer team],
>
> We are entering a 3lb meltybrain (translational-drift spinner, ≤1361 g,
> Teensy 4.0 + dual H3LIS331DL + AM32 dShot600, PROPDRIVE 2836 hubmotors) and request pre-clear
> under SPARC §6.4.3 for two things: (1) our ELRS match link (RadioMaster Pocket ELRS, Mode 2,
> [FCC/LBT], EP1/RP1 over CRSF, independent RX failsafe = throttle-cut + disarm), and
> (2) supervised full-auto mode (T5) in addition to our default human-driven / human-gated assist
> modes (T0–T4).
>
> **What flies by default (no autonomy permission needed):** human-driven melty with onboard
> RPM/heading hold, onboard-Pi trim/logging, pit dashboard, and human-approved cloud hints only.
> Pit and cloud software never drive; every remote intent carries a TTL; the MCU governor enforces
> RPM caps and drops stale intents. This matches the failsafe notice we display on all our docs.
>
> **What we ask permission for:** T5 full auto (fused overhead-cam + onboard-flow intents at
> 10 Hz into the MCU governor), ONLY in the test box and arena, ONLY with a spotter holding the
> Pocket with thumb on a momentary kill switch, ONLY on firmware version [X.Y.Z] in the attached
> logs. The kill channel is decoded first in the MCU loop ahead of all autonomy, latches to
> disarmed, and needs a deliberate re-arm; RX loss brakes in <1 s (command cut); T3-link loss
> >1 s, containment-exit, or RPM-cap breach each force the same safe state. WiFi/cloud never form
> any stop path — the FHSS kill and the physical removable link do. T5 ships compiled OUT by
> default and is enabled per-run only after the day's kill demo passes.
>
> **Three questions:** (a) Is supervised T5 acceptable at your event, and under what constraints
> (test box only? arena with spotter? specific demo first?)? (b) What stop authority / access do
> your staff require (our link pull + Pocket kill demo at check-in? your own TX bound? arena
> e-stop integration?)? (c) What evidence format do you prefer (attached films + logs, live demo
> at check-in, both)?
>
> **Attached:** failsafe film (TX-off → brake, re-arm discipline, Pi-power-yank brown-out,
> boot-interlock), kill-switch demo (auto-request → momentary tap → latched stop, incl.
> laptop-off repeat), RPM-cap proof (2k→3k→4k log + over-cap rejection), link-loss trilogy logs,
> containment calibration + exit-injection log, frozen firmware version + config backup, scale
> photo. We will operate strictly inside whatever you approve — including "T4 human-gated only"
> — and welcome any extra constraint.
>
> Thank you for keeping the event safe. Contacts: [name / phone / email]; pit crew: [names].
> Firmware: [version + hash]; radio: Pocket ELRS [region], EP1/RP1, failsafe profile [name].

## 10. Evidence checklist (filenames; all must exist before the letter goes out)

- [ ] `firmware/failsafe-test.mp4` (TX-off <1 s command cut + wall clock; deliberate re-arm;
      Pi-yank; boot throttle-high stays disarmed) + checklist ticked (`firmware/README.md` §D).
- [ ] `firmware/kill-switch-demo.mp4` (auto-request → tap → latched stop → re-arm; laptop-OFF repeat).
- [ ] RPM-cap log (2k→3k→4k + temps) + over-cap-rejection log + dashboard max-RPM flash still.
- [ ] Link-loss logs (T2 unplug ≤500 ms hold → safe; T3 WiFi kill >1 s → solo; T4 hint 5 s expiry).
- [ ] Containment record (4-corner calibrate + exit-injection → safe, never drives out).
- [ ] Frozen version string in log headers + config backup + `base/setup.sh` GO printout + scale photo.
