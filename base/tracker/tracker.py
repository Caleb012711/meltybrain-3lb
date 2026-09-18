"""Eyeliner pit tracker (T3) — overhead-cam pose publisher at ~5 Hz.

Reads the USB overhead camera, detects both bots (YOLOv8 when installed,
synthetic replay when the camera/model is absent so the dashboard and bridge
still work on a laptop with no hardware), maps pixels -> arena millimetres via
the 4-corner calibration in /data/calibrate.json, and serves:

  GET /health     {"status":"ok", ...}
  GET /pose       latest pose, carries ttl_s=1.0 (T2 must drop it after 1 s)
  GET /calibrate  current calibration (or 404 when uncalibrated)
  POST /calibrate {"image_points":[[x,y]x4]} -> saves + reloads homography

Stdlib only except optional cv2 / ultralytics (guarded imports).
Env: CAMERA_INDEX (default 0), POSE_RATE_HZ (default 5),
     CALIBRATE_PATH (default /data/calibrate.json), PORT (default 5001).
"""
import json
import math
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import cv2  # opencv-python, see ../requirements-manual.txt
except Exception:  # pragma: no cover - optional
    cv2 = None

try:
    from ultralytics import YOLO  # ultralytics, optional
except Exception:  # pragma: no cover - optional
    YOLO = None

PORT = int(os.environ.get("PORT", "5001"))
CAMERA_INDEX = int(os.environ.get("CAMERA_INDEX", "0"))
POSE_RATE_HZ = float(os.environ.get("POSE_RATE_HZ", "5"))
CALIBRATE_PATH = os.environ.get("CALIBRATE_PATH", "/data/calibrate.json")
POSE_TTL_S = 1.0  # T2/T1 rule: intents from T3 expire 1 s after timestamp

_state_lock = threading.Lock()
_state = {
    "t": 0.0,
    "source": "replay",   # "yolo" or "replay"
    "calibrated": False,
    "camera_ok": False,
    "fps": 0.0,
    "self": {"x_mm": 0.0, "y_mm": 0.0},
    "opponent": {"x_mm": 0.0, "y_mm": 0.0},
}
_H = None  # 3x3 homography pixels -> mm, or None
_calib = None


def load_calibration():
    """Load 4-corner calibration; returns True when a valid homography exists."""
    global _H, _calib
    try:
        with open(CALIBRATE_PATH, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        img = data["image_points"]
        arena = data["arena_corners_mm"]
        if len(img) != 4 or len(arena) != 4:
            raise ValueError("need exactly 4 image_points + 4 arena_corners_mm")
        if cv2 is not None:
            import numpy as np

            src = np.asarray(img, dtype=np.float32)
            dst = np.asarray(arena, dtype=np.float32)
            _H = cv2.getPerspectiveTransform(src, dst)
        else:
            _H = None  # no cv2: poses stay in pixel units, flagged uncalibrated-math
        _calib = data
        with _state_lock:
            _state["calibrated"] = True
        return True
    except FileNotFoundError:
        with _state_lock:
            _state["calibrated"] = False
        return False
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"[tracker] bad calibration file {CALIBRATE_PATH}: {exc}", flush=True)
        with _state_lock:
            _state["calibrated"] = False
        return False


def apply_h(px, py):
    """Map one pixel point to arena mm. Falls back to raw pixels if no homography."""
    if _H is None or cv2 is None:
        return float(px), float(py)
    import numpy as np

    pt = np.array([[[float(px), float(py)]]], dtype=np.float32)
    out = cv2.perspectiveTransform(pt, _H)
    return float(out[0][0][0]), float(out[0][0][1])


def open_camera():
    if cv2 is None:
        return None
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        cap.release()
        return None
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    return cap


def measure_fps(cap, n=30):
    if cap is None:
        return 0.0
    t0 = time.monotonic()
    got = 0
    for _ in range(n):
        ok, _ = cap.read()
        if not ok:
            break
        got += 1
    dt = time.monotonic() - t0
    return (got / dt) if dt > 0 and got else 0.0


def track_loop():
    period = 1.0 / max(POSE_RATE_HZ, 0.5)
    cap = open_camera()
    model = None
    if cap is not None:
        with _state_lock:
            _state["camera_ok"] = True
            _state["fps"] = measure_fps(cap)
        if YOLO is not None:
            try:
                model = YOLO("yolov8n.pt")  # downloads on first run, cached after
            except Exception as exc:  # model fetch failed (offline pit) -> replay
                print(f"[tracker] YOLO load failed, replay mode: {exc}", flush=True)
                model = None
    else:
        print("[tracker] no camera — replay mode (dashboard shows SIM badge)", flush=True)

    t_start = time.monotonic()
    while True:
        now = time.time()
        if cap is not None and model is not None:
            ok, frame = cap.read()
            if ok:
                try:
                    res = model.predict(frame, verbose=False)[0]
                    pts = res.boxes.xyxy.cpu().numpy() if res.boxes is not None else []
                except Exception:
                    pts = []
                if len(pts) >= 2:
                    # largest two boxes = the two bots; first = self (green LED end
                    # disambiguation happens in T2 fusion, not here)
                    boxes = sorted(pts, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]),
                                   reverse=True)[:2]
                    s = ((boxes[0][0] + boxes[0][2]) / 2, (boxes[0][1] + boxes[0][3]) / 2)
                    o = ((boxes[1][0] + boxes[1][2]) / 2, (boxes[1][1] + boxes[1][3]) / 2)
                    sx, sy = apply_h(*s)
                    ox, oy = apply_h(*o)
                    with _state_lock:
                        _state.update({"t": now, "source": "yolo",
                                       "self": {"x_mm": sx, "y_mm": sy},
                                       "opponent": {"x_mm": ox, "y_mm": oy}})
                else:
                    with _state_lock:
                        _state["t"] = now  # frame live, no pair detected this tick
            else:
                with _state_lock:
                    _state["t"] = now
        else:
            # Replay: two synthetic blobs circling so dashboard/bridge stay live.
            t = time.monotonic() - t_start
            sx, sy = apply_h(320 + 100 * math.cos(t * 0.9), 180 + 80 * math.sin(t * 0.9))
            ox, oy = apply_h(320 + 110 * math.cos(t * 0.7 + 2.4), 180 + 90 * math.sin(t * 0.7 + 2.4))
            with _state_lock:
                _state.update({"t": now, "source": "replay",
                               "self": {"x_mm": sx, "y_mm": sy},
                               "opponent": {"x_mm": ox, "y_mm": oy}})
        time.sleep(period)


class Handler(BaseHTTPRequestHandler):
    server_version = "eyeliner-tracker/1.0"

    def _send(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            with _state_lock:
                snap = dict(_state)
            self._send(200, {"status": "ok", "service": "tracker",
                             "camera": snap["camera_ok"], "fps": round(snap["fps"], 1),
                             "calibrated": snap["calibrated"],
                             "source": snap["source"], "pose_hz": POSE_RATE_HZ})
        elif self.path == "/pose":
            with _state_lock:
                snap = dict(_state)
            self._send(200, {"t": snap["t"], "ttl_s": POSE_TTL_S,
                             "source": snap["source"], "stale": snap["source"] != "yolo",
                             "self": snap["self"], "opponent": snap["opponent"]})
        elif self.path == "/calibrate":
            if _calib is None:
                self._send(404, {"error": "uncalibrated — POST 4 image_points first"})
            else:
                self._send(200, _calib)
        elif self.path == "/":
            self._send(200, {"service": "eyeliner-tracker",
                             "endpoints": ["GET /health", "GET /pose",
                                           "GET /calibrate", "POST /calibrate"]})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/calibrate":
            self._send(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 65536:
            self._send(400, {"error": "send JSON {image_points:[[x,y]x4]}"})
            return
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send(400, {"error": "invalid JSON"})
            return
        pts = data.get("image_points")
        if (not isinstance(pts, list) or len(pts) != 4
                or any(len(p) != 2 for p in pts)):
            self._send(400, {"error": "image_points must be exactly 4 [x,y] pairs"})
            return
        arena_w = float(data.get("arena_width_mm", 2400))
        arena_h = float(data.get("arena_height_mm", 2400))
        doc = {"image_points": [[float(x), float(y)] for x, y in pts],
               "arena_mm": {"width": arena_w, "height": arena_h},
               "arena_corners_mm": [[0, 0], [arena_w, 0],
                                    [arena_w, arena_h], [0, arena_h]]}
        try:
            os.makedirs(os.path.dirname(CALIBRATE_PATH) or ".", exist_ok=True)
            with open(CALIBRATE_PATH, "w", encoding="utf-8") as fh:
                json.dump(doc, fh, indent=2)
        except OSError as exc:
            self._send(500, {"error": f"cannot write {CALIBRATE_PATH}: {exc}"})
            return
        load_calibration()
        self._send(200, {"saved": CALIBRATE_PATH, "calibrated": True})

    def log_message(self, fmt, *args):  # quieter logs (json-file rotation caps size)
        pass


if __name__ == "__main__":
    load_calibration()
    threading.Thread(target=track_loop, daemon=True).start()
    print(f"[tracker] serving on :{PORT} @~{POSE_RATE_HZ:g}Hz "
          f"(calibrated={_state['calibrated']})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
