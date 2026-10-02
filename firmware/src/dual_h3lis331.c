#include "dual_h3lis331.h"
#include <math.h>
#include <string.h>

#define TWO_PI (6.283185307179586f)
#define RPM_TO_RADS (TWO_PI / 60.0f)
#define RADS_TO_RPM (60.0f / TWO_PI)

void dual_h3lis331_init(DualH3LIS331_Tracker_t *tracker, float r1_m, float r2_m) {
    if (!tracker) return;
    memset(tracker, 0, sizeof(DualH3LIS331_Tracker_t));
    
    tracker->nominal_r1_m = (r1_m > 0.001f) ? r1_m : MELTY_ACCEL_RADIUS_1_M;
    tracker->nominal_r2_m = (r2_m > 0.001f) ? r2_m : MELTY_ACCEL_RADIUS_2_M;
    tracker->baseline_m = tracker->nominal_r1_m + tracker->nominal_r2_m;
    
    /* Default unit calibration */
    tracker->calib1.scale_x = 1.0f;
    tracker->calib1.scale_y = 1.0f;
    tracker->calib1.scale_z = 1.0f;
    
    tracker->calib2.scale_x = 1.0f;
    tracker->calib2.scale_y = 1.0f;
    tracker->calib2.scale_z = 1.0f;
    
    tracker->sensor1_healthy = true;
    tracker->sensor2_healthy = true;
}

void dual_h3lis331_set_calibration(DualH3LIS331_Tracker_t *tracker, 
                                  const AccelCalib_t *cal1, 
                                  const AccelCalib_t *cal2) {
    if (!tracker) return;
    if (cal1) tracker->calib1 = *cal1;
    if (cal2) tracker->calib2 = *cal2;
}

void dual_h3lis331_update(DualH3LIS331_Tracker_t *tracker,
                          const H3LIS331_RawSample_t *s1_raw,
                          const H3LIS331_RawSample_t *s2_raw,
                          float dt,
                          float spin_direction) {
    if (!tracker || dt <= 0.0f) return;
    
    tracker->sample_count++;
    
    /* Convert raw to m/s^2 with calibration offsets and scaling */
    /* Assume Axis X = Radial (outward), Axis Y = Tangential (spin direction) */
    float s1_raw_x_mss = (float)s1_raw->x * H3LIS331_SCALE_400G_MSS_PER_LSB;
    float s1_raw_y_mss = (float)s1_raw->y * H3LIS331_SCALE_400G_MSS_PER_LSB;
    
    float s2_raw_x_mss = (float)s2_raw->x * H3LIS331_SCALE_400G_MSS_PER_LSB;
    float s2_raw_y_mss = (float)s2_raw->y * H3LIS331_SCALE_400G_MSS_PER_LSB;
    
    /* Check for sensor saturation (e.g. near +-400g ~ 3920 m/s^2) */
    const float SAT_LIMIT_MSS = 3900.0f;
    if (fabsf(s1_raw_x_mss) > SAT_LIMIT_MSS || fabsf(s1_raw_y_mss) > SAT_LIMIT_MSS ||
        fabsf(s2_raw_x_mss) > SAT_LIMIT_MSS || fabsf(s2_raw_y_mss) > SAT_LIMIT_MSS) {
        tracker->saturated_count++;
    }
    
    tracker->s1_radial_mss = (s1_raw_x_mss - tracker->calib1.offset_x_mss) * tracker->calib1.scale_x;
    tracker->s1_tangential_mss = (s1_raw_y_mss - tracker->calib1.offset_y_mss) * tracker->calib1.scale_y;
    
    tracker->s2_radial_mss = (s2_raw_x_mss - tracker->calib2.offset_x_mss) * tracker->calib2.scale_x;
    tracker->s2_tangential_mss = (s2_raw_y_mss - tracker->calib2.offset_y_mss) * tracker->calib2.scale_y;

    float omega_inst = 0.0f;
    float alpha_inst = 0.0f;
    
    if (tracker->sensor1_healthy && tracker->sensor2_healthy) {
        /* Dual-opposed differential fusion */
        /* Sum of radial accelerations cancels external linear translation and CoR shifts */
        float radial_sum = tracker->s1_radial_mss + tracker->s2_radial_mss;
        if (radial_sum > 0.0f) {
            omega_inst = sqrtf(radial_sum / tracker->baseline_m);
        } else {
            omega_inst = 0.0f;
        }
        
        /* Tangential differential fusion gives angular acceleration */
        float tangential_sum = tracker->s1_tangential_mss + tracker->s2_tangential_mss;
        alpha_inst = tangential_sum / tracker->baseline_m;
        
        /* Compute dynamic CoR shift if spinning sufficiently fast (> 200 RPM) */
        if (omega_inst > (200.0f * RPM_TO_RADS) && radial_sum > 10.0f) {
            float measured_r1 = (tracker->s1_radial_mss / radial_sum) * tracker->baseline_m;
            tracker->cor_shift_m = measured_r1 - tracker->nominal_r1_m;
        }
    } else if (tracker->sensor1_healthy) {
        /* Fallback single-sensor mode on Sensor 1 */
        if (tracker->s1_radial_mss > 0.0f) {
            omega_inst = sqrtf(tracker->s1_radial_mss / tracker->nominal_r1_m);
        }
        alpha_inst = tracker->s1_tangential_mss / tracker->nominal_r1_m;
        tracker->cor_shift_m = 0.0f;
    } else if (tracker->sensor2_healthy) {
        /* Fallback single-sensor mode on Sensor 2 */
        if (tracker->s2_radial_mss > 0.0f) {
            omega_inst = sqrtf(tracker->s2_radial_mss / tracker->nominal_r2_m);
        }
        alpha_inst = tracker->s2_tangential_mss / tracker->nominal_r2_m;
        tracker->cor_shift_m = 0.0f;
    }

    /* Apply spin direction sign (+1.0f for CCW, -1.0f for CW) */
    float signed_omega = (spin_direction >= 0.0f) ? omega_inst : -omega_inst;
    
    /* Low-pass filter for smooth RPM tracking (alpha filter cutoff ~ 100Hz) */
    float lpf_alpha = dt / (dt + (1.0f / (2.0f * 3.14159f * 100.0f)));
    if (lpf_alpha > 1.0f) lpf_alpha = 1.0f;
    
    tracker->omega_rad_s += lpf_alpha * (signed_omega - tracker->omega_rad_s);
    tracker->alpha_rad_s2 += lpf_alpha * (alpha_inst - tracker->alpha_rad_s2);
    
    tracker->rpm = fabsf(tracker->omega_rad_s) * RADS_TO_RPM;
    tracker->centripetal_accel_mss = (tracker->s1_radial_mss + tracker->s2_radial_mss) * 0.5f;
    tracker->tangential_accel_mss = (tracker->s1_tangential_mss + tracker->s2_tangential_mss) * 0.5f;
}
