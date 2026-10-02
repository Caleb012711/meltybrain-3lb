# Meltybrain 3lb — CAD

Source STEP files live in this folder next to this README. Do not edit the
`.step` / `.png` files — they are the read-only export set.

Render preview: `eyeliner_summer_2025_render.png`

## Files — what each contains

| File | Size | What it is |
|---|---|---|
| `Main CAD.step` | 17.8 MB | **Full robot assembly. Start here.** Chassis (`Main Chassis`, `Core`), electronics (`Seeed Studio XIAO-ESP32-S3`, `XIAO-ESP32S3 v2`, `ITG-MPU`, `Adafruit ADXL375`, `BEC v4`, `Fingertech Mini Power Switch`, `SKTAAAE010`, USB-C port, Receiver/ESC/I2C/12V/5V wiring dummies, `Elec`), 2× `Wheel Pod` subassemblies (RS2205 motors, `7804K136` bearings, `Wheel Assembly`), 2× Standard Weapon Teeth, `Undercutter Config` teeth, `Weight Calcs Here` core. |
| `Wheel Pod.step` | 4.2 MB | Single drive pod subassembly: RS2205 motor parts (`Motor`…`Motor005`), full `7804K136` stainless ball-bearing set, 4× M3×8 SHCS (ISO 4762) + hex nut (`90593A004`), wheel bodies (`COMPOUND`, `COMPOUND001`). Useful when working on drive / wheel clearance without loading the full assembly. |
| `Standard Weapon Teeth.step` | 0.29 MB | One mirrored pair of the standard (horizontal-spinner style) weapon teeth: `Standard Weapon Teeth` + `Standard Weapon Teeth001`. Standalone copy of the same bodies that appear in Main CAD. |
| `Undercutter Config.step` | 0.46 MB | Undercutter weapon option: 2× teeth (`COMPOUND`/`COMPOUND001` + `COMPOUND003`/`COMPOUND004` inside `Undercutter Config Tooth` containers) + 6× 4-40 × 0.75 flat-countersunk tapping screws (ANSI B18.6.4). |

## Measured stats (FreeCAD `freecadcmd`, Import STEP)

Method: `Import.insert()` per file, `doc.recompute()`, sum `Shape.Solids` /
`Shape.Shells` / `Shape.Volume`, bbox = union of solid-bearing bodies only
(`App::Origin` / axes / planes excluded — see caveats). Units: mm, mm³.

| File | Top-level objs (raw) | Solid-bearing bodies | Solids / Shells (filtered) | BBox X × Y × Z (mm) | Total volume |
|---|---|---|---|---|---|
| `Main CAD.step` | 568 | 145 | 145 / 150 | 138.03 × 331.14 × 167.82 | 319,948 mm³ (319.95 cm³) |
| `Wheel Pod.step` | 79 | 25 | 25 / 25 | 71.55 × 114.50 × 31.79 | 12,254 mm³ (12.25 cm³) |
| `Standard Weapon Teeth.step` | 11 | 2 | 2 / 2 | 304.85 × 223.62 × 108.69 (placed pair spread — see note) | 55,629 mm³ (55.63 cm³, ~27,815 per tooth) |
| `Undercutter Config.step` | 55 | 10 | 10 / 10 | 55.79 × 43.56 × 29.05 | 45,408 mm³ (45.41 cm³) |

Import errors/warnings: **none** — all four files imported with zero
exceptions and no OCCT errors on FreeCAD 1.1.3. No missing-geometry warnings
captured.

Notes:

- Raw (unfiltered) solid/shell sums are higher (e.g. Main CAD: 750 solids /
  775 shells across all 568 top-level objects) because compound bodies and
  per-part placements get counted with their nesting. The filtered column
  above is the meaningful "how many real parts" number.
- `Standard Weapon Teeth.step` bbox looks large because the two teeth are
  stored in their *assembled* (mirrored, spaced) positions, not nested at the
  origin. Measure a single `Standard Weapon Teeth` body for the per-tooth
  envelope.
- `Main CAD.step` bbox (138 × 331 × 168) is the full-robot envelope including
  both wheel pods and weapon teeth.

## Onshape import how-to

Web UI (recommended):

1. Open your Onshape document (or create one: Onshape → Create → Document).
2. In the document, click **Create → Import** (bottom-left + menu), or just
   drag-and-drop the `.step` file into the document window.
3. Pick the file(s). Each STEP creates **one new tab** named after the file.
4. Wait for import to finish, then open the tab. Use the instance / part list
   on the left to hide / isolate subassemblies.

Alternative (tab import): open the Tabs menu (bottom bar) → Import → select
STEP(s). Same result — one tab per file.

Tips:

- Import `Main CAD.step` first; the other three files are subsets already
  contained in it, so you only need them separately for focused edits.
- Keep the assembly structure — don't "flatten" on import; the `App::Part`
  containers map to Onshape subassemblies (e.g. `Wheel Pod`, `Elec`,
  `Undercutter Config`).
- Units come in as mm. If Onshape asks, choose millimeter.
- After import, check mass properties / measure against the bbox numbers above
  to confirm nothing got scaled (classic inch-vs-mm failure mode).

## Which file to start from

**`Main CAD.step`** — it is the full assembly and already contains the Wheel
Pod, Standard Weapon Teeth, and Undercutter Config geometry. Open an issue /
make edits against Main CAD; only drop into the single-config STEPs when you
want a lightweight file for clearance checks or machining one subsystem.

## Known import caveats (found via FreeCAD inspection)

1. **Origin/axis/plane clutter:** every subassembly carries its own
   `App::Origin` + X/Y/Z axes + planes (e.g. Main CAD has ~40+ `Origin*`
   objects). They inflate the feature tree (568 top-level objects, only 145
   with real solids) and must be hidden/filtered for bbox or BOM work. In
   FreeCAD they report a near-infinite default bbox — naive "select all"
   measurements are garbage unless you exclude `App::*` types.
2. **Duplicated bodies, not linked instances:** mirrored/paired parts are
   separate solids (`Standard Weapon Teeth` + `...001`, `COMPOUND` +
   `COMPOUND003`, etc.). Editing one side does not update the other after
   STEP import.
3. **Dumb solids, generic names:** most modeled geometry is `BOSS-EXTRUDE*`,
   `CUT-EXTRUDE*`, `MIRROR*`, `CHAMFER*`, `COMPOUND*` — feature history and
   sketches are gone. Expect direct-editing only in Onshape/FreeCAD.
4. **Fastener library parts import as plain solids:** McMaster-style names
   (`7804K136…`, `90593A004…`, ISO 4762 M3×8, 4-40 screws) survive as labels
   but carry no thread features or mates — re-apply mates/fastener constraints
   in Onshape.
5. **No materials/colors guaranteed:** volumes above check out, but don't
   trust appearance or density-based mass without reassigning materials.
6. **Placed-pair spread:** `Standard Weapon Teeth.step` stores teeth in
   assembly position (~305 mm overall bbox), not centered. Re-center before
   CAM/slicing a single tooth.

## STLs for slicing — do NOT export from these STEPs by hand

Printable STLs come later from the **TRC_Bots OpenSCAD pipeline**, which is
the source of truth for print tolerances and orientation. Do not hand-export
STLs from Onshape/FreeCAD from these STEPs for final parts — use this CAD
folder for reference, fit-checks, and assembly context only.
