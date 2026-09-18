# Radio — RadioMaster Pocket ELRS for Eyeliner 3lb melty (LOCKED)

> Locked spec: `audit/autonomy-plan-2026-09-18.md` §0 verdict 1.
> Pocket ELRS (NOT CC2500), Mode 2, correct FCC/LBT region,
> 2× flat-top UNPROTECTED 18650 (NOT included) + ELRS EP1/RP1 (CRSF → Teensy UART).
> Pocket stays as the **safety link + kill switch** even under autonomy (T5).
> Role: FHSS safety link with independent failsafe. WiFi/cloud NEVER drives
> (`build-guide/02-electronics-setup.md`, `firmware/README.md` §B/§D/§E).

---

## 1. Exact buy list

| # | Buy this | Spec | Qty | Notes |
|---|---|---|---|---|
| 1 | RadioMaster Pocket, **ELRS 2.4 GHz**, **Mode 2** | Hall X5 nano gimbals, EdgeTX preinstalled, 128×64 mono LCD, nano bay, 288 g, 156.6×65.1×125.3 mm folded | 1 | MSRP $71.50 ELRS / $59.99 CC2500 on radiomasterrc.com (2026); street ~$65–80 ELRS. Batteries NOT included. |
| 2 | Region: **FCC** (US + most non-EU) **OR LBT/CE** (EU/UK) | ELRS FCC ≤250 mW; ELRS LBT/CE ≤100 mW, LBT firmware | — | Independent choice from ELRS/CC2500. Buy for the country you FIGHT in. |
| 3 | 2× 18650, **flat-top, UNPROTECTED, 3.7 V Li-ion** (e.g. Samsung 35E 3500 mAh, LG MJ1, Molicel M35A, or RadioMaster-branded 18650) | Nominal 3.7 V, max 4.2 V/cell; radio wants 6.6–8.4 V DC | 2 (+2 spare set recommended) | Protected/button-top cells are ~2 mm longer and DON'T fit or stress the tray. Do NOT charge LiFe/wrong chemistry on the onboard charger. Charge on bottom USB-C (top USB-C = data/sim). |
| 4 | ELRS 2.4 GHz receiver, CRSF: **RadioMaster RP1 (first pick) or Happymodel EP1 (alternate)** | 13×11 mm class, ~0.5–1 g, 5 V in, CRSF out, ext. T-antenna (U.FL/IPEX) | 1 + 1 spare | Either binds to any ELRS TX (open protocol) if firmware + regulatory domain match. Optional upgrade: RP3/RP4TD diversity if shell-nulls prove to be a problem (see §3). |
| 5 | Cable + USB-C data cable, SD-card reader | — | 1 set | For EdgeTX Companion + ExpressLRS Configurator flashing. |

Spares to add to BOM: spare RX + T-antennas, spare 18650 pair, spare sticks/antenna.

## 2. What to verify BEFORE ordering (do not skip)

- [ ] Listing says **ELRS**, not CC2500. CC2500 is a single-chip legacy multiprotocol module (FrSky ACCST V1/V2, S-FHSS, HoTT …) — it can NEVER bind ELRS by firmware change. After delivery, pop the nano-bay cover: sticker **E / blue = ELRS**, C / yellow = CC2500.
- [ ] Listing says **Mode 2** (throttle+yaw left, pitch+roll right). Mode 1 has throttle on the right — wrong for every setup doc here.
- [ ] Listing says the **right region**: FCC (US + most non-EU) or LBT (EU/UK). ELRS LBT = CE LBT firmware, 100 mW cap. For ELRS the domain is a **firmware flash option** (same hardware — reflashable in ExpressLRS Configurator), but you must still buy + operate the legal domain for your event country. Don't trust listings that say only "Global model".
- [ ] Listing says **batteries NOT included** (current RadioMaster package has none). Any "bundle with batteries" — confirm they are flat-top unprotected 18650.
- [ ] Receiver is **2.4 GHz ELRS, CRSF, 5 V**. Not 900 MHz, not SBUS-only, not FrSky D8/D16. Confirm T-antenna included (not ceramic-only) so you can route it out of the metal shell.
- [ ] You have a plan for matching **ELRS major version + regulatory domain + binding phrase** on TX and RX (see §5). Mismatched v2/v3 or FCC/LBT domain = silent no-bind.
- [ ] UNVERIFIED until firmware lands: exact Teensy UART pins + CRSF baud handling + which telemetry sensors the Teensy forwards. This doc assumes standard CRSF 420 kbaud serial + link-stats; confirm against the Teensy CRSF driver before soldering (§4).

## 3. Receiver choice: RP1 first, EP1 alternate, diversity optional

- RP1 vs EP1 (single-antenna class): functionally interchangeable for this bot — same 2.4 GHz ELRS, same CRSF, same ~1 g, same open-protocol bind. Community reports RP1 antennas/U.FL slightly more durable and QC more consistent; EP1 is the cheapest/most-stocked micro RX. Either is fine; **default to RP1** so TX+RX are one vendor.
- Mounting beats model: inside a spinning metal shell, antenna placement matters more than brand. Route the T-antenna **outside carbon/metal, through/above the poly window area**, 90° to major plates where possible, never coiled around power leads, never pinched at the ring gap.
- Diversity (RP3 / EP1-Dual / RP4TD, two antennas/RF paths): more robust against multipath nulls. Arena distance is <30 m, so single-antenna is adequate and is the locked spec. Upgrade path if log shows link-dropouts correlated to shell angle: fit diversity RX, mount antennas at 90° to each other.
- Power: RX from a 5 V pad (NOT from a pulled-low SBUS/UART pad — ESP-based RXes enter bootloader = solid LED with TX off; move UART if you see that). See §4.

## 4. Wiring: RX CRSF → Teensy UART (CROSSOVER — read twice, solder once)

CRSF is a 2-wire UART: control TX→RX one way, telemetry RX←TX the other. It is a **crossover**:

| Receiver pad | → | Teensy (any FREE full UART, e.g. Serial1/2) |
|---|---|---|
| GND / G | → | GND |
| 5V / VCC | → | 5 V (NOT 3.3 V) |
| **TX** (RX transmits control OUT) | → | **RX** pad of the SAME UART |
| **RX** (RX receives telemetry IN) | → | **TX** pad of the SAME UART |

Rules:

1. Same-UART pair (e.g. Teensy TX1/RX1). One device per UART. Never share with the Pi link or USB serial.
2. Standard CRSF rate is **420 000 baud 8N1, `serialrx_inverted = off`, `serialrx_halfduplex = off`** (Betaflight/INAV convention; your Teensy CRSF driver must use the same). UNVERIFIED: confirm baud + inversion flags in the Teensy CRSF driver in this repo before first power-up — wrong baud = solid link but no sticks.
3. Twist RX-pair, keep away from phase leads, cap the RX rail if brown-outs (`02-electronics-setup.md` step 3/6).
4. Bench order: bind on the bench FIRST (§5), then confirm sticks in the Teensy configurator (§B), then install in the bot. Never power the Teensy from Pi USB in-bot.

## 5. Binding (do this on the bench, props/wheels free)

Recommended: **binding phrase** (auto-rebind, no pit dance). Alternative: classic 3× power-cycle.

### A — Binding-phrase method (recommended)

1. Install/upgrade **ExpressLRS Configurator** on the laptop.
2. Flash the Pocket internal ELRS module: target = Pocket internal 2.4 GHz; set **regulatory domain** (FCC/ISM or CE/LBT per §2), **binding phrase** (your secret string), WiFi creds optional. Flash via USB/WiFi per Configurator prompts.
3. Flash the RP1/EP1: target = `RadioMaster RP1 2.4GHz RX` (or Happymodel EP1 2.4 GHz as appropriate); set the **SAME regulatory domain + SAME binding phrase**, same ELRS major version (v3.x both ends recommended). Flash via UART passthrough or WiFi.
4. Power both. They bind automatically (solid LED on RX). No Lua BIND needed ever again for this pair.
5. Optional: enable **Model Match** later once you run >1 model — but set it identically both ends or it looks like a no-bind. Beginners: leave Model Match OFF until the failsafe film passes.

### B — Classic bind (no phrase, or phrase commented out on RX)

1. TX OFF. Power-cycle the RX **3×** (plug/unplug 3 times) until LED does a **fast double-blink** = bind mode.
2. On the Pocket: SYS → ExpressLRS Lua (`elrsV3.lua`) → **BIND** → confirm. RX LED goes **solid** = bound.
3. Power-cycle both, confirm auto-reconnect in <5 s.

Troubleshooting: solid LED with TX OFF = bootloader (wrong UART pad pulling LOW — move UART); slow blink = waiting for bind (domain/phrase/version mismatch — reflash); fast double-blink = bind mode ready.

## 6. EdgeTX Companion model setup (do it on the PC — the 1.3" screen is painful)

Use **EdgeTX Companion** (PC app) to build the model file, then copy to the Pocket SD. Verify every channel in Channel Monitor + Teensy configurator before arming.

### 6.1 Model skeleton

- New model → name `EYELINER`, type **Multirotor/Plane template stripped to manual mixes** (do NOT keep a Heli template).
- Internal RF: **CRSF / ELRS**, channel range 1–8 minimum. Status must show link, not OFF.
- Channel order: build mixes explicitly (don't trust template order). Verify AETR vs TAER against the Teensy configurator — mismatch = throttle stick drives roll.
- Preflight checks ON: throttle warning ON, switch warnings on ARM + AUTONOMY-KILL (radio refuses to transmit until safe — prevents hot boot-armed).

### 6.2 Locked channel map (8 channels; 16 available but unneeded)

| CH | Function | Source / switch | Failsafe target |
|---|---|---|---|
| CH1 | Roll (Ail) | Right stick horizontal | Center (0) |
| CH2 | Pitch (Ele) | Right stick vertical | Center (0) |
| CH3 | Throttle / spin | Left stick vertical (Mode 2) | **-100 (cut)** |
| CH4 | Yaw (Rud) | Left stick horizontal | Center (0) |
| CH5 | **ARM** | SA (3-pos: UP/MID = disarmed, DOWN = armed — two disarmed slots stop bag-bumps) | **-100 (disarmed)** |
| CH6 | **MODE** (drive/spin profile) | SB 3-pos (Acro/Assist/Angle equivalent per firmware) | Preset safe mode (center or disarmed-profile) |
| CH7 | **AUTONOMY-KILL** (hardware-priority, momentary) | **SF (momentary)** — held = autonomy PERMITTED, released = manual/killed. Latches killed until re-armed. | **Killed state** |
| CH8 | Spare (beeper / pre-arm) | SC or SH | Disarmed/off |

> UNVERIFIED: exact stick→motion semantics (which stick drives translation vs spin-up rate) is defined by the Teensy melty firmware, not the radio. The table above is the locked RADIO-side contract — if firmware's channel map differs, change the firmware map OR this table together and re-film the failsafe. Never fly mismatched.

### 6.3 Mixes (each channel = explicit mix line)

- CH1–CH4: Source = stick, Weight 100 (±; reverse by -100 if Channel Monitor is backwards), no expo in radio (expo lives in Teensy).
- CH5 ARM: Source = SA, Weight 100. Add logical-switch interlock: `L01 = AND(SA↓, Thr < -95)` so ARM only goes live with throttle low (two-factor arm).
- CH6 MODE: Source = SB (3-pos gives -100/0/+100 automatically).
- CH7 KILL: Source = SF with **Replace** multiplex so it overrides any autonomy-permit line; default line Source MAX Weight -100 (killed) replaced by +100 only while SF held AND L01 armed. Disarm path explicit — a Sticky with no OFF condition that latches PERMIT forever is a FAIL.
- Verify in **Channel Monitor**: sticks -100…+100, SA/SB/SF swing the right AUX channels (Betaflight convention AUX1 = CH5 — same numbering your Teensy configurator shows).

### 6.4 Throttle-cut (Special Functions — the bench-safety layer)

- `SF1: Switch SA↑ (disarmed) → Override CH3 → -100, ENABLED`. Throttle locked at zero whenever disarmed regardless of stick. #1 reason this "doesn't work" is the Enable checkbox left off.
- `SF2: Switch SF↑ (kill released) → Override CH7 → -100 (killed), ENABLED`.
- Audio: `L02 → Play Track "armed"` / `!L02 → "disarmed"` so pits hear state. Keep callouts sparse — a chattering RSSI warning trains you to ignore it.

## 7. Failsafe configuration + test ritual (mandatory, film it)

Authority order: **T0 Teensy governor > RX link flag > radio-side preset.** The radio preset is defense-in-depth; the Teensy MUST independently stop on link loss.

### 7.1 Configure

- Radio/ELRS side: set failsafe to **Custom: CH3 Throttle -100, CH5 ARM -100 (disarmed), CH7 KILL = killed, CH1/2/4 centered**. NEVER "Hold last" — a held spin-throttle flyaway is how bots leave the arena. (On CRSF-serial links the Teensy sees a link-loss flag, not frozen PWM — but the Custom preset still protects direct-PWM/SBUS fallback paths and is required defense-in-depth. This mirrors the quad convention: Custom throttle-cut on the radio, Drop/disarm in the controller.)
- Teensy side (T0, per `firmware/README.md` §D): **TX-off → motors STOP/brake <1 s, no restart until deliberate re-arm; boot interlock (never boots armed, never arms with throttle high); Pi brown-out → still failsafes.** UNVERIFIED in this repo snapshot: no Teensy source was present under `firmware/` (README only) — confirm the link-loss timeout + re-arm latch in code before fighting.
- ELRS Lua: set packet rate + **Telem Ratio 1:4 or 1:2** (telemetry still flows; 1:64/1:128/Off starves sensor discovery — see §8).

### 7.2 Test ritual (bench, NO weapon energy → box → arena)

1. **TX-off stop:** arm on bench (wheels free), spin to low RPM, switch Pocket OFF. Motors STOP/brake **<1 s**. Film it. Save as `firmware/failsafe-test.mp4`.
2. **No hot restart:** TX back ON — bot must NOT spin until deliberate SA re-arm with throttle low. Bump-test: cycle SA with throttle high → must refuse to arm.
3. **Kill-switch:** at spin, release SF (KILL) → autonomy permit drops instantly, manual governor holds safe state. Re-permit requires SF held + re-arm sequence.
4. **Brown-out:** yank Pi power (if fitted) → Teensy still failsafes on next TX-off. Never power Teensy from Pi USB in-bot.
5. **Range check:** EdgeTX Range mode + walk-test per manual; confirm RSSI/LQ thresholds (§8) before leaving pits.
6. **Match-day freeze:** firmware version frozen; no flash at event without full re-test (§D checklist).

Show the film at check-in. No film = NO-GO.

## 8. CRSF telemetry to the Pocket display

What flows: ELRS link stats as native CRSF sensors + whatever the Teensy forwards.

1. In ELRS Lua set **Telem Ratio 1:4 or 1:2** (RX side). Power-cycle both ends.
2. On the Pocket: MDL → **Telemetry → Discover new sensors** (bot powered; arm on bench with wheels free if the Teensy only forwards when armed). Expect: `1RSS` (dBm, negative), `RQly` (% link quality), `RSNR`, `RFMD` (packet rate), `TPWR`, `TRSS/TQly`, plus Teensy-forwarded `RxBt/Batt`, RPM/G if implemented.
3. Display on the 128×64 screen: Telemetry page values + top-bar RSSI/LQ; logical-switch voice alerts (e.g. `a<x, RQly, 50 → "link weak"`, `a<x, RxBt, 3.5V-per-cell → "receiver low"` — mind 1RSS-vs-RSSI units: 1RSS is negative dBm, RSSI is 0–100 %; wrong binding = alert never fires).
4. Pit dashboard (laptop) stays the rich view (RPM/G/batt/temp); the Pocket shows **link + kill state + battery** — the three things the safety driver needs.
5. UNVERIFIED: which Teensy→CRSF telemetry frames this repo's firmware actually emits (no driver source in `firmware/` at audit time). If only link stats appear after Discover, the Teensy forward path is not yet implemented — file it as a firmware gap, NOT a radio fault. (Color-screen Yaapu/ELRS widgets are NOT the Pocket path; Pocket uses native CRSF sensors.)

## 9. Why NOT TX12 / Boxer for THIS bot

| Factor | Pocket ELRS (locked) | TX12 MkII ELRS | Boxer ELRS |
|---|---|---|---|
| Street price | ~$65–80 | ~$90–100 | ~$140+ |
| Weight | **288 g** | 363 g | 532.5 g |
| Gimbals | X5 nano Hall (fine for melty) | Hall (AG01-chipset; some units report RF/QC lottery) | Full-size V4 Hall (nicer — unneeded here) |
| RF power | 250 mW (FCC) / 100 mW (LBT) — plenty at arena <30 m | ~100 mW class | **1 W fan-cooled** (long-range headroom — useless in a cage) |
| Module bay | Nano (all this bot needs) | JR full-size | JR full-size |
| Screen | 128×64 mono (same as TX12/Boxer) | 128×64 mono | 128×64 mono |
| Channels | 16 max (bot uses ~7–8) | 16 max | 16 max (more switches, not more channels) |
| Carry | Folding antenna + removable sticks + pouch (pit-tote friendly) | Fixed antenna, bulkier | Big case, antenna must come off (power-without-antenna = damage risk) |

Verdict: Boxer/TX12 buy comfort (full-size gimbals, more switches/dials, JR bay, big LiPo option, 1 W) that a melty safety-link never spends. Melty needs 7–8 channels, two interlocked switches + one momentary kill, link stats, and a radio that lives in a tote and survives pits. Pocket is cheaper, lighter, smaller, and its limits (nano gimbals, fewer switches, 250 mW, nano bay) don't bind on this mission. If the club already owns a TX12/Boxer ELRS, it can drive the bot — but **do not buy new** for this bot; put the delta into spares (teeth, packs, RX, fasteners).

Out of scope (per plan §6): no custom PCB, no motor/ESC changes, no CAD re-model, no cloud-vendor lock-in.

## 10. Quick-start checklist (copy to pits)

- [ ] Pocket ELRS Mode 2 + correct region, E/blue sticker confirmed
- [ ] 2× flat-top unprotected 18650 charged (bottom USB-C), spares packed
- [ ] RP1/EP1 flashed: same ELRS major + domain + phrase as Pocket; bound (solid LED), auto-reconnect <5 s
- [ ] CRSF crossover wiring verified (TX→RX, RX→TX, same UART, 5 V/GND), sticks live in Teensy configurator
- [ ] Companion model `EYELINER` loaded: CH1–4 sticks, CH5 SA arm, CH6 SB mode, CH7 SF kill; throttle-cut SFs ENABLED; preflight switch warnings ON
- [ ] Failsafe Custom set (Thr -100, ARM disarmed, KILL killed, others center); Teensy T0 stop <1 s + no-hot-restart + brown-out tested
- [ ] Telemetry discovered (1RSS/RQly/RFMD/TPWR + Batt); voice alerts sane
- [ ] `firmware/failsafe-test.mp4` filmed; firmware frozen; weigh-in ≤1361 g
