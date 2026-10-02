# 3D Printing — Meltybrain 3lb Additive Manufacturing

This directory contains validated STL mesh models, slicer process guidelines, and engineering print profiles for all 3D printed components on Bambu Lab (X1C / P1S / A1) and standard direct-drive 3D printers.

## Directory Structure

```
3d-printing/
├── README.md             <- Overview & checklist
├── PRINT-PROFILES.md     <- Detailed Bambu Lab slicer presets, infills, temps, tolerances
├── BAMBU-ACCESSORIES.md  <- Filament selection matrix & cost estimation
└── stl/                  <- Validated production STL files (100% 2-manifold)
    ├── eyeliner_combat_v01-chassis.stl  <- Main 140mm combat unibody puck (TPU 95A / PA6-CF)
    ├── battery_cradle.stl
    ├── dual_accel_mount_base.stl
    ├── dual_accel_mount_clamp.stl
    ├── pi_cradle_base.stl
    ├── pi_cradle_cover.stl
    ├── tpu_isolation_grommet.stl
    ├── led_mount_body.stl
    ├── led_diffuser_lens.stl
    ├── xiao_case_body.stl
    └── xiao_case_lid.stl
```

## Material Strategy

- **Bambu TPU 95A HF (Primary Combat Chassis & Cradles):** Main unibody puck (`eyeliner_combat_v01-chassis.stl`), battery cradles, and isolation grommets. Shore 95A with >400% elongation at break absorbs massive kinetic shocks without shattering.
- **Bambu PA6-CF (Alternative High-Rigidity Chassis):** Optional unibody chassis material for ultra-high dead-axle rigidity at 3,500 RPM.
- **Bambu PETG HF / PETG-CF:** Rigid sensor brackets, Linux supervisor carriers, and optical mounts. High stiffness ($E \ge 2.1\text{ GPa}$) ensures zero sensor flex under 400g centripetal load.
- **Bambu PETG Translucent:** LED optical diffusers for 120° heading beacon visibility.
- **Bambu PLA Basic:** Fit-check and clearance prototyping only. **Never fight with PLA.**

## Quick Slicing Reference

Detailed settings in [PRINT-PROFILES.md](PRINT-PROFILES.md):
- **Combat Chassis (TPU 95A HF):** 0.20 mm layer height, **7 wall loops (2.8 mm solid shell)**, **85%–90% Gyroid infill**, 230°C nozzle, 45°C PEI bed with glue release layer, Speed 25–35 mm/s (Volumetric $\le 3.2\text{ mm}^3/\text{s}$). Feed from rear external spool holder (do not feed through AMS). X-Y Hole Compensation: `+0.15 mm`.
- **Combat Chassis (PA6-CF):** 0.20 mm layer height, **6 wall loops**, **75%–85% Gyroid infill**, 280°C nozzle, 100°C bed, Chamber 45°C–50°C. X-Y Hole Compensation: `+0.12 mm`.
- **PETG HF Accessories:** 0.16–0.20 mm layer height, 5 wall loops (2.0 mm shell), 45%–55% Gyroid infill, 250°C nozzle, 75°C PEI bed, Part Fan 25%, Aux Fan OFF. X-Y Hole Compensation: `+0.10 mm`.

## Additive Manufacturing Checklist

- [x] All 11 STLs (including main chassis) verified as watertight 2-manifolds with 0 non-manifold edges.
- [x] Chassis prints flat on bottom face ($Z=0$ down) with 0 required internal supports for TPU.
- [x] Fastener holes toleranced for M2.5 / M3 heat-set inserts and M3 through-bolts.
- [x] TPU filament dried at 65°C for 6+ hours before printing.
- [x] Weight budget verified ($\approx 178.5\text{ g}$ chassis TPU + accessories $\approx 262.5\text{ g}$ total printed set; total robot $\approx 1071\text{ g}$ vs $1360.8\text{ g}$ NHRL limit).
