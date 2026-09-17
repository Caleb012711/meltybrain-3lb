# Eyeliner build site (React + Vite)

The full build guide as a light-mode site. Hero loads the **actual CAD** as
converted GLB meshes; every STEP is linked for download.

## Run it

```bash
cd web
npm install
npm run dev      # edit with hot reload
npm run build    # type-check + emit dist/
npm run preview  # serve dist/ locally to verify
```

Hash routing is used on purpose so `dist/index.html` works from any static
host with no rewrite rules.

## Real CAD pipeline

Root STEP files are converted offline to viewer meshes — never rendered as raw
STEP in the browser:

```bash
# from repo root
python3 tools/cad_convert.py --all --out web/public/cad --manifest
```

Outputs per assembly (`web/public/cad/`):

| Assembly | Solids | GLB (viewer) | STL (reference) | STEP (download only) |
|---|---|---|---|---|
| Main CAD | 145 (96 meshed) | main-cad.glb 4.0 MB | 13 MB | Main CAD.step 17.7 MB |
| Wheel Pod | 25 (16 meshed) | wheel-pod.glb 2.2 MB | 6.3 MB | Wheel Pod.step 4.1 MB |
| Standard Weapon Teeth | 2 | 105→439 KB | 1.2 MB | 295 KB |
| Undercutter Config | 10 | 226→553 KB | 1.9 MB | 458 KB |

GLB keeps one node per solid (`solid_NNN`, original indices) so the viewer can
explode the assembly. Thread-speck degenerates (`faces < 8` and `vol < 0.005 cm³`)
are dropped from the GLB only — flagged `dropped_from_glb` in `*.parts.json` —
while STL, manifest, and mass stats keep every solid. Roles
(`weapon-steel`, `chassis-alu`, `pod-metal`, `fastener-dark`, `shell-tpu`,
`electro-green`) are a volume-plus-bbox heuristic, labeled as such in the UI.
Viewer materials render `DoubleSide` so thin sheet solids never cull to slivers.
Needs `OCP`, `trimesh`, `numpy`, `fast-simplification` (`pip install`).

## Pages

`/` long overview with scroll-driven hero (bot rolls over the headline) and
systems-stack showcase · `/explorer` part-level 3D with isolate/hide/downloads ·
`/build` 8 steps · `/onshape` export flow · `/pcbway` order pack · `/printing`
unsliced guide · `/parts` locked BOM · `/bom` costed BOM + weights ·
`/firmware` Teensy plus advisory AI cameras.

Design: light mode only, pit-sheet aesthetic, IntersectionObserver reveals,
count-up spec strip, scroll progress bar, `prefers-reduced-motion` respected.
The old static prototype in `site/` is superseded by this app.
