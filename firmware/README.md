# Firmware — Flash, Configure, Failsafe

Pick ONE stack, don't mix. Recommended: **Teensy 4.0 LOCK (no pins) + 2x H3LIS331DL + AM32 DShot600 bidirectional + SBUS/ELRS** (Project LiftOff Rev9). Fallback beginner: Rotini ESP32-S2 + SimpleMelt.

Why this stack: OpenMelt2 (nothinglabs/openmelt2) proves the concept on Arduino Micro + single H3LIS331 + binary/490Hz PWM + SimonK — good to 3200 RPM, interactive stick-config, EEPROM radius/LED offset. Liftoff Rev2→Rev9 kept the math but moved to Teensy 4.0 600MHz + dShot600 via SPI @8000Hz + dual opposed H3LIS331DL @45° for deterministic RPM/heading that survives CoR shift from damage. Copy Liftoff, use OpenMelt2 as your learning rig.

## A. Flash
1. Install drivers + flasher (Teensyduino / Arduino / PlatformIO per board docs).
2. Flash baseline first: OpenMelt2 on spare Micro to learn config flow, then Liftoff-style Teensy build (dShot600 bidir) — no custom gains yet.
3. Verify USB enumeration + config UI loads. Back up stock config.

## B. Configure (bench, NO weapon energy)
- RX protocol: SBUS (Liftoff Rev9) into Teensy UART / or CRSF (ELRS) — bind RadioMaster Pocket + EP1/RP1, confirm sticks in configurator.
- ESC: DShot600 bidirectional, motor direction matched, 8kHz loop (Liftoff: dShot600 via SPI manipulation @8000Hz; OpenMelt2 antweight used 490Hz PWM + SimonK — obsolete for 3lb).
- Accel: 2x H3LIS331DLTR ±400g over SPI (fast) mounted rigid near CG, opposed @45° to rotation axis per Liftoff deterministic diagram. Single-accel OpenMelt2 mode (radius 3.9cm default, LED offset 7%) works to learn, but will drift after hits. Confirm RPM reads ~0 at rest, rises with hand spin. Noisy = remount + shorten wires + add 4700uF on 5V bus + 10:1 divider for batt sense.
- Motors: PROPDRIVE v2 2836 1200KV as hubmotors (6mm dead axle, 2x 626 bearings, 82g each). 50-60A ESC, 3-4S. Start 2x 4S 550mAh parallel.
- Heading: 2 pairs LEDs (green=front) + offset so LED = commanded direction at 0 RPM. Raise/inset from shell perimeter a few mm so visible at shallow arena angles. Wrong = un-drivable.
- Spin: set min 1500–2000 RPM test cap, soft start, current limit per ESC spec. Liftoff target 2000-4000 RPM; OpenMelt2 tested to 3200 RPM.

## C. Tune (see build-guide/03)
Low-RPM straight-line first, then 2k→3k→4k. Only change ONE gain at a time, log each run. Onboard Pi (if fitted) logs RPM/accel/batt; pit Pi shows it live.

## D. Failsafe (mandatory, film it)
- TX off → motors STOP/brake <1s, no restart until re-arm.
- Brown-out (yank Pi power if fitted) → MCU still failsafes.
- Boot interlock: never boots armed with throttle high.
- Save video as `firmware/failsafe-test.mp4`, show TRC at check-in.

## E. Pit / cloud (advisory only — NEVER drives, per SPARC §6.4.3)
- Onboard Pi #1 (Pi Zero 2W + Pi Cam v3 Wide): UART to Teensy @115200, RPM-hold trim + hit-recovery + CRSF telemetry to Pocket. Camera does onboard optical-flow + records 1080p to SD for post-match review. 35-50g total with BEC — budget in P1 audit Branch E.
- Pit Pi #2 + display: WiFi telemetry dashboard (RPM, G, batt, temp, max-RPM flashes), one-tap gain push between matches.
- Cloud AI (laptop/hotspot): pit-overhead camera YOLOv8 (bot + opponent tracking) + LLM strategy hints (“opponent hugging left wall, push forward-right on next spin-up”) + log review. Seconds-latency, human-gated — driver must approve. DeepMelt (Liftoff autonomous variant) is the reference, but full autonomy needs TRC pre-clear — run human-in-loop until cleared.
- Wiring: BEC 5V/3A → Pi on TPU standoffs, never power Teensy from Pi USB in-bot. Pi brown-out = Teensy must still failsafe.

Failsafe checklist:
- [ ] TX-off stop filmed
- [ ] Re-arm requires deliberate action
- [ ] Config + logs backed up in this folder
- [ ] Match-day firmware version frozen (no flash at event without re-test)
