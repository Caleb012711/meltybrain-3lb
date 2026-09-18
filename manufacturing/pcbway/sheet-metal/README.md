# Sheet metal — put `.dxf` files here

One 1:1 flat-pattern DXF per laser/waterjet part, units = mm.

Naming: `NN-part-name-thickness-material.dxf`
Example: `01-top-armor-2mm-5052.dxf`

Keep only cut outlines + holes. No title block, no dimensions.

## Keep outer plates SIMPLE (rule)

Outer armor plates must stay dumb flat plates — no bends, no countersinks, no
pockets, no lightening holes, no engraving:

- One outline + mounting holes only. Rectangles with 2–3 mm corner reliefs beat
  fancy profiles (fancy edges snag, crack, and cost more per cut-minute).
- One thickness per order (mixing thicknesses splits the laser setup + bill).
- Holes ≥ 1.2× thickness diameter, ≥ 2× thickness from any edge — closer holes
  deform on the laser and will not hold tolerance.
- If a plate wants a third dimension, it is two flat plates + standoffs, not a
  bent part (bent thin alu opens up after the first hit anyway).
- Teeth/ring stay CNC or waterjet (see `../cnc/`); sheet is for flat covers only.
