# Gauntlet 04 — Pocket Radio (agent 4/10, pocket-radio)

> Scope: §0 verdict 1 locked spec → buy list, binding, Companion model
> (throttle/arm/mode/autonomy-kill), failsafe + test ritual, CRSF telemetry,
> why-not-TX12/Boxer. Operator doc: `radio/POCKET.md` (this report is the audit trail).
> Grounding date: 2026-09-18. Docs/new files only — no code, no CAD, no BOM edits.

## 0. Skills + method

- `skill` tool invoked FIRST: requested `robot-bringup` and `robotics-security` (plan §5).
  Result: **both NOT FOUND — only `customize-opencode` installed** in this environment.
  Mitigation: worked from plan §5 principles manually (governor/fail-safe defaults,
  kill-switch isolation, link-loss behavior, bringup order, verification-before-completion).
  Recommend installing the robotics skill pack before the main-agent pass.
- Read: `audit/autonomy-plan-2026-09-18.md` (full, §0 verdict 1 locked),
  `build-guide/02-electronics-setup.md` (full), `firmware/README.md` (full, esp. §B/§D/§E),
  `BOM.md` (full, row 31 = ELRS EP1/RP1 + Pocket CRSF locked), `radio/` (empty), `firmware/` (README only).
- Web-verified (2026) via search: Pocket ELRS-vs-CC2500 (fpvdrone.net 2026-08-03 guide +
  radiomasterrc.com product page), FCC-vs-LBT (incl. ELRS LBT 100 mW cap; intofpv note that
  ELRS domain is a firmware flash, not separate hardware), 18650 flat-top unprotected
  requirement (Oscar Liang setup guide + r/fpv + Pocket manual: 2×3.7 V Li-ion only,
  bottom USB-C charges, top USB-C = data), EP1/RP1 CRSF crossover wiring
  (ExpressLRS docs: RX→TX, TX→RX, same UART, `serialrx_inverted=off`,
  `serialrx_halfduplex=off`, bootloader-solid-LED on pulled-low pads), EdgeTX failsafe
  Custom/throttle-cut + Special-Function Override + logical-switch arming (EdgeTX manual,
  UAVMODEL 2026 guides, Oscar Liang, Painless360 NO-PULSES-vs-Custom analysis), CRSF
  telemetry discovery + Telem Ratio + sensor IDs (ExpressLRS wiki, ELRS Lua repo,
  UAVMODEL 2026 telemetry guide), Pocket-vs-TX12-vs-Boxer (fpvdrone.net 2026-07-24,
  fpvdroneguide 2026-06-09, e-catalog dims/weights, motionew specs).
- Every claim below marked [V]erified (source) or UNVERIFIED (do-not-guess).

## 1. Verdict table

| Pillar | Verdict | Basis |
|---|---|---|
| Pocket ELRS as safety link + kill switch | **GO** | [V] Hall gimbals + internal 2.4 GHz ELRS + EdgeTX + nano bay at ~$65–80 unmatched <~$100; 8 channels plenty; stays as T5 kill path per plan §0.1/T5 iron rules |
| ELRS NOT CC2500 | **GO (hard gate)** | [V] Different RF hardware; CC2500 cannot bind ELRS by firmware. Verify E/blue sticker under nano-bay cover before soldering |
| Mode 2 + correct FCC/LBT region | **GO with check** | [V] Mode 2 = Thr+Yaw left. FCC ≤250 mW / LBT ≤100 mW; buy for fight country. ELRS domain reflashable but operate legal domain |
| 2× flat-top UNPROTECTED 18650 | **GO with check** | [V] NOT included; protected/button-top too long, don't fit. 3.7 V Li-ion only; bottom USB-C charges |
| RP1 (first) / EP1 (alt), CRSF → Teensy | **GO** | [V] Interchangeable single-antenna class; crossover wiring verified. Diversity optional upgrade only |
| Companion model + throttle-cut + failsafe film | **GO pending test** | [V] Patterns verified; residual = film + code confirmation (no Teensy source in repo) |
| CRSF telemetry to Pocket display | **GO (link stats) / firmware gap for Teensy-forwarded sensors** | [V] Native CRSF discovery verified; UNVERIFIED which frames Teensy emits |

## 2. Locked decisions (what main agent should NOT reopen)

1. **Pocket ELRS Mode 2, correct region.** Rationale §9 of operator doc; Boxer/TX12 advantages
   don't spend on a 7-channel cage safety link. If club owns one, usable — but no new purchase.
2. **Binding-phrase method** (same ELRS major + domain + phrase both ends), Model Match OFF
   until failsafe film passes. Classic 3× power-cycle + Lua BIND documented as fallback.
3. **Radio-side channel contract**: CH1–4 sticks, CH5 SA arm (two disarmed slots),
   CH6 SB mode, CH7 SF-momentary autonomy-kill (Replace, default killed), CH8 spare.
4. **Failsafe authority = Teensy T0** (<1 s stop/brake, no hot restart, boot interlock,
   Pi brown-out safe); radio Custom preset (Thr −100, ARM disarmed, KILL killed, others center)
   as defense-in-depth. NEVER Hold.
5. **Telemetry minimum = link + kill + battery on the Pocket** (1RSS/RQly/RFMD/TPWR + Batt);
   rich dashboard stays on the pit laptop.

## 3. Claim ledger (verify-each-claim)

- [V] ELRS vs CC2500 are different internal RF hardware; firmware can't convert (fpvdrone.net 2026-08).
- [V] CC2500 ≠ full 4-in-1 (single CC2500 chip; 4-in-1 = 4 chips). Don't buy CC2500 for "multiprotocol".
- [V] FCC vs LBT is orthogonal to ELRS vs CC2500; current variant list shows ELRS/FCC, ELRS/LBT,
  CC2500/FCC, CC2500/LBT (radiomasterrc.com).
- [V] ELRS LBT = CE LBT firmware, 100 mW cap; ELRS FCC = up to 250 mW on Pocket
  (radiomasterrc.com, zonefpv, fpvdrone.net). Boxer 1 W figure is Boxer-only — do not quote for Pocket.
- [V] ELRS FCC/LBT domain is a Configurator firmware choice on same hardware (intofpv community
  note) — contradicts the AliExpress-wiki claim of hardware lock for ELRS. Still: buy + fly legal domain.
- [V] 18650 NOT included; 2× cells; nominal 6.6–8.4 V; flat-top unprotected required for fit;
  protected longer (reddit r/fpv 2025-10/2026-01/2026-02, Oscar Liang, Pocket manual).
- [V] Bottom USB-C = charge (QC3), top USB-C = data/sim; charger is Li-ion 3.7→4.2 V only,
  never LiFe (Pocket manual).
- [V] CRSF crossover: RX-TX→FC-RX, RX-RX→FC-TX, same UART, GND+5 V; avoid SBUS pull-down UARTs
  (solid LED = bootloader); `serialrx_inverted=off`, `halfduplex=off` (ExpressLRS wiring + RP-manual).
- [V] CRSF serial rate 420 kbaud convention + Betaflight SerialRX+CRSF pattern (RP1 manual,
  ExpressLRS Configure-FC). Teensy-side confirmation still required (UNVERIFIED, §4).
- [V] EdgeTX Custom failsafe (Thr −100, others center, arm disarmed) + Override-CH throttle-cut
  Special Function + Enable-checkbox gotcha + logical-switch two-factor arm (EdgeTX manual,
  UAVMODEL 2026, Oscar Liang). Painless360: No-pulses for FC links, Custom for direct-PWM,
  never Hold — applied in §7 as Custom-preset + Teensy-authority (CRSF-serial nuance preserved).
- [V] Binding: phrase method vs 3× power-cycle → double-blink → Lua BIND → solid LED (EP1/RP1 manuals).
- [V] Telemetry: Telem Ratio 1:4/1:2 on RX, MDL→Discover, sensor IDs 1RSS/RQly/RSNR/RFMD/TPWR/TRSS/TQly
  + FC-forwarded frames; arm-on-bench if forwarding is arm-gated; 1RSS(dBm)≠RSSI(%) (UAVMODEL 2026,
  ExpressLRS wiki). Pocket path = native CRSF sensors, not Yaapu color-widget.
- [V] Pocket-vs-Boxer-vs-TX12 numbers: 288 g / 363 g / 532.5 g; folded 156.6×65.1×125.3 mm;
  X5 nano Hall vs V4 full-size Hall; nano vs JR bay; $71.50/$59.99 MSRP; 128×64 mono on all three
  (radiomasterrc.com, fpvdrone.net 2026-07-24, fpvdroneguide 2026-06-09, e-catalog, motionew).
- UNVERIFIED: Teensy UART pin assignment, CRSF driver baud/inversion handling, exact stick→motion
  semantics, which telemetry frames Teensy forwards, current street prices (volatile), Mode-2 factory
  default on any specific listing (always check the variant picker). None of these were guessed —
  each is flagged in `radio/POCKET.md` with the file/code to check.

## 4. Residual risks + mitigations

1. **No Teensy source in `firmware/` (README only)** → link-loss timeout + re-arm latch + CRSF
   telemetry forward unconfirmed. Mitigation: firmware agent must confirm T0 behavior + baud +
   channel map; re-film failsafe after ANY firmware change; match-day freeze.
2. **Shell-induced antenna nulls** (spinning metal + 2.4 GHz multipath). Mitigation: external
   T-antenna routing per §3; log RQly vs shell angle; diversity RX upgrade path pre-approved.
3. **Region/domain mismatch no-bind at event** (wrong SKU or reflashed domain). Mitigation:
   buy for fight country; carry Configurator laptop + USB-C; pre-flight bind + range check in pits.
4. **18650 fit/charging misuse** (protected cells, LiFe on onboard charger). Mitigation: buy list
   + what-to-verify checklist; charge attended on bottom USB-C only; spares in cases.
5. **Skills gap** (`robot-bringup`, `robotics-security` missing). Mitigation: install pack;
   main agent re-checks kill-switch isolation + bringup order against those skills.
6. **Autonomy without pre-clear** (SPARC §6.4.3). Mitigation: ship human-gated T4 default;
   T5 behind compile flag + checklist; SF kill filmed like failsafe.

## 5. Files written + cross-refs

- CREATED `radio/POCKET.md` — operator guide (buy list, pre-order checks, RP1/EP1 wiring table,
  binding A/B, Companion model CH1–8 + mixes + throttle-cut, failsafe config + 6-step filmed ritual,
  telemetry discovery, why-not-TX12/Boxer table, pit checklist). Consistent with
  `build-guide/02-electronics-setup.md` (FHSS-primary, MCU-loop, bench→film order),
  `firmware/README.md` §B (CRSF→UART, sticks in configurator), §D (TX-off <1 s, brown-out,
  boot interlock, `firmware/failsafe-test.mp4`), §E (Pi advisory-only, CRSF telemetry),
  `BOM.md` row 31 (EP1/RP1 + Pocket CRSF locked) — suggest BOM agent fill Link/SKU from §1.
- THIS FILE — full audit trail + claim ledger.
- No edits to code/CAD/BOM/site (docs/new files only per instructions).

## 6. TRC pre-clear pointer (for main-agent letter draft)

Pocket + Teensy-T0 failsafe film (`firmware/failsafe-test.mp4`: TX-off <1 s stop, no hot restart,
kill-switch drop, brown-out pass) is the check-in artifact. Autonomy (T5) needs separate SPARC
§6.4.3 pre-clear — default ship human-gated T4. Do not present T5 as cleared on the strength of
this radio doc alone.
