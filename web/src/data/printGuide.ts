/** Audit snapshot; component names come from STEP PRODUCT records, not mesh colors. */
export const printAudit = {
  date: 'September 28, 2026',
  source: 'Main CAD v29',
  releasedParts: 0,
  sourceHash: '6ef8e559608ab10c1c77ae6c8206081db6deea8d553960bb906b317635392106',
};

export const componentConflicts = [
  { role: 'Controller', cad: 'XIAO ESP32-S3', proposed: 'Teensy 4.0' },
  { role: 'Receiver', cad: 'FS2A mini', proposed: 'ELRS EP1 / RP1' },
  { role: 'Sensor', cad: 'ITG-MPU / ADXL375', proposed: 'H3LIS331DL' },
  { role: 'ESC', cad: 'AM32 35A single', proposed: 'AM32 55A 4-in-1' },
];

export const materialChoices = [
  {
    id: 'prototype', label: 'Check the fit', material: 'PLA Basic', tag: 'Start here',
    use: 'First drafts and dimensional fit checks for ordinary accessories.',
    why: 'An accessible starting point for checking a case lid, connector opening, or mounting pattern before spending time on the final material.',
    limitation: 'A successful PLA prototype verifies fit only. It does not establish heat resistance or service strength.',
    workflow: 'Use the Bambu Studio profile for your exact printer, nozzle, plate, and spool. Check the preview and measure the finished prototype.',
    source: 'https://bambulab.com/en/filament-guide', sourceLabel: 'Bambu filament comparison',
  },
  {
    id: 'case', label: 'Make an everyday case', material: 'PETG HF', tag: 'Default for cases',
    use: 'Ordinary electronics cases and desk accessories, after a fit check.',
    why: 'My starting choice when a rigid case needs more toughness than a basic PLA prototype. Final suitability still depends on temperature and geometry.',
    limitation: 'This is not a structural or impact-load rating. Keep connector and ventilation clearances part of the fit check.',
    workflow: 'Dry according to the spool instructions, then select its matching Bambu Studio profile. Use the slicer mass estimate for the cost calculation below.',
    source: 'https://us.store.bambulab.com/collections/bambu-lab-3d-printer-filament/products/petg-hf', sourceLabel: 'Bambu PETG HF guidance',
  },
  {
    id: 'flexible', label: 'Add soft feet', material: 'TPU 95A HF', tag: 'Flexible accessories',
    use: 'Soft desk feet, grip pads, and flexible accessory pieces.',
    why: 'Choose flexibility when the part needs to compress or grip. It is not a replacement for a rigid mounting surface.',
    limitation: 'TPU 95A HF and TPU for AMS are different products. Check the exact feed-path compatibility; the AMS HT guide excludes TPU 95A from its normal feed.',
    workflow: 'Plan for external-spool feeding and confirm the printer-specific TPU instructions. Dry the filament and use the matching material profile.',
    source: 'https://cdn1.bambulab.com/documentation/h2d/en/AMS_HT_20250109.pdf', sourceLabel: 'Bambu AMS HT compatibility',
  },
] as const;

export const accessoryCatalog = [
  {
    id: 'bench-case',
    modelId: 'bench-case',
    title: 'XIAO Desktop Bench Storage Case',
    badge: 'Desktop Storage',
    material: 'Bambu PETG HF / PLA',
    footprint: '31.3 × 26.6 × 24.6 mm',
    desc: 'Standalone storage case sized from the existing XIAO electronics model. Two separate printable parts with 0.2 mm friction-fit lip.',
    zip: 'accessories/xiao-bench-case.zip',
    stlCount: 2,
    massEst: '7.0 g',
  },
  {
    id: 'accel-mount',
    modelId: 'accel-mount',
    title: 'Dual Accelerometer Rigid Mount',
    badge: '400g Rigidity',
    material: 'Bambu PETG HF / PETG-CF',
    footprint: '46.7 × 46.6 × 9.2 mm',
    desc: 'High-rigidity dual H3LIS331DL ±400g sensor carrier. Clamping top plate prevents high-G sensor plane deflection and angular jitter.',
    zip: 'accessories/dual-accel-mount.zip',
    stlCount: 2,
    massEst: '15.7 g',
  },
  {
    id: 'pi-cradle',
    modelId: 'pi-cradle',
    title: 'Pi Zero 2W / SBC Shock Cradle',
    badge: 'Shock Isolation',
    material: 'Bambu PETG HF + TPU 95A',
    footprint: '81.4 × 64.1 × 10.5 mm',
    desc: 'Chassis carrier for supervisor SBC and Matek BEC with 4× TPU shock isolation bushings and heatsink chimney.',
    zip: 'accessories/pi-zero-2w-cradle.zip',
    stlCount: 3,
    massEst: '29.5 g',
  },
  {
    id: 'led-mount',
    modelId: 'led-mount',
    title: 'Directional LED Heading Mount',
    badge: 'Optical Beacon',
    material: 'Bambu PETG HF + Translucent',
    footprint: '34.3 × 16.3 × 11.5 mm',
    desc: 'Perimeter optical beacon housing with integrated resistor bay and snap-in 120° optical diffuser lens.',
    zip: 'accessories/led-heading-mount.zip',
    stlCount: 2,
    massEst: '4.7 g',
  },
  {
    id: 'battery-cradle',
    modelId: 'battery-cradle',
    title: 'Dual 4S 550mAh LiPo TPU Cradle',
    badge: 'Impact Dampening',
    material: 'Bambu TPU 95A HF',
    footprint: '82.5 × 70.0 × 15.4 mm',
    desc: 'Energy-absorbing cradle holding dual 4S 550mAh packs in parallel with strap retention channels to prevent battery ejection.',
    zip: 'accessories/tpu-battery-cradle.zip',
    stlCount: 1,
    massEst: '26.5 g',
  },
];

export const productionStlMatrix = [
  { file: 'dual_accel_mount_base.stl', material: 'Bambu PETG HF', tris: 9044, vol: '10.5 cm³', mass: '11.8 g', note: 'Baseplate for dual H3LIS331 ±400g sensors' },
  { file: 'dual_accel_mount_clamp.stl', material: 'Bambu PETG HF', tris: 4740, vol: '3.4 cm³', mass: '3.9 g', note: 'Clamping top plate for dual accelerometer breakout PCBs' },
  { file: 'pi_cradle_base.stl', material: 'Bambu PETG HF', tris: 8824, vol: '20.7 cm³', mass: '21.5 g', note: 'Carrier base for Orange Pi / Pi Zero 2W + Matek BEC' },
  { file: 'pi_cradle_cover.stl', material: 'Bambu PETG HF', tris: 2592, vol: '6.9 cm³', mass: '7.8 g', note: 'Protective top shroud with SoC heatsink chimney' },
  { file: 'tpu_isolation_grommet.stl', material: 'Bambu TPU 95A HF', tris: 1680, vol: '0.16 cm³', mass: '0.2 g ea', note: 'Shock-decoupling bushing (print 4× for Pi cradle corners)' },
  { file: 'battery_cradle.stl', material: 'Bambu TPU 95A HF', tris: 5900, vol: '25.3 cm³', mass: '26.5 g', note: 'Shock-absorbing cradle for 2× 4S 550mAh LiPo packs + straps' },
  { file: 'led_mount_body.stl', material: 'Bambu PETG HF (Black)', tris: 5604, vol: '3.2 cm³', mass: '3.6 g', note: 'Directional heading LED beacon mount with resistor bay' },
  { file: 'led_diffuser_lens.stl', material: 'Bambu PETG Translucent', tris: 444, vol: '0.86 cm³', mass: '1.1 g', note: 'Snap-in 120° optical diffuser lens for heading pulse' },
  { file: 'xiao_case_body.stl', material: 'Bambu PETG HF / PLA', tris: 700, vol: '3.9 cm³', mass: '4.5 g', note: 'Bench test storage case body for Seeed XIAO ESP32-S3' },
  { file: 'xiao_case_lid.stl', material: 'Bambu PETG HF / PLA', tris: 1172, vol: '2.1 cm³', mass: '2.5 g', note: 'Bench test storage case friction-fit lid' },
];
