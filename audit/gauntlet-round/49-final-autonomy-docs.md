# 49 — Final Autonomy Docs Consistency (fix-wave confirmation)

Skills read: `robotics-testing` (.opencode/skills/robotics-testing/SKILL.md:1-12), `robot-bringup` (.opencode/skills/robot-bringup/SKILL.md:1-17).

## (1) Banned-string grep (autonomy/ + radio/ + manufacturing/blades/)
- bare-`1360`: PASS — zero bare hits; only `1360.8` inside `1361 g (1360.8 g)` pairs (SAFETY.md:116, BLADES.md:114-115).
- `/336`: PASS w/ note — single hit manufacturing/blades/GEOMETRY.md:6, which names the wrong `π·D·RPM/336` form only to reject it (correct `/1056`+`/336`-free formula used).
- `/tmp/opencode`: PASS — zero hits.
- `progress-bar` variants: PASS — zero hits (`progression` prose only, e.g. SAFETY.md:108).

## (2) SAFETY.md TRC letter + freeze coherent — PASS
- Freeze autonomy/SAFETY.md:115-118: `1361 g everywhere — 3 lb = 1360.8 g`.
- Letter autonomy/SAFETY.md:127-128: `≤1361 g`; hardware string (Teensy 4.0 + dual H3LIS331DL + AM32 dShot600 + PROPDRIVE 2836) matches §1/firmware; kill/TTL/box constraints restated, no contradiction.

## (3) BLADES.md cap line coherent — PASS
- manufacturing/blades/BLADES.md:114-116: `Cap 1361 g (1360.8 g), target ≤1310 g`, `1361 g everywhere (3 lb = 1360.8 g)` — locks to P1-mass-audit.md:5.

## (4) Wave-unaffected docs intact — PASS
- PIT-CHECKLIST.md:1-4 header + cap line intact; TEST.md:1-7 header/iron-rules intact; STACK.md:1-5 header intact; PI.md:1-5 header intact; CLOUD.md:1-10 header/iron-rules intact. No wave edits visible.

## (5) Numbers cross-check vs firmware/README.md + P1 audit — PASS
- RPM bands: SAFETY.md:79/47, STACK.md:73, TEST.md:42/103/106 vs firmware/README.md:18 (1500–2000 cap, 2000–4000 target, 3200 heritage) — agree.
- BEC 5V/3A + TPU/no-Pi-USB: SAFETY.md:69, STACK.md:85, PI.md:24 vs firmware/README.md:30/33 — agree.
- UART 115200: PI.md:1/26/45/56/60, CLOUD.md:224 vs firmware/README.md:31 — agree.
- Teeth masses: BLADES.md:108-109 (55.63 cm³ → 436.7/218.3 g; 45.41 → 356.5/201.2 g) vs P1-mass-audit.md:12-13 (55.6 → 437/218; 45.4 → 356/201) — agree to rounding as stated.

Verdict: GO — autonomy docs coherent, bans clean, numbers lock.
