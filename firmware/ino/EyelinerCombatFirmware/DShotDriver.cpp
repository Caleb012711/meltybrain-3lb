#include "DShotDriver.h"

// Lookup table for CRC8 (ATM-8 polynomial 0x07)
static const uint8_t crc8_tab[256] = {
    0x00, 0x07, 0x0E, 0x09, 0x1C, 0x1B, 0x12, 0x15, 0x38, 0x3F, 0x36, 0x31, 0x24, 0x23, 0x2A, 0x2D,
    0x70, 0x77, 0x7E, 0x79, 0x6C, 0x6B, 0x62, 0x65, 0x48, 0x4F, 0x46, 0x41, 0x54, 0x53, 0x5A, 0x5D,
    0xE0, 0xE7, 0xEE, 0xE9, 0xFC, 0xFB, 0xF2, 0xF5, 0xD8, 0xDF, 0xD6, 0xD1, 0xC4, 0xC3, 0xCA, 0xCD,
    0x90, 0x97, 0x9E, 0x99, 0x8C, 0x8B, 0x82, 0x85, 0xA8, 0xAF, 0xA6, 0xA1, 0xB4, 0xB3, 0xBA, 0xBD,
    0xC7, 0xC0, 0xC9, 0xCE, 0xDB, 0xDC, 0xD5, 0xD2, 0xFF, 0xF8, 0xF1, 0xF6, 0xE3, 0xE4, 0xED, 0xEA,
    0xB7, 0xB0, 0xB9, 0xBE, 0xAB, 0xAC, 0xA5, 0xA2, 0x8F, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9D, 0x9A,
    0x27, 0x20, 0x29, 0x2E, 0x3B, 0x3C, 0x35, 0x32, 0x1F, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0D, 0x0A,
    0x57, 0x50, 0x59, 0x5E, 0x4B, 0x4C, 0x45, 0x42, 0x6F, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7D, 0x7A,
    0x89, 0x8E, 0x87, 0x80, 0x95, 0x92, 0x9B, 0x9C, 0xB1, 0xB6, 0xBF, 0xB8, 0xAD, 0xAA, 0xA3, 0xA4,
    0xF9, 0xFE, 0xF7, 0xF0, 0xE5, 0xE2, 0xEB, 0xEC, 0xC1, 0xC6, 0xCF, 0xC8, 0xDD, 0xDA, 0xD3, 0xD4,
    0x69, 0x6E, 0x67, 0x60, 0x75, 0x72, 0x7B, 0x7C, 0x51, 0x56, 0x5F, 0x58, 0x4D, 0x4A, 0x43, 0x44,
    0x19, 0x1E, 0x17, 0x10, 0x05, 0x02, 0x0B, 0x0C, 0x21, 0x26, 0x2F, 0x28, 0x3D, 0x3A, 0x33, 0x34,
    0x4E, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5C, 0x5B, 0x76, 0x71, 0x78, 0x7F, 0x6A, 0x6D, 0x64, 0x63,
    0x3E, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2C, 0x2B, 0x06, 0x01, 0x08, 0x0F, 0x1A, 0x1D, 0x14, 0x13,
    0xAE, 0xA9, 0xA0, 0xA7, 0xB2, 0xB5, 0xBC, 0xBB, 0x96, 0x91, 0x98, 0x9F, 0x8A, 0x8D, 0x84, 0x83,
    0xDE, 0xD9, 0xD0, 0xD7, 0xC2, 0xC5, 0xCC, 0xCB, 0xE6, 0xE1, 0xE8, 0xEF, 0xFA, 0xFD, 0xF4, 0xF3
};

DShotDriver::DShotDriver(uint8_t pin_left, uint8_t pin_right)
    : _pin_left(pin_left),
      _pin_right(pin_right),
      _mode(MODE_UNIDIRECTIONAL),
      _packet_left(0),
      _packet_right(0),
      _telem_idx_left(0),
      _telem_idx_right(0) {
    memset(&_telem_left, 0, sizeof(_telem_left));
    memset(&_telem_right, 0, sizeof(_telem_right));
}

void DShotDriver::begin(Mode mode) {
    _mode = mode;

#ifdef ARDUINO
    pinMode(_pin_left, OUTPUT);
    pinMode(_pin_right, OUTPUT);
    digitalWriteFast(_pin_left, LOW);
    digitalWriteFast(_pin_right, LOW);

    // Enable ARM DWT cycle counter if running on ARM Cortex-M
#if defined(__arm__) && defined(CORE_TEENSY)
    ARM_DEMCR |= ARM_DEMCR_TRCENA;
    ARM_DWT_CTRL |= ARM_DWT_CTRL_CYCCNTENA;
#endif
#endif

    _packet_left = buildDShotPacket(DSHOT_CMD_MOTOR_STOP, false);
    _packet_right = buildDShotPacket(DSHOT_CMD_MOTOR_STOP, false);
}

void DShotDriver::armESCs(uint16_t burst_count) {
    uint16_t stop_cmd = (_mode == MODE_BIDIRECTIONAL_3D) ? DSHOT_3D_DEADBAND_LOW : DSHOT_CMD_MOTOR_STOP;
    setRawCommands(stop_cmd, stop_cmd, false);

    for (uint16_t i = 0; i < burst_count; i++) {
        sendFrame();
#ifdef ARDUINO
        delayMicroseconds(1000); // 1 kHz burst rate
#endif
    }
}

uint16_t DShotDriver::throttleToCommand(float throttle_norm) const {
    if (_mode == MODE_BIDIRECTIONAL_3D) {
        // 3D Bidirectional: [-1.0 .. +1.0]
        if (throttle_norm > 0.02f) {
            // Forward: 1049 to 2047
            float t = (throttle_norm > 1.0f) ? 1.0f : throttle_norm;
            return (uint16_t)(DSHOT_3D_FORWARD_MIN + t * (DSHOT_3D_FORWARD_MAX - DSHOT_3D_FORWARD_MIN));
        } else if (throttle_norm < -0.02f) {
            // Reverse: 1046 down to 48
            float t = (throttle_norm < -1.0f) ? 1.0f : -throttle_norm;
            return (uint16_t)(DSHOT_3D_REVERSE_MAX - t * (DSHOT_3D_REVERSE_MAX - DSHOT_3D_REVERSE_MIN));
        } else {
            return DSHOT_3D_DEADBAND_LOW; // Neutral / Stop
        }
    } else {
        // Unidirectional: [0.0 .. 1.0]
        if (throttle_norm <= 0.01f) {
            return DSHOT_CMD_MOTOR_STOP;
        }
        float t = (throttle_norm > 1.0f) ? 1.0f : throttle_norm;
        return (uint16_t)(DSHOT_MIN_THROTTLE + t * DSHOT_RANGE);
    }
}

void DShotDriver::setThrottles(float left_norm, float right_norm) {
    uint16_t cmd_l = throttleToCommand(left_norm);
    uint16_t cmd_r = throttleToCommand(right_norm);
    setRawCommands(cmd_l, cmd_r, false);
}

void DShotDriver::setRawCommands(uint16_t left_cmd, uint16_t right_cmd, bool req_telemetry) {
    _packet_left = buildDShotPacket(left_cmd, req_telemetry);
    _packet_right = buildDShotPacket(right_cmd, req_telemetry);
}

uint8_t DShotDriver::computeCRC(uint16_t data) {
    // 4-bit CRC = XOR of 3 nibbles
    return (uint8_t)((data ^ (data >> 4) ^ (data >> 8)) & 0x0F);
}

uint16_t DShotDriver::buildDShotPacket(uint16_t command, bool request_telemetry) {
    if (command > DSHOT_MAX_THROTTLE) {
        command = DSHOT_MAX_THROTTLE;
    }
    uint16_t packet = (command << 1) | (request_telemetry ? 1 : 0);
    uint8_t crc = computeCRC(packet);
    return (packet << 4) | crc;
}

void DShotDriver::sendFrame() {
#if defined(ARDUINO) && defined(CORE_TEENSY)
    // Hardware DShot600 bit-bang on Teensy 4.0 (600MHz Cortex-M7)
    // Disables interrupts for exactly 27 us to guarantee zero-jitter frame timing
    uint32_t cycles_per_bit = (F_CPU / 1000000) * 1667 / 1000; // 1000 cycles
    uint32_t cycles_t0h     = (F_CPU / 1000000) * 625  / 1000; // 375 cycles
    uint32_t cycles_t1h     = (F_CPU / 1000000) * 1250 / 1000; // 750 cycles

    uint16_t p_left = _packet_left;
    uint16_t p_right = _packet_right;

    noInterrupts();

    uint32_t start_cycle = ARM_DWT_CYCCNT;

    for (int8_t bit = 15; bit >= 0; bit--) {
        uint32_t bit_start = start_cycle + (15 - bit) * cycles_per_bit;

        bool b_left = (p_left >> bit) & 0x01;
        bool b_right = (p_right >> bit) & 0x01;

        uint32_t t_high_left  = b_left  ? cycles_t1h : cycles_t0h;
        uint32_t t_high_right = b_right ? cycles_t1h : cycles_t0h;

        // Drive both pins HIGH
        digitalWriteFast(_pin_left, HIGH);
        digitalWriteFast(_pin_right, HIGH);

        // Wait until shorter high pulse expires
        if (t_high_left <= t_high_right) {
            while ((ARM_DWT_CYCCNT - bit_start) < t_high_left) {}
            digitalWriteFast(_pin_left, LOW);

            while ((ARM_DWT_CYCCNT - bit_start) < t_high_right) {}
            digitalWriteFast(_pin_right, LOW);
        } else {
            while ((ARM_DWT_CYCCNT - bit_start) < t_high_right) {}
            digitalWriteFast(_pin_right, LOW);

            while ((ARM_DWT_CYCCNT - bit_start) < t_high_left) {}
            digitalWriteFast(_pin_left, LOW);
        }

        // Wait for remainder of bit period
        while ((ARM_DWT_CYCCNT - bit_start) < cycles_per_bit) {}
    }

    // Ensure pins are LOW at end of frame
    digitalWriteFast(_pin_left, LOW);
    digitalWriteFast(_pin_right, LOW);

    interrupts();
#endif
}

uint8_t DShotDriver::updateCRC8(uint8_t crc, uint8_t data) {
    return crc8_tab[crc ^ data];
}

void DShotDriver::decodeTelemetryPacket(const uint8_t *buf, ESCTelemetryData &telem) {
    // Checksum validation
    uint8_t crc = 0;
    for (uint8_t i = 0; i < 9; i++) {
        crc = updateCRC8(crc, buf[i]);
    }

    if (crc == buf[9]) {
        telem.temperature_c = buf[0];
        telem.voltage_celsius_mv = ((uint16_t)buf[1] << 8) | buf[2];
        telem.current_ca = ((uint16_t)buf[3] << 8) | buf[4];
        telem.consumption_mah = ((uint16_t)buf[5] << 8) | buf[6];
        telem.erpm_raw = ((uint16_t)buf[7] << 8) | buf[8];

        // Mechanical RPM = (eRPM * 100) / pole_pairs
        telem.rpm = ((float)telem.erpm_raw * 100.0f) / (float)MOTOR_POLE_PAIRS;
        telem.valid = true;
#ifdef ARDUINO
        telem.last_update_ms = millis();
#endif
    }
}

void DShotDriver::processSerialTelemetry(uint8_t byte_in, bool is_left) {
    if (is_left) {
        _telem_buf_left[_telem_idx_left++] = byte_in;
        if (_telem_idx_left >= ESC_TELEMETRY_FRAME_LEN) {
            decodeTelemetryPacket(_telem_buf_left, _telem_left);
            _telem_idx_left = 0;
        }
    } else {
        _telem_buf_right[_telem_idx_right++] = byte_in;
        if (_telem_idx_right >= ESC_TELEMETRY_FRAME_LEN) {
            decodeTelemetryPacket(_telem_buf_right, _telem_right);
            _telem_idx_right = 0;
        }
    }
}

void DShotDriver::updateEstimatedTelemetry(float left_command_norm, float right_command_norm) {
    // Fallback motor model for bench testing or when telemetry line is unpopulated
    // 1200KV on 4S (14.8V nominal) -> ~17,700 motor RPM max under load
    const float MAX_MOTOR_RPM = 14500.0f;
    float l_clamped = (left_command_norm < 0.0f) ? -left_command_norm : left_command_norm;
    float r_clamped = (right_command_norm < 0.0f) ? -right_command_norm : right_command_norm;
    if (l_clamped > 1.0f) l_clamped = 1.0f;
    if (r_clamped > 1.0f) r_clamped = 1.0f;

    _telem_left.rpm = l_clamped * MAX_MOTOR_RPM;
    _telem_right.rpm = r_clamped * MAX_MOTOR_RPM;
    _telem_left.voltage_celsius_mv = 15200; // 15.2V simulated 4S
    _telem_right.voltage_celsius_mv = 15200;
}
