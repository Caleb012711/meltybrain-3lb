# 38 — Firmware-copy verification: site /firmware page vs README vs build guides

Owner: agent 8/10, round-2 verification. Scope ONLY: `web/src/pages/Pages.tsx` Firmware
section vs `firmware/README.md` vs `build-guide/02-electronics-setup.md` +
`build-guide/03-testing-and-driving.md`. Cross-refs to `Engineering.tsx`, `BOM.md`,
`content.ts`/`buildGuide.ts`, `Home.tsx`, `radio/POCKET.md` are context only, not owned.

Skills applied (read from disk first, per brief):
- `robot-bringup` (`.opencode/skills/robot-bringup/SKILL.md`) — layered-startup /
  ordered-bringup + health-check + watchdog lens. Used to judge §D: boot interlock,
  re-arm latch (never auto-resume), bench-no-energy → cap → slide → ramp order,
  TX-off <1 s stop as the watchdog, Pi-yank brown-out independence.
- `robotics-security` (`.opencode/skills/robotics-security/SKILL.md`) — e-stop
  independence, safety-controller isolation, no-network-e-stop, command-validation,
  firmware-verification lens. Used to judge: T0/Teensy as the isolated safety
  governor vs T2 Pi / T3 pit / T4 cloud; "T3/T4 never drive"; human-gated +
  TRC pre-clear per SPARC §6.4.3; match-day version freeze + config backup +
  filmed evidence (`firmware/failsafe-test.mp4`).

Method: read all four owned files in full from disk; ran `npm run lint` and
`npm run build` in `web/` myself (see §5). Line numbers below are current-disk.

Audited artifacts:
- Page: `web/src/pages/Pages.tsx:285-335` (`Firmware()` export; safety ladder :290-292,
  table :293-304, stack pick :305-308, flash checklist :309-312, wiring :313-321,
  tune :322-325, failsafe :326-329, AI :330-333)
- README: `firmware/README.md:1-39` (§A flash :7-10, §B configure :12-18,
  §C tune :20-21, §D failsafe :23-28 + checklist :35-39, §E pit/cloud :29-33)
- Guides: `build-guide/02-electronics-setup.md:1-21`, `build-guide/03-testing-and-driving.md:1-23`
- Engineering verdicts (context): `web/src/pages/Engineering.tsx:156-164`

## 1. Spec-by-spec: page vs README — PASS/FAIL

| # | Spec (brief's list) | Page evidence | README evidence | Verdict + fix |
|---|---|---|---|---|
| 1a | Teensy 4.0 lockable (no pins), 600 MHz | Table `Pages.tsx:298` "Teensy 4.0 at 600 MHz" (drops lock qualifier); stack pick `Pages.tsx:307` "Teensy 4.0 lock (no pins)" | `firmware/README.md:3` "Teensy 4.0 LOCK (no pins)"; `:5` "Teensy 4.0 600MHz" | PASS (split across two blocks; table alone under-specifies). Fix (trivial): table cell → "Teensy 4.0 LOCK (no pins) at 600 MHz". |
| 1b | 2× H3LIS331DLTR ±400 g, opposed @45°, SPI | `Pages.tsx:299` "Dual H3LIS331DLTR, opposed at 45°, SPI"; `Pages.tsx:318` "±400 g saturates past ~2800 RPM at 45 mm, ~3450 RPM at 30 mm" | `firmware/README.md:5` "dual opposed H3LIS331DL @45°"; `:15` "2x H3LIS331DLTR ±400g over SPI (fast) … opposed @45° to rotation axis" | PASS. Note: page drops "to rotation axis" (3 words); suggest adding. Saturation numbers are page+Engineering extensions beyond README — verified correct (see §4). |
| 1c | AM32 55 A, DShot600 bidirectional, 8 kHz loop | `Pages.tsx:300` "DShot600 bidirectional at 8 kHz, AM32"; `Pages.tsx:291` "T1 Teensy spin at 8 kHz DShot600"; `Pages.tsx:316` "→ AM32 boards →" (no rating) | `firmware/README.md:3` "AM32 DShot600 bidirectional"; `:14` "DShot600 bidirectional … 8kHz loop (dShot600 via SPI manipulation @8000Hz)"; `:16` "50-60A ESC" (range, not 55 A) | FAIL (minor omission): neither page cell states the locked **55 A** rating (locked in `BOM.md:28`, `Engineering.tsx:162`, Parts `Pages.tsx:224`). Fix: Drive cell → "AM32 55 A, DShot600 bidirectional at 8 kHz"; wiring bullet → "AM32 55 A boards". |
| 1d | ELRS CRSF (vs SBUS history) + Pi UART 115200 | `Pages.tsx:307` "ELRS CRSF"; `:317` "ELRS CRSF → Teensy UART · Pi link UART 115200 · never power the MCU from Pi USB in-bot" | `firmware/README.md:3` "SBUS/ELRS"; `:13` "SBUS (Liftoff Rev9) into Teensy UART / or CRSF (ELRS)"; `:30` "UART to Teensy @115200"; `:33` "never power Teensy from Pi USB in-bot" | PASS (page correctly locks CRSF; UART 115200 + USB-power rule exact). Note: README `:3`/`:13` still list SBUS first — SBUS is history (`BOM.md:31`, `Home.tsx:309` "Liftoff Rev9 flew SBUS; this build locks ELRS CRSF"). Suggest README reword to "ELRS CRSF (locked; SBUS = Liftoff-Rev9 legacy fallback)" or a page parenthetical "(SBUS legacy, see README)". No page edit strictly required. |
| 1e | PROPDRIVE 2836 1200 KV hubmotors | `Pages.tsx:316` "→ PROPDRIVEs (18 AWG minimum on short motor leads)" — **no model/KV/size** | `firmware/README.md:16` "PROPDRIVE v2 2836 1200KV as hubmotors (6mm dead axle, 2x 626 bearings, 82g each). 50-60A ESC, 3-4S" | FAIL (omission): Firmware page never states the motor model. Fix: wiring bullet → "→ 2× PROPDRIVE v2 2836 1200KV hubmotors (82 g ea, 6 mm dead axle, 2× 626) (18 AWG min short motor leads)". (Spec lives correctly on Parts `Pages.tsx:223` + `Home.tsx:197`; this is a Firmware-card completeness gap.) |
| 1f | 2× 4S 550 mAh parallel | Page Firmware section (`:285-335`) — **no pack spec anywhere** (wiring bullet starts "Battery → link …" with no capacity/cell-count) | `firmware/README.md:16` "Start 2x 4S 550mAh parallel"; `02:12` "2× 4S 550mAh parallel is the Liftoff reference" | FAIL (omission). Fix: wiring bullet → "Battery (2× 4S 550 mAh in parallel, Liftoff ref) → link …". (Spec correct on Parts `Pages.tsx:228`, `Home.tsx:197`, `Engineering.tsx:130`.) |
| 1g | BEC 5 V / 3 A (+ TPU standoffs) | Page AI card `Pages.tsx:332` "Onboard Pi Zero 2W plus wide camera over UART …" — **no BEC rating, no standoffs** (`:317` keeps "never power the MCU from Pi USB" ✓) | `firmware/README.md:30` "35-50g total with BEC"; `:33` "BEC 5V/3A → Pi on TPU standoffs"; `02:14` "BEC 5V/3A → Pi Zero 2W on TPU standoffs" | FAIL (minor, safety-relevant per `robotics-security` power-isolation: Pi brown-out must not take down T0). Fix: AI card → "… over UART on an isolated BEC 5V/3A, Pi on TPU standoffs …". |
| 1h | LED: 2 pairs, green = front, radius 3.9 cm, offset 7%, raised/inset | `Pages.tsx:319` "Green LED = front, raised/inset a few mm for shallow arena angles · learn defaults: radius 3.9 cm, LED offset 7%"; `:299` "Single H3LIS331, 3.9 cm radius default" | `firmware/README.md:15` "Single-accel OpenMelt2 mode (radius 3.9cm default, LED offset 7%)"; `:17` "2 pairs LEDs (green=front) + offset … Raise/inset from shell perimeter a few mm so visible at shallow arena angles" | PASS (numbers exact). Trivial note: page says "Green LED = front" (singular) vs README "2 pairs LEDs (green=front)" — suggest "2 pairs, green = front". |
| 1i | RPM bands: 1500–2000 cap → 2k → 3k → 4k (+ soft start, current limit, heat-check) | `Pages.tsx:301` "2000–4000 RPM, survives center shifts" / "To about 3200 RPM, drifts after hits"; `:324` "Bench with no weapon energy. Low-RPM slide … Ramp 2000, heat-check, 3000, heat-check, 4000. Blip-test hit recovery …" | `firmware/README.md:18` "set min 1500–2000 RPM test cap, soft start, current limit per ESC spec. Liftoff target 2000-4000 RPM; OpenMelt2 tested to 3200 RPM"; `:21` "Low-RPM straight-line first, then 2k→3k→4k"; `03:9-12` slide 500–1000, trim, ramp 2000→3000→4000 + heat-check each step, hit-recovery blip | FAIL (minor, partial): sequence + heat-checks + 2000–4000/3200 bands all present ✓, but the Tune card omits the **1500–2000 RPM test cap numbers, soft start, and ESC current limit** (`README:18`). Fix: Tune card first sentence → "Bench with no weapon energy, cap 1500–2000 RPM, soft start, ESC current limit. Low-RPM slide …". (Build page `Pages.tsx:42` already carries the cap numbers; this is Firmware-card parity.) |
| 1j | One-gain-at-a-time + logging | `Pages.tsx:324` "One gain at a time, log RPM, g, battery, and temperature on the Pi." | `firmware/README.md:21` "Only change ONE gain at a time, log each run. Onboard Pi (if fitted) logs RPM/accel/batt; pit Pi shows it live." | PASS (page faithfully expands log fields; temp is a benign addition). |
| 1k | Learn/fallback stacks (OpenMelt2, Rotini) | `Pages.tsx:298-300` Arduino Micro / single-accel / 490 Hz PWM+SimonK / ~3200 RPM; `:307` "Learn rig: OpenMelt2 on Arduino Micro + single accel + 490 Hz/SimonK to ~3200 RPM · Fallback: Rotini ESP32-S2 + SimpleMelt" | `firmware/README.md:3` "Fallback beginner: Rotini ESP32-S2 + SimpleMelt"; `:5` "Arduino Micro + single H3LIS331 + binary/490Hz PWM + SimonK — good to 3200 RPM"; `:9` "Flash baseline first: OpenMelt2 on spare Micro … no custom gains yet" | PASS. Note: flash checklist `Pages.tsx:311` covers all four §A steps (installer / baseline-no-gains / USB+UI / backup) ✓ but compresses the "OpenMelt2-on-spare-Micro first, then Liftoff-Teensy" order — acceptable for a checklist; order lives in `:307` + README. |
| 1l | 4700 µF + 10:1 divider | `Pages.tsx:318` "4700µF on 5 V + 10:1 divider for battery sense" | `firmware/README.md:15` "add 4700uF on 5V bus + 10:1 divider for batt sense" | PASS (exact). |

§1 tally: 8 PASS, 4 FAIL (all minor omissions: 1c 55 A, 1e motor model, 1f pack spec, 1g BEC rating; 1i partial). No incorrect specs found on the page.

## 2. Failsafe card vs README §D — all PASS

| Check (brief's list) | Page (`Pages.tsx:326-329` + ladder `:291`) | README §D (`:23-28`, checklist `:35-39`) + guides | Verdict |
|---|---|---|---|
| TX-off <1 s, STOP/brake | `:291` "TX-off stops the bot in under one second, filmed."; `:328` "TX-off stops or brakes the bot in under 1 s" | `README:24` "TX off → motors STOP/brake <1s"; `02:19` "RX-loss → motors stop (failsafe), filmed"; `03:6` "TX off → spin stops"; `content.ts:62,69` "<1 s" | PASS (wording "stops or brakes" ≡ "STOP/brake"). |
| Brown-out (yank Pi) | `:328` "Yank Pi power — the MCU must still failsafe." | `README:25` "Brown-out (yank Pi power if fitted) → MCU still failsafes."; `:33` "Pi brown-out = Teensy must still failsafe."; `02:7` "Pi Brown-out = MCU must still failsafe" | PASS. `robot-bringup`/`robotics-security` view: T0 survives supervisor death — the required independence property, stated on both sides. |
| Boot interlock (never boots armed, throttle high) | `:328` "It must never boot armed with throttle high." | `README:26` "Boot interlock: never boots armed with throttle high." | PASS (exact). |
| Re-arm deliberate, no restart | `:328` "with no restart without a deliberate re-arm." | `README:24` "no restart until re-arm."; checklist `:37` "Re-arm requires deliberate action" | PASS ("deliberate" present on page). |
| Evidence path `firmware/failsafe-test.mp4` | `:328` "Save firmware/failsafe-test.mp4"; Build `:43` same path | `README:27` "Save video as `firmware/failsafe-test.mp4`"; `03:21` same path | PASS (exact relative path, all four places agree). Note: `firmware/` currently contains only `README.md` — mp4 correctly absent pre-test, not a gap. |
| Frozen version + backup + TRC | `:328` "freeze the firmware version, back up config and logs. Show TRC at check-in."; `:311` "match-day version frozen after tune" | `README:27` "show TRC at check-in."; `:38` "Config + logs backed up in this folder"; `:39` "Match-day firmware version frozen (no flash at event without re-test)" | PASS. Trivial note: page drops the parenthetical "(no flash at event without re-test)" — suggest appending it to `:328` or `:311` for the `robotics-security` firmware-verification rule. |

`robot-bringup` judgment on §D: boot-locked start, latching failsafe with deliberate
re-arm only (never auto-resume), supervisor-death independence, and filmed proof with a
frozen version string are all present and mutually consistent across page/README/guides.
No finding.

## 3. Advisory-only AI vs README §E + SPARC §6.4.3 — PASS (with condensation notes)

- "T3/T4 never drive": page ladder `Pages.tsx:291` "T3 and T4 **never drive**." + AI card
  `:331` "advisory only" + Build `Pages.tsx:29` "cloud/pit never drives" + `Layout.tsx:75`
  agree with `README:29` "(advisory only — NEVER drives, per SPARC §6.4.3)" + `02:6`
  "WiFi/cloud NEVER drives — advisory only" + `03:16` "T3/T4 never drive". PASS.
- Human-gated: page `:332` "cloud model suggests strategy for the driver to approve."
  ≡ `README:32` "Seconds-latency, human-gated — driver must approve." PASS. Note: page
  never uses the literal token "human-gated" (uses "for the driver to approve" +
  "advisory only"); suggest adding the literal word for grep-ability, e.g. "… (human-gated)".
- TRC pre-clear + SPARC §6.4.3: page `:332` "DIY handset is a trainer until TRC
  pre-clears §6.4.3." + Build `:11`/`content.ts:62` same rule; matches `README:32`
  "full autonomy needs TRC pre-clear — run human-in-loop until cleared." + `03:17`
  "until TRC pre-clears under SPARC §6.4.3". PASS.
- Ladder rates: page `:291` T0 failsafe / T1 8 kHz / T2 50–100 Hz / T3 ~5 Hz / T4 seconds
  ≡ `03:16` T0→T4 ladder + `README` §E roles. PASS.
- `robotics-security` judgment: the page upholds every applicable rule — safety governor
  (T0/T1 Teensy) isolated from advisory layers; no network e-stop path (kill/failsafe is
  T0 + FHSS link, never T3/T4); autonomy-shipped-as-advisory by default. No finding.
- Condensation notes (not failures, site-card appropriate): page `:332` compresses
  `README:30-32` (Pi Zero 2W + wide camera ✓, optical-flow trim ✓, RPM hold ✓, 1080p SD
  log ✓, "telemetry back to the handset" for CRSF-to-Pocket ✓, YOLO both-bots ✓) but
  drops the tokens "hit-recovery", "one-tap gain push", "RPM/G/batt/temp + max-RPM
  flashes", "YOLOv8"/"LLM", "seconds-latency", "DeepMelt", and "RadioMaster Pocket +
  EP1/RP1" match-radio naming. Suggest one appended sentence: "Pit dashboard (RPM/G/batt/temp,
  one-tap gain push); seconds-latency YOLOv8 + LLM hints, human-gated; ref DeepMelt;
  match radio = Pocket + EP1/RP1." Owner's call — content is advisory-accurate as is.

## 4. Wiring gauges vs Engineering power verdicts — PASS with one known cross-file residual

- Page `Pages.tsx:316`: "Battery → link (**XT60** mains, **16 AWG** — XT30 is 30 A
  continuous, inadequate per 48 A pack path) → AM32 boards → PROPDRIVEs (18 AWG minimum
  on short motor leads)".
- Engineering `Engineering.tsx:159-162`: "Mains: **XT60 + 16 AWG** (XT30 is 30 A
  continuous — inadequate per pack path; 20 AWG fails, 18 AWG marginal short runs only).
  AM32 55 A per channel covers the 48 A motors". Verdict: page ≡ Engineering. PASS.
- "18 AWG minimum" (page) vs "18 AWG marginal short runs only" (Engineering): compatible
  (both permit 18 AWG only short). PASS, no change needed.
- Accel-mount numbers on page `:318` ("within ~20 mm of spin center (±400 g saturates
  past ~2800 RPM at 45 mm, ~3450 RPM at 30 mm)"): README says only "rigid near CG"
  (`README:15`); the numbers are Engineering-derived and arithmetically correct
  (a=ω²r: 2800 RPM/45 mm ≈ 394 g; 30 mm ceiling ≈ 3454 RPM; maxR(4000) = 22.4 mm).
  PASS. Optional (from audit 24): tighten to "within ~18 mm + pot" for margin — not required.
- RESIDUAL (cross-file, not a page-vs-Engineering mismatch): the trunk-vs-legs qualifier
  ("XT60 trunk mandatory; XT30 pack-leg pigtails joined at the harness are OK") appears
  nowhere on the page or in Engineering, while `BOM.md:33,35` + `02:11` +
  `content.ts:101,116,140-141` + Parts `Pages.tsx:228` still say "XT30/XT60 … 16–20 AWG" /
  "XT30" packs. That split was already flagged (audits 09 §G7/line 106, 24 §7/line 114)
  and is owned by the BOM/setup-docs agents. Suggested one-clause hardening of page
  `:316` (owner's call): "… (XT60 + 16 AWG trunk mandatory; XT30 only as short pack-leg
  pigtails at the parallel harness)". Page itself is NOT wrong vs Engineering — recorded
  here so the next gauntlet can close it.

## 5. `npm run lint` + `npm run build` in `web/` — PASS (ran myself)

- `npm run lint` (`oxlint`): exit 0. Only pre-existing warnings in unrelated files
  (`hooks.ts`, `HeroStage.tsx`, `CadViewer.tsx`, `Studio.tsx`, `Explorer.tsx`, `Bom.tsx`
  — set-state-in-effect / immutability / refs / fast-refresh notes). Zero warnings in
  `Pages.tsx`. No lint impact from firmware copy (static JSX strings).
- `npm run build` (`tsc -b && vite build`): exit 0. 589 modules transformed;
  `Pages-*.js` chunk 27.24 kB (gzip 8.50 kB). No type or build errors.
- Conclusion: firmware page ships clean; fixes in §1/§2-note/§3-notes are copy-only and
  carry zero build risk.

## 6. Fix list for the owner agent (READ-ONLY — no edits made)

Single-edit candidates, all in `web/src/pages/Pages.tsx` Firmware block (`:285-335`)
unless noted:
1. `:300` Drive cell → "AM32 55 A, DShot600 bidirectional at 8 kHz" (minor FAIL 1c).
2. `:316` wiring bullet → "Battery (2× 4S 550 mAh in parallel) → link (XT60 mains, 16 AWG …)
   → AM32 55 A boards → 2× PROPDRIVE v2 2836 1200KV hubmotors (82 g ea, 18 AWG min short
   leads)" (FAILs 1c/1e/1f). Optionally append trunk-vs-legs clause (§4 residual).
3. `:332` AI card → add "isolated BEC 5V/3A, Pi on TPU standoffs" (FAIL 1g); add literal
   "human-gated" + optional pit/DeepMelt sentence (§3 notes).
4. `:324` Tune card → prepend "cap 1500–2000 RPM, soft start, ESC current limit." (FAIL 1i).
5. `:298` table MCU cell → "Teensy 4.0 LOCK (no pins) at 600 MHz"; `:319` → "2 pairs,
   green = front" (trivial, §1a/§1h notes).
6. `:328` or `:311` → append "(no re-flash at event without full re-test)" (trivial, §2 note).
7. `firmware/README.md:13` (owner's call, not this scope) → mark SBUS as legacy fallback
   so README matches the locked ELRS-CRSF direction (§1d note).

## Verdict: NO-GO (copy-completeness gate; minor, fix-forward)

Failsafe (§D), advisory-only AI (§E/SPARC §6.4.3), wiring-vs-Engineering, and
lint+build are all PASS — nothing on the page is wrong or unsafe. The gate fails only
on four minor omissions in the Firmware card (55 A rating; PROPDRIVE 2836 1200KV model;
2× 4S 550 mAh parallel; BEC 5V/3A + TPU) plus missing tune-cap numbers
(1500–2000 RPM / soft start / current limit). All are one small edit (§6 items 1–4);
re-verify by diff, then flip to GO. Cross-file XT30/XT60-legs wording stays with the
BOM/setup-docs owners.
