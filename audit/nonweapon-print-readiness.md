# Non-weapon CAD and print readiness

Reviewed 2026-09-28 against repository commit `dec56d2` and the restored local files.

**Status: not ready for a manufacturing release.** This is a source-file and
documentation audit, not a geometry, strength, electrical, or physical-fit certification.
Scope: ordinary electronics enclosures and other non-weapon accessories.

## Baseline

Use the existing root `Main CAD.step` as the dimensional reference, following
the request to build on the existing parts. Do not silently substitute the
different components listed in `BOM.md`.

- STEP product label: `Main CAD v29`.
- Export header timestamp: `2026-06-02T11:25:02-07:00`.
- SHA-256: `6ef8e559608ab10c1c77ae6c8206081db6deea8d553960bb906b317635392106`.
- The restored `cad/Main CAD.step` has the same SHA-256.
- There are 84 STEP PRODUCT records. This is not a count of unique physical parts.
- Length-unit records include both metres and millimetres. A CAD importer must
  resolve their representation contexts; do not globally scale the text or
  assume every record uses millimetres.

## Verified gaps

| Finding | Evidence | Consequence |
| --- | --- | --- |
| No individual print exports | `3d-printing/stl/` contains a README only; no STL, 3MF, or STEP exports | There is currently no released printable-part set in that folder. |
| Viewer STL represents an assembly | `web/public/cad/main-cad.parts.json` has 145 entries; the manifest describes 145 solids | The viewer assembly is not an individual printable enclosure. |
| Viewer material labels are inferred | `assign_role()` in `tools/cad_convert.py` guesses from volume, bounding box, and face count | A `shell-tpu` label does not establish the physical part's identity or material. |
| Hardware schedule is incomplete | `BOM.md` leaves screw lengths as `TODO measure` and vendor/SKU fields unfilled | Enclosure fasteners cannot yet be released as a verified shopping list. |
| Exact printer and filament still pending | Bambu family selected; model and spool not yet confirmed | No machine-specific G-code or validated process settings can be issued. See the [Bambu accessory plan](../3d-printing/BAMBU-ACCESSORIES.md). |

The binary viewer STL contains 206,478 triangles and its byte length agrees
with its binary header. This checks file structure only: it does **not** establish
watertightness, correct orientation, clearances, or printability.

## Electronics identity conflicts

These are names found in the source STEP, compared with the repository's BOM.
Names establish an identity conflict; they do not independently verify the
dimensions or accuracy of a vendor model.

| Function | Existing STEP labels | `BOM.md` selection |
| --- | --- | --- |
| Controller | `XIAO-ESP32S3`, `Seeed Studio XIAO-ESP32-S3 (Sense)` | Teensy 4.0 |
| Receiver | `Receptor FS2A mini` | ELRS EP1/RP1 |
| Sensor | `ITG-MPU`, `Adafruit ADXL375 1` | H3LIS331DL |
| ESC | `readytosky 35A esc`, `AM32 35A Single ESC v1` | AM32 55A 4-in-1 |

Any new standalone electronics enclosure must identify the exact source
component it fits. Substituting the BOM component requires its own dimensions,
connector access, and fit verification. A component label such as `Shield` or
`PlasticHousing` can belong to a purchased electronic component and does not
by itself identify a part to 3D print.

## Evidence needed for an individual enclosure release

1. Identify the enclosure body and the exact component it holds; specify its
   revision, quantity, material, and matching fasteners.
2. Check the solid with a CAD kernel and verify the exported mesh independently
   for closed surfaces, degenerate faces, normals, and scale.
3. Measure connector access, mounting holes, screw engagement, and mating
   clearances against the identified component, recording any assumptions.
4. Export one clearly named part per file with stated units and print orientation.
5. Slice for the actual printer/material and verify a physical fit prototype
   before marking it ready for use.

No geometry was redesigned or certified during this audit. No weapon fabrication
files are included in this scope.
