# Gauntlet Round 42 — Final Numbers Confirmation (agent 2/10)

Skills read from disk: `robotics-testing` (577 lines, testing pyramid/unit/integration/HIL/sim/CI) + `robotics-software-principles` (896 lines, 12 principles SOLID→degradation). Independent recomputation below (Principle 10: observe everything).

## Arithmetic (recomputed, not copied)
- Tip exact: mph = π·D·RPM·60/63360 = π·D·RPM/1056. 8″@4000 = π·8·4000/1056 = **95.20 mph / 42.56 m/s** ✓; 8″@2900 = **69.02 mph / 30.85 m/s** ✓. Shop form D·RPM/336.13 agrees (95.1998).
- Teeth 55.63 cm³: steel 55.63·7.85 = **436.70g** ✓ / Ti 55.63·4.43 = **246.44g** ✓. Rollup base 399.3+409.0 = 808.3 → Ti **1054.7g** / steel **1245.0g** ✓; margins to 1310g target **+255.3/+65.0g** ✓.
- Undercutter measured 45.406 cm³ (parts.json): steel **356.44→356g** / Ti **201.15→201g** ✓. Stale weapon-only 44.674 → 350.69/197.91 (= old 351/198 line) — not used in live copy.
- Cap: 3 lb = 3·453.59237 = **1360.777→1360.8g**, integer-scale display **≤1361g** ✓.
- main-cad.parts.json: 319.9 cm³ → steel 2512 / Ti 1417 / alu 864g; 145 entries, 56 dropped_from_glb, **89 meshed** ✓.

## (1) Tip formula + cap badge — PASS
- Engineering.tsx:49 comment `π·D·RPM/1056 (sanity: 8″@4000≈95mph)` ✓; :51 code `(Math.PI*diaIn*rpm)/1056` ✓; :96 footnote `v = π×D×RPM/1056` ✓.
- Home.tsx:57 `≤1361g (1360.8g cap)` ✓; :64 badge `≤1361g / 3lb cap (1360.8g)` ✓; :111 pill `≤1361g fight-ready` ✓; :149–151 `Cap 1360.8g, target ≤1310g` + `/1056` + `8in@4000≈95mph` ✓.

## (2) Stale-value sweep — PASS (zero in shippable source)
- bare-1360 (excl 1360.8): zero in md/tsx/ts/json excluding audit-history evidence + STEP `#1360` entity false positives. All live hits carry 1360.8 qualifier + 1361 display (BOM:56,65; README:20; SAFETY:116; Home; Pages:44; P1:5).
- `/336` in web/src: zero hits. Only `/336` in scope = GEOMETRY.md:6 correct shop form `D×RPM/336 (≈π·D·RPM/1056)` with explicit anti-π note — intentional PASS.
- `44.67`: zero hits excl .step coords (44.677… spline noise) + audit history. `351/198g` only in audit history.
- `96-meshed/96 nodes`: zero hits excl audit history. CadViewer.tsx:278 now `~89 meshed nodes`; Home:144 `145 solids, 89 meshed` matches parts.json.
- YAML duplicates: `render.yaml` + `base/docker-compose.yml` parsed with duplicate-key-detecting loader — no duplicates, PASS.

## (3) SAFETY.md + P1 re-run recipe — PASS
- SAFETY.md 1361g ×2: :116 `1361g everywhere — 3lb = 1360.8g` ✓; :127 `≤1361g` (TRC draft, with 1360.8 context :116) ✓.
- P1-mass-audit: :48 now `v_mph = π×D×RPM/1056, 8″@4000≈95mph` (wrong /336 form gone) ✓; :44 recipe `tools/cad_convert.py --in "Main CAD.step" --name main-cad --out /tmp/cad-audit --manifest` — all four flags REAL vs argparse (:207–213: `--in(dest inp),--name,--out,--manifest` + `--all/--linear/--angular`) ✓.
- One-liner tested live on web/public/cad/main-cad.parts.json: `319.9 cm³ → steel 2512g / Ti 1417g / alu 864g` reproduces P1:11 exactly ✓.

## (4) Phantom + undercutter — PASS
- Engineering.tsx:151 `adds ~356g steel (~201g Ti) phantom mass for staged second config` ✓ (= full 45.406 assembly incl carrier, not weapon-only 351/198).
- Pages.tsx:141 `Undercutter pair 45.4cm³ ≈ 356g/201g Ti` ✓; BOM:75, P1:13, BLADES:109, GEOMETRY:36, content.ts:50 agree.

## (5) lint + build (run myself) — PASS
- `npm run lint` exit 0 (warnings only, React-compiler/ref notes; single "error" grep hit is memoization-warning text).
- `npm run build` exit 0, `✓ built in 749ms`.

Verdict: **GO** — all numbers reconcile to CAD-measured parts.json; no blockers.
