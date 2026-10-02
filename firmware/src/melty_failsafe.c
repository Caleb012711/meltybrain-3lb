#include "melty_failsafe.h"
#include <string.h>

void melty_failsafe_init(MeltyFailsafe_t *fs) {
    if (!fs) return;
    memset(fs, 0, sizeof(MeltyFailsafe_t));
    
    fs->state = MELTY_STATE_DISARMED;
    fs->accel_healthy = true;
    fs->vbat_healthy = true;
    fs->rc_healthy = false;
    fs->over_rpm_detected = false;
}

void melty_failsafe_update(MeltyFailsafe_t *fs,
                           MeltyRCInput_t *rc,
                           float current_rpm,
                           uint16_t vbat_mv,
                           uint32_t now_ms) {
    if (!fs || !rc) return;
    
    fs->vbat_mv = vbat_mv;
    if (current_rpm > fs->peak_rpm) {
        fs->peak_rpm = current_rpm;
    }
    
    /* 1. Check RC link freshness */
    uint32_t rc_elapsed_ms = now_ms - rc->last_rc_frame_ms;
    if (rc_elapsed_ms > MELTY_RC_TIMEOUT_MS || rc->rc_link_lost) {
        fs->rc_healthy = false;
        rc->rc_link_lost = true;
    } else {
        fs->rc_healthy = true;
    }
    
    /* 2. Check Over-RPM Cutoff */
    if (current_rpm > MELTY_MAX_LIMIT_RPM) {
        fs->over_rpm_detected = true;
        fs->state = MELTY_STATE_OVER_RPM_SHUTDOWN;
        fs->failsafe_events_count++;
        return;
    }
    
    /* 3. Check Brownout / Low Voltage Cutoff */
    if (vbat_mv > 0 && vbat_mv < MELTY_VBAT_CRITICAL_MV) {
        fs->vbat_healthy = false;
        fs->state = MELTY_STATE_BROWNOUT_CUTOFF;
        fs->failsafe_events_count++;
        return;
    } else {
        fs->vbat_healthy = true;
    }
    
    /* 4. Link Loss Failsafe Trigger */
    if (!fs->rc_healthy) {
        if (fs->state != MELTY_STATE_DISARMED && fs->state != MELTY_STATE_FAILSAFE_ACTIVE) {
            fs->state = MELTY_STATE_FAILSAFE_ACTIVE;
            fs->failsafe_events_count++;
        }
        return;
    }
    
    /* 5. State Machine Transition Logic */
    switch (fs->state) {
        case MELTY_STATE_DISARMED:
            /* To start arming: CH5 switch must be toggled to ARMED while Throttle is at ZERO (< 5%) */
            if (rc->ch_arm_switch && rc->ch_throttle < 0.05f) {
                fs->state = MELTY_STATE_ARMED;
                fs->state_entered_ms = now_ms;
            }
            break;
            
        case MELTY_STATE_ARMED:
            /* If driver disarms via switch -> immediate DISARM */
            if (!rc->ch_arm_switch) {
                fs->state = MELTY_STATE_DISARMED;
                break;
            }
            /* Transition to SPINNING when throttle command rises above 5% */
            if (rc->ch_throttle >= 0.05f || current_rpm > 200.0f) {
                fs->state = MELTY_STATE_SPINNING;
            }
            break;
            
        case MELTY_STATE_SPINNING:
            if (!rc->ch_arm_switch) {
                /* Disarm switch flipped mid-spin -> active spin-down to disarmed */
                fs->state = MELTY_STATE_DISARMED;
                break;
            }
            if (rc->ch_throttle < 0.05f && current_rpm < 150.0f) {
                fs->state = MELTY_STATE_ARMED;
            }
            break;
            
        case MELTY_STATE_FAILSAFE_ACTIVE:
        case MELTY_STATE_OVER_RPM_SHUTDOWN:
        case MELTY_STATE_BROWNOUT_CUTOFF:
            /* Require explicit disarm action before recovery is allowed */
            if (!rc->ch_arm_switch && rc->ch_throttle < 0.05f && fs->rc_healthy && fs->vbat_healthy) {
                fs->over_rpm_detected = false;
                fs->state = MELTY_STATE_DISARMED;
            }
            break;
            
        default:
            fs->state = MELTY_STATE_DISARMED;
            break;
    }
}
