# PCBWay Order Checklist

Copy this, fill in YOUR part names + materials, tick as you upload.

## CNC (from `cnc/*.step`)

| # | Part name / file | Material | Qty | Uploaded? | Looks right in preview? |
|---|---|---|---|---|---|
| 1 | Dead axle — 6 mm steel shaft, 6g6 / H7 bore fit | 1144 / 12L14 steel or 4140 (ground 6 mm dia) | 2 + 1 spare (3 total) | [ ] | [ ] |
| 2 | Inner hub (hubmotor) | 6061-T6 | 2 | [ ] | [ ] |
| 3 | Outer hub (hubmotor) | 6061-T6 | 2 | [ ] | [ ] |
| 4 | Weapon carrier / hub — common 6×M4 PCD Ø40-50 + taper fit, 7075-T6 | 7075-T6 | 1 + 1 spare (2 total) | [ ] | [ ] |

Bought hardware (source separately — McMaster / Amazon / HobbyKing, record lot):

| # | Part | Spec | Qty | Ordered? |
|---|---|---|---|---|
| 5 | Bearings | 626-2Z/C3 6×19×6 mm deep-groove, ZZ shield (2RS if dusty) | 8 total (4 installed + 4 spares) | [ ] |
| 6 | M4 screws + washers + threadlocker | M4 12.9 SHCS (lengths per CAD) + hardened flat washers + Loctite 243 | 1 set + spares | [ ] |
| 7 | M3 trim / balance assortment | M3 12.9 SHCS 6/8/10 mm + nylocs for symmetric trim/balance | 1 assortment | [ ] |

Spare teeth / wear parts (pre-balanced as pairs ±0.5 g before event):

| Part | Material | Qty | Uploaded? |
|---|---|---|---|
| Standard tooth — symmetric pair, pre-balanced ±0.5 g | AR500 (default steel; Ti only if mass audit fails — see note) | 2 pairs (1 fight + 1 spare pair) | [ ] |
| Undercutter tooth set — symmetric, pre-balanced ±0.5 g | AR500 (default steel; Ti only if mass audit fails — see note) | 1 set + 1 spare set | [ ] |

## Sheet metal / laser (from `sheet-metal/*.dxf`)

| # | Part name / file | Material + thickness | Qty | Uploaded? |
|---|---|---|---|---|
| 1 | e.g. `top-armor.dxf` | 5052 2mm | 1 | [ ] |
| 2 | e.g. `bottom-plate.dxf` | 5052 2mm | 1 | [ ] |
| 3 | | | | [ ] |

## Final check before payment

- [ ] Scale verified — applied: M3 clearance ~3.2 mm, M4 ~4.2 mm checked in preview + calipers on first article
- [ ] H7 bore checkboxes applied: 6 mm dead-axle bores + 19 mm 626 OD bores marked H7 in order comments, verified per hub (go/no-go + spin check)
- [ ] Material default: steel AR500 / Ti priority — order teeth in AR500 steel by default; switch to Ti only on mass-audit fail per `manufacturing/P1-mass-audit.md` Branch E
- [ ] Shipping address + lead time OK
- [ ] Saved order quote PDF / screenshot in this folder for records
