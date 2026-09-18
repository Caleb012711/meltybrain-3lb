# Gauntlet Round 21 — White-Theme Audit (paper #ffffff re-theme)

> Scope: `web/src/` full pass — leftover warm/beige hex sweep, contrast on white, 11-link pill nav + overflow + 360px + hamburger/drawer interplay (`Layout.tsx` + `Sidebar.tsx` + `index.css`), per-page hardcoded-color check, `npm run lint` + `npm run build` executed.
> Read-only audit — no source files edited. This report is the only write.
> Method note: the `skill` tool in this session exposes only `customize-opencode`, so both instructed skills were read directly from disk and applied:
> - `.opencode/skills/robotics-software-principles/SKILL.md` (896 lines) → Principle 10 Observe (every UI state must be visible/announced) + Principle 7 fail-safe defaults (no-input / invalid-input / loss → safe state) mapped to UI states in §5.
> - `.opencode/skills/robotics-testing/SKILL.md` (577 lines) → pyramid (token grep → component integration → lint/build system), deterministic checks (fixed hex list, computed contrast, no `sleep()`), explicit failure-case coverage in §6.

## 0. Verdict

**GO — no theme blockers. Zero beige leftovers, `:root` palette matches brief exactly, body-text contrast passes, pill-nav overflow + mobile fallback present, `lint` exit 0, `build` exit 0.** All findings are Low/Info polish (faint-text margin, one warm 3D light, `#999` fallbacks, hamburger radius, one-sided mask, dual active languages). Ship; fix backlog at leisure.

## 1. Palette conformance (brief vs code)

`web/src/index.css:2-19` matches the brief exactly:

| Token | Brief | Code | Status |
|---|---|---|---|
| `--paper` | `#ffffff` | `index.css:3 #ffffff` | PASS |
| `--surface` | `#ffffff` | `index.css:4 #ffffff` | PASS |
| `--inset` | `#f1f2f4` | `index.css:5 #f1f2f4` | PASS |
| `--line` | `#e5e7eb` | `index.css:6 #e5e7eb` | PASS |
| `--line-strong` | `#d4d7dd` | `index.css:7 #d4d7dd` | PASS |
| pill bar / buttons / tabs / minis `border-radius:999px` | pill-shaped | `index.css:58,67,89,103,114,116,320,334,345` | PASS (one exception §4-F4) |

## 2. Warm/beige leftover sweep — ZERO hits (PASS)

Command run in `web/` (exit 1 = no matches, i.e. clean):

```
grep -rn -i -E 'f6f5f1|efede7|e2e0d8|c9c6b8|f4f2ec' src/  →  EXIT:1, no output
```

Every hit that WOULD have counted (with `file:line`): none. No `beige/ivory/linen`-family tokens found either. The old warm paper system is fully gone from `src/` (SVGs excluded — see §4).

## 3. Contrast on white (computed WCAG ratios, white = `#ffffff`)

| Pair | Ratio | Verdict |
|---|---|---|
| `--muted` `#535861` on white (`index.css:9`, `.lede`, `.card p`, `.status`) | 7.15:1 | PASS AA normal |
| `--steel` `#3f4752` on white (nav links, eyebrow, path) | 9.40:1 | PASS |
| `.meta` `#5d636c` on white (`index.css:81`) | 6.06:1 | PASS — but hardcoded, not a token (F2) |
| `--faint` `#747a83` on white (`.stack-card .grp`, `index.css:359`, 11px uppercase) | 4.33:1 | **MARGINAL — fails AA normal 4.5:1**, passes AA-large/UI 3:1 (F1) |
| `--accent-text` `#b23600` on white (links, `.pill.hot`, stamps) | 6.14:1 | PASS |
| `--accent-text` on `--accent-wash` `#fff1e7` | 5.55:1 | PASS |
| white on `--ink` `#1a1d21` (active pill, pressed tabs) | 16.91:1 | PASS |
| white on `--accent-text` (`.btn.primary`) | 6.14:1 | PASS |
| `--ok` `#1a6b32` / `--danger` `#b42318` on white | 6.58 / 6.57:1 | PASS |
| `--ink` on `--inset` `#f1f2f4` (code chips `index.css:34-40`, `th`) | 15.10:1 | PASS |
| `--muted` / `--steel` on `--inset` | 6.38 / 8.39:1 | PASS |
| hero highlight `#9a2f00` on white (`HeroStage.tsx:329`) | 7.55:1 | PASS |
| `--accent-graphic` `#e8490f` on white | 3.90:1 | PASS as graphic only (brand-mark, rpm-fill, trail, emissive); **FAIL if ever used for body text** — currently never is (Info) |
| xray `#8a94a6` on white (`CadViewer.tsx:125`) | 3.06:1 | 3D-only, not text — OK |
| borders `--line-strong` `#d4d7dd` / `--line` `#e5e7eb` on white | 1.44 / 1.24:1 | Below 3:1 UI — by-design subtle (F3) |
| `--accent-wash` `#fff1e7` on white | 1.11:1 | Wash-on-paper has no edge by itself — borders carry it (Info) |

- **F1 [Medium] faint text marginal** — `src/index.css:10 --faint:#747a83`, used `src/index.css:359` (`.stack-card .grp`, 11px uppercase). 4.33:1 < 4.5:1 AA normal. *Fix:* darken to `#5d636c` or `var(--muted)` for that selector; keep `--faint` only for large/bold/metadata ≥18px.
- **F2 [Low] `.meta` hardcoded `#5d636c` duplicates `--muted`** — `src/index.css:81`. Passes contrast (6.06:1) but creates two greys for one role; drift risk (Principle 8: config over code). *Fix:* `color:var(--muted)`.
- **F3 [Low] pill/control borders below 3:1 UI** — `index.css:58,64,103,114,116,177-179,199,243,247,259` all rely on `#d4d7dd` (1.44:1) on white. Readable as hairlines by design; do NOT lighten further. *Fix:* none required; if stronger affordance wanted, add `box-shadow`/hover `border-color:var(--ink)` (already present on `.btn/.tab/.mini:hover`) rather than darkening all borders.
- Inset code chips (`code,.mono`, `th`, `.tracker`, `.render-figure figcaption`) all pass — no flag.

## 4. Pill nav — 11 links, overflow, active, mobile, hamburger/drawer

Nav source `src/data/content.ts:4-16` = 11 entries (Overview, 3D Studio, Explorer, Build, Onshape, PCBWay files, 3D printing, Parts, BOM + cost, Engineering, Firmware + AI) rendered `src/components/Layout.tsx:63-69` via `NavLink`.

- **Overflow [PASS with note]** — `index.css:65`: `display:flex; flex:1; overflow-x:auto; scrollbar-width:none` + `index.css:66` `::-webkit-scrollbar{display:none}` + right-fade mask `linear-gradient(to right,#000 96%,transparent)`. Hides scrollbar correctly on Firefox/WebKit, keeps keyboard-focus scrolling (Observe OK).
  - **F4 [Low] mask is right-side only** — after scrolling right there is no left fade, so the scrolled state has no overflow affordance on the left. *Fix:* dual mask (`transparent,#000 24px,#000 calc(100% - 24px),transparent`) toggled by scroll position, or accept (links remain reachable by keyboard/arrows).
  - No `scroll-padding`/`scroll-snap` — Info only; focus-scroll works natively.
- **Active pill [PASS]** — `index.css:69` `color:#fff;background:var(--ink)` = 16.91:1, `border-radius:999px` (`index.css:67`). High-visibility selected state (Observe exemplar).
- **Mobile 360px [PASS by construction, no explicit 360 rule]** — breakpoints present: 900px (nav→drawer `index.css:207`), 420px (brand truncate `index.css:129`: 13px + ellipsis + `img{display:none}`), 480px (touch-row), 1023/1024px (grids). No `360px` query exists — checked `grep 360px → no hits`. Analysis: ≤900px the scrollable `nav` is `display:none`, leaving only `.nav-left` (hamburger 44px + gap 10px + brand ~150px truncated + pill padding 28px ≈ 242px < 328px available at 360px viewport). Fits; `flex-wrap:nowrap` (`index.css:129`) prevents wrap-break. *Fix:* none in code; recommend one manual 360×740 device check (drawer 88vw = 317px, `part-list` 420px scroll, `help-card` 92vw — all constrain correctly in code).
- **Hamburger/drawer interplay [PASS, fail-safe sound]** — `Layout.tsx:48-72` owns `open` state + `triggerRef`; `HamburgerButton` (`Sidebar.tsx:5-26`) wires `aria-expanded/aria-controls/label`; `Sidebar` (`Sidebar.tsx:28-129`) implements: route-change auto-close (`:42-45`), body-scroll lock + restore (`:49-50,76`), initial focus into drawer (`:51-52`), focus trap (`:59-72`), Esc→close+refocus trigger (`:53-57`), backdrop click→close+refocus (`:83-91`), closed-state `tabIndex={-1}` + `aria-hidden` + `visibility:hidden` (`:99,110,121,194`). Reduced-motion disables drawer slide (`index.css:208-211`). Matches Principle 7 (loss of focus/route-change → safe closed state) and Principle 10 (expanded/labelled/trapped/announced).
  - **F5 [Low] hamburger is square in a pill bar** — `index.css:174-180` `border-radius:var(--radius)` (6px) vs brief "buttons/tabs/minis are pill-shaped" (all others 999px). *Fix:* `border-radius:999px`.
  - **F6 [Low] two active languages** — pill uses white-on-ink (`index.css:69`); drawer uses ink-on-wash + left bar (`index.css:206`). Intentional for orientation (vertical list) but inconsistent for Observe. *Fix:* document as intentional, or give drawer-link the same ink-pill on a vertical stack.
  - **F7 [Info] backdrop is `div[aria-hidden]` with mouse-only close** — keyboard users close via Esc/close-button (present and correct), so not a blocker; *optional fix:* `role="button"` + `tabIndex` or `inert` on background when open (currently `tabIndex=-1` pattern only).

## 5. Per-page hardcoded-color check (fight-the-theme?)

Full hex inventory (`grep -E '#[0-9a-fA-F]{3,8}'`, SVGs excluded): **no beige/warm page surfaces**. Item-by-item:

- `Home.tsx` — no hex at all; layout-only inline styles (`:117-118` poster padding/maxWidth). **PASS.**
- `Pages.tsx` — no hex. **PASS.**
- `Engineering.tsx` — no hex; sliders/selects use classes. **PASS.**
- `Bom.tsx` — no hex. **PASS.**
- `Explorer.tsx:150` `setClearColor('#ffffff')` matches paper **PASS**; `:156` grid `#c3c8d0/#e5e7eb` = cool greys matching line tokens **PASS**; `:392` fallback `?? '#999'` **F8 [Low]** — hardcoded mid-grey for unknown role; *fix:* `var(--line-strong)` or `var(--faint)`. Inline selected `var(--accent-wash)` + `var(--accent-graphic)` via vars **PASS**.
- `Studio.tsx:141` LED `#12b76a` vs token `--ok #1a6b32` **F9 [Low]** (two greens); `:237` rival `#c81e1e` vs `--danger #b42318` **F9 [Low]** (two reds) — both 3D/marker functional, not page chrome; *fix:* unify to tokens or comment as sim-legend colors. `:324` trail `#e8490f` = accent-graphic **PASS**; `:380` arena floor `#f7f8fa` vs paper `#ffffff` **F10 [Low]** — faint cool seam against `#ffffff` clear (`:432,:994`); *fix:* `#ffffff` or `var(--inset)` + comment. `:382,:442` grids cool-grey **PASS**; `:384` `#1a1d21` = ink **PASS**; `:389` walls `#22252a` near-ink intentional arena contrast **PASS (Info)**; `:1356` `?? '#999'` same as F8.
- `CadViewer.tsx:29,136` `#e8490f` = accent **PASS**; `:37` `#ffffff/#d8dce2` hemisphere, `:39` `#dfe8ff` cool fill, `:40` `#ffffff` **PASS**; `:46` Lightformer `#fff4e8` **F11 [Low] — the single warm-tinted hardcoded color in src** (peach key light tints metals warm against pure-white page); *fix:* `#ffffff` or `#f1f2f4`. `:125` xray `#8a94a6`, `:242` plain `#9aa1ab`, `:456` `#1a6b32` (= `--ok`) **PASS**; `:474-476` loader `#fff/#d4d7dd/#1a1d21` match tokens **PASS**; `:572,:578` clear/grid match paper/line **PASS**; `:728` `var(--danger)` via var **PASS**.
- `HeroStage.tsx:174,381` clear `#000000` alpha-0 over paper **PASS** (transparent canvas); `:192,:391` shadows `#1a1e23` near-ink **PASS**; `:329` `#9a2f00` 7.55:1 **PASS**; `:327` `rgba(232,73,15,…)` = accent-graphic **PASS**.
- `materials.ts:21-26` role palette (`#3b4046,#8a94a0,#a49d92,#33373c,#33404e,#0f6a3a`) is 3D-object color, not page chrome **PASS (Info)** — note `:23` `#a49d92` is taupe/beige-adjacent by material intent (Ti/hub); *optional:* cool to `#9aa1ab` or keep with comment.
- `Layout.tsx`, `Sidebar.tsx` — no hex. **PASS.**
- `index.css` non-token hex beyond palette: `#fff` (active states — matches paper, **PASS**), `#000` (mask — **PASS**), `#5d636c` (F2), `#f5c69e` warn border (`:153` peach — intentional warning affordance, pairs with `--accent-wash`; **Info**, cooler alternative `#e5e7eb` would lose meaning), `#fef2f2/#f5b8b1` danger (`:154` intentional pink; **Info**), `#8e2a00` primary hover (`:281` darker accent; **PASS**).
- `assets/react.svg (#00D8FF…), vite.svg (#9135ff…)` — toolchain logos, not theme surfaces; out of scope, no action.

## 6. Principle 10 (Observe) + Principle 7 (fail-safe) — UI-state matrix

| UI state | Observable? (P10) | Fail-safe? (P7) |
|---|---|---|
| Route loading (`App.tsx:19-29` Suspense: spec-plate + mono "Loading sheet…") | ✅ `role=status` | ✅ safe static, no spinner hang |
| CAD loading (`CadViewer.tsx:461-486` LoaderBar "LOADING CAD — n%") | ✅ percent announced | ✅ GLB fail → fallback below |
| WebGL loss (`GlErrorBoundary` + `failed` in CadViewer `:539`, Explorer `:132`, Studio `:978`, HeroStage `:410`) | ✅ render + STEP links + Retry 3D | ✅ never blank: poster image + downloads work |
| Empty search (`Explorer.tsx:414-430`, `Studio.tsx:1367-1384` "No parts match" + Clear filters) | ✅ count `entries/count shown`, `aria-live` readout | ✅ one-click reset |
| Parts manifest absent (`Explorer.tsx:352-357` skeleton rows) | ✅ shimmer rows | ✅ falls back to `model.solids` count |
| Reduced motion (`usePrefersReducedMotion` in Hero/Explorer/Studio/CadViewer; `index.css:22-25,168-169,208-211`) | ✅ still image + disabled spin/trail with `title` reason | ✅ defaults OFF (safe = static) |
| Drive viewport (`Studio.tsx:962-1159`: 10 Hz HUD + 4 s SR announcements, `role=status`, `progressbar`, brake indicator, disarm on blur/hidden/Esc) | ✅ RPM/SPD/THR/grip/pos + state classes | ✅ `disarm()` zeroes move/throttle/brake/stick; `visibilitychange`/`blur` auto-stop; brake releases on pointer-leave/cancel |
| Tour persistence (`Studio.tsx:593-609` localStorage try/catch) | ✅ dialog + Skip (Esc) | ✅ private-mode never throws |
| Drawer/backdrop (§4) | ✅ labelled/trapped/restored | ✅ closed-by-default, route-change closes |
| Gaps | F1 faint 4.33, F4 one-sided mask, F7 backdrop mouse-only (all Low/Info) | No unsafe default found; RPM/throttle/explode/hidden/isolated all reset on model change (`Explorer.tsx:37-46`, `Studio.tsx:1208-1218`) |

## 7. Systematic verification log (robotics-testing pyramid)

1. **Unit (token) level:** case-insensitive grep of all 5 banned beige hexes → 0 hits; full hex inventory enumerated (§5); `:root` 5-token diff vs brief → exact.
2. **Integration (component) level:** Layout↔Sidebar open/focus/close/trap/route-change traced in code; nav 11-link render path `content.ts → Layout → Sidebar` confirmed; Explorer/Studio/CadViewer/Hero fail-safe fallbacks traced.
3. **System level:** `npm run lint` → **exit 0** (28 warnings, 0 errors: `only-export-components` ×4, `immutability/refs/set-state-in-effect/exhaustive-deps/preserve-manual-memoization` — all pre-existing React-compiler style hints, none theme-related). `npm run build` → **exit 0** (`tsc -b` + `vite build`, 589 modules, ~1.38 s; note `CadViewer` chunk 1025 kB / 278 kB gzip — pre-existing 3D weight, Info only).
4. **Deterministic, no-`sleep()`:** contrast via WCAG formula (table §3), breakpoint grep (`360px:0 / 420px:1 / 480px:1 / 900px:n / 1023px:n`), no timing-dependent asserts.
5. **Failure cases probed in code:** WebGL off, STL >20 MB / unparsable (`CadViewer.tsx:517-536` + `role=alert`), stats-only parts (isolate/hide disabled with `title`), saturated accel stamp (`Engineering.tsx:116`), overweight teeth verdicts, private-mode storage, `prefers-reduced-motion`.

## 8. Findings index (severity + fix)

| ID | Severity | Location | Finding | Proposed fix |
|---|---|---|---|---|
| F1 | Medium | `index.css:10,359` | `--faint #747a83` 4.33:1 on white for 11px uppercase group labels — below AA 4.5 | Use `#5d636c`/`var(--muted)` for `.stack-card .grp`; reserve `--faint` for large/metadata |
| F2 | Low | `index.css:81` | `.meta #5d636c` hardcodes a second grey beside `--muted` | `color:var(--muted)` |
| F3 | Low | `index.css:58…` borders | `line/line-strong` 1.24/1.44:1 UI contrast — subtle by design | No change; rely on existing hover `border-color:var(--ink)` |
| F4 | Low | `index.css:65-66` | Scroll mask right-only; hamburger `radius:6px` vs pill system | Dual-edge mask; `.hamburger{border-radius:999px}` |
| F5 | Low | `index.css:206` vs `:69` | Drawer-active (wash+bar) vs pill-active (ink) — dual language | Document intentional or unify |
| F6 | Info | `Sidebar.tsx:83-91` | Backdrop mouse-only (keyboard has Esc/close) | Optional `inert`/role; not blocking |
| F7 | Low | `CadViewer.tsx:46` | `#fff4e8` warm Lightformer — only warm hardcoded light | `#ffffff` or `#f1f2f4` |
| F8 | Low | `Explorer.tsx:392`, `Studio.tsx:1356` | `?? '#999'` fallback grey | `var(--line-strong)`/`var(--faint)` |
| F9 | Low | `Studio.tsx:141,237` | LED `#12b76a`/rival `#c81e1e` duplicate `--ok`/`--danger` | Unify to tokens or comment as legend colors |
| F10 | Low | `Studio.tsx:380` | Arena `#f7f8fa` vs `#ffffff` clear seam | `#ffffff` or inset + comment |
| F11 | Info | `materials.ts:23` | Pod `#a49d92` taupe reads beige-adjacent (material intent) | Keep + comment, or cool to `#9aa1ab` |

No Critical/High findings. No beige-hex hits to list (clean). No unreadable body text (only F1 marginal).

## 9. Repro

```
cd web
grep -rn -i -E 'f6f5f1|efede7|e2e0d8|c9c6b8|f4f2ec' src/   # expect exit 1
grep -rn -E '#[0-9a-fA-F]{3,8}\b' src/ | grep -v '.svg:'
npm run lint   # exit 0, 28 warnings
npm run build  # exit 0, 589 modules
```
