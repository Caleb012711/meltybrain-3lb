# Gauntlet 05/10 — Blades Interface (modular weapon)

> Agent 5/10 (blades-interface). Date 2026-09-18. Spec: `audit/autonomy-plan-2026-09-18.md` §3.
> Builder doc: `manufacturing/blades/BLADES.md` (this report is the audit trail).
> Constraint: docs/new files only — NO CAD remodeling this round (§6 out of scope).

## 1. Skills (mandate compliance)

- Attempted via `skill` tool: `robotics-design-patterns` → **not found**;
  `robotics-software-principles` → **not found**. Only registered skill in this
  environment is `customize-opencode` (loaded, irrelevant — opencode config
  schema only). Full `robotics-*` / superpower suite from autonomy-plan §5 is
  unavailable here, so §3 FSM/HAL/BT patterns are applied from first principles
  and cited as such rather than fabricated.
- Design drivers used anyway: fail-safe defaults + rate separation (governor
  owns spin; blades are passive steel), HAL thinking (one hub interface =
  hardware abstraction for three end-effectors), FSM discipline (swap →
  hand-spin → 1000 RPM → jig → ramp, no skipped states).

## 2. Scope files read (all, fully)

1. `audit/autonomy-plan-2026-09-18.md` (110 lines) — §3 locks: one bolt circle +
   tapered register, symmetric-only, trim-screw balance, A/B/C configs, 55.63 cm³
   → 437 g steel / 246 g Ti card, <10 min one-hex swap, hand→1000→jig ritual,
   spares extending BOM §4.
2. `build-guide/01-frame-assembly.md` (18 lines) — M2/M2.5/M3 hex, scale 0.1 g,
   calipers, blue 243, 24 h cure, symmetric 2-tooth NO extra holes, diagonal star,
   hang-on-point jig, trim screws never drill, 3–5 g = hop at 3000 RPM, 4+
   orientations, 12.9 + 243 checklist.
3. `manufacturing/P1-mass-audit.md` (47 lines) — cap 1361 g / target 1310 g,
   Branch E only flies, 80.1 cm³ body must not be steel, Ti relief valve
   437→246 g teeth pair, tip-speed 8″@4000 ≈ 95 mph.
4. `BOM.md` §1 (67 lines) — weapon row: `Standard Weapon Teeth.step` OR
   `Undercutter Config.step`, steel/Ti, 1 + spares; §2 Liftoff Rev9 stack locked;
   §4 spares; weight split blanks (Gate B NO-GO, carried).
5. `manufacturing/pcbway/README.md` (72) + `ORDER-CHECKLIST.md` (35) +
   `cnc/README.md` + `sheet-metal/README.md` — one STEP per part AP214 mm,
   DXF flat 1:1, 6061/7075/AR500-Ti material picks, ISO 2768-m + H7 bearing bores,
   preview scale M3 3.2 mm, spares 2+, no assemblies/STLs.
6. `manufacturing/materials-guide.md` (60) — AR500 ring default, Ti relief only,
   6061 plates + poly LED window, TPU cradle, Ti cleats (no foam), 12.9 + 243,
   2–3 g trim budget, holes = crack starters, single-tooth+counterweight = yeet.
7. Cross-reads: `build-guide/00,02,03`, `audit/match-ready-audit-2026-09-18.md`
   (Gates A–E, 1360-vs-1361 wording split, stale `/tmp/opencode` path flag).

## 3. CAD verification (executed, not assumed)

- `ls` root: `Main CAD.step` 17 784 945 B, `Standard Weapon Teeth.step` 301 113 B,
  `Undercutter Config.step` 468 612 B, `Wheel Pod.step` 4 216 277 B; mirrors in
  `web/public/cad/` + GLBs (716 KB teeth / 844 KB undercutter per match-ready §1).
- Re-ran P1 method via OCP `STEPControl_Reader` + `BRepGProp.VolumeProperties`:
  - Standard Teeth: **2 solids, 55 629.2 mm³ = 55.63 cm³ → 436.7 g steel /
    246.4 g Ti** — matches audit 55.6 / 437 / 246 to 0.3 g. ✅
  - Undercutter: **10 solids, 45 408.3 mm³ = 45.41 cm³ → 356.5 g steel /
    201.2 g Ti** — matches audit 45.4 / 356 / 201. ✅
  - 10 solids in B = teeth + carrier conflated — next CAD pass must isolate
    carrier vs teeth volumes and re-card separately (flagged in BLADES §4).
- No STEP for config C wedge exists (root + `web/public/cad/` + GLBs all lack
  it). C card is therefore estimate + formula, explicitly marked unverified.

## 4. Interface decisions (with rationale)

- **D1 — ONE common PCD, 6× M4 even pattern.** 6-hole @60° preserves 180°
  symmetry (clocks at 0°/60° staying balanced); odd counts break it. PCD shared
  by all carriers; largest PCD the hub flange allows (lower bolt shear/hit).
  Verification gate before ordering: overlay hub + all carriers in CAD — B's
  carrier re-exported to hub PCD if mismatched (no metal until they match).
- **D2 — Tapered register carries center, bolts carry clamp.** Clearance holes
  slip 0.1–0.3 mm = fatal at 4000 RPM; ~7–10° taper spigot/bore, 2–3 mm
  engagement, <0.05 mm TIR, IPA-cleaned every install, seats BEFORE any bolt is
  tightened. Standard precision-joint practice, not invention.
- **D3 — Hardware: 6× M4×0.7 12.9 SHCS + hard flat washers + Loctite 243,
  ONE 3 mm hex.** M4 SHCS is driven by a 3 mm hex — satisfies "one hex size"
  within the 01 tool list (M2/M2.5/M3 hex). 12.9 + 243 per 01 + materials-guide;
  SHCS over button for socket engagement under shock; no split-locks (fragment).
  Torque 3.0–3.5 N·m final in 3-pass star (1 → 2 → final; dry-book 4–5 N·m minus
  20–30% for 243 wetting) + 24 h cure + paint-pen witness marks. No-torque-driver
  fallback: snug star + 90° star + marks (documented, not preferred).
- **D4 — Symmetric-only + never-drill, enforced by geometry.** Trim budget 2–3 g
  via ≥2 opposed M3 pairs in the carrier FLANGE (never rim); teeth as
  pre-balanced pairs ≤0.5 g match, L/R marked, swapped together; chamfer
  0.5–1 mm × 45° (knife edges fold → instant unbalance). Rationale: holes =
  stress risers × centrifugal preload × impact fatigue; 3–5 g asymmetry = hop;
  Liftoff single-tooth lesson. This is §3 + 01 + materials-guide §3.1 combined,
  not new opinion.
- **D5 — Mass cards branch steel-default / Ti-relief.** A steel 436.7 g pair is
  the KE-max default; Ti saves ~190 g (A) / ~155 g (B) iff scale >1310 g target.
  C wedge ~275/155 g @ assumed 35 cm³ — ordering BLOCKED until CAD measures it.
  Every card weighed WITH its bolt stack + trim map (fasteners ~60 g line in
  audit Branch D is real — don't card bare teeth).
- **D6 — Swap <10 min is a pit drill, not a hope.** Timed table (0:00–9:30) with
  segregated bolt sets per config (different stacks stay with their carrier),
  straight-lift off taper (no rim prying), IPA + inspect + 243 + star + trim map
  + scale + ritual. Abort criteria (cross-thread / no-seat / walked witness)
  stop the clock — a forced swap is a thrown blade.
- **D7 — Spin ritual is a 5-state FSM, no skips:** hand-spin (zero rub, pointer
  TIR) → 1000 RPM box (LED/authority/hop check per 03 §8.1) → jig 4+ orientations
  (0/90/180/270 level-any-rotation per 01) → ramp 2000→3000→4000 with heat checks
  (03 §8.3) → signed pit card. Short-cure joints re-torqued after first heat.

## 5. Cross-checks vs repo

| Claim | Source | Result |
|---|---|---|
| Teeth 55.63 cm³ → 437 steel / 246 Ti | P1 audit:12 + OCP re-run §3 | ✅ agree 0.3 g |
| Undercutter 45.4 cm³ → 356 / 201 | P1 audit:13 + OCP §3 | ✅ agree |
| 12.9 + 243, star, 24 h, 4+ jig, never drill | 01:4,10–11,15 + materials §3.6 | ✅ locked into BLADES §§1–3,6 |
| Weapon row STEP OR + steel/Ti + spares | BOM §1:17 | ✅ extended to A/B/C + checklist rows (BLADES §7); BOM edit itself left to main-agent dedupe |
| One-file STEP mm / DXF flat / H7 / scale | pcbway pack | ✅ mirrored in BLADES §7 incl. naming + SendCutSend alt |
| Branch E only flies; 80 cm³ not steel | P1:29,35 | ✅ §4 branch logic |
| 1360 vs 1361 wording | match-ready §1/§3 | ⚠️ carried — BLADES uses 1361 cap + 1310 target, flags single-number cleanup as Gate B item |
| Stale `/tmp/opencode/step_audit.py` | P1:39–45 | ⚠️ carried — §3 used inline OCP instead; recipe path still stale |
| Wedge STEP | none on disk | ❌ absent — C blocked, correctly scoped as spec-only |

## 6. Files written

- `manufacturing/blades/BLADES.md` — builder interface doc (configs, PCD+taper,
  symmetric rule, M4/243/3 mm-one-hex torque, measured A/B + estimated C cards
  with branch logic, timed swap, 5-state ritual, pcbway rows, spares kit).
- This file — `audit/gauntlet-round/05-blades-interface.md`.

No CAD touched. No BOM/site/firmware edits (left for main-agent dedupe to avoid
10-agent merge collisions). No PCB/motor/ESC changes (out of scope).

## 7. Verdict

- **Interface spec: GO** — buildable from BLADES.md alone; all §3 bullets
  addressed; numbers re-verified against CAD, not copied.
- **Fight-ready with blades: CONDITIONAL GO** — gated on: (a) CAD overlay
  confirming ONE shared PCD + taper + isolated B carrier volume + measured C
  volume; (b) per-config weighed cards + ≤1361 g scale photo (Gate B still NO-GO
  repo-wide); (c) filmed <10 min swap + ritual (Gate A film culture applies).
- **Residual risks:** C wedge unmeasured (heaviest unknown); B 10-solid conflation
  hides carrier-vs-teeth split; short-cure fight-morning swaps (mitigate: re-torque
  + mark-check every match); no torque driver in pit (mitigate: fallback + marks);
  1360/1361 + stale re-run path still in repo; 80 cm³ body material decision still
  open — it decides whether steel A can fly at all. TRC: blades are passive steel,
  no autonomy pre-clear implication; standard SPARC edge/radius + lock/cover rules
  still apply at event.
