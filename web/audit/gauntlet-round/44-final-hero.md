# Gauntlet Round 44 — Final Hero Confirmation (agent 4/10)

Skills: `robotics-design-patterns` = "Robotics Design Patterns"; `robotics-software-principles` = "Robotics Software Design Principles", Principle 6 = "Separation of Rates — Respect Timing Boundaries".
Scope: `src/components/HeroStage.tsx` (451 lines, read fully). Build + lint re-run by this agent.

## 1. prev initialized to cfg.x0 — PASS
- `HeroStage.tsx:23-24`: `cfg = mobile ? mobileCfg : parked; prev = useRef(cfg.x0)` — first frame `x = cfg.x0 + span*drive(0) = cfg.x0`, so `dx = 0`, no jump/roll snap (`:35-36,:49`).
- Mobile vs desktop: `mobileCfg.x0 = -3.4` vs `parked.x0 = -7.2` (`:9-10`); remount via `key={mobile ? 'hero-m' : 'hero-d'}` (`:434`) re-inits `prev` correctly. `shared` seed `:217` (`parked.x0`) is overwritten every frame (`:37`) and camera lerps (`:113-116`), so no visible snap.

## 2. Space joins don't break center measurement — PASS
- `SplitLine` `:124-150`: words split on `' '`, chars are the only `.hero-ch` + `register` nodes (`:131-135`); separator space `:145` (`<span aria-hidden="true"> </span>`) carries no ref/class, so `letters.current` ↔ `centers.current` stay 1:1 (`:233-236`).
- RO observes both stage and text: `:270-276` (`ro.observe(stage)`, `ro.observe(text)` on `.hero-text`), plus `fonts.ready` + mount `measure()` (`:277-280`). Wrap/font shifts re-measure; regular space (not `&nbsp;`) allows natural wrapping.

## 3. Blob block placement, no dupes, no unused vars — PASS
- Single update site `:308-318`, placed after `botPx` compute (`:306-307`) and BEFORE early-return `:319` — blob (`left`/`opacity`) refreshes every visible frame even when `|Δx| < 0.03`; letter loop `:328-350` still gated (Principle 6 rate separation: cheap DOM writes every frame, heavy per-letter work gated).
- No duplicate: only `blobRef.current` writes are `:315-316` (decl `:213`, render `:420`). `botPx` still consumed by letters at `:332` (`cx - botPx`); no dead locals (`fade`/`blob` block-scoped).

## 4. tsc-clean + lint — PASS
- `npm run build` (tsc -b + vite): exit 0, `✓ built in 1.23s`, no TS errors (re-run 2026-09-18).
- `npm run lint` (oxlint): exit 0; only warnings (incl. pre-existing `HeroStage.tsx:30` shared-ref immutability pattern, also present before minors). Zero errors.

## 5. Poster handoff + reduced path untouched — PASS
- Poster: `HeroReady` `:152-157` + `<Suspense>` `:189-192`, `ready → posterGone` 350ms `:250-255`, fade overlay `:427-431`, `GlErrorBoundary → poster` fallback `:421-424` all intact (diff shows no change in this block).
- Reduced: early return `:374-409` intact (`ParkedBot`, static headline, `glFailed` fallback); diff touches only shared `ViewerLights`/shadow-y alignment, no behavior change.

Verdict: GO — all three minors correct, no regressions.
