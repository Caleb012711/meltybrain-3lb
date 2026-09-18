# Gauntlet 53 — Fight video (tools/fight_render.py → Studio reel)

Skills used (exact on-disk names, listed `.opencode/skills/` first):
- `.opencode/skills/robotics-testing/SKILL.md` (deterministic replay, golden-file regression, anti-pattern: non-deterministic tests)
- `.opencode/skills/robotics-design-patterns/SKILL.md` — NOTE: prompt asked for `robot-design-patterns` (no s); that path does not exist. Actual file is `robotics-design-patterns` (with s). Used the real one.

## (1) tools/fight_render.py — full read (346 lines)
- PASS `tools/fight_render.py:24` TAU_UP=0.9, TAU_DOWN=1.3 matches `web/src/pages/Studio.tsx:14-15`.
- PASS `tools/fight_render.py:27` GRIP_LO=1400, GRIP_HI=3100, GRIP_EXP=2.8 + `grip()` at L43-45 matches `Studio.tsx:20-22,52-55`. Zero-authority-under-1400 / full-past-3100 shape identical; `k = K_ACCEL if g>0.05 else K_DRAG` matches L56.
- PASS `tools/fight_render.py:28,100-109` BOUNCE=0.45, per-axis resolve + 0.85 tangent scrub matches `Studio.tsx:27,68-83`.
- PASS `tools/fight_render.py:141-142` both bots `*= 0.75` on contact matches `Studio.tsx:210`. Caption "0.75×" claim TRUE.
- PASS Rival policy `fight_render.py:68-87` (wall-avoid blend, flee if rpm<1200, lead 0.35, wobble sin(t*2)*0.3) matches `Studio.tsx:178-192` (wobble phase offset +1.3 is cosmetic).
- NOTE (not fail): Studio extras absent in renderer — min-rebound 2.5 kick (`Studio.tsx:73,81`), hitT 0.12 cooldown (`:67,74,82`), K_BRAKE=6.0 (`:19,56`). Renderer never brakes (scripted intents only), so no behavioral gap for this reel; docstring "flavor" wording is honest, caption "same drive model" slightly strong but constants-identical.
- PASS deterministic: `SEED=7` (L17), `np.random.default_rng(SEED)` (L115) + `SEED+1` for sparks (L233); no `random` module, no `time/datetime/monotonic` (grep confirms); `matplotlib.use("Agg")` (L164); fixed DT=1/120, stride=5, 528 frames.
- PASS ffmpeg `fight_render.py:335-338`: libx264, `-crf 23`, `-preset medium`, `-pix_fmt yuv420p`, `-movflags +faststart` — sane web defaults. ffprobe: h264, 1000×1000, yuv420p, 24fps, 22.00 s, 528 frames (24×22).

## (2) Artifacts
- PASS `web/public/fight-night.mp4` 840550 B = `web/dist/fight-night.mp4` 840550 B, md5 `3447135bb65f63db26b09f7f6c7ee1e7` both; poster 31767 B both. Fresh `npm run build` recopies public→dist (01:20). 22 s / ~840 KB claim TRUE.

## (3) Studio embed (`Studio.tsx:1493-1510`, outside mode ternary → both modes)
- PASS `controls`, `preload="metadata"`, `poster="fight-poster.jpg"`, `src="fight-night.mp4"`, `aria-label="Rendered fight: …"` (L1498-1504).
- PASS relative paths consistent: `cad/main-cad.glb` (L126,221) and video/poster are all bare-relative, correct under `HashRouter` (`web/src/main.tsx:9`).
- PASS styling `width:100%, maxWidth:560, display:block, background:#000` (L1504) — sane.
- PASS captions: "scripted 22 s" TRUE (ffprobe 22.0 s); "deterministic seed" TRUE (SEED=7); "0.75× RPM" TRUE; "tools/fight_render.py … no browser needed" TRUE.

## (4) Home button
- PASS `web/src/pages/Home.tsx:139` label `Drive it + fight reel` → `to="/studio"` correct.

## (5) Lint + build (run by verifier)
- PASS `npm run lint` exit 0 (warnings only, pre-existing CadViewer/Studio/Explorer).
- PASS `npm run build` exit 0 (tsc + vite 1.27 s), dist artifacts present.

No fixes required. No files modified (read-only + this report).
