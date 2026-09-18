# Gauntlet Round 55 — Nav 10-item + A11y Re-verify

Skills: `robotics-testing` (/workspaces/meltybrain-3lb/.opencode/skills/robotics-testing/SKILL.md), `robotics-software-principles` (/workspaces/meltybrain-3lb/.opencode/skills/robotics-software-principles/SKILL.md). Note: prompt path `web/.opencode/...` wrong; actual root `.opencode/...`.

1. Pill bar 10 links — PASS. `src/data/content.ts:4-15` 10 entries (`grep -c "to: '/"` = 10); `src/components/Layout.tsx:63-69` maps all; `src/App.tsx:39` `/parts` route kept, no nav entry, zero `parts` refs in nav/Layout/Sidebar — orphan route, no crash.
2. Scroll+mask + active-pill — PASS. `src/index.css:65` `overflow-x:auto` + `mask-image` intact; `:66` scrollbar hidden; `:67` pill style; `:69` `.active` ink pill. NavLink `src/components/Layout.tsx:65` `isActive?'active'`; `end` only for `/`. `/parts` → no pill active (correct NavLink behavior), drawer same `src/components/Sidebar.tsx:116-120`.
3. Keyboard — PASS. Tab order `Layout.tsx:55-63` hamburger → brand → pills (DOM order); drawer trap `Sidebar.tsx:53-72`, Esc+focus-return `:54-57`, `tabIndex={open?0:-1}` `:110,121`. `focus-visible` global `index.css:42` covers pills (no pill-specific override needed). `aria-current="page"` automatic via NavLink default (`node_modules/react-router/.../chunk-OB3PAWPO.mjs:10681,10734`; relied on at `Layout.tsx:65`, `Sidebar.tsx:116`).
4. 360px — PASS. `index.css:207` pills hidden ≤900px → hamburger path; `index.css:174-180` hamburger always rendered `Layout.tsx:56`; drawer `index.css:189-194` `min(320px,88vw)` fits 360px; brand ellipsis `index.css:129` (`nowrap/hidden/ellipsis`, img hidden).
5. Touch targets ≥44px — PASS. `index.css:67` nav pills `min-height:44px`; `:175` hamburger 44×44; `:199` drawer-close 44×44; `:201` drawer-link `min-height:44px`.
6. lint+build — PASS. `npm run lint` exit 0 (warnings only, no errors); `npm run build` exit 0 (tsc + vite 3.63s, 589 modules).

Verdict: GO. `/parts` with no active pill is acceptable — no crash, no mis-highlight.
