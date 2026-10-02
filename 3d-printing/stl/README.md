# 3D Printing STL Directory — Validated Production Meshes

All 20 STL files in this directory are generated via the OpenCASCADE / FreeCAD / OCP parametric Python pipelines and validated with strict 2-manifold geometric topology checks:
- **0 non-manifold edges**
- **0 open boundaries / zero self-intersections**
- **100% consistent outward normal winding**
- **Exact volume parity with analytical CAD B-Rep solid**
- **100% Slicing Ready (Bambu Studio / OrcaSlicer / PrusaSlicer)**

## STL Manifest & Material Matrix

| Filename | Material | Triangles | Volume ($\text{mm}^3$) | Bounding Box ($X \times Y \times Z$ mm) | Purpose / Description |
|---|---|---|---|---|---|
| `eyeliner_combat_v01-chassis.stl` | Bambu TPU 95A HF / PA6-CF | 19,800 | 178,800.5 | 140.0 × 140.0 × 24.0 | Main Ø140mm combat unibody puck housing tangential drive motors, 4S batteries, Teensy 4.0, dual accels, 360° LiDAR sweep pocket, and 16× M3 perimeter clamping bores. |
| `eyeliner_combat_v01-top_plate.stl` | Polycarbonate / 6061-T6 (Ref) | 19,424 | 48,551.8 | 140.0 × 140.0 × 3.5 | Top clamping armor plate with wheel protrusion slots, optical beacon aperture, and 16× M3 perimeter bolt holes. |
| `eyeliner_combat_v01-bottom_plate.stl` | Polycarbonate / 6061-T6 (Ref) | 15,744 | 49,058.9 | 140.0 × 140.0 × 3.5 | Bottom skid plate with invertible ground clearance wheel slots and 16× M3 perimeter bolt holes. |
| `eyeliner_lidar_mount.stl` | Bambu PETG HF | 1,618 | 2,536.9 | 17.4 × 19.4 × 13.0 | Precision chassis rim mount bracket for ST VL53L4CD Time-of-Flight micro-LiDAR sensor with cable relief. |
| `cyberdeck_dock_radiomaster.stl` | Bambu PETG-CF / PLA-CF | 1,500 | 314,412.8 | 180.0 × 150.0 × 57.0 | Tactical Cyberdeck base station lower chassis tray holding Raspberry Pi 5, 3S LiFePO4 pack, and contoured dock for RadioMaster Pocket. |
| `cyberdeck_screen_case.stl` | Bambu PETG-CF / PLA-CF | 668 | 135,753.5 | 179.0 × 148.0 × 28.0 | Tactical Cyberdeck upper deck bezel for 7" sunlight-readable touchscreen with 1/4"-20 camera mount bosses. |
| `titanium_cleat_disc_1.55in.stl` | Ti-6Al-4V (Laser DXF ref) | 4,980 | 784.7 | 39.3 × 39.3 × 1.0 | 1.55" OD 24-tooth gear-cleat disc (0.040" SendCutSend reference for tire core casting). |
| `silicone_tire_mold_base.stl` | Bambu PETG HF / Tough PLA | 12,426 | 47,153.7 | 60.0 × 60.0 × 22.0 | Lower mold half (Base) for casting Shore 40A-50A elastomer tire core; features Ø6mm arbor pin and lower cleat registration pocket. |
| `silicone_tire_mold_top.stl` | Bambu PETG HF / Tough PLA | 18,836 | 52,378.1 | 60.0 × 60.0 × 18.0 | Upper mold half (Top Cap) with conical pour sprue, 3× perimeter air vent risers, upper cleat pocket, and M4 clamp counterbores. |
| `silicone_tire_core_mold.stl` | Bambu PETG HF / Tough PLA | 912 | 15,708.9 | 14.0 × 37.8 × 37.8 | 2-piece core casting arbor mold for Shore 50A polyurethane/silicone tire treads. |
| `dual_accel_mount_base.stl` | Bambu PETG HF | 9,044 | 10,533.0 | 46.7 × 46.6 × 9.2 | Rigid base for dual H3LIS331DLTR ±400g accelerometers in 45° opposed shock-rejecting geometry. |
| `dual_accel_mount_clamp.stl` | Bambu PETG HF | 4,740 | 3,410.9 | 31.7 × 46.6 × 3.0 | Clamping plate for dual accelerometer breakout PCBs. |
| `pi_cradle_base.stl` | Bambu PETG HF | 8,824 | 20,689.6 | 81.4 × 64.1 × 10.5 | Rigid chassis carrier for onboard Orange Pi / Pi Zero 2W + Matek BEC. |
| `pi_cradle_cover.stl` | Bambu PETG HF | 2,592 | 6,913.0 | 70.4 × 53.1 × 2.0 | Protective top shroud with SoC heatsink chimney. |
| `tpu_isolation_grommet.stl` | Bambu TPU 95A HF | 1,680 | 155.6 | 8.0 × 8.0 × 5.5 | Shock-decoupling bushing (print 4× for Pi cradle corners). |
| `battery_cradle.stl` | Bambu TPU 95A HF | 5,900 | 25,274.9 | 82.5 × 70.0 × 15.4 | Shock-absorbing cradle for 2× 4S 550–650mAh LiPo packs + Kevlar retention straps. |
| `led_mount_body.stl` | Bambu PETG HF (Black) | 5,604 | 3,229.4 | 34.3 × 16.3 × 11.5 | Directional heading LED beacon mount with resistor bay. |
| `led_diffuser_lens.stl` | Bambu PETG Translucent | 444 | 860.7 | 18.3 × 14.3 × 3.3 | Snap-in 120° optical diffuser lens for heading strobe pulse. |
| `xiao_case_body.stl` | Bambu PETG HF / PLA | 700 | 3,921.6 | 31.3 × 26.6 × 10.9 | Bench test storage case body for Seeed XIAO ESP32-S3. |
| `xiao_case_lid.stl` | Bambu PETG HF / PLA | 1,172 | 2,112.7 | 31.3 × 26.6 × 4.4 | Bench test storage case friction-fit lid. |

## Slicing Parameters & Recommended Profiles

| Part Category | Filament | Walls / Perimeters | Infill % & Pattern | Layer Height | Support Needed? | Notes |
|---|---|---|---|---|---|---|
| Main Combat Chassis | Bambu TPU 95A HF | 7 walls | 85% Gyroid | 0.20 mm | **No** (Orient flat on bed) | Dry TPU @ 65°C for 8h. Max volumetric speed 3.2 mm³/s. |
| Armor Plates (Print Ref) | Polycarbonate / PETG-CF | 6 walls | 100% Rectilinear | 0.20 mm | No | Enclosed chamber recommended (90°C bed). |
| Cyberdeck Dock & Case | PETG-CF / PLA-CF | 5 walls | 40% Gyroid | 0.20 mm | Tree supports on ports | Print face down on textured PEI plate. |
| Sensor & Accel Mounts | Bambu PETG HF | 4 walls | 50% Gyroid | 0.16 mm | No | Heat-set inserts M2 / M3. |
| Tire Molds | Tough PLA / PETG HF | 5 walls | 100% Rectilinear | 0.12 mm | No | Smooth PEI plate for flawless silicone surface finish. |
| Battery Cradle | Bambu TPU 95A HF | 4 walls | 35% Gyroid | 0.20 mm | No | Highly flexible for battery impact cushioning. |

For complete print profiles, shrinkage tuning, and heat-set insert guidelines, see [PRINT-PROFILES.md](../PRINT-PROFILES.md) and [CHASSIS-PRINT-AUDIT.md](../CHASSIS-PRINT-AUDIT.md).
