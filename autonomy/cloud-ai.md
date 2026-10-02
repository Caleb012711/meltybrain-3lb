# Autonomy / Cloud-AI — Latency Tiers + Authority Limits

Human override always. Cloud never drives.

## Latency Tiers
| Tier | Where | Rate | Owns | Link |
|------|-------|------|------|------|
| T0 | Rotini ESP32-S2 / RP2040 MCU | 1-2kHz control, 1kHz IMU | Failsafe, spin, translation pulse, arm | Direct PWM/DShot |
| T1 | Orange Pi Zero 2W #1 onboard | 50-100Hz RX, 10-50Hz trim TX | RPM trim ±10%, logging, hit-mark, telemetry relay | UART 460800 wired |
| T2 | Pit ground station Pi #2 + display | 5Hz UI / 1Hz plots | Tuning suggestions, log replay, pre-match config | Pit WiFi, OFF in cage |
| T3 | Cloud AI (pit laptop tether) | seconds-minutes | Opponent tracking on pit video, strategy hints, log analysis | Venue WiFi / hotspot |

Round-trip cloud → robot is 2-10s minimum. Melty translation needs <20ms. Cloud is ~100-500x too slow for control — by design advisory only.

## What Cloud AI MAY Do (Pit Only, Human-Gated)
1. Opponent tracking on pit/cage video (post-match or between matches): YOLO/track opponent path, output heatmap + text hint ("tends to box-rush, start spun-up right side").
2. Strategy hints: given bracket + prior logs, suggest RPM preset / starting quadrant. Displayed on Pi #2 UI. Driver accepts/rejects on Pocket.
3. Log analysis: ingest `melt-blackbox` CSV, flag ESC temp rise, RPM sag, vibration harmonics (unbalance), battery sag. Output checklist ("re-balance ring, +20g left", "swap pack 3").
4. Translation tuning assistant: propose gain deltas; human flashes via EdgeTX model edit or Pi #1 SSH in pit. Never auto-pushed to armed bot.

## What Cloud AI NEVER Does
- Never sends drive / spin / arm commands. No cloud→MCU path exists (no socket, no MQTT to robot).
- Never owns primary link (WiFi never primary per SPARC 6.4.3).
- Never overrides failsafe, watchdog, or DISARMED default.
- Never operates during match (pit laptop lid closed / airplane mode in driver box).
- Never auto-arms, auto-spinups, or changes failsafe thresholds.

## Human Override
- Pocket SA disarm instantly zeroes outputs regardless of Pi/cloud state.
- TX power-off = failsafe cut (<100ms). Tested every match day.
- Any autonomy assist beyond standard melty RC translation requires separate TRC EO pre-clear; default Texas Cup config is HUMAN-DRIVEN melty only.
- Cloud hints labeled `ADVISORY — DRIVER DECIDES` in UI. No silent auto-apply.

## Data Flow (One-Way Gates)
```
Robot (T0/T1) --UART-> blackbox file --pit WiFi (post-match)--> Pi #2 --https--> cloud
Cloud --text hint--> Pi #2 display --> human --> Pocket sticks --> robot
```
No return socket to robot. Air-gap by architecture + procedure.
