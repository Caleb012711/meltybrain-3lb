#include "CRSFReceiver.h"

// CRSF DVB-S2 CRC8 lookup table (polynomial 0xD5)
static const uint8_t crsf_crc_table[256] = {
    0x00, 0xD5, 0x7F, 0xAA, 0xFE, 0x2B, 0x81, 0x54, 0x29, 0xFC, 0x56, 0x83, 0xD7, 0x02, 0xA8, 0x7D,
    0x52, 0x87, 0x2D, 0xF8, 0xAC, 0x79, 0xD3, 0x06, 0x7B, 0xAE, 0x04, 0xD1, 0x85, 0x50, 0xFA, 0x2F,
    0xA4, 0x71, 0xDB, 0x0E, 0x5A, 0x8F, 0x25, 0xF0, 0x8D, 0x58, 0xF2, 0x27, 0x73, 0xA6, 0x0C, 0xD9,
    0xF6, 0x23, 0x89, 0x5C, 0x08, 0xDD, 0x77, 0xA2, 0xDF, 0x0A, 0xA0, 0x75, 0x21, 0xF4, 0x5E, 0x8B,
    0x9D, 0x48, 0xE2, 0x37, 0x63, 0xB6, 0x1C, 0xC9, 0xB4, 0x61, 0xCB, 0x1E, 0x4A, 0x9F, 0x35, 0xE0,
    0xCF, 0x1A, 0xB0, 0x65, 0x31, 0xE4, 0x4E, 0x9B, 0xE6, 0x33, 0x99, 0x4C, 0x18, 0xCD, 0x67, 0xB2,
    0x39, 0xEC, 0x46, 0x93, 0xC7, 0x12, 0xB8, 0x6D, 0x10, 0xC5, 0x6F, 0xBA, 0xEE, 0x3B, 0x91, 0x44,
    0x6B, 0xBE, 0x14, 0xC1, 0x95, 0x40, 0xEA, 0x3F, 0x42, 0x97, 0x3D, 0xE8, 0xBC, 0x69, 0xC3, 0x16,
    0xEF, 0x3A, 0x90, 0x45, 0x11, 0xC4, 0x6E, 0xBB, 0xC6, 0x13, 0xB9, 0x6C, 0x38, 0xED, 0x47, 0x92,
    0xBD, 0x68, 0xC2, 0x17, 0x43, 0x96, 0x3C, 0xE9, 0x94, 0x41, 0xEB, 0x3E, 0x6A, 0xBF, 0x15, 0xC0,
    0x4B, 0x9E, 0x34, 0xE1, 0xB5, 0x60, 0xCA, 0x1F, 0x62, 0xB7, 0x1D, 0xC8, 0x9C, 0x49, 0xE3, 0x36,
    0x19, 0xCC, 0x66, 0xB3, 0xE7, 0x32, 0x98, 0x4D, 0x30, 0xE5, 0x4F, 0x9A, 0xCE, 0x1B, 0xB1, 0x64,
    0x72, 0xA7, 0x0D, 0xD8, 0x8C, 0x59, 0xF3, 0x26, 0x5B, 0x8E, 0x24, 0xF1, 0xA5, 0x70, 0xDA, 0x0F,
    0x20, 0xF5, 0x5F, 0x8A, 0xDE, 0x0B, 0xA1, 0x74, 0x09, 0xDC, 0x76, 0xA3, 0xF7, 0x22, 0x88, 0x5D,
    0xD6, 0x03, 0xA9, 0x7C, 0x28, 0xFD, 0x57, 0x82, 0xFF, 0x2A, 0x80, 0x55, 0x01, 0xD4, 0x7E, 0xAB,
    0x84, 0x51, 0xFB, 0x2E, 0x7A, 0xAF, 0x05, 0xD0, 0xAD, 0x78, 0xD2, 0x07, 0x53, 0x86, 0x2C, 0xF9
};

uint8_t CRSFReceiver::crc8_dvb_s2(uint8_t crc, uint8_t a) {
    return crsf_crc_table[crc ^ a];
}

CRSFReceiver::CRSFReceiver()
    : _rx_index(0),
      _expected_len(0),
      _last_valid_frame_ms(0),
      _failsafe(true) {
    for (uint8_t i = 0; i < CRSF_NUM_CHANNELS; i++) {
        _channels[i] = CRSF_CHANNEL_MID;
    }
    _channels[0] = CRSF_CHANNEL_MIN; // Throttle default to 0
    memset(&_link_stats, 0, sizeof(_link_stats));
}

void CRSFReceiver::begin() {
#ifdef ARDUINO
    Serial1.begin(CRSF_BAUDRATE, SERIAL_8N1);
#endif
    _last_valid_frame_ms = 0;
    _failsafe = true;
}

bool CRSFReceiver::update() {
    bool got_channels = false;

#ifdef ARDUINO
    while (Serial1.available() > 0) {
        uint8_t b = Serial1.read();

        if (_rx_index == 0) {
            // First byte must be destination address
            if (b == CRSF_ADDRESS_FLIGHT_CONTROLLER || b == CRSF_ADDRESS_CRSF_RECEIVER ||
                b == CRSF_ADDRESS_CRSF_TRANSMITTER || b == 0x00) {
                _rx_buffer[_rx_index++] = b;
            }
        } else if (_rx_index == 1) {
            // Second byte is length (Type + Payload + CRC)
            if (b >= 2 && b <= (CRSF_MAX_PACKET_LEN - 2)) {
                _expected_len = b;
                _rx_buffer[_rx_index++] = b;
            } else {
                _rx_index = 0; // Invalid length
            }
        } else {
            _rx_buffer[_rx_index++] = b;

            // Total frame size = 2 (header) + _expected_len
            if (_rx_index >= (_expected_len + 2)) {
                // Validate CRC
                uint8_t crc = 0;
                // CRC starts from byte 2 (Type) to byte (total - 2)
                for (uint8_t i = 2; i < (_rx_index - 1); i++) {
                    crc = crc8_dvb_s2(crc, _rx_buffer[i]);
                }

                if (crc == _rx_buffer[_rx_index - 1]) {
                    processPacket();
                    if (_rx_buffer[2] == CRSF_FRAMETYPE_RC_CHANNELS_PACKED) {
                        got_channels = true;
                    }
                }

                _rx_index = 0;
            }
        }
    }

    uint32_t now = millis();
    if (now - _last_valid_frame_ms > CRSF_FAILSAFE_TIMEOUT_MS) {
        _failsafe = true;
    }
#endif

    return got_channels;
}

void CRSFReceiver::processPacket() {
    uint8_t type = _rx_buffer[2];
    const uint8_t *payload = &_rx_buffer[3];

    if (type == CRSF_FRAMETYPE_RC_CHANNELS_PACKED) {
        decodeChannels(payload);
#ifdef ARDUINO
        _last_valid_frame_ms = millis();
#endif
        _failsafe = false;
    } else if (type == CRSF_FRAMETYPE_LINK_STATISTICS) {
        decodeLinkStatistics(payload);
    }
}

void CRSFReceiver::decodeChannels(const uint8_t *p) {
    // 22 payload bytes pack 16x 11-bit channels
    _channels[0]  = (uint16_t)((p[0]       | (p[1] << 8))                      & 0x07FF);
    _channels[1]  = (uint16_t)(((p[1] >> 3) | (p[2] << 5))                      & 0x07FF);
    _channels[2]  = (uint16_t)(((p[2] >> 6) | (p[3] << 2) | (p[4] << 10))       & 0x07FF);
    _channels[3]  = (uint16_t)(((p[4] >> 1) | (p[5] << 7))                      & 0x07FF);
    _channels[4]  = (uint16_t)(((p[5] >> 4) | (p[6] << 4))                      & 0x07FF);
    _channels[5]  = (uint16_t)(((p[6] >> 7) | (p[7] << 1) | (p[8] << 9))       & 0x07FF);
    _channels[6]  = (uint16_t)(((p[8] >> 2) | (p[9] << 6))                      & 0x07FF);
    _channels[7]  = (uint16_t)(((p[9] >> 5) | (p[10] << 3))                     & 0x07FF);
    _channels[8]  = (uint16_t)((p[11]      | (p[12] << 8))                     & 0x07FF);
    _channels[9]  = (uint16_t)(((p[12] >> 3)| (p[13] << 5))                     & 0x07FF);
    _channels[10] = (uint16_t)(((p[13] >> 6)| (p[14] << 2) | (p[15] << 10))     & 0x07FF);
    _channels[11] = (uint16_t)(((p[15] >> 1)| (p[16] << 7))                     & 0x07FF);
    _channels[12] = (uint16_t)(((p[16] >> 4)| (p[17] << 4))                     & 0x07FF);
    _channels[13] = (uint16_t)(((p[17] >> 7)| (p[18] << 1) | (p[19] << 9))     & 0x07FF);
    _channels[14] = (uint16_t)(((p[19] >> 2)| (p[20] << 6))                     & 0x07FF);
    _channels[15] = (uint16_t)(((p[20] >> 5)| (p[21] << 3))                     & 0x07FF);
}

void CRSFReceiver::decodeLinkStatistics(const uint8_t *p) {
    _link_stats.uplink_rssi_1 = -(int8_t)p[0];
    _link_stats.uplink_rssi_2 = -(int8_t)p[1];
    _link_stats.uplink_link_quality = p[2];
    _link_stats.uplink_snr = (int8_t)p[3];
    _link_stats.rf_mode = p[5];
    _link_stats.tx_power_mw = p[6];
}

uint16_t CRSFReceiver::getChannelRaw(uint8_t ch) const {
    if (ch < CRSF_NUM_CHANNELS) {
        return _channels[ch];
    }
    return CRSF_CHANNEL_MID;
}

float CRSFReceiver::getThrottle() const {
    // CH1 (index 0): Spin throttle [0.0 .. 1.0]
    uint16_t raw = _channels[0];
    if (raw <= CRSF_CHANNEL_MIN) return 0.0f;
    if (raw >= CRSF_CHANNEL_MAX) return 1.0f;
    return (float)(raw - CRSF_CHANNEL_MIN) / (float)(CRSF_CHANNEL_MAX - CRSF_CHANNEL_MIN);
}

float CRSFReceiver::getRoll() const {
    // CH2 (index 1): Roll [-1.0 .. +1.0]
    int16_t diff = (int16_t)_channels[1] - CRSF_CHANNEL_MID;
    float norm = (float)diff / (float)(CRSF_CHANNEL_MAX - CRSF_CHANNEL_MID);
    if (norm < -1.0f) norm = -1.0f;
    if (norm > 1.0f) norm = 1.0f;
    // Deadband 0.03
    if (fabsf(norm) < 0.03f) return 0.0f;
    return norm;
}

float CRSFReceiver::getPitch() const {
    // CH3 (index 2): Pitch [-1.0 .. +1.0]
    int16_t diff = (int16_t)_channels[2] - CRSF_CHANNEL_MID;
    float norm = (float)diff / (float)(CRSF_CHANNEL_MAX - CRSF_CHANNEL_MID);
    if (norm < -1.0f) norm = -1.0f;
    if (norm > 1.0f) norm = 1.0f;
    if (fabsf(norm) < 0.03f) return 0.0f;
    return norm;
}

float CRSFReceiver::getYaw() const {
    // CH4 (index 3): Yaw [-1.0 .. +1.0]
    int16_t diff = (int16_t)_channels[3] - CRSF_CHANNEL_MID;
    float norm = (float)diff / (float)(CRSF_CHANNEL_MAX - CRSF_CHANNEL_MID);
    if (norm < -1.0f) norm = -1.0f;
    if (norm > 1.0f) norm = 1.0f;
    if (fabsf(norm) < 0.03f) return 0.0f;
    return norm;
}

bool CRSFReceiver::isArmSwitchActive() const {
    // SA Switch (CH5, index 4): High > 1500us -> Armed
    return (_channels[4] > (CRSF_CHANNEL_MID + 200));
}

MeltyDriveModeSelect CRSFReceiver::getModeSelect() const {
    // SB Switch (CH6, index 5): 3-position switch
    uint16_t val = _channels[5];
    if (val < (CRSF_CHANNEL_MID - 300)) {
        return DRIVE_MODE_MANUAL;
    } else if (val > (CRSF_CHANNEL_MID + 300)) {
        return DRIVE_MODE_CALIBRATE;
    } else {
        return DRIVE_MODE_AI_HUNT;
    }
}

uint8_t CRSFReceiver::getLEDMode() const {
    // SC Switch (CH7, index 6)
    uint16_t val = _channels[6];
    if (val < (CRSF_CHANNEL_MID - 200)) return 0; // Off
    if (val > (CRSF_CHANNEL_MID + 200)) return 2; // High / Dual
    return 1; // Standard Front
}

bool CRSFReceiver::isEmergencyKillTriggered() const {
    // SD Switch (CH8, index 7): Emergency cut when flipped
    return (_channels[7] > (CRSF_CHANNEL_MID + 200));
}

float CRSFReceiver::getTranslationMagnitude() const {
    float x = getRoll();
    float y = getPitch();
    float mag = sqrtf(x * x + y * y);
    if (mag > 1.0f) mag = 1.0f;
    return mag;
}

float CRSFReceiver::getTranslationAngleRad() const {
    // atan2(y, x): 0 rad = East (+X / Right), pi/2 rad = North (+Y / Forward)
    return atan2f(getPitch(), getRoll());
}

bool CRSFReceiver::isFailsafe() const {
    return _failsafe;
}
