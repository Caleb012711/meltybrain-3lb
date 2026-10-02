# Controller Plan — Dual-Compatible, Legal-First

## Primary (Legal, Match-Use): RadioMaster Pocket ELRS
- Radio: RadioMaster Pocket ELRS 2.4GHz (FCC), ELRS 3.x, bind phrase + model-match ON.
- RX: Happymodel EP1 (primary) / RadioMaster RP1 (spare), CRSF 150Hz to Rotini UART1.
- Failsafe: ELRS set to DISARM (CH5 <1000µs on loss). Verified <100ms cut on TX power-off test.
- EdgeTX telemetry screens (Pocket):
  - Screen 1: RPM (CRSF custom), Vbat, LQ/RSSI, ARM state.
  - Screen 2: Hit counter, ESC temp, supervisor ONLINE/OFFLINE.
  - Audio: `LQ low`, `Vbat low 13.2V`, `failsafe` callouts. Haptic on arm.
- Controls: Right stick = translate vector, Left stick yaw = heading trim, SA = arm (2-pos + confirmation), SB = spinup, SC = RPM preset (Low/Med/High), SD = pit-mode (disables spin).
- Compliance: Pocket + EP1/RP1 is standard RC link — SPARC-legal without pre-clear. WiFi/BT on Pocket disabled in arena.

## Secondary (Trainer / Bench Only): DIY ESP32 Handset
- Build: ESP32 + 2x Hall gimbals (Jumper) + 0.96" OLED + ELRS-compatible CRSF output OR ESP-NOW to bench receiver — NOT for matches.
- Use: trainer for new drivers, bench tuning without wearing Pocket, UI experiments.
- Interlock: DIY handset uses different bind phrase, never bound to combat RX during event. Labeled `BENCH ONLY`.
- Path to legality if ever wanted: would require full SPARC 6.4.3 pre-clear as custom link — not planned for Texas Cup. Keep as trainer.

## Ground Station (Pit Only): Orange Pi Zero 2W #2 + Display
- HW: Pi #2 (second Orange Pi Zero 2W) + 7" HDMI/USB display + USB ELRS sniffer (optional) + pit AP (GL.iNet travel router).
- SW: lightweight web UI (Flask) — shows last-match blackbox plots, RPM histogram, hit map, trim suggestions.
- Tuning UI: sliders for translation gain / RPM preset / heading offset → generates QR / file to copy to Pocket SD (EdgeTX model YAML) or to Pi #1 via SSH over pit WiFi. Never live-tunes armed robot.
- Cloud-AI hints panel: pulls strategy text (see `autonomy/cloud-ai.md`) — e.g. "opponent hugs left wall, bias drift right". Human decides, enters via Pocket trims.
- Arena rule: ground station stays in pit. No active RF to robot in cage except Pocket. Pi #2 WiFi never connects to onboard Pi #1 during match.

## Legality Boundary (SPARC 6.4.3)
- Primary link = Pocket ELRS only. WiFi / ESP-NOW / cloud NEVER primary, NEVER armed-path.
- DIY handset = trainer/secondary, bench only unless separately pre-cleared in writing by TRC EO.
- Any autonomous drive assist beyond MCU RPM-hold/translation (which is standard melty operation via RC stick) requires SPARC 6.4.3 autonomous pre-clear + translation-equivalence video + EO sign-off.
- Pit WiFi: 5GHz preferred, hotspot off inside venue cage area per EO direction. All RF off except Pocket + robot RX when queued.
- Pre-clear packet includes: link diagram, failsafe video (TX-off cut), lock photo, weight photo, translation demo video.
