# Dual Accelerometer Rigid Mount (H3LIS331DL / Adafruit 4627)

Parametric, high-rigidity sensor mounting bracket engineered for 3lb meltybrain combat robotics spinning at 2,000–3,500 RPM (up to 400g centripetal load and 200g shock impacts).

## Engineering Intent & Meltybrain State Estimation

Meltybrain tracking requires measuring tangential and radial centripetal acceleration to compute rotation rate ($\omega = \sqrt{a_r / r}$) and phase angle without gyro saturation. Single-accelerometer setups are vulnerable to sensor offset errors, dynamic chassis flex, and axis tilt under centripetal loads. This mount holds **two H3LIS331DL ±400g breakout boards (Adafruit 4627 / ST TR chips)** in rigid registration to enable:
1. **Differential Centripetal Measurement:** Eliminates common-mode centrifugal DC offsets.
2. **Radial/Tangential Orthogonal Clamping:** Mechanical isolation of the sensor plane with positive clamping to prevent resonance-induced noise spikes.
3. **Chassis Ground Registration:** Keyed baseplate and M3 counterbored mounting flanges transfer shock loads directly into the main armor/chassis structure.

## Manufacturing & Print Profile (Bambu Lab)

- **Recommended Material:** Bambu PETG HF or Bambu PETG-CF (carbon fiber filled) for zero dynamic flex under 400g load. *Do not use TPU or unreinforced PLA for the accelerometer mount, as elasticity causes phase error and tracking loss.*
- **Perimeters / Walls:** 5 walls (min 2.0 mm solid shell).
- **Top / Bottom Layers:** 6 layers (1.2 mm solid).
- **Infill:** 45%–60% Gyroid or 100% rectilinear near mounting bosses.
- **Layer Height:** 0.16 mm Optimal or 0.20 mm Standard.
- **Shrinkage Compensation (Bambu Studio):** X-Y hole compensation `+0.10 mm`, X-Y contour compensation `0.00 mm`.

## Fasteners & Hardware

| Item | Spec | Qty | Purpose |
|---|---|---|---|
| M2.5 Heat-Set Inserts | OD 3.4 mm × L 4.0 mm (Ruthex / McMaster) | 8 | Sensor PCB retention |
| M2.5 × 6 mm BHCS | Stainless steel / Class 10.9 | 8 | Clamping top plate to base |
| M3 × 10 mm SHCS | DIN 912 / ISO 4762 Class 12.9 | 4 | Chassis mounting |
| Dampening Shim (optional) | 0.5 mm Poron / Silicone sheet | 2 | High-frequency acoustic damper |

## Parametric Regeneration

To adjust clearances, mounting hole dimensions, or wall thicknesses, edit `parameters.json` and run:

```bash
python3 generate.py
```

Outputs:
- `dual_accel_mount_base.step` & `.stl`
- `dual_accel_mount_clamp.step` & `.stl`
- `assembly.step`
- `validation.json` (verified manifold geometry, 0 non-manifold edges, volume parity)
