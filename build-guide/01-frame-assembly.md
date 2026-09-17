# 01 — Frame Assembly (mechanical)

## Tools
M2/M2.5/M3 hex, torque driver if you have one, digital scale (0.1g), calipers, blue Loctite 243, heat-set insert iron, bearing press / vise + sockets.

## Order
1. **Clean + identify:** deburr PCBWay edges (file + Scotch-Brite), match each part to `manufacturing/pcbway/ORDER-CHECKLIST.md`. Test-fit every bolt by hand first — never force.
2. **Bearings:** press straight, outer race only. Must spin free with zero grind. If tight, freeze bearing + warm housing, don't hammer.
3. **Pods:** assemble `Wheel Pod.step` pods per CAD — dead axle + 2× 626-class bearings, alu hubs, Ti cleats last (sharp!). Shim endplay <1mm.
4. **Ring + plates:** symmetric 2-tooth ring, NO extra holes. Sandwich TPU shell between 6061 plates, snug diagonal star pattern. Ring bolts get 243 + full cure 24h.
5. **Balance (critical):** hang bot on a point/bearing through its center. Heavy side drops. Fix with symmetric trim screws / small counterweights — never drill the ring to "lighten" (crack starter). Goal: sits level any rotation. Even 3–5g off = violent hop at 3000 RPM.
6. **Weigh:** log every subassembly in `BOM.md`. If over, see `manufacturing/P1-mass-audit.md` Branch E — pocket chassis or Ti-swap ring before adding Pi/battery.

## Done when
- [ ] All bolts thread clean, 12.9 + 243, no stripped inserts
- [ ] Wheels spin true, no rub on ring at full hand-spin
- [ ] Balance jig: level in 4+ orientations
- [ ] Weight logged, path to ≤1361g clear
