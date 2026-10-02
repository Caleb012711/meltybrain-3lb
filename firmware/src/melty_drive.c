#include "melty_drive.h"
#include <math.h>
#include <string.h>

#define TWO_PI (6.283185307179586f)

static inline float clampf(float val, float min_val, float max_val) {
    if (val < min_val) return min_val;
    if (val > max_val) return max_val;
    return val;
}

void melty_drive_init(MeltyDriveModulator_t *mod) {
    if (!mod) return;
    memset(mod, 0, sizeof(MeltyDriveModulator_t));
    
    mod->motor_latency_s = MELTY_DEFAULT_MOTOR_LATENCY_S;
    mod->lead_angle_trim_rad = 0.0f;
    mod->trans_gain = MELTY_MAX_MODULATION_DEPTH;
    mod->min_spin_throttle = 0.15f;
    mod->dshot_mode = DSHOT_MODE_UNIDIRECTIONAL;
}

void melty_drive_modulate(MeltyDriveModulator_t *mod,
                         float base_spin_throttle,
                         float trans_mag,
                         float trans_angle_rad,
                         float current_heading_rad,
                         float current_omega_rad_s,
                         float current_rpm) {
    if (!mod) return;
    
    /* Clamp base inputs */
    base_spin_throttle = clampf(base_spin_throttle, 0.0f, 1.0f);
    trans_mag = clampf(trans_mag, 0.0f, 1.0f);
    
    /* Disable modulation if RPM is below spin threshold or base throttle is too low */
    if (current_rpm < MELTY_MIN_TRANSLATE_RPM || base_spin_throttle < 0.05f || trans_mag < 0.02f) {
        mod->effective_lead_rad = 0.0f;
        mod->modulation_phase_rad = 0.0f;
        mod->modulation_value = 0.0f;
        mod->throttle_left = base_spin_throttle;
        mod->throttle_right = base_spin_throttle;
        mod->dshot_cmd_left = melty_drive_throttle_to_dshot(mod->throttle_left, mod->dshot_mode);
        mod->dshot_cmd_right = melty_drive_throttle_to_dshot(mod->throttle_right, mod->dshot_mode);
        return;
    }
    
    /* Calculate dynamic lead angle: compensates for motor electrical & mechanical time lag */
    mod->effective_lead_rad = (current_omega_rad_s * mod->motor_latency_s) + mod->lead_angle_trim_rad;
    
    /* Instantaneous modulation phase */
    mod->modulation_phase_rad = current_heading_rad - trans_angle_rad + mod->effective_lead_rad;
    
    /* Pure sine-wave superposition */
    /* Available headroom calculation: ensure spin throttle is preserved */
    float max_allowed_mod = mod->trans_gain * trans_mag;
    
    /* Symmetrical headroom limiting to avoid asymmetric hard clipping */
    float upper_headroom = 1.0f - base_spin_throttle;
    float lower_headroom = base_spin_throttle;
    float available_span = (upper_headroom < lower_headroom) ? upper_headroom : lower_headroom;
    
    if (max_allowed_mod > available_span && available_span > 0.01f) {
        max_allowed_mod = available_span;
    }
    
    mod->modulation_value = max_allowed_mod * cosf(mod->modulation_phase_rad);
    
    /* Differential motor modulation */
    mod->throttle_left = clampf(base_spin_throttle + mod->modulation_value, 0.0f, 1.0f);
    mod->throttle_right = clampf(base_spin_throttle - mod->modulation_value, 0.0f, 1.0f);
    
    /* Convert to DShot digital values */
    mod->dshot_cmd_left = melty_drive_throttle_to_dshot(mod->throttle_left, mod->dshot_mode);
    mod->dshot_cmd_right = melty_drive_throttle_to_dshot(mod->throttle_right, mod->dshot_mode);
}

uint16_t melty_drive_throttle_to_dshot(float throttle, MeltyDShotMode_t mode) {
    /* DShot values: 0 = disarmed/stop, 1-47 = special commands, 48-2047 = 2000 throttle steps */
    if (mode == DSHOT_MODE_UNIDIRECTIONAL) {
        if (throttle <= 0.001f) return 0;
        throttle = clampf(throttle, 0.0f, 1.0f);
        return (uint16_t)(48 + (uint16_t)(throttle * (2047 - 48)));
    } else {
        /* 3D bidirectional mode: -1.0 -> 48, 0.0 -> 1047 (neutral stop), +1.0 -> 2047 */
        throttle = clampf(throttle, -1.0f, 1.0f);
        if (fabsf(throttle) < 0.005f) {
            return 0; /* Or 1048 for neutral depending on ESC firmware */
        }
        if (throttle > 0.0f) {
            return (uint16_t)(1048 + (uint16_t)(throttle * (2047 - 1048)));
        } else {
            return (uint16_t)(1047 - (uint16_t)(-throttle * (1047 - 48)));
        }
    }
}
