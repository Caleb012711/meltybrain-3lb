#ifndef MELTY_TELEMETRY_H
#define MELTY_TELEMETRY_H

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MELTY_TELEMETRY_MAGIC 0x4D54 /* "MT" */

/**
 * Packed binary telemetry packet for CRSF / Pi UART / Pit Radio @ 50Hz
 */
typedef struct __attribute__((packed)) {
    uint16_t magic;              /**< Header magic 0x4D54 */
    uint32_t timestamp_ms;       /**< Onboard uptime in ms */
    uint16_t rpm;                /**< Current fused RPM (0-65535) */
    int16_t  heading_degi_deg;   /**< Current heading in 0.1 deg increments (-1800 to +1800) */
    uint16_t vbat_mv;            /**< Battery voltage in millivolts */
    int16_t  accel_radial_g_x10; /**< Centripetal accel in 0.1g units */
    int16_t  cor_shift_um;       /**< Center of rotation shift in micrometers */
    uint8_t  system_state;       /**< MeltySystemState_t */
    uint8_t  beacon_flags;       /**< Bit 0: Locked, Bit 1: LED active */
    uint8_t  link_quality_pct;   /**< RC Link quality % */
    uint8_t  crc8;               /**< Dallas/Maxim CRC8 over packet payload */
} MeltyTelemetryPacket_t;

/**
 * Encode telemetry packet from current state.
 */
void melty_telemetry_encode(MeltyTelemetryPacket_t *pkt,
                            uint32_t now_ms,
                            float rpm,
                            float heading_rad,
                            uint16_t vbat_mv,
                            float radial_accel_mss,
                            float cor_shift_m,
                            uint8_t system_state,
                            bool beacon_locked,
                            bool led_active,
                            uint8_t link_quality_pct);

/**
 * Calculate CRC-8 over byte buffer.
 */
uint8_t melty_crc8(const uint8_t *data, size_t len);

#ifdef __cplusplus
}
#endif

#endif /* MELTY_TELEMETRY_H */
