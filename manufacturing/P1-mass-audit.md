# P1 Mass Audit — STEP Volume × Density vs 1361g Cap

Generated from CAD via OCP (STEPControl). Method: sum solid volumes per file, multiply by density. Mixed-material estimate at bottom = the decision gate.

Cap: **3 lb = 1360.8g (use 1361g). Target ≤1310g** to leave 50g margin for wires, Loctite, tape, scale error.

## Raw volumes (measured)

| File | Solids | Volume | All-steel 7.85 | All-Ti 4.43 | All-alu 2.70 | All-TPU 1.21 |
|---|---|---|---|---|---|---|
| `Main CAD.step` (full assembly) | 145 | 319.9 cm³ | 2512g | 1417g | 864g | 387g |
| `Standard Weapon Teeth.step` | 2 | 55.6 cm³ (27.8 each) | 437g pair / 218g each | 246g / 123g each | 150g | — |
| `Undercutter Config.step` | 10 | 45.4 cm³ | 356g | 201g | 123g | — |
| `Wheel Pod.step` | 25 | 12.3 cm³ | 96g | 54g | 33g | 15g TPU |

Largest solids in Main CAD (mm³): 80,134 / 32,668 / 27,815×2 / 25,651 / 18,700 / 11,858×2 / 10,479×2.
- 80,134 mm³ = 80.1 cm³ → **629g steel / 355g Ti / 216g alu.** This is almost certainly the chassis/ring body — it MUST be alu or Ti, never steel, or budget dies.
- 27,815 mm³ ×2 = the standard teeth (matches teeth file exactly) → 218g steel each.
- BBox Main CAD: 138 × 331 × 168 mm. 331mm = long axis (likely undercutter reach or staged configs, not spin diameter — verify spin diameter in CAD before tip-speed math).

## Branch table (metal only, before electronics)

| Branch | Assumption | Metal mass | + electronics/battery (~350–450g) | Verdict |
|---|---|---|---|---|
| A — all-steel fantasy | 319.9 cm³ steel | 2512g | ~2900g | ❌ Impossible — proves mixed-material mandatory |
| B — steel teeth + alu rest | teeth 437g steel + (319.9−55.6)=264cm³ alu 713g | ~1150g | ~1500–1600g | ❌ Over — this is why full-steel Eyeliner can't fly as-drawn |
| C — Ti teeth + alu rest | teeth 246g Ti + 713g alu | ~959g | ~1310–1410g | ⚠️ Borderline — needs TPU substitution + lightening |
| D — steel teeth + alu + TPU shell credit | teeth 437g + ~150cm³ alu 405g + ~100cm³ TPU 121g (shell/cradle as printed, not milled) | ~963g + fasteners ~60g = ~1020g | ~1370–1470g | ⚠️ Still over unless large 80cm³ body is pocketed/lightened |
| E — Ti ring/teeth + alu plates + TPU cradle (Liftoff formula) | Ti weapon ~200–250g + alu plates/structure ~300–400g + TPU ~80–120g + pods Ti/alu ~50g | ~650–800g | ~1000–1250g | ✅ Flies — leaves margin for Pi + BEC (~50g) + bigger battery |

## Decision (locks materials-guide.md)

1. **Do NOT order steel everything.** Branch B/D prove Eyeliner as-drawn is overweight with a steel ring + solid alu chassis.
2. **Default: Liftoff formula (Branch E)** — AR500 steel ONLY for the thin weapon ring/teeth band (~0.25", tapered, no holes, target 240–330g like Liftoff), 6061-T6 for plates, TPU for shell/cradle, Ti for cleat wheels.
3. **If the 80cm³ body is currently solid in CAD: pocket/lighten it or convert to TPU + alu sandwich.** 629g steel / 355g Ti for one part is unaffordable; 216g alu is the max; TPU+plate sandwich is lighter still.
4. **Ti relief valve:** if after lightening the weapon band still pushes total over 1310g target, swap weapon band steel→Ti (saves ~190g on teeth pair: 437→246g) before touching battery/motor size.
5. **Next action:** in CAD, isolate the weapon ring band vs chassis tub, get their individual volumes, re-run this table with those two numbers + real electronics weights. Then order.

## How to re-run

```bash
sudo apt-get install -y libgl1
pip install cadquery-ocp
python3 /tmp/opencode/step_audit.py "Main CAD.step"
```

Tip-speed check for later: v_mph = π × D_in × RPM / 336. 8" @4000 RPM ≈ 95 mph, NOT 200+.
