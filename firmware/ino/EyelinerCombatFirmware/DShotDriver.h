#ifndef DSHOT_DRIVER_H
#define DSHOT_DRIVER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef ARDUINO
#include <Arduino.h>
#else
#include <cmath>
#include <cstring>
#endif

/**
 * @file DShotDriver.h
 * @brief High-performance DShot600 motor driver for Teensy 4.0 (i.MX RT1062)
 *
 * Drives Left (Pin 4) and Right (Pin 5) AM32 / BLHeli32 ESCs with nanosecond-accurate
 * cycle timing using the Cortex-M7 DWT cycle counter.
 * Supports unidirectional and bidirectional 3D throttle modes and ESC telemetry decoding.
 */

// Timing constants for DShot600 @ 600MHz F_CPU (1.67ns per cycle)
// DShot600 bitrate: 600 kbit/s -> Bit period = 1.667 us (1000 CPU cycles @ 600MHz)
// Bit 0: 625 ns HIGH (375 cycles), 1042 ns LOW (625 cycles)
// Bit 1: 1250 ns HIGH (750 cycles), 417 ns LOW (250 cycles)
#define DSHOT600_BIT_CYCLES          1000
#define DSHOT600_T0H_CYCLES          375
#define DSHOT600_T1H_CYCLES          750

// DShot command and range definitions
#define DSHOT_CMD_MOTOR_STOP         0
#define DSHOT_CMD_BEACON1            1
#define DSHOT_CMD_BEACON2            2
#define DSHOT_CMD_BEACON3            3
#define DSHOT_CMD_BEACON4            4
#define DSHOT_CMD_BEACON5            5
#define DSHOT_CMD_ESC_INFO           6
#define DSHOT_CMD_SPIN_DIR_1         7
#define DSHOT_CMD_SPIN_DIR_2         8
#define DSHOT_CMD_3D_MODE_OFF        9
#define DSHOT_CMD_3D_MODE_ON         10
#define DSHOT_CMD_SETTINGS_SAVE      12
#define DSHOT_CMD_SPIN_DIR_NORMAL    20
#define DSHOT_CMD_SPIN_DIR_REVERSED  21

#define DSHOT_MIN_THROTTLE           48
#define DSHOT_MAX_THROTTLE           2047
#define DSHOT_RANGE                  (DSHOT_MAX_THROTTLE - DSHOT_MIN_THROTTLE)

// 3D Bidirectional Throttle boundaries
#define DSHOT_3D_DEADBAND_LOW        1047
#define DSHOT_3D_DEADBAND_HIGH       1048
#define DSHOT_3D_REVERSE_MIN         48
#define DSHOT_3D_REVERSE_MAX         1046
#define DSHOT_3D_FORWARD_MIN         1049
#define DSHOT_3D_FORWARD_MAX         2047

// Telemetry parsing constants
#define ESC_TELEMETRY_FRAME_LEN      10
#define MOTOR_POLE_PAIRS             6  // PropDrive 2836 12-pole / 6 pole pairs

struct ESCTelemetryData {
    uint8_t  temperature_c;     // Temperature in degrees Celsius
    uint16_t voltage_celsius_mv;// Voltage in millivolts
    uint16_t current_ca;        // Current in centiamperes (10mA steps)
    uint16_t consumption_mah;   // Consumed capacity in mAh
    uint16_t erpm_raw;          // Raw eRPM (eRPM / 100)
    float    rpm;               // True mechanical motor RPM
    bool     valid;             // Checksum passed
    uint32_t last_update_ms;    // Timestamp of last valid frame
};

class DShotDriver {
public:
    enum Mode {
        MODE_UNIDIRECTIONAL = 0, // 0.0 to 1.0 (DShot 48 to 2047)
        MODE_BIDIRECTIONAL_3D = 1 // -1.0 to +1.0 (3D mode with center stop)
    };

    DShotDriver(uint8_t pin_left = 4, uint8_t pin_right = 5);

    /**
     * @brief Initialize GPIOs and hardware cycle counter
     * @param mode Unidirectional or 3D Bidirectional
     */
    void begin(Mode mode = MODE_UNIDIRECTIONAL);

    /**
     * @brief Arm ESCs with neutral/zero throttle pulses
     * @param burst_count Number of zero-frames to send (typical 100-300)
     */
    void armESCs(uint16_t burst_count = 200);

    /**
     * @brief Set normalized throttles
     * @param left_norm  Left motor throttle (-1.0 to 1.0 or 0.0 to 1.0)
     * @param right_norm Right motor throttle (-1.0 to 1.0 or 0.0 to 1.0)
     */
    void setThrottles(float left_norm, float right_norm);

    /**
     * @brief Send raw 11-bit DShot command words to ESCs
     * @param left_cmd  Left command (0..2047)
     * @param right_cmd Right command (0..2047)
     * @param req_telemetry Request telemetry bit in frame
     */
    void setRawCommands(uint16_t left_cmd, uint16_t right_cmd, bool req_telemetry = false);

    /**
     * @brief Execute cycle-accurate DShot600 bit-bang frame transmission
     * Transmits left and right ESC frames in parallel to eliminate phase jitter.
     */
    void sendFrame();

    /**
     * @brief Parse ESC telemetry serial stream (KISS / AM32 / BLHeli32 format)
     * @param serial_port Pointer to HardwareSerial instance (e.g. Serial2)
     * @param is_left True for left ESC, false for right ESC
     */
    void processSerialTelemetry(uint8_t byte_in, bool is_left);

    /**
     * @brief Update simulated or extrapolated telemetry when hardware telemetry absent
     * @param left_command_norm Last commanded throttle
     * @param right_command_norm Last commanded throttle
     */
    void updateEstimatedTelemetry(float left_command_norm, float right_command_norm);

    // Telemetry getters
    float getLeftRPM() const { return _telem_left.rpm; }
    float getRightRPM() const { return _telem_right.rpm; }
    float getVoltageV() const { return (float)_telem_left.voltage_celsius_mv / 1000.0f; }
    float getCurrentA() const { return (float)(_telem_left.current_ca + _telem_right.current_ca) / 100.0f; }
    uint8_t getLeftTempC() const { return _telem_left.temperature_c; }
    uint8_t getRightTempC() const { return _telem_right.temperature_c; }
    bool isTelemetryValid() const { return _telem_left.valid || _telem_right.valid; }

    uint16_t getLeftPacket() const { return _packet_left; }
    uint16_t getRightPacket() const { return _packet_right; }

    /**
     * @brief Convert normalized throttle [-1.0..1.0] to DShot 11-bit word
     */
    uint16_t throttleToCommand(float throttle_norm) const;

    /**
     * @brief Build 16-bit DShot frame (11-bit data + 1-bit telemetry + 4-bit CRC)
     */
    static uint16_t buildDShotPacket(uint16_t command, bool request_telemetry);

    /**
     * @brief Compute 4-bit DShot CRC
     */
    static uint8_t computeCRC(uint16_t data);

    /**
     * @brief Update ESC telemetry CRC8 (polynomial 0x07)
     */
    static uint8_t updateCRC8(uint8_t crc, uint8_t data);

private:
    uint8_t _pin_left;
    uint8_t _pin_right;
    Mode    _mode;

    uint16_t _packet_left;
    uint16_t _packet_right;

    ESCTelemetryData _telem_left;
    ESCTelemetryData _telem_right;

    // Buffer for serial telemetry decoding
    uint8_t _telem_buf_left[ESC_TELEMETRY_FRAME_LEN];
    uint8_t _telem_buf_right[ESC_TELEMETRY_FRAME_LEN];
    uint8_t _telem_idx_left;
    uint8_t _telem_idx_right;

    void decodeTelemetryPacket(const uint8_t *buf, ESCTelemetryData &telem);
};

#endif // DSHOT_DRIVER_H
