# Accessories — Parametric CAD & Mesh Generation Pipeline

This directory contains standalone, parametric Python CAD generators based on OpenCASCADE (`OCP` / `build123d`). Each accessory is fully defined by mathematical parameters in `parameters.json`, generates production STEP solids and binary STLs via `generate.py`, and validates geometric topology automatically.

## Directory Structure & Subsystems

```
accessories/
├── cad_validation.py             # Shared geometric verification & STL topology engine
├── dual-accel-mount/             # Dual H3LIS331DL ±400g high-g accelerometer rigid bracket
│   ├── generate.py
│   ├── parameters.json
│   ├── README.md
│   ├── validation.json
│   ├── dual_accel_mount_base.step / .stl
│   ├── dual_accel_mount_clamp.step / .stl
│   └── assembly.step
├── pi-zero-2w-cradle/            # Shock-isolated Pi Zero 2W / Orange Pi + BEC cradle
│   ├── generate.py
│   ├── parameters.json
│   ├── README.md
│   ├── validation.json
│   ├── pi_cradle_base.step / .stl
│   ├── pi_cradle_cover.step / .stl
│   ├── tpu_isolation_grommet.step / .stl
│   └── assembly.step
├── tpu-battery-cradle/           # TPU 95A dual 4S 550mAh LiPo shock retention cradle
│   ├── generate.py
│   ├── parameters.json
│   ├── README.md
│   ├── validation.json
│   ├── battery_cradle.step / .stl
│   └── assembly.step
├── led-heading-mount/            # Dual heading indicator LED mount + optical diffuser
│   ├── generate.py
│   ├── parameters.json
│   ├── README.md
│   ├── validation.json
│   ├── led_mount_body.step / .stl
│   ├── led_diffuser_lens.step / .stl
│   └── assembly.step
└── xiao-bench-case/              # XIAO ESP32-S3 bench test storage enclosure
    ├── generate.py
    ├── parameters.json
    ├── README.md
    └── validation.json
```

## Running Generators & Verifications

To regenerate all accessories and run the full CAD/mesh validation suite:

```bash
# Regenerate individual accessory
cd accessories/dual-accel-mount && python3 generate.py
cd accessories/pi-zero-2w-cradle && python3 generate.py
cd accessories/tpu-battery-cradle && python3 generate.py
cd accessories/led-heading-mount && python3 generate.py
cd accessories/xiao-bench-case && python3 generate.py
```
