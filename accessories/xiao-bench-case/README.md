# XIAO bench-storage case — fit-test prototype

A new standalone desktop storage case for the unpowered XIAO component modeled
in this repository. It does not mount to the robot, carry mechanical loads, or
provide an enclosure for operating electronics.

## Files

- `body.stl`, `lid.stl`: separate printable parts, millimetres, already oriented
  with a flat surface on Z=0. Print the lid with its locating lip facing up.
- `body.step`, `lid.step`: individual CAD solids for editing in FreeCAD, Onshape,
  or another CAD program. These are prototype CAD, not approved machining orders.
- `assembly.step`: both parts in their seated positions for inspection.
- `parameters.json`, `generate.py`: editable parametric source. Regenerate with
  `python3 generate.py` in a Python environment providing `OCP` (`cadquery-ocp`).
- `source-reference.json`: dimensions read from the named STEP electronics.
- `validation.json`: geometry, mesh, export round-trip, and interference results.
- `preview.png`: a render of the exported STL geometry, created by `render_preview.py`.

To refresh the repository site's downloadable assets, render the preview after
generating the geometry, then run `python3 generate.py --publish`. This copies
the ZIP and preview into `web/public/accessories/`; it does not deploy the site.
It also regenerates the two-part Explorer model directly from the STL geometry.
The assembled view is available at `/#/explorer?model=bench-case`.

The package contains one body and one lift-off lid. No screws, inserts, or
adhesive are required. The lid has a locating lip and finger recess; it is not
a latch, snap fit, or watertight seal. Keep the case upright on a desk.

## Dimensions and assumptions

The source label is `XIAO-ESP32S3 v2 v1`. Its axis-aligned bounding dimensions
are approximately 22.482 × 17.780 × 4.460 mm, reordered to length × width × height.
The parameters round these up to 22.5 × 17.8 × 4.5 mm. The model does not prove
which real hardware revision, attached headers, antenna, or camera you own.

- Body exterior: 31.3 × 26.6 × 10.9 mm.
- Cavity bounding dimensions: 26.5 × 21.8 × 8.5 mm, with rounded corners.
- Nominal walls and floor: 2.4 mm.
- Lid print envelope: 31.3 × 26.6 × 4.4 mm.
- Lid locating clearance: 0.3 mm per side; this is a prototype allowance.
- Component envelope: 2 mm clearance on each side and 4 mm headroom.

The generator checks the complete rectangular component envelope against both
case parts, including the rounded corners. It does not verify a real PCB or
an antistatic bag. Ordinary PLA/PETG is not ESD protection; keep sensitive
electronics in suitable ESD packaging and verify that the packaging fits.

## First print on a Bambu printer

Use PLA for the first fit check; PETG HF is an optional ordinary storage-case
material after that. Select the actual printer, nozzle, plate, and spool profile
in Bambu Studio. A 0.4 mm nozzle and 0.2 mm layer height are starting assumptions,
not a calibrated profile. Inspect the sliced layers and confirm that the flat
body floor and lid plate are on the build plate. No support-dependent features
are intentionally included in these orientations; verify the slicer preview.

Check the lid seating and removal by hand before placing electronics inside.
If the lid binds, change `lid_clearance_per_side` and regenerate both parts;
do not assume a global slicer scale preserves the board fit. Inspect for sharp
edges, and compare the actual hardware and packaging with the cavity.

Use the slicer's mass estimate for filament consumption. The calculated CAD
solid volume is not a promise of print weight or cost.

## Validation limits

Automated checks cover valid single CAD solids, STEP re-import, closed manifold
mesh edges, consistent triangle winding, positive mesh volume, CAD/mesh volume
agreement within 1%, and zero volumetric interference between modeled parts
and the board envelope. No physical print, retention, thermal, ESD, drop,
water-ingress, or structural qualification has been performed.
