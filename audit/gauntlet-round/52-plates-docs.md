# Gauntlet 52 — Outer plates SIMPLE rule verification (agent 2/10)

Skills read: `robotics-design-patterns` (.opencode/skills/robotics-design-patterns/SKILL.md) + `robotics-software-principles` (.opencode/skills/robotics-software-principles/SKILL.md). Doc-only audit; no source edits.
Target: `manufacturing/pcbway/sheet-metal/README.md:10-22` (appended rule block; lines 1-8 preserved).

## (1) Contradiction check vs five docs
- PASS `manufacturing/materials-guide.md:43-46` (§3.1 ring no-holes + §3.3 plates 6061-T6 0.063–0.080" + poly window). New rule bans lightening/pockets in *plates*; materials-guide bans holes in *ring* — same direction, different part. Thickness 1.6–2.03" fits parent 1.5–3 mm range. Poly window strip unaffected (separate part, not a plate pocket).
- PASS `manufacturing/pcbway/cnc/README.md:1-8`. STEP-only scope, zero overlap with sheet DXF rules.
- PASS `manufacturing/pcbway/ORDER-CHECKLIST.md:22-28`. Both example rows already `5052 2mm` = one thickness — exemplifies the new rule.
- PASS `manufacturing/pcbway/README.md:51-54` + `site/pcbway.html:8` (Laser · 5052/6061 1.5–3 mm, M3=3.2 mm preview). Parent `README.md:52` "(+ bending only if part has bend lines)" is conditional allowance; child tightens outer plates to never-bend. Compatible, but add cross-ref so builders don't misread parent as permission.
- PASS `manufacturing/blades/BLADES.md:172-179` (§7 DXF outlines+holes only; teeth/ring AR500 CNC/waterjet, hub 7075). Matches new `README.md:22` "Teeth/ring stay CNC or waterjet; sheet is flat covers only". §4 alu-plates+TPU sandwich supports two-plates+standoffs logic.
- WARN (pre-existing, not introduced): material string mismatch — materials-guide locks `6061-T6`, checklist/sheet-example say `5052 2mm`, parents say `5052/6061`. Fix: amend checklist + parents to `6061-T6 2mm default (5052-H32 alt)` or vice versa; rule block itself needs no change.

## (2) Hole-rule sanity (≥1.2×t dia, ≥2×t edge, 5052/6061 1.5–3 mm laser)
- PASS. Industry laser-alu minimums are ~1.0–1.5×t dia, ~1.5–2×t edge/hole-to-bend; 1.2×/2× is conservative and holds tolerance. At 2 mm: min Ø2.4 mm, edge 4 mm — M3 clearance 3.2 mm passes. Edge case: at 3 mm, min Ø3.6 mm > M3 3.2 mm. Fix (docs-only): add one line "for 3 mm plate use M4 or drill/ream M3; or stay ≤2.5 mm for M3-native plates".

## (3) No other doc orders bends/lightening in plates
- PASS. `P1-mass-audit.md:28,35-36` (pocket/lighten 80 cm³ body), `build-guide/01-frame-assembly.md:12` (pocket chassis), `web/src/data/buildGuide.ts:30` + `Pages.tsx:104` (pocket 80 cm³ body), `GEOMETRY.md:25` + `materials-guide.md:43` (never drill ring) — all scope to CNC chassis/weapon, never outer sheet. Only bend mention is parent conditional `pcbway/README.md:52`. Fix: scope-clarify new rule header to "Outer armor (sheet) only — does not restrict CNC chassis pocketing per P1 audit".

## (4) Stale references to sheet-metal README
- PASS. Grep `sheet-metal|outer plate|top-armor` hits (`pcbway/README.md:3,14,31,51`, `ORDER-CHECKLIST.md:22`, `BOM.md:19`, `README.md:30,46`, `site/pcbway.html:8,10,14`, `site/build.html:5`, `content.ts:62`, `Pages.tsx:70,72,114-117,155`, `audit/gauntlet-round/05-blades-interface.md:37`) all reference folder/file convention generically; none quote pre-append text. Old lines 1-8 intact, append-only. No fix.

## Verdict: GO (no blocking contradiction; two non-blocking doc tweaks above)
