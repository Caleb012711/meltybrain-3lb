# Gauntlet 51 — Parts→BOM menu merge verification

Skills read from disk (`/workspaces/meltybrain-3lb/.opencode/skills/`): `robotics-testing`, `robotics-software-principles`. Applied: deterministic replay / regression check on spec rows; fail-safe defaults on battery-connector wording; observe-everything (file:line evidence).

## 1 — Nav array: 10 entries, no Parts, order sane — PASS
- `web/src/data/content.ts:4-15`: 10 entries (`/` `Overview`, `/studio`, `/explorer`, `/build`, `/onshape`, `/pcbway`, `/printing`, `/bom`, `/engineering`, `/firmware`). No `to: '/parts'`, no `Parts` label. Order sane (viewer → build flow → order → reference).

## 2 — Sidebar + pill bar consume same array — PASS
- Pill bar: `web/src/components/Layout.tsx:64` (`nav.map` over imported `nav` from `../data/content:4`).
- Sidebar: `web/src/components/Layout.tsx:72` (`<Sidebar nav={nav}>`); `web/src/components/Sidebar.tsx:28-37` (prop `nav: NavEntry[]`) + `:115` (`nav.map`). Single source of truth, no fork. No `parts` string in either file.

## 3 — `/parts` route still renders, zero dead references — PASS
- `web/src/App.tsx:10` (`lazy … m.Parts`), `:39` (`<Route path="parts" element={<Parts/>}>`), export exists `web/src/pages/Pages.tsx:221` (`export function Parts()`). Deep-link reachable, absent from nav as intended.

## 4 — BOM Locked-spec (9 rows) vs old Parts rows — FAIL (1 intentional wording drift, no spec lost)
- BOM: `web/src/pages/Bom.tsx:125-133`. Old: `web/src/pages/Pages.tsx:222-231`. Scripted tuple diff: 8/9 identical.
- DIFF row 5 Battery: Parts `:228` says `XT30,` / BOM `:130` says `XT60 mains,`. All other cells (item/spec/qty) byte-identical incl. Weapon `55.63 cm³ ≈ 437 g steel / 246 g Ti` and AI-kit `about 40 g`.
- Assessment: drift is a safety *fix*, consistent with `Pages.tsx:37-38` (`XT60 mains + 16 AWG (XT30 … inadequate)`) and `Pages.tsx:318` (`XT60 mains, 16 AWG — XT30 … inadequate`). No capability lost. Fix (READ-ONLY, not applied): either sync `Pages.tsx:228` to `XT60 mains` or note intentional correction in changelog; do not revert BOM to XT30.

## 5 — Grep `src/` for remaining `to="/parts"` — PASS
- Regex `to="/parts"|to='/parts'|href="/parts"` over `web/src/**/*.{ts,tsx}`: zero hits (re-ran 2026-09-18). Remaining `Parts` hits are benign (`CadViewer` `useModelParts`/`loadParts`, `Studio`/`Explorer` part-lists, Onshape `Part Studio` prose, `Bom.tsx:118` historical note `Merged here from the old Parts page`).

## 6 — No other page references removed nav item; Bom+Build buttons rewired — PASS
- `Bom.tsx:137-140`: `to="/explorer"` (`Inspect parts in 3D`) + `to="/build"` (`Build guide`). `Pages.tsx:46-49` (Build): `to="/onshape"` + `to="/bom"` (`Locked spec + costs`). `Home.tsx:95` → `/bom`, `:134,138` → `/build`, `:140,249` → `/explorer`; `Engineering.tsx:167` → `/bom`. No stale `/parts` CTA anywhere.

## 7 — `npm run lint` + `npm run build` — PASS
- `npm run lint` (oxlint): exit 0; only pre-existing warnings (`Studio.tsx`, `CadViewer.tsx`, `Explorer.tsx`, `Bom.tsx:4` fast-refresh, `hooks.ts` set-state-in-effect). No errors.
- `npm run build` (`tsc -b && vite build`): exit 0, `tsc` clean, 589 modules, `dist/` emitted (`Bom-*`, `Pages-*` chunks). Confirms shipped `tsc clean` claim.

## Verdict: CONDITIONAL GO
- Ship-safe: nav/route/buttons/lint/build all green; 9-row spec preserved. Sole FAIL is Battery `XT30→XT60 mains` wording, which is the correct fail-safe value — record it, sync the legacy `Parts.tsx:228` string, then close.
