# Safety Case — Full Autonomy (Agent 2/10, 2026-09-18)

> Agent: 2/10 safety-case. Scope: `audit/autonomy-plan-2026-09-18.md` (§1 iron rules + §7),
> `firmware/README.md` §D/§E, `build-guide/02-electronics-setup.md` (rules section),
> `build-guide/03-testing-and-driving.md`, `web/src/components/Layout.tsx` footer.
> Companion operator document: `autonomy/SAFETY.md` (includes full TRC pre-clear letter draft).
> Status: PLAN + SAFETY CASE. No code, no wiring, no firmware changed by this agent (docs only).

## 0. Skills + sources

**Skills:** the task mandates `robotics-security`, `robot-bringup`, `robotics-software-principles`
via the `skill` tool. Attempted all three via `skill` tool on 2026-09-18 — host returned
`Skill not found. Available skills: customize-opencode` for each. Fallback (documented so the
gauntlet can reproduce): read the checked-in skill bodies directly and applied them:

- `.opencode/skills/robotics-security/SKILL.md` — e-stop independence (§Physical-Cyber Safety
  Intersection, ll. 498–538), safety-controller isolation, command validation + watchdog to zero
  (ll. 540–624), anti-patterns #6 e-stop-over-network and #8 disabling security (ll. 846–879),
  checklist items 9–11 (ll. 889–891).
- `.opencode/skills/robot-bringup/SKILL.md` — layered bringup, ordered startup with health checks,
  watchdog/heartbeat monitor (heartbeat → safe stop, ll. 1147–1268), graceful shutdown to safe
  state (ll. 1420–1531), log rotation.
- `.opencode/skills/robotics-software-principles/SKILL.md` — P6 separation of rates (ll. 463–524),
  P7 fail-safe defaults incl. `ACTION_ON_TIMEOUT='stop'`, `ACTION_ON_SENSOR_LOSS='stop'` (ll. 528–600),
  P10 observe-everything, P12 graceful degradation.

**Scope files read fully (no sampling):**

| File | Lines | Key content used |
|---|---|---|
| `audit/autonomy-plan-2026-09-18.md` | 110 | §1 tier table T0–T5 + iron rules (ll. 32–43); §7 done criteria (ll. 97–101) |
| `firmware/README.md` | 39 | §D failsafe (ll. 23–27); §E pit/cloud advisory-only per SPARC §6.4.3 (ll. 29–33); checklist (ll. 35–39) |
| `build-guide/02-electronics-setup.md` | 21 | Rules that override everything (ll. 5–7); Pi wiring rule (l. 14); pre-spin check (l. 15) |
| `build-guide/03-testing-and-driving.md` | 23 | Safety first (l. 6); autonomy ladder T0–T4, T3/T4 never drive (ll. 15–17); done-when (ll. 19–23) |
| `web/src/components/Layout.tsx` | 87 | Footer failsafe/advisory notice (ll. 79–84) |
| Cross-checks | — | `build-guide/00-start-here.md` (8 steps, P0 TRC pre-clear); `build-guide/01-frame-assembly.md`; `BOM.md` §§2/weight; `manufacturing/P1-mass-audit.md`; `audit/match-ready-audit-2026-09-18.md` Gates A–E; `site/*.html` safety copy |

## 1. Iron rules (from autonomy-plan §1, restated verbatim + adjudicated)

Plan §1 iron rules (ll. 41–43):

1. Cloud NEVER drives (intents only, via T3).
2. Every intent carries a TTL.
3. T1 enforces RPM caps + arena geofence regardless of what T5 asks.
4. The Pocket's momentary switch is a hardware-priority kill (tested like the failsafe film).

Adjudication against the repo (see §7 for full contradiction table):

- Rules 1–2 are **already repo law** and consistent everywhere: `02-electronics-setup.md:6`
  ("WiFi/cloud NEVER drives — advisory only"), `firmware/README.md:29` ("advisory only — NEVER
  drives, per SPARC §6.4.3"), `03-testing-and-driving.md:16` ("T3/T4 never drive"),
  `Layout.tsx:80` ("Pit and cloud software never drive"). T5 as drawn in the plan table
  (T2+T3 fused 10 Hz intent → T1 governor executes) is therefore **not covered by current law** —
  it reclassifies the T3 path from advisory to motive. That is exactly why the plan gates T5
  behind TRC pre-clear + compile flag + checklist (l. 39). This safety case **upholds that gate**:
  default ship = human-gated T4; T5 is opt-in, test-box-only, pre-cleared-only. Any reading of
  rule 1 as "T3 can drive once we call it autonomy" without a TRC letter is rejected.
- Rule 3 is **aspirational, not implemented**: no governor code exists in-repo (`autonomy/`,
  `base/`, `radio/` are all empty dirs as of 2026-09-18; `firmware/` is README-only). RPM caps
  today are configurator values + driver discipline (firmware README l. 18: test cap 1500–2000
  RPM, Liftoff target 2000–4000 RPM), not an independent T1 veto of T5 intents. Geofence has no
  sensor path that T1 can enforce alone (see §5.4). So rule 3 is adopted as a **build-to
  requirement** with acceptance tests in §5, not a claim of current compliance.
- Rule 4's word "hardware-priority" is **overstated** and must be reworded in operator docs to
  "highest-priority RC channel, decoded in T0 ahead of all autonomy, on the dedicated FHSS link"
  (see §4). Per `robotics-security` e-stop independence, no wireless switch — ELRS included — is
  a hardwired e-stop. The true hardware stops remain the removable link (`02-electronics-setup.md:15`:
  "link pull kills everything") and the <60 s link drill (`03-testing-and-driving.md:6`). The Pocket
  kill is the fastest *commanded* stop; the link pull is the *physical* stop. Both are required.

## 2. SPARC §6.4.3 compliance path

The repo cites "SPARC §6.4.3" as the autonomy gate (`firmware/README.md:29`, `03:17`,
autonomy-plan l. 39) but **no copy of SPARC text is in the repo** — the plan's citation is taken
on trust and the Layout footer correctly defers ("SPARC / TRC rules via your event organizer",
`Layout.tsx:83`). This safety case therefore does NOT assert what §6.4.3 says. It defines a
compliance path that holds under any reasonable reading ("autonomy needs explicit organizer
permission; human in the loop is the default"):

**Phase 0 — compliant today (no letter needed, but P0 pre-clear for ELRS still applies):**
T0–T4 exactly as documented: MCU owns spin + failsafe; Pi Zero 2W does trim/logging/flow;
pit laptop does YOLO dashboard; cloud does seconds-latency hints; driver approves every hint
(`firmware/README.md:32`: "driver must approve"). Footer notice on every route (`Layout.tsx:79–84`).
DIY handset = trainer/pit tool only (`03:17`).

**Phase 1 — build the governor before asking for anything:**
Implement T1 as a genuine safety controller per `robotics-security` isolation pattern:
bare-metal Teensy loop, no Linux dependency, validates every T2/T3/T5 intent against RPM caps,
TTL, rate limits, and link state; rejects out-of-bounds intents; watchdogs to safe state.
`robotics-software-principles` P7: default to stop on timeout / unknown state / sensor loss.
Gate: bench + test-box evidence (§8) before the letter goes out.

**Phase 2 — ask (TRC pre-clear letter):**
Send the draft in `autonomy/SAFETY.md` §9 **before** any arena auto run. Ask three explicit
questions (what autonomy is, what stop authority the organizer retains, what evidence format they
want), attach the evidence pack (§8: failsafe film, kill-switch demo, RPM-cap proof, frozen
firmware version + config backup). Default to "no" until a written yes. `00-start-here.md:7,18`
already requires messaging TRC early for any custom/DIY radio — autonomy is a stricter instance
of the same duty, plus the match radio stays the Pocket ELRS + EP1/RP1 (`03:17`, `BOM.md:31`).

**Phase 3 — operate under the permission, not around it:**
T5 compiled in ONLY with `AUTONOMY_FULL_AUTO=1` (default 0 = human-gated T4), checklist signed,
spotter holding the Pocket with thumb on kill, test-box first, event arena only after the
test-box kill demo passes that day. Any organizer condition overrides this document. Match-day
firmware frozen (`firmware/README.md:39`); no flash at event without re-test.

What the letter does NOT ask for: permission to run WiFi-direct drive, cloud-direct drive, or
any mode where link-loss does not stop the bot. Those are never requested because they violate
the iron rules.

## 3. Kill-switch design (Pocket momentary → priority path + timing budget)

### 3.1 Channel and switch assignment (proposal — must be frozen in `radio/` by the radio agent)

- Radio: RadioMaster Pocket ELRS (NOT CC2500), Mode 2, correct FCC/LBT region (autonomy-plan l. 17).
- Receiver: ELRS EP1/RP1, CRSF to Teensy UART (plan ll. 19–20; `BOM.md:31`; `02:13` SBUS/CRSF option
  locked to CRSF for this build so telemetry flows back to the Pocket).
- Proposed mapping (8 channels are plenty, plan l. 16): CH1/CH2 translation stick, CH3 arm
  (latching, deliberate action), CH4 mode (manual / assist / auto-request), **CH5 autonomy-kill on
  the momentary switch (default = KILL ASSERTED)**, CH6 spin enable, CH7/CH8 spare + telemetry.
  Kill is **active-low-safe**: loss of frame, failsafe value, or released-momentary all read as KILL.
  Exact switch (SH momentary on Pocket) + EdgeTX logical-switch file + failsafe values to be
  committed under `radio/` with Companion version pinned (plan §4 step 3 warns the 1.3″ screen is
  painful standalone — configure in Companion, verify on-radio).
- RX failsafe programming (independent of Teensy): on FHSS loss, RX outputs failsafe frame =
  throttle cut + disarm + kill-asserted. Teensy T0 treats "failsafe flag OR kill-asserted OR frame
  gap > threshold" identically: safe state. This satisfies `02:6` (independent failsafe on the
  primary FHSS link).

### 3.2 Priority path (why it survives T5)

```
Pocket SH (momentary) ──ELRS FHSS (dedicated, NOT WiFi)──▶ EP1/RP1 ──CRSF──▶ Teensy UART
        │                                                                        │
        │ fail-safe values on loss                                               ▼
        └────────────────────────── T0 decode (FIRST in loop, before T1/T2/T5) ──▶ SAFE STATE
              T5 intent ──▶ T2 fuse ──▶ T1 governor ──▶ motors   (only if T0 = NOT-KILLED
                                                            AND armed AND TTL valid AND caps pass)
Removable link ──hardwired──▶ battery disconnect (overrides everything, no software in path)
```

Design rules (from `robotics-security` e-stop independence + `robot-bringup` safe shutdown):

1. T0 decodes kill **before** any governor/assist/autonomy code, every loop (~1 kHz spin loop,
   `02:7`). No T1–T5 code can mask, delay, or vote against it.
2. Kill latches to DISARMED-safe until a **deliberate re-arm sequence** (sticks + arm switch per
   `firmware/README.md:24,26` boot interlock / no-restart-until-re-arm). Releasing the momentary
   does NOT resume spin.
3. The kill path shares no parser, buffer, or task with the WiFi/UART intent path. A wedged Pi,
   a flooded UART, or a crashed T2/T3 cannot stall T0's CRSF read. (This is the melty analogue of
   "safety controller on separate hardware" — here, separate *priority domain* on the same MCU,
   with the removable link as the truly separate hardware.)
4. Separation of rates (P6): the 10 Hz T5 intent loop and 5 Hz T3 loop feed T1 through a
   single-slot mailbox with TTL; T0/T1 never block on them. Slow perception never slows the stop.

### 3.3 Tested timing budget (what "tested like the failsafe film" means numerically)

"Motors STOP/brake <1 s" (`firmware/README.md:24`, `02:19`, site `build.html`) is a **command-cut**
budget, not a physics promise — a 4000 RPM steel ring cannot shed all energy in 1 s. The budget
below separates detection, command, and spin-down, and each line is a filmed/logged acceptance test:

| Segment | Budget | How proven |
|---|---|---|
| ELRS frame gap → RX declares FHSS loss / outputs failsafe | ≤ 100 ms (ELRS default; record actual `LinkStatistics` in log) | Bench: TX-off timestamp vs RX failsafe flag on logic trace |
| T0 detects kill-asserted / failsafe flag / frame gap | ≤ 1 spin-loop period (~1 ms @ ~1 kHz) | T0 kill-poll-first assertion in code review + LED/log marker |
| T0 → ESC command cut (dShot600, brake) | ≤ 10 ms | Logged ESC command timestamp; DShot beacon check (`02:10`) |
| **Total: finger/TX event → brake commanded** | **< 1 s with >10× margin (target < 150 ms)** | Failsafe film with wall-clock in frame + onboard log overlay |
| Physical spin-down 4000→0 RPM (brake + friction) | measured, reported, NOT budgeted as <1 s | Same film keeps rolling until ring stops; report seconds |
| T2 stale-hold before safe-spin | ≤ 500 ms last-good hold, then safe state (plan l. 36) | Fault-injection: unplug Pi UART, log T1 transition |
| T3 intent expiry | 1 s (plan l. 39) | Kill pit WiFi, log T2 solo-continue + T3-ignore |
| T4 hint expiry | 5 s advisory-only (plan l. 39) | Expire a hint on camera, confirm no motion change |

Kill-switch demo (separate clip from the TX-off film, same rigor): driver commands auto-translate
in test box → spotter taps momentary → bot brakes → remains disarmed after release → deliberate
re-arm shown. Both clips saved alongside `firmware/failsafe-test.mp4` (e.g.
`firmware/kill-switch-demo.mp4`); stills for the screenshot gauntlet.

## 4. E-stop / link-loss / geofence behavior per tier

Master rule: **any tier may veto motion upward, but only T0 can command the stop downward, and
the removable link outranks T0.** Higher tiers degrade; they never escalate authority.

| Tier | Normal job | Link/signal loss | Watchdog / stale rule | E-stop / kill response | Geofence role |
|---|---|---|---|---|---|
| T0 Teensy safety (always) | Failsafe/brake, boot interlock, RX-loss stop <1 s (plan l. 34) | RX gap > threshold → STOP/brake, require re-arm (`firmware/README.md:24`) | IS the watchdog; self-test at boot (interlock: never boots armed, throttle-high = stays disarmed, l. 26) | Kill-asserted → immediate safe state, latched disarm. Link pull → power cut regardless of T0 | Enforces the only geofence T1 can know alone: none — instead enforces "no valid containment → no auto" (see §5.4) |
| T1 Teensy spin (~1 kHz) | RPM/heading hold, dShot600 @8 kHz, dual H3LIS331DL @45° (plan l. 35) | Ignores bad T2 frames (plan l. 36) | T2 silence > hold window (≤500 ms) → safe-spin/stop; dual-accel disagree → cap RPM / stop (build-to) | Executes T0 safe state within 1 cycle; brake, not coast | Enforces RPM caps (test 1500–2000 / fight ≤4000) on EVERY intent incl. T5; rejects over-cap intents + logs the rejection |
| T2 Pi Zero 2W 50–100 Hz | Optical-flow trim, hit recovery, RPM-hold, 1080p SD log (plan l. 36) | UART/CRSF telemetry gap → flag degraded, keep T1 hold | Own watchdog → T1 holds last-good ≤500 ms then safe-spin (plan l. 36) | On kill: stop publishing intents; keep logging (log the kill) | Fuses overhead pose (if fresh) with onboard flow; NEVER invents containment when T3 is stale — reports "no-geofence" instead |
| T3 pit base ~5 Hz | Overhead-cam YOLO both bots, dashboard, one-tap gain push (plan l. 37) | WiFi loss → T2 continues alone (plan l. 37); commands expire 1 s | Link-loss >1 s → T2 declares T3 dead, drops to onboard-only assist | Kill is NOT routed via T3 (no WiFi e-stop per `robotics-security` anti-pattern #6); T3 may *display* kill state only | Publishes arena polygon + opponent pose; containment verdicts are advisory intents with TTL, not interlocks |
| T4 cloud seconds | VLM strategy hints, human-gated (plan l. 38) | Drops handled by bridge batching (plan §2) | Hints expire 5 s, advisory-only (plan l. 39) | No e-stop role whatsoever | No geofence role |
| T5 full auto 10 Hz intent (PRE-CLEAR ONLY) | Track → predict → drive-intent → T1 governor (plan l. 39) | ANY of: Pocket kill, T0 watchdog, T3 loss >1 s, geofence/arena-exit, RPM-cap breach → instant T1 safe state (plan l. 39) | Every intent carries TTL; stale = dropped + logged; 3 consecutive drops → degrade to T2-assist, notify pit | Same as T0 kill, plus auto-latch: T5 cannot re-request auto for N s after a kill without driver + spotter confirm | Auto is PERMITTED only while fresh T3 containment + onboard flow agree the bot is inside; disagreement = safe state (fail-safe default P7) |

Bringup order (from `robot-bringup` layering, adapted to no-ROS Teensy+Pi):
link check → T0 self-test + interlock → T1 sensors (dual accel sane at rest, RPM ~0, plan `firmware/README.md:15`)
→ ESC beacon/direction → LEDs → T2 boot + UART handshake → T3 camera calibrate + link self-test
(`base/setup.sh` GO per plan §2) → T4 bridge (optional) → T5 enable ONLY if flag + letter + test box.
Shutdown/reverse: T5 off → T2 intents off → T1 brake → disarm → link pull → LiPo to bag. Log rotation
on both Pis so a 3-minute match sim (`03:13`) never fills the SD mid-event.

## 5. What must NEVER happen (abnormal events + mandated response)

Each row is a P7 fail-safe-default assertion: on doubt, stop. "Response" names the tier that acts
and the evidence that proves it.

| # | MUST NEVER happen | Response (automatic) | Evidence |
|---|---|---|---|
| N1 | Cloud / pit software drives actuators directly (WiFi→motor path) | No such path exists in wiring or code; T1 accepts intents ONLY from T0-vetted T2 mailbox; T3/T4 frames are advisory with TTL | Code review + `02:6`, `firmware/README.md:29`, `03:16`, footer `Layout.tsx:80` |
| N2 | Autonomy overrides, delays, or masks the Pocket kill / RX failsafe | T0 kill-poll-first; kill latches disarm; re-arm deliberate only | Kill-switch demo film + TX-off film (`firmware/failsafe-test.mp4`) |
| N3 | Bot boots armed / restarts armed after brown-out / resumes on stale stick | Boot interlock (`firmware/README.md:26`); brown-out → T0 failsafe (`firmware/README.md:25,33`); no-restart-until-re-arm (l. 24) | Boot-interlock clip (power on throttle-high → stays disarmed); Pi-yank clip |
| N4 | Stale T2/T3/T5 intent executes after its TTL | Single-slot mailbox; T1 drops expired intents, holds ≤500 ms (T2) / 1 s (T3) / 5 s (T4) then safe state; logs every drop | Fault-injection logs (unplug UART, kill WiFi, expire hint) |
| N5 | RPM exceeds cap (test 1500–2000 bench; ≤4000 fight; Liftoff 2000–4000 envelope) | T1 clamps + rejects + flashes max-RPM on pit dashboard (`firmware/README.md:31`); over-cap intent logged as rejected | RPM-cap proof: ramp 2k→3k→4k log (`03:11`), cap-breach injection test |
| N6 | Full-auto runs outside test box / without spotter on kill / without written TRC yes | Compile flag default 0; checklist interlock; arena geofence-fresh requirement (§5.4) | Flag default in source; signed checklist; letter on file |
| N7 | Pi brown-out / Pi USB back-power takes down MCU failsafe | BEC 5V/3A on TPU standoffs, Teensy NEVER from Pi USB (`02:14`, `firmware/README.md:33`); T0 runs from flight pack, failsafes with Pi dead | Pi-yank bench demo (Pi dark, T0 still cuts on TX-off) |
| N8 | Single-accel damage drift becomes a runaway heading (CoR shift after hits) | Dual opposed H3LIS331DL @45° cross-check (Liftoff deterministic diagram, `firmware/README.md:15`); disagree → cap/stop, not dead-reckon | Post-hit re-hold log (`03:12` hit-recovery blip test) |
| N9 | Arena-exit / wall-breach under auto continues driving | Fresh-containment-required rule: T5 permitted ONLY while T3 polygon + onboard flow agree inside; T3 stale >1 s or exit verdict → T1 safe state | Overhead-calibration record + exit-injection test in test box |
| N10 | Match-day firmware/config change without re-test | Version freeze (`firmware/README.md:39`); config + logs backed up in `firmware/` (ll. 38–39); one-gain-at-a-time log (`firmware/README.md:21`) | Frozen version string in log header; backup present |
| N11 | E-stop that depends on WiFi, ROS topic, or pit laptop aliveness | Rejected by design (`robotics-security` #6); kill travels FHSS only; link pull is hardwired | Architecture diagram (§3.2) + negative test (laptop off → kill still works) |
| N12 | Silent permission/config expiry or silent mode change (e.g. cert-style outage analogue, EdgeTX model mismatch, wrong failsafe profile) | Pre-event self-test (`base/setup.sh` GO/NO-GO: RSSI + latency + FPS, plan §2) blocks auto; version/config hash logged at arm | GO/NO-GO printout saved per event day |
| N13 | People/pets in plane of spin, covers off outside box, LiPo mishandling | Procedural interlock (`03:6`: covers ON until box, concrete floor, LiPo bag, 60 s link drill) | Drill log + box discipline, not just code |

## 6. Cross-check against existing failsafe docs + contradictions flagged

Method: every claim above traced to a repo line; mismatches listed with severity and disposition.
Checked `firmware/README.md`, `02-electronics-setup.md`, `03-testing-and-driving.md`,
`00-start-here.md`, `BOM.md`, `manufacturing/P1-mass-audit.md`, `Layout.tsx`, `site/*.html`,
`audit/match-ready-audit-2026-09-18.md`.

| ID | Finding | Severity | Disposition in this safety case |
|---|---|---|---|
| C1 | **T5 contradicts "T3/T4 never drive."** Plan l. 39 (T2+T3 fused intent drives via T1) vs `02:6`, `firmware/README.md:29`, `03:16`, `Layout.tsx:80` (all: pit/cloud never drive). | BLOCKING for T5 | T5 treated as a rule change requiring written TRC pre-clear, not an interpretation. Default ship stays human-gated T4. Footer + guides stay correct for everything shipped by default. If TRC grants auto, the footer/guides MUST gain an "except pre-cleared T5 under SAFETY.md" qualifier — flagged as follow-up work for the docs agent, not done here. |
| C2 | **"T1 enforces geofence" has no sensing path.** T1 (Teensy + accels) cannot know absolute arena position; containment comes from the T3 overhead cam, which T1 must not trust blindly (stale-T3 rule). | BLOCKING for auto-containment claims | Reframed as fresh-containment-required (§5.4/N9): T1 enforces "no fresh containment → no auto," which it CAN enforce alone. True polygon enforcement lives in the T2 fuse as a veto, with T0 timeout as backstop. |
| C3 | **"Hardware-priority kill" overstates a wireless switch.** Plan l. 43 vs `robotics-security` e-stop independence (hardwired circuit, wireless e-stop on dedicated radio not WiFi, software never sole path). | MAJOR (wording → test gap) | Reworded to highest-priority RC kill on dedicated FHSS + retained hardwired link pull as the true e-stop (§§1,3,4). Kill demo must include laptop-off negative test (N11). |
| C4 | **"Safe-spin" vs "stop" on compute loss is ambiguous.** Plan l. 36 (T2 watchdog → hold ≤500 ms then safe-spin) vs `firmware/README.md:25,33` + `02:7` (Pi brown-out → MCU failsafes to stop). A spinning "safe-spin" with no supervisor is not obviously safe. | MAJOR | Resolved: hold-then-safe-state where safe state = brake/stop for link/kill/brown-out cases; brief RPM-hold ONLY for transient T2 frame jitter inside the 500 ms window, then stop. Any doc that reads "safe-spin" as sustained spinning without T2 is rejected. |
| C5 | **Failsafe film does not exist.** Required by `firmware/README.md:27`, `03:21`, site `build.html`/`firmware.html`; `match-ready-audit` Gate A is HARD NO-GO (`ls firmware/` = README only). Same for kill-switch demo (no path exists yet). | BLOCKING for any GO | Verdict stays NO-GO until filmed (§9). Evidence pack §8 lists exact clips. |
| C6 | **`autonomy/`, `base/`, `radio/` are empty; `firmware/` is README-only.** Plan §7 done criteria (READMEs a beginner can follow) and §4 ease ladder (setup.sh, Companion file) are unmet. Governor, TTL mailbox, kill decode, self-test do not exist to audit. | BLOCKING for T5 readiness | Safety case is a build-to spec, not a compliance claim. No autonomy readiness asserted. |
| C7 | **Weight-cap wording 1360 vs 1361 g.** Already flagged in `match-ready-audit §1` (`BOM.md:56` + README say 1360; `P1-mass-audit:5` + `03:23` say 1361). | MINOR for safety, BLOCKING for weigh-in gate | Not adjudicated here (mass-audit agent owns it); carried as residual R3. Safety note: every RPM/energy claim must state which cap the bot weighed in at. |
| C8 | **RX protocol SBUS vs CRSF.** `BOM.md:31` + plan = ELRS CRSF; `firmware/README.md:13` + `02:13` = SBUS-or-CRSF (Liftoff SBUS heritage). | MINOR | Locked to CRSF for this build in §3.1 (telemetry back to Pocket is required for the dashboard + RSSI self-test); SBUS retained only as bench-fallback with identical failsafe programming. Radio agent must freeze one + failsafe values. |
| C9 | **RPM numbers span three contexts without labels.** Test cap 1500–2000 (`firmware/README.md:18`), Liftoff envelope 2000–4000, OpenMelt2 heritage 3200, P1 tip-speed math 8″@4000≈95 mph. A reader can mistake heritage for permission. | MINOR | Caps labeled per context in §4/N5 with ramp-test proof (`03:11` 2k→3k→4k + heat checks). |
| C10 | **Stale `step_audit.py` path + sim-vs-reality wall note.** `P1:39-45` points at `/tmp/opencode/step_audit.py`; `match-ready-audit §1` notes the Studio sim bounces (0.45) while the real bot stalls/scrubs. | INFO | Carried as residuals R4/R5: re-run recipe must be repathed before anyone re-derives mass; sim must never be cited as autonomy validation. |

No silent fixes made to existing files (docs-only agent mandate) — all dispositions above are
spec text here + build tasks for the firmware/radio/base agents.

## 7. What the other tiers' agents must deliver for this case to hold

- Firmware agent: T0 kill-poll-first + interlock + RX-loss <1 s + TTL mailbox + RPM-cap veto +
  dual-accel cross-check + version-freeze string + `AUTONOMY_FULL_AUTO` default-0 flag.
- Radio agent: frozen Pocket model (ELRS/Mode 2/region), Companion file + version, channel map,
  RX failsafe values (kill-asserted/throttle-cut/disarm), bind + RSSI procedure in `radio/README.md`.
- Base agent: `base/setup.sh` GO/NO-GO (RSSI + WiFi latency + camera FPS), 4-corner calibrate,
  dashboard with RPM/G/batt/temp + max-RPM flash, one-tap gain push with version check,
  log rotation, laptop-off kill-still-works proof.
- Docs/site agent: resolve C1 footer qualifier (only if+when TRC grants T5), C7 cap number,
  C10 stale path; keep `Layout.tsx:79-84` notice on every route.

## 8. Evidence pack (attach to TRC letter; film before asking)

1. `firmware/failsafe-test.mp4` — TX-off → brake commanded <1 s with wall clock in frame; re-arm
   deliberate; Pi-yank brown-out → T0 still cuts; boot throttle-high → stays disarmed. (Closes C5.)
2. `firmware/kill-switch-demo.mp4` — auto-request in test box → momentary tap → brake → latched
   disarm → deliberate re-arm; repeat with pit laptop OFF (N11 negative test).
3. RPM-cap proof — 2k→3k→4k ramp log + heat check per `03:11`; cap-breach injection (over-cap
   intent sent, T1 rejects + logs); dashboard max-RPM flash visible.
4. Link-loss trilogy logs — T2 UART unplug (≤500 ms hold → safe), T3 WiFi kill (>1 s → T2 solo,
   T3 commands ignored), T4 hint expiry (5 s, no motion change).
5. Containment proof — 4-corner calibrate record + arena-exit injection in test box (T5 request
   with stale/exit verdict → safe state, never drives out).
6. Frozen config — firmware version string in every log header + config backup in `firmware/`
   + `base/setup.sh` GO printout for that day + scale photo at stated cap (links weigh-in gate).

## 9. Verdict: NO-GO for full autonomy (GO for human-gated T0–T4 bench/box work)

| Pillar | Verdict | Basis |
|---|---|---|
| T0–T4 human-gated operation (current docs) | CONDITIONAL GO | Design is SPARC-compatible as documented; execution blocked only on Gate A film + weigh-in (match-ready-audit Gates A/B), which are procedural, not architectural |
| T5 full auto in test box | NO-GO | Governor/kill-decode/TTL code does not exist (C6); kill + failsafe films do not exist (C5); TRC letter not sent |
| T5 full auto in arena / at event | HARD NO-GO | All of the above + written TRC permission absent + containment sensing unresolved (C2) |

**Residual risks carried (even after the pack is filmed):**
R1 — momentary-switch ergonomics under combat stress (accidental release/re-grip; mitigated by
latching disarm + re-arm discipline, but needs box reps). R2 — ELRS 2.4 GHz congestion at a
crowded event (mitigate: RSSI self-test at the venue, sumpless re-check, organizer RF guidance).
R3 — 1360/1361 g wording (C7) until the mass agent picks one. R4 — stale re-run path (C10) until
repathed. R5 — sim/real wall-behavior gap (Studio bounce vs real stall) must never validate
autonomy. R6 — SPARC text not in repo: if the organizer's §6.4.3 reading is stricter than assumed
(e.g. no auto at all in 3 lb), this entire T5 path collapses to T4 — which the flag-default design
already survives.

*Skills applied: `robotics-security` (e-stop independence, isolation, no-WiFi-e-stop), `robot-bringup`
(ordered bringup, heartbeat→safe-stop, graceful shutdown, log rotation), `robotics-software-principles`
(P6 rate separation, P7 fail-safe defaults, P10 logging, P12 degradation). Skill-tool unavailable;
bodies read from `.opencode/skills/` and cited by section above.*
