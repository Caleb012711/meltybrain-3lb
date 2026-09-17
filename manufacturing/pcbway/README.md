# Manufacturing — Files to Give to PCBWay

This is the **machining order pack**. PCBWay does CNC milling, sheet-metal / laser cutting, and turning. You upload the files in `cnc/` and `sheet-metal/`, pick material + finish, and they ship you finished metal parts.

## Folder Layout

```
manufacturing/pcbway/
  README.md           <- you are here (how to order)
  ORDER-CHECKLIST.md  <- tick-boxes so you don't forget a part
  cnc/
    README.md         <- what goes here (.STEP, one file per part)
    *.step            <- PUT YOUR EXPORTED CNC PARTS HERE
  sheet-metal/
    README.md         <- what goes here (.DXF flat patterns)
    *.dxf             <- PUT YOUR LASER/WATERJET PARTS HERE
```

> Current state: root still holds the full assemblies (`Main CAD.step`, etc.). You need to export individual solid bodies from CAD first. See Step 1 below.

## Step 1 — Export the right files from CAD (do this once)

1. Open `Main CAD.step` in Fusion / Onshape / SolidWorks.
2. For each **machined (thick / 3D) metal part** (chassis blocks, weapon hub, motor mounts, shafts):
   - Isolate that body, File > Export > `.STEP` (`*.step`, AP214).
   - One file per physical part. Name it `01-chassis-base.step`, `02-weapon-hub.step`, etc.
   - Drop it in `manufacturing/pcbway/cnc/`.
3. For each **flat (sheet / plate) part** (top/bottom armor, bulkheads, weapon teeth if waterjet):
   - Create a drawing / flat pattern, export 1:1 `.DXF` in mm.
   - No dimensions / title blocks in the cut file — just cut outlines + holes on one layer.
   - Drop it in `manufacturing/pcbway/sheet-metal/`.
4. Weapon teeth: `Standard Weapon Teeth.step` and `Undercutter Config.step` are already separate — export each tooth as STEP for CNC from AR steel / titanium, OR as DXF if you will waterjet them.

Tip: keep units in **mm**, and make sure STEP files contain a single solid each. PCBWay rejects multi-body assemblies.

## Step 2 — What to pick on PCBWay.com

Go to pcbway.com > CNC Machining / Sheet Metal Laser Cutting > Instant Quote > Upload files.

### For `cnc/*.step`:
- **Process:** CNC Milling (3-axis is cheapest — avoid 5-axis unless needed)
- **Material (pick per part, typical for 3lb melty):**
  - Chassis / structural: **6061-T6 Aluminum** (cheap, light)
  - Weapon hub / high-load: **7075-T6 Aluminum** or **4140 / 12.9 steel** if specified in CAD notes
  - Weapon teeth: **AR500 / Hardox / Grade 5 Titanium** — confirm in CAD comments
  - Shafts / standoffs: **303 Stainless or 6061**
- **Finish:** As-machined (cheapest). Bead-blast + anodize only if you want looks.
- **Tolerance:** General ISO 2768-m. Only tighten bearing bores / shaft fits to H7/h6 and note it in order comments.
- **Quantity:** 1x + 1 spare for weapon teeth / small breakable parts.

### For `sheet-metal/*.dxf`:
- **Process:** Laser cutting (+ bending only if part has bend lines)
- **Material / thickness:** match CAD — typically 5052-H32 or 6061 sheet, 1.5–3mm. Don't guess, measure CAD.
- Upload DXF, set thickness, confirm hole sizes look right in the preview.

## Step 3 — Before you pay (5 min check)

- [ ] All files open in PCBWay preview (no missing bodies)?
- [ ] Units = mm, scale correct (measure a known hole, e.g. M3 = 3.2mm clearance)?
- [ ] One part per file, filenames match part names?
- [ ] Material + thickness correct per part?
- [ ] Spares added for teeth / wear parts?
- [ ] Shipping time leaves room for re-order if something is wrong?

See `ORDER-CHECKLIST.md` for the per-part tick list. Fill in your part names there.

## What NOT to send PCBWay

- Full assemblies (`Main CAD.step`) — they can't quote those.
- STL files — those are for 3D printing, not machining.
- G-code / 3MF / factory files — keep those on your printer only.
- Electronics — order those separately, see `BOM.md`.
