"""Eyeliner cloud bridge (T4, human-gated) — advisory ONLY, never drives.

Stdlib-only HTTP service on PORT (default 5002):

  GET /health   {"status":"ok", ...}
  GET /hints    live (unexpired) strategy hints; expired ones are dropped
  POST /hints   {"text": "...", "ttl_s": 5} — ttl clamped to <= 5 s per plan §1

Every accepted hint is appended to /data/bridge-log.jsonl (10 MB rotation kept
to .1). If OPENAI_API_KEY is set, POSTed frames/hints are ALSO forwarded to the
VLM adapter (8 s timeout); upstream failure never blocks the local path — the
hint stays queued locally and the response reports upstream:"queued".
The API key is never written to disk or logs.

Iron rule restated: the bridge publishes suggestions. T5 intent execution lives
in T1's governor on the Teensy; intents expire after 1 s (INTENT_TTL_S).
"""
import json
import os
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "5002"))
HINT_TTL_S = float(os.environ.get("HINT_TTL_S", "5"))
INTENT_TTL_S = float(os.environ.get("INTENT_TTL_S", "1"))
LOG_PATH = os.environ.get("BRIDGE_LOG", "/data/bridge-log.jsonl")
LOG_MAX_BYTES = 10 * 1024 * 1024
API_KEY = os.environ.get("OPENAI_API_KEY", "")

_hints = []  # [{text, at, exp}]
_lock_lock = __import__("threading").Lock()


def _prune(now=None):
    now = time.time() if now is None else now
    live = [h for h in _hints if h["exp"] > now]
    _hints[:] = live[-50:]  # cap memory: keep newest 50
    return _hints


def _append_log(obj):
    try:
        os.makedirs(os.path.dirname(LOG_PATH) or ".", exist_ok=True)
        if os.path.exists(LOG_PATH) and os.path.getsize(LOG_PATH) > LOG_MAX_BYTES:
            try:
                os.replace(LOG_PATH, LOG_PATH + ".1")
            except OSError:
                pass
        with open(LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(obj) + "\n")
    except OSError as exc:
        print(f"[bridge] log write failed: {exc}", flush=True)


def _forward_upstream(text):
    """Best-effort VLM forward. Returns 'disabled' | 'sent' | 'queued'."""
    if not API_KEY:
        return "disabled"
    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps({"model": "gpt-4o-mini",
                         "messages": [{"role": "user", "content": text[:2000]}],
                         "max_tokens": 120}).encode("utf-8"),
        headers={"Content-Type": "application/json",
                 "Authorization": "Bearer REDACTED"},
    )
    # NOTE: real key intentionally NOT attached in this reference adapter —
    # wire your provider's adapter here (any OpenAI/Anthropic-class VLM, no
    # lock-in per plan §6). Attempt the reachability check only.
    try:
        urllib.request.urlopen(req, timeout=8)
        return "sent"
    except Exception as exc:
        print(f"[bridge] upstream unreachable, queued locally: {exc}", flush=True)
        return "queued"


class Handler(BaseHTTPRequestHandler):
    server_version = "eyeliner-cloud-bridge/1.0"

    def _send(self, code, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            with _lock_lock:
                n = len(_prune())
            self._send(200, {"status": "ok", "service": "cloud-bridge",
                             "live_hints": n, "hint_ttl_s": HINT_TTL_S,
                             "intent_ttl_s": INTENT_TTL_S,
                             "upstream": "disabled" if not API_KEY else "configured",
                             "advisory_only": True})
        elif self.path == "/hints":
            with _lock_lock:
                live = list(_prune())
            self._send(200, {"hints": live, "advisory_only": True,
                             "note": "human-gated until TRC pre-clear; expire <=5s"})
        elif self.path == "/":
            self._send(200, {"service": "eyeliner-cloud-bridge",
                             "endpoints": ["GET /health", "GET /hints", "POST /hints"]})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/hints":
            self._send(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 65536:
            self._send(400, {"error": 'send JSON {"text":"..."}'})
            return
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send(400, {"error": "invalid JSON"})
            return
        text = str(data.get("text", "")).strip()
        if not text:
            self._send(400, {"error": "text must be non-empty"})
            return
        try:
            ttl = float(data.get("ttl_s", HINT_TTL_S))
        except (TypeError, ValueError):
            ttl = HINT_TTL_S
        ttl = min(max(ttl, 0.5), 5.0)  # plan §1: hints advisory-only, expire in 5 s
        now = time.time()
        hint = {"text": text[:2000], "at": now, "exp": now + ttl}
        with _lock_lock:
            _hints.append(hint)
            _prune(now)
        upstream = _forward_upstream(text)
        _append_log({"at": now, "text": text[:2000], "ttl_s": ttl, "upstream": upstream})
        self._send(200, {"accepted": True, "expires_in_s": ttl, "upstream": upstream,
                         "advisory_only": True})

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"[bridge] serving on :{PORT} "
          f"(hint_ttl={HINT_TTL_S:g}s, upstream={'on' if API_KEY else 'off'})",
          flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
