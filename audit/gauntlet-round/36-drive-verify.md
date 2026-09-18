# Gauntlet Round 2 — Verification 36: Studio Drive Sim
**Agent 6/10 · Scope:** `web/src/pages/Studio.tsx` drive mode only —
`stepDrive`, `DriveBot`, `RivalBot`, `DriveCam`, `DriveTrail`, `DriveArena`, HUD/readout/controls.
**Recent-change context:** `REST_Y=0.56`, LED `[1.1,0,0.2]` r=`0.13`, rival role paint.
**Result of `npm run lint`:** exit 0 (warnings only). **`npm run build`:** PASS (`tsc -b` + vite, Studio chunk built).

## Skills applied (read from disk at `/workspaces/meltybrain-3lb/.opencode/skills/…`)
- **`robotics-design-patterns`** — control-loop/FSM thinking: Pattern 4 perception-action loop timing
  ("controller frequency > planner > sensor"; control loop must never be blocked — Anti-pattern 7),
  Pattern 3 FSM (simple sequential behaviors with clear states/fail-safe transitions),
  Pattern 6 safety hierarchy + software watchdog (comm-loss → safe stop).
- **`robotics-software-principles` Principle 6 (Separation of Rates)** — subsystems at different rates
  must couple via buffers/refs, never by blocking call.
- **`robotics-software-principles` Principle 7 (Fail-Safe Defaults)** — no input / invalid input /
  lost focus → stop safely, not continue blindly; disarm paths traced as safe-stop equivalents.

## (1) stepDrive math — PASS
- **tau up/down — PASS** (`Studio.tsx:48-51`). `target = throttle ? 4000 : 0`, `tau = throttle ? 0.9 : 1.3`
  (`TAU_UP`/`TAU_DOWN`, `Studio.tsx:14-15`), exponential approach `(1-exp(-d/tau))`, `dt` clamped to 1/30
  (`:47`), snap-to-target within 1 RPM (`:51`). Spin-up visibly faster than spin-down, as intended.
- **Grip curve vs on-screen copy — PASS, exact match** (`:20-22`, `:52-55` vs `:1171-1176`).
  Code: `pow(clamp((rpm-1400)/(3100-1400)), 2.8)` → exactly 0 at/below 1400, exactly 1 at/above 3100.
  Copy: *"under ~1400 RPM this sim gives zero authority, ramping to full past ~3100"* — matches modulo `~`.
  HUD recomputation (`:734-735`) duplicates the formula exactly. Note: `grip > 0.05` gate (`:56`) selects
  `K_ACCEL`, else `K_DRAG`; 5% authority ≈ 1983 RPM, so 1400–1983 RPM behaves as drag — consistent with "ramping", no fix.
- **Wall resolve + min rebound + cooldown — PASS** (`:64-84`). `lim = HALF-BOT_R = 13` agrees with arena
  visuals (`DriveArena` walls `:373-377` centered ±15.2, width 0.4 → inner face exactly 15.0 = 13+2, bot edge
  kisses the wall). Per-axis clamp, `vel *= -BOUNCE` (0.45), tangent `*= 0.85` scrub, min rebound 2.5 inward
  (`:73`,`:81`, sign-correct), `hitT = 0.12` cooldown (`:74`,`:82`).
  - OBS-1 (cosmetic): early return `:67` skips `visOmega`/`spinAngle`/`throttleSm` integration during cooldown —
    spin visual freezes ~0.12 s after a hit. Fix (optional): move `:85-89` above the cooldown return.
- **Collision split + 0.75× RPM both bots — PASS** (`:198-211`). Penetration split equally (`push=(minD-d)/2`,
  `:203-205`), reflection verified algebraically for both signs (`:206-209`: foe uses `sgn=-1`, expanding to
  `v-(1+e)(v·n)n` — identical to the correct mirror about `-n`), `rpm *= 0.75` inside the pair loop hits both
  (`:210`). `d > 1e-4` guard avoids NaN; exact `d == 0` skips — negligible.
  - Note: RPM cut applies on any contact frame even when separating (velocity fix correctly gated on `vn < 0`,
    RPM cut not) — reads as intended "contact scrubs spin", arcade-acceptable.

## (2) Disarm matrix (Principle 7) — PASS
`disarm()` (`:672-685`) is comprehensive: `armed=false`, keys cleared, `move=(0,0)`, both throttle latches false,
`throttle=false`, `brake=false`, `brakeUi=false`, `joy=null`, stick + touch-throttle UI reset, SR "Stopped".
- **Esc — PASS.** Viewport `onKeyDown` `:791-795` → `disarm()` + `blur()` → `onBlur` → `disarm()` (idempotent).
  Window-level handler (`:702-710`) intentionally does *not* disarm (closes help / dismisses tour only) — safe
  because opening help steals focus, firing viewport `onBlur → disarm` first. No live-input path survives Esc.
- **blur — PASS.** Window `blur → disarm` (`:711`,`:716`) and viewport `onBlur → disarm` (`:978`).
- **hidden-tab — PASS.** `visibilitychange → hidden → disarm` (`:712-714`,`:717`); no auto re-arm on return.
- **focus-loss — PASS.** Viewport `onBlur` (`:978`); keyup-after-disarm stays safe (`:815-831`, shift release
  re-syncs throttle to false; cleared keys require re-press — fail-safe default).
- **Brake semantics — PASS.** `:56-60`: exponential approach to `tv` (0 with no move intent), factor
  `(1-exp(-k·d)) < 1` so no overshoot/sign-flip; comment `:61` documents approach-to-zero.
  - OBS-2 (docs): `K_BRAKE 6.0 < K_ACCEL 6.5`, so holding a direction + brake converges marginally *slower*
    than no-brake; brake only bites when move intent is zero. Either raise `K_BRAKE` above `K_ACCEL` or keep the
    `:61` comment as the spec. Not blocking. Brake also (correctly, melty-model) does not cut RPM.
- **Reset restores BOTH bots — PASS** (`:687-699`): loops `[state, rival]`, resets pos (player `(0,0)`,
  rival `(8,8)`), vel, rpm, spinAngle, throttleSm, visOmega, hitT. Inputs intentionally untouched.

## (3) DriveCam / HUD — PASS
- **Chase math — PASS** (`:262-270`): sits 7.5 behind velocity, falls back to last heading at rest (`sp > 1`
  gate `:264`), height `2.6-min(0.6, sp*0.08)`, clamped to ±(HALF+0.5).
- **Min-distance guard — PASS** (`:272-278`): pushes camera out to 4 units — never inside the bot.
- **Top-cam — PASS** (`:259-260`,`:287-293`): `(x,40,z+0.01)`, snapped, looks at `(x,0,z)`, FOV forced 42.
- **FOV kick — PASS** (`:279-285`): `42+min(10, sp/MAX*10)`, 0.1/frame lerp + `updateProjectionMatrix()`;
  reset path `:290-293` for reduced/top.
- **HUD 10 Hz + SR — PASS** (`:727-765`): `setInterval(100ms)`; SR gated on `armed`, >4000 ms, deduped
  (`lastSr`), classes Stopped / Spinning up / Full grip / Gripping + brake suffix — matches "~4 s" spec.
- **Principle 6 rates — PASS:** physics runs in `useFrame` (render-coupled, dt-clamped — arcade-acceptable, no
  fixed-step accumulator but error bounded); HUD (`:731`) and spin-audio (`:542`) poll shared refs on 100 ms
  intervals. Slow consumers never block the fast loop.

## (4) Rival AI — PASS
- **Branches sane — PASS** (`:178-193`): wall-avoid band `lim = 10` steers inward early; `rpm < 1200` flees away
  from foe (spin-up retreat); otherwise 0.35 s velocity-lead pursuit + `sin(2t)*0.3` strafe wobble. All moves
  normalized with `lengthSq` guards.
- **Throttle always true (`:194`, brake false `:195`) — PASS by design:** arcade sparring partner, constant
  spin-up; rival exposes no disarm surface (AI-owned input ref). Flagged as intentional, not a defect.
- **Collision pair loop — PASS** (algebra verified in §1).

## (5) Lint + build (run by this agent)
- `npm run lint`: exit 0. Warnings only; pre-existing `Studio.tsx:318-321` (render-phase `gen` reset) and
  `:359/:363` immutability notes on `DriveTrail` are outside drive-sim behavior — no action.
- `npm run build`: PASS — `tsc -b` clean, vite emitted `Studio-S0LzypoY.js` (34.15 kB).

## Recent changes confirmed on disk
- `REST_Y = 0.56` (`:26`, rationale comment `:25`), used consistently `:115`,`:213` (+ initial groups `:122`,`:217`).
- LED `position={[1.1, 0, 0.2]}` + `sphereGeometry r=0.13` (`:142-143`, cue comment `:140-141`) — exact match.
- Rival role paint: `colorMode="role"` (`:227`, same as player `:132`) differentiated by red ring (`:238-241`) —
  confirm this (vs distinct rival paint) is the intended look.

## Verdict: GO
No blocking defects. Non-blocking: OBS-1 spin-freeze during wall cooldown (`:67` vs `:85-89` ordering);
OBS-2 `K_BRAKE < K_ACCEL` docs-vs-value (`:19` vs `:61`); rival ring-only differentiation (`:227` vs `:238-241`).
Suggested fixes are one-liners, safe to defer.
