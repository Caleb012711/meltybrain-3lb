# Bambu plan for ordinary printed accessories

Decision record, 2026-09-28. The user selected the Bambu printer family; the
specific machine has not been purchased or identified. Existing CAD components
remain the dimensional baseline. This plan covers ordinary non-weapon
electronics enclosures, fit prototypes, and flexible desk accessories.

| Purpose | Starting choice | Why |
| --- | --- | --- |
| Dimensional fit prototype | PLA Basic | Accessible starting material for checking clearances and connector openings. |
| Everyday rigid electronics case | PETG HF | A practical starting choice for toughness after the prototype fits. |
| Soft feet or grip pads | TPU 95A HF | Use when flexibility is a functional requirement. |

These are engineering starting choices, not certification of a finished part.
Use the exact printer, nozzle, plate, and filament profiles in Bambu Studio.
Dry the filament according to its manufacturer's instructions. Do not assume
that a high infill percentage alone establishes strength.

The normal AMS HT filament feed does not support TPU 95A. Plan on an external
spool and check the chosen printer's feed path. TPU for AMS is a different
material from TPU 95A HF. Carbon-filled nylon is not a default purchase for
these ordinary accessories; a demonstrated requirement should justify its
additional printing and hardware demands.

## Cost calculation

Use the slicer's total filament mass, including supports and purge:

`filament cost = print mass (g) × spool price / net filament mass per spool (g)`

Example only: 30 g × $25 / 1000 g = $0.75. This is not a live price quote and
excludes electricity, failed prints, shipping, and hardware. CAD solid volume
is not the filament consumption of a hollow or infilled print.

## Open decisions and release status

- No verified individual print files are currently released. See
  [the CAD audit](../audit/nonweapon-print-readiness.md).
- The CAD and BOM name different electronics; match the actual component
  before preparing an enclosure.
- A physical fit prototype is still required before calling a part ready for use.
- Titanium wheels were suggested by the user. This remains an unconfirmed
  preference; no wheel material selection, structural calculation, or
  fabrication specification is issued by this accessory plan.
- Project LiftOff is a historical reference. Its record does not establish
  that this repository is an equivalent or verified design.

## Sources checked

- [Bambu filament guide](https://bambulab.com/en/filament-guide)
- [Bambu PETG HF](https://us.store.bambulab.com/collections/bambu-lab-3d-printer-filament/products/petg-hf)
- [Bambu AMS HT compatibility](https://cdn1.bambulab.com/documentation/h2d/en/AMS_HT_20250109.pdf)
- [Project LiftOff history at NHRL](https://wiki.nhrl.io/wiki/index.php?title=Project_LiftOff)
