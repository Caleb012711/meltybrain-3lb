# Gauntlet Round-2 Verification #33 — Pure-White Theme Re-verify (agent 3/10)

Scope: `/workspaces/meltybrain-3lb/web` (site re-theme: `:root` paper/surface `#ffffff`,
inset `#f1f2f4`, line `#e5e7eb`, line-strong `#d4d7dd`; cool-gray grids/floor;
`--faint` `#5b616a`; 44px pill nav targets). READ-ONLY — no source edits made.

Skills applied (read from disk at `.opencode/skills/...`, repo root):
- `robotics-software-principles` (`/workspaces/meltybrain-3lb/.opencode/skills/robotics-software-principles/SKILL.md`)
  — relevance here: separation of concerns (theme tokens in `:root`, no scattered magic
  colors), fail-safe defaults (lint + build exit codes as the gate), observability
  (explicit PASS/FAIL per item with file:line evidence).
- `robotics-testing` (`/workspaces/meltybrain-3lb/.opencode/skills/robotics-testing/SKILL.md`)
  — pyramid adapted to a static-site theme check: deterministic static scans (grep over
  `src/`) as unit-level checks, computed WCAG contrast ratios as assertion-level checks,
  `npm run lint` + `npm run build` as the integration gate. No sim/HIL — no control,
  perception, or hardware path is touched by this CSS/3D-tint change.

## 1. Leftover warm hexes / beige surfaces — PASS

- Grep (case-insensitive) over `src/` for `f6f5f1|efede7|e2e0d8|c9c6b8|f4f2ec` → **zero hits**.
- Grep for `faf8|faf9|f5f3ee|f9f7f2|efe9dc|e8e2d4|cream|parchment|beige|ivory|linen` →
  **zero hits** (only prose matches for the word "warm": `src/pages/Pages.tsx:34`
  "warm housing", `src/data/buildGuide.ts:40` "warm the housing" — build instructions,
  not colors).
- Full hex inventory of `src/` contains **no beige/off-white page surface**. Warm-tinted
  values that remain are intentional and non-surface (each listed):
  - `src/components/CadViewer.tsx:46` — `color="#fff4e8"` on a `Lightformer` (3D studio
    light tint, not a DOM surface). Allowed/observation only.
  - `src/components/materials.ts:23,35` — `'pod-metal': '#a49d92'` (titanium/hub 3D part
    material + `ROLE_PARAMS`). Warm-gray metal, not a page surface.
  - `src/pages/Studio.tsx:383` — `"#f7f8fa"` arena floor plane (cool, near-white; grid +
    ink edges delineate it — see §4).
  - `src/index.css:153-154` — `#f5c69e` / `#fef2f2` / `#f5b8b1` warn/danger callout
    borders/backgrounds (functional peach/red washes, plus `var(--accent-wash)`).
  - `src/components/HeroStage.tsx:337` — `'#9a2f00'` scroll-highlight text (burnt orange,
    contrast 7.55:1 — see §2).
- `#d8dce2` appears only at `src/components/CadViewer.tsx:37` as the hemisphere-light
  ground color — the explicitly allowed use. Grids/floor are cool-gray as specified:
  `CadViewer.tsx:578`, `Studio.tsx:385,445`, `Explorer.tsx:156` all use
  `gridHelper [#c3c8d0, #e5e7eb]`; clear colors are `#ffffff`
  (`CadViewer.tsx:572`, `Studio.tsx:435,1000`, `Explorer.tsx:150`).
- Fix: none required.

## 2. Contrast ratios on #ffffff — PASS (all body text ≥ 6:1, AA; active pill 16.91:1)

Computed with the WCAG relative-luminance formula (script executed locally):

| Foreground | Use | Ratio vs `#ffffff` | Verdict |
|---|---|---|---|
| `--muted` `#535861` (`index.css:9`) | lede, card p, proof span, status, readout | 7.15:1 | PASS (AAA) |
| `--faint` `#5b616a` (`index.css:10`) | stack-card grp | 6.24:1 | PASS (AA; AAA at 18pt+) |
| `--steel` `#3f4752` (`index.css:11`) | nav links, eyebrow, kicker, pills, th | 9.40:1 | PASS (AAA) |
| `--accent-text` `#b23600` (`index.css:12`) | links, pill.hot, spec-plate | 6.14:1 | PASS (AA) |
| `--ink` `#1a1d21` (`index.css:8`) | body, headings, step text | 16.91:1 | PASS (AAA) |
| `#fff` on `--ink` `#1a1d21` (`index.css:69,115,348`) | active pill, pressed tab/stack-tab | 16.91:1 | PASS (AAA) |
| `#fff` on `#b23600` (`index.css:94`) | `.btn.primary` | 6.14:1 | PASS (AA) |
| `.meta` `#5d636c` (`index.css:81`) | meta labels | 6.06:1 | PASS (AA) — but hardcoded, see fix |
| `--ok` `#1a6b32`, `--danger` `#b42318` | ok/danger text | 6.58 / 6.57:1 | PASS (AA) |
| `#9a2f00` (`HeroStage.tsx:337`) | scroll highlight | 7.55:1 | PASS (AAA) |
| `#8e2a00` (`index.css:281`) | primary hover | 8.46:1 | PASS (AAA) |

Decorative-only tokens (non-text, WCAG-exempt; every bounded container also carries a
shadow — see §4): inset `#f1f2f4` 1.12:1, line `#e5e7eb` 1.24:1, line-strong `#d4d7dd`
1.44:1 vs `#ffffff`.
- Fix (nit, non-blocking): `src/index.css:81` hardcodes `.meta { color: #5d636c; }`
  instead of `var(--faint)`/`var(--muted)` — same contrast band, but breaks the
  token discipline ( Principles §8: configuration over magic values). Suggest
  `color: var(--muted)`.

## 3. Pill nav at 360px / 768px / 1440px (code reading) — PASS, no wrap or clip

Structure (`src/components/Layout.tsx:53-70`, `src/components/Sidebar.tsx`,
`src/data/content.ts:4-16` — 11 nav entries; styles `src/index.css:46-70,172-211`):
- `.nav-pill` (`index.css:53-61`): `display:flex; align-items:center`, **no `flex-wrap`**
  (nowrap default), `min-height:56px`, bordered + shadow. Children never wrap by
  construction.
- Inline `nav` (`index.css:65`): `display:flex; flex:1; overflow-x:auto` with hidden
  scrollbar + right fade mask; links (`index.css:67`) `white-space:nowrap`,
  `display:inline-flex; align-items:center; min-height:44px` ✓ 44px targets.
  Overflow scrolls intentionally (mask affordance) — that is scroll, not clip.
- **1440px** (>900px breakpoint): hamburger (always rendered, `Layout.tsx:56`) +
  brand + all 11 links in the `flex:1` scroller. 11 links (~1k px) exceed the
  ~800 px slot inside `max-width:1080px` pill → horizontal scroll with mask.
  No wrap (`white-space:nowrap`, no `flex-wrap`), no hard clip. Tab focus
  auto-scrolls containers. PASS.
- **768px and 360px** (≤900px): `index.css:207` hides the inline
  `nav[aria-label="Site sections"]` → zero overflow/clip surface; hamburger
  (44×44px, `index.css:174-180`) + drawer (`Sidebar.tsx:92-126`,
  `width:min(320px,88vw)`, 44px `.drawer-link`s at `index.css:200-206`, focus trap +
  Esc + backdrop + body-scroll lock) take over. Hamburger ↔ drawer interplay verified
  in `Layout.tsx:48-56,72` and `Sidebar.tsx:47-79`. PASS.
- **360px narrow**: `index.css:129` ≤420px query hides brand img, brand ellipsizes
  (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`), `.nav`
  `flex-wrap:nowrap`. Hamburger 44px + gap + ellipsis brand + pill padding fits.
  No wrap/clip. PASS.
- Fix: none required. Optional nit: the `mask-image` fade (`index.css:65`) also
  applies when content does not overflow (last ~4% of the slot always faded) —
  cosmetic only; could scope with `:has()`/scroll-state but not a defect.

## 4. White-on-white boundaries — PASS, nothing visually disappears

Every `#fff`-surfaced container carries a border and (except flat chips) a shadow:

| Element | Rule | Border + shadow |
|---|---|---|
| `.viewer` (+ canvas) | `index.css:109-110` | 1px `line-strong` + shadow ✓ |
| `.card` | `index.css:134` | 1px `line` + shadow ✓ |
| `.proof` (+ cells `border-left:line`) | `index.css:122-125` | 1px `line-strong` + shadow ✓ |
| `.hero-kicker` | `index.css:320` | 1px `line-strong` + shadow ✓ |
| `.hero-sticky` | `index.css:299-305` | 1px `line-strong` + shadow ✓ |
| `.nav-pill` | `index.css:53-60` | 1px `line-strong` + shadow ✓ |
| `.hero-hud`, `.pill`, `.tab/.mini/.stack-tab`, `.part-panel`, `.stack-stats`, `.stack-card`, `.dl-card`, `.step`, `.tracker`, `.render-figure` (2px ink), `.help-card`, `table/.table-wrap`, `footer.site`, `.section + .section` (2px ink), `.spec-plate` (3px ink top) | various | all bordered ✓ |
| 3D canvas on white | `CadViewer.tsx:37,578`, `Studio.tsx:383-388` | cool-gray grid `#c3c8d0/#e5e7eb` + arena ink edges `#1a1d21` + dark walls `#22252a` on `#ffffff` clear — model/floor delineated ✓ |
| `LoaderBar` (`CadViewer.tsx:468-485`) | inline | `#fff` chip has own `line-strong` border + ink top rule inside bordered `.viewer` ✓ |

Borderless-on-white, checked and acceptable (tint/text delineated, none disappear):
`code/.mono` (inset chip, no border — 1.12:1 tint block, standard code-chip pattern);
`.hero-giant` (ink text); skeleton `.row-main` placeholders (`Explorer.tsx:358`,
`Studio.tsx:1331`, transient loading state inside bordered panel); `th` (inset header
delineated by row borders + wrapper border). Studio floor `#f7f8fa` vs `#ffffff`
clear ≈1.03:1 — edge itself is near-invisible, but grid lines + ink arena edges +
dark walls + the bordered `.viewer` frame carry the boundary (observation, not a fail).
- Fix: none required.

## 5. `npm run lint` + `npm run build` — PASS (both exit 0, run by this agent)

- `npm run lint` (oxlint): exit 0. Only pre-existing style warnings
  (`only-export-components`, `set-state-in-effect`, `exhaustive-deps`,
  `immutability`, `preserve-manual-memoization` in `CadViewer/HeroStage/hooks/Studio/Explorer/Bom`);
  zero errors, none theme-related.
- `npm run build` (`tsc -b && vite build`): exit 0, `✓ built in 1.54s`, 589 modules,
  CSS `dist/assets/index-CX9zJXE8.css` 21.70 kB.

## Verdict: GO

No beige/off-white surfaces remain, all text contrasts pass AA (most AAA), pill nav
cannot wrap or hard-clip at any target width, every white surface is bordered (and
shadowed), lint and build are green. Single non-blocking nit: hardcoded
`.meta #5d636c` (`index.css:81`) should use a token.
