# 32 — Numbers Re-verify (Round-2 Verification)

Scope: verify Round-1 fixes (tip-speed π overstatement, 1360/1361 split) as applied.
READ-ONLY — no source edits made. All values re-read from disk 2026-09-18.

## Skills applied (read from disk)

- `.opencode/skills/robotics-testing/SKILL.md` (577 lines) — applied as **independent hand
  recomputation**: every page number re-derived in `python3` from first principles / raw
  `web/public/cad/*.parts.json`, not by trusting page code. Golden-file mindset (JSON volumes
  are golden), property checks at slider extremes, anti-`sleep()` event-driven log asserts
  noted for TEST.md TTL claims.
- `.opencode/skills/robotics-software-principles/SKILL.md` (896 lines) — applied
  **Principle 10: Observe Everything — You Can't Debug What You Can't See**: every number
  below traces to a `file:line` source of truth (STEP volume, density, code constant).
  Untraceable constants flagged as observability gaps, not facts.

Densities used throughout: steel/AR500 7.85, Ti-6Al-4V 4.43, alu 2.70, TPU 1.21 g/cm³.
Cap truth: 3 lb = 3×453.59237 = 1360.777 g → **1360.8 g**, integer-scale enforceable **≤1361 g**.
Tip truth: v(mph) = π·D(in)·RPM·60/63360 = **π·D·RPM/1056** (exact) ≈ D·RPM/336.13 (shop form).
Wrong form π·D·RPM/336 overstates by 1056/336 = 3.142857 ≈ π.

---

## (1) Tip speed + KE recomputation — PASS (page math correct)

Source: `web/src/pages/Engineering.tsx:48-53,90-96`.

```ts
// Engineering.tsx:49 comment — CORRECT
// mph = π·D(in)·RPM·60 / 63360 = π·D·RPM / 1056 (sanity: 8″ @ 4000 RPM ≈ 95 mph)
const wMass = ti ? 0.2464 : 0.4367;                    // kg teeth-pair
const mph = (Math.PI * diaIn * rpm) / 1056;            // CORRECT
const ms = mph * 0.44704;
const ke = 0.5 * wMass * ms * ms;                      // thin-ring model
// verdict: ke > 200 ? 'Over 200 J…' : 'Under 200 J…'
```

Footnote `Engineering.tsx:96`: `v = π × D × RPM / 1056.` — PASS.
`Home.tsx:150-151`: `v(mph) = π × D(in) × RPM / 1056 … An 8 in ring at 4000 RPM is about
95 mph — not 200+.` — PASS.

Independent hand recomputation (`python3`, math.pi, 0.44704):

| RPM | Dia | mph = π·D·RPM/1056 | m/s | KE steel (0.4367 kg) | KE Ti (0.2464 kg) | Verdict ke>200 |
|-----|-----|-------------------|-----|---------------------|-------------------|----------------|
| 2000 | 5″ | 29.75 | 13.30 | 38.6 J | 21.8 J | Under / Under |
| 2000 | 8″ | 47.60 | 21.28 | 98.9 J | 55.8 J | Under / Under |
| 2000 | 9″ | 53.55 | 23.94 | 125.1 J | 70.6 J | Under / Under |
| 3000 | 5″ | 44.62 | 19.95 | 86.9 J | 49.0 J | Under / Under |
| 3000 | 8″ | 71.40 | 31.92 | 222.5 J | 125.5 J | **Over / Under** (flip point) |
| 3000 | 9″ | 80.32 | 35.91 | 281.5 J | 158.9 J | Over / Under |
| 4000 | 5″ | 59.50 | 26.60 | 154.5 J | 87.2 J | Under / Under |
| 4000 | 8″ | 95.20 | 42.56 | 395.5 J | 223.1 J | Over / Over |
| 4000 | 9″ | 107.10 | 47.88 | 500.5 J | 282.4 J | Over / Over |

- Default slider state (3000 RPM, 8″, steel): 71.4 mph / 31.9 m/s / 223 J → page shows
  "Over 200 J at full width [model]" — matches hand calc. PASS.
- Sanity 8″@4000 = 95.20 mph both by π/1056 and by SI (D=0.2032 m, C=0.6385 m,
  66.667 rev/s → 42.56 m/s → 95.20 mph). PASS.
- Old wrong form π·D·RPM/336 at 8″@4000 = 299.20 mph; ratio 299.20/95.20 = 3.142857 =
  1056/336 ≈ π. Confirms Round-1 "overstated by exactly π". No `/336` wrong-form remains
  in `web/src/`. PASS.
- Verdict threshold behavior: threshold flips correctly across the table (e.g. steel crosses
  200 J between 2000→3000 RPM at 8″; Ti crosses only near 4000 RPM at 8″). Small-dia/low-RPM
  stays Under even in steel (5″@4000 steel = 154 J → Under — correct per formula, not a bug).
  Label is explicitly `[model]` thin-ring teeth-pair-only upper bound. PASS with standing
  caveat (true KE = ½·I·ω² with CAD Izz is 10–30% lower; rest of spinning bot excluded).

## (2) Repo-wide stale-string grep — PASS with 2 residual FAILs (docs-only)

Method: `grep -rn --exclude-dir=.git,node_modules,dist --exclude=*.step,*.glb,*.stl`.
STEP `#1360`-style entity IDs and `web/dist/` bundle copies excluded as false positives /
build artifacts. Historical `audit/` reports intentionally retain old numbers as evidence.

| Pattern | Result |
|---------|--------|
| bare-`1360` (no `.8`, no `1361`) in source | **PASS** — zero hits in `web/src/`, `BOM.md`, `README.md`, `radio/`, `manufacturing/blades/`, `.opencode/command/gauntlet.md`, `build-guide/`, `PIT-CHECKLIST.md`. Only hits: `autonomy/SAFETY.md:116,128` (see FAIL-1) + historical audit files (evidence, not source). |
| `/336` wrong form (`π·D·RPM/336`) | **PASS** — zero hits in source. Only `/336` in scope is the *correct-equivalent* shop form `D·RPM/336 (≈π·D·RPM/1056)` in `manufacturing/blades/GEOMETRY.md:6` (π/1056=1/336.13, correct). Historical audits retain the wrong form as evidence. `manufacturing/P1-mass-audit.md:47` still carries the wrong form — see FAIL-2. |
| `44.67` / `351 g` / `198 g` stale undercutter | **PASS** — zero `44.67` hits in source. `351 g / 198 g` appears only at `Engineering.tsx:151` phantom-mass note, which is **weapon-only** 44.674 cm³ (see §3 nuance — flagged as INFO, not stale). `Pages.tsx:141` now reads `45.4 cm³ ≈ 356 g / 201 g Ti` — PASS. |
| `96-meshed` | **PASS** — zero hits anywhere. `89 meshed` at `Home.tsx:144`, `web/README.md:33` matches manifest (145 solids, 89 meshed, 56 `dropped_from_glb`) — correct. `CadViewer.tsx:278` "96 nodes" is a layout comment, unrelated. |
| duplicate YAML blocks in `render.yaml` | **PASS** — single `services:` block, one `type: web` (`render.yaml:4-59`, `grep -c "type: web"` = 1). Headers, `rootDir: web`, `buildCommand: npm ci && npm run build`, `buildFilter` intact. |

**FAIL-1 (P2, docs-only): `autonomy/SAFETY.md:116,128` — 1360/1361 split survives.**
- `:116`: `(resolve 1360 vs 1361 g wording with the mass-audit owner…)`; `:128`:
  `≤[1360/1361 — confirm] g`. This file was *not* in the fix list, so survival is
  expected, but it is a live pre-clear letter draft — an organizer copy-paste would carry
  the ambiguity.
- Exact correction (READ-ONLY proposal, not applied):
  `:116` → `Scale photo at the stated cap (≤1361 g fight-ready, 3 lb = 1360.8 g).`
  `:128` → `…translational-drift spinner, ≤1361 g fight-ready (3 lb = 1360.8 g),…`.

**FAIL-2 (P2, docs-only): `manufacturing/P1-mass-audit.md:47` — wrong tip formula retained.**
- `:47`: `Tip-speed check for later: v_mph = π × D_in × RPM / 336. 8" @4000 RPM ≈ 95 mph, NOT 200+.`
  Internally inconsistent: π·8·4000/336 = **299.2 mph**, not 95. Correct 95.2 mph comes
  from π·D·RPM/**1056** (or D·RPM/336).
- Exact correction: `Tip-speed check: v_mph = π × D_in × RPM / 1056 (≈ D_in × RPM / 336). 8" @4000 RPM ≈ 95.2 mph, NOT 200+.`
- Adjacent `:44` stale path `python3 /tmp/opencode/step_audit.py "Main CAD.step"` — repoint to
  `tools/cad_convert.py` or repo-local script path.

## (3) Mass rollup cross-check from `*.parts.json` — PASS

Recomputed with `python3` directly from disk (no page code trusted):

- `standard-weapon-teeth.parts.json`: 27.815 + 27.815 = **55.630 cm³** → steel
  55.63×7.85 = **436.70 g → 437 g** ✓; Ti 55.63×4.43 = **246.44 g → 246 g** ✓.
  Matches `Engineering.tsx:141`, `Home.tsx:187`, `Bom.tsx:104`, `content.ts:142`,
  `BOM.md:75`, `BLADES.md` config-A card, `P1:12`.
- `undercutter-config.parts.json`: 10 solids, total **45.406 cm³** = weapon-steel
  **44.674** + fastener-dark 0.732. Total×7.85 = **356.44 → 356 g** ✓; ×4.43 =
  **201.15 → 201 g** ✓. Matches `Pages.tsx:141` (`45.4 cm³ ≈ 356 g / 201 g Ti`),
  `BOM.md:75`, `BLADES.md` config-B card (45.41 cm³ → 356.5/201.2 g), `P1:13`.
  NUANCE (INFO, not FAIL): weapon-only 44.674×7.85 = 350.69 → 351 g / Ti 197.91 →
  198 g is exactly the *old* `44.67 ≈ 351/198` line — the old line was weapon-only, the
  new line is assembly-total (fasteners included, Δ 0.732 cm³ ≈ 5.7 g steel). Both are
  arithmetically correct for their scope; pages should eventually label which scope.
  `Engineering.tsx:151` phantom-mass `~351 g steel (~198 g Ti)` uses the weapon-only
  scope while `Pages.tsx:141`/`BOM.md:75` use assembly-total — 5–6 g scope gap, consistent
  once labeled. Recommend appending `(weapon-only; +~6 g with carrier hardware = 356/201 g
  assembly)` at `Engineering.tsx:151`.
- `main-cad.parts.json`: 145 entries, total **319.945 → 319.9 cm³** ✓ (`P1:11`, `content.ts:35`).
  Roles: weapon-steel 100.304 (= 55.63 teeth + 44.674 undercutter staged together — confirms
  phantom-double-staging), chassis-alu 66.136, pod-metal 27.959, electro-green 39.168
  (placeholder per `Engineering.tsx:151-152`), shell-tpu 80.134, fastener-dark 6.244.
- `wheel-pod.parts.json`: 25 entries, total **12.253 → 12.3 cm³** ✓ (`P1:14`).
- Rollup `Engineering.tsx:141-145`: Ti 246.4 + 399.3 + 409.0 = **1054.7 g** ✓; steel
  436.7 + 399.3 + 409.0 = **1245.0 g** ✓; margins to 1310 g target **+255.3 / +65.0 g** ✓.
  Margins to 1360.8 g cap: +306.1 / +115.8 g (info).
- `Home.tsx:187` (`437 g / 246 g`, `~1245 g / ~1055 g`), `Bom.tsx:104` (weapon row),
  `content.ts:45,50,142` (55.63 / 45.4 / 437/246) — all consistent. PASS.
- Principle-10 observability carryover (unchanged, non-blocking): `399.3 g
  plates+pods+shell+fasteners` and `409.0 g electronics+pack+wiring` and `eSpin 995 J
  ref` have no per-subassembly source file — require weigh-in log / bench V·I·t before
  ordering (BOM blanks exist for this). Not a regression.

## (4) `npm run lint` + `npm run build` in `web/` — PASS

- `npm run lint` (oxlint): exit 0, warnings only (pre-existing `set-state-in-effect`,
  `only-export-components`, exhaustive-deps in hooks/CadViewer/Studio/Explorer — no errors,
  none numbers-related).
- `npm run build` (`tsc -b && vite build`): exit 0, 589 modules, all chunks emitted
  (`Engineering-CH65bP9J.js` 7.46 kB, `Pages-BYYIh2tc.js` 27.24 kB, etc.) in ~1 s.
- `render.yaml` single-service check (see §2) confirms the deleted duplicate block did not
  recur. PASS.

## Fix-by-fix verification (claimed "JUST applied")

| # | Claim | File:line verified | Verdict |
|---|-------|-------------------|---------|
| 1 | mph = (PI·dia·rpm)/1056 + comment | `Engineering.tsx:49-51` comment + code exact | PASS |
| 2 | footnote v=π×D×RPM/1056 | `Engineering.tsx:96` | PASS |
| 3 | Home formula text + pill ≤1361 g | `Home.tsx:111` pill, `:57,64` stack, `:149-151` cap+formula footnote | PASS |
| 4 | BOM + README + radio/POCKET + autonomy/TEST + gauntlet all 1361 g | `BOM.md:56,65,81`, `README.md:20,32`, `radio/POCKET.md:176`, `autonomy/TEST.md:28,282`, `.opencode/command/gauntlet.md:15,43,69` — all 1361 (1360.8 qualifier) | PASS |
| 5 | render.yaml duplicate deleted | `render.yaml:1-59`, one service | PASS |
| 6 | Pages undercutter 45.4 cm³ ≈ 356/201 g Ti | `Pages.tsx:141` exact | PASS |
| 7 | Home/BOM weight lines | `Home.tsx:187` (437/246, 1245/1055), `Bom.tsx:93,104,111` (1361 cap, weapon row, 1360.8 target) | PASS |

Cap-wording spot checks: `Pages.tsx:44` weigh-in `≤1361 g (1360.8 g cap)`, `PIT-CHECKLIST.md:4,27`,
`build-guide/00-start-here.md:14,26`, `03-testing-and-driving.md:23`, `P1:5`, `BLADES.md:114-115`
all 1361. PASS.

## Remaining issues (exact corrections, READ-ONLY proposals)

1. **P2 — `autonomy/SAFETY.md:116`**: `Scale photo at the stated cap (resolve 1360 vs 1361 g
   wording with the mass-audit owner before the event — do not fly two numbers).`
   → `Scale photo at the stated cap (≤1361 g fight-ready, 3 lb = 1360.8 g).`
2. **P2 — `autonomy/SAFETY.md:128`**: `≤[1360/1361 — confirm] g,` → `≤1361 g fight-ready
   (3 lb = 1360.8 g),`.
3. **P2 — `manufacturing/P1-mass-audit.md:47`**: `v_mph = π × D_in × RPM / 336.`
   → `v_mph = π × D_in × RPM / 1056 (≈ D_in × RPM / 336).` (Keeps its own 95 mph example true.)
4. **P3 — `manufacturing/P1-mass-audit.md:44`**: `python3 /tmp/opencode/step_audit.py "Main CAD.step"`
   → repo-local path (e.g. `python3 tools/cad_convert.py "Main CAD.step"` or the current audit script).
5. **P3 INFO — `Engineering.tsx:151`**: append scope label: `adds ~351 g steel (~198 g Ti)
   weapon-only (~356/~201 g with carrier hardware) of phantom mass for the staged second config.`

No bare-1360, no wrong-form /336, no 44.67, no 96-meshed, no duplicate YAML in shippable
source. Historical audit files retaining old numbers are evidence, not defects.

## Verdict: GO (with 2× P2 + 2× P3 doc follow-ups above; no page-math or build blockers)
