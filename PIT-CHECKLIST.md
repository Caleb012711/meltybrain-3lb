# PIT CHECKLIST — Eyeliner 3lb (print this, one page)

Bot: _______________  Driver: _______________  Event: _______________  Date: _______
Cap: **≤1361 g fight-ready** (3 lb = 1360.8 g). Build target ≤1310 g for margin. | Failsafe film: `firmware/failsafe-test.mp4`

## 1 — Power-on order (do it in this order, every time)
- [ ] Wheel locks/covers ON. Bot on concrete, nobody in plane of spin. LiPo bag at hand.
- [ ] Pocket ON first (charged 18650s — flat-top unprotected ×2, NOT included with radio).
- [ ] Confirm correct model selected (ELRS, Mode 2, arm + kill switches correct).
- [ ] Packs in TPU cradle, strapped (shift = unbalance). Plug in → link IN last.
- [ ] Heading LEDs correct (green = front, visible through poly window). If wrong, DO NOT spin.
- [ ] Full procedure: `build-guide/02-electronics-setup.md` §Steps + `firmware/README.md` §B.

## 2 — Link check (before every match)
- [ ] Sticks move correctly in configurator. CRSF telemetry back to Pocket (RSSI + batt).
- [ ] Arm switch arms, kill switch disarms instantly. Re-arm needs deliberate action.
- [ ] Range/wiggle check at pit: RX-loss → motors STOP. Details: `firmware/README.md` §D.

## 3 — Failsafe demo (TRC will ask — film once, show at check-in)
- [ ] TX OFF → motors STOP/brake <1 s, no restart until re-arm. Filmed with timestamp.
- [ ] Brown-out: yank Pi power (if fitted) → MCU still failsafes to stop.
- [ ] Boot interlock: power on with throttle high → stays DISARMED.
- [ ] Video saved as `firmware/failsafe-test.mp4`. Frozen firmware version, config backed up.

## 4 — Link drill + weigh-in
- [ ] Link pull kills everything, <60 s, blindfolded. Removable link reachable, XT60 mains + 16 AWG.
- [ ] Scale reads ≤1361 g fight-ready (with packs + link). Log in `BOM.md` weight budget.
- [ ] Which P1 branch built: ___ (must be E or lighter — see `manufacturing/P1-mass-audit.md`).
- [ ] Rules: SPARC + TRC beetle read. DIY/custom radio pre-cleared (message TRC early). See `build-guide/00-start-here.md` step 1.

## 5 — Spares (see `BOM.md` §5 — pack all, pre-balanced where noted)
- [ ] Teeth pair (matched, pre-balanced) + 12.9 hardware + blue 243 (24 h cure — pre-prep, not at pit).
- [ ] Cleat set + fasteners. ESC spare (AM32 55A). Charged pack set (2× 4S 550 mAh parallel = 1 flight set).
- [ ] Fastener assortment (M3/M4 12.9 + nylocs + washers) + hex key (one size for <10 min swap).
- [ ] Post-swap ritual every time: hand-spin → 1000 RPM → balance-jig check before full spin.

## 6 — T5 autonomy kill demo (ONLY if T5 hardware/flag is in the bot — default ship = human-driven)
- [ ] TRC pre-clear for autonomy obtained (SPARC §6.4.3). No pre-clear = NO auto at event.
- [ ] Pocket kill switch = hardware priority: kills T5 intent instantly → T1 safe state. Demo filmed.
- [ ] Link-loss >1 s, geofence breach, RPM-cap breach → T1 safe state. Intents carry TTL (T3 1 s, T4 5 s).
- [ ] Ladder ref: `build-guide/03-testing-and-driving.md` §Autonomy ladder + `audit/autonomy-plan-2026-09-18.md` §1.

## 7 — Between matches (2 min)
- [ ] 3-min heat check: motors/ESCs cool, no loose fasteners, no rub at hand-spin. Re-weigh if hit hard.
- [ ] Log ONE gain change at a time (`build-guide/03-testing-and-driving.md` §Sequence). No flash at event without re-test.

Full path: `00-start-here.md` → `01-frame-assembly.md` → `02-electronics-setup.md` → `03-testing-and-driving.md` → `manufacturing/pcbway/README.md` → `BOM.md`
