# TRC Checklist — SPARC Compliance + Match Day

Venue: REV Robotics, Carrollton TX. Class: 3lb (1361g max). Target: Texas Cup. Org: Texas Robot Combat (TRC), SPARC rules.

## SPARC Compliance
- [ ] Weight ≤1361g on official scale with all match config (incl. loop key, battery). Target 1300g dry.
- [ ] Failsafe: TX off → drive + spin outputs zero <100ms. Video-recorded. ELRS CH5 failsafe = DISARM.
- [ ] Removable lock / loop key: breaks VBAT positive, accessible, red lanyard. Photo in packet. Robot inert with key out.
- [ ] Primary link: 2.4GHz ELRS (Pocket → EP1/RP1, CRSF). No WiFi primary. SPARC 6.4.3: custom/autonomous links pre-cleared only — ours is standard RC, no pre-clear needed for link, pre-clear filed for melty translation demo.
- [ ] No untethered autonomous drive in match without EO written pre-clear. Config: human-driven melty only.
- [ ] Weapon lock: ring cannot spin with key out; SA disarm + spin-down <3s on command.
- [ ] LiPo: Tattu / Palm 4S hard-case or padded, XT30, charge in LiPo bag at 1C, storage 3.8V/cell, never puffed. TRC may require LiPo bag at pit.
- [ ] Sharp edges covered in transit, power light (blue LED = ARMED, red = DISARMED) visible.
- [ ] Frequency / pit RF discipline: only Pocket + robot RX on when queued; pit AP 5GHz, off on EO call.

## Pre-Clear Packet (Email TRC EO 2+ Weeks Before Texas Cup)
Subject: `Texas Cup 3lb Pre-Clear — Eyeliner Evo (Ring Meltybrain)`
1. Team + contact + robot name/class/weight photo on scale.
2. Link diagram (Pocket → EP1 CRSF → Rotini → AM32 DShot) + bind phrase managed, model-match on.
3. Failsafe video link (unlisted): TX-off cut, arm-sequence, lock pull.
4. Translation-equivalence video link: controlled box drift (forward/back/left/right + stop) proving melty = RC-driven, not autonomous.
5. Code links: SimpleMelt fw rev + OpenMelt2 fallback rev, MCU-only failsafe file pointer.
6. Pi supervisor statement: advisory-only, no arm/PWM authority, UART spec, boot-safety note (36s boot ≠ motion).
7. Photos: lock/lanyard, battery labels, power LED states.
8. Request: confirm melty translation + Pi-logger allowed as configured; confirm DIY handset stays bench-only.

## Match-Day Kit List
- Robot + ring configs (Standard Teeth + Undercutter per CAD), spare ring bolts (10.9, nyloc).
- RadioMaster Pocket (charged, ELRS 3.x, model backup on SD) + USB-C cable.
- 4x Tattu 4S 550mAh, LiPo bag, ISDT charger, cell checker, XT30 spares.
- Loop keys x2, link lanyard, hex set, tape, zip ties, VHB, spare EP1/RP1 (bound).
- Pit Pi #2 + 7" display + travel router + laptop (logs + cloud hints, pit only).
- Scale (0.1g), IR temp gun, tachometer, SD reader, blackbox download cable.
- Safety: glasses, gloves, small fire extinguisher / sand, first-aid.
- Docs: printed failsafe procedure, weight slip, EO pre-clear approval (phone + paper).

## Pit / Queue Procedure
1. Weigh-in → scale photo → tech inspection (failsafe demo + lock pull).
2. In pit: download last logs over WiFi, review Pi #2 hints, set RPM preset on Pocket. WiFi off before queue.
3. Queue: key in only in cage / test box, SA disarm until EO green, spin-up on EO call.
4. Post-match: key out first, photo damage, pull blackbox, storage-charge packs.
