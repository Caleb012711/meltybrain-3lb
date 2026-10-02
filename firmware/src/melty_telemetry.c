#include "melty_telemetry.h"
#include <math.h>

#define RAD_TO_DEG (180.0f / 3.141592653589793f)
#define MSS_TO_G (1.0f / 9.80665f)

uint8_t melty_crc8(const uint8_t *data, size_t len) {
    uint8_t crc = 0x00;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (uint8_t j = 0; j < 8; j++) {
            if (crc & 0x80) {
                crc = (crc << 1) ^ 0x07;
            } else {
                crc <<= 1;
            }
        }
    }
    return crc;
}

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
                            uint8_t link_quality_pct) {
    if (!pkt) return;
    
    pkt->magic = MELTY_TELEMETRY_MAGIC;
    pkt->timestamp_ms = now_ms;
    
    float clamped_rpm = (rpm < 0.0f) ? 0.0f : ((rpm > 65535.0f) ? 65535.0f : rpm);
    pkt->rpm = (uint16_t)clamped_rpm;
    
    float heading_deg = heading_rad * RAD_TO_DEG;
    while (heading_deg > 180.0f) heading_deg -= 360.0f;
    while (heading_deg < -180.0f) heading_deg += 360.0f;
    pkt->heading_degi_deg = (int16_t)(heading_deg * 10.0f);
    
    pkt->vbat_mv = vbat_mv;
    
    float radial_g = radial_accel_mss * MSS_TO_G;
    pkt->accel_radial_g_x10 = (int16_t)(radial_g * 10.0f);
    
    pkt->cor_shift_um = (int16_t)(cor_shift_m * 1e6f);
    pkt->system_state = system_state;
    
    pkt->beacon_flags = 0;
    if (beacon_locked) pkt->beacon_flags |= (1 << 0);
    if (led_active)    pkt->beacon_flags |= (1 << 1);
    
    pkt->link_quality_pct = link_quality_pct;
    
    /* Calculate CRC-8 over packet contents up to crc8 field */
    pkt->crc8 = melty_crc8((const uint8_t*)pkt, offsetof(MeltyTelemetryPacket_t, crc8));
}
