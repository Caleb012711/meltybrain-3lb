# 02 — Electronics Setup (wiring)

Typical melty chain: Battery → link/switch → ESCs (×2, BLHeli32/AM32 DShot) → brushless motors ← MCU (Teensy/RP2040/Rotini ESP32-S2) ← ELRS/FHSS RX + H3LIS331DL accel (±400g) + heading LEDs. Optional onboard Pi (supervisor, NOT the spin loop) via UART + 5V/3A BEC with isolation mount.

## Rules that override everything
- Primary match link MUST be FHSS RC (e.g. ELRS) with independent failsafe. WiFi/cloud NEVER drives — advisory only.
- Fast spin loop (~1kHz, 2000–4000 RPM) runs on the MCU, not Linux. Pi Brown-out = MCU must still failsafe to stop.

## Steps
1. **Bench, no weapon:** motors + ESCs + RX + MCU on the bench, props OFF / wheels free. Verify arming, direction, DShot beacons.
2. **Power:** XT30/XT60, 16–20AWG silicone, bullets + heat shrink. 2× 4S 550mAh parallel is the Liftoff reference — confirm yours fits + makes weight. Removable link reachable <60s.
3. **Signal:** RX SBUS/CRSF → MCU UART. Route accel on short stiff mount near center; flex = noisy RPM. Twist + separate power/signal, cap the RX if brown-outs.
4. **LEDs:** heading LED visible through poly window (see materials guide). If you can't see heading, you can't drive.
5. **Pi (optional P3):** BEC 5V/3A → Pi Zero 2W on TPU standoffs, UART to MCU, CRSF telemetry back to RadioMaster Pocket. Never power MCU from Pi USB in the bot.
6. **Pre-spin check:** continuity, no pinched wires at ring gap, battery strapped in TPU (can't shift = can't unbalance), link pull kills everything.

## Done when
- [ ] Bench spin both directions, clean DShot, no desync
- [ ] RX-loss → motors stop (failsafe), filmed
- [ ] LEDs correct side, visible through window
- [ ] Full-pack current + temps sane, nothing melts
