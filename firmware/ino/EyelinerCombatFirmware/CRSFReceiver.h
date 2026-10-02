#ifndef CRSF_RECEIVER_H
#define CRSF_RECEIVER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef ARDUINO
#include <Arduino.h>
#else
#include <cmath>
#include <cstring>
#endif

/**
 * @file CRSFReceiver.h
 * @brief High-speed CRSF / ExpressLRS Receiver parser for RadioMaster Pocket
 *
 * Runs on Teensy 4.0 Serial1 (Pin 0 = RX1, Pin 1 = TX1) @ 420,000 baud.
 * Decodes 16-channel 11-bit packed frames with sub-millisecond latency.
 *
 * Channel Map:
 * CH1: Throttle -> Melty Spin RPM (0 to 3500 RPM)
 * CH2: Roll     -> Translation Vector X [-1.0 to 1.0]
 * CH3: Pitch    -> Translation Vector Y [-1.0 to 1.0]
 * CH4: Yaw      -> Heading Trim / Manual Rotate
 * CH5: SA Switch -> Arming Interlock (Low=Disarm, High=Arm)
 * CH6: SB Switch -> Mode Select (Pos0=Melty Manual, Pos1=Auto AI Hunt, Pos2=Reserved)
 * CH7: SC Switch -> Heading LED Mode (Off / Low / High / Flash)
 * CH8: SD Switch -> Emergency Kill Switch (Instant Cut)
 */

#define CRSF_BAUDRATE                 420000
#define CRSF_MAX_PACKET_LEN           64
#define CRSF_NUM_CHANNELS             16
#define CRSF_FAILSAFE_TIMEOUT_MS      100

// CRSF Addresses
#define CRSF_ADDRESS_CRSF_TRANSMITTER 0xEE
#define CRSF_ADDRESS_RADIO_TRANSMITTER 0xEA
#define CRSF_ADDRESS_FLIGHT_CONTROLLER 0xC8
#define CRSF_ADDRESS_CRSF_RECEIVER    0xEC

// CRSF Frame Types
#define CRSF_FRAMETYPE_GPS            0x02
#define CRSF_FRAMETYPE_BATTERY_SENSOR 0x08
#define CRSF_FRAMETYPE_LINK_STATISTICS 0x14
#define CRSF_FRAMETYPE_RC_CHANNELS_PACKED 0x16
#define CRSF_FRAMETYPE_ATTITUDE       0x1E
#define CRSF_FRAMETYPE_FLIGHT_MODE    0x21

// CRSF Channel values (11-bit)
#define CRSF_CHANNEL_MIN              172   // ~988 us
#define CRSF_CHANNEL_MID              992   // ~1500 us
#define CRSF_CHANNEL_MAX              1811  // ~2012 us

enum MeltyDriveModeSelect {
    DRIVE_MODE_MANUAL = 0,
    DRIVE_MODE_AI_HUNT = 1,
    DRIVE_MODE_CALIBRATE = 2
};

struct CRSFLinkStatistics {
    int8_t  uplink_rssi_1;
    int8_t  uplink_rssi_2;
    uint8_t uplink_link_quality;
    int8_t  uplink_snr;
    uint8_t rf_mode;
    uint8_t tx_power_mw;
};

class CRSFReceiver {
public:
    CRSFReceiver();

    /**
     * @brief Initialize Serial1 at 420000 baud 8N1
     */
    void begin();

    /**
     * @brief Poll Serial1 and process available bytes
     * @return True if a new valid RC channel frame was received
     */
    bool update();

    // Channel values: raw [172..1811]
    uint16_t getChannelRaw(uint8_t ch) const;

    // Normalized outputs:
    // [-1.0 .. +1.0] for Roll, Pitch, Yaw
    float getRoll() const;
    float getPitch() const;
    float getYaw() const;

    // [0.0 .. 1.0] for Spin Throttle
    float getThrottle() const;

    // Switches
    bool isArmSwitchActive() const;      // SA switch (CH5)
    MeltyDriveModeSelect getModeSelect() const; // SB switch (CH6)
    uint8_t getLEDMode() const;          // SC switch (CH7)
    bool isEmergencyKillTriggered() const; // SD switch (CH8)

    // Translation vector helpers
    float getTranslationMagnitude() const;
    float getTranslationAngleRad() const;

    // Link health
    bool isFailsafe() const;
    uint8_t getLinkQuality() const { return _link_stats.uplink_link_quality; }
    int8_t getRSSI() const { return _link_stats.uplink_rssi_1; }
    uint32_t getLastValidFrameTimeMs() const { return _last_valid_frame_ms; }

    static uint8_t crc8_dvb_s2(uint8_t crc, uint8_t a);

private:
    uint16_t _channels[CRSF_NUM_CHANNELS];
    CRSFLinkStatistics _link_stats;

    uint8_t _rx_buffer[CRSF_MAX_PACKET_LEN];
    uint8_t _rx_index;
    uint8_t _expected_len;

    uint32_t _last_valid_frame_ms;
    bool _failsafe;

    void processPacket();
    void decodeChannels(const uint8_t *payload);
    void decodeLinkStatistics(const uint8_t *payload);
};

#endif // CRSF_RECEIVER_H
