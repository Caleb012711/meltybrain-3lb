# T2 Onboard Supervisor — Pi Zero 2W + Pi Cam v3 Wide (UART @115200)

Status: SPEC. Implements `audit/autonomy-plan-2026-09-18.md` §1 T2 row on top of
`firmware/README.md` §B/§C/§E, `BOM.md` §2 supervisor row, `manufacturing/P1-mass-audit.md` Branch E.
T1 (Teensy 4.0) is always the governor. T2 advises. T2 never drives.

```
T0 failsafe (Teensy) > T1 spin governor (~1 kHz) > T2 Pi assist (50 Hz nominal)
  > T3 pit base (~5 Hz, expires 1 s) > T4 cloud (seconds, advisory, expires 5 s)
```

Iron rules (from autonomy plan §1 + build-guide/02):
1. Fast spin loop (~1 kHz, dShot600 @8 kHz, dual H3LIS331DL) runs on the MCU, not Linux.
2. WiFi/cloud NEVER drives. Every intent carries a TTL.
3. Pocket kill-switch + T0 watchdog always win. T1 enforces RPM caps + safe-spin regardless of T2.
4. Pi brown-out = Teensy must still failsafe (firmware/README §D, proven by film).

## 1. Hardware + wiring (locked)

| Item | Spec | Notes |
|---|---|---|
| Compute | Raspberry Pi Zero 2W (BCM2710A1 4×A53 @1 GHz, 512 MB) | ~16 g bare |
| Camera | Raspberry Pi Camera Module 3 Wide (IMX708, 120° HFOV) + 200 mm flex | ~3–4 g + cable ~2 g |
| Power | 5 V / 3 A BEC (switching, 2–6 S in), star-grounded to battery link | ~8–12 g |
| Mount | TPU standoffs + TPU cradle pocket, M3 nylon hardware | ~5–8 g |
| Link | Teensy ↔ Pi UART, **115200 8N1, 3V3 logic, common GND, twisted pair** | wire ~3 g |

Wiring:

```
4S pack (14.8 V nom) → removable link → BEC IN (14.8 V) → BEC OUT 5 V/3 A → Pi 5 V + GND (pins 2/6)
Teensy Serial2 TX (pin 7/8 side) → Pi RX (GPIO15/pin 10)
Teensy Serial2 RX → Pi TX (GPIO14/pin 8)
Teensy GND → Pi GND (pin 6/14, second wire — do NOT rely on BEC GND alone for UART return)
ELRS EP1/RP1 → Teensy Serial1 @420800 (CRSF). Pi NEVER touches the RX.
4700 µF bulk on 5 V bus per firmware/README §B (accel-noise / brown-out rule).
NEVER power Teensy from Pi USB in-bot (firmware/README §E).
```

Pin plan (Teensy 4.0 has 7× Serial — no contention):

| Port | Use | Baud | Pins |
|---|---|---|---|
| Serial1 | CRSF to ELRS RX (control + telemetry) | 420800 | RX1/TX1 (0/1) |
| Serial2 | Pi link (this spec) | 115200 | RX2/TX2 (7/8) |
| USB | Bench debug / gain push | 12 Mbit | USB |

Pi side: `/dev/serial0` (GPIO14/15), Bluetooth moved off UART (`dtoverlay=disable-bt`),
serial console disabled (`enable_uart=1`, `console=serial0` removed from cmdline).

Vibration: TPU standoffs are functional, not cosmetic. Zero 2W SD slot + Cam flex
both fret under 3000+ RPM shock. Hard-mount = corrupted SD + flex tears. Torque
M3 nylon to snug-only, add foam dot under cam board, route flex with service loop
taped to TPU (no tight fold across ring gap), hot-glue BEC input/output after continuity check.

## 2. UART protocol (byte-budgeted for 115200)

### 2.1 Physical budget (verified — see §2.4)

115200 8N1 = 10 symbols/byte → **11 520 B/s usable**, half-duplex-shared in practice
(full-duplex wires, but Teensy IRQ + Pi parse share the same time).

| Rate | Bytes/cycle available (both dirs) |
|---|---|
| 20 Hz | 576 B |
| 50 Hz (nominal) | 230 B |
| 100 Hz (ceiling) | 115 B |

Design point: **50 Hz nominal, binary, COBS-framed. 100 Hz is a bench-only ceiling.**
ASCII/NMEA-style text is rejected: an 80 B ASCII status @50 Hz each way = 8000 B/s
= 69% of the link before framing — no headroom for jitter, gain pushes, or log marks.

### 2.2 Framing (both directions, no exceptions)

```
[0x00 idle] COBS(payload+CRC16) 0x00
payload = SEQ(1) | TYPE(1) | BODY(n) | CRC16-CCITT(2, over SEQ|TYPE|BODY)
```

- COBS overhead: +1–2 B worst case. Terminator `0x00` resyncs after shock-induced glitches.
- CRC16-CCITT (poly 0x1021, init 0xFFFF). CRC fail → drop frame, count it, do NOT act on it.
- SEQ uint8 monotonic per sender. Receiver rejects stale/duplicate (SEQ must advance;
  gap >5 = link-degraded flag, not a failsafe — failsafe is timeout-based, §6).
- Max payload 64 B. Max wire frame ~68 B. Parser must tolerate 0x00 runs (shock gaps).
- Endianness: little-endian. All multi-byte ints LE. Floats are fixed-point (no `float` on wire).
- T1 ignores bad T2 frames (per autonomy-plan §1 T2 failsafe column) — no NAK, no retry on UART.
  T3 gain pushes ride TCP/WiFi, not this UART.

### 2.3 Message set + rates

Only four wire types. Everything else (gains file, T3 intents, video) rides a different link.

**T1 → T2 `STATE` (TYPE 0x53 'S'), 50 Hz (every 20 ms), 30 B payload / ~32 B wire:**

| Field | Type | Unit / scale | Notes |
|---|---|---|---|
| SEQ | u8 | — | T1 counter |
| TYPE | u8 = 0x53 | — | |
| rpm | u16 | RPM 0–8000 | fused dual-H3LIS estimate (T1 owns truth) |
| heading | i16 | decideg −1800..+1800 | LED = commanded dir reference |
| acc_peak | u16 | g 0–400 | max \|a\| since last STATE (hit detector input) |
| batt_mv | u16 | mV pack | e.g. 14800 = 4 S nom |
| temp_mcu | i8 | °C | Teensy temp |
| mode | u8 | enum | 0 DISARM 1 SPIN_IDLE 2 TRANSLATE 3 RECOVER 4 SAFE_SPIN |
| flags | u8 | bitmask | b0 RX_OK b1 T2_LINK_OK b2 RPM_CAP b3 GEOFENCE b4–7 reserved |
| t1_age | u8 | ms since last valid T2 frame, saturate 255 | lets Pi see itself through T1's eyes |
| reserved | u8[14] | zero | pad to fixed 30 B (keeps budget constant) |
| CRC16 | u16 | — | |

Wire: 30 + COBS ~1 + 0x00 = **~32 B → 1600 B/s @50 Hz.**

**T2 → T1 `TRIM` (TYPE 0x54 'T'), 50 Hz nominal (every 20 ms), 16 B payload / ~18 B wire:**

| Field | Type | Unit / scale | Authority limit (T1 enforces) |
|---|---|---|---|
| SEQ | u8 | — | |
| TYPE | u8 = 0x54 | — | |
| trim_x | i8 | −64..+64 (≈ ±12% authority) | translation trim, body frame |
| trim_y | i8 | −64..+64 | translation trim, body frame |
| rpm_delta | i16 | ±500 RPM | additive to T1 base RPM, clamped to RPM cap |
| gain_id | u8 | hash of active gain set | one-gain-at-a-time traceability (§7) |
| req | u8 | bitmask: b0 RECOVER_REQ b1 LOG_MARK b2–7 reserved | RECOVER_REQ is a hint; T1 decides |
| reserved | u8[6] | zero | pad to fixed 16 B |
| CRC16 | u16 | — | |

Wire: 16 + COBS ~1 + 0x00 = **~18 B → 900 B/s @50 Hz.**

**T2 → T1 `TELEM` (TYPE 0x45 'E'), 5 Hz (every 200 ms), 24 B payload / ~26 B wire:**
Carries items for CRSF forwarding (§5): pack mV (repeat), min-cell estimate, Pi temp,
Pi load (0–100), SD free (MB, saturate), flow quality (0–100), hit count. T1 queues
into CRSF telemetry at its own 5–10 Hz; never blocks TRIM/STATE.

**Either direction `PING` (TYPE 0x50 'P'), on demand only (bringup/link test):**
8 B payload echo with sender timestamp. Never in the 50 Hz loop.

Total steady-state UART load:

| Config | Math | % of 11 520 B/s |
|---|---|---|
| Nominal 50 Hz STATE+TRIM + 5 Hz TELEM | 1600 + 900 + 130 | **22.8%** |
| Ceiling 100 Hz STATE+TRIM + 5 Hz TELEM | 3200 + 1800 + 130 | **44.5%** |
| Rejected: 50 Hz ASCII 80 B each way | 8000 | 69% (no margin) |

Verdict: nominal fits with 4× headroom for jitter/gain-mark bursts. 100 Hz fits
electrically but leaves <2× margin and doubles Teensy IRQ + Pi parse cost for
no driving benefit (T1 already closes RPM at 1 kHz) — bench-only, not fight config.

### 2.4 Verification (re-run this)

```bash
python3 -c "
baud=115200; usable=baud/10
for r in [50,100]:
    load=(32+18)*r+26*5
    print(r,'Hz:',load,'B/s =',round(100*load/usable,1),'%')
"
# 50 Hz: 2630 B/s = 22.8%  |  100 Hz: 5130 B/s = 44.5%
```

Rule: if any future field grows the frame, re-run this block and keep nominal <35%.
If nominal ever needs >64 B payloads, move to 230400 (both ends support it) — but
re-film the failsafe + re-run the shock test, because baud changes move IRQ timing.

## 3. Optical-flow trim loop (honest budget on Zero 2W)

### 3.1 What T2 actually does at 50 Hz (and what it does NOT do)

T2 does NOT close the spin loop. T1 holds RPM/heading at ~1 kHz from the dual
H3LIS331DL. T2 closes a **slow outer trim loop**: observe translation drift → emit
bounded `trim_x/trim_y/rpm_delta` → T1 applies within authority limits.

Loop separation (50 Hz vision-assist feeding a 1 kHz governor) is the whole design.
If T2 dies, translation degrades to manual trim; spin never does.

### 3.2 The spinning-camera problem (read before tuning)

The camera spins with the bot at 33–66 rev/s (2000–4000 RPM). A naive dense-flow
pipeline measures **rotation, not translation**. Full-frame Farneback @640×480 on a
spinning 1080p feed is both wrong and too slow. Any spec that promises "100 Hz
optical-flow navigation on Zero 2W" without de-rotation is fiction.

This spec therefore mandates:

1. **Two libcamera streams from one sensor:** main 1920×1080 H264 @30 (record,
   §7) + lores 320×240 YUV420 @60 (flow input). Splitter, not two captures.
2. **Sparse Lucas-Kanade (≤80 features, 320×240 ROI annulus, masked center), NOT dense.**
   Mask the shell interior; track arena floor/walls only. Short exposure (≤2 ms,
   raised analog gain) to limit rotational smear.
3. **RPM-phase gating:** T1 STATE gives `rpm` + `heading` @50 Hz. T2 integrates phase
   and only trusts flow vectors after de-rotating by expected inter-frame rotation.
   Residual after de-rotation = translation + noise. Flow quality metric gates output:
   quality <40 → hold last trim (do NOT invent motion).
4. **Rate decoupling:** flow front-end runs at camera rate (30–60 Hz input, ~20–30 Hz
   trusted output after gating); the **TRIM publisher runs at fixed 50 Hz** holding
   or low-pass-filtering the latest trusted estimate. "50–100 Hz trim" in the autonomy
   plan means the TRIM message rate, not the vision solve rate. Conflating them
   overloads the Zero.

### 3.3 CPU headroom (Zero 2W, quad A53 @1 GHz, 512 MB — measured-pattern estimates)

| Task | Core cost (typical) | Notes |
|---|---|---|
| 1080p30 H264 HW encode + SD write (~10 Mbps) | ~10–15% of one core + DMA | ISP/GPU does encode; CPU pays container + I/O |
| Lores 320×240 capture + sparse LK ≤80 pts @30–60 Hz in | ~20–30% of one core | C++ OpenCV; Python loop overhead excluded — run flow in a native thread/process |
| De-rotation + complementary filter + 50 Hz TRIM publish | ~5–10% of one core | trivial math, but pin to 20 ms deadline |
| UART parse + CRC + watchdog + CSV log (§7) | ~5% | |
| TELEM 5 Hz + WiFi dashboard (pit link, §5/T3) | ~5–10% bursty | WiFi TX spikes; keep off the flow core |
| **Total** | **~50–70% of 2 cores; 2 cores largely idle** | leaves headroom for shock-retry + thermal throttle |

Honest limits:
- **50 Hz TRIM: GO** with the pipeline above, cores pinned (`flow` core isolated,
  `record/io` on another), flow in native code, Python only for orchestration.
- **100 Hz trusted vision solves: NO-GO on Zero 2W.** The sensor, exposure, and
  A53 budget do not support 10 ms de-rotated solves. 100 Hz TRIM *messages* are
  electrically possible (§2.3) but carry repeated/stale vision data — theater, not
  control. Fight config = 50 Hz TRIM, 20–30 Hz trusted flow, 1 kHz T1 governor.
- Thermal: Zero 2W throttles at ~80 °C. In-bot air is hot. Mandate a copper shim +
  vent slot in the TPU cradle + `vcgencmd get_throttled` in TELEM. Log throttle
  events; a throttled match still fights (T1 unaffected), it just trims worse.
- Memory: 512 MB is enough (two streams + LK <200 MB) only if no desktop, no YOLO,
  no browser on the Zero. Lite OS, no GUI, zram on, swap off (SD wear).

### 3.4 Trim law (v1 — tune ONE gain at a time per firmware/README §C)

```
err = desired_velocity - estimated_velocity   # from de-rotated flow (+ T3 @5 Hz when linked)
trim = Kp * err + Ki * ∫err (clamped, anti-windup) + Kd * d(err)/dt (filtered)
trim_x/trim_y saturate ±64; rpm_delta saturate ±500; T1 re-clamps to RPM cap.
```

Ship P=only, I=D=0. Log every run with `gain_id`. Change ONE gain per run (§7 logging).
Floor-dependent: wood cleats bite (higher Kp), steel skates (lower Kp + higher D filter).
Per-floor gain card, not one universal tune.

## 4. Hit-recovery behavior (T1 executes, T2 suggests)

Hits are detected by T1 (accel spike + RPM drop), not by vision. Vision is blind
for ~100–300 ms after a real hit (smear + dust + displacement). Roles:

**T1 (authoritative, works with Pi dead):**
- `HIT` if `acc_peak > HIT_G` (default 150 g, tune 100–250 g) OR `rpm` drops >20% within 100 ms.
- On HIT: mode → RECOVER, suspend translation (zero trim authority regardless of T2),
  hold heading, ramp back to pre-hit RPM over ~300 ms, then RELOCK (re-acquire heading
  over ~200 ms), then TRANSLATE. Total ~500 ms. Broadcast mode in STATE.
- Consecutive HITs within 1 s extend RECOVER (no oscillation into the wall).

**T2 (assist only):**
- On STATE mode==RECOVER: freeze trim integrator (anti-windup), set flow quality=0,
  mark log (`LOG_MARK`), keep publishing TRIM (holds last-good — T1 ignores authority
  anyway during RECOVER) so the watchdog never trips spuriously.
- `RECOVER_REQ` bit is a hint for soft events T1 cannot see (e.g. prolonged flow stall
  with no accel spike). T1 treats it as advisory and still applies its own thresholds.
- Post-RECOVER: T2 re-seeds LK features (old tracks are garbage after displacement),
  ramps trim authority over ~200 ms (no step).

Toilet-bowling (growing orbit after a hit) = integrator windup during RECOVER.
The freeze + re-seed + ramp trio is the fix. If it still bowls, cut Ki before touching Kp.

## 5. CRSF telemetry forwarding (Pocket gets data, Pi never touches RF)

Ownership: **Teensy owns the ELRS RF link.** Pi requests; Teensy decides what flies.

- T2 → T1 `TELEM` @5 Hz (§2.3). T1 forwards a subset as CRSF telemetry frames on
  Serial1 @420800: Battery (0x08: voltage/current/capacity), Attitude (0x1E: pitch/roll/yaw
  from heading — yaw only is honest), Flight Mode (0x21: ASCII `"RPM3200 M2"`-style status).
- T1 telemetry queue is lowest priority: STATE/TRIM @50 Hz and dShot @8 kHz never wait
  for CRSF. Telemetry drops under load (count drops, do not retry).
- What the Pocket shows: pack voltage (go/no-go per match), RPM (trim confidence),
  T2 link flag (via Flight Mode string `T2_OK`/`T2_LOST`), Pi temp/load on demand.
- What is NOT sent: video, flow vectors, full logs, T3 intents. CRSF telemetry is
  ~420 kbaud shared with control uplink — keep it to battery + status @5–10 Hz.
- Bench check (Gate D in match-ready audit): Pocket telemetry page shows voltage +
  RPM string while bot spins on blocks; yank Pi power → string flips to `T2_LOST`
  within 1 s while control + failsafe stay live.

## 6. Watchdog design (BOTH directions — timeouts, not vibes)

```
T1 ──STATE @50 Hz──▶ T2 ──TRIM @50 Hz──▶ T1
 │ self: T0 watches T1 │ self: systemd + hw │
 └──── T1 safe-spin ───┘ └── T2 link-lost ───┘
```

**T1 watches T2 (protects the arena):**
- Every TRIM: check CRC + SEQ advance + bounds (`trim` ±64, `rpm_delta` ±500). Violation →
  drop frame, increment `t2_bad`, keep last-good. No reply, no exception.
- Timeout: `now - last_valid_TRIM > 100 ms` → flag `T2_LINK_OK=0` in STATE (Pocket sees it).
- Hold: continue applying last-good trim for **≤500 ms** (per autonomy-plan §1).
- Expire: after 500 ms with no valid TRIM → mode SAFE_SPIN (hold RPM, zero translation),
  keep spinning (a melty that stops is a target), keep broadcasting STATE.
- Recover: first valid TRIM after expiry ramps authority over 200 ms (no step).
- T1 watchdog is in the 1 kHz loop (counter-based, not `millis()`-drift-based) so a
  wedged Pi serial flood cannot stall it: UART RX is interrupt + ring buffer, parse is
  bounded (≤2 frames/loop), never blocks.

**T2 watches T1 (protects the log + the tune):**
- Expect STATE every 20 ms. `now - last_STATE > 100 ms` → `LINK_LOST`: freeze trim
  integrator, mark log, set flow quality 0, keep publishing TRIM (T1 may still hear)
  but stop advancing strategy (T3 intents held).
- `> 1 s` with no STATE → assume T1 rebooting / UART severed: restart UART port once,
  keep recording video (post-mortem matters), set TELEM link flag. Never reset T1
  from Pi (no reset line wired — deliberate).
- T2 self-watchdog: `systemd` (`Restart=always`, `WatchdogSec=5 s`, `sd_notify`),
  plus a kernel hardware watchdog (`dtparam=watchdog=on`, 15 s) as last resort.
  A T2 reboot is a non-event for T1 (500 ms hold → SAFE_SPIN → resume).

**T0 watches T1 (existing failsafe, unchanged):**
RX-loss → STOP/brake <1 s, no re-arm until deliberate action; boot interlock
(never boots armed); brown-out → still failsafes. Filmed per firmware/README §D.

Timing summary: detect 100 ms → hold 500 ms → safe-spin. Numbers fit inside the
1 s RX-loss failsafe and the 1 s T3-expiry, so nested timeouts never race.

## 7. SD logging format + rotation (events fill cards — plan for it)

### 7.1 What is logged (control log + video, separate files, same match ID)

Control log: `/data/logs/match_<NNN>.csv`, 50 Hz, one row per STATE+TRIM pair:

```csv
t_ms,seq_t1,seq_t2,rpm,heading_ddeg,acc_peak_g,batt_mv,temp_mcu,mode,flags,trim_x,trim_y,rpm_delta,gain_id,flow_q,pi_temp,pi_load
12340,201,198,3200,450,38,14820,52,2,0x03,12,-8,0,0xA3,78,61,42
```

- Header row + `gain_id` on every row (one-gain-at-a-time traceability, firmware/README §C).
- `fsync` every 1 s (not every row — SD stall would break the 50 Hz deadline).
- Video: `/data/video/match_<NNN>.mp4` (1080p30 H264 from main stream, §3.2).
- A `match_<NNN>.json` sidecar: gain file hash, floor type, tire type, mass config,
  T3 link y/n, outcome notes. This is what makes logs comparable across events.

Data rate: CSV ~110 B/row × 50 Hz ≈ 5.5 kB/s ≈ **~1 MB per 3-min match** (trivial).
Video ~10 Mbps ≈ **~225 MB per 3-min match** (this is what fills the card).

### 7.2 Rotation (the part that matters at events)

- Pre-match free-space gate: if `/data` free <500 MB, refuse to arm T2 assist
  (dashboard shows `SD_LOW`; T1 fights manual-trim — never block a fight on logging).
- Circular retention: keep newest 20 control logs (unbounded count, tiny files) but
  newest **~4 matches of video only** (oldest `.mp4` deleted first when free <500 MB).
  Never delete the current match. `sync` before delete.
- Card: endurance-rated microSD (High-Endurance/Max-Endurance, not generic Ultra),
  64–128 GB, ext4 on `/data` (no FAT 4 GB split surprises), separate from rootfs so
  a full card cannot wedge boot. Read-only rootfs + `/data` rw preferred.
- Power-loss safety: journaled ext4 + 1 s fsync cadence = worst loss 1 s of CSV +
  last GOP of video. Pulling the link mid-write must not eat prior matches.
- Post-event: `tools/pi_pull.sh <match>` copies CSV+MP4+JSON over WiFi/`scp`; verify
  sizes before deleting from card. Pit dashboard (§5/T3) shows free space live.

## 8. Brown-out behavior (Pi dies → T1 unaffected — by construction)

This is already a repo rule (`firmware/README.md` §D + `build-guide/02`):
*Pi brown-out = MCU must still failsafe to stop.* T2 complies by being removable:

1. Separate power domains: BEC feeds Pi only; Teensy/ESC/RX feed from the flight pack
   through the link. No USB power between them in-bot. Severing any Pi wire (power,
   TX, RX, GND) leaves T1/RX/ESC timing untouched — bench-test each cut once, film the
   brown-out cut (yank Pi power) as part of the failsafe video.
2. No shared clocks, no blocking calls: T1 UART RX is interrupt-driven with timeout;
   a dead Pi looks identical to a quiet Pi (timeout → hold → safe-spin, §6).
3. Boot order independence: T1 boots armed-safe with or without Pi present
   (boot interlock). Pi boots after (systemd waits for `/dev/serial0`), joins the
   50 Hz loop mid-stream via SEQ resync. Either can reboot mid-match without
   resetting the other (no reset line, §6).
4. BEC sizing (§9) keeps Pi alive through weapon-induced sag; the 4700 µF bulk cap
   rides through link-bounce. If the BEC itself shorts, its input fuse/link opens
   the Pi branch without opening the drive branch (fuse the BEC tap separately).

## 9. Weight + power budget (grams + mA — Branch E margin check)

P1-mass-audit Branch E leaves **~1000–1250 g built + ~50 g margin** for Pi+BEC
before the 1310 g build target (1361 g cap). BOM §2 supervisor row budgets **~40 g**.
Both are met by this table — weigh YOUR stack, do not copy mine:

| Item | Mass (g) | Current @5 V | Notes |
|---|---|---|---|
| Pi Zero 2W (bare, no headers) | 15–16 | 150 idle / 400–600 load | headers add ~2 g — solder or use pogo, not headers |
| Pi Cam v3 Wide + 200 mm flex | 4–6 | 150–250 when streaming | Wide, not NoIR (arena lighting is visible-band) |
| BEC 5 V/3 A (e.g. small switching) | 8–12 | — (source) | isolate on TPU; add input fuse |
| TPU standoffs + cradle pocket + nylon M3 + wire + cap share | 6–10 | — | cap counted in electronics bay |
| **T2 total** | **35–44** | **~500 typ / ~900 peak** | **inside BOM ~40 g + Branch E ~50 g** |

Power from the flight pack (2× 4S 550 mAh parallel = 1100 mAh @14.8 V):
- BEC in at 14.8 V for 5 V/0.5 A out @~90% eff ≈ **~190 mA** from the pack typical,
  ~340 mA peak. Per 3-min match: **~10–17 mAh** — <2% of pack. T2 does not size the battery.
- BEC 3 A rating is headroom for WiFi-TX bursts + cold-start inrush, not nominal draw.
  Do NOT share this BEC with LEDs/servos; T2 gets its own clean rail.
- Scale rule: if YOUR stack weighs >45 g, Ti-relief comes from the weapon band first
  (materials-guide §3: 437→246 g saves ~190 g), never by deleting the failsafe cap
  or the UART GND return.

## 10. Bringup order (do not skip)

1. Bench, no weapon: BEC → Pi boots Lite OS, `serial0` loopback @115200 clean for 10 min.
2. Teensy ↔ Pi loopback: PING round-trip, then STATE @50 Hz with CRC error counter = 0
   for 10 min on the bench (shake the harness — errors must stay 0).
3. Spin on blocks: T1 governor alone (Pi TX unplugged) holds RPM; plug Pi → TRIM moves
   `trim_x/trim_y` ±few counts on hand-push; unplug Pi mid-spin → SAFE_SPIN after 500 ms.
4. Brown-out film: yank Pi power mid-spin → T1 holds 500 ms → safe-spin; TX-off → stop <1 s.
5. Track test: P-only, one gain, log + video; change ONE gain, repeat. Fill the sidecar JSON.
6. Event: free-space gate + rotation check before every match; `pi_pull.sh` after.

## 11. Failure modes (what we accept)

| Failure | Effect | Mitigation |
|---|---|---|
| Pi SD corrupts mid-event | T2 dead, T1 safe-spins | endurance card + ext4 `/data` + T1 independent (§6/§8) |
| Camera blinded (dust/flash) | flow quality → 0, trim holds | quality gate (§3.2), never invent motion |
| 100 Hz demanded by checklist | stale-data theater + IRQ load | fight at 50 Hz; 100 Hz bench-only (§2.3/§3.3) |
| WiFi congested at venue | T3 intents expire, dashboard lags | T2 continues alone; T3 TTL 1 s (autonomy plan §1) |
| Overweight (>45 g T2 stack) | eats Branch E margin | Ti weapon relief, not cap deletion (§9) |

Out of scope (autonomy plan §6): no custom PCB this round, no motor/ESC changes,
no CAD re-model of the ring body, no cloud-vendor lock-in.

## 12. Doc map (where this spec plugs in)

- Autonomy: `audit/autonomy-plan-2026-09-18.md` §1 T2 row (this file = the T2 build-to).
- Bench: `firmware/README.md` §B (accel/batt wiring) → §C (one-gain logging) → §D (failsafe film) → §E (pit/cloud advisory).
- Tune: `build-guide/03-testing-and-driving.md` ladder T0→T4 + hit-recovery blip test.
- Mass: `BOM.md` §2 supervisor row (~40 g) + `manufacturing/P1-mass-audit.md` Branch E (~50 g margin) + `manufacturing/materials-guide.md` §3 Ti relief.
- Safety: `build-guide/02-electronics-setup.md` (FHSS owns the link, Pi brown-out rule).
