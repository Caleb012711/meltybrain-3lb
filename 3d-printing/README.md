# 3D Printing — Files to Print Yourself (no pre-sliced G-code)

We do NOT provide pre-sliced G-code. Slice for YOUR printer/filament — чужой G-code crashes nozzles and wastes TPU.

## Where files live

```
3d-printing/
  README.md   <- you are here
  stl/        <- PUT exported *.stl here, one per printed part
```

Export from CAD (`Main CAD.step` / `Wheel Pod.step`): isolate each plastic body → File > Export > STL (binary, fine ~0.1mm chord) → drop in `stl/` as `NN-part-name.stl`.

What to print (typical): TPU cradle/shell halves, wheel-pod guards, LED diffuser mount, Pi/BEC isolation mount, battery tray, bench-test wheel locks/covers. Metal ring, teeth, plates, shafts are NEVER printed — those are PCBWay parts.

## Material (matches materials-guide.md)

- **TPU 95A (e.g. Overture / SainSmart / NinjaTek Cheetah):** cradle, shell, guards. This is the shock absorber — Liftoff switched to printed TPU for exactly this.
- **PETG / ABS-ASA:** jigs, pit stands, LED mounts (not impact structure).
- **Do NOT use PLA** for fight parts — shatters. PLA ok for fit-check prototypes only.
- **Nylon / NylonX:** optional upgrade for pods if your printer does 250°C+ + dry box.

## Slicer settings (Orca / Bambu / PrusaSlicer)

TPU profile (direct-drive strongly preferred; Bowden + TPU = jam):
- Nozzle 225–240°C (per spool), bed 40–60°C, glue stick on smooth plate
- Speed 20–35 mm/s, **retraction OFF or ≤1mm**, pressure advance OFF to start
- Walls: 4–6 perimeters, top/bottom 5–6 layers, infill 30–60% gyroid (cradle wants dense, not hollow)
- Seam: aligned/rear, avoid overhangs >45° — re-orient, don't add auto-supports inside shock webs
- Dry the spool: 65°C 4–6h. Wet TPU strings, pops, delaminates — #1 beginner failure.

PETG/ASA: 4 walls, 40%+ gyroid, brim for tall pods.

## Checklist

- [ ] Exported STLs in `stl/`, filenames match BOM?
- [ ] Sliced with YOUR filament profile (flow + temp tower done)?
- [ ] Test-fit print in cheap PLA/PETG first, then final in TPU?
- [ ] Heat-set inserts (M3/M4, 200–220°C iron) for every bolt into plastic — never tap TPU?
- [ ] Weighed prints, logged in BOM weight budget?

Fail mode to avoid: printing the shell solid 100% to "make it strong" — it gets heavy fast (TPU 1.21 g/cc). Walls do the work; gyroid does the damping.
