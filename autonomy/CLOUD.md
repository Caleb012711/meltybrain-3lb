# autonomy/CLOUD.md — T4 Cloud Models (advisory ONLY, human-gated)

> Tier: **T4** per `audit/autonomy-plan-2026-09-18.md` §1 and `firmware/README.md` §E.
> **Iron rules (non-negotiable):** cloud NEVER drives — it emits **strategy hints /
> drive-intents** that travel **cloud → T3 (pit base) → human gate → T2/T1**, never
> directly to the bot. Every hint/intent carries a **TTL + confidence**. Hints expire
> in **5 s**. T1 enforces RPM caps + arena geofence regardless of what any hint asks.
> The Pocket's momentary switch is a hardware-priority kill. **Default ship = human-gated
> T4. Full-auto T5 is behind a compile flag + TRC pre-clear** (SPARC §6.4.3) and is NOT
> enabled by this document.

## 0. What T4 is and is not

| | T4 cloud | Not T4 |
|---|---|---|
| Job | Seconds-latency VLM strategy hints (`SEEK_LEAD`, `FLEE_SPINUP`, `WALL_AVOID`, `HOLD_RPM`, `BRAKE`) mapped onto the onboard fallback brain's primitives | Real-time control, RPM/heading loop (that's T1), trim loop (that's T2) |
| Rate | One hint every **2–5 s** (0.2–0.5 Hz), event-triggered refresh (hit, wall-pin, spin-down) | 5 Hz track (T3), 50–100 Hz trim (T2), ~1 kHz spin (T1) |
| Authority | **Advisory only.** Human driver taps approve, or hint is logged and ignored | Any path that bypasses the T3 gate, T1 governor, or kill switch |
| Transport | Outbound-only HTTPS from the pit laptop over venue WiFi/hotspot | Inbound ports, cloud→bot direct sockets, cloud-held kill/driving keys |

Out of scope (per plan §6): no custom PCB, no motor/ESC changes, no CAD re-model,
**no cloud-vendor lock-in** — any OpenAI/Anthropic-class VLM works through ONE adapter
interface below. Nothing proprietary is pinned: no vendor SDK, no model-name
hard-code, no provider-specific headers in the core path.

## 1. Model adapter interface (vendor-neutral)

One abstract adapter. All vendor specifics live in thin subclasses + env config.
Core path uses only the standard library (`urllib`) so no HTTP client or vendor SDK
is ever a dependency.

```python
# base/cloud/adapter.py  (reference shape — plain Python, stdlib only)
from __future__ import annotations
import time, uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

@dataclass(frozen=True)
class Hint:
    intent_id: str            # uuid4, set by T3 tick builder (not the model)
    issued_at: float          # time.time() on BASE clock (base is time authority)
    ttl_s: float              # <= 5.0, set by T3 after validation (see §5)
    confidence: float         # 0..1, parsed from model JSON, clamped
    action: str               # one of ACTION_SET (§3)
    params: dict              # lead_time_s, strafe_wobble_amp, target_xy, ...
    rationale: str            # <= 140 chars, shown on dashboard
    model_id: str             # opaque label, e.g. "adapter:openai-compatible"
    raw: dict = field(default_factory=dict, repr=False)  # full parsed JSON for logs

class CloudModelAdapter(ABC):
    """Exactly one integration point. Any VLM implements request_hint()."""

    @abstractmethod
    def request_hint(self, system: str, user: str, timeout_s: float) -> str:
        """POST prompts, return RAW TEXT of the model's reply. No parsing here."""
        raise NotImplementedError

    def health(self) -> dict:
        return {"ok": True, "adapter": type(self).__name__}

    def close(self) -> None:
        pass
```

Concrete subclasses (each < 60 lines, kept OUTSIDE the core path):

- `OpenAICompatibleAdapter(endpoint, model, api_key, max_tokens)` — POSTs
  `{model, messages:[{system},{user}], response_format:{type:"json_object"}, max_tokens}`
  with `Authorization: Bearer $KEY`. Works against any OpenAI-compatible endpoint.
- `AnthropicCompatibleAdapter(endpoint, model, api_key, max_tokens)` — POSTs
  `{model, system, messages:[{user}], max_tokens}` with `x-api-key: $KEY`.
- `LocalStubAdapter(fixture_path)` — **no network.** Replays a canned JSON hint.
  Used for bench tests, CI, and venue-no-internet rehearsal. `setup.sh` self-test
  runs against this stub so GO/NO-GO never depends on the venue network.

Config (env only — never commit keys):

```bash
CLOUD_ADAPTER=openai-compatible | anthropic-compatible | stub   # default: stub
CLOUD_ENDPOINT=https://<provider>/v1/chat/completions           # no default
CLOUD_MODEL=<opaque model label>                                # no default, no pin
CLOUD_API_KEY=$CLOUD_API_KEY                                    # env only
CLOUD_TIMEOUT_S=8                                               # hard cap, see §4
CLOUD_MAX_TOKENS=300
```

Switching vendors = changing these five env vars. No code change, no new dependency.

## 2. Tick schema — grounded in the RivalBot fallback brain

The onboard fallback brain is `web/src/pages/Studio.tsx` `RivalBot` (lines ~171–241):
seek with **velocity lead `foe.pos + foe.vel × 0.35`**, sinusoidal strafe wobble
**`w = sin(t × 2) × 0.3`** applied perpendicular, **flee-to-spin-up while
`rpm < 1200`**, wall-avoid outside `lim = HALF − BOT_R − 3`, shared grip band
**1400 → 3100 RPM** (`GRIP_LO/HI/EXP = 1400/3100/2.8`), `RPM_MAX = 4000`,
collision RPM cut `×0.75`. The cloud tick speaks this same language so T3 can map
any hint onto deterministic primitives it already understands. The model NEVER
invents new control axes — it only tunes these six knobs:

| Knob | RivalBot ground | Allowed range |
|---|---|---|
| `lead_time_s` | `0.35` hard-coded (`_aiLead = foe.pos + foe.vel*0.35`) | 0.0 – 0.6 |
| `strafe_wobble_amp` | `0.3` (`sin(t*2)*0.3`) | 0.0 – 0.5 |
| `strafe_wobble_hz` | `2 rad/s` (`sin(clock*2)`) | fixed 2, model may set 0 to disable |
| `flee_rpm` | `1200` (`me.rpm < 1200 → flee`) | 800 – 1600 |
| `target_xy` | implicit (foe lead point / wall-avoid point) | clamped to arena inset by T3 |
| `action` | branch the bot is already in | closed enum (§3) |

### 2a. Per-tick USER message (T3 → adapter → model). Exact template.

T3 builds this JSON every tick (2–5 s cadence, or on event). Units: **metres,
m/s, RPM, seconds**. Arena frame: centre (0,0), +x right, +y up-field from our
driver station; `arena_half_m` from the 4-corner pixel→metre calibration.

```json
{
  "tick_id": "3f9c…",
  "base_time": 1718730000.123,
  "gate_mode": "human-gated",
  "match": { "clock_s": 87.4, "match_len_s": 180, "our_score": 0, "foe_score": 0 },
  "arena": { "half_m": 2.4, "bot_radius_m": 0.15, "wall_margin_m": 0.30 },
  "self": {
    "pos_xy_m": [0.42, -0.31], "vel_xy_ms": [0.55, 0.12], "speed_ms": 0.56,
    "rpm": 3150, "grip_band": [1400, 3100], "rpm_max": 4000,
    "state": "seek"
  },
  "foe": {
    "pos_xy_m": [-0.80, 0.55], "vel_xy_ms": [-0.30, -0.05], "speed_ms": 0.30,
    "track_conf": 0.91, "track_age_ms": 140
  },
  "lead_now": {
    "lead_time_s": 0.35,
    "predicted_xy_m": [-0.905, 0.532],
    "separation_m": 1.62, "closing_ms": -0.41
  },
  "recent": {
    "last_hint_action": "SEEK_LEAD", "last_hint_age_s": 3.1,
    "last_hint_outcome": "approved-seek-continues",
    "hits_last_10s": 1, "wall_contacts_last_10s": 0
  },
  "ask": "Reply with ONE JSON object matching the intent schema. lead_time_s in [0,0.6] (default 0.35). strafe_wobble_amp in [0,0.5] (default 0.3, 0 disables). flee_rpm in [800,1600] (default 1200). confidence in [0,1]. rationale <= 140 chars."
}
```

Field rules: `track_conf`/`track_age_ms` come from the T3 YOLO tracker; if
`track_age_ms > 1000` T3 does NOT call the cloud (coast path, §6). `lead_now` is
computed by T3 with the RivalBot formula so the model sees the deterministic
baseline it is being asked to *nudge*, not replace.

### 2b. SYSTEM prompt. Exact template (ships verbatim in `base/cloud/prompts.py`).

```text
You are T4-STRATEGIST, the advisory-only strategy module for EYELINER, a 3 lb
meltybrain combat robot (spinning ring that translates by modulating wheel speed
once per revolution; no RPM = no translation).

IRON RULES — violate none:
1. You NEVER drive. You output ONE JSON strategy hint. A human driver and an
   onboard governor (T1) make all real decisions and can ignore you.
2. Your action MUST be one of: HOLD_RPM, SEEK_LEAD, FLEE_SPINUP, WALL_AVOID,
   BRAKE, NO_OP. No other strings. No new control axes.
3. lead_time_s in [0, 0.6], default 0.35. strafe_wobble_amp in [0, 0.5], default
   0.3. flee_rpm in [800, 1600], default 1200. Numbers outside ranges will be
   clamped and your hint down-weighted — stay inside them.
4. Your hint expires in seconds (TTL <= 5). Prefer safe, boring advice under
   uncertainty: HOLD_RPM or FLEE_SPINUP over aggressive SEEK_LEAD.
5. If the opponent track is stale (track_age_ms > 500) or track_conf < 0.4, reply
   NO_OP with confidence <= 0.3 and rationale "stale track".
6. Reply with EXACTLY ONE JSON object, no markdown, no prose, matching this schema:
{"action": str, "lead_time_s": float, "strafe_wobble_amp": float,
 "strafe_wobble_hz": 2, "flee_rpm": float, "target_xy_m": [float, float] | null,
 "confidence": float, "rationale": str}
7. confidence is your calibrated uncertainty 0..1: <0.35 means "ignore me",
   0.35..0.6 means "show dimmed, never auto-apply", >=0.6 means "candidate".
8. rationale <= 140 chars, plain tactical English, e.g. "foe hugging left wall,
   lead 0.4 and cut off".
```

### 2c. Intent OUT (model → T3). Validated, never trusted.

```json
{
  "action": "SEEK_LEAD",
  "lead_time_s": 0.40,
  "strafe_wobble_amp": 0.25,
  "strafe_wobble_hz": 2,
  "flee_rpm": 1200,
  "target_xy_m": [-0.90, 0.53],
  "confidence": 0.72,
  "rationale": "foe hugging left wall, lead 0.4 and cut off"
}
```

T3 post-processing (mandatory, §5): JSON-parse → schema-check → clamp numerics →
attach `intent_id`, `issued_at` (base clock), `ttl_s` (min(model-implied, 5.0)),
`model_id` → gate on TTL/confidence → human approve → execute as RivalBot-branch
parameters. A model reply that fails parse, has a bad enum, or misses a field is
dropped and logged as `drop:parse` — it NEVER flows forward as partial state.

`ACTION_SET = {HOLD_RPM, SEEK_LEAD, FLEE_SPINUP, WALL_AVOID, BRAKE, NO_OP}`.
Semantics map 1:1 onto RivalBot branches: `FLEE_SPINUP` = flee vector while
`rpm < flee_rpm`; `SEEK_LEAD` = lead-point seek + wobble; `WALL_AVOID` = wall-avoid
vector; `HOLD_RPM`/`BRAKE` = throttle/brake holds through the T1 governor;
`NO_OP` = keep current T2/T3 plan.

## 3. Latency budget (camera → base → cloud → base → bot)

Measured on the reference pit laptop (YOLOv8n, USB overhead cam @30 fps, venue
hotspot). p50 / p95 in ms. The cloud leg dominates BY DESIGN — that is why T4 is
advisory-only with a 5 s TTL.

| # | Hop | p50 | p95 | Allowance | Notes |
|---|---|---|---|---|---|
| 1 | USB capture + de-Bayer (30 fps) | 33 | 50 | ≤ 60 | fixed by frame rate |
| 2 | YOLOv8n track both bots + pose | 45 | 90 | ≤ 120 | laptop iGPU/CPU; falls back to 320px if over |
| 3 | Pixel→metre + tick build (`lead_now`) | 5 | 12 | ≤ 20 | 4-corner calibration, pure math |
| 4 | Cloud bridge batch + JSON encode | 8 | 20 | ≤ 30 | downsamples to ≤1 fps annotated thumb |
| 5 | WAN uplink (hotspot) | 150 | 400 | ≤ 600 | biggest venue variance; abort past timeout |
| 6 | **VLM inference** | 900 | 2500 | ≤ 4000 | provider + load dependent; capped by `CLOUD_TIMEOUT_S=8` |
| 7 | WAN downlink | 150 | 400 | ≤ 600 | symmetric with uplink at most venues |
| 8 | T3 validate + gate + dashboard WS push | 8 | 15 | ≤ 30 | parse, clamp, TTL stamp, human prompt |
| 9 | WiFi T3→T2 approved-intent forward | 20 | 50 | ≤ 100 | only AFTER human approve (or T5-flag path) |
| 10 | UART T2→T1 @115200 (governor exec) | 9 | 15 | ≤ 20 | T1 still enforces caps/geofence |
| | **End-to-end typical** | **~1330** | **~3570** | **≤ 5 s TTL** | p95 must land inside TTL or hint is useless → dropped |

Budget rule: if `now − issued_at > ttl_s` at ANY gate, the hint is dead — drop it,
log `drop:stale`, keep the previous plan. `CLOUD_TIMEOUT_S=8` bounds the worst
case; a timed-out call logs `drop:timeout` and suppresses re-fire for 5 s
(backoff) so a slow provider cannot pile up stale hints.

Payload discipline (keeps hops 4–7 inside budget): per call send the compact tick
JSON above (~0.8–1.2 kB) + at most ONE 320px JPEG thumbnail (~15–25 kB) at ≤1 fps.
NEVER stream video to the cloud. Full 1080p stays on the Pi SD card (§7).

## 4. Offline / degraded behavior (the link WILL drop at venues)

State machine, owned by T3. Base is the time authority (`time.monotonic` for ages,
wall-clock only for log filenames).

```text
LINK_OK ── no fresh hint for >5 s ──→ DEGRADED ── cloud back ──→ LINK_OK
   │                              │
   │ T3 track lost >1 s           │ T3 track lost >1 s
   ▼                              ▼
T3-COAST (≤1 s: propagate last track with foe.vel × dt, show AMBER) ──→ T2-ALONE
   │ track resumes                  │ track resumes + link back
   └────────────────────────────────┘
T2-ALONE: T3 dashboard shows RED "ONBOARD ONLY"; T2 runs the RivalBot-mirror
fallback (flee < flee_rpm, else lead 0.35 seek + wobble, wall-avoid); T1 governs.
```

Exact thresholds:

- **T3-coast ≤ 1 s:** on overhead-track loss, T3 propagates
  `foe.pos + foe.vel × dt` for at most 1.0 s, marking `track_conf` decaying
  (`conf × 0.9` per 200 ms) and `track_age_ms` growing. Past 1.0 s: track declared
  LOST, cloud calls stop, T2-alone begins. Matches plan §1 ("T3 commands expire
  in 1 s").
- **Cloud stale:** any hint with `age = now − issued_at > ttl_s` (TTL ≤ 5 s) is
  dropped unread. Any hint with `track_age_ms > 1000` at send time is never sent.
- **T2 watchdog:** T2 expects approved-intent heartbeat from T3 at ≥0.2 Hz in
  gated-auto rehearsal; silence → T2 continues its own fallback brain, T1 holds
  last-good ≤500 ms then safe-spin (per plan §1 T2 failsafe). T0/T1 need no cloud
  state to failsafe — TX-off and brown-out paths are purely local.

Rehearsal requirement: every event setup runs 2 min on `CLOUD_ADAPTER=stub` with
the hotspot OFF, demonstrating coast → T2-alone → recovery on the dashboard
before the first real hint is ever requested.

## 5. TTL + confidence — what T3 does with every hint

Every hint carries `issued_at` (base clock), `ttl_s ≤ 5.0`, `confidence ∈ [0,1]`.
T3 is the ONLY decider. Decision table (evaluated in order):

| # | Condition | T3 action | Dashboard |
|---|---|---|---|
| 1 | Parse/schema fail, bad enum, missing field | DROP `drop:parse`, keep prior plan | grey toast, logged |
| 2 | `age > ttl_s` or `ttl_s > 5.0` (clamp + drop if still stale) | DROP `drop:stale` | grey, logged |
| 3 | `confidence < 0.35`, or action `NO_OP`, or model said "stale track" | DROP `drop:lowconf`, keep prior plan | grey, logged |
| 4 | `0.35 ≤ confidence < 0.6` | SHOW DIMMED, **never auto-applies**, needs explicit tap | amber card |
| 5 | `confidence ≥ 0.6` AND fresh | CANDIDATE: show bright, await human tap | green card + approve button |
| 6 | `target_xy_m` outside arena inset | CLAMP to inset, demote one level (5→4) | note "clamped" |
| 7 | Any numeric out of range | CLAMP to §2 ranges, demote one level | note "clamped" |
| 8 | T5-flag path (compile flag + TRC letter on file + `gate_mode:auto-cleared`) | auto-apply ONLY rules 5+6+7-passed hints; everything else same as above | auto-apply banner + audit mark |

Human gate (default): driver taps **Approve** (applies as RivalBot-branch params
via T2) or **Dismiss** (logged, plan unchanged). No tap in 5 s = TTL expiry =
dismiss. There is deliberately NO "auto-approve after N seconds" — silence is
always dismissal.

T5-flag path (NOT default): additionally requires `track_age_ms ≤ 200`,
`track_conf ≥ 0.6`, separation sanity (`0.2 m < separation < arena diag`), and
the T1 governor's independent RPM/geofence veto. Any veto → safe-spin + log.

## 6. Cost-per-match estimate approach (no vendor pin)

Cost is computed from YOUR provider's price table plugged into this formula —
no prices are hard-coded here because models and price sheets change monthly.

```text
cost_match = N_calls × (tok_in × $/tok_in + tok_out × $/tok_out + still_usd)
N_calls    = match_len_s / hint_period_s   (+ event-triggered extras, cap ×1.5)
```

Reference shape (measure yours on the stub, then with one live test bout):

| Term | How to get it | Typical shape |
|---|---|---|
| `match_len_s` | 180 (3-min bout) | fixed |
| `hint_period_s` | T3 config, 2–5 s | 3 s → 60 calls/bout nominal |
| `tok_in` | count tick JSON + thumbnail tokens from logs | ~800–1200 text tokens + 1 low-res image |
| `tok_out` | count reply tokens from logs | ~150–250 (one JSON object, capped by `CLOUD_MAX_TOKENS=300`) |
| `$/tok` | YOUR provider's current price page | plug in at estimate time |
| `still_usd` | per-image surcharge if your provider has one | often 0 for tiny thumbs |

Worked template (example numbers ONLY — recompute with your bill):

```text
60 calls × (1000 in + 200 out) @ ($X/M in, $Y/M out) ≈ 60 × (1000X + 200Y)/1e6
```

Keep it cheap: 3–5 s period (NOT faster — hints go stale slower than physics
changes), 320px ≤1 fps thumbs, `max_tokens=300`, backoff on timeouts, stub-mode
for all rehearsal. Log-driven estimator: `base/cloud/cost.py` reads a match
JSONL (§7) and prints `N_calls, mean tok_in/out, cost_match` given a price pair
passed as CLI flags — so the cost section of every post-match review is one command.

## 7. Log capture for post-match review

Per match, T3 writes ONE append-only JSONL (fsync per line, rotate by match):

```text
base/logs/cloud-YYYYMMDD-HHMMSS.jsonl
```

One line per event, `ev ∈ {tick, hint, decision, approve, link}`:

```json
{"ev":"tick","tick_id":"3f9c…","t":1718730000.123,"tok_in_est":1040,"thumb":true,"track_conf":0.91,"track_age_ms":140}
{"ev":"hint","tick_id":"3f9c…","t":1718730001.480,"rtt_ms":1357,"action":"SEEK_LEAD","lead_time_s":0.40,"confidence":0.72,"model_id":"adapter:openai-compatible","raw_len":212}
{"ev":"decision","tick_id":"3f9c…","t":1718730001.482,"verdict":"candidate","reason":"fresh,conf>=0.6"}
{"ev":"approve","tick_id":"3f9c…","t":1718730002.900,"by":"driver","verdict":"approved","applied_action":"SEEK_LEAD"}
{"ev":"link","t":1718730100.000,"state":"DEGRADED","reason":"no fresh hint >5s"}
```

Plus: 1 Hz dashboard thumbnails (`base/logs/thumbs-*.jpg`, ~180/bout, auto-purged
after 30 d), and a pointer line to the Pi's 1080p SD video filename for full-res
sync (wall-clock filename match — the Pi records continuously per firmware §E).
API keys are NEVER logged; `raw` stores the parsed JSON, never headers.

Post-match ritual (5 min): run `cost.py` → skim `verdict != candidate` lines →
watch the 2–3 approved hints against the 1080p footage → file one line per hint
(good/stale/wrong) back into the next bout's `hint_period_s` / confidence
thresholds. Log review is itself a T4 output per firmware §E ("log review").

## 8. Security notes (kill-switch isolation, key hygiene)

- **E-stop separation:** the cloud path CANNOT assert kill, brake-override, RPM-cap
  change, or geofence change. Those live in T0/T1 + the Pocket hardware link only.
  Compromise of laptop, hotspot, or provider credentials degrades to T2-alone, never
  to loss of stop authority.
- **Keys:** `CLOUD_API_KEY` from env / OS keyring only. Never in repo, logs, dashboard
  payloads, or screenshots. `setup.sh` self-test uses the stub adapter (no key needed).
- **Network posture:** outbound-only HTTPS. No inbound firewall holes for cloud; T3
  dashboard binds to the travel-router LAN, not the hotspot WAN.
- **Input validation:** T3 schema-validates + clamps every model byte (§5 rules 1/6/7).
  Oversize replies (>4 kB) are truncated and dropped. No `eval`, no prompt-injection
  surface into T1/T2 — only the six numeric knobs cross the boundary.

## 9. Bring-up checklist (pit-laptop, beginner path)

- [ ] `base/setup.sh` prints GO (camera FPS, YOLO import, stub-adapter round-trip).
- [ ] Hotspot OFF rehearsal: pull the USB cam for 2 s → dashboard shows AMBER coast →
      RED T2-alone → recovery. Filmed once per event.
- [ ] One live stub bout (`CLOUD_ADAPTER=stub`): approve/dismiss buttons work, JSONL fills.
- [ ] Live provider (only if wanted): set the five env vars, one 60 s test, run `cost.py`,
      confirm p95 end-to-end < 5 s on the venue network. If not — fight on stub/T2-alone
      with zero shame; T4 is a bonus, not a dependency.
- [ ] TRC: T4-human-gated is the default declared config. T5 auto needs the pre-clear
      letter + compile flag — without both, the auto-apply code path does not build.

## 10. Files

```text
base/cloud/adapter.py    # CloudModelAdapter + 3 thin subclasses (this §1)
base/cloud/prompts.py    # SYSTEM + tick-builder verbatim (§2a/2b)
base/cloud/gate.py       # T3 TTL/confidence decision table (§5)
base/cloud/cost.py       # log-driven cost estimator (§6)
base/cloud/stub.json     # canned NO_OP/HOLD_RPM fixtures for offline rehearsal
base/logs/cloud-*.jsonl  # per-match capture (§7)
```
