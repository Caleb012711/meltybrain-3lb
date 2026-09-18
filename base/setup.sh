#!/usr/bin/env bash
# Eyeliner pit base station — ONE-command setup + self-test with GO/NO-GO.
#
# Usage:
#   ./setup.sh           deps check, image pull, camera check, link self-test
#   ./setup.sh --up      same, then start the stack (docker compose up -d)
#   ./setup.sh --help    this help
#
# Env overrides:
#   PIT_ROUTER=192.168.8.1   travel-router address to ping (default: GL.iNet default)
#   CAMERA_INDEX=0           /dev/videoN index to probe (default: 0)
#
# Exit code: 0 = GO (no FAILs; SKIP = manual check listed), 1 = NO-GO.
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="$BASE_DIR/docker-compose.yml"
ROUTER="${PIT_ROUTER:-192.168.8.1}"
CAM_INDEX="${CAMERA_INDEX:-0}"
DO_UP=0

PASS=0; FAIL=0; SKIP=0

say()  { printf '%s\n' "$*"; }
pass() { PASS=$((PASS+1)); say "  [PASS] $*"; }
fail() { FAIL=$((FAIL+1)); say "  [FAIL] $*"; }
skip() { SKIP=$((SKIP+1)); say "  [SKIP] $*"; }

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
}

for arg in "$@"; do
  case "$arg" in
    --up) DO_UP=1 ;;
    --help|-h) usage; exit 0 ;;
    *) say "unknown flag: $arg"; usage; exit 1 ;;
  esac
done

say "=== Eyeliner pit base self-test ==="
say "base dir: $BASE_DIR"

# ---- 1. host deps -----------------------------------------------------------
say "--- 1/4 host dependencies ---"
if command -v docker >/dev/null 2>&1; then
  pass "docker: $(docker --version)"
else
  fail "docker not found — install: https://docs.docker.com/engine/install/ubuntu/"
fi
if docker compose version >/dev/null 2>&1; then
  pass "compose v2: $(docker compose version --short 2>/dev/null || docker compose version)"
else
  fail "docker compose v2 not found (need Docker Desktop or docker-compose-plugin)"
fi
if command -v python3 >/dev/null 2>&1; then
  pass "python3: $(python3 --version 2>&1)"
else
  fail "python3 not found"
fi
if command -v node >/dev/null 2>&1; then
  pass "node: $(node --version) (manual fallback only; containers don't need it)"
else
  skip "node not on host — fine for Docker path (need Node 22 only for manual fallback)"
fi

# Optional pit helpers: install on apt systems, otherwise note and continue.
MISSING_PKGS=""
for pkg in v4l-utils usbutils ffmpeg iputils-ping; do
  cmd="$(echo "$pkg" | sed 's/v4l-utils/v4l2-ctl/; s/usbutils/lsusb/; s/iputils-ping/ping/')"
  command -v "$cmd" >/dev/null 2>&1 || MISSING_PKGS="$MISSING_PKGS $pkg"
done
if [ -z "$MISSING_PKGS" ]; then
  pass "pit helpers present (v4l2-ctl, lsusb, ffmpeg, ping)"
elif command -v apt-get >/dev/null 2>&1; then
  say "  installing missing helpers:$MISSING_PKGS (sudo apt-get)"
  if sudo apt-get update && sudo apt-get install -y $MISSING_PKGS; then
    pass "installed:$MISSING_PKGS"
  else
    skip "apt install failed — continuing without:$MISSING_PKGS"
  fi
else
  skip "missing helpers:$MISSING_PKGS (no apt-get; install for your OS and re-run)"
fi

# ---- 2. containers ----------------------------------------------------------
say "--- 2/4 containers ---"
if [ ! -f "$COMPOSE" ]; then
  fail "missing $COMPOSE"
else
  if docker compose -f "$COMPOSE" config > /dev/null; then
    pass "compose file valid: $COMPOSE"
  else
    fail "compose file invalid (run: docker compose -f $COMPOSE config)"
  fi
  if docker compose -f "$COMPOSE" pull; then
    pass "images pulled (pinned: python:3.11.9-slim-bookworm, node:22.12.0-alpine)"
  else
    fail "image pull failed — check network / Docker Hub access"
  fi
fi

# ---- 3. camera --------------------------------------------------------------
say "--- 3/4 overhead camera (index $CAM_INDEX) ---"
if ls "/dev/video${CAM_INDEX}" >/dev/null 2>&1; then
  pass "device present: /dev/video${CAM_INDEX}"
else
  fail "no /dev/video${CAM_INDEX} — plug in the USB overhead cam, check tripod cable"
fi
if command -v v4l2-ctl >/dev/null 2>&1; then
  if v4l2-ctl --list-devices 2>/dev/null | grep -q "video"; then
    pass "v4l2 sees video devices:"; v4l2-ctl --list-devices 2>/dev/null | sed 's/^/    /'
  else
    skip "v4l2-ctl lists no video devices"
  fi
else
  skip "v4l2-ctl absent — device-node check above is the gate"
fi
if command -v lsusb >/dev/null 2>&1; then
  say "  usb:"; lsusb 2>/dev/null | grep -i -E "cam|video|logi|sonix|aveo" | sed 's/^/    /' || say "    (no UVC string matched — unplug/replug if the cam is new)"
fi
if python3 -c "import cv2" >/dev/null 2>&1; then
  FPS="$(python3 - "$CAM_INDEX" <<'EOF'
import sys, time
import cv2
idx = int(sys.argv[1])
cap = cv2.VideoCapture(idx)
if not cap.isOpened():
    print("NOCAM"); raise SystemExit
t0, n = time.monotonic(), 0
for _ in range(30):
    ok, _ = cap.read()
    if not ok: break
    n += 1
dt = time.monotonic() - t0
print(f"{(n / dt):.1f}" if dt > 0 and n else "NOCAM")
cap.release()
EOF
)"
  if [ "$FPS" = "NOCAM" ]; then
    fail "opencv cannot open camera $CAM_INDEX"
  else
    say "  measured camera fps: $FPS"
    if python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) >= 15 else 1)" "$FPS"; then
      pass "camera fps $FPS >= 15 floor"
    else
      fail "camera fps $FPS < 15 — fix focus/exposure, try another USB3 port"
    fi
  fi
else
  skip "opencv not on host — camera fps probe runs inside tracker container after --up (pip install -r requirements-manual.txt for the manual path)"
fi

# ---- 4. link self-test ------------------------------------------------------
say "--- 4/4 link self-test (router $ROUTER + Pocket) ---"
if command -v ping >/dev/null 2>&1; then
  if ping -c 4 "$ROUTER" >/tmp/eyeliner-ping.log 2>&1; then
    pass "pit wifi: $ROUTER reachable:"; tail -n 2 /tmp/eyeliner-ping.log | sed 's/^/    /'
  else
    fail "pit wifi: no ping to $ROUTER — join the travel-router SSID first"
  fi
else
  skip "ping absent — join the travel-router SSID and check the dashboard :8080 by hand"
fi
if ls /dev/ttyUSB* /dev/ttyACM* >/dev/null 2>&1; then
  say "  serial:"; ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | sed 's/^/    /'
  skip "Pocket USB-serial present — confirm ELRS RSSI/telemetry on the Pocket screen by hand (no automated CRSF parse; the radio is the safety link, not this script)"
else
  skip "no /dev/ttyUSB* or /dev/ttyACM* — Pocket not USB-tethered (normal at the pit). Confirm bind + kill-switch on the radio itself before powering the bot"
fi

# ---- verdict ----------------------------------------------------------------
say "=== result: PASS=$PASS FAIL=$FAIL SKIP=$SKIP ==="
if [ "$FAIL" -gt 0 ]; then
  say ">>> NO-GO — fix every [FAIL] above, then re-run ./setup.sh"
  exit 1
fi
say ">>> GO — base station ready (SKIPs are manual confirmations listed above)"
if [ "$DO_UP" -eq 1 ]; then
  say "starting stack..."
  docker compose -f "$COMPOSE" up -d --remove-orphans
  docker compose -f "$COMPOSE" ps
  say "dashboard: http://localhost:8080   tracker: http://localhost:5001/health   bridge: http://localhost:5002/health"
fi
