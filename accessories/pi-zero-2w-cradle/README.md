# Pi Zero 2W / Orange Pi Supervisor Shock Isolation Cradle

Parametric, shock-isolated mounting cradle engineered for the meltybrain Linux supervisor computer (Orange Pi Zero 2W / Raspberry Pi Zero 2W) and Matek Micro BEC 5V/4A.

## Engineering Intent & Supervisor Safety

As established in `electronics/pi-supervisor.md` and `electronics/firmware.md`:
- The Linux supervisor handles telemetry logging, post-match WiFi transfer, and advisory RPM trim. It is **never** in the critical flight-control loop.
- In 3lb combat, robots experience 50g–200g arena impact shocks. Without mechanical isolation, micro-SD cards unseat, oscillators desolder, and Linux filesystems remount read-only.
- This cradle provides a **two-tier isolation architecture**:
  1. **TPU 95A Dampening Bushings:** 4× corner grommets decouple high-frequency chassis vibration and arena impacts.
  2. **Retention Shroud & Anti-Ejection Shroud:** Prevents the MicroSD card from popping out under lateral shock loads.
  3. **Dedicated BEC Isolation Chamber:** Houses the 5V/4A Matek buck regulator adjacent to the SBC with short twisted wiring.
  4. **Heatsink Convection Chimney:** 16×16 mm opening for passive dissipation from aluminum/copper SoC heatsink.

## Material Selection & Bambu Lab Profiles

| Component | Material | Perimeters | Infill | Layer Height |
|---|---|---|---|---|
| `pi_cradle_base` | Bambu PETG HF | 4 walls (1.6 mm) | 40% Gyroid | 0.20 mm |
| `pi_cradle_cover` | Bambu PETG HF | 4 walls (1.6 mm) | 100% Solid | 0.16 mm |
| `tpu_isolation_grommet` | Bambu TPU 95A HF | 4 walls (1.6 mm) | 50% Gyroid | 0.16 mm |

## Hardware & Fasteners

- 4× M2.5 Heat-Set Inserts (OD 3.4 mm × L 4.5 mm)
- 4× M2.5 × 10 mm Socket/Button Head Cap Screws
- 4× M3 × 12 mm Socket Head Cap Screws + M3 washers (for chassis grommet mounts)

## Parametric Regeneration

```bash
python3 generate.py
```

Outputs:
- `pi_cradle_base.step` & `.stl`
- `pi_cradle_cover.step` & `.stl`
- `tpu_isolation_grommet.step` & `.stl`
- `assembly.step`
- `validation.json`
