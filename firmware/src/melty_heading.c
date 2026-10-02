#include "melty_heading.h"
#include <math.h>
#include <string.h>

#define TWO_PI (6.283185307179586f)
#define PI     (3.141592653589793f)
#define RADS_TO_RPM (60.0f / TWO_PI)

float melty_wrap_2pi(float angle_rad) {
    angle_rad = fmodf(angle_rad, TWO_PI);
    if (angle_rad < 0.0f) {
        angle_rad += TWO_PI;
    }
    return angle_rad;
}

float melty_wrap_pi(float angle_rad) {
    angle_rad = fmodf(angle_rad + PI, TWO_PI);
    if (angle_rad < 0.0f) {
        angle_rad += TWO_PI;
    }
    return angle_rad - PI;
}

void melty_heading_init(MeltyHeadingEstimator_t *est) {
    if (!est) return;
    memset(est, 0, sizeof(MeltyHeadingEstimator_t));
    
    /* PLL gains for rapid lock and tight phase tracking */
    est->kp_pll = 0.60f;
    est->ki_pll = 0.25f;
    est->phase_step_gain = 0.85f;  /* Strong phase correction towards true beacon */
    
    est->led_offset_rad = 0.0f;
    est->beacon_locked = false;
}

void melty_heading_update(MeltyHeadingEstimator_t *est,
                          float omega_accel_rad_s,
                          float alpha_accel_rad_s2,
                          float dt,
                          uint32_t current_time_us) {
    if (!est || dt <= 0.0f) return;
    
    /* Check for beacon timeout (if no valid pulse for > 2.5 revolutions or 150ms) */
    if (est->last_beacon_time_us > 0) {
        float elapsed_s = (float)(current_time_us - est->last_beacon_time_us) * 1e-6f;
        float max_expected_period = (est->beacon_period_s > 0.005f) ? (est->beacon_period_s * 2.5f) : 0.150f;
        if (elapsed_s > max_expected_period) {
            est->beacon_locked = false;
            est->consecutive_beacons = 0;
            est->missed_beacons++;
            /* Decay integrator gracefully */
            est->pll_integrator *= 0.95f;
        }
    }
    
    /* Frequency fusion: apply PLL trim when beacon locked */
    if (est->beacon_locked) {
        est->omega_fused_rad_s = omega_accel_rad_s + est->pll_integrator;
    } else {
        est->omega_fused_rad_s = omega_accel_rad_s;
    }
    
    /* 2nd order Taylor integration of chassis angle */
    float delta_theta = (est->omega_fused_rad_s * dt) + (0.5f * alpha_accel_rad_s2 * dt * dt);
    est->heading_rad = melty_wrap_2pi(est->heading_rad + delta_theta);
    est->rpm_fused = fabsf(est->omega_fused_rad_s) * RADS_TO_RPM;
}

bool melty_heading_on_beacon_pulse(MeltyHeadingEstimator_t *est,
                                  uint32_t timestamp_us,
                                  float beacon_azimuth_rad) {
    if (!est) return false;
    
    if (est->last_beacon_time_us == 0) {
        /* First pulse ever: set reference angle */
        est->last_beacon_time_us = timestamp_us;
        est->heading_rad = melty_wrap_2pi(beacon_azimuth_rad);
        est->consecutive_beacons = 1;
        return true;
    }
    
    /* Calculate measured revolution period */
    uint32_t dt_us = timestamp_us - est->last_beacon_time_us;
    float dt_s = (float)dt_us * 1e-6f;
    
    /* Plausibility check: robot operates between 200 RPM (300ms) and 4500 RPM (13.3ms) */
    if (dt_s < 0.012f || dt_s > 0.350f) {
        est->rejected_glitches++;
        return false;
    }
    
    /* Glitch filter against previous period */
    if (est->beacon_period_s > 0.005f) {
        float period_ratio = dt_s / est->beacon_period_s;
        if (period_ratio < 0.65f || period_ratio > 1.45f) {
            est->rejected_glitches++;
            return false;
        }
    }
    
    /* Valid beacon pulse accepted */
    est->last_beacon_time_us = timestamp_us;
    est->beacon_period_s = dt_s;
    est->beacon_omega_rad_s = TWO_PI / dt_s;
    
    /* Compute phase error */
    float expected_heading = melty_wrap_2pi(beacon_azimuth_rad);
    est->phase_error_rad = melty_wrap_pi(est->heading_rad - expected_heading);
    
    /* Update PLL frequency integrator based on frequency difference and phase error */
    float freq_err = est->beacon_omega_rad_s - est->omega_fused_rad_s;
    est->pll_integrator += (0.4f * freq_err) - (est->ki_pll * est->phase_error_rad);
    
    /* Clamp integrator */
    if (est->pll_integrator > 40.0f) est->pll_integrator = 40.0f;
    if (est->pll_integrator < -40.0f) est->pll_integrator = -40.0f;
    
    /* Correct heading phase towards beacon azimuth */
    est->heading_rad = melty_wrap_2pi(est->heading_rad - (est->phase_step_gain * est->phase_error_rad));
    
    est->consecutive_beacons++;
    if (est->consecutive_beacons >= 2) {
        est->beacon_locked = true;
    }
    
    return true;
}

void melty_heading_update_led(MeltyHeadingEstimator_t *est,
                              float target_heading_rad,
                              float window_rad) {
    if (!est) return;
    
    if (est->rpm_fused < 100.0f) {
        est->led_active = true;
        return;
    }
    
    float current_pointer = melty_wrap_2pi(est->heading_rad + est->led_offset_rad);
    float angle_diff = fabsf(melty_wrap_pi(current_pointer - target_heading_rad));
    
    est->led_active = (angle_diff <= (window_rad * 0.5f));
}
