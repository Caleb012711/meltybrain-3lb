# BLADES — Modular Weapon Interface (Eyeliner 3lb)

> Builder doc. No CAD remodeling required to use this. One hub interface fits all
> three configs. Symmetric only. Never drill the ring.
> Sources: `build-guide/01-frame-assembly.md`, `manufacturing/P1-mass-audit.md`,
> `manufacturing/materials-guide.md`, `BOM.md` §1, `manufacturing/pcbway/` pack.

## 0. The three configs (one interface)

| Config | CAD on hand | Job | Status |
|---|---|---|---|
| **A — Standard mid-cutter teeth** (fight default) | `Standard Weapon Teeth.step` (root + `web/public/cad/` mirror, 301 113 B, **2 solids**, verified) | General Hui — symmetric 2-tooth mid-height bite | ORDERABLE (export per §7) |
| **B — Undercutter** | `Undercutter Config.step` (root + mirror, 468 612 B, **10 solids**, verified) | Forks / wedges — gets under, lower bite plane | ORDERABLE (export per §7) |
| **C — Wedge** (control) | **NO STEP on hand** — create next CAD round from this spec | Control / verts / when weapon weight must drop | SPEC ONLY this round (§4 card is estimate + formula) |

Copy Liftoff 2025: swappable mid-cutter / undercutter / flying wedge. Do not
freestyle a fourth geometry until A+B fight.

## 1. Interface — single bolt circle + tapered register

**Rule: every config shares ONE hub interface. If it doesn't bolt to the same
hub with the same tool, it doesn't ship.**

- **Bolt circle: ONE common PCD, 6× evenly spaced holes (60° apart).**
  6-hole even pattern preserves 2-fold / 180° symmetry for the symmetric 2-tooth
  ring — any config clocks on at 0° or 60° and stays balanced. 4-hole would also
  work; 5- or 3-hole does NOT (breaks 180° symmetry options). Do NOT use a
  different PCD per config.
  - Action before ordering: open `Main CAD.step` + each weapon STEP in
    Fusion/Onshape, overlay hub faces, confirm all three carriers share the hub
    PCD as-drawn. If B's 10-solid assembly currently has its own hole spacing,
    re-export its carrier to the hub PCD in the next CAD pass (docs-only this
    round — no metal ordered until they match).
  - Recommended envelope for that CAD pass (not a verified dimension): 6× M4
    clearance (Ø4.5 mm) on Ø40–50 mm PCD on the hub flange. Pick the largest PCD
    the hub flange allows — larger PCD = lower bolt shear per hit.
- **Tapered register for concentricity (the important part).**
  Bolt holes alone NEVER center a spinner — clearance holes slip 0.1–0.3 mm and
  that is a fatal eccentricity at 3000–4000 RPM. Each carrier gets a female
  taper bore; the hub gets the matching male taper spigot (~7–10° included
  angle, ~2–3 mm engagement, turned/reamed finish, target <0.05 mm TIR).
  Sequence: taper seats first (hand-press, should self-center and stick
  slightly), THEN bolts pull it home. Bolts provide clamp, taper provides
  center. Clean both tapers with IPA before every install — one chip = 0.1 mm
  runout = hop.
- **No holes through the spinning rim.** Interface holes live ONLY in the hub
  flange / carrier face (low-stress clamped joint). The weapon rim itself gets
  ZERO extra holes — see §2.

## 2. Symmetric-only rule + never drill (rationale)

From `01-frame-assembly.md` steps 4–5 + `materials-guide.md` §3.1:

1. **Symmetric 2-tooth ring, NO extra holes.** Holes in a 4000-RPM impact ring
   are crack starters (stress concentration × centrifugal preload × shock).
   Liftoff precedent: holes → cracks; single-tooth + counterweight → chassis
   yeet on tooth-stop. Taper mid-span to tune mass (326 g → 241 g precedent),
   never drill to lighten.
2. **Never drill the ring to balance.** Even 3–5 g of asymmetry = violent hop
   at 3000 RPM (01 §5). Balance ONLY with symmetric trim screws / small
   counterweights in pre-planned symmetric locations (see §6). Drilling adds a
   crack starter AND removes mass asymmetrically — worst of both.
3. **Trim-screw balance points are part of the interface.** Each carrier gets
   ≥2 pairs of opposed M3 threaded trim holes (180° apart, same radius, in the
   carrier flange — NOT the rim). Final balance adds/removes matched screws
   (e.g. 2–3 g total budget per `materials-guide.md` §3.6). Log screw map per
   config — screws are part of the mass card.
4. **Tooth rules (good-blades spec):** tooth height sized to bite math for
   2000–4000 RPM translation (tall enough to engage, short enough not to pole-
   vault); leading-edge chamfer ~0.5–1 mm × 45° (NO knife edges — they fold on
   first steel hit and then unbalance you); teeth shipped and spared as
   PRE-BALANCED PAIRS (matched within 0.5 g, marked L/R, swapped together).

## 3. Hardware spec — one hex size

| Item | Spec | Notes |
|---|---|---|
| Interface bolts | **6× M4×0.7 Class 12.9 SHCS**, length to suit stack + 1.5 threads proud (measure CAD stack, typ. 10–16 mm) | 12.9 per 01-checklist + materials-guide; SHCS (not button) for full socket engagement under shock |
| Washers | Hardened M4 flat (200 HV min) under each head, no split-lock (fragments) | Nord-Lock only if re-verified for weight; default = flat + 243 |
| Threadlocker | **Loctite 243 (blue, medium, oil-tolerant)** | 242 is NOT a substitute on oily AR500 mill scale |
| Tool | **ONE 3 mm hex key / bit** (M4 SHCS drive) for the entire swap | Bondhus-style long-arm + bit for torque driver. Nothing else touches the weapon |
| Trim screws | M3×6 12.9 SHCS + M3 washers, 2–3 g assortment for balance | Live in spares kit, mapped per config |

**Torque + Loctite approach (from 01 steps 4–6):**

1. Degrease male + female threads + taper (IPA/acetone). 243 needs clean metal;
   AR500 scale + cutting oil kills it. Blow dry.
2. One small drop 243 on male threads only (2–3 threads). Do NOT flood the taper
   — taper must seat metal-to-metal.
3. Hand-start ALL six bolts before tightening any (cross-thread = stop, chase,
   restart). Run down finger-tight in diagonal star.
4. Star-pattern in THREE passes: ~1 N·m → ~2 N·m → final **3.0–3.5 N·m**
   (M4-12.9 with 243 lubricity allowance; dry-book 4–5 N·m reduced ~20–30% for
   wet threadlocker). If no torque driver: snug star + 90° star, then witness-mark
   each head with paint pen.
5. Wipe squeeze-out, witness-mark hub-to-carrier across the joint (slip detector).
6. **Full cure 24 h** before spin above hand-speed (01 §4). Fight-morning swaps
   still need the full ritual in §6 — short-cure joints get re-torqued + re-marked
   after first heat cycle and checked between every match.

## 4. Per-config mass cards (measured, not guessed)

Re-verified 2026-09-18 via OCP `STEPControl` volume (matches `P1-mass-audit.md`
exactly). Densities: steel 7.85 / Ti-6Al-4V 4.43 / 6061 2.70 g/cm³.

| Config | Measured volume | Steel (AR500 @7.85) | Ti Gr5 (@4.43) | 6061 (@2.70) | Note |
|---|---|---|---|---|---|
| **A standard teeth pair** (`Standard Weapon Teeth.step`, 2 solids) | **55.63 cm³** (27.81 each) | **436.7 g pair / 218.3 g each** | **246.4 g pair / 123.2 g each** | 150.2 g pair | Audit prints 437/246 — agrees to 0.3 g |
| **B undercutter assy** (`Undercutter Config.step`, 10 solids) | **45.41 cm³** | **356.5 g** | **201.2 g** | 122.6 g | Audit prints 356/201 — agrees. 10 solids = teeth + carrier; isolate carrier vs teeth in next CAD pass and re-card separately |
| **C wedge** (NO STEP — estimate) | **~35 cm³ assumed** (measure in CAD next round) | **~274.8 g** | **~155.1 g** | ~94.5 g | Formula: `mass = volume_cm³ × density`. VERIFY before ordering — do not quote this row |

**Branch logic (locks to `P1-mass-audit.md` + `materials-guide.md` §4):**

- Cap **1361 g** (1360.8 g), build target **≤1310 g** (50 g margin for wires,
  Loctite, tape, scale error). Displayed cap is 1361 g everywhere (3 lb = 1360.8 g)
  repo-wide before weigh-in (match-ready audit Gate B).
- Default = **steel weapon** (AR500, max KE per volume — steel = 1.77× Ti mass
  at same volume = 1.77× KE). Branch E (Ti band ~200–250 g + alu plates
  ~300–400 g + TPU ~80–120 g + pods) is the only branch that flies with Pi/BEC.
- **Ti relief valve:** if scale total lands over ~1310 g, swap weapon steel→Ti
  BEFORE touching battery/motor: A saves **~190 g** (437→246), B saves
  **~155 g** (356→201). Do not pre-order Ti — audit first, then order.
- 80.1 cm³ body solid in `Main CAD.step` (629 g steel / 355 g Ti / 216 g alu)
  MUST be alu or TPU+plate sandwich, never steel — or no weapon config makes
  weight.
- Weigh each config WITH its 6× M4 stack + washers + trim-screw map + witness
  marks and write the as-built grams on the card. Spare teeth pairs pre-balanced
  and weighed as pairs.

## 5. Sub-10-minute swap procedure (ONE hex size, timed)

Prereqs: link OUT, battery OUT, wheel locks ON, cut gloves ON, clean rag + IPA,
243, 3 mm hex only, torque driver if available, scale + pen.

| Clock | Step |
|---|---|
| 0:00–0:30 | Link out, pack out, locks on. Confirm arena-safe. Pick next config + its weighed card + its 6× M4 set (keep sets segregated per config — different stack lengths stay with their carrier). |
| 0:30–2:00 | 3 mm hex, loosen 6 bolts star, lift carrier STRAIGHT off taper (no prying on rim — tap hub from behind with plastic mallet if stuck). Set old config on foam, bolts back in its holes finger-tight so sets never mix. |
| 2:00–3:30 | IPA-wipe hub taper + new carrier taper + threads. Inspect: no burrs, no cracks at tooth roots, taper bright. Check witness-mark log for prior slip. |
| 3:30–5:30 | Seat new carrier on taper (should self-center + stick). Hand-start all 6 with 243 (one drop each). Star run-down finger-tight → 1 N·m → 2 N·m → 3.0–3.5 N·m (§3). Wipe, witness-mark 2 lines hub→carrier. |
| 5:30–7:00 | Fit recorded trim-screw map for THIS config (do not copy A's screws onto B). Torque M3 trims snug + 243. |
| 7:00–8:00 | Scale the bot, write total + config letter on pit card. Confirm path ≤1361 g. |
| 8:00–9:30 | Post-swap spin-check ritual §6 (hand-spin + 1000 RPM minimum before boxing). |

If any bolt won't hand-start, taper won't seat, or witness marks walked last
fight — STOP the clock, fix it, restart ritual. A forced swap is a thrown blade.

## 6. Post-swap spin-check ritual (mandatory, in order)

1. **Hand-spin:** wheels free, ring gap clear, spin weapon by hand. Must spin
   free with zero grind/rub on ring at full hand-spin (01 Done-when). Check TIR
   by eye against a fixed pointer — visible wobble = re-seat taper, do not
   proceed. Confirm witness marks aligned.
2. **1000 RPM powered:** test box / concrete, locks off, all clear, 500–1000 RPM
   per `03-testing-and-driving.md` §8.1 (teeth on or covered). Confirm heading
   LED matches stick, listen for hop/rattle, confirm RPM holds (not toilet-bowl).
   ANY hop → stop, re-balance, do not ramp.
3. **Balance jig, 4+ orientations:** power off, locks on, hang bot on point/
   bearing through center (01 §5). Must sit level at 0°/90°/180°/270° minimum.
   Heavy side drops → adjust symmetric trim-screw pairs only (add/remove 180°
   opposed, equal grams). Re-hang after every change. Goal: level any rotation.
4. **Ramp 2000 → 3000 → 4000 RPM** only after 1–3 pass, heat-checking motors/ESCs
   each step (03 §8.3). Log RPM/G/batt/temp if Pi fitted. Re-check witness marks
   + bolt torque after first heat cycle (short-cure check).
5. **Sign-off:** pit card gets config letter, total grams, trim map, witness-mark
   OK, pilot initials. No card = not fight-ready.

## 7. Order from PCBWay (weapon rows)

Per `manufacturing/pcbway/README.md` + `ORDER-CHECKLIST.md`:

- Export ONE file per physical part, AP214 STEP, units mm, single solid per file.
  Naming `NN-part-name-material.step` (e.g. `04-tooth-A-AR500.step`,
  `05-carrier-hub-7075.step`). Flat armor/wedge plate (if waterjet) as 1:1 DXF
  mm, cut outlines + holes only, `NN-part-thickness-material.dxf`.
- Materials: teeth/ring band **AR500 / Hardox** default (Grade 5 Ti only per §4
  relief valve); hub/carrier **7075-T6** (or 6061-T6 if 7075 lead time kills you);
  3-axis mill cheapest, ISO 2768-m general, tighten ONLY taper bore + bearing
  bores to H7/h6 and note in order comments.
- Qty: 1× carrier/hub + **2+ spare teeth pairs** (pre-balanced pairs, §2) per
  config you intend to fight. Check PCBWay preview scale (M3 ≈ 3.2 mm, M4 ≈
  4.2 mm clearance) before paying.
- ORDER-CHECKLIST rows to add: `Standard tooth pair — AR500/Ti — 2+`,
  `Undercutter tooth set — AR500/Ti — 2+`, `Carrier/hub (common PCD + taper) —
  7075 — 1 + 1 spare`, `M4 12.9 SHCS + hard washers + 243 — 1 set + spares`,
  `M3 trim assortment — 1 set`. Save quote PDF in folder.
- US-alt for flat AR500 weapon plate: SendCutSend / OSH Cut (per
  materials-guide); PCBWay for the rest.

## 8. Spares kit (extends `BOM.md` §4 — pack every event)

- [ ] Teeth: 1× spare PAIR per config fought (A pair + B set minimum), matched
  within 0.5 g, marked, weighed, with its trim map card
- [ ] Fasteners: 12× M4 12.9 SHCS + 12× hard M4 washers + M3 trim assortment +
  heat-set inserts + blue Loctite 243 (unexpired) + paint pen
- [ ] 3 mm hex keys ×2 (one walks away — plan for it) + torque bit if used
- [ ] Cleats / wheels: 1× full wheel set (Ti cleats Phase 2; rubber Phase 1)
- [ ] 1× spare ESC (AM32 55A 4-in-1 per BOM §2) + 1× spare motor (PropDrive 2836)
- [ ] 1× spare pack set (2× 4S 550 mAh parallel) + link + XT30/XT60 + 16–20 AWG
- [ ] TPU touch-up: small TPU print spares + CA + tape + IPA wipes
- [ ] Pit cards: blank mass/trim/witness cards + scale (0.1 g) + calipers
- [ ] What kills events (in order): teeth, cleats, ESC, battery, fasteners —
  the kit above covers all five.

## 9. What this doc does NOT cover (out of scope)

No custom PCB, no motor/ESC changes (BOM §2 Liftoff Rev9 stack locked), no CAD
re-modeling of the ring body, no cloud-vendor lock-in. Wedge config C needs a
CAD pass (STEP + volume + mass card verification) before it can be ordered.

## 10. Done when

- [ ] All three carriers share ONE hub PCD + taper (overlay-checked in CAD)
- [ ] Each config weighed WITH hardware, card filled, branch (steel/Ti) stated
- [ ] Swap demoed <10 min with 3 mm hex only, filmed
- [ ] Spin ritual 1–4 passes + pit card signed + failsafe film still valid
- [ ] Spares kit packed + scale reads ≤1361 g fight-ready
