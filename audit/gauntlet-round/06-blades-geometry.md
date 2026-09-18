# Gauntlet 06 — Blades Geometry: calculator re-derivation, tip-speed verdict, blade-goodness spec

Agent: **6/10 (blades-geometry)** · Date: 2026-09-18 · Scope: `manufacturing/P1-mass-audit.md`, `web/src/pages/Engineering.tsx` (all 8 calculators), screenshots 07/08/09, `audit/autonomy-plan-2026-09-18.md` §3.

> Docs only. No edits to `Engineering.tsx` — proposed diffs in §9.

## 0. Skills

- `skill` tool invoked first per mandate. Result: only skill registered in this environment is `customize-opencode` (opencode self-config). Requested `robotics-testing` and `robotics-design-patterns` (named in autonomy-plan §5) are **not installed** — `skill("robotics-testing")` returns `Skill "robotics-testing" not found. Available skills: customize-opencode`.
- Worked to the intent of both missing skills by hand: bench→box→arena progression, mock-vs-measured checks, FSM/HAL thinking for the spin-check ritual, fail-safe defaults (governor caps, symmetric-only rule). Gaps from missing skills are noted in §10.

## 1. Files read

- `audit/autonomy-plan-2026-09-18.md` (full, §3 modular-blade interface is the parent requirement).
- `manufacturing/P1-mass-audit.md` (full, incl. line-47 tip-speed note).
- `manufacturing/materials-guide.md` (full — cross-checks tip-speed + Liftoff precedents).
- `web/src/pages/Engineering.tsx` (full, 171 lines — every calculator re-derived below).
- `web/src/pages/Home.tsx` lines 147–151, `web/src/pages/Pages.tsx` lines 255–280 (tip-speed/bite text cross-check).
- Screenshots via Read: `07-engineering-calcs.png` (2900 RPM / 8 in / steel → 216.9 mph, 2053 J), `08-engineering-balance.png` (24.0 N, 188 g PASS, 0.52 kJ → 89 spin-ups), `09-engineering-mass.png` (1054.7 / 1245.0 g).

## 2. Tip-speed contradiction — verdict: P1 audit CORRECT, calculator WRONG by exactly π

### 2.1 First-principles derivation

Circumference of spin circle: C = π·D. With D in inches, C in inches.
Distance per minute at RPM: π·D·RPM inches/min.
1 mile = 63,360 inches; 1 hour = 60 min, so inches/min → mph multiply by 60/63,360 = 1/1056.

```
v_mph = π · D_in · RPM / 1056        (exact)
```

Since π/1056 = 1/336.13…, this simplifies to the shop form:

```
v_mph ≈ D_in · RPM / 336             (correct shop form, NO π)
```

The documented/coded form `v = π·D·RPM/336` **double-counts π** (it is π× too large). Proof: π/1056 vs π/336 differ by factor 1056/336 = π.

Cross-check in SI (D = 8 in = 0.2032 m, RPM 2900 → 48.333 rev/s, C = 0.6385 m): v = 0.6385 × 48.333 = **30.86 m/s = 69.05 mph**. Matches D·RPM/336, not π·D·RPM/336.

### 2.2 Corrected numbers (hand-computed, verified in Python)

| Case | Calculator shows (wrong) | Correct v | Correct v (m/s) |
|---|---|---|---|
| 8 in @ 2900 RPM (screenshot default) | 216.9 mph / 97.0 m/s | **69.0 mph** | **30.9 m/s** |
| 8 in @ 3000 RPM (code default) | 224.4 mph / 100.3 m/s | **71.4 mph** | **31.9 m/s** |
| 8 in @ 4000 RPM | 299.2 mph / 133.8 m/s | **95.2 mph** | **42.6 m/s** |
| 8 in @ 3454 RPM (accel ceiling ref) | 258.4 mph / 115.5 m/s | **82.2 mph** | **36.8 m/s** |
| Slider extremes: 5 in @ 4000 | 187.0 mph | **59.5 mph** | 26.6 m/s |
| Slider extremes: 9 in @ 4000 | 336.6 mph | **107.1 mph** | 47.9 m/s |

### 2.3 Which document is right?

- `P1-mass-audit.md:47`: "8" @4000 RPM ≈ 95 mph, NOT 200+" → **CORRECT** (95.24 mph by D·RPM/336).
- `Engineering.tsx:50,95` + `Home.tsx:149`: `π·D·RPM/336` → **WRONG**, overstates every tip speed by 3.1416×.
- `materials-guide.md:21`: "8" ring at 4000 RPM = π×8"×4000/60 = 95 mph" → result 95 mph is **correct** (π·D·RPM/60 = 1675.5 in/s = 95.2 mph after ×3600/63360); expression is just missing the unit-conversion factor in the text. Recommend rewriting as `π·D·RPM/60 in/s → ×0.05682 = mph` to avoid confusion.
- `Home.tsx:149–150` is self-contradictory (wrong formula, right 95 mph example) — same one-line fix.
- `content.ts` stat "~95 mph IF 8 in at 4000 RPM" is **correct** and needs no change.

**Corrected audit note:** the P1 line-47 formula fragment should read `v_mph = D_in × RPM / 336 (≈ π·D·RPM/1056)`.

## 3. Calculator-by-calculator re-derivation (all by hand, checked against screenshots)

### 3.1 Weapon KE, thin-ring model — FORMULA STRUCTURE OK, INPUTS WRONG (inherits ×π² error)

Code: `ms = mph·0.44704; ke = ½·m·ms²`, m = 0.4367 kg steel / 0.2464 kg Ti (from 55.63 cm³ pair — verified in §3.6).

Because v is π× too large, KE is π² ≈ 9.87× too large. Hand recomputation:

| Config | Screenshot (wrong v) | Corrected KE (thin-ring, teeth-pair mass only) |
|---|---|---|
| Steel 437 g @ 2900 | 2053 J (97.0 m/s) | **208 J** (30.86 m/s): ½·0.4367·30.86² = 0.21835·952.3 = 207.9 |
| Steel @ 3000 | 2197 J | **223 J** (31.93 m/s) |
| Steel @ 4000 | 3906 J | **396 J** (42.56 m/s) |
| Ti 246 g @ 2900 | 1159 J | **117 J** |
| Ti @ 3000 | 1240 J | **126 J** |
| Ti @ 4000 | 2204 J | **223 J** |

Verdict flip: the "Over 200 J at full width [model]" stamp at 2900/steel becomes **borderline 208 J (steel) / 117 J under (Ti)**. At 4000 RPM both clear 200 J (396 / 223 J). The 200 J threshold itself is arbitrary — keep it only as a relative bar, label MODEL (already done), and add the thin-ring caveat below.

Deeper model caveat (propose as caption, §9): thin-ring `½·m·v²_tip` assumes **all** teeth mass at tip radius. Real teeth extend inward, so true `KE = ½·I·ω²` with I from CAD is 10–30% lower. Current numbers are an **upper bound on teeth-pair-only energy**, and they exclude the rest of the spinning bot (plates/pods/battery all rotate too — that adds energy but at smaller radii). Correct engineering fix: pull principal inertia Izz about the spin axis from CAD for the full spinning mass and display `½·I·ω²` alongside the thin-ring bound. Do not silently swap numbers — show both until CAD inertia lands.

### 3.2 Bite (2 teeth) — CORRECT

Code: `biteMm = attack·60/(rpm·2)·1000`. Derivation: rev/s = rpm/60; tooth-pass frequency (2 teeth) = rpm/30 Hz; time per tooth = 30/rpm s; bite = attack(m/s)·30/rpm m = attack·30000/rpm mm. Code form `attack·60/2/rpm·1000` ≡ attack·30000/rpm. ✓.

Spot values: 3 m/s @ 2900 → **31.0 mm** (1.5× = 46.6 mm); 3 m/s @ 4000 → **22.5 mm** (1.5× = 33.8 mm); 1 m/s @ 4000 → 7.5 mm. Matches `Pages.tsx` "bite beats tip speed" text form `attack·60/(RPM·teeth)`. No change needed. Tooth-height implication in §7: the 1.5× rule at high attack speeds demands impractically tall teeth (33–47 mm) — that is the point: tall teeth bend/fold, so the guidance caps height and accepts skating at high RPM rather than growing teeth to match (see §7).

### 3.3 Imbalance force — CORRECT

Code: `F = (imbG/1000)·(imbR/1000)·ω²`, ω = rpm·2π/60. Hand: ω(2900) = 303.687 rad/s, ω² = 92,226. F = 0.004·0.065·92,226 = **23.98 N ≈ 24.0 N**; kgf 24.0/9.807 = **2.45** ✓ matches screenshot. Fix-mass hint `imbG·imbR/65` g opposite at 65 mm is moment-correct (m·r balance at common radius). At 4000 RPM the same 4 g becomes **45.6 N (4.65 kgf)** — worth adding as a second worked example in the caption (scaling is ω², +90% from 2900→4000).

### 3.4 Accelerometer a = ω²r — CORRECT (all three derived quantities)

Code: `accG = ω²·(accR/1000)/9.81`; `maxR = 400·9.81/ω²·1000`. Hand at 2900/20 mm: 92,226·0.02 = 1844.5 m/s² /9.81 = **188.0 g PASS** ✓. MaxR(2900) = 3924/92,226·1000 = **42.55 mm** ✓. RPM ceiling at 30 mm: ω = √(3924/0.03) = 361.66 rad/s → **3453.6 RPM** ✓ ("3454 RPM at 30 mm" exact). At 4000/20 mm: **358 g PASS**; at 4000/30 mm: 537 g SATURATED. Guidance "mount within ~20 mm for full 4000 band" is right (maxR(4000) = 22.4 mm — 20 mm leaves only 2.4 mm margin; prefer ≤18 mm + potting, see §9).

### 3.5 Spin-ups per pack — ARITHMETIC CORRECT, PHYSICS BASELINE INCONSISTENT (flag)

Code: `eSpin = 995·(rpm/4000)²`; `spins = ⌊46800/eSpin⌋`. Hand at 2900: 995·0.725² = 995·0.525625 = **523.0 J = 0.52 kJ** ✓; 46800/523 = 89.5 → **89** ✓. Pack energy: 2× 4S 550 mAh: 2·(14.8 V·0.55 Ah) = 16.28 Wh gross; 13 Wh usable = **46,800 J** ✓ (assumes ~80% depth — state it).

Inconsistency: corrected teeth-only mech KE at 4000 is 396 J steel → ~660 J electrical at 60%. The 995 J constant implies either (a) whole-bot inertia well above teeth-only (plausible — plates/pods/pack all spin), or (b) lower efficiency. Constrain it: whole-bot thin-ring at ~1.05 kg / 4-in radius gives ~951 J mech → ~1585 J elec, which overshoots the other way. So 995 J sits between teeth-only and whole-bot-thin-ring — it is an empirical placeholder, not derived from the displayed KE. Keep the calculator but label the constant: rename to `E_SPIN_REF_J = 995 @ 4000 (empirical; re-measure on bench)` and add caption "assumes 60% spin-up efficiency, 13 Wh usable (80% DoD); bench-measure yours (V·I·t) and overwrite the constant." Proposed diff in §9.

### 3.6 Mass rollup — CORRECT (all four totals + margins)

Teeth pair 55.63 cm³: steel 55.63·7.85 = **436.70 g** ✓; Ti 55.63·4.43 = **246.44 g** ✓ (matches P1 437/246 g). Totals: Ti 246.4+399.3+409.0 = **1054.7 g** ✓; steel 436.7+399.3+409.0 = **1245.0 g** ✓. Margins to 1310 g: **+255 g / +65 g** ✓ (screenshot rounds identically). Phantom-mass note (flying both staged configs adds ~351 g steel / ~198 g Ti) reconciles with P1 branch table within rounding. No change. Residual risk: 399.3 g "plates+pods+shell+fasteners" and 409.0 g "electronics+pack+wiring" are single fixed lines — require a weigh-in log per subassembly before ordering (see GEOMETRY.md §B).

### 3.7 Power + harness verdicts — CORRECT, two clarifications

- 2× 48 A = 96 A vs 2× (0.55 Ah·95C = 52.25 A) = **104.5 A** pack continuous → (104.5−96)/96 = **8.9% margin** ✓ ("~9%" accurate). Burst-only caveat correctly stated.
- XT60 + 16 AWG mains, XT30 inadequate per pack path, AM32 55 A/channel ≥ 48 A motors: all consistent with BOM (2× 4S 550 mAh 95C XT30, PropDrive 2836 48 A, AM32 55 A 4-in-1). Clarify in caption: packs join at the harness — each XT30 leg sees ≤52 A burst, the XT60 trunk sees the sum; 16 AWG trunk mandatory, 20 AWG fails, 18 AWG short-run marginal only. No code change (static text block).

## 4. Screenshots vs code

All three screenshots reproduce code defaults exactly (2900 RPM slider, 8 in, steel, 4 g @ 65 mm, 20 mm mount): 216.9 mph / 2053 J / 24.0 N / 188 g / 0.52 kJ / 89 / 1054.7 / 1245.0 g. Screenshots are faithful — the bug is in the formula, not the render. After the §9 fix, screenshots 07 (tip/KE rows) must be re-captured; 08/09 stay valid.

## 5. CAD honesty notes (from P1 + code comments)

- P1 bbox 138×331×168 mm: 331 mm is assembly reach/staged length, **not** spin diameter. Calculator default 8 in (203 mm) is an assumption until the true tip-circle Ø is measured in CAD per config (mid-cutter vs undercutter differ). The existing caption warning is correct — keep it and add per-config Ø fields (see GEOMETRY.md).
- Teeth-pair volume 55.63 cm³ is used consistently across P1, Engineering, buildGuide, content, Pages. Undercutter 45.4 cm³ (356 g steel / 201 g Ti) is in P1 but has **no branch in the Engineering mass table** — propose a config switcher (Standard / Undercutter / Wedge) rather than a second hardcoded table (§9).

## 6. Blade-goodness guidance (summary — full spec in manufacturing/blades/GEOMETRY.md)

1. **Tooth height vs bite:** usable engagement per tooth-pass is bite = attack·30000/(RPM·teeth) mm (§3.2). Guidance: effective cutting protrusion ≈ 1.0–1.5× your **slow-engagement** bite (1–2 m/s attack), never the 3–5 m/s showcase number; cap protrusion at ~12–16 mm for the standard mid-cutter regardless of what 1.5× says at 2900 RPM, because taller teeth fold, snag floors, and break the symmetric-only rule. If bite math demands more, add attack (drive through) or drop RPM — do not grow the tooth.
2. **Edge chamfer — no folding knife-edges:** 0.5–1.0 mm × 45° leading-edge chamfer (or 0.5–0.8 mm land + light hone), never a zero-radius knife edge; AR500 work-hardens but a foil edge folds on first hard contact and then tears. Deburr all faces, break trailing edges 0.3–0.5 mm.
3. **Wear behavior (Ti cleat lessons from Liftoff, applied to teeth):** Ti galls and smears where AR500 work-hardens and stays flat — this is why Liftoff runs steel rings + Ti cleats (cleats are consumable traction, replaced often) and why the ring stays steel unless the mass budget forces Ti. Expect: steel teeth mushroom slowly and re-dress with a file; Ti teeth smear, pick up transfer, and lose edge faster — carry 2× spare Ti pairs vs 1× steel. Cleat/silicone hybrid wheels do not change tooth spec; they change attack (better grip → higher attack → deeper bite → shorter teeth survive).
4. **Per-config tooth guidance:** A — Standard mid-cutter (fight default): symmetric 2-tooth, 10–14 mm protrusion, chamfer per (2), taper mid-span to tune 437→~300 g before any Ti swap. B — Undercutter (45.4 cm³): lower, longer-reach teeth, 8–12 mm protrusion, extra floor-clearance check + leading-bottom chamfer (it eats floors); verify spin Ø separately (reach ≠ diameter). C — Wedge (control): no teeth, radius all leading edges ≥1.5 mm, mass saved buys battery/margin.

Full rationale, inspection criteria, and swap ritual live in `manufacturing/blades/GEOMETRY.md`.

## 7. Tooth-height worked table (attack × RPM, 2 teeth; cap per §6 applies above the line)

| Attack \ RPM | 2000 | 2900 | 3454 | 4000 |
|---|---|---|---|---|
| 1 m/s (slow grind) | 15.0 bite → ~15–22 protr. | 10.3 → ~10–16 | 8.7 → ~9–13 | 7.5 → ~8–11 |
| 2 m/s (typical close) | 30.0 → cap 12–16 | 20.7 → cap 12–16 | 17.4 → cap 12–16 | 15.0 → cap 12–16 |
| 3 m/s (fast close) | 45.0 → cap | 31.0 → cap | 26.1 → cap | 22.5 → cap |

Reading: the 1.5× rule is a **connection** rule for slow engagements, not a construction order for fast ones. Anything above ~16 mm protrusion is vetoed by fold/bend risk — change tactics, not teeth.

## 8. GO / NO-GO

| Pillar | Verdict | Residual risk |
|---|---|---|
| Tip-speed calc | **NO-GO as coded** (×π) — fix per §9, then GO | All downstream KE/strategy talk inherits the error until fixed |
| KE thin-ring display | **CONDITIONAL** — correct only after tip fix + thin-ring-bound label + CAD-I follow-up | True energy needs Izz from CAD; current is an upper bound |
| Bite / balance / accel / mass / power | **GO** (all six hand-verified) | Spin-up constant needs bench measurement (§3.5); accel mount ≤18 mm preferred |
| Blade geometry spec | **GO** with GEOMETRY.md adopted | Must measure per-config spin Ø before any tip/KE claim is quoted |

Overall: **NO-GO on quoting tip speed / KE until the one-line fix ships; GO on everything else.** No hardware is invalidated — the error overstates performance, so the bot is safer than the page claims, and the mass/power/balance numbers that actually gate ordering are correct.

## 9. Proposed diffs (not applied — docs-only round)

**D1 — `web/src/pages/Engineering.tsx:50` (the fix):**
```diff
-  const mph = (Math.PI * diaIn * rpm) / 336;
+  // v_mph = D_in * RPM / 336  (== PI*D*RPM/1056). The PI/336 form overstates by exactly PI.
+  const mph = (diaIn * rpm) / 336;
```
**D2 — `Engineering.tsx:95` caption:**
```diff
-  <p className="meta">v = π × D × RPM / 336. Measure YOUR spin Ø ...
+  <p className="meta">v = D × RPM / 336 (≈ π × D × RPM / 1056). Measure YOUR spin Ø in CAD per config — the 331 mm bbox axis is reach, not diameter.</p>
```
**D3 — `Home.tsx:149` (same bug in prose):**
```diff
-  Tip-speed math: v(mph) = π × D(in) × RPM / 336, but you must ...
+  Tip-speed math: v(mph) = D(in) × RPM / 336 (≈ π × D × RPM / 1056), but you must ...
```
(The "about 95 mph" example on the next line is already correct — keep it.)
**D4 — KE caption (add bound label + follow-up, after D1):** append to the Tip-speed verdict cell or meta: `"Thin-ring upper bound (teeth-pair mass at tip radius). True KE = ½·I·ω² with Izz from CAD — typically 10–30% lower. 200 J line is a relative bar, not a rules threshold."` Adjust the `ke > 200` copy to `Over/Under 200 J teeth-bound [model]`.
**D5 — Spin-up constant (label, no behavior change):** `const eSpin = 995 * …` → named `E_SPIN_REF_J` + comment `// empirical @4000; bench-measure V·I·t and overwrite; assumes 60% eff, 13 Wh usable (80% DoD)`, plus caption update.
**D6 — Accel caption:** change "mount within ~20 mm" → "mount within ~18 mm (max 22.4 mm @4000 — leave margin) + pot".
**D7 — Mass table (follow-up, not blocking):** add config switcher Standard (55.63 cm³) / Undercutter (45.4 cm³) / Wedge; P1 already measured the volumes.
**D8 — `manufacturing/P1-mass-audit.md:47`:** `v_mph = π × D_in × RPM / 336` → `v_mph = D_in × RPM / 336 (≈ π·D·RPM/1056)`.

## 10. Out-of-scope / non-claims (per autonomy-plan §6)

No custom PCB, motor/ESC changes, CAD re-modeling of the ring body, or cloud-vendor decisions in this report. No ROS/telemetry claims. Missing-skill gaps: without `robotics-testing`/`robotics-design-patterns` loaded, the spin-check ritual and FSM/HAL notes in GEOMETRY.md are hand-written best practice (Liftoff/OpenMelt2-derived), not skill-template output — flag for the integrator to re-run if those skills land.
