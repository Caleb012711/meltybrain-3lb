# 03 — Testing, Tuning & Driving (translation)

Melty drives by modulating the two wheels once per revolution (translational drift). It only works if balanced + tuned.

## Safety first
Wheel locks/covers ON until arena/test box. Concrete floor, no people/pets in plane of spin. LiPo bag + 60s link drill. Film failsafe test (TX off → spin stops) — TRC will ask.

## Sequence
1. **Low-RPM slide (no ring teeth or covered):** 500–1000 RPM, confirm heading LED matches stick. If it orbits wrong way, flip heading offset 180°.
2. **Translation trim:** command forward, add trim until path is straight, not arcing. Tune radius/offset per floor (wood cleats bite, steel skates).
3. **Spin-up curve:** ramp to 2000 → 3000 → 4000 RPM. Hop = stop, re-balance (see 01). Heat-check motors/ESCs each step.
4. **Hit recovery:** blip test — after a fake hit (stick punch), bot should re-hold RPM, not toilet-bowl. Log RPM/accel if Pi onboard.
5. **Match sim:** 3-min pack, drive + spin, weigh after (hot battery ≠ weight change, loose screws = change).

## Autonomy ladder (Eyeliner Evo, legal)
- T0 MCU safety (failsafe/brake) → T1 MCU spin (~1kHz) → T2 onboard Pi assist (50–100Hz trim/logging) → T3 pit Pi dashboard (~5Hz) → T4 cloud AI (seconds, hints only). T3/T4 never drive.
- DIY handset = trainer/pit tool until TRC pre-clears under SPARC §6.4.3. Match radio = RadioMaster Pocket ELRS + EP1/RP1.

## Done when
- [ ] Straight-line translation at low + high RPM, filmed
- [ ] Failsafe video saved in repo (`firmware/failsafe-test.mp4` — add it)
- [ ] 3-min run, no loose fasteners, temps OK
- [ ] Scale reads ≤1361g fight-ready + spares packed (teeth, cleats, ESC, 2nd pack)
