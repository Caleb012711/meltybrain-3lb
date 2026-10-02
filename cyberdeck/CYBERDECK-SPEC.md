# Custom Cyberdeck Tactical Combat Base Station — Specification Document
**Subsystem:** Ground Control Station (GCS) / Pit Tactical Dashboard / Target Acquisition  
**System Designation:** EYELINER-CYBERDECK-MK1  
**Operating Environment:** Combat Robotics Arena Pit & Driver Station (SPARC Compliant)

---

## 1. System Overview & Architecture

The Eyeliner Cyberdeck Base Station is a ruggedized, field-deployable ground station housed in a Pelican 1120 / Nanuk 904 protective hard case. It provides real-time arena computer vision tracking, robot telemetry aggregation, high-speed blackbox logging, and an integrated physical docking bay for the RadioMaster Pocket transmitter.

### Key Invariant
The Cyberdeck operates strictly in an **advisory and observation capacity (T3 Coach Tier)** during sanctioned matches. Actuator control authority resides exclusively on the robot's Teensy 4.0 flight controller (T0 Safety / T1 Governor) linked directly via the RadioMaster Pocket's 2.4GHz ExpressLRS radio. The Cyberdeck communicates advisory target vectors and arena containment geofences with mandatory Time-To-Live (TTL ≤ 1.0s) constraints.

```
+-----------------------------------------------------------------------------------------+
|                               EYELINER CYBERDECK MK1                                    |
|                                                                                         |
|  +--------------------+     +----------------------------------+     +---------------+  |
|  | Dual UVC Cameras   |     |   7.0" Sunlight-Readable IPS     |     | RadioMaster   |  |
|  | - Overhead Cam     |     |   1280x800 Capacitive Touch      |     | Pocket Dock   |  |
|  | - Target Tracker   |     |   Direct MIPI DSI Interface      |     | USB-C Serial  |  |
|  +---------+----------+     +----------------+-----------------+     +-------+-------+  |
|            |                                 |                               |          |
|            | USB 3.0 / USB 2.0               | MIPI DSI Display / I2C Touch  | USB CDC  |
|            v                                 v                               v          |
|  +-----------------------------------------------------------------------------------+  |
|  |                     Single-Board Computer: Raspberry Pi 5 (8GB)                   |  |
|  | - Quad-core ARM Cortex-A76 @ 2.4GHz                                               |  |
|  | - 256GB NVMe SSD via PCIe Hat (Host OS, YOLOv8 Tracker, Node.js Dashboard)         |  |
|  | - Active Cooler + Dynamic Thermal Throttling Mitigation                           |  |
|  +-------------------------------------+---------------------------------------------+  |
|                                        ^                                                |
|                                        | 5.1V @ 5.0A High-Current Rail                  |
|  +-------------------------------------+---------------------------------------------+  |
|  |                             Power Distribution Subsystem                          |  |
|  | - 3S LiFePO4 (9.6V / 3300mAh) or 4S LiPo (14.8V / 2200mAh) Pack                  |  |
|  | - High-Efficiency Synchronous Buck Regulator (9-24V -> 5.1V / 6.0A Peak)          |  |
|  | - 65W USB-PD Bidirectional Charging Controller (IP2368 / SW3518S)                 |  |
|  | - 15A Automotive Mini-Blade Fuse + Master Heavy-Duty Aircraft Switch             |  |
|  | - I2C Fuel Gauge (Texas Instruments INA226 Voltage / Current / Power Monitor)    |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Core Electronics Subsystems

### 2.1 Single-Board Computer (SBC)
- **Primary Configuration:** Raspberry Pi 5 (8GB LPDDR4X)
  - CPU: Broadcom BCM2712 64-bit ARM Cortex-A76 quad-core @ 2.4GHz.
  - Active Cooler: Official Raspberry Pi 5 Active Cooler (aluminum heatsink + variable-speed PWM blower).
  - Storage & Boot Media: 256GB M.2 2242 NVMe SSD mounted on a Pineberry Pi HatDrive! Top (PCIe Gen 2 / Gen 3 x1 interface). Yields >800 MB/s sequential read/write for zero-drop blackbox log flushing and fast boot (<11s).
- **Alternate High-AI Configuration:** NVIDIA Jetson Orin Nano (8GB, 40 TOPS INT8) for venues requiring 60 FPS multi-target 3D bounding box estimation.

### 2.2 Display Assembly
- **Display Panel:** Waveshare 7.0" IPS Sunlight-Readable Capacitive Touchscreen
  - Resolution: 1280×800 pixels (16:10 aspect ratio)
  - Luminance: 800 cd/m² (high-nit sunlight-readable panel for outdoor / bright pit arenas)
  - Touch Interface: 5-point capacitive touch with toughened 6H tempered glass overlay
  - Video Bus: 2-lane MIPI DSI via flexible flat cable directly to Pi 5 DSI0 port (eliminates bulky HDMI cables and preserves all USB 3.0 ports for vision processing)
  - Touch Bus: I2C (connected to Pi 5 GPIO pins 2/3 with interrupt on GPIO 4)

### 2.3 Tactical Dual-Camera Vision Pipeline
1. **Arena Overhead Wide-Angle Camera:**
   - Model: ELP 1080p Sony IMX291 Low-Light UVC Camera module
   - Lens: 150° ultra-wide low-distortion M12 lens
   - Mounting: Quick-disconnect locking aviation connector (GX16-4) routed to an external 3-meter telescopic mast
   - Interface: USB 3.0 (connected to Pi 5 USB 3.0 port 1)
   - Function: Captures full 2.4m × 2.4m arena bounding envelope for YOLOv8 real-time position tracking and containment geofence enforcement.
2. **Optical Target Tracker Camera:**
   - Model: Arducam OV9281 1280×800 Monochrome Global Shutter UVC Camera
   - Frame Rate: Up to 120 FPS at 1280×800, 210 FPS at 640×480
   - Lens: 2.8–12mm manual varifocal zoom lens with locking thumbscrews
   - Mounting: Cyberdeck lid-mounted gimbal bracket aimed through front faceplate aperture
   - Interface: USB 3.0 (connected to Pi 5 USB 3.0 port 2)
   - Function: Low-latency optical flow kinematics, robot translation drift estimation, and adversary impact analysis.

### 2.4 RadioMaster Pocket Docking Station
- **Physical Cradle:** Custom SLA 3D-printed dock molded to the lower chassis contour of the RadioMaster Pocket.
- **Dock Connector:** High-durability magnetic USB-C pogo-pin dock connector mating with the Pocket's top data port.
- **Interface Protocol:** USB CDC ACM Serial (`/dev/ttyACM0`) operating at 115200 / 420000 baud.
- **Telemetry Bridge (`melty-bridge` daemon):**
  - Reads bidirectional CRSF telemetry packets relayed from the robot:
    - `1RSS` / `2RSS`: Uplink/Downlink RSSI (dBm)
    - `RQly`: Uplink Link Quality (%)
    - `RxBt`: Main Combat Battery Pack Voltage (V)
    - `RPM`: Rotor rotational velocity computed from dual H3LIS331DL accelerometers
    - `TEMP`: ESC and motor thermal sensor readings
  - Publishes telemetry to the local Dashboard WebSocket on `127.0.0.1:8080`.

---

## 3. Power Architecture & Battery Management

The Cyberdeck is powered entirely from an internal rechargeable pack with rapid USB-C Power Delivery charging.

### 3.1 Chemistry & Pack Options
- **Primary Pick:** 3S LiFePO4 (Lithium Iron Phosphate) Pack
  - Configuration: 3S1P using 26650 cells (e.g., A123 Systems ANR26650M1-B, 3.3V 2500mAh) or 32700 cells (3.2V 6000mAh)
  - Voltage Range: 9.6V nominal (8.5V cutoff, 10.8V full charge)
  - Safety Advantage: Inherent chemical stability, zero risk of thermal runaway in pit environments, 2000+ full discharge cycles.
- **Secondary Pick:** 4S LiPo (14.8V nominal, 16.8V max, 2200mAh 45C) sharing form factor with pit flight packs.

### 3.2 Power Conditioning & Regulation
- **Step-Down Regulator:** Murata / Pololu Step-Down Voltage Regulator (synchronous buck, 7–36V input, 5.1V output @ 6.0A continuous).
- **Efficiency:** 94.5% at 12V in, 5.1V @ 3A out. Ripple < 25mVp-p.
- **Pi 5 Power Compliance:** Directly feeds the 5V rail via dedicated heavy-gauge 18AWG silicone leads to GPIO header pins 2 & 4 (5V) and 6 & 9 (GND), providing full 5.0A headroom without USB peripheral power drop flags.

### 3.3 65W USB-PD Charging & Power Delivery
- **Controller:** IP2368 Bidirectional Buck-Boost USB-PD 3.0 Module
- **Supported Profiles:** 5V/3A, 9V/3A, 12V/3A, 15V/3A, 20V/3.25A (65W max)
- **Operation:** Charges the internal 3S/4S pack from any standard USB-PD laptop charger or 65W field power bank in < 45 minutes.

### 3.4 Protection & Metering
- **Primary Fuse:** 15A Automotive Mini-Blade Fuse in a panel-mount IP67 waterproof holder.
- **Master Power Switch:** Heavy-duty SPST toggle switch (20A @ 12VDC) with red safety flip cover.
- **Fuel Gauge:** Texas Instruments INA226 High-Side Bi-directional Current/Power Monitor on I2C bus (`0x40`). Measures pack voltage (mV), system current (mA), and cumulative watt-hours, displayed live on the dashboard UI.

---

## 4. Complete Bill of Materials (BOM)

| Item | Category | Description | Part Number / Model | Supplier | Qty | Est. Unit ($) | Est. Total ($) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Compute | Raspberry Pi 5 8GB | SC1112 | DigiKey / Mouser | 1 | 80.00 | 80.00 |
| 2 | Compute | Raspberry Pi Active Cooler | SC1148 | DigiKey / Adafruit | 1 | 5.00 | 5.00 |
| 3 | Storage | HatDrive! Top NVMe M.2 Hat | PBR001 | Pineberry Pi | 1 | 22.00 | 22.00 |
| 4 | Storage | 256GB M.2 2242 NVMe SSD | Kioxia / Transcend | Amazon / Mouser | 1 | 28.00 | 28.00 |
| 5 | Display | 7.0" 1280x800 IPS DSI Sunlight (800nit)| 70DSI-IPS-800 | Waveshare | 1 | 64.99 | 64.99 |
| 6 | Vision | 1080p Sony IMX291 Low-Light 150° UVC | ELP-USBFHD01M-L150 | ELP / Amazon | 1 | 48.00 | 48.00 |
| 7 | Vision | OV9281 Global Shutter 120FPS UVC | B0332 | Arducam | 1 | 59.99 | 59.99 |
| 8 | Vision | 2.8-12mm Varifocal Manual CS-Mount Lens | CS-2812M | Arducam / Amazon | 1 | 18.00 | 18.00 |
| 9 | Power | 3S LiFePO4 9.6V 3000mAh Battery Pack | 3S-26650-3000 | BatteryHookup / Amz | 1 | 35.00 | 35.00 |
| 10 | Power | 65W USB-PD IP2368 Buck-Boost Charger | IP2368-2S-6S | AliExpress / Amazon| 1 | 16.50 | 16.50 |
| 11 | Power | Synchronous Buck 5.1V 6A Regulator | D24V50F5 / Pololu 2885| Pololu / DigiKey | 1 | 19.95 | 19.95 |
| 12 | Power | INA226 High-Side I2C Current Sensor | Adafruit 4682 | Adafruit / DigiKey | 1 | 5.95 | 5.95 |
| 13 | Power | Panel-Mount Mini-Blade Fuse Holder | 03540801ZXGY | Littelfuse / DigiKey| 1 | 4.50 | 4.50 |
| 14 | Power | 15A Mini Automotive Blade Fuse (5-pk)| 0297015.WXNV | Littelfuse / Mouser | 1 | 3.50 | 3.50 |
| 15 | Power | 20A Toggle Switch w/ Safety Flip Cover | AP-TOGGLE-RED | McMaster-Carr | 1 | 7.20 | 7.20 |
| 16 | Chassis | Heavy-Duty Waterproof Case (Yellow) | Pelican 1120 / Nanuk 904| Pelican / B&H | 1 | 49.95 | 49.95 |
| 17 | Chassis | Custom CNC Aluminum / Poly Faceplate | 2.5mm 6061-T6 / PETG | SendCutSend / Local | 1 | 35.00 | 35.00 |
| 18 | Interconnect| Pogo-Pin Magnetic USB-C 24-Pin Adapter | MAG-USBC-24P | Adafruit / Amazon | 1 | 12.00 | 12.00 |
| 19 | Interconnect| GX16-4 Panel-Mount Aviation Connector | GX16-4P | Mouser / Amazon | 2 | 4.00 | 8.00 |
| 20 | Hardware | M2.5 & M3 Black Oxide Standoff Assortment| 92005A029 | McMaster-Carr | 1 | 14.50 | 14.50 |
| **Total** | | | | | | | **$532.03** |

---

## 5. Electrical Wiring Schematic & Pinout Tables

### 5.1 Power Distribution & Bus Interconnect Schematic

```
                                  [MASTER TOGGLE SWITCH]
                                         (20A)
  [3S LiFePO4 / 4S LiPo]                  +---+
  [  9.6V - 14.8V Nom  ]-----(+)--------->| / |--------+
         |                                +---+        |
        (-)                                            |
         |         [15A FUSE]                          |
         +------------[===]----------------------------+----(+) RAW BATTERY BUS (9.6V - 14.8V)
         |                                             |
         |                                             +--------------------+
         |                                             |                    |
         |                                             v (BAT_IN)           v (BAT_IN)
         |                                     +---------------+    +---------------+
         |                                     |    IP2368     |    | Pololu D24V50 |
         |                                     | 65W PD Module |    | Buck 5.1V 6A  |
         |                                     +-------+-------+    +-------+-------+
         |                                             |                    |
         |       (External 65W USB-PD In/Out) <========+                    | 5.1V @ 5A
         |                                                                  v
         |  ============================================================================= (+) 5.1V BUS
         |  |                                                                           |
         |  |                 [INA226 I2C MONITOR]                                      |
         |  |                   (Shunt = 0.01R)                                         |
         |  +---(Vin+)--->[ 0.01R ]--->(Vin-)-------------------------------------------+
         |                     |                                                        |
         |                     +-----> SDA/SCL to Pi 5 (GPIO 2, 3)                      |
         |                                                                              |
         |  ============================================================================= (GND) STAR GROUND
         +---------------------------------------------+--------------------------------+
                                                       |                                |
                                                       v                                v
                                            +---------------------+          +---------------------+
                                            |  Raspberry Pi 5 8GB |          | Waveshare 7" DSI    |
                                            |  Pin 2,4 (5V)       |          | Display 5V/GND      |
                                            |  Pin 6,9 (GND)      |          | (Via DSI Ribbon)    |
                                            +----------+----------+          +---------------------+
                                                       |
                        +------------------------------+------------------------------+
                        | (USB 3.0)                    | (USB 3.0)                    | (USB 2.0 / CDC)
                        v                              v                              v
             +--------------------+         +--------------------+         +--------------------+
             | ELP IMX291         |         | Arducam OV9281     |         | RadioMaster Pocket |
             | Overhead Cam (UVC) |         | Target Cam (UVC)   |         | USB-C Pogo Dock    |
             +--------------------+         +--------------------+         +--------------------+
```

### 5.2 Raspberry Pi 5 GPIO Pinout Mapping

| Pin # | Signal Name | Target Subsystem | Function / Description |
| :--- | :--- | :--- | :--- |
| **02** | `5V_IN` | Buck Converter Output | Main +5.1V DC System Power Input (5.0A rated) |
| **04** | `5V_IN` | Buck Converter Output | Main +5.1V DC System Power Input (Parallel line) |
| **06** | `GND` | System Star Ground | Digital & Power Return Ground |
| **03** | `GPIO 02 (SDA1)` | INA226 & Display Touch | I2C Data bus for Battery Meter and Touch Controller |
| **05** | `GPIO 03 (SCL1)` | INA226 & Display Touch | I2C Clock bus (400kHz Fast Mode) |
| **07** | `GPIO 04` | Waveshare 7" DSI | Touchscreen Interrupt Line (`TOUCH_INT`) |
| **09** | `GND` | Ground Reference | Star Ground |
| **14** | `GND` | Ground Reference | Star Ground |
| **18** | `GPIO 24` | Front Panel E-Stop LED | Red Annunciator: Illuminated when SD Kill is asserted |
| **20** | `GND` | Ground Reference | Star Ground |
| **22** | `GPIO 25` | Front Panel Armed LED | Green Annunciator: Illuminated when robot is Armed |
