# Gauntlet 08 — Onboard Pi (T2 Supervisor) — Full Report

Agent: 8/10 (onboard-pi). Date: 2026-09-18. Scope: `audit/autonomy-plan-2026-09-18.md` §1 T2 row;
`firmware/README.md` §B/§C/§E; `BOM.md` §2 supervisor row; `manufacturing/P1-mass-audit.md` Branch E.
Output: `autonomy/PI.md` (new spec) + this report. Docs only, no code.

## 0. Skills (mandate compliance)

Mandate: first list via `skill` tool, then load `robot-perception`, `robot-bringup`,
`robotics-software-principles`.

- Attempted `skill(robot-perception)` → **not found**. Available: `customize-opencode` only.
- Attempted `skill(robot-bringup)` → **not found** (same).
- Attempted `skill(robotics-software-principles)` → **not found** (same).
- There is no list-subcommand on the `skill` tool in this environment; the three
  load attempts above are the complete good-faith execution of the mandate.

Fallback (stated honestly so the integrator can re-weight): worked from first principles
using the skill *intents* — perception = sensor honesty + calibration discipline;
bringup = boot order + watchdogs + log rotation; software-principles = governor pattern
(fail-safe defaults, rate separation, TTL on every intent). Each verdict in §7 cites
which intent drove it. If the real skill pack lands later, re-run §3.2 (spinning-camera
gating) and §6 (watchdog timing) against it — those are the two sections most likely
to gain from a true perception/bringup pass.

## 1. Files read (every file in scope, verified against tree 2026-09-18)

| File | What was taken from it | Line refs |
|---|---|---|
| `audit/autonomy-plan-2026-09-18.md` | §1 T2 row: Zero 2W 50–100 Hz trim/hit-recovery/RPM-hold/1080p-SD; T1 ignores bad T2 frames; T1 holds last-good ≤500 ms then safe-spin; T5 governor/TTL/kill-switch rules | §1 table, §1 iron rules |
| `firmware/README.md` | §B accel/ESC/batt wiring (dual H3LIS331DL, dShot600 @8 kHz, 4700 µF, divider); §C one-gain-at-a-time + Pi logs; §D failsafe film + brown-out rule; §E Pi#1 spec (Zero 2W + Cam v3 Wide, UART @115200, BEC 5 V/3 A on TPU, CRSF telem, 35–50 g) | §B:15, §C:21, §D:23–28, §E:30–33 |
| `BOM.md` | §2 supervisor row: Zero 2W + Cam v3 Wide + BEC isolated on TPU + UART (~40 g) + pit YOLO + LLM advisory-only | §2:37 |
| `manufacturing/P1-mass-audit.md` | Branch E only branch that flies (~650–800 g metal → ~1000–1250 g + electronics, leaves ~50 g for Pi+BEC); 80 cm³ body must not be steel; 1310 g build target vs 1361 g cap | Branch table:29, cap:5 |
| `manufacturing/materials-guide.md` | Ti-as-relief-valve only; steel ring = free KE; TPU cradle legal; 200 mph claim debunked (95 mph @8″/4000) | §3–§4 |
| `build-guide/02-electronics-setup.md` | FHSS owns link; 1 kHz MCU loop not Linux; Pi brown-out = MCU still failsafes; BEC→Pi on TPU; never power MCU from Pi USB | :6–7, :11 |
| `build-guide/03-testing-and-driving.md` | T0→T4 ladder; hit-recovery blip test; failsafe video + weigh-in gates | :15–17, :19–23 |
| `build-guide/00-start-here.md`, `01-frame-assembly.md` | Balance-is-everything; symmetric ring; trim-screw balance; weigh every subassembly | 01:5, 01:6 |
| `audit/match-ready-audit-2026-09-18.md` | Gate D bench checks (BEC/TPU/UART/CRSF/pit dashboard/human-gated YOLO); 1360-vs-1361 wording defect; firmware/ only-README defect; CadViewer chunk risk | Gates D:104–113, §1:45–58 |

Also listed `autonomy/` (empty), `base/` (empty), `radio/` (empty), `firmware/` (README only),
`audit/gauntlet-round/` (empty pre-run) to confirm greenfield status: no prior T2 spec to contradict.

## 2. Decisions locked in `autonomy/PI.md` (and why)

### D1 — 50 Hz binary nominal, 100 Hz bench-only ceiling (§2)
Autonomy plan says "50–100 Hz". Both are electrically possible on 115200 (§3 below),
but 100 Hz doubles IRQ/parse cost while the trusted vision solve only runs 20–30 Hz
(§4). Shipping 100 Hz TRIM messages carrying repeated vision data is theater. Fight
config = 50 Hz; 100 Hz stays a bench flag. Anyone re-opening this must re-run the
byte-budget block in PI.md §2.4 and keep nominal <35%.

### D2 — COBS + CRC16 + SEQ, fixed-size frames, T1 drops bad frames silently (§2.2–2.3)
Shock glitches the UART. Text protocols (NMEA-ish) waste 2–4× bytes and invite partial-line
bugs. Fixed 30 B STATE + 16 B TRIM + 24 B TELEM @5 Hz keeps the budget constant and
auditable. No NAK/retry on UART (retries couple the loops); reliability comes from
timeouts (§6), not ARQ.

### D3 — Rate decoupling: 50 Hz TRIM ≠ 50 Hz vision (§3.2)
The plan's "50–100 Hz optical-flow trim" is ambiguous. PI.md resolves it: TRIM publishes
at fixed 50 Hz; the vision front-end emits trusted solves at 20–30 Hz after RPM-phase
gating; the publisher holds/low-passes between solves. This is the only honest reading
on a Zero 2W and it preserves the plan's number where it matters (the wire rate T1 sees).

### D4 — Hit recovery executes on T1, Pi only suggests (§4)
Vision is blind ~100–300 ms after a real hit. Authority must live where the accelerometer
lives (T1 @1 kHz). Pi's `RECOVER_REQ` is a hint for soft stalls. Anti-toilet-bowl trio:
freeze integrator + re-seed LK + 200 ms authority ramp.

### D5 — Teensy owns CRSF; Pi requests via TELEM @5 Hz (§5)
Pi never touches the ELRS RX. Keeps the safety link (Pocket kill-switch) physically
separate from Linux. Telemetry = battery + RPM string + T2-link flag only.

### D6 — Nested timeouts 100 ms detect → 500 ms hold → safe-spin (§6)
Fits inside the 1 s RX-loss failsafe and the 1 s T3 expiry so timeouts never race.
Watchdog both directions + systemd/hw watchdog for Pi self-recovery + explicit
no-reset-line rule (Pi can never hold Teensy in reset).

### D7 — CSV 50 Hz + 1080p30 MP4 per match, circular video retention, free-space arm gate (§7)
Control logs are ~1 MB/match (keep 20). Video is ~225 MB/match (keep ~4, gate arming
at 500 MB free). Endurance card, ext4 `/data` separate from rootfs, 1 s fsync cadence.
This is the "log rotation matters at events" requirement made mechanical.

### D8 — Brown-out by construction, not by promise (§8)
Separate domains, no USB power, interrupt-driven RX with timeout, boot-order independence,
per-wire cut test + yank-Pi-power film as part of the failsafe video. Cites the existing
repo rule rather than inventing a new one.

### D9 — 35–44 g / ~500 mA typical on a dedicated BEC (§9)
Inside BOM ~40 g and Branch E ~50 g. Flight-pack cost ~10–17 mAh/match (<2%).
Overweight procedure = Ti weapon relief per materials-guide, never cap/failsafe deletion.

## 3. UART byte-budget verification (baud claims proved, not asserted)

Method: `python3` in-repo shell, 115200 8N1 = 10 symbols/byte → 11 520 B/s usable.

| Config | Math | Load |
|---|---|---|
| Nominal: 32 B STATE + 18 B TRIM @50 Hz + 26 B TELEM @5 Hz | (32+18)×50 + 26×5 = 2630 B/s | **22.8% — GO with 4× headroom** |
| Ceiling: same frames @100 Hz | (32+18)×100 + 26×5 = 5130 B/s | 44.5% — fits electrically, bench-only (no control benefit, §4) |
| Rejected: 80 B ASCII each way @50 Hz | 160×50 = 8000 B/s | 69% — no jitter/gain-mark margin. REJECTED in spec. |

Teensy-side sanity: 2630 B/s ≈ 2630 RX+TX interrupts/s spread over a 1 kHz loop —
≈2–3 bytes/loop, bounded parse ≤2 frames/loop, never blocks dShot @8 kHz. Pi-side:
50 Hz parse + CRC is <5% of one A53 core. Escalation rule in spec: frames stay ≤64 B
payload; if nominal ever exceeds 35%, move to 230400 + re-film failsafe (baud moves IRQ timing).

## 4. Optical-flow CPU/host honesty (the hard part — 100 Hz vision is NO-GO)

Zero 2W ground truth: 4× Cortex-A53 @1 GHz, 512 MB, no NPU, HW H264 encode via ISP/GPU.

- **Spinning-camera problem (novel to this agent's scope, must survive integration):**
  at 2000–4000 RPM the sensor rotates 33–66 rev/s. Naive dense flow measures rotation,
  not translation, and smears at standard exposure. Spec mandates: dual libcamera streams
  (1080p30 record + 320×240 flow input), sparse LK ≤80 pts on a masked annulus, ≤2 ms
  exposure, RPM-phase de-rotation from T1 STATE, quality-gated output (quality <40 → hold).
  Any downstream agent that re-opens "just run YOLO onboard" must answer where the
  512 MB + A53 budget comes from — YOLO lives on the pit laptop (T3), not the Zero.
- **Budget table (PI.md §3.3):** H264 1080p30 ~10–15% core; sparse LK @30–60 Hz in
  ~20–30% core (native code, flow core pinned); de-rotation + 50 Hz publish ~5–10%;
  UART/CRC/log ~5%; WiFi/TELEM ~5–10% bursty. Total ~50–70% of 2 cores, 2 cores idle.
- **Verdicts:** 50 Hz TRIM = GO (with pinning + native flow + Lite OS, no desktop/YOLO/browser).
  100 Hz trusted vision solves = NO-GO (sensor + exposure + A53 physics). 100 Hz TRIM
  messages = possible but dishonest (stale repeats). Thermal throttle at ~80 °C is
  expected in-bot: shim + vent + `get_throttled` in TELEM; throttled = worse trim, never
  unsafe (T1 unaffected).

## 5. Cross-checks against repo rules (nothing broken)

- Governor pattern kept: T1 RPM caps + geofence + safe-spin override anything T2 asks
  (autonomy plan §1 iron rules; software-principles intent).
- One-gain-at-a-time (firmware §C): `gain_id` on every CSV row + JSON sidecar with gain hash.
- Failsafe film (firmware §D + match-ready Gate A): spec adds the yank-Pi-power cut and
  the 500 ms-hold → safe-spin + TX-off <1 s to the film script; does not weaken it.
- Pit/cloud advisory-only (firmware §E, SPARC §6.4.3): T3 TTL 1 s / T4 TTL 5 s restated;
  T5 full-auto stays behind compile flag + TRC pre-clear (plan §1 T5 row) — this spec
  does not enable T5, it only makes T2 safe enough to be a T5 input later.
- Mass: Branch E margin + BOM ~40 g both met by §9 table (weigh YOUR stack).
- Out of scope honored (plan §6): no PCB, no motor/ESC change, no ring CAD re-model,
  no cloud-vendor lock-in. `autonomy/PI.md` §11 says so explicitly.

## 6. What was written

| File | Size / content | Status |
|---|---|---|
| `autonomy/PI.md` | 12 sections: wiring/pins, UART framing + message set + verified budget, flow loop + CPU honesty + trim law, hit FSM, CRSF forwarding, dual watchdog with timing, SD format + rotation, brown-out, weight/power, bringup order, failure modes, doc map | NEW — the build-to spec |
| `audit/gauntlet-round/08-onboard-pi.md` | this file — full evidence + verdicts | NEW |

Docs/new files only. No firmware, CAD, BOM numbers, or site code touched.
`npm run lint` / `npm run build` unaffected (no `web/` changes).

## 7. Verdict table (GO/NO-GO per pillar + driving skill-intent)

| Pillar | Verdict | Evidence | Intent |
|---|---|---|---|
| UART protocol @115200, 50 Hz | **GO** | §3: 22.8% nominal, fixed frames, COBS+CRC+SEQ | software-principles (rate separation) |
| 50 Hz trim loop on Zero 2W | **CONDITIONAL GO** — fight at 50 Hz TRIM / 20–30 Hz trusted flow, pinned cores, native LK, Lite OS | §4 budget ~50–70% of 2 cores | perception (sensor honesty) |
| 100 Hz vision solves | **NO-GO** — sensor/exposure/A53 physics; 100 Hz wire-only is theater | §4 | perception |
| Hit recovery | **GO** — T1-executes/T2-suggests FSM + anti-windup trio | PI.md §4, build-guide/03 blip test | software-principles (governor) |
| CRSF forwarding | **GO** — Teensy-owns-RF, TELEM @5 Hz, Pocket shows batt/RPM/T2-flag | PI.md §5, Gate D bench check | security (e-stop separation) |
| Dual watchdog (100/500 ms) | **GO** — nested inside 1 s RX-loss + 1 s T3 TTL, no reset line | PI.md §6 | bringup + security |
| SD logging + rotation | **GO** — CSV+MP4+JSON, 500 MB arm gate, circular video, ext4 `/data` | PI.md §7 | bringup (log rotation) |
| Brown-out (Pi dies → T1 lives) | **GO (spec)** — construction + cut tests; **UNPROVEN until filmed** | PI.md §8, firmware §D film | security + bringup |
| Weight/power (BOM ~40 g, Branch E ~50 g) | **GO (spec)** — 35–44 g / ~500 mA typ; **UNPROVEN until scaled** | PI.md §9 | software-principles (margin discipline) |

**Overall: CONDITIONAL GO for `autonomy/PI.md` as the T2 build-to spec.**
Conditions (both are physical gates, not paperwork): (1) film the brown-out cut
(yank Pi power mid-spin → 500 ms hold → safe-spin; TX-off → stop <1 s) per firmware §D;
(2) scale the real T2 stack (Pi+cam+BEC+TPU+wire ≤45 g) and log it against Branch E.
Until both exist, match-ready Gates A/B stay NO-GO per the 2026-09-18 snapshot — this
agent does not flip them.

## 8. Residual risks (carry forward — do not silently close)

1. **Spinning-camera trust:** de-rotation quality in a dusty, flash-lit arena is unproven.
   First track test may show quality <40 most of the time → T2 degrades to RPM-hold +
   logger (still useful, still safe). Do not raise authority to compensate.
2. **Zero 2W thermal throttle in-bot:** expect it; trim degrades gracefully but logs must
   capture `throttled` flags or the tune will chase ghosts.
3. **SD wear/fill at multi-day events:** rotation logic is only as good as its bench test —
   fill a scratch card to the 500 MB gate and watch it refuse + rotate before trusting it.
4. **WiFi congestion at venue:** T3 @5 Hz will drop; T2-alone behavior (§6) must be the
   tested default, not the fallback.
5. **1360-vs-1361 wording + `firmware/` only-README + CadViewer chunk:** pre-existing defects
   from match-ready audit §1/§7, untouched by this agent, still open for their owners.
6. **Skills absent:** perception/bringup/principles packs were unavailable; §3.2 + §6 deserve
   a re-pass when they land. The byte budget (§3) and mass table (§9) are arithmetic and
   stand regardless.

## 9. Handoff (for integrator + neighboring agents)

- Agent 7 (Teensy/T1 governor): implement STATE/TRIM/TELEM structs + 100/500 ms watchdog +
  RECOVER FSM + CRSF Battery/Attitude/Flight-Mode forwarding; own the RPM cap. My frame
  sizes are your IRQ budget — push back here if they pinch dShot.
- Agent 9 (pit base/T3): consume TELEM + CSV sidecars; publish opponent pose @~5 Hz with
  1 s TTL; own `base/setup.sh` GO/NO-GO including the SD-gate + link self-test.
- Main integrator: keep `autonomy/PI.md` as the single T2 source; any baud/rate/authority
  change must update §2.4's verification block + §9's scale table in the same diff.
