#ifndef MELTY_FAILSAFE_H
#define MELTY_FAILSAFE_H

#include <stdint.h>
#include <stdbool.h>
#include "melty_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    MELTY_STATE_DISARMED = 0,
    MELTY_STATE_ARMING_PENDING,
    MELTY_STATE_ARMED,
    MELTY_STATE_SPINNING,
    MELTY_STATE_FAILSAFE_ACTIVE,
    MELTY_STATE_OVER_RPM_SHUTDOWN,
    MELTY_STATE_BROWNOUT_CUTOFF
} MeltySystemState_t;

typedef struct {
    /* RC Channels normalized [-1.0 .. +1.0] or [0.0 .. 1.0] */
    float ch_throttle;       /**< CH1: Spin speed request [0.0 to 1.0] */
    float ch_trans_x;        /**< CH2: Translation X (Roll/Ail) [-1.0 to 1.0] */
    float ch_trans_y;        /**< CH3: Translation Y (Pitch/Ele) [-1.0 to 1.0] */
    float ch_yaw_trim;       /**< CH4: Steering / Heading trim [-1.0 to 1.0] */
    bool  ch_arm_switch;     /**< CH5: AUX1 Arm switch (true = Armed position) */
    bool  ch_beacon_select;  /**< CH6: AUX2 Beacon enable/mode */
    
    /* RC Link Status */
    uint32_t last_rc_frame_ms;
    uint8_t link_quality_pct;
    int8_t rssi_dbm;
    bool rc_link_lost;
} MeltyRCInput_t;

typedef struct {
    MeltySystemState_t state;
    uint32_t state_entered_ms;
    
    /* Sensor & System Monitors */
    bool accel_healthy;
    bool vbat_healthy;
    bool rc_healthy;
    bool over_rpm_detected;
    
    uint16_t vbat_mv;
    float peak_rpm;
    
    /* Safety counters */
    uint32_t failsafe_events_count;
} MeltyFailsafe_t;

/**
 * Initialize failsafe and safety monitor.
 */
void melty_failsafe_init(MeltyFailsafe_t *fs);

/**
 * Process RC inputs and update arming state machine.
 * 
 * @param fs Failsafe monitor instance
 * @param rc Pointer to parsed RC inputs
 * @param current_rpm Instantaneous measured RPM
 * @param vbat_mv Measured battery voltage in mV
 * @param now_ms System time in milliseconds
 */
void melty_failsafe_update(MeltyFailsafe_t *fs,
                           MeltyRCInput_t *rc,
                           float current_rpm,
                           uint16_t vbat_mv,
                           uint32_t now_ms);

/**
 * Check if the robot is permitted to drive/spin.
 */
static inline bool melty_is_armed(const MeltyFailsafe_t *fs) {
    return (fs->state == MELTY_STATE_ARMED || fs->state == MELTY_STATE_SPINNING);
}

#ifdef __cplusplus
}
#endif

#endif /* MELTY_FAILSAFE_H */
