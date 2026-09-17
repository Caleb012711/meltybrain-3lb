# Buying Guide (BOM) — Everything to Buy

Tick off as you order. Fill in the `Link / SKU` column with YOUR vendor.
Quantities below are typical for a 3lb melty — verify against CAD + electronics docs before ordering.

## How to use this

- [ ] Order machining first (longest lead time) — see `manufacturing/pcbway/README.md`
- [ ] Order electronics + fasteners while machining is in transit
- [ ] Print plastics last (fast, and you can re-print if metal changes)

## 1. Machined / metal (from PCBWay)

| Part | Source file | Material | Qty | Ordered? | Arrived? |
|---|---|---|---|---|---|
| Chassis / frame parts | `manufacturing/pcbway/cnc/` | 6061-T6 (typ.) | 1 set | [ ] | [ ] |
| Weapon hub + teeth | `Standard Weapon Teeth.step` OR `Undercutter Config.step` | steel / Ti (see CAD) | 1 + spares | [ ] | [ ] |
| Shafts, standoffs | `manufacturing/pcbway/cnc/` | steel / alu | 1 set | [ ] | [ ] |
| Armor plates | `manufacturing/pcbway/sheet-metal/` | 5052 / 6061 sheet | 1 set | [ ] | [ ] |

## 2. Electronics — LOCKED to Project LiftOff Rev9 (May 2026 proven)

Liftoff Rev9 runs: Teensy 4.0 + 2x H3LIS331DL ±400g + PropDrive 2836 1200kv hubmotors + dShot600 bidirectional @8000Hz + SBUS + 2x 4S 550mAh parallel. Copy that, don't freestyle.

| Item | Spec to buy | Qty | Link / SKU | Ordered? |
|---|---|---|---|---|
| Drive motors (brushless) | PROPDRIVE v2 2836 1200KV, 82g, 48A max, 3-4S, 12-pole — build as hubmotor per Liftoff Rev5: 6mm dead axle + 2x 626 bearings + custom alu inner/outer hubs | 2 + 1 spare | HobbyKing 109154 | [ ] |
| ESCs (AM32, DShot bidirectional) | AM32 55A 4-in-1 (locked per your pick), DShot600 + bidirectional eRPM telemetry (Liftoff uses dShot600 via SPI @8000Hz; OpenMelt2 baseline was SimonK 490Hz PWM — do NOT buy SimonK for this build) | 1 board + 1 spare | | [ ] |
| MCU | Teensy 4.0 Lockable Version WITHOUT pins (Cortex-M7 600MHz, 1024K RAM, 7x serial, 3x SPI/I2C) — solder direct for shock survival, enables dShot SPI bitbang that Arduino Micro can't do | 1 + 1 spare | PJRC TEENSY40_LOCK / Amazon lockable | [ ] |
| Accel | H3LIS331DLTR ±100/200/400g, 16-bit, I2C/SPI, 3x3 LGA — buy 2x Adafruit 4627 breakout for bench, then 2x bare TR chips opposed @45° on final PCB (Liftoff deterministic setup) | 2 breakouts + 2 TR chips | Adafruit 4627 / ST H3LIS331DLTR | [ ] |
| RC receiver | ELRS EP1/RP1 + RadioMaster Pocket (CRSF, locked per your pick) into Teensy UART. Liftoff ref was SBUS — ELRS gives telemetry back. Must have failsafe throttle-cut, verified | 1 | | [ ] |
| Battery (LiPo) | 2x 4S 550mAh in parallel (Liftoff Rev5+ spec) — must fit TPU cradle + make weight | 2+ sets | | [ ] |
| Power switch / link, fuse | Combat-legal removable link, XT30/XT60, 16-20AWG silicone | 1+ | | [ ] |
| Wheels / tires | Phase 1 rubber to learn, Phase 2: 1.55" titanium cleat wheels via SendCutSend (Liftoff Rev9 hybrid cleat/silicone test) | 2 + spares | | [ ] |
| Wiring, bullets, heat shrink | 3.5mm bullets (motor stock), XT30/XT60, silicone 16-20AWG | 1 set | | [ ] |
| Heading LEDs | 2 pairs directional (top/bottom + front/back, green=front) + 100ohm for blue, wide angle, visible thru poly window | 4+ | | [ ] |
| Onboard supervisor (P3 AI) | BOTH (locked per your pick): Onboard Pi Zero 2W + Pi Camera Module 3 Wide + 5V/3A BEC isolated on TPU standoffs, UART to Teensy (~40g) + Pit overhead cam + laptop YOLO + cloud LLM hints — advisory only, NEVER drives | 1 set | | [ ] |

## 3. Fasteners + hardware

| Item | Spec | Qty | Link | Ordered? |
|---|---|---|---|---|
| M3 / M4 button + socket heads (12.9) | lengths per CAD — TODO measure | 1 assortment + spares | | [ ] |
| M3 / M4 locknuts (nyloc / titanium) | | 20+ | | [ ] |
| Washers, threadlocker (blue), CA glue | | 1 set | | [ ] |
| Bearings (sizes from CAD) | e.g. ___ — TODO | + spares | | [ ] |
| Standoffs / inserts for printed parts | heat-set M3/M4 | 20+ | | [ ] |

## 4. Filament (for printed parts)

| Item | Spec | Qty | Ordered? |
|---|---|---|---|
| TPU 95A (wheel pods / guards) | 1kg | [ ] |
| PLA+ / PETG / ABS-ASA / Nylon (jigs, mounts) | per `3d-printing/README.md` | [ ] |

## Weight budget (3lb = 1360g max)

Weigh as you go. Typical split — adjust to YOUR build:

- Frame + armor: ___ g
- Weapon: ___ g
- Motors + ESCs + wiring: ___ g
- Battery: ___ g
- Fasteners: ___ g
- **Total: ___ g (must be ≤ 1360g)**

> Tip: order spare teeth, spare battery, spare fasteners, and one spare motor/ESC if budget allows. Those are the most common event killers.
