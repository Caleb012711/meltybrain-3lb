# Gauntlet 24 — Numbers & Copy Audit: every number verified by hand

Date: 2026-09-18 · Scope: `web/src/pages/Engineering.tsx` (all calculators), weight-cap wording repo-wide, firmware/BOM/mass pages vs source docs, `render.yaml`.
Mode: **read-only on sources** — no source file edited. Corrections below are `file:line → exact replacement`.

## 0. Skills applied (read from disk)

- `.opencode/skills/robotics-testing/SKILL.md` (577 lines, read fully): applied **independent verification** — every calculator recomputed by hand in Python from first principles (not by trusting site JS), screenshot values reproduced before judging, golden-file mindset (screenshots 07/08/09 treated as golden outputs of buggy code).
- `.opencode/skills/robotics-software-principles/SKILL.md` (896 lines, read fully), **Principle 10 — Observe Everything**: every site number must trace to a source-of-truth `file:line` (STEP volume, measured density, pack label, code constant). Untraceable constants (399.3 g, 409.0 g, 995 J) are flagged as observability gaps, not facts.

Prior round `audit/gauntlet-round/06-blades-geometry.md` already derived the π-error; this round **independently re-derived everything** and agrees, plus extends to all calculators, all cap wordings, firmware/BOM/mass pages, and config.

## 1. Dispute verdicts (GO/NO-GO)

| Dispute | Verdict | One-line reason |
|---|---|---|
| (a) tip-speed / KE: `Engineering.tsx` v=π×D×RPM/336 → 2900×8″=216.9 mph + 2053 J vs `P1-mass-audit.md:47` 8″@4000≈95 mph | **P1 audit CORRECT, Engineering page WRONG by exactly π (NO-GO on quoting tip/KE until fixed)** | Correct form is v=D×RPM/336 (≈π×D×RPM/1056); coded form double-counts π, KE inherits ×π²≈9.87 error |
| (b) weight cap 1360 g vs 1361 g | **NO-GO as written — must be one displayed number: `1361 g` (with `1360.8 g` qualifier). 7 source lines say bare `1360`; fix list in §3** | Truth is 3 lb = 1360.777… g = 1360.8 g; integer-scale enforceable form is ≤1361 g (majority usage). Bare 1360 is 0.8 g stricter and contradicts the stated cap |
| (c) `render.yaml` buildFilter duplicates | **CONFIRMED — lines 60–64 duplicate lines 55–59 verbatim (NO-GO, delete block)** | `tools/cad_convert.py` + all 4 STEP paths listed twice. No other YAML syntax error; further notes in §6 |

## 2. Calculator-by-calculator hand verification (`Engineering.tsx:40-64`)

Defaults in code: rpm=3000, dia=8, steel; screenshots show 2900 (slider moved). Both recomputed.

### 2.1 Tip speed — WRONG (×π)

First principles: C=πD; D in inches → inches/min = π·D·RPM; mph = ×60/63360 = ÷1056.
`v = π·D·RPM/1056` (exact) `≈ D·RPM/336` (shop form, since π/1056=1/336.13…).
Coded `π·D·RPM/336` is π× too large (1056/336=π). SI x-check (D=8″=0.2032 m, 2900 RPM=48.333 rev/s, C=0.6385 m): v=30.85 m/s=69.02 mph — matches D·RPM/336.

| Case | Page shows (wrong) | Correct |
|---|---|---|
| 8″ @ 2900 (screenshot) | 216.9 mph / 97.0 m/s | **69.0 mph / 30.9 m/s** (8·2900/336=69.048) |
| 8″ @ 3000 (code default) | 224.4 mph / 100.3 m/s | **71.4 mph / 31.9 m/s** |
| 8″ @ 4000 | 299.2 mph / 133.8 m/s | **95.2 mph / 42.6 m/s** (8·4000/336=95.238; SI 42.56 m/s=95.20 mph) |
| 8″ @ 3454 (accel ref) | 258.4 mph / 115.5 m/s | **82.2 mph / 36.8 m/s** |
| Extremes 5″@4000 / 9″@4000 | 187.0 / 336.6 mph | **59.5 / 107.1 mph** |

Fix: `Engineering.tsx:50` `const mph = (Math.PI * diaIn * rpm) / 336` → `const mph = (diaIn * rpm) / 336` (+ comment `// == PI*D*RPM/1056; PI/336 form overstates by exactly PI`).
Caption `Engineering.tsx:95` `v = π × D × RPM / 336` → `v = D × RPM / 336 (≈ π × D × RPM / 1056)`.
Prose `Home.tsx:149-151` same formula fix (the `about 95 mph` example on the next line is already correct — keep).
`P1-mass-audit.md:47` fragment `v_mph = π × D_in × RPM / 336` → `v_mph = D_in × RPM / 336 (≈ π·D·RPM/1056)` (result `≈95 mph, NOT 200+` is correct).
`materials-guide.md:21` result 95 mph correct; expression `π×8″×4000/60 = 95 mph` is missing the unit conversion — rewrite as `π·D·RPM/60 in/s ×0.05682 = mph`.
`GEOMETRY.md:6` already states the correct form — reference, no change. `content.ts:56` `~95 mph IF 8 in at 4000` correct — no change.

### 2.2 Weapon KE (thin-ring) — structure OK, inputs WRONG (inherits ×π²)

Code `ms=mph·0.44704; ke=½·m·ms²`, m=0.4367 steel / 0.2464 Ti (from 55.63 cm³ pair — verified §2.6). Because v is π× high, KE is π²≈9.87× high.

| Config | Page (wrong v) | Corrected (thin-ring, teeth-pair mass at tip radius) |
|---|---|---|
| Steel 437 g @ 2900 | 2053 J (97.0 m/s) | **208 J** (30.87 m/s): ½·0.4367·30.87²=207.9 |
| Steel @ 3000 | 2197 J | **223 J** (31.93 m/s) |
| Steel @ 4000 | 3906 J | **396 J** (42.58 m/s) |
| Ti 246 g @ 2900 | 1159 J | **117 J** |
| Ti @ 3000 | 1240 J | **126 J** |
| Ti @ 4000 | 2204 J | **223 J** |

Verdict flip: `ke > 200` stamp at 2900/steel becomes borderline 208 J steel / 117 J Ti-under; at 4000 both clear (396/223 J). Keep the 200 J line only as a labeled MODEL-relative bar; add thin-ring-bound caveat (true KE=½·I·ω² with CAD Izz is 10–30% lower; displayed value is an upper bound on teeth-pair-only energy, excludes rest of spinning bot).

### 2.3 Bite (2 teeth) — CORRECT, no change

`biteMm=attack·60/(rpm·2)·1000 ≡ attack·30000/rpm`. Derivation: rev/s=rpm/60, 2-tooth pass freq=rpm/30 Hz, bite=attack·30/rpm m. Spots: 3 m/s@2900=**31.03 mm** (1.5×=46.55); 3 m/s@4000=**22.50** (1.5×=33.75); 1 m/s@4000=7.50; 2 m/s@2900=20.69; matches `Pages.tsx:265-267` `attack·60/(RPM·teeth)`. Tooth-height guidance (cap 12–16 mm, size to 1–2 m/s slow bite) is the correct reading of these numbers.

### 2.4 Imbalance force — CORRECT, no change

`F=(imbG/1000)·(imbR/1000)·ω²`, ω=rpm·2π/60. ω(2900)=303.687, ω²=92,226; F=0.004·0.065·92226=**23.98 N≈24.0 N**, kgf 24.0/9.807=**2.45** ✓ screenshot. Fix hint `imbG·imbR/65` g at 65 mm moment-correct. At 4000 same 4 g = **45.6 N (4.65 kgf)** (+90% via ω²).

### 2.5 Accelerometer a=ω²r — CORRECT (all three quantities); tighten mount guidance

`accG=ω²·(accR/1000)/9.81`; `maxR=400·9.81/ω²·1000`. 2900/20 mm: 92226·0.02/9.81=**188.0 g PASS** ✓; maxR(2900)=**42.5 mm**; ceiling at 30 mm: √(3924/0.03)=361.66 rad/s=**3453.6 RPM** ✓ (`3454 RPM at 30 mm` exact). 4000/20 mm=**357.7 g PASS**; 4000/30 mm=536.6 SATURATED; 2800/45 mm=394.4 (so `saturates past ~2800 RPM at 45 mm` ✓); maxR(4000)=**22.4 mm** — `within ~20 mm` leaves 2.4 mm margin; prefer **≤18 mm + potting** (caption tweak, no code change).

### 2.6 Mass rollup — ARITHMETIC CORRECT; two provenance flags

Teeth 55.63·7.85=**436.70 g** ✓ / 55.63·4.43=**246.44 g** ✓. Totals Ti 246.4+399.3+409.0=**1054.7** ✓; steel 436.7+399.3+409.0=**1245.0** ✓; margins to 1310 target **+255/+65** ✓; to 1360.8 cap +306.1/+115.8. **Flags (Principle 10):** `399.3 g plates+pods+shell+fasteners` and `409.0 g electronics+pack+wiring` are fixed single lines with **no source file** — require per-subassembly weigh-in log before ordering (BOM blanks exist for this). Phantom-mass note (both staged configs +351 g steel / +198 g Ti) reconciles with P1 branches. Undercutter has no branch in this table — follow-up config switcher (Standard 55.63 / Undercutter 45.4 / Wedge), not blocking.

### 2.7 Spin-ups per pack — ARITHMETIC CORRECT, constant needs label

`eSpin=995·(rpm/4000)²; spins=⌊46800/eSpin⌋`. 2900: 995·0.725²=**523.0 J=0.52 kJ** ✓; 46800/523=89.5→**89** ✓. 3000: 559.7 J→83; 4000: 995 J→47. Pack: 2·(14.8·0.55)=16.28 Wh gross; 13 Wh usable=**46,800 J** ✓ (~80% DoD — state it). **Inconsistency:** corrected teeth-only mech KE@4000=396 J → ~660 J elec at 60%; 995 J implies **~40%** (396/995=39.8%) or whole-bot inertia above teeth-only. Label `E_SPIN_REF_J=995 @4000 (empirical; bench-measure V·I·t, overwrite; assumes 13 Wh usable)` — caption fix, no behavior change.

### 2.8 Power + harness — CORRECT, one connector clarification

2·48=96 A vs 2·(0.55·95)=**104.5 A** pack continuous → (104.5−96)/96=**8.9%** ✓ (`~9%`, burst-only caveat correct). XT60+16 AWG trunk, AM32 55 A/ch ≥ 48 A motors ✓. Clarify: packs join at harness — each XT30 leg ≤52 A burst, XT60 trunk sees the sum; 16 AWG trunk mandatory, 20 AWG fails, 18 AWG short-run marginal only. Resolve XT30/XT60 ambiguity in §4.

## 3. Weight-cap single-number correction list (canonical: `1361 g`, first use per file `1361 g (3 lb = 1360.8 g)`)

Truth: 3 lb = 3·453.59237 = **1360.777 g → 1360.8 g**; integer-scale form **≤1361 g**. Bare `1360` is a floor-truncation 0.8 g stricter than the cap and contradicts every `1360.8` line. STEP-file hits (`#1360/#1361` entities) are CAD false positives — excluded.

| File:line | Current | Change to |
|---|---|---|
| `BOM.md:65` | `**Total: ___ g (must be ≤ 1360g)**` | `**Total: ___ g (must be ≤ 1361 g, 3 lb = 1360.8 g)**` |
| `README.md:20` | `9. Weigh-in (must be <= 1360g) + combat ready` | `9. Weigh-in (must be <= 1361 g, 3 lb = 1360.8 g) + combat ready` |
| `radio/POCKET.md:176` | `weigh-in ≤1360 g` | `weigh-in ≤1361 g` |
| `autonomy/TEST.md:28` | `scale (≤1360 g fight-ready — see BOM weight-cap note)` | `scale (≤1361 g fight-ready — see BOM weight-cap note)` |
| `autonomy/TEST.md:282` | `fight-ready ≤ 1360 g with 50 g margin target` | `fight-ready ≤ 1361 g with 50 g margin target` |
| `web/src/pages/Home.tsx:111` | `<span className="pill hot">≤1360 g fight-ready</span>` | `<span className="pill hot">≤1361 g fight-ready</span>` |
| `.opencode/command/gauntlet.md:15` | `weight cap 1360g` | `weight cap 1361g (3 lb = 1360.8 g)` |
| `.opencode/command/gauntlet.md:69` | `Weights ≤1360g story consistent` | `Weights ≤1361g story consistent` |
| `manufacturing/blades/BLADES.md:114-116` | `Cap **1361 g** (1360.8 g)… Resolve the 1360-vs-1361 wording to one number repo-wide…` | Keep numbers; delete the `Resolve…` clause after this round lands |

Already-correct (no change): `BOM.md:56,81`, `README.md:32`, `PIT-CHECKLIST.md:4,27`, `P1-mass-audit.md:1,5`, `BLADES.md:142,217`, `materials-guide.md:53`, `build-guide/00:14,26`, `01:18`, `03:23`, `content.ts:55,69,80`, `Home.tsx:57,64,149(cap part),292`, `Pages.tsx:44,247`, `Bom.tsx:93,111`. Old static `site/` prototype is superseded per `web/README.md:58` — excluded.

## 4. Firmware page (`Pages.tsx:285-336`) vs `firmware/README.md` — GO with 2 clarifications

| Claim on site | Source | Verdict |
|---|---|---|
| Teensy 4.0 lock no-pins, 600 MHz, solder direct | README:3,5,9 | ✅ match |
| Dual H3LIS331DLTR ±400 g, opposed @45°, SPI, near CG/center; learn rig single H3LIS331, 3.9 cm radius, LED 7%, ~3200 RPM; fight 2000–4000 | README:5,15 | ✅ match (`Pages.tsx:299` table exact) |
| DShot600 bidirectional @8000 Hz / 8 kHz, AM32 (OpenMelt2 490 Hz PWM + SimonK obsolete) | README:5,14; BOM:23,28 | ✅ match (`Pages:300,307,316` exact) |
| ELRS CRSF → Teensy UART; Pi UART 115200; never power MCU from Pi USB | README:13,15,33 | ✅ match (`Pages:317` exact) |
| 4700 µF on 5 V + 10:1 divider; green=front LED raised/inset; accel within ~20 mm (saturates ~2800@45 mm, ~3450@30 mm) | README:15,17 | ✅ match, numbers verified in §2.5 |
| T0 failsafe / T1 spin / T2 Pi 50–100 Hz / T3 pit ~5 Hz / T4 seconds; T3+T4 never drive; TX-off <1 s filmed to `firmware/failsafe-test.mp4`; brown-out; boot interlock; freeze version | README:24-27,29-33; `03:16`; autonomy plan §1; `tracker.py:38` TTL 1.0 s | ✅ match |
| **T1 rate wording**: site `Pages.tsx:291` `T1 Teensy spin at 8 kHz DShot600` vs `03:16` + `02:7` `T1/~1 kHz spin loop` | — | ⚠️ CLARIFY (both true at different layers): `T1 governor ~1 kHz; DShot600 packets @ 8 kHz`. One-caption fix, no behavior change |
| **Mains connector**: site `Pages.tsx:316` + `Engineering:159` `XT60 + 16 AWG (XT30 30 A inadequate per 48 A pack path)` vs `BOM.md:33,35` + `02:11` + `content.ts:101,141` `XT30/XT60, 16–20 AWG` / battery `XT30` | — | ⚠️ RESOLVE toward site: trunk = XT60 + 16 AWG; XT30 only as pack legs. Fix `BOM.md:33,35`, `02:11`, `content.ts:101,141` captions (list in §7) |

## 5. BOM page (`Bom.tsx`, `Pages.tsx:221-283`) vs `BOM.md` + mass truth — GO with 1 data fix

- Costs independently summed: build 44+20+49.9+24+45+19+72+60+140+75+23+18+8+19+38.5+7=**$662.40** ($590.40 w/o $72 handset) ✓ `Home FAQ $662 ($590)`; spares 22+45+44+30+20=**$161** ✓ `near $161`; armor range $100–180 ✓. `BOM.md carries no live prices` disclaimer ✓ by design.
- Specs match row-for-row: PropDrive 2836 82 g/48 A, AM32 55 A DShot-bidir, Teensy lock, H3LIS331DLTR 2+2 (Adafruit 4627 learn), ELRS EP1/RP1 + Pocket, 2×4S 550 mAh (2 flight sets = 4 packs), Pi Zero 2W + Cam 3 Wide + 5 V/3 A BEC ~35–50 g ✓.
- Weight budget compatible: site 7-line Branch-E budget (weapon 246/437; plates 300–400; TPU 80–120; pods ~50; motors+wiring ~250; flight set ~120; Pi 35–50; total 1000–1250, cap 1360.8 target ≤1310) vs `BOM.md:56-65` blanks + `P1` Branch E — layout differs, physics agrees.
- **Data fix:** `Pages.tsx:141` `Undercutter pair 44.67 cm³ ≈ 351 g / 198 g Ti` is stale vs measured `45.41 cm³` (`BLADES.md:109` OCP re-run 45,408 mm³; `P1:13` 45.4 cm³ → 356/201 g; `BOM.md:75` 45.4 → 356/201). Delta 0.74 cm³ ≈ 5.8 g steel. → `45.4 cm³ ≈ 356 g / 201 g Ti`.
- Ratios verified: steel/Ti 7.85/4.43=**1.772×** ✓ (`1.77× energy`); teeth saving 436.7−246.4=**190.3 g** ✓ (`~190 g`); `437→246`, `1245 (~65 margin)` / `1055 (comfortable)` consistent across Home/Pcbway/Parts/content within rounding.

## 6. `render.yaml` — duplicate CONFIRMED + other config notes

- **Duplicate:** `buildFilter.paths:55-59` (`web/**`, `render.yaml`, `tools/cad_convert.py`, `Main CAD.step`, `Wheel Pod.step`, `Standard Weapon Teeth.step`, `Undercutter Config.step`) repeated verbatim at `60-64`. Fix: delete lines 60–64 (5 lines). Harmless at runtime (filter is a set) but a copy-paste defect that will confuse the next editor and double-counts in reviews.
- Otherwise sound: `static` / `rootDir: web` / `npm ci && npm run build` / `./dist` / Node 22.12.0 match `web/README.md:60-67`; hash routing → no rewrites needed ✓; headers (nosniff, DENY, referrer, permissions) + immutable `/assets/*`, no-cache `*.parts.json`/`manifest`/`index.html` ✓; `previews: automatic` ✓; CAD-step paths in filter intentional (GLB rebuilds). Filenames with spaces are valid YAML plain scalars. No secrets in client. `site/` correctly excluded (superseded prototype).

## 7. Full correction list (minimal, copy-paste ready; NOT applied)

1. `Engineering.tsx:50`: `(Math.PI * diaIn * rpm) / 336` → `(diaIn * rpm) / 336` (+ PI/1056 comment).
2. `Engineering.tsx:95`: `v = π × D × RPM / 336` → `v = D × RPM / 336 (≈ π × D × RPM / 1056)`.
3. `Engineering.tsx:128-130` caption: append `E_SPIN_REF_J=995 @4000 empirical; assumes 13 Wh usable (80% DoD); bench-measure V·I·t and overwrite (≈40% vs teeth-only mech, not 60%)`.
4. `Engineering.tsx:119-120`: `within ~20 mm` → `within ~18 mm (max 22.4 mm @4000 — leave margin) + pot`.
5. `Engineering.tsx` KE verdict cell: append `Thin-ring upper bound (teeth-pair mass at tip radius); true KE=½·I·ω² (10–30% lower); 200 J is a relative bar`.
6. `Home.tsx:111`: `≤1360 g` → `≤1361 g`. `Home.tsx:149`: formula → `D×RPM/336 (≈π×D×RPM/1056)` (keep 95 mph example).
7. `Pages.tsx:141`: `44.67 cm³ ≈ 351 g / 198 g Ti` → `45.4 cm³ ≈ 356 g / 201 g Ti`. `Pages.tsx:291`: `T1 … at 8 kHz DShot600` → `T1 governor ~1 kHz; DShot600 packets @ 8 kHz`.
8. `P1-mass-audit.md:47`: `π × D_in × RPM / 336` → `D_in × RPM / 336 (≈ π·D·RPM/1056)`.
9. `materials-guide.md:21`: `π×8″×4000/60 = 95 mph` → `π·D·RPM/60 in/s ×0.05682 = 95 mph`.
10. Weight-cap lines in §3 table (8 lines: `BOM.md:65`, `README.md:20`, `POCKET.md:176`, `TEST.md:28,282`, `Home.tsx:111`, `gauntlet.md:15,69`).
11. Connector disambiguation: `BOM.md:33,35`, `02:11`, `content.ts:101,141` → `XT60 trunk + 16 AWG; XT30 pack legs; 18 AWG min motor`.
12. `render.yaml:60-64`: delete duplicated 5-line block.
13. Re-capture screenshot `07-engineering-calcs.png` after fix (tip/KE rows only); 08/09 stay valid. Remove `BLADES.md:115` `Resolve…` clause once landed.

## 8. Residual risks

- No Teensy source under `firmware/` (README only) — link-loss timeout, re-arm latch, RPM-cap clamp unverified in code (also noted in `POCKET.md:126`).
- Per-config spin Ø unmeasured (331 mm bbox axis is reach, not diameter) — tip/KE claims stay MODEL until CAD tip-circle per config lands; add config switcher + CAD Izz display.
- 399.3/409 g and 995 J need bench weigh-in / V·I·t logs; accel ≤18 mm + potting margin; event-scale bias (+20 g) vs 65 g steel margin is tight — Ti relief valve stays the plan.
