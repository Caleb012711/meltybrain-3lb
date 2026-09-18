# Gauntlet Round 59 — Perf/Deploy: fight-night.mp4 + fight-poster.jpg

Skills read (from repo root; `web/.opencode/...` does not exist):
- `robotics-software-principles` — P6 Separation of Rates (slow media must not block fast path; async buffer boundary)
- `docker-ros2-development` — deploy checklist (layer/cache order, cache headers, versioning)

Wave under test: `web/public/fight-night.mp4` (840550 B / 821K) + `web/public/fight-poster.jpg` (31767 B / 32K). Sum 872317 B (~852 KB). Both `??` untracked in git; `dist/` gitignored.

## 1. Build — PASS
- `npm run build` OK (tsc + vite 8.3.0, 589 modules, 3.60 s).
- Chunks (gzip): index 254K (81.6K), CadViewer 1026K (278K), Studio 35.2K (12.1K), Pages 27.9K, OrbitControls 15.4K, HeroStage 12.7K, Bom 11.5K, Explorer 11.0K, jsx-runtime 8.6K, Engineering 7.5K, css 21.7K. No chunk embeds media: `fight-night` occurs 1× in Studio chunk as URL string only, 0× elsewhere.
- dist total 53M = 50M `cad/` + 1.5M `assets/` + ~1.7M root images (incl. new 872K) + index.html. Delta vs pre-wave ≈ +872 KB (+1.6%), all static copy (`dist/` bytes identical to `public/`). No JS growth from media.

## 2. render.yaml cache rules — PASS (with optional recommendation)
- Confirmed: no rule matches root `/*.mp4` or `/*.jpg`. Existing rules cover `/assets/*` (immutable 1y), `/cad/*.glb|parts.json|manifest|step|stl`, `/index.html` (no-cache). Root `fight-*` and `eyeliner_summer_2025_render.png` fall through to `/*` security headers only → Render default cache behavior.
- Not a blocker (small files, on-demand). If warranted, add (did NOT edit):
```yaml
      - path: /fight-night.mp4
        name: Cache-Control
        value: public, max-age=86400
      - path: /fight-poster.jpg
        name: Cache-Control
        value: public, max-age=86400
```
  (86400, NOT immutable — same filename is re-rendered deterministically.)

## 3. Video loading / first-paint (`/#/studio`) — PASS
- `Studio.tsx:1498-1505`: `<video controls preload="metadata" poster="fight-poster.jpg" src="fight-night.mp4">`, no autoplay. P6 pattern: metadata-only fetch + 32K poster on paint; full 840K only on user play, below-fold "Fight reel" section. First-paint cost ≈ poster + metadata, does not block route JS/CSS paint.

## 4. Preview serve — PASS
- `vite preview` served both: `200 video/mp4`, Content-Length 840550, byte-identical to public; `200 image/jpeg`, 31767. `Range: bytes=0-1023` → `206 Partial Content` (seek/streaming OK). Server stopped after check.

## 5. Lint — PASS
- `npm run lint` (oxlint): 0 errors. Warnings only, all pre-existing (react immutability/set-state-in-effect/exhaustive-deps/only-export-components in HeroStage/hooks/CadViewer/Studio/Explorer); none on new video lines.

Verdict: GO — ship as-is; optional YAML above is nice-to-have.
