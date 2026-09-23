# 01 — Frame Assembly (mechanical)

## Tools
M2/M2.5/M3 hex, torque driver if you have one, digital scale (0.1g), calipers, blue Loctite 243, heat-set insert iron, bearing press / vise + sockets, stainless shim kit 6×12×0.1/0.2/0.5 mm.

## Veto — drive torque path
NO set-screws anywhere on drive torque path (dead axle ↔ hubs ↔ wheels). VETOED: cup-point / flat-point set-screws back out and wallow shafts under melty shock. Allowed only: clamp + press fit + Loctite 243. If a joint slips, fix fit/clamp area — do not add a set-screw.

## Order
1. **Clean + identify:** deburr PCBWay edges (file + Scotch-Brite), match each part to `manufacturing/pcbway/ORDER-CHECKLIST.md`. Test-fit every bolt by hand first — never force.
2. **Bearings + shim procedure:** press straight, outer race only — never press inner race / seals. If tight, freeze bearing + warm housing, don't hammer. Shim stack: stainless 6×12×0.1/0.2/0.5 mm on 6 mm dead axle between bearing inner races / hub shoulders. Add/remove 0.1 mm until: spins free with zero grind, zero crunch, axial endplay <1 mm. Log final shim stack + endplay per pod in `BOM.md` weight log.
3. **Pods + orientation lock:** assemble `Wheel Pod.step` pods per CAD — dead axle + 2× 626-2Z/C3 (6×19×6), alu inner/outer hubs, Ti cleats last (sharp!). Shim endplay <1 mm (logged). Orientation: wheels outward Rev7 torque pattern, roll axis 90° to tooth cutting edge, pods 180° opposed at equal radius from center. Verify no rub at full hand-spin — wheel / cleat must clear ring in all rotations.
4. **Ring + plates:** symmetric 2-tooth ring, NO extra holes. Sandwich TPU shell between 6061 plates, snug diagonal star pattern. Ring bolts get 243 + full cure 24h.
5. **Balance (critical):** hang bot on a point/bearing through its center. Heavy side drops. Fix with symmetric trim screws / small counterweights — never drill the ring to "lighten" (crack starter). Goal: sits level any rotation. Even 3–5g off = violent hop at 3000 RPM.
6. **Weigh:** log every subassembly in `BOM.md`. If over, see `manufacturing/P1-mass-audit.md` Branch E — pocket chassis or Ti-swap ring before adding Pi/battery.

## Done when
- [ ] All bolts thread clean, 12.9 + 243, no stripped inserts
- [ ] No set-screws on drive torque path — clamp + press + 243 only, verified
- [ ] Wheels spin true, no rub on ring at full hand-spin; pods 180° opposed, equal radius, roll axis 90° to tooth
- [ ] Bearings spin free zero grind, endplay <1 mm logged per pod with shim stack (6×12×0.1/0.2/0.5)
- [ ] Balance jig: level in 4+ orientations
- [ ] Weight logged, path to ≤1361g clear
