# Materials branch — steel vs titanium + supporting specs

Companion to `MASS.md` (measured volumes + totals). Densities: AR500 7.85, Ti-6Al-4V 4.43, 6061-T6 2.70, TPU 1.21, PLA+ 1.24, UHMW 0.94, polycarbonate 1.20 g/cc.

## 1. Ring/weapon branch: AR500 default, Ti conditional

- **Default: AR500 steel weapon (teeth as modeled, 55.629 cm³ → 436.7 g).** All-up ~1036 g, passes 1361 g cap and 1310 g target with 274 g+ margin. Steel wins on cost, grindability, tooth life, and spin energy (heavier = harder hits at same RPM).
- **Ti-6Al-4V branch: identical geometry → 246.4 g, saves 190.3 g** (undercutter-Ti saves 238.8 g vs steel-standard). Take the hit on cost and reduced spark/keel durability only when mass forces it.

### EXACT crossover condition (Ti ring becomes mandatory)

Let `M_fixed` = everything except the steel weapon = **598.7 g** (plates 173.6 + TPU chassis 97.0 + TPU pods 84.0 + wheels/SOLIDs 33.2 + steel fasteners 15.9 + COTS+battery 195; see MASS.md).
Let `V_w` = weapon volume in cm³ (measured 55.629 standard / 44.674 undercutter; add any separate hoop volume to `V_w`).

- Steel-weapon total = `M_fixed + V_w × 7.85`
- Ti-weapon total = `M_fixed + V_w × 4.43`

Ti becomes **mandatory** iff the steel-weapon total breaches the limit:

> **Switch to Ti iff `M_fixed + V_w × 7.85 > 1361 g` (hard cap), and plan the switch iff `> 1310 g` (internal target).**

Numerically (current CAD, standard teeth): 598.7 + 436.7 = 1035.7 g → **325.3 g of growth headroom to the cap, 274.3 g to target.** Ti is NOT mandatory today.
Each added cm³ of steel costs 7.85 g (Ti: 4.43 g; delta 3.42 g/cm³). Examples:
- Adding a separate 8-in hoop of ~25 cm³ in steel adds ~196 g → total ~1232 g: still passes, but target margin shrinks to ~78 g → order Ti hoop blank in parallel.
- A 40 cm³ steel hoop (+314 g) → ~1350 g: passes cap by 11 g but **fails the 1310 g target → Ti mandatory by target rule** (Ti hoop 177 g → total ~1213 g, passes both).
- Battery jump to 4S 850 (+60 g) + wiring growth (+30 g) consumes ~90 g of the 274 g target headroom first — recheck before blaming the weapon.

Rule of thumb: **if scale weight with steel weapon reads >1310 g at any weigh-in, freeze steel and cut Ti; if it reads >1361 g, the bot does not compete until Ti (or equivalent diet) is fitted.**

## 2. Plates: 6061-T6 + polycarbonate window

- Bottom / Outer Top / Central Top as modeled (64.293 cm³) → **6061-T6, 173.6 g.** 3.5–3.9 mm measured thickness is sane for 3 lb; do not go below 3 mm on Bottom without pocketing analysis.
- Poly window: 2 mm polycarbonate (1.20 g/cc) inset in Outer Top Plate for LED/RX visibility. Swap math: every 10 cm³ converted from Al to poly saves 10×(2.70−1.20)=**15.0 g**. Suggested max ~12–13 cm³ window → ~−19 g, retain Al perimeter ring ≥12 mm for screw retention.
- Finish: deburr + alodine or anodize where budget allows; nylon-insert or prevailing-torque nuts on all plate screws (see §5).

## 3. TPU cradle note (chassis)

- `Chassis` 80.134 cm³ → TPU 95A at ~100% equivalent = **97.0 g**. TPU cradle is **legal at 3 lb in the open/TRC class** (flexible permits vary by event — confirm event rules; some restrict exposed flex; ours is internal shock mount, historically accepted — re-verify each event).
- Print: 4–5 walls, 40–60% gyroid + solid top/bottom, pause-in brass inserts for all bolt points. If tech balks, fallback is UHMW cradle (75.3 g, −21.6 g) or PLA+ (99.4 g, +2.4 g, stiffer but brittle).
- Honest tolerance: slicer walls/infill make real mass ±15% of the 97.0 g math — weigh the print.

## 4. Wheels verdict: rubber first, Ti cleats per Liftoff path — NOT foam-pour

- As modeled wheel-ish SOLIDs total 30.220 cm³ → ~33 g at rubber density. Placeholder geometry — weigh real wheels.
- **Run molded rubber / soft TPU tires first.** Grip wins matches at 3 lb; steel/Ti wheels ice out.
- Traction upgrade path (per Liftoff): **Ti cleats screwed/riveted into rubber** — small Ti-6Al-4V angle teeth (~2–4 g each) for bite without the unsprung mass of full metal wheels.
- **Do NOT foam-pour tires.** Voids, imbalance at spin speed, and tech-inspection grief; molded or quality COTS only.

## 5. Fasteners: 12.9 + Loctite 243

- Structural: **12.9 socket-head M3** (measured 8× M3×8 = 0.936 cm³ → 7.3 g steel) + 4-40 tapping screws into plastic only. Measured steel fastener total ~15.9 g — fine.
- **Loctite 243 (blue, oil-tolerant) on every metal-to-metal thread.** 242 is acceptable; 243 preferred for dirty pit conditions. No red without heat-plan. Re-apply after each disassembly; witness-mark heads.
- Ti fastener swap saves only ~7 g on 2 cm³ — last diet, not first.

## 6. Tip speed — real math (NOT 200+ mph)

`v = π × D × RPM / 60`; mph = m/s × 2.23694. 8 in = 0.2032 m, 9 in = 0.2286 m.

| Ring Ø | 2000 RPM | 3000 RPM | 4000 RPM |
|---|---|---|---|
| 8 in | 21.28 m/s = **47.6 mph** | 31.92 m/s = **71.4 mph** | 42.56 m/s = **95.2 mph** |
| 9 in | 23.94 m/s = **53.5 mph** | 35.91 m/s = **80.3 mph** | 47.88 m/s = **107.1 mph** |

So the operating band is **~48–107 mph**. Claims of 200+ mph require ~7500+ RPM on 9 in (or ~8500 on 8 in) — outside this drive plan and outside what the CAD/bearings support. Quote 48–107 mph; anything higher is a different gearbox and a new weight audit.

## 7. Shopping / fab order

1. Fight steel-standard now (passes weight). 2. Parallel-quote Ti weapon blank (standard + undercutter profiles) with lead time noted — pull trigger only on crossover (§1). 3. 6061 plate set + 2 mm poly window sheet. 4. TPU (95A) + inserts + Loctite 243 + 12.9 M3 hardware. 5. Rubber tires; Ti cleat stock for Liftoff path. 6. Scales at every assembly milestone — CAD lies, scales don't.
