# Gauntlet agent 3/10 — Pit base station (T3) — FULL REPORT

Spec: `audit/autonomy-plan-2026-09-18.md` §2 (+ §1 tiers/TTLs, §5 skills, §6 out-of-scope).
Related: `firmware/README.md` §E (pit/cloud advisory-only), `render.yaml` (site deploy
pattern reference only — base is a separate pit-laptop stack, Render untouched).

## 0. Skills

Requested: `docker-ros2-development`, `robot-bringup`, `ros2-web-integration` (+ §5
robotics list). The `skill` tool in this environment exposes exactly one skill —
`customize-opencode` (opencode-config only, not applicable) — so **no robotics skills
were loadable**. I worked to their intent instead: container patterns (pinned images,
restart, log rotation, health-gated `depends_on`) for docker-ros2-development;
boot order + watchdogs + log rotation for robot-bringup; plain HTTP/WS dashboard +
TTL bridge (no ROS forced onto the MCU, per §5) for ros2-web-integration.

## 1. Prior state

`base/` existed but was **empty**; `autonomy/`, `radio/` also empty (sibling agents'
scope — not touched). `BOM.md` shows a pre-existing modification and
`PIT-CHECKLIST.md` / `autonomy/` / `radio/` / `manufacturing/blades/` are other
agents' in-flight work; I touched none of it. `web/` untouched (`git status web/` clean).

## 2. Files written (all under `base/`, 12 files)

| File | What |
|---|---|
| `base/setup.sh` (+x) | ONE command: deps → `compose pull` → camera check → link self-test → GO/NO-GO, exit 0/1. `--up` starts the stack. Env: `PIT_ROUTER` (default 192.168.8.1), `CAMERA_INDEX` (default 0) |
| `base/docker-compose.yml` | `tracker` :5001, `dashboard` :8080, `cloud-bridge` :5002 — all on `127.0.0.1`, one `pit` bridge net |
| `base/README.md` | Tote list w/ laptop spec floor, 4-corner calibrate, manual fallback, troubleshooting, out-of-scope |
| `base/tracker/tracker.py` + `requirements.txt` | YOLOv8 pose pub @~5 Hz, `/health /pose /calibrate`, replay fallback with SIM flag |
| `base/dashboard/server.js` + `package.json` + `index.html` | Stdlib-only Node proxy + UI (RPM/G/batt/temp, arena canvas, 4-corner click→Save) |
| `base/bridge/bridge.py` + `requirements.txt` (stdlib-only) | Hints TTL ≤5 s, JSONL log w/ 10 MB rotation, upstream best-effort, key never logged |
| `base/data/calibrate.json.example` | 4 image points + arena corners (2400 mm placeholder — measure yours) |
| `base/.env.example` | `OPENAI_API_KEY=` placeholder (real `.env` stays gitignored) |
| `base/requirements-manual.txt` | No-Docker pins (all verified on PyPI 2026-09-18) |

## 3. Key decisions (with reasons)

1. **Pinned images `python:3.11.9-slim-bookworm` + `node:22.12.0-alpine`** — both
   `docker manifest inspect`-verified; node matches repo `.nvmrc`/`render.yaml`
   (22.12.0). No `:latest` anywhere. Python pins: `numpy==1.26.4`,
   `opencv-python==4.10.0.84`, `ultralytics==8.2.103` — all confirmed in `pip index versions`.
2. **Compose v2 syntax only** (`docker compose …`, no top-level `version:`),
   `restart: unless-stopped` ×3, `json-file` logging `max-size: 10m / max-file: 5` ×3,
   healthchecks on all three, dashboard `depends_on: tracker (service_healthy)`,
   bridge `service_started` (bridge must survive a camera outage).
3. **Loopback-bound ports** (`127.0.0.1:8080/5001/5002`, clear of web's 5173/4173);
   LAN exposure is an explicit opt-in documented with a venue-WiFi warning.
4. **No secrets in files** — bridge reads `${OPENAI_API_KEY:-}`; `.env.example`
   is re-included by the existing `!.env.example` gitignore rule (verified).
5. **Honest self-test, no fake PASSes** — ELRS RSSI is a SKIP with manual Pocket-screen
   steps (no automated CRSF parse exists on a laptop); camera FPS floor 15 (1080p30
   typical); `ping -c 4` only (no OS-specific flags); missing `ping`/`v4l2-ctl` →
   SKIP or apt-install, never FAIL on tooling absence. Exit 1 on any FAIL.
6. **`devices: /dev/video0` kept in compose** (real requirement) with `setup.sh` as the
   gate; `compose config` validates without hardware. Tracker degrades to replay/SIM
   rather than crashing when the model/camera is absent.
7. **TTLs per plan §1**: pose `ttl_s=1.0`, hints clamped to ≤5 s and pruned; bridge
   adapter fits any VLM (no lock-in, §6). Dashboard never drives; kill-switch primacy
   stated in UI + README.

## 4. Verification log (all executed, all real)

- `bash -n setup.sh`, `py_compile` tracker+bridge, `node --check server.js`,
  calibrate-example JSON parse, `docker compose config > /dev/null` — **all OK**.
- `--help` bug found by running it (usage leaked line 14) — **fixed, re-verified**.
- Full `./base/setup.sh` in this container: apt path installed
  `v4l-utils usbutils ffmpeg iputils-ping`, both images pulled, then honest
  **NO-GO, exit 1** (`no /dev/video0`, no ping to 192.168.8.1) with 7 PASS / 3 SKIP —
  the script behaves exactly as specified where hardware is absent.
- Service smoke tests (host): tracker `/health /pose`, calibrate 4-pt accept /
  3-pt reject, bridge hint accept → live → **expired after TTL** → dropped, empty-text
  reject, dashboard `/health /api/pose /` + calibrate proxy — **all OK**.
- Container tests (pinned images): all three run; the **exact healthcheck commands
  from the YAML pass via `docker exec`**; host-networked run proved the dashboard→
  tracker proxy chain end-to-end (`TRACKER_URL=http://127.0.0.1:5001`).
- Sandbox limitation noted: this dev container blocks user-bridge DNS
  (`127.0.0.11` unreachable), so compose-DNS was validated by config + host-network
  run, not by inter-container name resolution here. On a real pit laptop (normal
  Docker bridge) `http://tracker:5001` resolves.

## 5. Verdict: GO (with residual risks)

| Pillar | Verdict |
|---|---|
| One-command setup + GO/NO-GO | **GO** — ran end-to-end, correct GO and NO-GO paths |
| Compose (pinned, restart, rotation, health) | **GO** — validated + container-executed |
| Tote list / calibrate / manual fallback | **GO** — README covers all §2 bullets |
| No secrets, sane ports, web/ untouched | **GO** — verified via git status + grep-equivalent review |

**Residual risks:** (1) No physical camera/Pocket/router tested — first GO must happen
on the real tote; (2) YOLO `yolov8n.pt` downloads on first run — pre-pull on venue WiFi
before the event or vendor the weights; (3) arena size in the example (2400 mm) is a
placeholder — must be measured per event; (4) telemetry RPM/G/batt/temp is manual-entry
until the T2 Pi link lands (sibling scope); T5 stays behind flag + TRC pre-clear.
Out of scope per §6: no PCB/motor/ESC/CAD changes, no vendor lock-in.
