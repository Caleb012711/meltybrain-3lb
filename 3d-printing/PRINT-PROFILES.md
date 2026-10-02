# Bambu Lab Engineering Print Profiles & Manufacturing Specifications

This guide establishes the production-grade slicing and additive manufacturing parameters for all 3D printed components of the 3lb combat meltybrain robot on Bambu Lab printers (X1-Carbon, P1S, P1P, A1 / A1 Mini) and OrcaSlicer / Bambu Studio.

---

## 1. Material Allocation & Functional Matrix

| Component Category | Target Material | Purpose / Loading Mode | Tensile / Impact Requirement |
|---|---|---|---|
| **Main Combat Chassis Puck** (`eyeliner_combat_v01-chassis.stl`) | **Bambu TPU 95A HF** *(Primary Combat)* or **PA6-CF** *(High-Rigidity)* | Full unibody core absorbing kinetic impacts from opposing vertical/horizontal spinners; houses motors, 4S batteries, electronics; clamped between 3.5mm top/bottom armor plates via 16× M3 bolts. | Shore 95A (>400% elongation at break) for impact damping; or PA6-CF ($E \ge 5.5\text{ GPa}$, 140°C HDT) for high-RPM motor stiffness. |
| **Rigid Sensor & PCB Mounts** (`dual-accel-mount`, `pi-zero-2w-cradle`, `led-heading-mount`) | **Bambu PETG HF** or **PETG-CF** | Zero dynamic deflection under 400g centripetal acceleration at 3,500 RPM; thermal resistance up to 75°C. | High stiffness ($E \ge 2.1\text{ GPa}$), high layer adhesion, low creep. |
| **Shock Decouplers & Battery Cradles** (`tpu_isolation_grommet`, `battery_cradle`, wheel pods / guards) | **Bambu TPU 95A HF** | Viscoelastic damping of 50g–200g arena impact shocks; prevents LiPo pouch puncture and SBC solder fatigue. | Shore 95A hardness, $>400\%$ elongation at break, high tear resistance. |
| **Optical Diffusers** (`led_diffuser_lens`) | **Bambu PETG Translucent** | Wide-angle beam spreading for heading indicator pulse beacon. | High light transmission ($>85\%$), internal refraction. |
| **Dimensional Fit Check Only** (Prototype stage) | **Bambu PLA Basic** | Rapid geometric clearance verification before printing in engineering polymers. | **NEVER FIGHT WITH PLA — it shatters catastrophically upon weapon impact.** |

---

## 2. Bambu Studio / OrcaSlicer Process Presets

### A. Combat Chassis Unibody — Bambu TPU 95A HF (Primary Combat Profile)

> [!CRITICAL]
> **Combat Survivability Mandate:** For 3lb Beetleweight meltybrain chassis subjected to kinetic impacts and 400g centripetal acceleration, wall count MUST NOT be fewer than **7 wall loops** (2.8 mm solid outer boundary shell) and infill MUST be **85% – 100% Gyroid**. Under these parameters, internal partitions between battery bays and motor cavities solidify into 100% solid elastomeric bulkheads.
> **Feeding Requirement:** Mount TPU on the external rear spool holder and feed directly into the toolhead extruder via PTFE tube. **Do NOT use the AMS.** Dry filament at 65°C for 6–8 hours before printing.

```ini
[Filament: Bambu TPU 95A HF / Generic TPU 95A]
Filament Type = TPU
Nozzle Temperature (First Layer) = 235 °C
Nozzle Temperature (Other Layers) = 230 °C
Bed Temperature (Textured PEI) = 45 °C (Apply thin glue stick layer as release interface)
Max Volumetric Speed = 3.2 mm³/s (Strict limit to prevent direct-drive buckling)
Flow Ratio = 1.03 (Slight over-pack maximizes interlayer fusion for impact containment)
Pressure Advance (PA / K-factor) = 0.045 – 0.055

[Quality & Combat Strength Parameters]
Layer Height = 0.20 mm
First Layer Height = 0.24 mm (Ensures massive mechanical bed adhesion)
Wall Loops (Perimeters) = 7 (Minimum 2.8 mm solid perimeter boundary)
Top Shell Layers = 7 (1.4 mm solid ceiling)
Bottom Shell Layers = 7 (1.4 mm solid floor)
Internal Solid Infill = Concentric
Sparse Infill Density = 85% – 100% (90% Recommended balance of weight & dead-blow damping)
Sparse Infill Pattern = Gyroid (Isotropic multi-axis shear resistance; zero cross-over friction)
Infill Direction = 45° / 135°

[Print Speeds & Dynamics]
First Layer Speed = 15 mm/s
Outer Wall Speed = 25 mm/s
Inner Wall Speed = 30 mm/s
Sparse Infill Speed = 35 mm/s
Internal Solid Infill Speed = 30 mm/s
Top Surface Speed = 25 mm/s
Travel Speed = 150 mm/s
Acceleration (All features) = 1500 mm/s² (Reduced jerk prevents flexible resonance)

[Retraction & Travel]
Retraction Length = 0.8 mm (Direct drive only; do NOT exceed 1.2 mm on TPU)
Retraction Speed = 30 mm/s
Deretraction Speed = 25 mm/s
Z-Hop When Retracting = 0.2 mm (Spiral Z-hop)
Wipe Distance = 1.0 mm

[Cooling & Interlayer Adhesion]
Part Cooling Fan = 20% – 40% (Keep low to maximize tensile weld between layers)
Auxiliary Part Cooling Fan = 0% (OFF — Prevents asymmetric warping)
Exhaust Fan = 20%

[Precision & Dimensional Tolerances]
X-Y Hole Compensation = +0.15 mm (Ensures M3 clearance bores stay true to Ø3.2mm)
X-Y Contour Compensation = 0.00 mm (Holds Ø140mm OD within ±0.05 mm)
Seam Position = Aligned (Placed inside motor cavity rear corner)
```

### B. Combat Chassis Unibody — Bambu PA6-CF / PETG-CF (High-Stiffness Motor Platform)

> [!NOTE]
> **Application:** Used when absolute dead-axle rigidity and zero deflection at 3,500 RPM are prioritized over elastomeric impact damping. Clamping 3.5mm polycarbonate skid and armor plates mitigates CF-nylon brittleness.
> **Requirement:** Hardened steel nozzle (0.4mm or 0.6mm). Bake PA6-CF at 80°C for 8–12 hours. Print with enclosed chamber (X1C / P1S).

```ini
[Filament: Bambu PA6-CF / Polymaker PA6-CF]
Filament Type = PA6-CF
Nozzle Temperature (First Layer) = 285 °C
Nozzle Temperature (Other Layers) = 280 °C
Bed Temperature (Textured PEI or Engineering Plate) = 100 °C (Use Magigoo PA / liquid glue)
Chamber Temperature Target = 45 °C – 50 °C (Fully enclosed)
Max Volumetric Speed = 9.0 mm³/s
Flow Ratio = 0.97

[Quality & Combat Strength Parameters]
Layer Height = 0.16 mm – 0.20 mm
Wall Loops (Perimeters) = 6 (2.4 mm – 2.8 mm solid CF shell)
Top Shell Layers = 6 (1.2 mm solid ceiling)
Bottom Shell Layers = 6 (1.2 mm solid floor)
Sparse Infill Density = 75% – 85%
Sparse Infill Pattern = Gyroid
Infill / Wall Overlap = 35% (High overlap bonds core to perimeter)

[Print Speeds & Cooling]
Outer Wall Speed = 45 mm/s
Inner Wall Speed = 80 mm/s
Infill Speed = 100 mm/s
Part Cooling Fan = 10% – 25% (Minimal cooling for highest layer tensile strength)
Aux Fan = OFF
Chamber Fan = OFF

[Precision & Dimensional Tolerances]
X-Y Hole Compensation = +0.12 mm (Compensates for CF fiber pull-in on M3 bores)
X-Y Contour Compensation = 0.00 mm
```

### C. PrusaSlicer (MK3S+ / MK4 / XL) Configuration Translation

For users operating Prusa direct-drive printers (Original Prusa MK4 / MK3S+ / XL):

```ini
[PrusaSlicer Print Settings -> Layers and perimeters]
Layer height = 0.20 mm
First layer height = 0.25 mm
Perimeters = 7 (for TPU 95A) or 6 (for PA6-CF/PETG-CF)
Solid layers (Top) = 7
Solid layers (Bottom) = 7
Extra perimeters if needed = Enabled
Avoid crossing perimeters = Enabled (Crucial for TPU to minimize stringing into cavities)

[PrusaSlicer Print Settings -> Infill]
Fill density = 85% (TPU 95A) / 75% (PA6-CF)
Fill pattern = Gyroid
Length of the infill anchor = 2 mm
Maximum infill anchor length = 1000%

[PrusaSlicer Print Settings -> Speed (for TPU 95A)]
Perimeters = 25 mm/s
Small perimeters = 20 mm/s
External perimeters = 20 mm/s
Infill = 35 mm/s
Solid infill = 30 mm/s
Top solid infill = 25 mm/s
First layer speed = 15 mm/s

[PrusaSlicer Filament Settings (TPU 95A / Flex)]
Extrusion multiplier = 1.03
Nozzle Temperature = 230 °C
Bed Temperature = 50 °C (Smooth PEI with glue stick or Textured PEI)
Max volumetric speed = 2.8 mm³/s (MK3S/MK4 Nextruder)
Retraction length = 0.8 mm
Retraction speed = 25 mm/s
Deretraction speed = 25 mm/s
Fan speed (Min/Max) = 20% / 40%
```

### D. Bambu PETG HF Profile (Rigid Sensor & PCB Accessories)

```ini
[Filament]
Filament Type = PETG HF
Nozzle Temperature (First Layer) = 255 °C
Nozzle Temperature (Other Layers) = 250 °C
Bed Temperature (Textured PEI) = 75 °C
Max Volumetric Speed = 12.0 mm³/s
Flow Ratio = 0.98

[Quality & Strength]
Layer Height = 0.16 mm (Optimal) or 0.20 mm (Standard)
First Layer Height = 0.20 mm
Wall Loops (Perimeters) = 5 (Minimum 2.0 mm solid boundary shell)
Top Surface Pattern = Monotonic Line
Top Shell Layers = 6 (1.2 mm solid ceiling)
Bottom Shell Layers = 5 (1.0 mm solid floor)
Sparse Infill Density = 45% – 55%
Sparse Infill Pattern = Gyroid (Isotropic shear strength under multi-axis spinning loads)

[Cooling & Warping Prevention]
Part Cooling Fan = 20% – 40%
Auxiliary Part Cooling Fan = 0% (OFF — Prevents asymmetric warping and layer delamination)
Exhaust Fan = 30%

[Precision & Dimensional Tolerance Compensation]
X-Y Hole Compensation = +0.10 mm (Compensates for polymer thermal contraction on M2.5/M3 fastener bores)
X-Y Contour Compensation = 0.00 mm (Outer dimensions match CAD within ±0.05 mm)
Seam Position = Aligned / Rear
```

### B. Bambu TPU 95A HF Profile (Shock Isolators & Battery Bay)

> [!IMPORTANT]
> **Feeding Requirement:** Standard AMS / AMS HT does **NOT** reliably feed flexible TPU 95A. Mount the TPU spool on the rear external spool holder and feed directly into the toolhead extruder via PTFE tube. Always dry TPU at 65°C for 6–8 hours prior to printing.

```ini
[Filament]
Filament Type = TPU 95A HF
Nozzle Temperature (First Layer) = 230 °C
Nozzle Temperature (Other Layers) = 230 °C
Bed Temperature = 45 °C (Textured PEI with thin glue stick / liquid glue as release interface)
Max Volumetric Speed = 3.2 mm³/s (Slow extrusion prevents filament buckling in direct-drive gears)
Flow Ratio = 1.02

[Quality & Strength]
Layer Height = 0.20 mm
First Layer Height = 0.20 mm
Wall Loops (Perimeters) = 5 (2.0 mm solid walls for tear resistance under strap tension)
Top Shell Layers = 5 (1.0 mm)
Bottom Shell Layers = 5 (1.0 mm)
Sparse Infill Density = 45% – 60%
Sparse Infill Pattern = Gyroid (Dynamic shock absorption and energy dissipation)

[Speed & Retraction]
Outer Wall Speed = 25 mm/s
Inner Wall Speed = 30 mm/s
Sparse Infill Speed = 35 mm/s
Retraction Length = 0.8 mm (Do not use large retractions on TPU — risks nozzle clogging)
Retraction Speed = 30 mm/s
Z-Hop When Retracting = Disabled (or 0.2 mm spiral)

[Precision & Dimensional Tolerance Compensation]
X-Y Hole Compensation = +0.15 mm (Compensates for viscoelastic hole shrinkage)
X-Y Contour Compensation = +0.15 mm (Ensures snug compliant fit over LiPo packs)
```

### C. Bambu PETG Translucent Profile (LED Optical Diffuser)

```ini
[Filament]
Filament Type = PETG Translucent
Nozzle Temperature = 260 °C (Higher temperature promotes maximum inter-layer optical clarity)
Bed Temperature = 75 °C
Flow Ratio = 1.03 (Slight over-extrusion eliminates micro-air voids)

[Quality & Infill]
Layer Height = 0.12 mm – 0.16 mm
Wall Loops = 2
Infill Density = 100% Solid
Infill Pattern = Aligned Rectilinear (45° optical dispersion angle)
Print Speed = 25 mm/s (Slow, uniform extrusion maximizes optical transmission)
```

### D. Bambu PETG HF / Tough PLA Profile (2-Piece Silicone Tire Casting Mold)

```ini
[Filament]
Filament Type = PETG HF (or PLA Tough)
Nozzle Temperature = 250 °C (PETG HF) / 220 °C (PLA Tough)
Bed Temperature = 75 °C (Textured PEI)
Flow Ratio = 0.98

[Quality & Precision]
Layer Height = 0.12 mm (Ultra-fine layer resolution to minimize tire mold stepping)
First Layer Height = 0.20 mm
Wall Loops = 6 (2.4 mm solid mold wall)
Top Shell Layers = 8 (1.0 mm solid floor)
Bottom Shell Layers = 8 (1.0 mm solid floor)
Sparse Infill Density = 100% Solid
Sparse Infill Pattern = Aligned Rectilinear
Top Surface Pattern = Monotonic Line (Smooth mirror mating interface on parting line)

[Speed & Cooling]
Outer Wall Speed = 35 mm/s (Low speed for maximum radial accuracy)
Inner Wall Speed = 60 mm/s
Part Cooling Fan = 40%
Aux Fan = OFF

[Precision & Fit Tolerances]
X-Y Hole Compensation = +0.05 mm (Maintains Ø6.0mm arbor pin and Ø4.5mm clamp holes)
X-Y Contour Compensation = 0.00 mm
Seam Position = Rear / Aligned
```

---

## 3. Fastener & Heat-Set Insert Installation Guide

All rigid PETG HF mounts in this repository are engineered for **tapered metric brass heat-set inserts** (Ruthex / McMaster-Carr):

| Fastener Thread | Insert Outer Diameter | Recommended Hole CAD Bore | Counterbore / Hole Depth | Insertion Iron Temp | Installation Dwell |
|---|---|---|---|---|---|
| **M2** | 3.2 mm | $\varnothing 3.0\text{ mm}$ | $4.0\text{ mm}$ | 215 °C | 5–8 seconds |
| **M2.5** | 3.6 mm | $\varnothing 3.4\text{ mm}$ | $4.5\text{ mm}$ | 220 °C | 6–10 seconds |
| **M3** | 4.6 mm | $\varnothing 4.2\text{ mm}$ | $5.5\text{ mm}$ | 225 °C | 8–12 seconds |
| **M4** | 6.0 mm | $\varnothing 5.6\text{ mm}$ | $7.0\text{ mm}$ | 230 °C | 10–15 seconds |

### Heat-Set Insertion Best Practices:
1. Use a dedicated soldering iron heat-set tip with matching thread guide pilot.
2. Press insert into hole perpendicular ($90^\circ \pm 1^\circ$) until flush with top surface.
3. Hold flat cooling block (aluminum or steel plate) against the insert for 5 seconds immediately after withdrawing iron to ensure flush seating and zero proud extrusion.
4. **Never tap threads directly into 3D printed TPU or thin PETG** — always use through-bolts with nylocs or brass heat-sets.

---

## 4. Part Orientation & Support Strategy

| Part | Optimal Print Bed Orientation | Support Requirement | Post-Processing |
|---|---|---|---|
| **`eyeliner_combat_v01-chassis.stl`** | **Flat on bottom face ($Z=0$ down)** | **None for TPU** (3mm wheel cutout bridge self-supports cleanly); **Optional Tree Slim on build plate only for PA6-CF** | Deburr M3 bolt clearance bores; verify battery and motor slip fit. |
| `dual_accel_mount_base.stl` | Flat on bottom baseplate ($Z=0$ down) | **None** (Self-supporting $45^\circ$ wire notches) | Heat-set 8× M2.5 inserts into pocket bosses. |
| `dual_accel_mount_clamp.stl` | Flat on clamping face | **None** | Deburr M2.5 screw counterbores. |
| `pi_cradle_base.stl` | Flat on bottom baseplate | **None** (Internal tunnels $\le 45^\circ$) | Heat-set 4× M2.5 inserts into Pi standoffs. |
| `pi_cradle_cover.stl` | Flat on top outer surface | **None** | Clean heatsink chimney edge. |
| `tpu_isolation_grommet.stl` | Flat on lower flange ($Z=0$) | **None** ($45^\circ$ self-supporting waist fillet) | Press-fit into cradle ear holes. |
| `battery_cradle.stl` | Flat on bottom baseplate | **None** (Strap channels printed cleanly bridgeable) | Thread 15 mm Velcro strap through base channels. |
| `led_mount_body.stl` | Flat on bottom mounting flange | **None** | Press-fit 5 mm LEDs into rear pockets. |
| `led_diffuser_lens.stl` | Flat on top lens face | **None** | Snap-fit into `led_mount_body`. |
| `xiao_case_body.stl` | Flat on bottom base | **None** | Test slip fit with Seeed XIAO ESP32-S3. |
| `xiao_case_lid.stl` | Flat on top lid face | **None** | Check friction latch engagement. |

---

## 5. Weight & Filament Consumption Budget

| File | Material | CAD Solid Volume ($\text{mm}^3$) | Estimated Print Mass ($\text{g}$) | Slicer Infill Target |
|---|---|---|---|---|
| **`eyeliner_combat_v01-chassis.stl`** | **TPU 95A HF** | 156,909 | **~178.5 g** | 85%–90% Gyroid, 7 walls (Combat configuration) |
| *`eyeliner_combat_v01-chassis.stl` (Alt)* | *PA6-CF* | 156,909 | *~162.0 g* | *75% Gyroid, 6 walls (High-rigidity configuration)* |
| `dual_accel_mount_base.stl` | PETG HF | 10,533 | **~11.8 g** | 50% Gyroid, 5 walls |
| `dual_accel_mount_clamp.stl` | PETG HF | 3,411 | **~3.9 g** | 50% Gyroid, 5 walls |
| `pi_cradle_base.stl` | PETG HF | 20,690 | **~21.5 g** | 40% Gyroid, 4 walls |
| `pi_cradle_cover.stl` | PETG HF | 6,913 | **~7.8 g** | 100% Solid |
| `tpu_isolation_grommet.stl` (×4) | TPU 95A HF | 156 × 4 = 624 | **~0.8 g total** | 50% Gyroid |
| `battery_cradle.stl` | TPU 95A HF | 25,275 | **~26.5 g** | 50% Gyroid, 5 walls |
| `led_mount_body.stl` | PETG HF | 3,229 | **~3.6 g** | 50% Gyroid, 4 walls |
| `led_diffuser_lens.stl` | PETG Translucent | 861 | **~1.1 g** | 100% Solid Rectilinear |
| `xiao_case_body.stl` | PETG HF | 3,922 | **~4.5 g** | 40% Gyroid |
| `xiao_case_lid.stl` | PETG HF | 2,113 | **~2.5 g** | 40% Gyroid |
| **Complete Combat Printed Set** | TPU 95A + PETG HF | — | **~262.5 g** | Fits comfortably in 1360.8 g (3.00 lb) tournament limit with AR500 teeth |
