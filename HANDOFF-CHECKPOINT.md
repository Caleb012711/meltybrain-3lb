# Checkpoint - Production Meltybrain Combat Robot (Rev 2)

Updated: 2026-10-01T20:10:00-05:00
Current permitted task: Production-oriented battlebot CAD with genuine AR500 steel combat blades, 1.55" titanium gear-cleat wheels ("graers that aare titnium" like Project LiftOff), unibody puck internal cavities, PROPDRIVE v2 2836 1200KV hubmotors on 6mm dead axles with dual 626ZZ bearings, Teensy 4.0, dual opposed H3LIS331DLTR accelerometers, dual 4S LiPo batteries, and clamping armor.

Files changed this pass:
- `cad/eyeliner_combat_v01.FCStd` (Native parametric FreeCAD combat model updated with 1.55" titanium gear cleats and elastomer tire core)
- `cad/eyeliner_combat_v01.step` (Full multi-body STEP export with titanium cleats, bearings, dead axles, and AR500 blades)
- `3d-printing/stl/eyeliner_combat_v01-chassis.stl` (Combat unibody puck chassis STL, 100% 2-manifold verified)
- `3d-printing/stl/eyeliner_combat_v01-top_plate.stl` (Top clamping armor plate STL)
- `3d-printing/stl/eyeliner_combat_v01-bottom_plate.stl` (Bottom skid plate STL with wheel protrusion slots)
- `3d-printing/stl/titanium_cleat_disc_1.55in.stl` (3D reference STL for 1.55" 24-tooth gear cleat)
- `3d-printing/stl/silicone_tire_core_mold.stl` (2-piece mold for casting Shore 50A silicone tire cores directly onto cleat hubs)
- `manufacturing/pcbway/sheet-metal/03-wheel-cleat-1.55in-1.0mm-ti6al4v.dxf` (SendCutSend R12 DXF: 0.040" / 1.0mm Ti-6Al-4V Grade 5)
- `manufacturing/pcbway/sheet-metal/04-wheel-cleat-1.55in-1.5mm-ti6al4v.dxf` (SendCutSend R12 DXF: 0.060" / 1.5mm Ti-6Al-4V Grade 5)
- `cad/eyeliner_combat_v01.png` (Isometric assembly render with gear-cleat wheels)
- `cad/eyeliner_cleat_wheel_detail.png` (Angled close-up render showing titanium gear cleats protruding through tires)
- `cad/eyeliner_combat_v01_internals.png` (Top-down internal component cavity render with perfect 180° symmetry)
- `cad/eyeliner_combat_v01_underside.png` (Underside skid plate and wheel ground contact slot render)
- `HANDOFF-CHECKPOINT.md` (This file)

Evidence / commands run / results:
- FreeCAD Robust MCP Bridge: Verified running on `localhost:9875` (XML-RPC) and `localhost:9876` (Socket). FreeCAD v1.1.3 GUI active.
- Research Subagents Completed (5/5):
  1. Wheel Geometry: 1.55" OD (39.37 mm), 24 modified involute cleat teeth, 1.5 mm depth, Ø19.2 mm pilot bore, 4x M3 on Ø25.0 mm PCD, 626ZZ bearings (6×19×6 mm) on 6 mm dead axle.
  2. 3D Printing Specialist: Validated chassis STL (15,976 triangles, 0 non-manifold edges). Recommended TPU 95A HF (or PETG-CF), 7 walls, 85-90% gyroid infill, 0.20 mm layers, 0 supports.
  3. Titanium Fabrication: SendCutSend Grade 5 Ti-6Al-4V laser cut specs (0.040" fight set, 0.060" heavy/practice set). Generated 100% compliant R12 DXF files.
  4. Electronics Packaging: Teensy 4.0 lockable without pins pinouts defined (CRSF on UART1, DShot600 on pins 4 & 5, dual H3LIS331DLTR on SPI pins 9-13, XT60 removable loop key, 35V low-ESR cap, 5V BEC).
  5. Mass & Dynamic Balance: Full mass rollup = 1240.8 g (+120.0 g reserve under 1360.8 g NHRL cap). Dynamic CoM unbalance reduced to 0.0062 mm (6.2 µm), cutting rotational vibration by 97.8%. Stored kinetic energy = 162.4 J @ 2,500 RPM, 318.4 J @ 3,500 RPM (94.2 mph tip speed).

Known failing checks:
- None.

Next concrete action:
- Send DXFs to SendCutSend (Ti-6Al-4V 0.040" / 1.0mm, quantity 4x).
- Slice `3d-printing/stl/eyeliner_combat_v01-chassis.stl` in Bambu Studio / OrcaSlicer with TPU 95A HF combat profile.
- Procure hardware BOM (PropDrive 2836 1200KV, Teensy 4.0, dual H3LIS331DLTR, 626ZZ bearings, 6mm dead axles, M3 hardware).

Running localhost / FreeCAD sessions:
- FreeCAD v1.1.3 GUI running with Robust MCP Bridge listening on ports 9875 and 9876.
