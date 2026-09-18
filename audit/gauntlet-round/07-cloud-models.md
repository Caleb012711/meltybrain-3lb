# Gauntlet Round 07 — Cloud Models (T4) — Full Report

> Agent 7/10 (cloud-models). Scope: `autonomy/CLOUD.md` — model adapter, exact prompts,
> latency budget, degraded behavior, TTL/confidence, cost approach, log capture.
> Grounding: `audit/autonomy-plan-2026-09-18.md` §1 (T4 row + iron rules),
> `firmware/README.md` §E, `web/src/pages/Studio.tsx` RivalBot (lines 157–241),
> `build-guide/03-testing-and-driving.md` ladder. Docs/new files only — no code touched.

## 1. Skills: requested vs available

Task ordered: list skills via `skill` tool, then load `ros2-web-integration`,
`robot-perception`, `robotics-security`. Result: **the environment exposes exactly
one skill (`customize-opencode`)** — all three requested names return
`Skill "…" not found`. I proceeded on the plan documents plus first-hand reads of
the repo instead of inventing skill content. Mitigations applied per missing skill:

- *ros2-web-integration* → design uses its core pattern anyway: **plain HTTP/WS, no
  ROS required** (explicit in plan §5: "do NOT force ROS onto the Teensy"). T3 exposes
  `POST /api/hint/approve` + `WS /ws/hints`; cloud leg is outbound-only HTTPS.
- *robot-perception* → grounded the tick schema in the repo's actual perception
  contract: T3 overhead YOLO track (`track_conf`, `track_age_ms`, pixel→metre from
  4-corner calibration per plan §2) fused against the RivalBot lead formula.
- *robotics-security* → applied its principles explicitly in `CLOUD.md` §8:
  kill-switch isolation, e-stop separation, link-loss behavior, key hygiene,
  outbound-only posture, clamp-and-validate on every model byte.

No other agent's scope was assumed: `autonomy/` and `base/` were both EMPTY dirs;
this report creates the first file in `autonomy/` and references (but does not
create) `base/cloud/*` + `base/logs/*` so the base-station agent can implement
against a frozen contract.

## 2. What was verified in-repo (claim → source)

- T4 = "Cloud models, seconds, VLM strategy hints (human-gated until cleared),
  hints advisory-only, expire in 5 s" — plan §1 table, T4 row. Iron rules: "cloud
  NEVER drives (intents only, via T3); every intent carries a TTL" — plan §1 ¶2.
- T3 = "~5 Hz overhead-cam YOLO, link loss → T2 continues alone, T3 commands expire
  in 1 s" — plan §1 T3 row. T5 = "10 Hz intent, FULL AUTO … behind a compile flag +
  checklist … default ship = human-gated T4" — plan §1 T5 row.
- Pit/cloud reference: "pit-overhead camera YOLOv8 + LLM strategy hints + log review.
  Seconds-latency, human-gated — driver must approve" — `firmware/README.md` §E ¶3.
  Onboard Pi #1 = Pi Zero 2W + Pi Cam v3 Wide, UART 115200, 1080p-to-SD — §E ¶1–2.
- RivalBot fallback brain, exact values copied into the tick-knob table
  (`Studio.tsx` L176–193): wall-avoid outside `lim`; `rpm < 1200` → flee along
  `me.pos − foe.pos`; else `_aiLead = foe.pos + foe.vel × 0.35`, normalize, add
  perpendicular `sin(clock×2)×0.3`; collision splits penetration + `rpm ×= 0.75`
  (L195–209); grip `GRIP_LO/HI/EXP = 1400/3100/2.8`, `RPM_MAX 4000`, `MAX_SPEED 8.5`,
  `HALF 15, BOT_R 2.0` (L13–26). The tick schema's six knobs are exactly these
  constants made tunable within clamped ranges — the model can nudge but never
  invent a seventh control axis.
- Ladder restated in `build-guide/03` ("T3/T4 never drive") — consistent, no conflict.
- Constraints honored: "no cloud-vendor lock-in (any OpenAI/Anthropic-class VLM via
  one adapter)" — plan §6 → the single-`request_hint()` adapter + env-only config.

## 3. Key design decisions (and why)

1. **One abstract adapter, stdlib-only core.** `CloudModelAdapter.request_hint(
   system, user, timeout) -> str` is the sole integration point; vendor subclasses
   are <60-line shims; core uses `urllib` so no SDK/HTTP-client is ever pinned.
   Rationale: plan §6 forbids lock-in; a JSON-over-HTTPS seam outlives any provider.
2. **Closed 6-action enum mapped 1:1 onto RivalBot branches.** Prevents the classic
   VLM failure (inventing controls the executor doesn't have) and makes every hint
   executable by the deterministic fallback brain with zero new code paths.
3. **Exact prompt templates shipped verbatim** (system + tick JSON + reply schema),
   with the RivalBot `0.35 s` lead precomputed by T3 as `lead_now` so the model sees
   the baseline it is nudging. Uncertainty is handled INSIDE the prompt (rule 5:
   stale track → `NO_OP`, conf ≤ 0.3) as defense-in-depth under the T3 gate.
4. **TTL ≤ 5 s + confidence triage owned solely by T3** (accept ≥0.6 / dim 0.35–0.6,
   never auto-apply / drop <0.35; clamp-and-demote on range/arena violations; silence
   = dismissal, no auto-approve timers). Base clock is the time authority.
5. **Latency budget with p50/p95 per hop** totaling ~1.3 s / ~3.6 s — proving the 5 s
   TTL is tight but sufficient on a decent hotspot, and that p95-breach ⇒ drop is a
   normal, logged outcome rather than a failure.
6. **Degraded ladder LINK_OK → DEGRADED → T3-COAST (≤1 s, conf-decayed propagation)
   → T2-ALONE**, reusing the plan's 1 s T3-expiry and T2's ≤500 ms hold → safe-spin.
   Includes a mandatory hotspot-OFF rehearsal so the venue-night behavior is the
   rehearsed behavior.
7. **Cost as formula + log-driven estimator, zero hard-coded prices.** 60 calls/bout
   nominal (180 s / 3 s), ~1 k in / ~200 out tokens, `max_tokens=300`, thumbnail
   discipline (320px, ≤1 fps, never video) — keeps the bill bounded and measurable
   via one `cost.py` command per review.
8. **Append-only JSONL per match** (`tick/hint/decision/approve/link` events, fsync,
   no keys/headers) + 1 Hz thumbs + pointer to the Pi's 1080p SD video — satisfies
   firmware §E's "log review" as a concrete 5-minute ritual.

## 4. Interface contract for sibling agents (base-station implementer reads this)

- Implement `base/cloud/{adapter,prompts,gate,cost}.py` + `stub.json` per `CLOUD.md`
  §§1–2/5–6; `setup.sh` self-test must pass on `CLOUD_ADAPTER=stub` with no network.
- T3 owns: tick builder (§2a), TTL stamp, decision table (§5), approve/dismiss UI,
  JSONL writer (§7), coast/T2-alone transitions (§4). T2/T1 change NOTHING for T4.
- Security invariants: cloud path cannot assert kill/brake-override/RPM-cap/geofence;
  dashboard binds LAN-only; keys via env; replies >4 kB dropped; no `eval`.

## 5. Residual risks

- Venue uplink variance (budget hops 5+7) → p95 breach rate unknown until first event;
  mitigated by stub-rehearsal + backoff + "fight on T2-alone with zero shame" policy.
- VLM hallucination/confidence miscalibration → mitigated by closed enum, clamps,
  dim/drop bands, and the human gate; T5 auto-apply additionally gated on track
  freshness + T1 veto + TRC letter.
- Prompt-injection via thumbnails/track text → mitigated by numeric-only crossing
  (six knobs), size caps, no `eval`, raw-bytes never forwarded past T3.
- Missing-skills gap: no repo-local perception/bringup/security skill bodies exist;
  the YOLOv8n p50/p95 figures are reference-laptop estimates and MUST be remeasured
  by the base-station agent on the actual pit laptop during `setup.sh` calibration.
- Cost drift as providers reprice → mitigated by never pinning prices; re-run
  `cost.py` each event.

## 6. Verdict

- **T4 human-gated (this design): GO** — advisory-only, TTL/confidence-gated, secure,
  vendor-neutral, fully specified down to verbatim prompts and log lines.
- **T5 full-auto: NO-GO in this round** — correctly left behind the compile flag +
  TRC pre-clear letter per plan §1; the auto-apply row (§5 rule 8) is specified but
  MUST NOT build without both.
- Done criteria touched: `autonomy/` seeded with a beginner-followable README-grade
  doc; `npm run lint/build` unaffected (no code); BOM/site/firmware consistency
  untouched (no mass/power/part changes implied — Pi + laptop already in §E).

## 7. Files written

- `autonomy/CLOUD.md` (new — the durable T4 contract).
- `audit/gauntlet-round/07-cloud-models.md` (new — this report).
