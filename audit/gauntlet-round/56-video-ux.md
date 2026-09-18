# Gauntlet 56 — Fight-reel video UX (Studio.tsx)

Skills: `robotics-software-principles` (P6 Separation of Rates, P7 Fail-Safe Defaults, P12 Graceful Degradation) and `robot-perception` (streaming: decouple capture from processing, bounded buffers, timestamp at source; calibration/visualization honesty).

## (1) Placement, both modes — PASS
- `web/src/pages/Studio.tsx:1493-1511`: reel sits **outside** the drive/build ternary (ends :1465), so it renders in both modes as claimed. It is outside `.studio-grid`, so it cannot break the grid; mobile stacks (`index.css:372-373` collapses to 1fr) and the video's inline `width:100%; max-width:560` caps cleanly.
- Nit: `Studio.tsx:1494` uses `<div role="heading" aria-level={2}>` — works, but a native `<h2>` is cheaper and safer.

## (2) Load cost (`preload`, `poster`) — PASS
- `Studio.tsx:1498-1504`: `controls` + `preload="metadata"`, no `autoplay` — the 840,550 B `public/fight-night.mp4` costs ~nothing until play (P6: user-gated media never touches the drive loop). `poster="fight-poster.jpg"` (31,767 B, exists) shows first frame before play; encoder uses `+faststart` (`tools/fight_render.py:333-339`).

## (3) No-JS / no-video fallback — FAIL (minor, P12 gap)
- `<video src="fight-night.mp4">` has **zero children**: no fallback text, no `<source>`, no `<track>` (`Studio.tsx:1498-1505`). No-JS is moot (React SPA), but a 404/unsupported-codec leaves a black box with controls only.
- Fix: add inner fallback, e.g. `Your browser can't play this video. <a href="fight-night.mp4">Download fight-night.mp4</a> (0.8 MB).`

## (4) Caption honesty vs `tools/fight_render.py` — MIXED (1 overclaim)
- "scripted 22 s" — PASS (`DUR = 22.0`, :19).
- "hits cost both bots 0.75× RPM" — PASS (`Studio.tsx:210` `s.rpm *= 0.75` ≡ `fight_render.py:141-142`).
- "deterministic seed" — PASS (`SEED = 7`, :17). "Re-render any time — no browser needed" — PASS w/ caveat (needs matplotlib+numpy+ffmpeg, :8).
- "Eyeliner seeks with velocity lead, rival runs the repo's wobble policy" — PASS-ish: rival matches `RivalBot` lead+`sin(t*2)*0.3` wobble, but render adds phase shift (`t+1.3`, :85) and scripted hurt/flee (`t>17.5` throttle-off, :76-78) absent from the page.
- **"same drive model as this page" — FAIL (overclaim).** Render shares constants (RPM_MAX/taus/grip 1400→3100 exp 2.8/BOUNCE) but is **not** the same model: no `K_BRAKE` branch, no min-rebound 2.5 kick, no `hitT` cooldown (`Studio.tsx:61-84` vs `fight_render.py:90-111`), plus render-only HP/damage/KO. The script's own docstring says "Same flavor as" (:4) — honest; the caption upgrades it.
- Fix caption to: `same spin-up/grip constants as this page (scripted bout; HP/KO added for the reel)`.

## (5) A11y — PASS with notes
- Native `controls` = keyboard-operable; `aria-label` (`Studio.tsx:1503`) is descriptive and front-loads that it is rendered with a fixed outcome (no spoiler-trap). No audio track in a matplotlib render, so `<track>` captions are not required; the adjacent paragraph (:1506-1510) doubles as a text summary for the visual narrative (perception skill: every visualization needs a non-visual channel).
- Gaps: no full transcript needed, but keep the outcome in text (already there); fix the `role="heading"` div → `<h2>`; `aria-label` on `<video>` overrides inner fallback for AT — keep fallback text short.

## (6) `npm run lint` + `npm run build` — PASS (ran 2026-09-18)
- `npm run lint`: exit 0, warnings only, none from the video block.
- `npm run build` (`tsc -b && vite build`): success in ~4 s; `Studio-BuXC-Vaf.js` 35.23 kB (gzip 12.12 kB) — reel adds no JS weight.

## Verdict: CONDITIONAL GO (ship; fix caption + fallback next touch)
1. `Studio.tsx:1496` caption: "same drive model" → "same spin-up/grip constants (scripted bout; HP/KO added)".
2. `Studio.tsx:1498-1505` add `<video>` fallback text + download link.
3. Optional: `1494` `<div role="heading">` → `<h2>`; prefix aria-label with "Scripted render:".
