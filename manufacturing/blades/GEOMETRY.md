# Blades Geometry — Tooth Spec, Chamfer, Wear, Per-Config Guidance (Eyeliner 3lb)

Parent: `audit/autonomy-plan-2026-09-18.md` §3 (modular blades). Audit math: `audit/gauntlet-round/06-blades-geometry.md`.
Interface rules (bolt circle, tapered register, symmetric-only, trim-screw balance) live in `build-guide/01-frame-assembly.md` — this doc locks **geometry only**.

> v_mph = D_in × RPM / 336 (≈ π·D·RPM/1056). The `π·D·RPM/336` form overstates tip speed by exactly π — see gauntlet §2. Corrected: 8 in @ 2900 = 69.0 mph / 30.9 m/s; @ 4000 = 95.2 mph / 42.6 m/s. Measure YOUR spin Ø per config in CAD (Main CAD bbox 331 mm axis is reach, not diameter).

## A. Tooth height vs bite (the sizing rule)

Bite per tooth-pass (2 teeth): `bite_mm = attack_m/s × 30000 / RPM`.

| Attack \ RPM | 2000 | 2900 | 3454 | 4000 |
|---|---|---|---|---|
| 1 m/s (slow grind) | 15.0 | 10.3 | 8.7 | 7.5 |
| 2 m/s (typical close) | 30.0 | 20.7 | 17.4 | 15.0 |
| 3 m/s (fast close) | 45.0 | 31.0 | 26.1 | 22.5 |

Rule: effective cutting protrusion ≈ **1.0–1.5× your slow-engagement bite (1–2 m/s)**, capped at **12–16 mm** for the standard mid-cutter no matter what the fast-close column says. Rationale: the 1.5× factor exists so slow engagements still connect; tall teeth sized for 3–5 m/s showcase attacks fold, snag the floor, and break balance. If bite math demands more than the cap, drive through harder (more attack) or drop 300–500 RPM — do not grow the tooth. Fewer teeth = deeper bites (1→2 halves it); symmetric 2-tooth is the fight default because single-tooth + counterweight shakes the chassis on tooth-stop (Liftoff lesson).

## B. Edge chamfer — no folding knife-edges

- Leading (cutting) edge: **0.5–1.0 mm × 45° chamfer** (or 0.5–0.8 mm flat land + light hone). Never ship a zero-radius knife edge — AR500 foil edges fold on first hard contact, then tear and drag.
- Trailing edges: break **0.3–0.5 mm** (handling + crack resistance).
- All faces deburred; no grinding burns (straw/blue temper colors = re-dress).
- **Never drill or notch the rim/band to lighten** — holes are crack starters. Tune mass by tapering mid-span (Liftoff 326→241 g precedent), never by perforation. Balance corrections are trim screws opposite the heavy side (moment `m·r`), leveled in 4+ orientations on the point jig — never drilled pockets.

## C. Wear behavior (Ti cleat lessons from Liftoff, applied to teeth)

- **Steel ring (AR500, default):** work-hardens at the face, mushrooms slowly, re-dresses with a file/stone. Energy king: 1.77× the mass and KE of Ti at equal volume (teeth pair 55.63 cm³ → 437 g steel vs 246 g Ti). Wear signature to watch: rolled-over leading land >1 mm → re-chamfer; check bolt torque every fight (Loctite 243, 24 h cure, star pattern).
- **Ti (Grade 5, relief valve only):** galls, smears, picks up transfer from opponents/floor; loses a crisp edge faster than steel. Use only to buy ~190 g/pair of mass budget when the scale forces it. Spares ratio: **2× Ti pairs per 1× steel pair**; inspect after every fight, not every event.
- **Cleats ≠ teeth:** Liftoff runs steel rings + Ti cleats because cleats are consumable traction (1.55 in Ti, bite wood / skate polished steel, replaced often; hybrid cleat/silicone in test). Better grip raises attack speed → deeper bite (§A) → teeth can stay short. Phase 1 rubber to learn translation, Phase 2 cleats to fight — tooth spec does not change between phases, driving does.

## D. Per-config tooth guidance

- **A — Standard mid-cutter (fight default, 55.63 cm³ pair):** symmetric 2-tooth, 10–14 mm protrusion, chamfer per §B. Mass tune by mid-span taper toward ~300 g before any Ti swap. Spin Ø: measure tip circle in CAD; do not reuse the undercutter number.
- **B — Undercutter (45.4 cm³ → 356 g steel / 201 g Ti):** lower, longer-reach teeth, **8–12 mm** protrusion + leading-bottom chamfer (it eats floors). Floor-clearance check on wood AND steel before spin-up; verify spin Ø separately (reach ≠ diameter). Mass advantage (~81 g steel saved vs standard) is real — spend it on spares/battery, not taller teeth.
- **C — Wedge (control config):** no teeth; radius all leading edges **≥1.5 mm**; mass saved funds the second pack + Pi/BEC headroom. Re-balance from scratch — wedge mass distribution is not a teeth distribution.

## E. Interface + swap ritual (geometry touchpoints)

One bolt circle + tapered register for concentricity; symmetric-only (no extra holes); trim-screw balance points. Swap <10 min, one hex size; spares kit: teeth pair (pre-balanced as a pair — never mix halves), cleat set, ESC, pack, fastener set. Post-swap ritual: hand-spin (no rub) → 1000 RPM balance listen → point-jig level in 4+ orientations → 2000/3000 step-ups with heat checks. Log per-config spin Ø + all-up weight on the mass card before the event (steel ~1245 g / Ti ~1055 g all-in reference with standard teeth; re-weigh for B/C).

## F. Inspection vetoes (do not fight)

Tooth protrusion >16 mm · zero-radius leading edge · any rim/band hole or notch · visible crack at tooth root (dye-pen if in doubt) · mixed-pair halves · balance fix by drilling · missing chamfer after re-dress · undercutter without floor-clearance sign-off.
