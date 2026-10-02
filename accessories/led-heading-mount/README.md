# LED Heading Indicator Mount & Diffuser Lens

Parametric optical beacon mount engineered for high-brightness heading indicator LEDs on 3lb meltybrains.

## Engineering Intent

- **Driver Line-of-Sight:** In meltybrain combat, directional translation is determined by pulsing high-brightness LEDs at the robot's heading angle. The pulse duration is typically 10°–20° of arc at 3,000 RPM (a flash lasting ~100 microseconds).
- **Beam Spreading Diffuser:** Direct LED lenses produce narrow 15°–30° spot beams that disappear when the robot tilts or when viewed off-axis from the driver station. The snap-fit translucent PETG diffuser cap spreads the beacon into a wide 120° fan pattern.
- **Resistor & Wiring Bay:** Integrated pocket protects the current-limiting ballast resistor (100 Ω for blue/green LEDs) from shock fatigue and short circuits.

## Materials & Print Settings

- **Mount Body:** Bambu PETG HF (Black / Dark Opaque to block stray back-light)
  - 4 walls, 50% Gyroid infill, 0.16 mm layer height
- **Diffuser Lens:** Bambu PETG Translucent / Natural (or Clear PLA)
  - 100% rectilinear infill aligned at 45° to maximize light transmission and internal scattering
- **Fasteners:** 2× M3 × 8 mm Socket Head Cap Screws

## Parametric Regeneration

```bash
python3 generate.py
```
