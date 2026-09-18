# Agent 01 — Auto-Architect (T5 Full-Autonomy Data/Control Flow)

> Gauntlet round, agent 1/10. Date: 2026-09-18. Repo: `/workspaces/meltybrain-3lb`.
> Spec: `audit/autonomy-plan-2026-09-18.md` §1 (T0–T5 table) + §5 (skills) + §6 (out of scope),
> plus `firmware/README.md`, `build-guide/03-testing-and-driving.md`, `web/src/pages/Studio.tsx`
> (`stepDrive` + `RivalBot` AI). Docs/new files only — no build changes.

## 0. Skills — what was requested vs what exists

Per the brief I FIRST used the `skill` tool to list + load skills and name them in the report:

| Requested (§5) | Result |
|---|---|
| `robotics-design-patterns` (FSM/BT for T5 modes, HAL for sensor swap) | **NOT FOUND** — loader reports only available skill is `customize-opencode` |
| `robotics-software-principles` (governor / fail-safe defaults) | **NOT FOUND** — same |
| `robotics-security` (kill-switch isolation, e-stop separation, link-loss) | **NOT FOUND** — same |
| Full §5 list (`robot-perception`, `robotics-testing`, `robot-bringup`, `ros2-web-integration`, `docker-ros2-development`, `ros2`/`ros1`, superpowers `systematic-debugging`, `verification-before-completion`, `brainstorming`) | Not present in this environment either |

I loaded `customize-opencode` (the only registered skill; irrelevant to robotics, confirms loader works).
So this design is **first-principles + plan-as-spec**, structured the way those three skills would have
demanded: FSM with explicit degraded states, governor as default-deny allowlist, kill path physically and
logically separated from autonomy. Downstream agents should re-apply the real skills when available;
nothing below depends on a skill-specific API, only on the plan's table and the repo's actual code/docs.

## 1. Files read fully (scope complete)

1. `audit/autonomy-plan-2026-09-18.md` (110 lines) — normative. §1 table, §5 skills, §6 out-of-scope, §8 gauntlet order.
2. `firmware/README.md` (39 lines) — Teensy 4.0 LOCK + 2× H3LIS331DL + AM32 dShot600 bidir + SBUS/ELRS baseline, OpenMelt2 learning rig, failsafe ritual, Pi wiring rules.
3. `build-guide/03-testing-and-driving.md` (23 lines) — safety ritual, spin-up curve 2k→3k→4k, T0→T4 ladder restated with "T3/T4 never drive".
4. `web/src/pages/Studio.tsx` (1539 lines, all read) — `stepDrive` plant model (lines 44–89), `RivalBot` reference policy (157–241), HUD at 10 Hz (722–760), input/kill UX (disarm/blur/visibility, 667–719).
5. `BOM.md`, `autonomy/` + `base/` + `radio/` + `firmware/` listings — confirmed all three dirs are **empty** (this agent creates `autonomy/STACK.md`; base/radio are for later agents), firmware has README only (no `.ino`/`.cpp` to contradict the plan).

No CAD re-model, no motor/ESC change, no custom PCB, no cloud-vendor lock-in in this design — §6 honored (§9).

## 2. Plan §1 — normative timeout table (quoted verbatim, then verified)

| Tier | Where | Rate | Job | Failsafe (plan text) |
|---|---|---|---|---|
| T0 | Teensy 4.0 | always | failsafe/brake, boot interlock, RX-loss stop <1 s | IS the failsafe |
| T1 | Teensy 4.0 | ~1 kHz spin | RPM/heading hold, dShot600 @8 kHz, dual H3LIS331DL @45° | T0 watches T1 |
| T2 | Pi Zero 2W onboard | 50–100 Hz | optical-flow trim, hit recovery, RPM-hold, 1080p log to SD | T1 ignores bad T2 frames; T2 watchdog → T1 holds last-good ≤500 ms then safe-spin |
| T3 | Pit base (laptop) | ~5 Hz | overhead-cam YOLO track both bots, dashboard, one-tap gain push | link loss → T2 continues alone, T3 commands expire in 1 s |
| T4 | Cloud models | seconds | VLM strategy hints (human-gated until cleared) | hints advisory-only, expire in 5 s |
| T5 | T2+T3 fused | 10 Hz intent | FULL AUTO: track → predict → drive-intent → T1 governor executes | ANY of: Pocket kill-switch, T0 watchdog, T3 link-loss >1 s, geofence/arena-exit, RPM-cap breach → instant T1 safe state. TRC pre-clear per SPARC §6.4.3 — default ship = human-gated T4, T5 behind compile flag + checklist |

Iron rules (plan §1): cloud NEVER drives (intents only, via T3); every intent carries a TTL; T1 enforces
RPM caps + arena geofence regardless of what T5 asks; Pocket momentary switch is hardware-priority kill.

Cross-checks: `firmware/README.md` §D/E and `build-guide/03` agree on T0–T4 ladder and on "T3/T4 never
drive" / "advisory only, NEVER drives". `Studio.tsx` HUD polls at 10 Hz (line 758: `setInterval 100 ms`) —
coincidentally the same as the T5 intent rate, which makes the Studio a convenient HIL-rate mock but NOT a
safety reference (see §7).

## 3. T5 data/control flow (the design)

### 3.1 Block diagram (rates are part of the contract)

```
Sensors                                  Compute                              Act
───────                                  ───────                              ───
dual H3LIS331DL ±400g ──SPI──┐
                             ├─► T1 GOVERNOR (Teensy 4.0, ~1 kHz spin loop,
eRPM bidir (dShot600) ───────┘   dShot600 @8 kHz) ──► AM32 55A ──► 2× PROPDRIVE 2836
       ▲                         │  ▲ ▲ ▲
       │                         │  │ │ └─ T5 intent @10 Hz (100 ms period, TTL §5)
CRSF RX (Pocket+EP1/RP1) ────────┘  │ └─ T2 trim @50–100 Hz (TTL §5)
       │                            │ └─ T3 track/gain @~5 Hz (TTL §5)
       │                            │ └─ T4 hint (seconds, advisory, human-gated)
       │                            └─ KILL (Pocket momentary, HW priority, §6)
       │
Pi Cam v3 (optic flow) ─► T2 FUSION (Pi Zero 2W) ──UART 115200──┘
Overhead USB cam ─► T3 TRACKER (laptop YOLO ~5 Hz) ──WiFi──► T2 fuse ─┘
Cloud VLM ─► T4 HINT ─► human gate ─► T3 ─► T2 (never direct to T1)
```

Data flows DOWN in authority (T4 → T3 → T2 → T5-intent → T1) while **authority flows UP in trust**:
T1 can ignore anyone; T0 can override T1; Kill can override everything. This is the governor pattern
the plan demands ("autonomy *commands*, the MCU *governs*").

### 3.2 T5 pipeline stages (what "track → predict → drive-intent" means concretely)

| Stage | Where | In → Out | Rate | Notes |
|---|---|---|---|---|
| S1 capture | T3 laptop + T2 Pi Cam | frames → detections | T3 ~5 Hz, T2 50–100 Hz flow | 4-corner pixel→arena calibrate once per event (plan §2) |
| S2 track | T3 | detections → opponent pose (x,y,vx,vy,conf) | ~5 Hz | YOLO bot+opponent; pose in **arena frame meters**, origin center |
| S3 fuse | T2 | T3 pose + onboard flow + RPM/G → fused state | 10 Hz publish | T2 is the only T5-intent author; T3 never addresses T1 directly |
| S4 predict | T2 | fused state → predicted opponent pose @ +350 ms | 10 Hz | 350 ms lead matches proven `RivalBot` lead (`addScaledVector(foe.vel, 0.35)`, Studio line 183) |
| S5 policy | T2 | predicted state → velocity intent (vx,vy) + rpm_target | 10 Hz | seek/strafe/flee modes from §4 FSM; reuses RivalBot geometry, NOT its lack of limits |
| S6 govern | T1 | intent → clamped motor modulation @1 kHz | 1 kHz | §6 allowlist; any breach → safe state, no exceptions |

Why T2 authors the intent (not T3): link loss must degrade to onboard-only without a control gap.
T3 publishes *observations*; T2 publishes *intents*. If WiFi drops, S2/S3 coast on flow for ≤ the T3
TTL, then policy falls back to onboard-only behaviors (spin-hold + evade-to-center). This matches the
plan ("link loss → T2 continues alone") and fixes the plan's ambiguity about who commands during outage.

### 3.3 Coordinate frames (nailed down — the plan leaves this implicit)

- **Arena frame:** meters, origin arena center, +x to driver's right, +y away. All T3 poses and T5 intents use this frame.
- **Body frame:** never used on the wire (melty has no meaningful yaw at 4000 RPM); heading LED is the human cue, not a control input.
- **Calibration:** T3 4-corner click → homography, re-done per event; T2 rejects T3 poses outside `HALF+margin` as corrupt (§6 rule G3).

## 4. FSM — states, modes, transitions

T5 is a **mode of the whole stack**, not a separate controller. One FSM lives in T1 (authoritative,
minimal) and a mirror lives in T2 (rich, advisory). T1's copy wins every disagreement.

### 4.1 States

| # | State | Where enforced | Throttle/translate authority | Description |
|---|---|---|---|---|
| S0 | `BOOT_LOCK` | T0/T1 | none | Power-on, never armed, throttle-high interlock. Exit only via deliberate arm (stick ritual + Pocket arm switch). |
| S1 | `DISARMED` | T1 | none | Safe on bench. Motors brake. Only state where USB config/gain push accepted. |
| S2 | `MANUAL` | T1 | Pocket sticks | Human drives. Default ship mode. All autonomy intents ignored (logged only). |
| S3 | `ASSIST_T2` | T1+T2 | human + T2 trim | Human translates; T2 adds RPM-hold trim + hit recovery. First autonomy step in test box. |
| S4 | `SUPERVISED_T3T4` | T1+T2+T3(+T4) | human + hints | Dashboard + YOLO overlay + VLM hints shown; driver approves. T4 hints never touch sticks. |
| S5 | `AUTO_T5` | T1+T2(+T3) | T5 intent via governor | Full auto. **Compile flag + checklist + TRC pre-clear required.** Pocket kill armed and tested before entry. |
| S6 | `DEGRADED` | T1+T2 | last-good → safe-spin | Transient: intent gap within hold budget (§7). Sub-label records source (`D_T5GAP`, `D_T3LINK`, `D_T2FLOW`, `D_GEOFENCE_WARN`). |
| S7 | `SAFE_SPIN` | T1 | zero translation, RPM-hold or ramp-down | Hold center, kill translation, keep or shed RPM per cause. Recovery only via S1→S2 re-arm. |
| S8 | `ESTOP_FAILSAFE` | T0 | brake now | Kill switch, RX-loss, watchdog, brown-out, boot fault. Latching until deliberate re-arm. |

`RivalBot`-derived behaviors (seek / strafe-wobble / flee-to-spin-up / wall-avoid) live **inside S5 only**
as policy sub-modes; they are not FSM states and can never bypass S6–S8.

### 4.2 Transitions (every edge has a trigger AND a timeout)

| From → To | Trigger | Timeout / guard |
|---|---|---|
| ANY → S8 | Pocket kill momentary pressed | **<50 ms** to brake command (HW-priority interrupt + CRSF failsafe; tested like failsafe film) |
| ANY → S8 | T0 watchdog (T1 loop stall) or brown-out | immediate; T0 IS the failsafe |
| ANY → S8 | RX-loss (ELRS CRSF gap) | detect ≤100 ms, full brake ≤1000 ms (plan says "<1 s" — split in §8.1) |
| S5 → S6 | one T5 intent frame missed (100 ms period) | enter at **>120 ms** gap, coast last-good, set `D_T5GAP` |
| S6 → S5 | fresh valid intent arrives | recover only if gap was **<250 ms** and governor checks pass |
| S6 → S7 | T5 gap **>250 ms**, or T2 flow gap **>200 ms**, or T3 link gap **>1000 ms** in AUTO, or geofence breach, or RPM-cap breach, or dual-H3 disagree | latch cause code; translation → 0 |
| S5/S6 → S7 | opponent-pose confidence < threshold for >500 ms | can't fight blind; hold center, keep spin |
| S3/S4 → S2 | any T2/T3 TTL expiry | fall back to MANUAL, no latching (log it) |
| S7 → S1 | spin decayed / operator re-arm ritual | deliberate action only, never auto-resume |
| S8 → S1 | kill released + re-arm ritual + self-test pass | deliberate action only |
| S1 → S2/S3/S4/S5 | arm + mode select | S5 entry additionally requires `T5_ENABLE` compile flag + checklist signed + TRC letter on file |

No transition into S5 from S7/S8 directly. No auto-resume from S7/S8 ever — this is the fail-safe-defaults
rule and it is non-negotiable.

## 5. Intent message schema with TTLs

One schema for all tiers; T1 enforces per-source TTL. Fixed-size, CRC'd, arena-frame. (UART 115200 between
Pi and Teensy; WiFi JSON between T3↔T2 mirrors the same fields.)

```c
// T1-side authoritative struct (Teensy). 24 bytes on the wire + framing.
typedef enum { SRC_MANUAL=0, SRC_T2=1, SRC_T3=2, SRC_T4=3, SRC_T5=4 } intent_src_t;

typedef struct __attribute__((packed)) {
  uint8_t  magic;        // 0xA5 — framing
  uint8_t  src;          // intent_src_t
  uint16_t seq;          // wraps; T1 rejects repeats/large jumps as corrupt
  uint32_t t_tx_ms;      // sender clock (for latency measurement, NOT trust)
  uint16_t ttl_ms;       // sender-declared TTL; T1 caps it (see table)
  int16_t  vx_mm_s;      // arena-frame intent, mm/s, ±8000 clamp
  int16_t  vy_mm_s;      // arena-frame intent, mm/s, ±8000 clamp
  uint16_t rpm_target;   // 0..4000; T1 clamps to active cap (§6)
  uint8_t  behavior;     // 0 SEEK, 1 STRAFE, 2 FLEE_SPINUP, 3 HOLD_CENTER, 4 RECOVER
  uint8_t  confidence;   // 0..100 fused track confidence
  uint16_t crc16;        // CCITT over all prior bytes
} drive_intent_t;         // T1 uses t_rx (its own clock) for expiry, never t_tx
```

JSON mirror (T3→T2 over WiFi, same semantics):

```json
{"v":"T5/1","src":"T5","seq":1842,"t_tx_ms":912044,"ttl_ms":150,
 "vx_ms":-1.20,"vy_ms":0.45,"rpm_target":3200,"behavior":"SEEK",
 "confidence":82,"pose_age_ms":140}
```

### 5.1 TTL table (normative for this design)

| Intent source | Nominal rate | Wire TTL | T1/T2 enforced expiry | On expiry |
|---|---|---|---|---|
| T5 auto intent (T2→T1) | **10 Hz** (100 ms) | 150 ms | **stale at t_rx+150 ms** | S5→S6 at >120 ms gap; S6→S7 at >250 ms gap (§7 ladder) |
| T2 trim (T2→T1) | 50–100 Hz (10–20 ms) | 40 ms | stale at t_rx+40 ms | ignore frame, hold T1 inner loop; flow gap >200 ms → S7 |
| T3 track/observation (T3→T2) | ~5 Hz (200 ms) | 300 ms motion / 1000 ms non-motion | motion stale at +300 ms; gains/dashboard at +1000 ms | motion: coast→onboard-only; link gap >1000 ms in AUTO → S7 |
| T4 hint (cloud→T3) | seconds | 5000 ms | stale at +5000 ms, **advisory only** | drop silently; never affects S5 policy without human approval |
| Manual (Pocket CRSF) | ~50–150 Hz | n/a (link supervised) | RX gap >100 ms = link suspect; full brake ≤1000 ms | → S8 per T0 |

Why T5 TTL is 150 ms (not 100): one dropped 10 Hz frame must not lurch the bot, but two dropped frames
(200 ms) must already be degrading. 150 ms = 1.5 periods: tolerates single-frame jitter, catches real
outage in one more period. T1 uses its own receive timestamp; sender `t_tx_ms` is diagnostics only
(never trust a remote clock for safety).

T1 ignore rules (bad-frame = drop + count, no actuation): bad magic/CRC, `src` not in allowlist for
current state, `seq` repeat or jump >50, NaN/out-of-range fields, `ttl_ms` above per-source cap,
`confidence` < 30 for T5 motion, any T4-sourced frame addressed to T1 (T4 may only talk to T3).

## 6. Governor rules in T1 (RPM caps, geofence, kill)

Priority order — evaluated every spin-loop iteration (~1 kHz), first match wins:

1. **K0 Kill / failsafe (hard):** Pocket momentary, RX-loss, T0 watchdog, brown-out → brake NOW, latch S8.
   Kill is read on an interrupt-capable pin / CRSF failsafe flag, never through the intent parser.
2. **K1 Sensor sanity:** dual H3LIS331DL disagree by >15% sustained 50 ms, or both saturate implausibly at rest
   → S7 (this rule is new — the plan assumes dual-accel determinism but never states the disagree action).
3. **K2 RPM cap (enforced, not requested):** active cap = min(bench cap, mode cap, thermal cap).
   Bench/test 1500–2000 RPM (`firmware/README.md` §B), progression 2k→3k→4k (`build-guide/03`),
   hard ceiling 4000 RPM (matches `RPM_MAX` in Studio + Liftoff target). `rpm_target` above cap → clamp + flag
   `RPM_CAP_BREACH`; sustained breach (>500 ms of clamping while T5 keeps asking) → S7, because the policy
   is fighting the governor.
4. **K3 Geofence / arena-exit:** T2-estimated position outside calibrated arena polygon + 0.5 m margin,
   or T3 pose outside `HALF+margin`, or "no valid pose for >500 ms in AUTO" → zero translation, S7.
   Geofence is evaluated in T1 on the position T2 embeds alongside intents (add `x_mm,y_mm` to the UART
   frame if bandwidth allows; else T2 sends a separate 5 Hz pose echo that T1 expiry-guards at 400 ms).
5. **K4 TTL/staleness:** any intent older than its §5.1 expiry → drop; gap handling per §7 ladder.
6. **K5 Rate/delta limit:** `|Δv| > 6 m/s` between consecutive accepted T5 intents, or `|Δrpm| > 1500` in one
   100 ms step → clamp to limit + flag; 3 consecutive clamps → S6 (policy is oscillating or link is corrupting).
7. **K6 Authority:** in S2 ignore all autonomy; in S3 accept only T2 trim (not T5/T3 motion); in S4 accept
   hints for display only; in S5 accept T5 only from the fused T2 author. Anything else → drop + log.
8. **K7 Thermal/batt:** ESC temp or pack sag beyond configured thresholds → shed RPM cap first, then S7.
   Thresholds are per-build config (bench-measured), defaults conservative.

All governor actions are logged (cause code + timestamp + pre-breach intent) to the Pi SD log for post-match
review (`firmware/README.md` §C/E logging expectation).

## 7. Degradation ladder T5→T2→T1→T0 with exact timeouts

```
T5 AUTO (10 Hz intents, t=0 last good)
 │ miss 1 frame (gap >120 ms) ──► DEGRADED D_T5GAP: coast last-good, keep spin, flag HUD
 │ gap >250 ms ──► fall to T2 ONBOARD-ONLY (no T3 fusion): HOLD_CENTER + flow, 200 ms budget
 │ T2 flow gap >200 ms OR T3 link gap >1000 ms (in AUTO) OR geofence/RPM/confidence trip
 │ ──► T1 SAFE_SPIN (S7): translation=0, RPM hold-or-decay, await re-arm
 │ T0 trip (kill / RX-loss / watchdog / brown-out) ──► ESTOP_FAILSAFE (S8): brake ≤1 s, latch
 └─ recovery: S7/S8 → S1 → S2 manual only. Never auto-resume into AUTO.
```

| Step | Exact timeout (this design) | Plan says | Match? |
|---|---|---|---|
| T5 frame period | 100 ms | 10 Hz intent | ✅ exact |
| T5→DEGRADED | gap **>120 ms** | (no finer threshold; "instant T1 safe" on listed trips) | ✅ refines, compatible |
| DEGRADED→T2-only | gap **>250 ms** | — (plan: T3 link-loss >1 s → safe; T2 watchdog → hold ≤500 ms) | ✅ stricter inner bound, see §8.3 |
| T2 flow expiry | frame TTL 40 ms; flow-gap trip **>200 ms** | "holds last-good ≤500 ms then safe-spin" | ⚠️ CHALLENGED — 500 ms outer kept, 200 ms inner added (§8.2) |
| T3 motion expiry | **300 ms**; link-loss trip **>1000 ms** in AUTO | "T3 commands expire in 1 s" | ⚠️ CHALLENGED — split motion/non-motion (§8.3) |
| T4 hint expiry | **5000 ms**, advisory + human-gated | "expire in 5 s" | ✅ exact, with gating constraint (§8.4) |
| RX-loss → brake | detect ≤100 ms, brake ≤1000 ms | "RX-loss stop <1 s" | ⚠️ CHALLENGED — "<1 s" kept as deadline, detection bound added (§8.1) |
| Kill → brake cmd | **<50 ms** | "instant T1 safe state" + "hardware-priority kill" | ✅ interprets "instant" as testable bound |

Timeline example (T5 link dies at t=0, all else healthy): t=100 ms one frame missed (silent coast);
t=120 ms DEGRADED + HUD flag; t=250 ms T2-only onboard policy; t=450 ms (200 ms without flow, if flow
also dies) SAFE_SPIN; operator re-arms to MANUAL. Worst-case translation under coast ≈ 0.25 s × governed
speed — bounded by K5/K3, never a full-second runaway.

## 8. Timeout verification + safety challenges (saying so explicitly)

### 8.1 T0 "RX-loss stop <1 s" — KEEP as deadline, UNSAFE as detection spec ⚠️

<1 s to full stop is a reasonable brake deadline for a 3 lb ring, but as a *detection* threshold it is
far too slow: at Studio's governed 8.5 sim-u/s analogue (≈ real melty translation of several m/s at
full grip) a full second of powered travel crosses any NHRL-scale arena into a wall — and walls
"scrub spin … expect stall, not bounce" (`Studio.tsx` panel, line 1167–1171). **Ruling:** keep "<1 s"
as the *brake-complete* deadline (film it), but require CRSF-link-suspect at >100 ms gap and kill thrust
immediately; the <1 s number must never be used as "we may drive blind for 900 ms". TRC film must show
TX-off → stop, plus a timestamped log of detect time.

### 8.2 T2 "holds last-good ≤500 ms then safe-spin" — OUTER BOUND ONLY, inner trip at 200 ms ⚠️

500 ms of last-good translation at fight RPM is wall-to-wall travel with a spinning ring — the single most
dangerous line in the table if read as "drive open-loop for half a second". The T2→T1 UART at 50–100 Hz
has 10–20 ms periods; three missed periods already indicate failure. **Ruling:** keep 500 ms as the
*absolute outer* safe-spin deadline (compatible with the plan), but add: T2 frame TTL 40 ms, flow-gap trip
at >200 ms → zero translation while holding RPM (in-place, not coasting), full SAFE_SPIN at 500 ms if flow
has not recovered. "Hold last-good" means *hold RPM*, never *hold velocity* — translation decays to zero
from the first missed frame.

### 8.3 T3 "commands expire in 1 s / link-loss >1 s → safe" — SPLIT motion vs non-motion ⚠️

At ~5 Hz (200 ms period) a 1 s motion expiry = 5 missed tracker frames of stale opponent pose; fusing a
1-second-old pose into a 10 Hz chase policy guarantees oscillation and wall-seeking. **Ruling:** T3
*observation* fusion window 300 ms (1.5 periods — same logic as T5 TTL); T3 *link-loss* trip stays at
>1000 ms in AUTO (matches plan) but by then T2 has already been onboard-only for ~700 ms. The 1 s expiry
is retained **only** for non-motion traffic (gain push, dashboard, calibration). One-tap gain push between
matches is unaffected.

### 8.4 T4 "expire in 5 s" — ACCEPTABLE only as gated tactics, never as control ⚠️

Seconds-latency VLM hints ("opponent hugging left wall") are stale on arrival by definition; a 5 s TTL is
fine for *strategy text shown to a human* and dangerous for anything fused into velocity. **Ruling:**
accept 5 s exactly as the plan states, with the hard constraint that T4 output enters S5 policy only
through the human gate (default ship) or, post-clear, through a T2 sanity clamp (confidence-gated, K5/K6).
T4 frames addressed anywhere but T3 are dropped and logged. No cloud-vendor lock-in: any VLM behind one
adapter (plan §6).

### 8.5 Missing rules the plan implies but never states (added, flagged as additions)

- Dual-H3 disagreement action (added K1) — without it a damaged sensor silently biases heading.
- Geofence frame + margin (added K3/§3.3) — "geofence/arena-exit" in the plan has no frame; unenforceable without one.
- T5 intent TTL value (added 150 ms) — the plan mandates "every intent carries a TTL" but never numbers the T5 one; 10 Hz ⇒ 150 ms is derived in §5.1.
- No auto-resume (added §4.2) — implied by "instant T1 safe state" but never stated; stated here absolutely.

None of these contradict the plan; all are compatible tightenings. If the TRC or a later agent disagrees
with a number, the plan's number remains the outer bound and the tighter number is the implementation
target — both are recorded in the §7 table so the disagreement is auditable.

## 9. Out of scope (per plan §6 — explicitly not done here)

No custom PCB, no motor/ESC changes (PROPDRIVE 2836 + AM32 55A + dShot600 stand), no CAD re-modeling of the
ring body, no cloud-vendor lock-in. Blade modularity, base tote contents, radio Companion files, and BOM/site
updates belong to sibling agents — this report defines the interfaces they must respect (intent schema §5,
governor §6, timeouts §7) but does not implement them.

## 10. Studio.tsx mapping — what later agents may reuse vs must not copy

- `stepDrive` (lines 44–89): a credible **plant model** for HIL testing of S5 policy — RPM lag (TAU_UP 0.9 /
  TAU_DOWN 1.3), grip authority curve (GRIP_LO 1400 / GRIP_HI 3100 / EXP 2.8: "no spin = no move"), brake-as-approach,
  wall scrub. Reuse as the sim side of bench→box→arena progression. Do NOT copy its wall *bounce*
  (`BOUNCE 0.45` + min-rebound 2.5) as physics — the panel itself warns real walls scrub/stall (line 1167–1171).
- `RivalBot` (lines 157–241): a credible **reference S5 policy skeleton** — velocity-lead pursuit (0.35 s),
  strafe wobble, flee-to-spin-up below 1200 RPM, wall-avoid override, collision RPM×0.75. Reuse the geometry;
  do NOT copy its control authority: it sets `throttle = true` unconditionally (line 191) with no TTL, no
  governor, no kill, no confidence gate. Wrapping it in §5/§6 is literally the T5 task.
- HUD 10 Hz + `disarm()` on blur/hidden (lines 696–719): the right *habits* (rate-matched display, focus-loss
  stop) — the real T1/T2 equivalents are §7 timeouts, not DOM events.

## 11. Handoff to sibling agents (contract, not implementation)

- **T2 agent:** implement S3–S5 at 10 Hz fused output + 50–100 Hz trim on Pi Zero 2W; UART 115200 `drive_intent_t`;
  1080p SD logging with rotation; flow-gap self-report. Respect §5 TTLs; never address T1 as T4/T3.
- **T3/base agent:** `base/setup.sh` GO/NO-GO (RSSI + WiFi latency + cam FPS), tracker container, 4-corner
  calibrate, pose publish ~5 Hz in arena frame meters, non-motion 1 s TTL vs motion 300 ms window.
- **T1/firmware agent:** implement §6 K0–K7 at ~1 kHz + dShot600 @8 kHz + CRSF parsing + `T5_ENABLE` compile
  flag defaulting OFF; S0–S8 FSM; cause-code logging.
- **Radio/safety agent:** Pocket ELRS Mode 2 + EP1/RP1 + momentary kill on interrupt-capable path; failsafe film
  showing <50 ms kill and <1 s TX-off stop with timestamps.
- **Web/sim agent:** promote Studio `RivalBot` to selectable T5-policy mock behind the same §5 schema (simulated
  TTL/loss injection) — never wire it to real hardware.

## 12. Verdict

| Pillar | Verdict | Basis |
|---|---|---|
| T5 architecture (this report) | **CONDITIONAL GO** | FSM + schema + governor + ladder are complete and compatible with the plan's outer bounds; all tightenings are audited in §7 |
| T5 in test box | **GO, supervised** | S3→S4→S5 progression with kill demo filmed, `T5_ENABLE` flag on, checklist signed |
| T5 in arena / match | **NO-GO (default)** | Requires TRC pre-clear per SPARC §6.4.3; default ship = human-gated T4 (plan §1). No exception without the letter on file |
| Timeouts as written in plan | **GO with §8 corrections** | T0/T2/T3 numbers kept as outer deadlines; detection/fusion bounds tightened; nothing loosened |

**Residual risks:** (1) requested robotics skills absent — design unreviewed by those lenses, needs re-pass
when skills exist; (2) no firmware source in repo yet — T1 numbers assume Liftoff-Rev9 loop rates from docs,
must be re-verified against actual `.ino`/`.cpp`; (3) geofence accuracy depends on per-event calibration
quality — a bad homography silently biases K3; (4) 3 lb spinning-ring energy means even a 250 ms coast can
damage Alcove/test-box netting — box rating must be checked by the testing agent; (5) WiFi in venue +
ELRS + crowd RF coexistence untested — link-loss behavior must be venue-tested, not just bench-tested.
