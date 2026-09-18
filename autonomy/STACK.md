# Autonomy Stack — How Eyeliner Drives Itself (and How It Stays Safe)

> Beginner-readable architecture doc. You do NOT need FPV, EdgeTX, or ROS experience to follow this.
> Companion spec (exact numbers, message bytes, state tables): `audit/gauntlet-round/01-auto-architect.md`.
> Safety rituals: `firmware/README.md` + `build-guide/03-testing-and-driving.md`.

## The one-sentence version

The robot's own Teensy brain is always in charge of safety; smarter computers (onboard Pi, pit laptop,
cloud AI) are only allowed to *suggest* where to go — and every suggestion expires in a fraction of a second.

## The ladder (T0–T5): who does what

Think of it like driving lessons with ever-smarter helpers — but the brake pedal always works:

| Tier | Nickname | Where is it? | How often? | What it does | If it fails… |
|---|---|---|---|---|---|
| T0 | The brake | Teensy 4.0 | always | Failsafe, boot lock, TX-off stop | It IS the failsafe — everything stops |
| T1 | The governor | Teensy 4.0 | ~1000×/sec | Holds spin + heading, talks to motors (dShot600 @8 kHz), reads 2 accelerometers | T0 watches it and brakes if it stalls |
| T2 | The helper | Pi Zero 2W onboard | 50–100×/sec | Trims driving, recovers from hits, logs video to SD | T1 ignores bad data; short coast, then safe-spin |
| T3 | The coach | Pit laptop + overhead camera | ~5×/sec | Watches both bots from above, shows dashboard, sends gain tweaks | Robot keeps driving onboard-only; coach data expires in 1 s |
| T4 | The strategist | Cloud AI | every few sec | Suggests tactics ("opponent hugs left wall") — **a human must approve** | Suggestions just expire in 5 s; nothing moves |
| T5 | Full auto | T2+T3 fused | 10×/sec | Track → predict → drive-intent; T1 governor still approves every move | ANY problem → instant safe state (see below) |

**Iron rules (memorize these):**
1. The cloud NEVER drives. It only sends ideas through the pit laptop.
2. Every command has an expiry date (TTL). Old news is thrown away, never obeyed.
3. The Teensy enforces speed limits + arena boundaries no matter what auto asks.
4. The Pocket radio's kill switch always wins — tested on film before auto is ever enabled.
5. Full auto (T5) needs written event approval (TRC pre-clear). Out of the box, the robot ships as
   human-driven with AI hints only.

## How a T5 driving decision flows (normal day)

```
1. SEE      Overhead camera spots both bots (~5/sec) + onboard camera feels motion (50–100/sec)
2. FUSE     Onboard Pi merges them: "I am here, opponent is there, moving this way"
3. PREDICT  Pi guesses where the opponent will be in ~1/3 second (like leading a pass in soccer)
4. SUGGEST  Pi sends a 10×/sec note: "drift left-forward at ~1 m/s, hold 3200 RPM" (expires in 0.15 s!)
5. GOVERN   Teensy checks: kill pressed? too fast? outside arena? data stale? sensor confused?
            → if anything is wrong: ignore + go safe. If all good: drive the motors (~1000×/sec).
```

Steps 1–4 are *advice*. Step 5 is *law*.

## Modes (the robot is always in exactly one)

- `BOOT_LOCK` → `DISARMED`: powers up safe, never armed with throttle on. Bench config happens here.
- `MANUAL`: you drive with the Pocket sticks. **Default. Start here.**
- `ASSIST_T2`: you drive, Pi smooths spin + recovers from hits. First autonomy step, test box only.
- `SUPERVISED`: laptop shows tracking + AI hints; you approve. Cloud never touches the sticks.
- `AUTO_T5`: full auto — only in the test box, only with kill-switch demo filmed, only with written approval.
- `DEGRADED` → `SAFE_SPIN` → `ESTOP`: the slide down when something breaks (next section). Recovery is
  always deliberate (re-arm ritual) — the robot NEVER restarts itself into auto.

## When things break (the degradation ladder — exact timeouts)

| What happens | After how long | What the robot does |
|---|---|---|
| Miss one auto message (normal WiFi hiccup) | >0.12 s | Coast briefly on last good command, flag it on dashboard |
| Gap keeps growing | >0.25 s | Drop to onboard-only (ignore pit camera, hold center using own sensors) |
| Onboard motion data also stale | >0.20 s | Kill translation (stop drifting), hold spin in place |
| Pit link dead in auto / outside arena / asked to overspeed / sensors disagree | >1.0 s link, else immediate | `SAFE_SPIN`: zero drift, hold or shed RPM, wait for you to re-arm |
| Kill pressed / radio lost / brain stalled / battery brown-out | instantly (<0.05 s kill; radio suspect >0.1 s, stopped <1 s) | `ESTOP`: brake now, latched until deliberate re-arm |

Worst case under this ladder: ~a quarter-second of coasting before the robot gives up on auto and holds
position — bounded by speed and position limits, never a full-second runaway.

## The governor's checklist (Teensy, every millisecond, in order)

1. Kill / radio / watchdog / power — brake NOW if any trip.
2. Are both accelerometers agreeing? If not for 50 ms → safe.
3. Speed limit: bench 1500–2000 RPM learning cap → 2k→3k→4k progression → 4000 hard ceiling. Over-asks get clamped; arguing for 0.5 s → safe.
4. Arena fence: outside the calibrated boundary + margin, or lost for 0.5 s in auto → stop drifting, safe.
5. Freshness: every message older than its TTL is trash (auto 0.15 s, onboard trim 0.04 s, pit motion 0.3 s, cloud hints 5 s advisory-only).
6. Sanity: impossible jumps in speed/RPM between messages get clamped; repeated → degraded.
7. Authority: manual mode ignores all autonomy; assist accepts trim only; auto accepts fused-T2 only; cloud mail to the Teensy is bounced.
8. Heat/battery sag → shed RPM first, then safe.

Every governor action is logged with a cause code for post-match review.

## What to buy / wire for autonomy (short version)

- Already in the fight build: Teensy 4.0 LOCK (no pins), 2× H3LIS331DL ±400 g @45°, AM32 55 A dShot600, ELRS EP1/RP1 + RadioMaster Pocket (the kill link), PROPDRIVE 2836 1200 KV hubmotors, 2× 4S 550 mAh parallel.
- Autonomy add-ons: Pi Zero 2W + Pi Camera v3 Wide + 5 V/3 A BEC on TPU standoffs (~35–50 g, budgeted), UART to Teensy @115200, pit laptop + USB overhead cam + tripod + travel router in one tote.
- Never power the Teensy from Pi USB in the bot. Pi brown-out must still leave the Teensy able to failsafe.

## Bring-up order (don't skip steps)

1. Pit base self-test green (`base/setup.sh` — checks camera FPS, WiFi latency, ELRS RSSI; prints GO/NO-GO).
2. Flash baseline, bind Pocket, bench spin with NO weapon energy.
3. Film the failsafe (TX-off → stop) + kill-switch (<50 ms) demos.
4. Weigh in (≤1361 g) — autonomy hardware included.
5. MANUAL drive → ASSIST → SUPERVISED → (test box + approval only) AUTO_T5.
6. Every step has a Done checkbox in `build-guide/03-testing-and-driving.md`. If stuck, stop and ask — never tune two things at once.

## Simulator (the website's Studio page)

The `/studio` Drive mode is a practice game that teaches the core melty truth — *no spin = no move*
(under ~1400 RPM you get nothing; full authority past ~3100). Its rival bot uses the same chase geometry
as real T5 (lead the opponent ~0.35 s, strafe-wobble, flee to spin up, avoid walls). Useful for learning
and for testing policies — but it has no TTLs, no governor, no kill switch, and its walls bounce (real
walls scrub and stall). Never mistake sim behavior for safety logic.

## FAQ

- **Can the cloud drive the robot?** No. Ever. It sends strategy text to a human (or, post-approval, a gated hint). The Teensy drops cloud mail addressed to it.
- **What if WiFi dies mid-auto?** The onboard Pi keeps driving alone for a fraction of a second, then holds position. The pit laptop is a coach, not a driver.
- **What if the killer move is "just disable the governor for one match"?** No. The governor is compiled in, default-deny, and T5 itself is behind a compile flag that defaults OFF.
- **Do I need ROS?** No. Plain UART/HTTP/WebSocket messages (one small struct, §5 of the architect spec). ROS patterns only where they genuinely help the pit dashboard.
- **What do I show the inspectors?** Failsafe film, kill-switch film, frozen firmware version + config backup, weight log, and (for T5) the TRC pre-clear letter. No letter = no auto in the arena.

## Where to look next

- Exact bytes/timeouts/state tables: `audit/gauntlet-round/01-auto-architect.md` (§4 FSM, §5 schema, §6 governor, §7 ladder, §8 challenges).
- Flash/config/failsafe ritual: `firmware/README.md`.
- Drive progression + Done checkboxes: `build-guide/03-testing-and-driving.md`.
- Pit base + radio details (sibling agents): `base/` and `radio/` (landing soon).
