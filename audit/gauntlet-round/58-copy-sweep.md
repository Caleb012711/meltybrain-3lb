# Gauntlet 58 — Copy sweep (Bom Locked-spec + buttons, Home, Studio reel, sheet-metal)

Skill: `robotics-testing` (`.opencode/skills/robotics-testing/SKILL.md`) — named; copy sweep is outside its robotics-test scope, used read-only verification only.

## 1. "Parts specs" / "Parts list" / orphan /parts — PASS (with stale-route note)
- `web/src`: zero `Parts specs`; zero `to="/parts"` links (nav `web/src/data/content.ts:4-15` has no `/parts`).
- `Parts list` ×2 are Onshape-UI refs, not site links: `web/src/pages/Pages.tsx:70,82` — legitimate.
- Stale: `web/src/App.tsx:39` still routes `/parts` + `web/src/pages/Pages.tsx:221 Parts()` duplicates Bom locked rows verbatim (`Bom.tsx:125-133`). Bom lede `Bom.tsx:117-119` says "Merged here from the old Parts page". Fix: remove `/parts` route + `Parts()` or redirect `/parts` → `/bom`.

## 2. Bom Locked-spec vs costed tables — FAIL (XT60 vs XT30)
- Contradiction: locked `Bom.tsx:130` "XT60 mains, 16–20 AWG" vs costed `content.ts:100` "4S 550 mAh 95C XT30", `content.ts:140` "95C XT30", `content.ts:115` "Bullets, XT30". Wiring guidance agrees with locked: `Pages.tsx:38` "XT60 mains + 16 AWG (XT30 is 30A cont — inadequate)", `Pages.tsx:318` "XT60 mains, 16 AWG — XT30 … inadequate per 48A pack path". `BOM.md:33,35` hedges "XT30/XT60".
- Fix: `content.ts:100` → `4S 550 mAh 95C XT60 (2 flight sets)`; `content.ts:140` spec → `95C XT60`; `content.ts:115` → `Bullets, XT60, silicone wire`; `BOM.md:33,35` → lock `XT60 mains (balance lead per pack)`; or explicitly split mains-XT60 / balance-XT30 if that was intent.
- Duplication (minor): `Bom.tsx:69-70` repeats "Priced rows are checked listings; range rows move" twice in one lede; repeats again `Bom.tsx:78`. Fix: keep one legend sentence.
- Other rows PASS: motors/ESC/MCU/accels/radio/weapon (55.63cm³ ≈437g steel/246g Ti)/wheels/AI-kit match `content.ts:92-116`, `BOM.md:27-37`, Home/Pcbway numbers.
- Bom buttons PASS: `Bom.tsx:138-139` → `/explorer`, `/build`, both real routes (`App.tsx:34-35`).

## 3. Home buttons — PASS
- `Home.tsx:138-142` → `/build`, `/studio`, `/explorer`, `/onshape`, `/pcbway`; all exist `App.tsx:33-38`. Other Home links `/bom` (`:95`), `/firmware` (`:278`), `/printing` (`:273`) also real.

## 4. Studio fight-reel caption vs `tools/fight_render.py` — PASS
- Caption `Studio.tsx:1495-1510` claims: 22s scripted, same drive model, deterministic seed, Eyeliner lead-seek, rival wobble policy, 0.75× RPM hit cost. Reality: `DUR=22.0` (`fight_render.py:19`), `SEED=7` (`:17`), `eyeliner_intent` lead+wobble (`:52-65`), `rival_intent` wall/flee/lead+wobble (`:68-87`), `a.rpm*=0.75; b.rpm*=0.75` (`:141-142`), constants RPM_MAX/TAU/MAX_SPEED/K/GRIP/BOUNCE (`:23-28`) match `Studio.tsx:13-28`. KO ~19s (`:322-325`, docstring `:7`) matches aria-label (`:1503`). Outputs exist: `web/public/fight-night.mp4`, `web/public/fight-poster.jpg` match `src`/`poster` (`:1501-1502`). Note: py lacks `K_BRAKE`/brake (script never brakes) — "same drive model" acceptable, matches py docstring "Same flavor".

## 5. Sheet-metal rules — FAIL (one contradiction)
- Consistent: `manufacturing/pcbway/sheet-metal/README.md:1-22` (dumb flats, no bends/countersinks/pockets/holes/engraving, 1 thickness/order, holes ≥1.2× dia ≥2× edge, teeth CNC/waterjet) vs Pcbway page `Pages.tsx:130` "Flat armor … Laser only", `:126-130` materials table, `:153` SendCutSend alt vs `materials-guide.md:43-47,60` (AR500 teeth, 6061-T6 0.063-0.080in ≈1.6-2mm within 1.5-3mm, DXF-laser + SendCutSend alt) — all agree.
- Contradiction: `manufacturing/pcbway/README.md:52` "Laser cutting (+ bending only if part has bend lines)" vs sheet-metal `README:12-21` "no bends … two flat plates + standoffs, not a bent part" + Pcbway page "Laser only". Fix: delete parenthetical in `manufacturing/pcbway/README.md:52` → `Process: Laser cutting (no bends — flat covers only per sheet-metal/README.md)`.

## 6. lint + build — PASS
- `npm run lint` (web): pass, warnings only (oxlint react/set-state-in-effect, refs, immutability in Studio/HeroStage/CadViewer/Explorer/Hooks; `Bom.tsx:4` only-export-components).
- `npm run build` (web): pass — `tsc -b && vite build`, 589 modules, 2.28s.
