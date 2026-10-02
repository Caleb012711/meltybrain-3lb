# Electronics / Firmware — MCU-First Architecture

## Principle
Fast loop and failsafe live on MCU only. Linux never owns motion, weapons, or primary link.

## Tiering
- **Tier 0 — Failsafe / Watchdog (MCU, highest priority):**
  - ELRS CRSF link-loss detect <100ms → zero drive outputs, spin-down command.
  - Independent hardware watchdog (ESP32-S2 MWDT, 250ms). RP2040 fallback: watchdog_enable(100ms).
  - Power-on state = DISARMED. Requires explicit 2-action arm (CH5 high + yaw flick).
  - Removable power lock / loop key breaks VBAT. SPARC lock required.
  - Brownout detector: if 5V <4.4V or VBAT <12.0V (4S), force disarm + beep.

- **Tier 1 — Spin Loop (MCU, kHz):**
  - H3LIS331DL ±400g accel @ 1000Hz SPI, gyro (e.g. IAM-20380 / BMI270) for heading rate.
  - Why H3LIS331DL: survives ~3000 RPM centripetal (~200-400g at sensor radius). MPU6050 (±16g) saturates instantly.
  - Open-loop spin-up ramp → closed-loop RPM hold via DShot RPM telemetry (eRPM).
  - Translation: phase-locked drive pulsing at rotation frequency (25-50Hz mechanical, computed at 1-2kHz).
  - LED heading reference driven directly from MCU PWM — zero Pi dependency.
  - Loop budget ESP32-S2 @ 240MHz: IMU read 200µs, control 150µs, DShot write 100µs. Total <1ms.

- **Tier 2 — Supervisor (Orange Pi Zero 2W #1, 50-100Hz, advisory only):**
  - UART 460800 8N1 to MCU ( Rotini TX0/RX0 ). Protocol: COBS-framed SimpleMelt-Tune packets.
  - May SEND: RPM setpoint trim ±10%, translation gain trim, PID trim, auto-spinup request, log markers.
  - May NEVER SEND: raw motor PWM, arm/disarm override, failsafe mask. MCU clamps all trims and rejects out-of-range.
  - May RECEIVE: RPM, heading error, Vbat, ESC temp, CRSF LQ/RSSI, hit events.
  - If UART silent 500ms → MCU ignores supervisor, continues last valid RC-only tune. If Pi crashes → no effect on drive.

## Why Linux / Pi Can NEVER Own Fast Loop or Primary Link
1. Latency/jitter: Linux PREEMPT_RT still 200µs-5ms jitter; melty needs <500µs deterministic. GC/scheduler stalls = wall hit.
2. Boot time: Orange Pi Zero 2W Armbian ~36s to userspace. Robot must be failsafe-disarmed from 0s — only MCU (boot <200ms) qualifies.
3. SD corruption on shock (200g hits): ext4/overlay can remount RO mid-match. MCU flash keeps running.
4. WiFi is not SPARC-legal primary (SPARC 6.4.3, 2.4GHz contention, no failsafe guarantee). ELRS CRSF has hardware link-loss + failsafe. WiFi allowed for pit telemetry only.
5. Single fault domain: Pi 5V BEC failure must not = runaway. Tier 0 on MCU with independent 5V LDO from VBAT.

## Wiring Summary
```
4S LiPo -> Loop Key -> PDB
  PDB -> AM32 ESC x2 (DShot + VBAT + GND + RPM telemetry wire to MCU)
  PDB -> Rotini VBAT sense + 5V buck for MCU/RX (MCU-local LDO)
  PDB -> 5V/3A BEC (e.g. Matek Micro BEC 5V/4A) -> Pi #1 + H3LIS331DL level-shifted 3.3V
Rotini ESP32-S2 UART0 <-> Pi UART5 (crossover + common GND, 1k series R)
EP1/RP1 CRSF TX/RX -> Rotini UART1, 5V from MCU rail (not Pi BEC)
H3LIS331DL SPI -> Rotini SPI2, mounted at spin center, potted
```

## BOM (Electronics Only, Weights Measured w/ Wires)
| Qty | Part | Vendor | Weight ea | Notes |
|-----|------|--------|-----------|-------|
| 1 | Rotini ESP32-S2 SimpleMelt board | Tindie / rotini-bot | 12g | Primary MCU, SimpleMelt fw |
| 1 | RP2040 Zero / Pico (fallback MCU) | Waveshare / RPi | 5g | OpenMelt2 port, bench spare |
| 1 | H3LIS331DL breakout ±400g | Adafruit 4621 / SparkFun | 4g | SPI, center-mounted |
| 2 | AM32 35A ESC DShot | NeuronRC / iFlight Beast | 9g ea (18g) | DShot300, RPM telem |
| 1 | Happymodel EP1 ELRS + RP1 spare | Happymodel / RadioMaster | 2g | CRSF 150Hz, bind-phrase |
| 1 | Orange Pi Zero 2W 1GB | Orange Pi / Amazon | 30g w/ heatsink | Supervisor, UART only |
| 1 | Matek Micro BEC 5V/4A | Matek / RDQ | 6g | Dedicated Pi rail, LC filter |
| 2 | Tattu R-Line 4S 550mAh 95C | GensAce Tattu | 68g ea | Rotate 4 packs |
| 1 | Loop key + XT30 + 14AWG | McMaster / Amass | 15g | SPARC lock |
| - | Wiring, caps 35V 470µF, LEDs, mounts | - | ~35g | Low-ESR cap on PDB |
| **Total elec** | | | **~195g** | Leaves ~1105g for ring/chassis/mech |

Firmware repos: SimpleMelt on Rotini (primary), OpenMelt2 tag for RP2040 fallback. No Pi code in critical path.
