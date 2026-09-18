/**
 * Eyeliner pit dashboard — stdlib-only Node server (no npm deps).
 * Serves index.html, proxies the tracker so the browser needs one origin:
 *
 *   GET /health        dashboard health (includes tracker reachability)
 *   GET /api/pose      -> TRACKER_URL/pose (5 Hz opponent/self pose, ttl_s=1.0)
 *   GET /api/health    -> TRACKER_URL/health
 *   POST /api/calibrate -> TRACKER_URL/calibrate (4-corner save)
 *
 * Env: TRACKER_URL (default http://tracker:5001), PORT (default 8080).
 * Telemetry fields (rpm/g/batt/temp) arrive here from T2 over the pit WiFi;
 * until the Pi link is up the UI shows manual-entry placeholders clearly
 * labelled SIM — it never fabricates a "live" badge.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TRACKER_URL = process.env.TRACKER_URL ?? 'http://tracker:5001';
const PORT = Number(process.env.PORT ?? '8080');
const HERE = path.dirname(fileURLToPath(import.meta.url));

async function proxyJson(res, target, init) {
  try {
    const r = await fetch(target, { signal: AbortSignal.timeout(5000), ...init });
    const body = await r.text();
    res.writeHead(r.status === 200 ? 200 : r.status, { 'Content-Type': 'application/json' });
    res.end(body);
  } catch {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `tracker unreachable at ${TRACKER_URL}` }));
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => {
      chunks.push(c);
      if (Buffer.concat(chunks).length > 65536) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      try {
        const r = await fetch(`${TRACKER_URL}/health`, { signal: AbortSignal.timeout(4000) });
        const t = await r.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'dashboard', tracker: t }));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'dashboard', tracker: 'unreachable' }));
      }
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/pose') {
      await proxyJson(res, `${TRACKER_URL}/pose`);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      await proxyJson(res, `${TRACKER_URL}/health`);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/calibrate') {
      const body = await readBody(req);
      await proxyJson(res, `${TRACKER_URL}/calibrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(path.join(HERE, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err?.message ?? err) }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[dashboard] serving on :${PORT} (tracker=${TRACKER_URL})`);
});
