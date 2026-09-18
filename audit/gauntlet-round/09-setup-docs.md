# Gauntlet 09 — setup-docs (deep report, 2026-09-18)

Agent 9/10. Scope: `audit/autonomy-plan-2026-09-18.md` §4 setup ladder, `build-guide/00-start-here.md`, `02-electronics-setup.md`, `03-testing-and-driving.md`, `BOM.md` fully, `README.md` tracker. Also read `01-frame-assembly.md`, `firmware/README.md`, `manufacturing/pcbway/README.md` + `ORDER-CHECKLIST.md`, `manufacturing/materials-guide.md`, `manufacturing/P1-mass-audit.md`, `3d-printing/README.md`, `audit/match-ready-audit-2026-09-18.md` for consistency.

## 0. Skills

- Attempted `skill`-tool listing first per instructions. Session exposes only the `customize-opencode` skill via the tool; robotics skills live as files under `.opencode/skills/` (10 present: `docker-ros2-development`, `robot-bringup`, `robot-perception`, `robotics-design-patterns`, `robotics-security`, `robotics-software-principles`, `robotics-testing`, `ros1`, `ros2`, `ros2-web-integration`). No superpowers (`systematic-debugging`, `verification-before-completion`, `brainstorming`) skill files exist in this repo — noted, not loaded.
- Loaded by full read: **`robotics-testing`** (bench→box→arena progression, mock hardware, failure-case testing — drove PIT §1–3 ordering and the post-swap ritual), **`robot-bringup`** (ordered power-on, interlocks, link-loss behavior — drove PIT §1/§2/§6), **`robotics-security`** (kill-switch isolation, e-stop separation from autonomy — drove T5-conditional §6 wording). `robotics-software-principles` informed the failsafe-governor framing (T0–T1 govern, never the pit laptop).
- Out of scope stated: no custom PCB, no motor/ESC changes, no CAD re-model, no cloud-vendor lock-in (per autonomy-plan §6).

## 1. Setup-ladder coverage (§4 steps → docs)

| §4 step | Covered by | Gap? |
|---|---|---|
| 1. `base/setup.sh` GO green | NOTHING — `base/` is empty, no `setup.sh`, no `docker-compose.yml` | Yes — PIT §1 deliberately does NOT reference `base/setup.sh`; autonomy-plan §2 is future work. Flagged residual. |
| 2. Flash baseline (OpenMelt2 rig → Teensy) | `firmware/README.md` §A | Partial — see gaps G1/G8 (no flashing-tool install steps for first-timer, no OpenMelt2 URL/version pin). |
| 3. Bind Pocket (Companion file, `radio/`) | `firmware/README.md` §B one verb ("bind RadioMaster Pocket + EP1/RP1") | NO — `radio/` is empty, no Companion file exists. PIT references only the Pocket generically. Gaps G1–G3. |
| 4. Bench spin, no weapon | `build-guide/02-electronics-setup.md` steps 1–6 + Done-when | OK, thin on DShot/AM32 specifics (G8). |
| 5. Failsafe film | `firmware/README.md` §D + `build-guide/03-testing-and-driving.md` Safety-first + Done-when | Procedure exists; artifact missing (`firmware/failsafe-test.mp4` absent — match-ready audit Gate A NO-GO stands). |
| 6. Weigh-in | `build-guide/03-testing-and-driving.md` Done-when + `BOM.md` weight budget + `manufacturing/P1-mass-audit.md` | Blocked: BOM budget blanks (`BOM.md:60-65`), 1360-vs-1361 wording split (see §4). Gate B NO-GO stands. |
| 7. T2 Pi on (assist) | `build-guide/02-electronics-setup.md` step 5 + `firmware/README.md` §E | OK as advisory-only; Pi weight (35–50 g) must hit Branch E budget. |
| 8. T5 auto ONLY in test box, kill demo filmed | `build-guide/03-testing-and-driving.md` §Autonomy ladder + autonomy-plan §1 | Docs correct (T5 behind compile flag + checklist + TRC pre-clear). PIT §6 is conditional-only. |

## 2. Artifacts produced

1. **`PIT-CHECKLIST.md` (repo root, NEW)** — one-page printable event sheet: header fill-ins, §1 power-on order, §2 link check, §3 failsafe demo, §4 link drill + weigh-in, §5 spares pointer, §6 T5-kill conditional, §7 between-matches. All checkboxed. Design decisions:
   - Power-on order is Pocket → model check → packs strapped → link last (bringup ordering; link-last = hardware arming discipline).
   - Failsafe demo lists all three sub-tests (TX-off, brown-out yank, boot interlock) because TRC asks for all three and beginners film only one.
   - Weigh-in cites 1361 g fight-ready (majority wording in repo markdown; inconsistency flagged in §4 rather than silently picked).
   - T5 section is explicitly conditional ("ONLY if T5 hardware/flag is in the bot — default ship = human-driven") per autonomy-plan §1 iron rules; includes pre-clear + TTL + governor language so a beginner cannot misread the sheet as permission.
   - No references to `base/setup.sh`, `radio/` Companion files, or `manufacturing/blades/` READMEs — all absent on disk (verified `ls`). Only existing paths referenced.
2. **`BOM.md` §5 Event spares kit (APPENDED ONLY, lines 69+)** — teeth pair, cleats, ESC, pack (flight-set defined as 2× 4S 550 mAh parallel), fasteners + link. Quantities: 1 fight-config teeth pair + 1 alt-config pair if modular; 1 wheel set; 1 AM32 board pre-configured; 2 flight sets (4 packs); 1 fastener assortment with 2–3 g trim screws. Masses cited from `manufacturing/P1-mass-audit.md` (teeth 55.63 cm³ → 437 g steel / 246 g Ti; undercutter 45.4 cm³ → 356/201 g). Includes <10 min swap + post-swap ritual + 24 h 243-cure warning. Existing §§1–4 + weight budget untouched (verified by re-read after edit; only the trailing tip line now heads §5).
3. **This report** at `audit/gauntlet-round/09-setup-docs.md` (NEW).

No other files edited. No rewording sprees.

## 3. BEGINNER-GAPS report (propose — main agent applies)

Each item: location that assumes knowledge → one-paragraph insert proposed (verbatim, to be pasted by main agent). No inserts applied by this agent.

**G1 — EdgeTX (what it is + Companion vs radio menus).** Assumed at: `firmware/README.md:13` ("confirm sticks in configurator"), autonomy-plan §0 ("Configure in EdgeTX Companion").
Proposed insert (after `firmware/README.md` §B first bullet):
> EdgeTX is the open-source firmware on your RadioMaster Pocket — it defines models, switches, and channel outputs. Do 95% of setup in EdgeTX Companion (free PC app, USB cable) because the Pocket's 1.3" screen is painful for menus: create one model named Eyeliner, Mode 2, 8 channels (1 throttle, 2 arm switch, 3 drive-mode, 4 autonomy-kill, 5–8 spare/telemetry), set the internal ELRS module to CRSF, then Write to Radio. On the radio itself you only verify bars move on the Channel Monitor page — never build the model from scratch on the tiny screen at the field.

**G2 — Binding (ELRS bind procedure).** Assumed at: `firmware/README.md:13` ("bind RadioMaster Pocket + EP1/RP1"), `build-guide/02-electronics-setup.md` (never mentions binding).
Proposed insert (new sub-bullet in `firmware/README.md` §B):
> Binding pairs the EP1/RP1 receiver to YOUR Pocket and must be redone if either is replaced: flash BOTH TX module and receiver to the same ELRS version and regulatory domain (FCC vs LBT — wrong domain = illegal + no link) with the ELRS Configurator, set the same bind phrase on both (or press the receiver's bind button for classic bind), power the receiver and confirm a solid LED (blinking = not bound), then check sticks move in the configurator and CRSF telemetry (RSSI, battery) returns to the Pocket. If sticks don't move, the bug is packet-rate/domain mismatch or wrong UART pads — not your Teensy code.

**G3 — 18650s for the Pocket (the invisible BOM line).** Assumed at: autonomy-plan §0 only ("2× flat-top unprotected 18650 NOT included"); ABSENT from `BOM.md`, all build guides, README tracker.
Proposed insert (new row in `BOM.md` §2 electronics + one line in `PIT-CHECKLIST.md` already covers pit side):
> Radio batteries (buy with electronics or the Pocket is a paperweight on arrival): 2× flat-top UNPROTECTED 18650 cells (e.g. Samsung 30Q / Sony VTC6, ~3000 mAh) + a dedicated 18650 charger. Protected or button-top cells are ~2–3 mm too long and DO NOT fit the Pocket bay; the Pocket does not ship with cells. Charge on the 18650 charger (or USB-C with cells installed, radio off), never above 4.2 V/cell, store half-charged, and carry one charged spare pair — a dead handset ends your event faster than a dead flight pack.

**G4 — Balance jig (how to build + use).** Assumed at: `build-guide/01-frame-assembly.md:5` ("hang bot on a point/bearing"), `build-guide/03-testing-and-driving.md:3` (translation trim with no jig procedure).
Proposed insert (new §5a in `build-guide/01-frame-assembly.md` after the Balance bullet):
> The balance jig is a sharp cone, ball bearing, or needle point fixed upright in a wood block — the bot sits on its exact center top-mark so any heavy side tips down. Mark the shell center from CAD, set the bot gently on the point, and note which side drops; add symmetric trim screws or small counterweights to the LIGHT side (2–3 g at a time, screws opposite each other to preserve symmetry), never drill the ring to remove weight (holes are crack starters). Repeat until the bot sits level in 4+ rotations (turn it 90° each time); even 3–5 g off at 40–100 mm radius causes violent hop at 3000 RPM, so re-check after every hard hit and every weapon swap.

**G5 — Loctite 243 cure (prep + timing + why blue).** Assumed at: `build-guide/01-frame-assembly.md:4` ("243 + full cure 24h"), `manufacturing/materials-guide.md:48` (states 243, not how).
Proposed insert (append to `build-guide/01-frame-assembly.md` §Order step 4):
> Loctite 243 (blue, medium-strength) procedure: degrease bolt + hole with isopropyl and let dry, one small drop on the male threads only (not a bath — excess migrates into bearings), torque to spec in a diagonal star pattern, then DO NOT spin or re-torque for 24 h at room temperature — handling strength is ~10 min but full centrifugal-load strength needs the full cure, so final assembly happens the night before, never at the pit table. Blue 243 disassembles with hand tools + heat; red 271 needs 250 °C+ and will strip inserts — never substitute red on a melty you must service between matches.

**G6 — Removable link drill (what/where/how).** Assumed at: `build-guide/02-electronics-setup.md:5-6`, `build-guide/03-testing-and-driving.md:6` ("60s link drill", "link pull kills everything" — never shown).
Proposed insert (new bullet in `build-guide/02-electronics-setup.md` §Steps after Power):
> The removable link is a combat-legal pull-plug (XT-style loop plug) in series with the battery positive, mounted where a marshal can reach and remove it in under 60 s without tools — typically a short pigtail exiting the top plate with a bright pull loop. Drill: with the bot armed on the bench (wheels free, covers on), have a partner call "link!", pull the plug straight out, and confirm EVERYTHING dies instantly including LEDs and Pi; time it — over 60 s or fumbled access means re-route the pigtail before the event. TRC inspectors will ask you to demo this cold.

**G7 — LiPo parallel packs (charging + connector truth).** Assumed at: `build-guide/02-electronics-setup.md:2` ("2× 4S 550mAh parallel"), `BOM.md:32-33` (XT30/XT60 either-way).
Proposed insert (append to `build-guide/02-electronics-setup.md` §Steps Power bullet):
> Your flight set is TWO identical 4S 550 mAh packs joined by a parallel harness (capacity doubles, voltage stays 4S) — always fly, charge, and store them as a married pair: same brand, same age, same charge state before plugging together, balance-charge at ≤1C in a LiPo bag, never unattended, storage-charge to ~3.8 V/cell after the event. Mains connector standard for this build is XT60 + 16 AWG silicone (the 48 A pack path exceeds XT30's 30 A continuous rating — see `web/src/pages/Engineering.tsx:159-160`); keep XT30 only on short low-current branches if your harness already uses them, and never adapt between connector families with loose bullet joints.

**G8 — AM32/DShot bench (what "clean DShot" means).** Assumed at: `build-guide/02-electronics-setup.md` Done-when ("clean DShot, no desync"), `firmware/README.md:14`.
Proposed insert (new bullet in `build-guide/02-electronics-setup.md` §Steps after step 1):
> Bench validation means: in the AM32 Configurator, both ESCs show DShot600 + bidirectional telemetry at the 8 kHz loop, motor direction matches the diagram (swap any two motor wires OR flip direction in AM32 — never both), beacons/musical tones play on power-up, and a 10 s mid-throttle run shows no desync (no stutter, no single-motor drop) with sane current and no melting insulation. If one motor kicks backwards on arm, fix direction in AM32 before touching Teensy gains — gains cannot fix a reversed motor.

**G9 — Heading-LED offset + translation trim (where the knob is).** Assumed at: `build-guide/03-testing-and-driving.md:9-10` ("flip heading offset 180°", "add trim until straight").
Proposed insert (expand `build-guide/03-testing-and-driving.md` §Sequence steps 1–2):
> Heading offset lives in firmware config (OpenMelt2 learning rig: stick-menu LED-offset item, default ~7%; Liftoff Teensy build: the heading-offset parameter — back it up before changing): at 0 RPM with the bot disarmed-but-powered, push "forward" and confirm the GREEN front LED points the way the bot tries to translate; if it drives backwards, add 180° to the offset and re-test before touching trims. Then command slow forward at 500–1000 RPM (teeth off or covered) and add translation trim one click at a time until the path is straight — re-trim per floor (wood cleats bite, polished steel skates) and log the value per surface.

**G10 — Failsafe film (shot list + save path).** Assumed at: `firmware/README.md` §D + `build-guide/03-testing-and-driving.md` Done-when (states what, not how to shoot).
Proposed insert (append to `firmware/README.md` §D):
> Shoot on a phone on a tripod: frame the bot AND the Pocket screen AND a clock in one continuous take — call out each step ("TX on, armed", "TX off NOW"), hold the dead-bot shot 5 s to prove no restart, then show deliberate re-arm, the Pi-power-yank brown-out test, and a throttle-high boot staying disarmed. Export as `firmware/failsafe-test.mp4` (that exact path — TRC check-in and `build-guide/03` point at it), keep it under ~100 MB, and freeze the firmware version the day you film; any re-flash invalidates the film.

## 4. Cross-reference verification (every path in the two deliverables)

| Referenced path | Exists? | Notes |
|---|---|---|
| `build-guide/00-start-here.md` | YES | PIT footer + §4 |
| `build-guide/01-frame-assembly.md` | YES | PIT §5/BOM §5; G4/G5 insert targets |
| `build-guide/02-electronics-setup.md` | YES | PIT §1; G2/G6/G7/G8 insert targets |
| `build-guide/03-testing-and-driving.md` | YES | PIT §6/§7; G9 insert target |
| `BOM.md` (+ new §5) | YES | PIT §4/§5; G3/G7 insert targets; weight budget `BOM.md:60-65` still blank |
| `firmware/README.md` | YES | PIT §1–3; G1/G2/G10 insert targets |
| `firmware/failsafe-test.mp4` | NO (expected) | Referenced as the required artifact to CREATE; absence = match-ready Gate A NO-GO, carried forward |
| `manufacturing/pcbway/README.md` | YES | PIT footer |
| `manufacturing/pcbway/ORDER-CHECKLIST.md` | YES | Read; not cited on pit sheet (pre-event, not pit) — correct omission |
| `manufacturing/P1-mass-audit.md` | YES | PIT §4 branch question; BOM §5 masses (teeth 55.63 cm³, undercutter 45.4 cm³) |
| `manufacturing/materials-guide.md` | YES | BOM §5 cleats ref |
| `Standard Weapon Teeth.step` / `Undercutter Config.step` | YES (repo root) | BOM §5 filenames exact |
| `Main CAD.step` / `Wheel Pod.step` | YES (repo root) | Not cited on pit sheet (correct — pit sheet is ops, not CAD) |
| `3d-printing/README.md` | YES | Read; not cited on pit sheet (correct omission) |
| `README.md` tracker | YES | Read; tracker step 9 says ≤1360 g (see inconsistency below) |
| `audit/autonomy-plan-2026-09-18.md` | YES | PIT §6 ladder ref; T5 rules |
| `PIT-CHECKLIST.md` | YES (created this round) | Self-ref from BOM §5 |
| `base/setup.sh`, `base/docker-compose.yml`, `radio/*`, `manufacturing/blades/*` | NO (dirs exist, empty) | Deliberately NOT referenced anywhere in deliverables |

Inconsistencies found (not fixed — main-agent call, flagged for dedupe):
- **Weight cap 1360 vs 1361:** `BOM.md:56` (1360.8 cap, use 1361) vs `BOM.md:65` (≤1360 g) vs `README.md:20` (≤1360 g) vs `build-guide/00-start-here.md:14,26`, `01-frame-assembly.md:18`, `03-testing-and-driving.md:23`, `P1-mass-audit.md:5` (all 1361 g). Match-ready audit §1 already flagged this. PIT + BOM §5 use 1361 g (majority + physics 1360.8→1361 rounding); recommend repo-wide `≤1361 g fight-ready, ≤1310 g build target`.
- **XT30 vs XT60:** `BOM.md:33,35` + `build-guide/02-electronics-setup.md:11` say XT30/XT60 either-way, 16–20 AWG; site `web/src/pages/Pages.tsx:38,316` + `Engineering.tsx:159-160` say XT60 mains + 16 AWG, XT30 inadequate (30 A cont vs 48 A path). PIT §4 + G7propose XT60 mains. Recommend BOM §2 power rows updated to XT60 mains by owner agent.
- **`render.yaml:52-64` duplicate buildFilter** (match-ready audit §1) — untouched, out of scope for this agent.

## 5. Key decisions

- PIT sheet stays one page: checkboxes + paths, no tutorials inline (tutorials belong in the G-inserts, not on a laminated sheet).
- T5-kill demo is conditional-only with pre-clear gate first — avoids implying autonomy is event-legal by default.
- BOM §5 quantities assume modular blades (two teeth configs) per autonomy-plan §3 but degrade gracefully to one pair for single-config builders.
- 18650 gap (G3) is the highest-severity beginner blocker (dead handset on arrival) and has zero current coverage outside the autonomy plan — ranked first for main-agent application.

## 6. Verdict

- **Setup-docs pillar: GO (conditional).** `PIT-CHECKLIST.md` created, `BOM.md` §5 appended cleanly with existing content intact, all cross-references verified against disk, 10 beginner gaps proposed as paste-ready inserts without drive-by edits.
- **Fight readiness: NO-GO (carried forward, not regressed).** Match-ready Gates A (failsafe film absent) + B (weight blanks) remain NO-GO; `radio/` + `base/` + `manufacturing/blades/` still empty so ladder steps 1/3 have no backing files; T5 stays behind compile flag + checklist + TRC pre-clear.
- Residual risks: (1) no filmed failsafe/T5-kill demos exist; (2) BOM weight budget unfilled, no scale photo; (3) 1360/1361 + XT30/XT60 splits unresolved; (4) Pocket 18650s + charger still missing from BOM §2 until G3 applied; (5) builders may assemble 243-wet or skip post-swap spin check until G5/BOM-§5 ritual is read — pit sheet mitigates but cannot enforce.
