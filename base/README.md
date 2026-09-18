# Pit base station (T3) — the plastic tote that makes autonomy usable

One laptop runs the whole pit side: overhead-cam tracking, the telemetry
dashboard, and the cloud bridge. The bot still flies itself on the Teensy
governor (T0/T1) + onboard Pi (T2) — **this base never drives**. Link loss,
an expired TTL, or the Pocket kill switch always drops the bot back to a
safe spin. Full-auto (T5) additionally needs TRC pre-clear per SPARC §6.4.3.

```
./setup.sh        # ONE command: deps -> pull -> camera check -> link self-test
./setup.sh --up   # same, then start the stack
```

## 1. Hardware tote (pack this)

| Item | Spec floor | Why / notes |
|---|---|---|
| Laptop | Ubuntu 22.04+, 4 cores, 8 GB RAM, 1× USB3-A, Docker Engine 24+ with Compose v2 | Runs all 3 services. Windows/macOS works for the manual path only — Docker path is tested on Ubuntu. |
| USB overhead camera | 1080p30 UVC (e.g. Logitech C920-class), manual focus, ≥60° FOV | Mounted above the arena looking straight down. Autofocus OFF (hunts mid-match). |
| Tripod / light stand | Holds the cam 2–3 m overhead, rigid (no wobble = no pose jitter) | Clamp + phone-style tripod thread is enough; sandbag the legs. |
| Travel router | Any GL.iNet-class 5 GHz AP, default 192.168.8.1 | Pit WiFi for laptop ↔ Pi telemetry. Override: `PIT_ROUTER=10.0.0.1 ./setup.sh`. |
| RadioMaster Pocket ELRS | Bound to the EP1/RP1 in the bot (see `radio/`) | **Safety link + kill switch**, stays in your hands even in full-auto. |
| Cables | USB3 extension (active if >3 m), laptop charger | The camera cable is the #1 pit failure — bring a spare. |

## 2. Services & ports

| Service | Image (pinned) | Host port | Job |
|---|---|---|---|
| `tracker` | `python:3.11.9-slim-bookworm` | `127.0.0.1:5001` | YOLOv8 overhead track, both bots @ ~5 Hz, pixels→arena via calibration |
| `dashboard` | `node:22.12.0-alpine` (matches repo `.nvmrc` / `render.yaml`) | `127.0.0.1:8080` | RPM / G / batt / temp display + 4-corner calibrate UI |
| `cloud-bridge` | `python:3.11.9-slim-bookworm` | `127.0.0.1:5002` | Batches frames+hints, survives drops, TTL-enforced, human-gated |

All three: `restart: unless-stopped` (survive crashes/reboots, stay down on
`docker compose down`) and `json-file` log rotation (`max-size: 10m`,
`max-file: 5`) so a weekend event can't fill the disk. No secrets in any file:
the bridge reads `${OPENAI_API_KEY:-}` from the environment only (copy
`.env.example` to `.env` if you use hosted hints; empty = local-only).

This compose stack is the **pit base**, not the website: `render.yaml` deploys
`web/` to Render as a static site and is untouched by anything here.

## 3. Event-day flow

1. Tote → table. Tripod up, camera overhead, travel router on, laptop on pit WiFi.
2. `./setup.sh` → expect `>>> GO`. Fix every `[FAIL]` (script tells you how).
3. `./setup.sh --up` → open http://localhost:8080.
4. **Calibrate (once per event, after the tripod is fixed):** in the dashboard,
   click the 4 arena corners on the canvas (TL → TR → BR → BL) → Save. The
   tracker stores `data/calibrate.json` (example in `data/calibrate.json.example`;
   measure YOUR arena — the 2400 mm example is a placeholder). Re-do if the
   tripod is bumped.
5. Confirm the badge reads **LIVE** (YOLO + camera) not SIM/STALE, then fly.
   Between matches: push gains from the dashboard, check batt/temp, re-weigh.

### What the tracker publishes

`GET http://localhost:5001/pose` → `{t, ttl_s: 1.0, self:{x_mm,y_mm},
opponent:{x_mm,y_mm}, source}`. T2 fuses this with onboard optical flow and
**drops any pose older than `ttl_s`** — a frozen laptop can never steer the bot.

### What the bridge guarantees

Hints expire in ≤5 s, intents in 1 s; drops become `queued` locally and sync
later (`data/bridge-log.jsonl`, 10 MB rotation). Human-gated until TRC clears
autonomy — the driver approves every hint.

## 4. No-Docker manual fallback (laptops that can't run Docker)

```bash
cd base
pip install -r requirements-manual.txt   # numpy==1.26.4, opencv-python==4.10.0.84, ultralytics==8.2.103
# terminal 1 — tracker
cd tracker && python3 tracker.py
# terminal 2 — dashboard (needs Node 22, see ../.nvmrc)
cd ../dashboard && node server.js
# terminal 3 — bridge
cd ../bridge && python3 bridge.py
```

Same ports (5001/5002/8080), same calibration file (`base/data/calibrate.json`).
Without a camera the tracker runs replay mode (dashboard shows **SIM**) — fine
for learning the UI at home, never for a match.

## 5. Troubleshooting

- `no /dev/video0` → reseat USB, try a USB3 port, `v4l2-ctl --list-devices`.
  USB2 ports brown out 1080p30 cams.
- `fps < 15` → another app holds the cam, or the active extension needs power.
- Dashboard `SIM` forever → tracker has no cam/model; check `docker logs eyeliner-tracker`.
- Dashboard `STALE` → poses older than 1 s; laptop overloaded or camera frozen.
- `tracker unreachable` on :8080 → `docker compose ps`; tracker must be
  `healthy` before the dashboard starts (that's the `depends_on` gate).
- Bridge `upstream: queued` → venue WiFi down; hints still log locally. Normal.
- Expose to the pit LAN (coach's tablet): change the `ports:` entries to
  `"0.0.0.0:8080:8080"` — only on the trusted travel-router network, never on
  venue WiFi.

## Out of scope (per autonomy plan §6)

No custom PCB, no motor/ESC changes, no CAD re-modeling, no cloud-vendor
lock-in (the bridge adapter fits any OpenAI/Anthropic-class VLM).
