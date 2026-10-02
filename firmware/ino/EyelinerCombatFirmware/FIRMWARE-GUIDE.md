# Eyeliner 3lb Meltybrain Combat Robot — Firmware & Operation Guide

**Target Hardware:** PJRC Teensy 4.0 (NXP i.MX RT1062 ARM Cortex-M7 @ 600 MHz)  
**Robot Class:** 3lb (1360.8g) Beetleweight Meltybrain  
**Firmware Location:** `/Users/caleblickteig/Documents/meltybrain-3lb/firmware/ino/EyelinerCombatFirmware/`  
**Primary Sketch:** `EyelinerCombatFirmware.ino`

---

## 1. System Architecture Overview

The **Eyeliner Combat Firmware** is a hard real-time, deterministic 1,000 Hz (1.0 ms) robotic control system designed specifically for high-speed rotational translation (meltybrain). At combat speeds of 2,500 to 3,500 RPM (up to 58 revolutions per second), traditional control paradigms fail due to sensor saturation, latency jitter, and shock disconnections.

```
                              +----------------------------+
                              |   RadioMaster Pocket CRSF  |
                              |   ELRS 420kBaud (Serial1)  |
                              +--------------+-------------+
                                             |
                                             v
+------------------------+      +------------+-------------+      +------------------------+
| Dual H3LIS331DLTR Acc  | ---> |   Teensy 4.0 Fast Loop   | ---> | AM32 55A ESC (DShot600)|
| SPI 10MHz (Pins 9-13)  |      |   1,000 Hz Deterministic |      | Pins 4 & 5 (1.67us bit)|
+------------------------+      +------------+-------------+      +------------------------+
                                             |
                                +------------+-------------+
                                |                          |
                                v                          v
                     +--------------------+     +--------------------+
                     | VL53L4CD / TF-Luna |     | Visual Heading LED |
                     | 360° Polar Hunter  |     | Virtual POV Beam   |
                     +--------------------+     +--------------------+
```

### Core Architecture Pillars
1. **Tier-0 Safety Failsafe (SPARC Standard):** Loss of CRSF link for $>100\,\text{ms}$ cuts ESC motor throttle to 0 instantly. ARM Cortex-M hardware watchdog enforces crash recovery.
2. **Cycle-Accurate DShot600:** Left and right motor digital packets generated via ARM DWT 600 MHz cycle counter, guaranteeing sub-nanosecond pulse edges and bidirectional telemetry decoding.
3. **45-Degree Opposed Differential Kinematics:** Dual $\pm 400g$ accelerometers placed at $r_1, r_2 = 25\,\text{mm}$ cancel arena wall impact spikes up to $400g$ through differential mathematical fusion.
4. **360° Micro-LiDAR Autonomous Ramming:** As the robot spins at 3,000 RPM, Time-of-Flight measurements are mapped into 36 polar angular bins ($10^\circ$ each), discriminating background arena walls from opponent combatants and locking on with dynamic phase advance.
5. **Virtual Persistence-of-Vision (POV) Heading Beam:** High-intensity LEDs pulse during a $15^\circ$ rotational window, projecting a stationary laser-like arrow showing the bot's translation direction.

---

## 2. Complete Teensy 4.0 Pinout Table

| Teensy 4.0 Pin | Primary Function | Signal Type | Direction | Connected Device / Net | Logic / Level | Notes |
|---|---|---|---|---|---|---|
| **Pin 0** | RX1 | UART Serial | Input | RadioMaster Pocket / ELRS CRSF RX | 3.3V | 420,000 baud 8N1 |
| **Pin 1** | TX1 | UART Serial | Output | ELRS CRSF Telemetry TX | 3.3V | Telemetry feedback to radio |
| **Pin 2** | GPIO | Fast Digital | Output | Rear Red Heading LED Driver | 3.3V / FET | High-intensity POV beacon |
| **Pin 4** | GPIO | Fast Digital | Output | Left AM32 ESC DShot600 Signal | 3.3V | 1.67 $\mu$s bit period |
| **Pin 5** | GPIO | Fast Digital | Output | Right AM32 ESC DShot600 Signal | 3.3V | 1.67 $\mu$s bit period |
| **Pin 6** | GPIO | Fast Digital | Output | Front Green Heading LED Driver | 3.3V / FET | High-intensity POV beacon |
| **Pin 7** | RX2 | UART Serial | Input | TF-Luna Micro-LiDAR RX (Alt) | 3.3V | 115,200 baud ToF range |
| **Pin 8** | TX2 | UART Serial | Output | TF-Luna Micro-LiDAR TX (Alt) | 3.3V | Configuration stream |
| **Pin 9** | SPI CS1 | Digital Output | Output | H3LIS331DLTR #1 Chip Select | 3.3V | Primary +45° Accel |
| **Pin 10** | SPI CS2 | Digital Output | Output | H3LIS331DLTR #2 Chip Select | 3.3V | Opposed -45° Accel |
| **Pin 11** | SPI MOSI | SPI Hardware | Output | H3LIS331DLTR Data In (MOSI) | 3.3V | 10 MHz SPI Clock |
| **Pin 12** | SPI MISO | SPI Hardware | Input | H3LIS331DLTR Data Out (MISO) | 3.3V | 10 MHz SPI Clock |
| **Pin 13** | SPI SCK | SPI Hardware | Output | H3LIS331DLTR Serial Clock | 3.3V | Shared with onboard LED |
| **Pin 14 (A0)**| ADC0 | Analog Input | Input | 4S LiPo VBAT Resistor Divider | 0–3.3V | 10:1 divider (12–16.8V battery) |
| **Pin 15** | GPIO / IRQ | Digital Input | Input | Arena Optical Beacon Sensor | 3.3V | Interrupt-driven PLL sync |
| **Pin 18** | I2C SDA | I2C Hardware | Bi-dir | ST VL53L4CD Micro-LiDAR SDA | 3.3V | 400 kHz Fast-Mode I2C |
| **Pin 19** | I2C SCL | I2C Hardware | Output | ST VL53L4CD Micro-LiDAR SCL | 3.3V | 400 kHz Fast-Mode I2C |

---

## 3. Subsystem Technical Reference

### 3.1 DShot600 Driver (`DShotDriver.h` / `.cpp`)
- **Timing:** Bit 0 = 625 ns High / 1042 ns Low; Bit 1 = 1250 ns High / 417 ns Low; Frame = 16 bits ($26.7\,\mu\text{s}$).
- **Implementation:** Executes in parallel on Pins 4 & 5 using ARM Cortex-M7 `ARM_DWT_CYCCNT` (Cycle Counter). During packet transmission, interrupts are suspended for $27\,\mu\text{s}$ to achieve zero-jitter ESC pulse delivery.
- **Throttle Mapping:**
  - Range: 48 (min idle throttle) to 2047 (max full throttle). 0 is motor stop.
  - Bidirectional 3D Mode supported with neutral at 1047/1048.
- **ESC Telemetry:** Decodes standard 10-byte KISS/AM32 serial telemetry (Temperature, Voltage, Current, mAh, eRPM) and bidirectional inverted GCR eRPM packets.

### 3.2 Dual Accelerometers (`DualAccelerometer.h` / `.cpp`)
- **Hardware:** Two ST Micro H3LIS331DLTR LGA-16 ICs rated to $\pm 400g$ ($1.915\,\text{m/s}^2/\text{LSB}$).
- **SPI Interface:** Dedicated 10 MHz bus with Block Data Update (BDU) and 1,000 Hz Output Data Rate (ODR).
- **45° Coordinate Geometry:**
  Each chip is mounted rotated by $45^\circ$ relative to the radial radius vector:
  $$\begin{aligned}
  a_{r1} &= \frac{X_1 - Y_1}{\sqrt{2}} \\
  a_{t1} &= \frac{X_1 + Y_1}{\sqrt{2}}
  \end{aligned}$$
  This distributes dynamic load across both internal sensor axes, raising physical saturation headroom from $400g$ to $400\sqrt{2} \approx 565g$!
- **Differential Impact Spike Rejection:**
  Centrifugal acceleration is radial outward on both sensors: $a_r = \omega^2 r$.
  External lateral wall impacts produce a uniform translational acceleration vector $\vec{a}_{\text{shock}}$ across the rigid chassis. Because the sensors are diametrically opposed:
  $$\begin{aligned}
  a_{r1} &= \omega^2 r_1 + \vec{a}_{\text{shock}} \cdot \hat{u} \\
  a_{r2} &= \omega^2 r_2 - \vec{a}_{\text{shock}} \cdot \hat{u} \\
  a_{r1} + a_{r2} &= \omega^2 (r_1 + r_2) = \omega^2 \cdot \text{baseline}
  \end{aligned}$$
  The linear impact shock $\vec{a}_{\text{shock}}$ cancels out completely:
  $$\omega = \sqrt{\frac{a_{r1} + a_{r2}}{r_1 + r_2}}$$

### 3.3 RadioMaster Pocket CRSF Parser (`CRSFReceiver.h` / `.cpp`)
- **Protocol:** ExpressLRS / CRSF v2/v3 @ 420,000 baud over `Serial1`.
- **Packet Structure:** 26-byte frame containing 16 packed 11-bit channels [172 to 1811 counts, mid 992].
- **Channel Assignment:**
  - **CH1 (Throttle):** Weapon Spin RPM (0 to 3,500 RPM).
  - **CH2 (Roll) & CH3 (Pitch):** Translation vector magnitude $[0.0 \dots 1.0]$ and direction $\theta \in [-\pi, +\pi]$.
  - **CH4 (Yaw):** Driver heading trim offset ($[-0.40 \dots +0.40]\,\text{rad}$).
  - **CH5 (SA Switch):** Safety Arming Interlock (Down = DISARM, Up = ARM).
  - **CH6 (SB Switch):** 3-Position Mode Switch:
    - Position 0 (Low): `MELTY_MANUAL` (Standard human translational drive).
    - Position 1 (Mid): `AUTO_AI_HUNT` (Micro-LiDAR autonomous opponent tracking & ramming).
    - Position 2 (High): `CALIBRATE` (Bench diagnostics).
  - **CH7 (SC Switch):** Heading LED Mode (Off, Front Green Only, Front Green + Rear Red).
  - **CH8 (SD Switch):** Emergency Kill Switch (Instant hard cutoff).

### 3.4 Micro-LiDAR AI Target Hunter (`MicroLidarHunter.h` / `.cpp`)
- **Operation at 3,000 RPM (50 rev/sec, 20ms period):**
  - Maintains a 36-bin ($10^\circ$ resolution) polar distance horizon.
  - Automatically correlates every incoming ToF range reading with instantaneous robot heading $\theta(t)$.
- **Arena Discrimination:**
  - Background arena walls form a predictable convex boundary ($1.8\,\text{m} \dots 2.8\,\text{m}$).
  - Opponents are identified as persistent foreground clusters ($0.15\,\text{m} \dots 1.8\,\text{m}$) situated at least $35\,\text{cm}$ closer than the wall envelope.
- **Ramming Phase Lead Advance:**
  - When locked, the algorithm directs the translation modulation towards:
    $$\theta_{\text{attack}} = \theta_{\text{target}} + (\omega \cdot t_{\text{latency}})$$
  - Commands 100% translation thrust to ram into the detected opponent robot!

### 3.5 Heading Beacon & Watchdog (`HeadingTracker.h` / `.cpp`)
- **Angle Integration:** $\theta(t) = \int \omega(t)\,dt \pmod{2\pi}$ with optional optical IR PLL phase locking.
- **Persistence of Vision:** Pulses front green LED at $\theta_{\text{target}}$ and rear red LED at $\theta_{\text{target}} + \pi$. The human eye sees a crisp, stationary heading arrow hovering over the spinning robot.
- **Safety Interlocks:**
  - Loss of CRSF packets for $>100\,\text{ms} \to$ Immediate motor shutdown (`STATE_FAILSAFE`).
  - Rotational speed $>4,000\,\text{RPM} \to$ Over-speed safety cutoff.
  - Battery voltage $<12.0\,\text{V} \to$ Brownout cut to prevent LiPo puffing.
  - SD Switch triggered $\to$ Instant E-Stop.

---

## 4. State Machine Architecture

```
                  +-----------------------------------+
                  |           POWER-ON                |
                  +-----------------+-----------------+
                                    |
                                    v
                            +---------------+
                            |   DISARMED    | <------------------------+
                            +-------+-------+                          |
                                    |                                  |
               [SA = HIGH and Throttle = 0 and No Faults]              |
                                    |                                  |
                                    v                                  |
                            +---------------+                          |
                            |     ARMED     |                          |
                            +-------+-------+                          |
                                    |                                  |
                           [Throttle > 0.05]                           |
                                    |                                  |
                                    v                                  |
                            +---------------+                          |
                            |    SPINUP     |                          |
                            +-------+-------+                          |
                                    |                                  |
                         [RPM >= 800 (Min RPM)]                        |
                                    |                                  |
                   +----------------+----------------+                 |
                   |                                 |                 |
            [SB = MANUAL]                     [SB = AI_HUNT]           |
                   |                                 |                 |
                   v                                 v                 |
          +-----------------+               +-----------------+        |
          |  MELTY_MANUAL   | <-----------> |  AUTO_AI_HUNT   |        |
          +--------+--------+   (SB switch) +--------+--------+        |
                   |                                 |                 |
                   +----------------+----------------+                 |
                                    |                                  |
                     [SA = LOW or Throttle < 0.03]                     |
                                    |                                  |
                                    +----------------------------------+
                                    |
              [Link Loss > 100ms OR Over-RPM > 4000 OR SD Kill]
                                    |
                                    v
                            +---------------+
                            |   FAILSAFE    |
                            +---------------+
                     (Motors CUT, 10Hz Strobe,
                      Requires SA Cycle to clear)
```

---

## 5. Flashing Instructions

### Method A: Arduino IDE 2.x with Teensyduino (Recommended)
1. Install **Arduino IDE 2.3+** and the **Teensyduino** board package from PJRC:
   `https://www.pjrc.com/teensy/td_download.html`
2. Open `/Users/caleblickteig/Documents/meltybrain-3lb/firmware/ino/EyelinerCombatFirmware/EyelinerCombatFirmware.ino`.
3. In the Arduino IDE menu:
   - **Tools -> Board -> Teensyduino -> Teensy 4.0**
   - **Tools -> USB Type -> Serial**
   - **Tools -> CPU Speed -> 600 MHz**
   - **Tools -> Optimize -> Faster (-O2)**
4. Connect Teensy 4.0 via Micro-USB. Click **Upload**.
5. If auto-reboot is not triggered, press the small white push-button on the Teensy 4.0 once.

### Method B: PlatformIO (VS Code / CLI)
Create a `platformio.ini` in the project root:
```ini
[env:teensy40]
platform = teensy
board = teensy40
framework = arduino
build_flags =
    -O2
    -DCORE_TEENSY
    -DUSB_SERIAL
upload_protocol = teensy-cli
```
Run:
```bash
pio run --target upload
```

### Method C: Teensy Loader CLI (Standalone Hex Flashing)
```bash
teensy_loader_cli --mcu=imxrt1062 -w -v EyelinerCombatFirmware.ino.hex
```

---

## 6. Calibration & Pit Procedures

### Step 1: Stationary 0g Accelerometer Bias Calibration
1. Place robot completely stationary and flat on the pit table.
2. Power on the robot (or connect USB).
3. The firmware automatically samples 200 readings in `setup()` to record stationary 0g offsets:
   $$\text{offset}_{x,y} = \frac{1}{N} \sum a_{x,y}$$
4. Open the Serial Monitor @ 115200 baud. Confirm `ACC1` and `ACC2` report $\approx 0\,\text{m/s}^2$.

### Step 2: Opposed Radii Geometry Verification
1. Verify CAD nominal distance from robot Center of Rotation (shaft center) to each sensor:
   - $r_1 = 25.0\,\text{mm} = 0.025\,\text{m}$
   - $r_2 = 25.0\,\text{mm} = 0.025\,\text{m}$
   - Total baseline $= 50.0\,\text{mm} = 0.050\,\text{m}$.
2. If custom PCB placement differs, update radii in `setup()`:
   ```cpp
   accel.setRadii(0.0245f, 0.0255f);
   ```

### Step 3: RadioMaster Pocket RC Channel Verification
1. Turn on RadioMaster Pocket with model profile `Eyeliner_3lb`.
2. Inspect Serial Monitor output in `DISARMED` state:
   - Check SA Switch: Low $\approx 1000\,\mu\text{s}$, High $> 1700\,\mu\text{s}$.
   - Check Throttle Stick: All the way down must read $0.00$.
   - Check Roll/Pitch Sticks: Centered must read $0.00$, full deflection $= 1.00$.
   - Verify Emergency Kill (SD Switch): When toggled, state must jump to `FAILSAFE`.

### Step 4: Motor Response Latency Tuning ($t_{\text{latency}}$)
1. In a secure test arena, arm the robot and spin up to $\approx 1,200\,\text{RPM}$.
2. Push the Pitch stick forward to command pure forward translation.
3. Observe the green visual heading beam:
   - If the robot translates slightly to the **left** of where the green beam points, the motor latency setting is too small. Increase `MELTY_DEFAULT_LATENCY_S` by $+0.0005\,\text{s}$ (0.5 ms).
   - If the robot translates slightly to the **right**, decrease `MELTY_DEFAULT_LATENCY_S` by $-0.0005\,\text{s}$.
   - The pilot can also trim this live during combat using the **Yaw stick** ($\pm 0.40\,\text{rad}$ trim range).

### Step 5: Micro-LiDAR Arena Wall Learning
1. Place the spinning robot in the center of the combat arena.
2. In the pit console or via switch command, trigger `learnArenaWalls()`.
3. The robot records the $360^\circ$ perimeter wall profile.
4. Flip SB switch to **AI HUNT** mode. Place an opponent block 1 meter away.
5. Verify the console reports `LIDAR: LOCK(<dist>m, <angle>deg)` and the robot drives directly toward the target block.

---

## 7. Combat Pit Pre-Flight Checklist

Before entering the arena cage, execute this 60-second safety ritual:

- [ ] **Physical Check:** Dead axle M3 bolts torqued with blue Loctite 243. Cleat teeth intact.
- [ ] **Sensor Check:** Both H3LIS331DLTR accelerometers report healthy (Green status).
- [ ] **LiDAR Lens:** Clean optical face of VL53L4CD / TF-Luna with isopropyl wipe.
- [ ] **Battery:** 4S LiPo flight set $> 16.4\,\text{V}$ (4.10V/cell minimum).
- [ ] **Radio Link:** RadioMaster Pocket linked, Link Quality $> 95\%$, RSSI $> -70\,\text{dBm}$.
- [ ] **Arming Interlock Test:** Ensure robot refuses to arm if throttle stick is raised $> 0\%$.
- [ ] **E-Stop Verification:** Flip SD switch — confirm immediate motor cut and rapid 10Hz strobe.
- [ ] **Lock In:** Insert combat removable power link key. Close arena door. Prepare to spin!
