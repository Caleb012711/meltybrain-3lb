# MASS AUDIT — meltybrain 3lb

Method: FreeCAD headless (`/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd -c "exec(...)"`), script `audit_v2.py` / `audit_v3.py` in this folder.
For each STEP file: `Import.insert`, `doc.recompute()`, walk leaf objects (skip `App::Origin/Line/Plane/Point` + group containers), `Shape.Volume / 1000 = cm³`, `Shape.BoundBox` as fallback/geometry check.
Top-level `App::Part` containers have no own shape (or duplicate children) → skipped to avoid double-count. Each explicitly instanced solid (e.g. 2× teeth) is counted once per instance — correct for assembly mass.

CAD source (read-only, untouched): `../cad/` — `Main CAD.step` (17.78 MB), `Wheel Pod.step`, `Standard Weapon Teeth.step`, `Undercutter Config.step`.
Full leaf dump: `volumes_all.csv` (145 leaves, Main CAD).

Densities (g/cc): AR500 steel 7.85, Ti-6Al-4V 4.43, 6061-T6 2.70, TPU ~1.21, PLA+ 1.24, UHMW 0.94, polycarbonate 1.20. Rubber ~1.10 (wheels, estimate). Steel fasteners/bearings 7.85.

## Measured volumes (Main CAD.step, leaf-sum = 319.948 cm³ over 145 leaves)

| # | Label (STEP tree) | BBox mm | Vol cm³ | Assigned material | Mass |
|---|---|---|---|---|---|
| 1 | `Chassis` | 137.7×131.5×167.8 | 80.134 | TPU cradle (see materials.md) | 80.134×1.21 = **97.0 g** |
| 2 | `Bottom Plate` | 136.5×127.7×3.5 | 32.668 | 6061-T6 | 88.2 g |
| 3 | `Standard Weapon Teeth` + `001` (2 instances) | 127.0×115.4×108.7 ea | 27.815 ea, **55.629 tot** | **BRANCH** (see below) | steel **436.7 g** / Ti **246.4 g** |
| 4 | `Outer Top Plate` | 136.5×127.7×3.9 | 25.651 | 6061-T6 | 69.3 g |
| 5 | `Central Top Plate` | 65.8×70.9×3.5 | 5.974 | 6061-T6 | 16.1 g |
| — | Plates subtotal | — | **64.293** | 6061-T6 | **173.6 g** |
| 6 | `SOLID001` (unidentified — likely wheel/hub placeholder, Ø50.9×20) | 50.9×50.9×20.0 | 18.700 | rubber/TPU ESTIMATE | 18.7×1.10 ≈ 20.6 g |
| 7 | `COMPOUND006`+`009`, `COMPOUND007`+`010` (2 pods × 2 shells) | 47.9×32.7×26.8 / 36.1×30.8×22.0 | 10.479 ea + 11.858 ea = **44.674** | TPU pod shells | 54.1 g |
| 8 | `COMPOUND`+`003`, `COMPOUND001`+`004` (pod internals, 2×) | 26.6×35.8×22.6 / 28.7×36.9×22.0 | 4.305 ea + 3.609 ea = **15.828** | TPU | 19.2 g |
| 9 | `Mesh Modifier`+`001` (2× wheel/tire mesh bodies) | 32.0×37.7×35.0 | 4.474 ea = **8.949** | TPU/rubber | 10.8 g |
| — | Pod-shell subtotal (8 COMPOUNDs + 2 Mesh) | — | **69.453** | TPU | **84.0 g** |
| 10 | `SOLID002`+`SOLID003` (2×, 29.4×34.5×32.0) | — | 5.760 ea = 11.520 | rubber/TPU ESTIMATE | ≈12.7 g |
| — | Unidentified SOLIDs total (SOLID001+002+003) | — | **30.220** | rubber @1.10 EST | **33.2 g** |
| 11 | Fasteners measured: 6× 4-40 tapping screw (0.122 ea) + 8× M3×8 SHCS (0.117 ea) + 1× 2-56 (0.047) | — | **1.715** | steel | **13.5 g** |
| 12 | 2× hex nut 90593A004 | — | **0.312** | steel | **2.4 g** |
| 13 | Bearings 7804K136 fragments (2×0.116 + 2×0.033 + misc) | — | **0.322** | steel (placeholder frag — real bearing mass in COTS) | 2.5 g (see note) |
| — | Remainder (~18 cm³): motors/ESC/BEC/RX/PCB/wiring placeholders (`Motor*`, `AM32*`, `Placa_Base`, `Receptor`, `Heat Sink`, `TYPE C TO RJ45`, PCB lines) | — | — | **NOT volumed — catalog masses used instead** | — |

Cross-checks (standalone files, same method):
- `Standard Weapon Teeth.step`: 2 leaves × 27.815 = **55.629 cm³** — matches Main CAD pair. ✔
- `Undercutter Config.step`: 4 COMPOUNDs (2×11.858 + 2×10.479) = **44.674 cm³** + 6 screws. Undercutter tooth set is **10.955 cm³ smaller** than standard.
- `Wheel Pod.step`: 25 leaves, 12.254 cm³ (COMPOUND 4.305 + 3.609 + motor placeholders + screws/nut + bearing frags). Single-pod file ≠ Main CAD's 2-pod installed total — expected.

No bbox >150 mm exists in CAD as modeled (largest: Chassis 137.7 mm). There is **no 8–9 in (203–229 mm) ring solid in the current STEP** — the spinning mass as modeled is the teeth pair + (missing or not-yet-modeled) ring. Ring mass below is therefore computed parametrically from teeth envelope; treat ring/teeth as one weapon-mass line. Honest flag, not hidden.

## Catalog (COTS) masses — estimates, not CAD volumes

| Item | Basis | Mass |
|---|---|---|
| 2× RS2205 drive motors (mounted in pods) | datasheet ~30 g ea | 60 g |
| 2× AM32 35A ESC + BEC + switch + RX (FS2A mini) + XIAO ESP32-S3 + ADXL375 + wiring/connectors/heat sinks | measured prior builds / datasheets | 60 g |
| Battery 3S 450–550 mAh (incl. lead) | datasheet | 55 g |
| Real bearings (2× 6800-class / wheel) | catalog | 10 g (STEP bearing frags are placeholder shards — the 2.5 g above is NOT used; use 10 g here, do not double-count) |
| Contingency (zip ties, tape, Loctite, shims) | — | 10 g |
| **COTS subtotal** | | **~195 g** |

Bearing note: STEP `7804K136*` leaves are sliver fragments (0.001–0.116 cm³), not real races — volumed 2.5 g is listed for traceability only and **excluded** from totals; the 10 g catalog line replaces it.

## Assembly totals

Fixed (non-weapon) mass, measured + catalog:
plates 173.6 + chassis/TPU 97.0 + pod shells 84.0 + SOLIDs 33.2 + fasteners (13.5+2.4) 15.9 + COTS 195 = **598.7 g** (≈599 g).

| Branch | Weapon (measured vol × density) | Total | vs 1361 g cap | vs 1310 g target |
|---|---|---|---|---|
| A — Standard teeth, **AR500** (default) | 55.629×7.85 = 436.7 g | 599 + 436.7 = **1035.7 g (~1036 g)** | **−325 g PASS** | **−274 g PASS** |
| B — Standard teeth, **Ti-6Al-4V** | 55.629×4.43 = 246.4 g | 599 + 246.4 = **845.4 g (~845 g)** | −516 g | −465 g |
| C — Undercutter, AR500 | 44.674×7.85 = 350.7 g | **949.4 g (~949 g)** | −412 g | −361 g |
| D — Undercutter, Ti | 44.674×4.43 = 197.9 g | **796.6 g (~797 g)** | −564 g | −513 g |

Totals exclude the not-yet-modeled outer ring hoop (see crossover). If a separate 8–9 in hoop is added, add its mass to the weapon line.

## Verdict

- **As modeled (teeth-as-weapon, no separate hoop): Branch A (AR500) PASSES** — ~1036 g all-up, ~325 g under cap, ~274 g under the 1310 g internal target.
- **Default stays AR500.** Ti is a weight-reduction upgrade, not currently mandatory. Spend the margin on reliability (spares, thicker plates where cracked, bigger battery) before chasing Ti.
- Risk: margin evaporates if (a) a separate 8–9 in ring hoop is added on top of teeth, (b) chassis/pods print heavier than 100% TPU math (infill, walls, hardware inserts), or (c) battery grows to 4S/850 mAh. Re-weigh on scales at each milestone; CAD math is ±10–15% until then.

## Top diet swaps (gram savings, computed from measured volumes)

1. **Weapon AR500 → Ti-6Al-4V (standard teeth): −190.3 g** (436.7→246.4). Undercutter Ti vs standard steel: −238.8 g. Single biggest lever. Cost: $$$, tooth life.
2. **Standard → Undercutter profile (keep steel): −86.0 g** (55.629→44.674 cm³). Stacks with Ti: undercutter-Ti = −238.8 g vs baseline.
3. **Plates: pocket/lighten 6061 or poly window in Outer Top Plate: −20 to −45 g.** e.g. replace ½ of Outer Top Plate (12.8 cm³) with 2 mm polycarb (1.20 vs 2.70): 12.8×1.50 = −19.2 g; aggressive pocketing 15 cm³ out = −40.5 g at Al density.
4. **Chassis TPU → UHMW or lightened TPU (85% infill): −15 to −22 g.** 80.134×(1.21−0.94) = −21.6 g for UHMW; −14.5 g at 85% TPU.
5. **Pod shells TPU → thin-wall + UHMW inserts: −10 to −18 g.** 69.453×(1.21−0.94) = −18.8 g full swap; realistic −10 g.
6. **Fasteners steel → Ti (M3 + 4-40, 2.03 cm³): −7.0 g** (2.03×(7.85−4.43)). Cheap in grams, expensive in dollars — do last.
7. **Battery 550→450 mAh 3S: −10 to −15 g.** Only if runtime allows.
8. **SOLID/wheel placeholders → hollow rubber (20% void): −6 g.** Verify on scale; placeholder geometry is suspect.

Order of operations: fly steel standard → weigh → if over 1310 g target, cut undercutter profile first (free), then chassis/pods infill, then Ti weapon (last resort, biggest check).
