#ifndef MELTY_DRIVE_H
#define MELTY_DRIVE_H

#include <stdint.h>
#include <stdbool.h>
#include "melty_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    DSHOT_MODE_UNIDIRECTIONAL = 0, /**< Standard 0 to 100% forward throttle (DShot 48-2047) */
    DSHOT_MODE_BIDIRECTIONAL_3D = 1 /**< 3D mode: -100% to +100% with neutral at center */
} MeltyDShotMode_t;

typedef struct {
    /* Tuning Parameters */
    float motor_latency_s;       /**< Motor response time constant (nominal 3.0-4.5ms) */
    float lead_angle_trim_rad;   /**< Driver manual lead angle trim offset in radians */
    float trans_gain;            /**< Modulation depth scaling factor (0.0 to 1.0) */
    float min_spin_throttle;     /**< Minimum base throttle to maintain spin */
    MeltyDShotMode_t dshot_mode; /**< ESC DShot framing mode */

    /* Instantaneous Computed States */
    float effective_lead_rad;    /**< Dynamic lead angle = omega * latency + trim */
    float modulation_phase_rad;  /**< Instantaneous relative modulation angle */
    float modulation_value;      /**< Instantaneous sine/cosine superposition term */
    
    /* Motor Throttle Outputs */
    float throttle_left;         /**< Left motor throttle command [-1.0 to 1.0] */
    float throttle_right;        /**< Right motor throttle command [-1.0 to 1.0] */
    uint16_t dshot_cmd_left;     /**< DShot digital value (0-2047) for Left ESC */
    uint16_t dshot_cmd_right;    /**< DShot digital value (0-2047) for Right ESC */
} MeltyDriveModulator_t;

/**
 * Initialize translational drive modulator.
 */
void melty_drive_init(MeltyDriveModulator_t *mod);

/**
 * Compute instantaneous motor throttles using sine-wave modulation superposition.
 * 
 * @param mod Modulator instance
 * @param base_spin_throttle Base throttle for weapon/spin [0.0 to 1.0]
 * @param trans_mag Translation magnitude from stick deflection [0.0 to 1.0]
 * @param trans_angle_rad Desired translation heading [-pi to +pi]
 * @param current_heading_rad Instantaneous bot heading [0 to 2pi)
 * @param current_omega_rad_s Instantaneous rotational velocity (rad/s)
 * @param current_rpm Instantaneous rotational speed in RPM
 */
void melty_drive_modulate(MeltyDriveModulator_t *mod,
                         float base_spin_throttle,
                         float trans_mag,
                         float trans_angle_rad,
                         float current_heading_rad,
                         float current_omega_rad_s,
                         float current_rpm);

/**
 * Convert normalized throttle [-1.0 .. 1.0] or [0.0 .. 1.0] to 11-bit DShot packet value (48..2047).
 */
uint16_t melty_drive_throttle_to_dshot(float throttle, MeltyDShotMode_t mode);

#ifdef __cplusplus
}
#endif

#endif /* MELTY_DRIVE_H */
