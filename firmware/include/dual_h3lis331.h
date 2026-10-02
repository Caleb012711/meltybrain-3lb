#ifndef DUAL_H3LIS331_H
#define DUAL_H3LIS331_H

#include <stdint.h>
#include <stdbool.h>
#include "melty_config.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Raw 16-bit counts from H3LIS331DLTR (12-bit left-justified or sign-extended)
 */
typedef struct {
    int16_t x;
    int16_t y;
    int16_t z;
} H3LIS331_RawSample_t;

/**
 * Calibration parameters for a single accelerometer
 */
typedef struct {
    float offset_x_mss;   /**< 0g bias offset in m/s^2 */
    float offset_y_mss;   /**< 0g bias offset in m/s^2 */
    float offset_z_mss;   /**< 0g bias offset in m/s^2 */
    float scale_x;        /**< Scale correction factor (nominal 1.0) */
    float scale_y;        /**< Scale correction factor (nominal 1.0) */
    float scale_z;        /**< Scale correction factor (nominal 1.0) */
} AccelCalib_t;

/**
 * Dual Opposed High-G Accelerometer State & Estimator output
 */
typedef struct {
    /* Configuration */
    float baseline_m;           /**< Distance between sensor 1 and sensor 2 (m) */
    float nominal_r1_m;         /**< Nominal distance of S1 to spin center (m) */
    float nominal_r2_m;         /**< Nominal distance of S2 to spin center (m) */
    AccelCalib_t calib1;        /**< Calibration for Sensor 1 */
    AccelCalib_t calib2;        /**< Calibration for Sensor 2 */
    
    /* Calibrated physical accelerations in m/s^2 */
    float s1_radial_mss;        /**< Outward radial acceleration on Sensor 1 */
    float s1_tangential_mss;    /**< Spin-direction tangential acceleration on S1 */
    float s2_radial_mss;        /**< Outward radial acceleration on Sensor 2 */
    float s2_tangential_mss;    /**< Spin-direction tangential acceleration on S2 */

    /* Fused kinematic quantities */
    float centripetal_accel_mss; /**< Fused differential centripetal accel */
    float tangential_accel_mss;  /**< Fused differential tangential accel */
    float omega_rad_s;          /**< Estimated angular velocity (rad/s) */
    float rpm;                  /**< Filtered rotational speed in RPM */
    float alpha_rad_s2;         /**< Estimated angular acceleration (rad/s^2) */
    float cor_shift_m;          /**< Dynamic Center of Rotation shift from nominal */
    
    /* Health and Diagnostics */
    bool sensor1_healthy;
    bool sensor2_healthy;
    uint32_t sample_count;
    uint32_t saturated_count;
} DualH3LIS331_Tracker_t;

/**
 * Initialize tracker state with nominal geometry and calibration.
 */
void dual_h3lis331_init(DualH3LIS331_Tracker_t *tracker, float r1_m, float r2_m);

/**
 * Update calibration offsets using resting static samples.
 */
void dual_h3lis331_set_calibration(DualH3LIS331_Tracker_t *tracker, 
                                  const AccelCalib_t *cal1, 
                                  const AccelCalib_t *cal2);

/**
 * Process raw dual-accelerometer measurements and compute kinematic states.
 * 
 * @param tracker Pointer to tracker instance
 * @param s1_raw Raw reading from sensor 1
 * @param s2_raw Raw reading from sensor 2
 * @param dt Time delta since last update in seconds
 * @param spin_direction +1.0f for CCW, -1.0f for CW
 */
void dual_h3lis331_update(DualH3LIS331_Tracker_t *tracker,
                          const H3LIS331_RawSample_t *s1_raw,
                          const H3LIS331_RawSample_t *s2_raw,
                          float dt,
                          float spin_direction);

/**
 * Get current RPM estimate.
 */
static inline float dual_h3lis331_get_rpm(const DualH3LIS331_Tracker_t *tracker) {
    return tracker->rpm;
}

/**
 * Get current angular velocity in rad/s.
 */
static inline float dual_h3lis331_get_omega(const DualH3LIS331_Tracker_t *tracker) {
    return tracker->omega_rad_s;
}

#ifdef __cplusplus
}
#endif

#endif /* DUAL_H3LIS331_H */
