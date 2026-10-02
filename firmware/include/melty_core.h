#ifndef MELTY_CORE_H
#define MELTY_CORE_H

#include "melty_config.h"
#include "dual_h3lis331.h"
#include "melty_heading.h"
#include "melty_drive.h"
#include "melty_failsafe.h"
#include "melty_telemetry.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    DualH3LIS331_Tracker_t tracker;
    MeltyHeadingEstimator_t heading;
    MeltyDriveModulator_t drive;
    MeltyFailsafe_t failsafe;
    MeltyRCInput_t rc;
    MeltyTelemetryPacket_t telemetry;
    
    /* Global operational parameters */
    float spin_direction;      /**< +1.0 for CCW, -1.0 for CW */
    uint32_t last_telemetry_ms;
} MeltyCore_t;

/**
 * Initialize all meltybrain sub-systems.
 */
void melty_core_init(MeltyCore_t *core, float r1_m, float r2_m);

/**
 * Execute one cycle of the fast control loop (1kHz to 8kHz).
 * 
 * @param core Core instance
 * @param s1_raw Raw SPI sample from Sensor 1
 * @param s2_raw Raw SPI sample from Sensor 2
 * @param dt Loop delta time in seconds
 * @param now_us System time in microseconds
 */
void melty_core_step(MeltyCore_t *core,
                     const H3LIS331_RawSample_t *s1_raw,
                     const H3LIS331_RawSample_t *s2_raw,
                     float dt,
                     uint32_t now_us);

/**
 * Process an external beacon sync pulse event.
 */
bool melty_core_on_beacon_pulse(MeltyCore_t *core, uint32_t timestamp_us, float azimuth_rad);

/**
 * Update RC input state from CRSF or SBUS receiver.
 */
void melty_core_update_rc(MeltyCore_t *core, const MeltyRCInput_t *rc);

#ifdef __cplusplus
}
#endif

#endif /* MELTY_CORE_H */
