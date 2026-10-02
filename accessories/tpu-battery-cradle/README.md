# TPU 95A Dual 4S 550mAh Battery Cradle

Parametric, impact-absorbing battery retention cradle engineered in **Bambu TPU 95A HF** for dual Tattu R-Line 4S 550mAh 95C LiPo packs.

## Engineering Intent & Shock Mitigation

- **Energy Dissipation:** In meltybrain combat, battery packs are subject to massive rotational inertia and direct wall shock. Rigid plastic mounts crack or transmit high-g shock into LiPo foil pouches. Flexible TPU 95A acts as a viscoelastic shock isolator.
- **Dual Retention System:** Deep pocket walls provide lateral constraint, while dual 15 mm underside strap channels allow heavy-duty hook-and-loop (Velcro) or Kevlar straps to wrap 360° around both cells.
- **XT30 Wire Relief:** Dedicated lead exit channels protect balance and main power leads from pinch loads against the chassis armor.
- **Anti-Pullthrough Flanges:** M3 mounting holes feature deep counterbores designed for standard stainless steel M3 washers, distributing bolt clamping pressure to prevent screw pull-through in TPU.

## Print Profile (Bambu Studio / OrcaSlicer)

- **Filament:** Bambu TPU 95A HF (Dry at 65°C for 6 hours prior to printing!)
- **Wall Loops:** 5 walls (min 2.0 mm solid perimeter shell)
- **Top / Bottom Shell:** 5 layers (1.0 mm)
- **Infill:** 45%–55% Gyroid (provides isotropic energy absorption)
- **Print Speed:** 25–35 mm/s (Max volumetric speed: 3.2 mm³/s)
- **Nozzle Temp:** 230°C / Bed: 45°C on Textured PEI (with glue stick release layer)
- **Shrinkage Compensation:** X-Y Hole Compensation `+0.15 mm`, X-Y Contour `+0.20 mm`

## Parametric Regeneration

```bash
python3 generate.py
```
