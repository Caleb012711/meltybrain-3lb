# RadioMaster Pocket ELRS Specification & Setup Guide — Eyeliner 3lb Meltybrain

## 1. Hardware Architecture & Radio Overview
- **Transmitter Model:** RadioMaster Pocket 2.4GHz ExpressLRS (Mode 2)
- **RF Subsystem:** Integrated 2.4GHz ExpressLRS SX1280 transceiver (Firmware: ExpressLRS v3.3.x+)
- **Operating System:** EdgeTX v2.9.x / v2.10.x
- **Gimbals:** RadioMaster Hall X5 Nano gimbals with CNC aluminum stick ends (M3 threaded)
- **Power Supply:** 2× 18650 Flat-Top Unprotected 3.7V Li-ion cells (e.g., Molicel INR18650-M35A or Samsung 35E, 3500mAh; nominal 7.4V, max 8.4V). *Note: Button-top and protected cells exceed battery compartment length and must not be used.*
- **Interface Ports:** 
  - Top USB-C: Data / Simulator / Telemetry CLI (interfaced to Cyberdeck dock)
  - Bottom USB-C: 2S Li-ion balanced charging port (5V/2A input)
  - Nano module expansion bay on rear

---

## 2. Switch Allocations & Physical Mapping

The RadioMaster Pocket features 4 primary top switches and 2 momentary buttons. The allocations are locked to ensure compliance with SPARC combat robotics rules and failsafe requirements:

| Switch | Physical Position | Switch Type | Function | Pos 0 (UP) | Pos 1 (MID) | Pos 2 (DOWN) | Failsafe State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SA** | Top-Left Outer | 2-Pos Latching | **Chassis ARM** | Disarmed (-100%) | — | Armed (+100%) [Interlocked] | Disarmed (-100%) |
| **SB** | Top-Left Inner | 3-Pos Toggle | **Drive / Autonomy Mode** | Manual T1 (-100%) | Assist T2 (0%) | Full Auto T5 (+100%) | Manual T1 (-100%) |
| **SC** | Top-Right Inner | 3-Pos Toggle | **Heading Beacon / LEDs** | LEDs OFF (-100%) | Heading Strobe (0%) | Arena Flood (+100%) | LEDs OFF (-100%) |
| **SD** | Top-Right Outer | 2-Pos Latching | **Weapon Kill (E-Stop)** | RUN (+100%) | — | WEAPON CUT (-100%) | WEAPON CUT (-100%) |
| **SE** | Top-Left Button | Momentary Push | **Blackbox Marker** | Idle (0) | — | Log Event Trigger (+100%) | Idle (0) |
| **SF** | Top-Right Button| Momentary Push | **Autonomy Deadman** | Kill / Manual | — | Auto Permit (Held) | Released (Kill) |

### Control Surface & Stick Mapping (Mode 2)
- **CH1 (Aileron / Roll):** Right Stick Horizontal — Translation Vector X-axis (±100%)
- **CH2 (Elevator / Pitch):** Right Stick Vertical — Translation Vector Y-axis (±100%)
- **CH3 (Throttle):** Left Stick Vertical — Rotational Spin RPM Setpoint (0–4000 RPM mapped -100% to +100%)
- **CH4 (Rudder / Yaw):** Left Stick Horizontal — Heading Reference Angle Fine Trim (±45° offset)
- **CH5 (AUX1):** SA — System Arming (1000µs = Disarmed, 2000µs = Armed)
- **CH6 (AUX2):** SB — Drive Mode Selector (1000µs = Manual, 1500µs = Assist, 2000µs = Autonomous)
- **CH7 (AUX3):** SC — Visual Beacon / Optical Navigation Lights (1000µs, 1500µs, 2000µs)
- **CH8 (AUX4):** SD — Weapon Kill / Hardware E-Stop Override (1000µs = Cut, 2000µs = Run)

---

## 3. ExpressLRS RF Configuration (2.4GHz)

Configure via the `ExpressLRS.lua` script on the RadioMaster Pocket:
1. **Packet Rate:** `500Hz` (`F500` or `500Hz Standard`)
   - *Rationale:* Delivers 2.0ms frame transmission interval. Critical for meltybrain translation where the heading pulse must be modulated synchronously with rotor angle at 3000+ RPM (50 revs/sec = 20ms per revolution).
2. **Telemetry Ratio:** `1:16` for match performance (or `1:4` for bench tuning / sensor discovery).
   - Allows vital CRSF telemetry frames (Vbat, RPM, Link Quality) back to the transmitter and Cyberdeck dock without degrading control loop jitter.
3. **Switch Mode:** `Wide` (8 full-resolution 10-bit channels for high-precision vector control).
4. **TX Power / Dynamic Power:**
   - **Dynamic Power:** `Enabled`
   - **Min Power:** `25mW`
   - **Max Power:** `250mW` (FCC legal limit for Pocket internal RF module)
   - **Dynamic Power Threshold:** Default SNR curve (-105dBm sensitivity limit)
5. **Model Match:** `ON` (ID: 01) — Prevents binding to unvetted test rigs or wrong pit receivers.
6. **Regulatory Domain:** `FCC_2400` (North American arena standard).
7. **Binding Phrase:** Set identical secret MD5 binding string on Pocket TX and RP1/EP1 RX.

---

## 4. Gimbal Calibration Ritual (Hall X5 Gimbals)

Execute calibration prior to initial operation or whenever stick deadband shifts:
1. Power on RadioMaster Pocket by holding the center Power button.
2. Long-press `SYS` button → navigate to **HARDWARE** page.
3. Scroll down to `Calibration` → press the Scroll Wheel.
4. **Step 1 (Centering):** Release both gimbals to natural mechanical center. Press `[ENTER]`.
5. **Step 2 (Extremes):** Move both gimbals slowly in a strict cross (`+`) pattern:
   - Stick fully UP, fully DOWN, fully LEFT, fully RIGHT.
   - *Caution: Do NOT rotate sticks in circles.* Circular sweeps distort diagonal corner coordinates.
6. Check Channel Monitor: Verify center reads exactly `0.0`, minimum reads `-100.0`, maximum reads `+100.0`.
7. Verify deadband: If mechanical jitter occurs, configure `Deadband = 2` under Model Setup.

---

## 5. Safety Interlocks & Failsafe Rituals (EdgeTX)

### Two-Factor Arming Interlock (L01)
Arming requires deliberate human action with throttle physically zeroed:
- `L01 = AND ( SA_DOWN , Throttle < -95% )`
- If SA is flipped while Throttle is elevated, arming is rejected and an audio alarm fires.

### Hardware Weapon Cut Override (Special Function SF1/SF2)
- When `SD = UP` (E-Stop Asserted) OR `SA = UP` (Disarmed):
  - `SF1: Override CH3 (Throttle) -> -100% (Instant zero power)`
  - `SF2: Override CH8 (Weapon State) -> -100% (Hardware Kill)`
- Response latency from switch throw to dShot600 zero-command: `< 15ms`.

### EdgeTX Failsafe Configuration
- Protocol Failsafe Mode: `Custom`
- Values:
  - `CH1: 0%` (Zero translation)
  - `CH2: 0%` (Zero translation)
  - `CH3: -100%` (Motor kill / Active brake)
  - `CH4: 0%` (Zero heading trim)
  - `CH5: -100%` (Disarmed state)
  - `CH6: -100%` (Manual fallback)
  - `CH7: -100%` (Beacon off)
  - `CH8: -100%` (Weapon kill asserted)
