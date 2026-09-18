# Gauntlet Round-2 Verification — Explorer page (agent 7/10)

Scope: `src/pages/Explorer.tsx` + `src/components/materials.ts`
(consumes `src/components/CadViewer.tsx`: `useModelParts`, `ExplodingModel`, `ViewerLights`, `FocusRig`).
Recent changes under review: leveler wrapper, `ViewerLights`, `ROLE_CSS` legend dots matched to `ROLE_PARAMS`.

Skills applied (read from disk at `/workspaces/meltybrain-3lb/.opencode/skills/`):
- `robotics-software-principles/SKILL.md` — Liskov/interface thinking applied to the three color
  modes (`role`/`index`/`plain`): every mode must be substitutable at the material-assignment
  site with no caller-side branching beyond the single `matForIndex`/clone select, plus
  fail-safe defaults (unknown role → `fastener-dark`, empty manifest → skeleton, GL failure → fallback).
- `robotics-testing/SKILL.md` — pyramid discipline: deterministic hand-recomputation at the unit
  level (mass arithmetic, CSS-vs-param equality, positional index audit over all 4 manifests),
  integration-level tracing (parts pipeline → lookup → render/visibility paths), and live
  `npm run lint` + `npm run build` as the regression gate. No `sleep()`-style async claims;
  the `live`-flag guard in `useModelParts` was inspected directly.

Method: read `Explorer.tsx` (482 lines), `materials.ts` (83 lines), `CadViewer.tsx` (749 lines)
from disk; audited all four `public/cad/*.parts.json` manifests with Python; ran `npm run lint`
(exit 0) and `npm run build` (success) myself on 2026-09-18.

## 1. Parts pipeline — PASS

- `useModelParts(modelId)` (`CadViewer.tsx:73-85`) fetches `<glb-basename>.parts.json`, caches per
  model, guards the cross-model race with a `live` flag. Fail-safe default: fetch failure → `[]`,
  and Explorer renders 8 skeleton rows (`Explorer.tsx:355-360`) — Principle 7 satisfied.
- Manifest audit (recomputed, all four files): `main-cad.parts.json` = **145 entries, 56 dropped** —
  claim confirmed. `wheel-pod` = 25 entries / 11 dropped; `teeth` = 2/0; `undercutter` = 10/0.
- Positional integrity: **zero mismatches** in all four manifests between array position `i` and
  `node == solid_{i:03d}`. So `parts[i]` lookup by parsed index is sound.
- Index authority: `ExplodingModel` parses the original index from the ancestor `solid_NNN` node
  name (`CadViewer.tsx:209-221`), explicitly NOT from mesh enumeration order; comment at
  `CadViewer.tsx:119-120` and `:213-215` documents why (dropped-from-GLB gaps would collide
  `solid_120` vs `solid_24` under mesh-count sizing). `indexMats` is keyed by original idx
  (`CadViewer.tsx:185-199`), sized lazily — correct under gaps.
- Dropped indices never render: dropped solids have no GLB mesh, so no scene object ever carries
  their `partIndex`; the traverse loops (`CadViewer.tsx:280-287`, `:291-312`) only visit live
  meshes. Dropped rows still appear in the list with `partLabel` stats — intended stats-only path.
- Dropped indices never corrupt lookup: role application reads `parts[idx]?.role ?? 'fastener-dark'`
  (`CadViewer.tsx:270`); `roleOf` in `Explorer.tsx:12-14` does the same. A dropped idx in `parts`
  only affects its own slot; live meshes never resolve to a dropped slot because their idx comes
  from their own node name. `roleMaterial` (`materials.ts:43-53`) further coerces any unknown role
  string to `fastener-dark`. No corruption path found.
- Per-index behavior (all keyed by original idx, all PASS):
  - hidden: `o.visible = !hidden.has(idx) && ...` (`CadViewer.tsx:285`); `toggleHide` guards
    dropped (`Explorer.tsx:84-92`); eye button disabled + titled for dropped (`Explorer.tsx:403-412`).
  - isolated: same line; `isolatePart` guards dropped (`Explorer.tsx:94-97`); readout
    Isolate/Hide buttons disabled for dropped (`Explorer.tsx:454-463`); status line + Exit-isolate
    path (`Explorer.tsx:273-284`).
  - selected/hovered: emissive highlight `0.45`/`0.22` in the material effect (`CadViewer.tsx:310`);
    list↔3D sync via `onSelect`/`onHover`, cursor pointer, scroll-into-view (`Explorer.tsx:52-56`).
    Selecting a dropped row is allowed from the list (shows "stats only" readout,
    `Explorer.tsx:440`) but unreachable by 3D picking — coherent, no crash (lookup guards `?? null`,
    `Explorer.tsx:112`).
  - exploded view: `o.position = pos + dir * explode * 2.6` (`CadViewer.tsx:284`); positions come
    from the per-mesh `base` map recorded at mount, visibility handled in the same pass — explode
    composes correctly with hidden/isolated (no allocs per tick per comment `:277`).
- Recent-change checks: leveler wrapper `<group rotation={[-PI/2,0,0]}>` present
  (`Explorer.tsx:159`); `<ViewerLights />` mounted inside Canvas (`Explorer.tsx:155`).

## 2. Legend honesty — PASS

- "Heuristic" labeling present in four places: lede (`Explorer.tsx:121-126`, "Roles are a size
  heuristic … tiny hardware all reads as fasteners"), color-mode option "By heuristic role"
  (`Explorer.tsx:235`), legend group `aria-label="Heuristic material roles, verify in CAD"` +
  caption "Heuristic roles from size — verify alloy in CAD, not measured" (`Explorer.tsx:285-288`),
  readout stamp `{role} · heuristic` (`Explorer.tsx:439`). `CadViewer.tsx:736` status also says
  "heuristic roles". Honest, no overclaim of measured alloy.
- `ROLE_CSS` dots == rendered colors: recomputed all six pairs from disk —
  `weapon-steel #3b4046`, `chassis-alu #c9ced4`, `pod-metal #a49d92`,
  `fastener-dark #2e3237`, `shell-tpu #33404e`, `electro-green #0f6a3a` — **6/6 MATCH** between
  `ROLE_CSS` (`materials.ts:20-27`) and `ROLE_PARAMS.color` (`materials.ts:32-39`). Legend dots
  (`Explorer.tsx:291`) and list dots (`Explorer.tsx:395`, with `?? '#999'` fallback) use `ROLE_CSS`
  directly; meshes use `roleMaterial()` clones fed from `ROLE_PARAMS` (`CadViewer.tsx:270-274`,
  `materials.ts:43-53`). Single-source hues, no drift.
- Liskov/color-mode note (principles skill P5): the material effect (`CadViewer.tsx:290-312`)
  substitutes `role` clone / `matForIndex(idx, n)` / `plain` clone behind one `o.material`
  assignment; xray overrides uniformly, `wireframe` + emissive apply to whichever material wins.
  No caller branches on mode outside that site. PASS — modes are substitutable implementations.

## 3. Mass labels — PASS (4 hand recomputes)

`massLabel` (`materials.ts:75-83`): densities steel 7.85 / Ti 4.43 / alu 2.7 / TPU 1.21, `.toFixed(1)`.
- weapon-steel, vol 27.815 (`solid_000`): 27.815×7.85 = 218.347 → **218.3 g steel** ✓;
  27.815×4.43 = 123.220 → **123.2 g Ti** ✓. Matches the `27.815→218.3/123.2` claim.
- fastener-dark, vol 0.001 (27 entries, e.g. `solid_003/004/008`): 0.001×7.85 = 0.00785 → **0.0 g** ✓.
  (Smallest manifest vol is actually 0.0 at `solid_002` → 0.0 g; the 0.001→0.0 claim holds either way.)
- chassis-alu, vol 32.668 (`solid_078`): 32.668×2.7 = 88.2036 → **88.2 g alu** ✓.
- shell-tpu spot check, vol 80.134 (`solid_080`): 80.134×1.21 = 96.96 → "97.0 g TPU" per formula ✓
  (rendered via same code path `Explorer.tsx:445` / `partLabel` `materials.ts:68-71`).

## 4. Model switching / search+filters / empty path — CONDITIONAL PASS (one gap, minor)

- Model ids `full`/`pod`/`teeth`/`undercutter` confirmed in `src/data/content.ts:31-50`; tab bar
  renders all four (`Explorer.tsx:201-214`).
- On `modelId` change the effect (`Explorer.tsx:37-46`) resets: selected, focusIdx, homeKey(+1),
  hidden (new Set), isolated, query, roleFilter, failed. **NOT reset: `explode`, `wireframe`,
  `xray`, `colorMode`, `spin`.** So "resets all state" is overstated — view prefs persist across
  models. This is arguably intentional (keeps the user's chosen lens), and nothing stale can
  corrupt: selection/hidden/isolated (the index-scoped states) ARE cleared, so a `solid_120`
  selection from full-assembly can never leak into the 2-part teeth model. But strict
  "resets all state" → **PARTIAL**. Fix (only if product wants full reset): add
  `setExplode(0); setWireframe(false); setXray(false);` (keep `colorMode`/`spin` as global prefs)
  to the `modelId` effect, matching the manual `reset()` at `Explorer.tsx:99-110`. READ-ONLY —
  not applied.
- Search+filters: `entries` memo (`Explorer.tsx:64-76`) ANDs role filter + case-insensitive
  substring over `# / role / bbox-dims / vol`. `rolesPresent` (`Explorer.tsx:78-82`) populates the
  filter dropdown; count line `{entries.length}/{count} shown` (`Explorer.tsx:350-352`). PASS.
  Nit (non-blocking): haystack omits node string (redundant — equals index), mass label and faces;
  searching "218.3" or "solid_003" won't hit. Consider appending `p.node` + `massLabel` to `hay`.
- Empty-result path: `parts.length > 0 && entries.length === 0` renders "No parts match … Clear
  the search or role filter." + Clear-filters button resetting both (`Explorer.tsx:417-433`). PASS.
  Nit: message interpolates only `{query}`; a role-only dead end (only reachable combined with a
  query, since every dropdown option comes from `rolesPresent`) would show empty quotes. Cosmetic.

## 5. Lint + build — PASS

- `npm run lint` (oxlint): **exit 0**. Only warnings repo-wide; Explorer-scoped ones are
  pre-existing style/compiler notes (`only-export-components` for `preloadExplorer`,
  `preserve-manual-memoization`, `set-state-in-effect` on the reset effects) — no errors.
- `npm run build` (`tsc -b && vite build`): **success** in ~1.3 s, 589 modules, Explorer chunk
  `Explorer--zub2vXn.js` 10.99 kB emitted. No type errors.

## Verdict: GO

All load-bearing behavior verified: 145/56 pipeline with positional index integrity, dropped
exclusion without lookup corruption, per-index hidden/isolated/selected/hovered + explode, honest
heuristic legend with 6/6 dot-vs-render matches, mass math reproduced by hand, lint exit 0, build
green. Single partial: model switch preserves view prefs (`explode`/`wireframe`/`xray`/`colorMode`,
`Explorer.tsx:37-46` vs full `reset()` at `:99-110`) — safe by construction (index-scoped state is
cleared) but misdescribed as "resets all state". No source edits made (READ-ONLY).
