# Gauntlet Red-Team G3 — new-surface audit (web)

Skills read: `robotics-security` (SROS2/DDS hardening, e-stop independence, auditd) and
`robotics-testing` (pyramid, launch_testing, golden-file, anti-patterns). Lens applied:
attack quality/robustness, not security. No source files modified.

Verdict: **NO-GO** — one ship-blocker (F1). Everything else is minor.

## Ranked findings

### F1 — HIGH — fight media untracked in git → 404 on every git-based deploy
- Repro: `git ls-files web/public/` lists cad/*, renders, icons — but NOT
  `fight-night.mp4` / `fight-poster.jpg` (both `??` untracked). `render.yaml`
  builds from git, so prod has neither file.
- Ref: `src/pages/Studio.tsx:1498-1505` (`src="fight-night.mp4"`, `poster="fight-poster.jpg"`).
  Local `npm run build` copies them into `dist/` (verified present), masking the bug.
- Fix: `git add web/public/fight-night.mp4 web/public/fight-poster.jpg`
  (824K + 32K, no LFS needed) — or intent-document why excluded. Re-test prod URL after.

### F2 — MEDIUM — orphan `/parts` route drifts from merged Bom truth
- Repro: nav (`src/data/content.ts:4-15`, 10 items) dropped Parts, `Bom.tsx:118-119`
  says "merged here from the old Parts page" — but `src/App.tsx:39` still serves
  `/parts` (`Pages.tsx:221-232`), unlinked and unmaintained.
- Drift proof: Battery connector is **XT30** (`Pages.tsx:228`) vs **XT60 mains**
  (`Bom.tsx:130`). Two sources of fight-critical truth.
- Fix: delete the route + `Parts()` (or reduce to `<Navigate to="/bom" replace/>`
  for deep-link compat) and grep docs for `/parts` references.

### F3 — MEDIUM — `<video>` has no failure or mobile hardening
- Repro: inspect `Studio.tsx:1498-1505`. No `playsInline` (iOS hijacks to fullscreen),
  no `aspect-ratio`/dimensions (0-height black box → CLS until `preload="metadata"`
  resolves), no `<track kind="captions">` (aria-label only — fails the
  robotics-testing "test failure cases" bar), no `onError` fallback (with F1 live,
  users get a dead black rectangle; the explainer text below doesn't say the video is missing).
- Mitigating: `preload="metadata"` (not `auto`) is correct for slow networks;
  `controls` present; relative URLs are safe under `HashRouter` (`main.tsx:9`) + `base:'./'`.
- Fix: add `playsInline`, `aspect-ratio:16/9` style, captions track or documented
  exemption, and an error-state message.

### F4 — LOW — merged Bom page is heavy with no deep-link affordance
- Repro: `Bom.tsx` renders 4 tables (2 cost + weight + locked spec, ~30 rows) and
  zero `id`s on `h2`s; `NavEntry.anchors` (`content.ts:2`) exists but `Layout.tsx:63-69`
  never renders anchors — so no section of the biggest page is linkable.
- Fix: `id`s on Bom `h2`s (+ optional anchor chips). Not a blocker; `.table-wrap`
  horizontal scroll already handles small screens.

### F5 — LOW — 10-item nav at 901–1100px is a hidden scroll region
- Repro: `index.css:65-67` — `overflow-x:auto` + `scrollbar-width:none` + fade mask.
  At ~1024px brand + 10 pills overflow; only affordance is the fade. The scroll
  container isn't keyboard-focusable, but the always-visible hamburger+Sidebar
  covers keyboard users. No breakage observed — watch item #11.

## Checked clean (no finding)
- `npm run lint` exit 0 (warnings only, pre-existing React-compiler style notes).
- `npm run build` passes; dist sizes sane.
- Sheet-metal doc rule (no lightening holes in outer plates) vs web: consistent —
  `Pages.tsx:104` "pocket and lighten" targets the solid CNC chassis body, not sheet.
- No stray shippables: no `frames/`, no `*.log`; `../tools/fight_render.py`,
  `../manufacturing/blades/`, `../radio/`, `../autonomy/`, `../base/` untracked but
  out-of-web-root (deploy scoping question, not a web defect). No `to="/parts"`
  links remain in `src/`.
- Poster/mp4 sizes (32K/824K) fine for `preload="metadata"` on slow networks.

## To flip to GO
1. Track the two fight assets (F1) and confirm 200s on the preview deploy.
2. Kill or redirect `/parts` and resolve XT30/XT60 (F2).
3. F3–F5 may ride the next wave.
