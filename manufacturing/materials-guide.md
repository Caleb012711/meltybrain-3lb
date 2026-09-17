# Materials Guide — Titanium vs Aluminum vs Steel (TRC 3lb Melty)

**Short answer: Gemini is ~75% right on shape, wrong on 2 facts. Use all three metals, each where it wins.**

- **Ring / teeth (the weapon): AR500 steel, default.** Grade 5 Ti only as a weight relief valve.
- **Top/bottom plates: 6061-T6 aluminum** (+ small polycarbonate LED window, not full poly plates).
- **Wheels: titanium cleats** for wood/steel floors, NOT foam. Start rubber to learn, switch to cleats.
- **Interior cradle: printed TPU.** Legal at 3lb, no fiberglass needed.

Your pasted scorecard is accurate — this doc locks it into the repo with receipts.

## 1. Fact-check (verified Sept 2026)

| Gemini claim | Verdict | Receipt |
|---|---|---|
| AR500 ring is the meta, via SendCutSend / OSH Cut | ✅ True | Project Liftoff wiki: 0.25" AR500 rings via SendCutSend, 241–326g across revs; `3lb-Melty` BOM lists SendCutSend AR500 weapon |
| Grade 5 Ti teeth/shell to save weight | ⚠️ Nuanced | Real but NOT the ring meta. Winners run steel rings; Ti shows up in cleat wheels (Liftoff 1.55" Ti cleats), wedge armor, shafts. Ti ring = 44% lighter but 44% less KE at same volume |
| TPU internal cradle, legal + clean | ✅ True | Liftoff retired HDPE/UHMW shells after Dec 2021 failures, now 3D-printed TPU shell + AR500 ring. TPU ban is Plastic-Ant class only, not TRC 3lb |
| 6061-T6 plates + polycarbonate LED windows | ✅ True | Standard beetle practice. 1/16–0.080" 6061 for pierce resistance; poly window so heading LEDs stay visible (your control loop, not decoration) |
| Flex Foam 23 wheels are the go-to | ❌ False | Smooth-On Flex Foam 23 is flame-rated prop foam. Liftoff runs Ti cleats, now testing cleat/silicone hybrid. Foam = shreds on contact, zero bite on wood |
| 200+ mph tip speeds | ❌ ~2× too high | Math: 8" ring at 4000 RPM = π×8"×4000/60 = 95 mph. 200 mph needs ~7500+ RPM — nobody runs that (Liftoff spins 2000–4000 RPM) |
| Perfect balance + 12.9 screws + Loctite 243 | ✅ True | Balance = #1 melty killer; asymmetric mass causes hop. 12.9 + 243 is correct for centrifugal loads |
| Citations | ⚠️ 1 bad | `mail.google.com/...` citation is a Gmail redirect, not a source. Reddit/BeagleBoard/YouTube cites are real but weak — prefer NHRL wiki + Liftoff build log |

## 2. Physics that decides it

| Material | Density | Yield (typ) | Specific strength | Role |
|---|---|---|---|---|
| AR500 steel | 7.85 g/cc | ~1300 MPa | baseline weapon | Ring/teeth: max KE per volume |
| Ti-6Al-4V Gr5 | 4.43 g/cc | 880 MPa | +86% vs 6061 per weight | Relief valve: 44% lighter than steel at same volume |
| 6061-T6 alu | 2.70 g/cc | 276 MPa | reference | Plates/structure: cheap, stiff, weldable-ish |
| 7075-T6 alu | 2.81 g/cc | 503 MPa | +77% vs 6061 | Upgrade plates if 6061 dents |
| TPU 95A | 1.21 g/cc | — | shock cradle | Interior, NOT armor |
| UHMW | 0.94 g/cc | — | shock rails | Optional, but Liftoff retired it for shells |

Key ratios:
- **Steel vs Ti, same volume: steel = 1.77× the mass = 1.77× the kinetic energy.** The ring IS the weapon — steel is free damage.
- **Ti vs 6061, same volume: Ti = 1.64× heavier.** Ti only wins when you thin the part (strength lets you go thinner) or when you must buy weight budget for Pi/BEC/battery.
- **Specific stiffness is identical (~25.5) for steel/Ti/alu** — material swap never fixes flex-per-weight, only geometry does.

## 3. What to spec for Eyeliner Evo

1. **Ring: AR500 steel, symmetric 2-tooth, NO lightening holes, NO bolt holes through the rim.** Liftoff's hard lesson: holes = crack starters; single-tooth + counterweight = chassis Yeet on tooth-stop. Taper mid-span to tune mass (326g → 241g precedent).
2. **Ti as relief valve only.** Pi + BEC + mount ≈ 35–50g. If P1 audit (see `../P1-mass-audit.md`) lands over ~1310g target, thin Ti ring first, plates second. Don't pre-order Ti.
3. **Plates: 6061-T6 0.063–0.080"** + narrow polycarbonate window strip for heading LEDs. Full-poly plates pierce under verts.
4. **Cradle: TPU 95A printed shell** (no fiberglass, no carbon layup). UHMW/HDPE sheet as backup if printer down — cuts with wood tools.
5. **Wheels: skip foam-pour.** Phase 1: rubber (BaneBots / molded) to learn translation. Phase 2: SendCutSend Ti cleats for TRC wood/steel. Cleats dig on wood, skate on polished steel — know your floor.
6. **Fasteners: 12.9 + Loctite 243**, symmetric layout, balance on a point/bearing jig. Budget 2–3g trim screws for final balance.

## 4. Order of operations (P1 gate)

```
P1 audit (STEP volume × density) → steel-ring total vs 1361g cap
  ├─ under ~1310g → build all-steel ring, spend margin on battery/spares
  └─ over  ~1310g → Ti the ring, re-audit, then order
No metal order until that number exists.
```

Full numbers: see `../P1-mass-audit.md`.
Send to PCBWay per `manufacturing/pcbway/README.md` (STEP for CNC, DXF for laser). SendCutSend/OSH Cut is the US-alt for flat AR500 — PCBWay for everything else.
