#ifndef MELTY_HEADING_H
#define MELTY_HEADING_H

#include <stdint.h>
#include <stdbool.h>
#include "melty_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    /* State */
    float heading_rad;             /**< Current estimated chassis angle [0, 2pi) */
    float omega_fused_rad_s;       /**< Fused angular velocity (rad/s) */
    float rpm_fused;               /**< Fused rotational speed in RPM */
    
    /* Beacon Phase-Locked Loop (PLL) */
    uint32_t last_beacon_time_us;  /**< Timestamp of last valid beacon trigger */
    float beacon_period_s;         /**< Measured revolution period between pulses */
    float beacon_omega_rad_s;      /**< Instantaneous beacon-derived angular velocity */
    float phase_error_rad;         /**< Last phase error at beacon trigger */
    float pll_integrator;          /**< PLL integral accumulator for frequency trim */
    
    /* PLL Gains */
    float kp_pll;                  /**< Proportional gain for phase correction */
    float ki_pll;                  /**< Integral gain for frequency correction */
    float phase_step_gain;         /**< Instantaneous phase reset fraction (0.0 - 1.0) */
    
    /* Tracking Status */
    bool beacon_locked;            /**< True if receiving consistent beacon pulses */
    uint32_t consecutive_beacons;  /**< Number of consecutive valid beacon pulses */
    uint32_t missed_beacons;       /**< Count of missed/timeout beacon cycles */
    uint32_t rejected_glitches;    /**< Count of noise triggers rejected */
    
    /* LED Heading Indicator State */
    bool led_active;               /**< Whether virtual heading beam LED is ON */
    float led_offset_rad;          /**< Physical offset angle between LED and front */
} MeltyHeadingEstimator_t;

/**
 * Initialize heading estimator and PLL parameters.
 */
void melty_heading_init(MeltyHeadingEstimator_t *est);

/**
 * High-rate time step update (called in fast 1kHz / 8kHz loop).
 * Integrates angular velocity from accelerometer.
 * 
 * @param est Heading estimator instance
 * @param omega_accel_rad_s Angular velocity from accelerometer sensor fusion
 * @param alpha_accel_rad_s2 Angular acceleration from accelerometer
 * @param dt Time step in seconds
 * @param current_time_us Current system timestamp in microseconds
 */
void melty_heading_update(MeltyHeadingEstimator_t *est,
                          float omega_accel_rad_s,
                          float alpha_accel_rad_s2,
                          float dt,
                          uint32_t current_time_us);

/**
 * Process beacon trigger interrupt (optical IR / hall effect).
 * 
 * @param est Heading estimator instance
 * @param timestamp_us Precise hardware timestamp of the pulse
 * @param beacon_azimuth_rad Known arena beacon reference angle (default 0.0)
 * @return true if pulse accepted, false if rejected as glitch
 */
bool melty_heading_on_beacon_pulse(MeltyHeadingEstimator_t *est,
                                  uint32_t timestamp_us,
                                  float beacon_azimuth_rad);

/**
 * Update virtual heading LED state based on target heading.
 * 
 * @param est Heading estimator instance
 * @param target_heading_rad Desired translation heading in radians
 * @param window_rad Angular beam width in radians
 */
void melty_heading_update_led(MeltyHeadingEstimator_t *est,
                              float target_heading_rad,
                              float window_rad);

/**
 * Normalize angle to [0, 2pi).
 */
float melty_wrap_2pi(float angle_rad);

/**
 * Normalize angle to [-pi, +pi).
 */
float melty_wrap_pi(float angle_rad);

#ifdef __cplusplus
}
#endif

#endif /* MELTY_HEADING_H */
