# Gauntlet Round — Verification 57: fight_render.py Physics Fidelity
**Agent 7/10 · Scope:** `tools/fight_render.py` `simulate()`/`step()` vs `web/src/pages/Studio.tsx` `stepDrive()` + `RivalBot`; KO scripting honesty; determinism; `npm run lint` + `npm run build` sanity. READ-ONLY (no source edits).

## Skills applied (read from disk, independent recomputation)
- **`robotics-design-patterns`** — Pattern 4 perception-action loop timing, Pattern 3 FSM/simple-behavior reasoning, Pattern 7 sim-to-real (HAL: same-model-in-two-places must be diffed, not trusted by comment), Anti-pattern 2 (magic numbers must match by value, not prose).
- **`robotics-testing`** — Testing Pyramid (unit-level formula recomputation at the bottom), deterministic-replay rule (`set_seed`, fixed-step physics), golden-file regression thinking (constant-by-constant diff), failure-case testing (wall-grind, slow-roll, KO path).

## Claim under audit
`tools/fight_render.py:4-6` header: "Same flavor as Studio stepDrive"; `Studio.tsx:1496` caption: "scripted 22 s — same drive model as this page"; `Studio.tsx:1507-1509` copy: "deterministic seed … rival runs the repo's wobble policy, hits cost both bots 0.75× RPM".

## (1) step() vs stepDrive() — PARTIAL (core matches, wall model does not)
- **Taus — PASS.** `fight_render.py:24` `TAU_UP, TAU_DOWN = 0.9, 1.3` == `Studio.tsx:14-15`. Update `fight_render.py:91-93` `rpm += (target-rpm)*(1-exp(-dt/tau))` == `Studio.tsx:48-50` (modulo Studio's `dt` clamp `:47` and snap-to-target `<1 RPM` `:51`, both absent in video — negligible at DT=1/120).
- **Grip thresholds/exponent — PASS.** `fight_render.py:27` `1400/3100/2.8` == `Studio.tsx:20-22`; `grip()` `:43-45` == `Studio.tsx:52-55` exactly (clamp 0..1, pow 2.8).
- **K_ACCEL/K_DRAG — PASS with noted omission.** `fight_render.py:26` `6.5/4.5` == `Studio.tsx:17-18`; gate `g > 0.05` `:95` == `Studio.tsx:56`. OMIT: `K_BRAKE = 6.0` (`Studio.tsx:19`) and the `inp.brake` branch — video `step()` takes no brake input. Visually immaterial (nothing in the video ever brakes), but "same drive model" is strictly false.
- **Wall resolve — FAIL as "same", PASS as "same flavor".** Present and exact: `BOUNCE = 0.45` (`fight_render.py:28` == `Studio.tsx:27`), per-axis clamp at `lim = HALF-BOT_R` (`:99` == `:64`), tangent scrub `*= 0.85` (`:104,109` == `Studio.tsx:72,80`). OMITTED, both of them: (a) **min-rebound 2.5** (`Studio.tsx:73,81` `if |v|<2.5 → ±2.5`) — absent in `fight_render.py:100-109`; (b) **cooldown 0.12** (`Studio.tsx:67,74,82,84` `hitT`) — absent, video resolves every 1/120 s step. **Does it matter visually?** Yes, in one regime, no in the headline regime: high-speed slams look the same (rebound dominates, cooldown rarely binds mid-flight); slow rolls and wall-grinds diverge — Studio kicks sluggish bots off the wall at 2.5 u/s and suppresses machine-gun retrigger for 0.12 s, while the video lets bots scrub/stick with repeated `×0.85` tangent bleeds per step. A wall-grinding segment in the reel is therefore not what Studio would do.
- **Secondary omissions (visual-only, note):** spin uses raw `min((rpm·2π/60)·0.05, 8)·dt` (`fight_render.py:110`, re-integrated again from rpm in `render()` `:252-253`) vs Studio's smoothed `visOmega` (τ=0.3, `:85-88`) — teeth/LED lag differs slightly on spin-up; `throttleSm` (`:89`) and rpm snap are Studio-only HUD/visual details.
- **Collision split + 0.75× both bots — PASS on the claimed part.** Split `(BOT_R*2-dist)/2` each (`fight_render.py:132-135` == `Studio.tsx:203-205`), reflect `-(1+BOUNCE)·vn` gated on `vn<0` (`:136-139` == `:206-209`), `rpm *= 0.75` applied to **both** bots (`:141-142` == `:210`). EXTRA unclaimed video-only choreography (not in Studio, must be disclosed): damage/HP (`:144-147`, asymmetric `b.hp -= dmg; a.hp -= dmg*0.45` — Eyeliner shielded 55%), `closing/big/dmg` thresholds (`:140,143`), and the extra `±0.6` separation shove (`:151-152`, one-frame-one-hit spacer).

## (2) Rival policy vs RivalBot — FAIL as stated (4/5 faithful + 1 scripted cut)
- **Wall-avoid — PASS.** `lim = HALF-BOT_R-3`, center-seek + 0.6 strafe mix (`fight_render.py:70-75` == `Studio.tsx:178-181`, term-for-term including the `0.6` cross-mix and normalize).
- **Flee <1200 — PASS.** `if b.rpm < 1200: flee` (`fight_render.py:79-81` == `Studio.tsx:182-184`, same threshold, same normalize guard).
- **Lead 0.35 — PASS.** `foe.pos + foe.vel*0.35` (`fight_render.py:82` / eyeliner `:60` == `Studio.tsx:186`).
- **Wobble — PASS (phase offset disclosed here, not on page).** `sin(t*2)*0.3` orthogonal mix (`fight_render.py:48-49,85-86` == `Studio.tsx:190-191`). Video adds `+1.3` phase on the rival (`:85`) so the two scripted bots don't mirror — sensible, but not the repo policy verbatim.
- **Throttle-always — FAIL.** Studio hard-codes `throttle = true` (`Studio.tsx:194`). Video cuts the rival to `False` at `t > 17.5` (`fight_render.py:76-78`). The page copy (`Studio.tsx:1507-1509` "the rival runs the repo's wobble policy") does not mention this cut. That is the KO mechanism, not the wobble policy.

## (3) KO scripting honesty — FAIL (labeled "scripted", mechanism undisclosed)
- KO text fires at `t > 19.0` (`fight_render.py:322-325`) after the rival throttle-cut at 17.5 s (`:76-78`) plus asymmetric damage (`:146-147` Eyeliner takes 0.45×). Docstring `:7` says "KO at ~19 s" without saying how. Page says "scripted 22 s" (`Studio.tsx:1496`) and lists only the symmetric parts ("rival runs wobble policy, hits cost both 0.75×", `:1507-1509`) — the two thumbs on the scale (throttle-off, 0.45× damage shield) appear nowhere user-visible. "Scripted" covers choreography-in-general, not a rigged finish. One-line fix (not applied, READ-ONLY): append "rival throttle cut at 17.5 s + Eyeliner damage edge for the finale" to the `:1506-1510` paragraph.
- Eyeliner side (`eyeliner_intent()`, `:52-65`) is openly scripted (back off <2.5 s, lead+own wobble, victory cruise >18.5 s `:58-59`) — consistent with the "scripted" label, no foul.

## (4) Determinism — PASS
- Fixed seeds: `SEED = 7` (`:17`); physics uses fixed `DT = 1/120`, `DUR = 22.0`, `t += DT` stepping (`:20,157,124`) — no `time.*`, no `random`, no wall-clock in `simulate()`/`step()`. Spark-only `rng = default_rng(SEED+1)` (`:233`) is deterministic. Note: `simulate()` `:115` constructs `rng = default_rng(SEED)` and never uses it (dead line, harmless — physics is already deterministic via closed-form intents). Studio-side `clock.elapsedTime` (`Studio.tsx:190`) is wall-clock and non-replayable, but that non-determinism lives in the page's live rival, not in the video. Re-render is byte-stable modulo matplotlib/ffmpeg versions.

## (5) Lint + build sanity (run by this agent, 2026-09-18)
- `npm run lint` in `web/`: exit 0, warnings only (react set-state-in-effect / immutability / refs / exhaustive-deps across `Studio.tsx`, `CadViewer.tsx`, `Explorer.tsx`, `hooks.ts` — pre-existing, none from this audit since READ-ONLY, no files touched).
- `npm run build` in `web/`: PASS (`vite v8.3.0`, 589 modules, `Studio-BuXC-Vaf.js` 35.23 kB, done in ~2.2 s).

## Verdict table
| # | Claim | Verdict |
|---|---|---|
| 1a | Same taus | PASS |
| 1b | Same grip curve | PASS |
| 1c | Same K_ACCEL/K_DRAG | PASS (brake branch omitted, immaterial) |
| 1d | Same wall resolve (bounce/tangent/min-rebound/cooldown) | FAIL (omits min-rebound 2.5 + cooldown 0.12; matters on grinds, not slams) |
| 1e | Same collision split + 0.75× both | PASS (+ undisclosed asymmetric damage/separation) |
| 2 | Rival = repo policy (wall-avoid/flee/lead/wobble/throttle-always) | FAIL (throttle cut at 17.5 s contradicts throttle-always; +1.3 wobble phase undocumented) |
| 3 | KO honest ("scripted" caption suffices) | FAIL (mechanism undisclosed; fix = one sentence) |
| 4 | Deterministic | PASS |
| 5 | lint + build | PASS |

**Overall: NO-GO on the copy claim "same drive model" — relabel to "same flavor" (matching the script header) and disclose the 17.5 s throttle cut + damage edge; physics core itself is faithful.**
