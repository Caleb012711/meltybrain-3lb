# Gauntlet Round 40 — Docs-Consistency Sweep (round-2 verification of the change wave)

Date: 2026-09-18 · Auditor: agent 10/10 (docs consistency) · Mode: **READ-ONLY on sources** (no source file edited; this report is the only write).
Scope: verify the change wave — tip-speed `/1056`, displayed cap `1361 g`, `render.yaml` dedup, undercutter datum `45.4 cm³ ≈ 356 g / 201 g Ti`, meshed count `89`, Studio rival role paint, progress-bar removal, white re-theme, pill nav.

## 0. Skills applied (with honest fallback)

- `.opencode/skills/robotics-testing/SKILL.md` — **read in full from disk (577 lines) and applied.** Pyramid mapped to docs: L1 token grep (stale-value sweep §1) → L2 integration (cross-file consistency §2) → L3 system (round-1 finding closure + screenshot plan §§3–4). Deterministic checks only (fixed strings, exact `file:line`, no timing/`sleep()`); failure-case lens used for fallback-path wording (§2 stack specs).
- Superpowers verification skill — **sought, NOT found.** Searched `.opencode/skills/` (10 entries: `docker-ros2-development`, `robot-bringup`, `robot-perception`, `robotics-design-patterns`, `robotics-security`, `robotics-software-principles`, `robotics-testing`, `ros1`, `ros2`, `ros2-web-integration`), `.opencode/command/` (`gauntlet.md` only — task brief, not a skill), and repo-wide `find -iname "*superpower*"` → **zero hits**. No base superpowers docs exist in this repo. Proceeded on `robotics-testing` alone; stated here so the gap is auditable.

## Verdict: **GO (non-blocking) — wave accepted, 13 exact fast-follow edits below**

Every user-facing element of the wave verified landed. Remaining hits are docs-only nits, two stale numbers in live copy (`Engineering.tsx:151`, `P1-mass-audit.md:47`), one stale README mention, and carried Low/Info polish from rounds 21–23. No blocker; land the edit list as fast follows and re-capture screenshots.

## 1. Stale-value sweep — full-repo grep (md + tsx + ts + css + yaml, `audit/` excluded as frozen)

Method: `grep -rn` per family with `--exclude-dir={audit,node_modules,.git,.opencode}`. `.step` CAD entity hits (`#336`, `#1360/#1361`) are false positives per Gauntlet-24 §3 — excluded explicitly.

| # | Pattern | Result |
|---|---|---|
| S1 | `/336` (stale `π·D·RPM/336`) | **1 live hit, INTENTIONAL — PASS.** `manufacturing/blades/GEOMETRY.md:6` uses the *correct* shop form `D_in × RPM / 336 (≈ π·D·RPM/1056)` with an explicit anti-π note. Code is clean: `Engineering.tsx:51` = `(Math.PI * diaIn * rpm) / 1056`, caption `:96` = `/ 1056`, `Home.tsx:150` = `/ 1056` (diff-vs-HEAD confirms both changed this wave). |
| S2 | stale `π × D × RPM / 336` expression | **FAIL — 1 hit.** `manufacturing/P1-mass-audit.md:47`: `v_mph = π × D_in × RPM / 336` — the exact bug Gauntlet-24 §2.1 fix #8 prescribed (`→ D_in × RPM / 336 (≈ π·D·RPM/1056)`). Result on the line (`≈95 mph, NOT 200+`) is correct; the expression is not. **Edit:** `P1-mass-audit.md:47` → `v_mph = D_in × RPM / 336 (≈ π·D·RPM/1056)`. |
| S3 | bare `1360` (excluding `1360.8` qualifier) | **FAIL — 2 hits, both `autonomy/SAFETY.md`.** `:116` `(resolve 1360 vs 1361 g wording…)` and `:128` `≤[1360/1361 — confirm] g` (TRC pre-clear draft). Everywhere else unified: `README.md:20`, `BOM.md:56,65,81`, `PIT-CHECKLIST.md:4,27`, `Home.tsx:57,64,111,149,292`, `Pages.tsx:44,247`, `content.ts:55,69,80`, `build-guide/00:14,26`, `01:18`, `03:23`, `BLADES.md:114-115`, `P1:1,5`, `TEST.md:28,282`, `POCKET.md:176`, `gauntlet.md:15,69`. `Bom.tsx:111` `cap 1360.8 g` is the sanctioned qualifier form — no change. **Edits:** `SAFETY.md:116` → `at the stated 1361 g cap (3 lb = 1360.8 g)`; `SAFETY.md:128` → `≤1361 g`. |
| S4 | `44.67` / `351 g` / `198 g` (stale undercutter) | **`44.67`: ZERO hits — PASS.** Datum fixed in `Pages.tsx:141`, `BOM.md:75`, `P1:13`, `BLADES.md:109`, `GEOMETRY.md:36`, `content.ts:50` (all `45.4 cm³ → 356/201`). **FAIL — 1 derived hit:** `Engineering.tsx:151` phantom-mass note still says `~351 g steel (~198 g Ti)` — arithmetic of the *stale* 44.67 volume (44.67×7.85=350.7; ×4.43=197.9). Correct volume prices at 356.5/201.2. **Edit:** `Engineering.tsx:151` → `adds ~356 g steel (~201 g Ti) of phantom mass for the staged second config`. |
| S5 | `96 meshed` / `96 nodes` | **FAIL — 1 hit.** `web/src/components/CadViewer.tsx:278` comment: `needs room for 96 nodes` — stale vs measured 89 meshed / 145 entries (`main-cad.parts.json`: 145 entries, 56 `dropped_from_glb`, 89 meshed). Site copy fixed this wave (`Home.tsx:144` = `145 solids, 89 meshed`; `web/README.md:33`). **Edit:** `CadViewer.tsx:278` → `…room for 89 meshed nodes (145 solids incl. thread-speck stats-only)…`. (Comment-only; `matForIndex` correctly prefers `parts.length` — Round-22 §5 verified.) |
| S6 | duplicated YAML (`render.yaml`) | **PASS — deduped.** Single 7-line `buildFilter.paths` block (diff-vs-HEAD confirms deletion of the verbatim 5-line repeat `tools/cad_convert.py` + 4 STEPs). Headers, `rootDir: web`, Node 22.12.0, hash-routing (no rewrites), `previews: automatic` all sound — Gauntlet-24 §6 holds. |
| S7 | `progress bar` / `ScrollProgressBar` / `useScrollProgress` | **PASS in code, FAIL in one doc.** `Layout.tsx` (no bar component, no import), `index.css` (no `#progress-bar`), `hooks.ts` (dead `useScrollProgress` export **deleted** — Round-23 F1 fixed, `rg` zero consumers) — all clean. **1 hit:** `web/README.md:57` still advertises `scroll progress bar` in the Design line. **Edit:** `web/README.md:57` → drop `scroll progress bar, ` from the feature list. |
| S8 | beige hexes (`f6f5f1\|efede7\|e2e0d8\|c9c6b8\|f4f2ec`, incl. docs) | **PASS — ZERO hits repo-wide** (md+tsx+ts+css+yaml, audit-excluded). Round-21 §2 clean status holds. |

## 2. Cross-file consistency — trackers ↔ site /build ↔ BOM ↔ P1 ↔ Engineering (PASS with 4 carried clarifications)

- **Steps/trackers — PASS.** `README.md:12-20` (9 boxes, weigh-in `≤ 1361g — 3 lb = 1360.8 g`) ↔ `build-guide/00:5-14` (8 steps + weigh-in `≤1361g`) + `:18-26` tracker ↔ site `/build` (`Pages.tsx:6-51`: `Build in 8 steps`, renders shared `buildSteps` n=0–7 + shared `trackerText` with `Scale ≤1361 g cap, target ≤1310 g`) ↔ `content.ts:61-80` (single source both render from). Counts agree (8 steps; README's 9th box = weigh-in/combat-ready which is 00-step-8/`buildSteps` n=7 — same spine, no drift).
- **Caps — PASS** (modulo S3's two SAFETY lines): 1361 g + 1360.8 g qualifier + ≤1310 g target + 50 g margin wording identical across README / 00 / `/build` (`Pages.tsx:44`) / BOM / P1 / Engineering (`Home.tsx:149`, `Engineering.tsx:145`).
- **Stack specs — PASS.** Teensy 4.0 600 MHz lock no-pins · dual H3LIS331 ±400 g opposed @45° · DShot600 bidir @8 kHz (AM32 55 A; OpenMelt2 490 Hz/SimonK marked obsolete) · ELRS CRSF · 2×4S 550 mAh parallel · Pi Zero 2W + Cam 3 Wide + 5 V/3 A BEC · 4700 µF + 10:1 divider — identical across `content.ts:131-147` stack cards, `BOM.md:23-37`, `firmware/README.md:3-15`, site firmware page. Costs re-summed: build $662.40 ($590.40 w/o $72 handset), spares $161 — match `Home.tsx:301` FAQ.
- **Open clarifications (carried from Gauntlet-24 §7, NOT regressions — none were in this wave):**
  - C1 `Pages.tsx:291` T1 wording (`T1 Teensy spin at 8 kHz DShot600`) — still conflates governor (~1 kHz) with packet rate. One-caption fix.
  - C2 Connector disambiguation — site (`Pages.tsx:38,316`, `Engineering.tsx:160-161`: XT60 trunk + 16 AWG, XT30 inadequate) vs `BOM.md:33,35`, `build-guide/02:11`, `content.ts:101,141` (`XT30/XT60, 16–20 AWG` slashes). Resolve toward site.
  - C3 `Engineering.tsx:129-130` spin-up label still claims `≈60% efficient`; Gauntlet-24 §2.7 shows 995 J @4000 implies ~40% vs teeth-only mech (396 J) — relabel empirical + 13 Wh/80% DoD note. Arithmetic (523 J → 89 spins @2900) verified correct.
  - C4 `Engineering.tsx:120` accel guidance still `within ~20 mm`; maxR @4000 = 22.4 mm — tighten to `≤18 mm + potting` (caption-only).
  - C5 `materials-guide.md:21` expression `π×8″×4000/60 = 95 mph` still missing the unit conversion (result 95 mph correct) — rewrite as `π·D·RPM/60 in/s ×0.05682`.

## 3. Round-1 (2x) finding closure — what this wave (plus adjacent uncommitted work) fixed

**Round 24 (numbers & copy) — 8/13 fix-items landed:**
- ✅ #1/#2 tip formula + caption (`Engineering.tsx:50-51,96`, diff-confirmed) + #6 `Home.tsx:111,149-150` (1361 pill, /1056, 95 mph kept).
- ✅ #7a undercutter datum (`Pages.tsx:141`, diff-confirmed); ✅ #10 cap lines (8/8: BOM, README, POCKET, TEST ×2, Home, gauntlet ×2); ✅ #12 `render.yaml:60-64` deleted (diff-confirmed); ✅ #13 `BLADES.md:115` `Resolve…` clause gone (cap block now asserts `Displayed cap is 1361 g everywhere`).
- ❌ Open: #8 (`P1:47` → S2), #9 (`materials-guide:21` → C5), #3 (E_SPIN label → C3), #4 (≤18 mm → C4), KE-verdict caveat (thin-ring upper-bound note still absent at `Engineering.tsx:92`), #7b T1 (→ C1), #11 connectors (→ C2), phantom mass (→ S4, unlisted in R24).

**Round 23 (regression + a11y) — wave items PASS; polish partially open:**
- ✅ Progress-bar removal complete + dead export deleted (→ S7); ✅ pill nav + 44 px targets (`index.css:67` now `min-height:44px` — F5 fixed); ✅ `.spec-plate` intact 5/5; ✅ reduced-motion coherence untouched by restyle.
- ❌ Open Lows: F4 `Home.tsx:108` `.hero-badges` still role-less `aria-label` (→ add `role="group"`); F3 route-change focus drop (`Sidebar.tsx:42-45` unchanged); F6 `flex:none` vs ellipsis (`index.css:62` unchanged); F2 active-pill focus hardening (optional); F7 Retry-3D gaps; F8 Hero chunk boundary. (F9 BuildCanvas boundary — see R22 line below.)

**Round 21 (white theme) — holds + 1 improvement:**
- ✅ Palette exact (`:root` paper/surface `#ffffff`, inset/line tokens), zero beige (→ S8), body-text contrast passes; `--faint` darkened `#747a83 → #5b616a` (`index.css:10`) — F1 improved past the 4.5:1 bar for 11 px labels (≈5.9:1, recompute on re-capture).
- ❌ Open Lows: `.meta #5d636c` still hardcodes beside `--muted` (`index.css:81`); hamburger/drawer-close still `radius:6px` vs pill system (`:179,:198`); right-only scroll mask (`:65`); drawer-active vs pill-active dual language; `?? '#999'` fallbacks (`Explorer.tsx:395`, `Studio.tsx` mirror); LED `#12b76a`/rival `#c81e1e` vs `--ok`/`--danger` tokens; arena `#f7f8fa` seam; Lightformer `#fff4e8` warm key (single warm hardcode in src).

**Round 22 (render audit) — large adjacent progress (out-of-wave, credited):**
- ✅ F1 Z-up leveling now in ALL canvases (`CadViewer.tsx:581`, `HeroStage.tsx:56,81`, `Explorer.tsx:159`, `Studio.tsx:123,218,448` — no `LevelZUp` wrapper, rotation inlined per site, convention documented in comments); ✅ F2 `REST_Y = 0.56` (`Studio.tsx:26`, was 2.05) + LED inboard to `[1.1, 0, 0.2]` (`:142`, was x=2.4 detached); ✅ F4/F9 `BuildCanvas` wrapped in `GlErrorBoundary` at call site (`Studio.tsx:1243-1257`); ✅ F5 `ROLE_CSS` now single-sourced equal to `ROLE_PARAMS` (all 6 roles match byte-for-byte); ✅ F8 x-ray select ternary (`CadViewer.tsx:299`).
- ⚠️ Carry-forward (NOT fail — needs visual sign-off, not text): workshop grids still `y=-2.2` (`CadViewer.tsx:578`, `Explorer.tsx:156`, `Studio.tsx:445`) post-leveling — re-verify plate-vs-grid gap on re-capture; rival still `colorMode="role"` + flat ring `2.2–2.6` at `y≈0.15` (`Studio.tsx:227-241`) — **this matches the wave brief ("Studio rival role paint") so it is the accepted end state**, but R22-F7 distinguishability advice (tighter ring, HUD edge indicator, red-green-vision check) stands for the re-capture session; Hero `ROLL`/hop metaphor + `ContactShadows -0.83` vs leveled half-height 0.56 — confirm spin (not wheel-roll) reads correctly.

## 4. Screenshots — ALL 12 STALE, exact re-capture list

Every capture in `audit/screenshots/` predates the wave (BEFORE: beige theme, `/336` tip numbers, 1360-cap wording, progress bar, 96-count, pre-level renders). Re-shoot all at desktop + 360×740 where noted; each row names the view and the proof it must show.

| File | View | Must visibly prove (post-fix) |
|---|---|---|
| `01-model-dark-render.png` | 3D viewer closeup | Leveled bot (plates horizontal), white paper, role paint incl. corrected `#c9ced4` chassis; no black-speckle regression |
| `02-home-hero.png` | `/` hero | White theme + `≤1361 g fight-ready` pill badge; rolling-letter headline over white |
| `03-overview-melty.png` | `/#02` | Cap strip reads 1361 g / 1360.8 g (not 1360) |
| `04-overview-steps.png` | `/#steps` | Step 7 `1361 g`; pill nav visible, no progress bar on scroll |
| `05-firmware-top.png` | `/#/firmware` top | Safety ladder T0–T4 (plus T1 caption fix when C1 lands) |
| `06-firmware-cards.png` | `/#/firmware` mid | Tune/failsafe/advisory cards on white; XT60+16 AWG wording (C2) |
| `07-engineering-calcs.png` | `/#/engineering` top | **Critical:** 8″ @2900 → **69.0 mph / 30.9 m/s** (≈208 J steel), NOT 216.9/2053 J; caption `/ 1056` |
| `08-engineering-balance.png` | `/#/engineering` mid | 188 g PASS + maxR + `≤18 mm` guidance (C4); spin-ups ≈89 (C3 label) |
| `09-engineering-mass.png` | `/#/engineering` bottom | Ti 1054.7 / steel 1245.0 rollup + phantom `~356 g / ~201 g` (S4) |
| `10-studio-drive.png` | `/#/studio` drive | Grounded bots (`REST_Y` 0.56), attached LED, rival role-paint + red ring distinguishable top-down + chase |
| `11-studio-controls.png` | `/#/studio` scrolled | Controls row + SR status on white pill styling |
| `12-explorer.png` | `/#/explorer` | `145 parts (89 meshed)` header; stats-only specks labeled; level model on white |

Still missing (physical, unchanged): scale photo at 1361 g, `firmware/failsafe-test.mp4`.

## 5. Exact remaining-edits list (file:line, copy-paste ready)

1. `manufacturing/P1-mass-audit.md:47` → `v_mph = D_in × RPM / 336 (≈ π·D·RPM/1056)` (S2)
2. `autonomy/SAFETY.md:116` → `at the stated 1361 g cap (3 lb = 1360.8 g)` (S3)
3. `autonomy/SAFETY.md:128` → `≤1361 g` (S3)
4. `web/src/pages/Engineering.tsx:151` → `~356 g steel (~201 g Ti)` phantom mass (S4)
5. `web/src/components/CadViewer.tsx:278` → `89 meshed nodes` comment (S5)
6. `web/README.md:57` → remove `scroll progress bar` (S7)
7. `manufacturing/materials-guide.md:21` → `π·D·RPM/60 in/s ×0.05682 = 95 mph` (C5)
8. `web/src/pages/Pages.tsx:291` → `T1 governor ~1 kHz; DShot600 packets @ 8 kHz` (C1)
9. `BOM.md:33,35`, `build-guide/02-electronics-setup.md:11`, `web/src/data/content.ts:101,141` → `XT60 trunk + 16 AWG; XT30 pack legs` (C2)
10. `web/src/pages/Engineering.tsx:129-130` → `E_SPIN_REF_J=995 @4000 empirical; 13 Wh usable (80% DoD); bench-measure V·I·t` (C3)
11. `web/src/pages/Engineering.tsx:120` → `within ~18 mm (max 22.4 mm @4000) + pot` (C4)
12. `web/src/pages/Engineering.tsx:92` → append `Thin-ring upper bound; true KE=½·I·ω² (10–30% lower)` (R24 #5)
13. `web/src/pages/Home.tsx:108` → add `role="group"` (R23 F4)
14. Round-21/22 polish backlog (one pass, Low/Info): `.meta`→`var(--muted)`, hamburger `border-radius:999px`, dual-edge scroll mask, `?? '#999'`→tokens, LED/rival token unification-or-comment, arena-floor seam, `#fff4e8` key light, grid `-2.2`→derived post-level constant, rival-ring tighten + color-vision check.

*Read-only audit — no source files modified. Line refs pinned to the working tree 2026-09-18 (uncommitted wave + HEAD `d448324`).*
