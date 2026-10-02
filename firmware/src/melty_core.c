#include "melty_core.h"
#include <math.h>
#include <string.h>

void melty_core_init(MeltyCore_t *core, float r1_m, float r2_m) {
    if (!core) return;
    memset(core, 0, sizeof(MeltyCore_t));
    
    core->spin_direction = +1.0f; /* Default CCW spin */
    dual_h3lis331_init(&core->tracker, r1_m, r2_m);
    melty_heading_init(&core->heading);
    melty_drive_init(&core->drive);
    melty_failsafe_init(&core->failsafe);
}

void melty_core_update_rc(MeltyCore_t *core, const MeltyRCInput_t *rc) {
    if (!core || !rc) return;
    core->rc = *rc;
}

bool melty_core_on_beacon_pulse(MeltyCore_t *core, uint32_t timestamp_us, float azimuth_rad) {
    if (!core) return false;
    return melty_heading_on_beacon_pulse(&core->heading, timestamp_us, azimuth_rad);
}

void melty_core_step(MeltyCore_t *core,
                     const H3LIS331_RawSample_t *s1_raw,
                     const H3LIS331_RawSample_t *s2_raw,
                     float dt,
                     uint32_t now_us) {
    if (!core || dt <= 0.0f) return;
    
    uint32_t now_ms = now_us / 1000;
    
    /* 1. Update Dual High-G Accelerometer Kinematics */
    dual_h3lis331_update(&core->tracker, s1_raw, s2_raw, dt, core->spin_direction);
    
    /* 2. Update Heading Estimator */
    melty_heading_update(&core->heading,
                         core->tracker.omega_rad_s,
                         core->tracker.alpha_rad_s2,
                         dt,
                         now_us);
                         
    /* 3. Update Failsafe & Safety State Machine */
    melty_failsafe_update(&core->failsafe,
                          &core->rc,
                          core->heading.rpm_fused,
                          core->failsafe.vbat_mv,
                          now_ms);
                          
    /* 4. Drive & Modulation Computation */
    if (melty_is_armed(&core->failsafe)) {
        /* Compute translation vector from RC sticks */
        float trans_x = core->rc.ch_trans_x;
        float trans_y = core->rc.ch_trans_y;
        float trans_mag = sqrtf(trans_x * trans_x + trans_y * trans_y);
        float trans_angle = atan2f(trans_y, trans_x);
        
        /* Modulate motor throttles */
        melty_drive_modulate(&core->drive,
                             core->rc.ch_throttle,
                             trans_mag,
                             trans_angle,
                             core->heading.heading_rad,
                             core->heading.omega_fused_rad_s,
                             core->heading.rpm_fused);
                             
        /* Update LED heading pointer */
        melty_heading_update_led(&core->heading, trans_angle, MELTY_LED_WINDOW_RAD);
    } else {
        /* Disarmed / Failsafe: zero throttles and deactivate LED */
        core->drive.throttle_left = 0.0f;
        core->drive.throttle_right = 0.0f;
        core->drive.dshot_cmd_left = 0;
        core->drive.dshot_cmd_right = 0;
        core->heading.led_active = false;
    }
    
    /* 5. Periodic Telemetry Packaging (50Hz) */
    if (now_ms - core->last_telemetry_ms >= (1000 / (uint32_t)MELTY_TELEMETRY_HZ)) {
        core->last_telemetry_ms = now_ms;
        melty_telemetry_encode(&core->telemetry,
                               now_ms,
                               core->heading.rpm_fused,
                               core->heading.heading_rad,
                               core->failsafe.vbat_mv,
                               core->tracker.centripetal_accel_mss,
                               core->tracker.cor_shift_m,
                               (uint8_t)core->failsafe.state,
                               core->heading.beacon_locked,
                               core->heading.led_active,
                               core->rc.link_quality_pct);
    }
}
