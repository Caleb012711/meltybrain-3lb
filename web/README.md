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

| Assembly | Solids | GLB (viewer) | STL | STEP (download only) |
|---|---|---|---|---|
| Main CAD | 145 | main-cad.glb 2.2 MB | 6.8 MB | Main CAD.step 17.7 MB |
| Wheel Pod | 25 | wheel-pod.glb 1.3 MB | 3.7 MB | Wheel Pod.step 4.1 MB |
| Standard Weapon Teeth | 2 | 105 KB | 289 KB | 295 KB |
| Undercutter Config | 10 | 226 KB | 767 KB | 458 KB |

GLB keeps one node per solid so the hero viewer can explode the assembly.
Needs `OCP`, `trimesh`, `numpy`, `fast-simplification` (`pip install`).

## Pages

`/` long overview with hero viewer · `/build` 8 steps · `/onshape` export flow ·
`/pcbway` order pack · `/printing` unsliced guide · `/parts` locked BOM ·
`/firmware` Teensy plus advisory AI cameras.

Design: light mode only, pit-sheet aesthetic, IntersectionObserver reveals,
count-up spec strip, scroll progress bar, `prefers-reduced-motion` respected.
The old static prototype in `site/` is superseded by this app.
