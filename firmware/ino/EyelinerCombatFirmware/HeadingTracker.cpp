#include "HeadingTracker.h"

#define TWO_PI_F             6.283185307f
#define PI_F                 3.1415926535f

HeadingTracker::HeadingTracker(uint8_t front_led_pin, uint8_t rear_led_pin)
    : _front_led_pin(front_led_pin),
      _rear_led_pin(rear_led_pin),
      _heading_rad(0.0f),
      _pll_phase_error(0.0f),
      _pll_freq_trim(0.0f),
      _beacon_locked(false),
      _last_beacon_us(0),
      _front_led_state(false),
      _rear_led_state(false),
      _last_watchdog_kick_ms(0) {
}

void HeadingTracker::begin() {
#ifdef ARDUINO
    pinMode(_front_led_pin, OUTPUT);
    pinMode(_rear_led_pin, OUTPUT);
    digitalWriteFast(_front_led_pin, LOW);
    digitalWriteFast(_rear_led_pin, LOW);

#if defined(__arm__) && defined(CORE_TEENSY)
    // Optional Teensy 4.0 RTWDOG / WDOG1 initialization
    // Configured for 150ms timeout window
#endif
#endif
    _heading_rad = 0.0f;
    kickWatchdog();
}

float HeadingTracker::wrap2Pi(float angle_rad) {
    while (angle_rad < 0.0f) angle_rad += TWO_PI_F;
    while (angle_rad >= TWO_PI_F) angle_rad -= TWO_PI_F;
    return angle_rad;
}

float HeadingTracker::angleDiff(float a, float b) {
    float diff = a - b;
    while (diff < -PI_F) diff += TWO_PI_F;
    while (diff > PI_F) diff -= TWO_PI_F;
    return diff;
}

void HeadingTracker::update(float omega_rad_s, float dt) {
    if (dt <= 0.0f) return;

    // Numerical integration of rotational angle:
    // theta(k+1) = theta(k) + (omega + pll_trim) * dt
    _heading_rad += (omega_rad_s + _pll_freq_trim) * dt;
    _heading_rad = wrap2Pi(_heading_rad);
}

void HeadingTracker::onBeaconPulse(uint32_t pulse_time_us) {
    if (_last_beacon_us > 0) {
        uint32_t period_us = pulse_time_us - _last_beacon_us;
        // Check for reasonable spin period (300 to 4500 RPM -> 13.3ms to 200ms)
        if (period_us > 13000 && period_us < 200000) {
            _beacon_locked = true;

            // Phase error at optical beacon crossing (expected reference is 0 rad)
            _pll_phase_error = angleDiff(0.0f, _heading_rad);

            // Phase-Locked Loop (PLL) proportional + integral correction
            const float kp_phase = 0.15f;
            const float ki_phase = 0.01f;

            _heading_rad += kp_phase * _pll_phase_error;
            _heading_rad = wrap2Pi(_heading_rad);

            _pll_freq_trim += ki_phase * _pll_phase_error;
            // Clamp frequency trim to +-5%
            if (_pll_freq_trim > 50.0f) _pll_freq_trim = 50.0f;
            if (_pll_freq_trim < -50.0f) _pll_freq_trim = -50.0f;
        }
    }
    _last_beacon_us = pulse_time_us;
}

void HeadingTracker::updateLEDs(float target_heading_rad, HeadingLEDMode mode, float window_rad) {
    if (mode == LED_MODE_OFF) {
        _front_led_state = false;
        _rear_led_state = false;
#ifdef ARDUINO
        digitalWriteFast(_front_led_pin, LOW);
        digitalWriteFast(_rear_led_pin, LOW);
#endif
        return;
    }

    float half_window = window_rad * 0.5f;

    // Angular distance from current chassis angle to target translation beam
    float front_diff = fabsf(angleDiff(_heading_rad, target_heading_rad));
    bool front_on = (front_diff <= half_window);

    // Rear beam is placed exactly 180 degrees (PI radians) opposite
    float rear_target = wrap2Pi(target_heading_rad + PI_F);
    float rear_diff = fabsf(angleDiff(_heading_rad, rear_target));
    bool rear_on = (rear_diff <= half_window);

    if (mode == LED_MODE_FRONT_ONLY) {
        rear_on = false;
    }

    _front_led_state = front_on;
    _rear_led_state = rear_on;

#ifdef ARDUINO
    digitalWriteFast(_front_led_pin, front_on ? HIGH : LOW);
    digitalWriteFast(_rear_led_pin, rear_on ? HIGH : LOW);
#endif
}

SafetyStatus HeadingTracker::checkSafety(bool is_failsafe, bool is_estop, float current_rpm,
                                         uint16_t vbat_mv, bool accel_healthy) {
    SafetyStatus s;
    s.rc_link_ok = !is_failsafe;
    s.estop_safe = !is_estop;
    s.rpm_safe = (current_rpm <= OVER_RPM_CRITICAL_LIMIT);
    // Allow vbat_mv == 0 if voltage sensor uncalibrated / bench powered via USB
    s.vbat_ok = (vbat_mv == 0 || vbat_mv >= VBAT_BROWNOUT_MV);
    s.accel_ok = accel_healthy;

    s.all_safe = s.rc_link_ok && s.estop_safe && s.rpm_safe && s.vbat_ok && s.accel_ok;

    if (s.all_safe) {
        kickWatchdog();
    }

    return s;
}

void HeadingTracker::kickWatchdog() {
#ifdef ARDUINO
    _last_watchdog_kick_ms = millis();
#if defined(__arm__) && defined(CORE_TEENSY)
    // Teensy 4.0 Watchdog Refresh sequence (WDOG1_WSR)
    // WDOG1_WSR = 0x5555;
    // WDOG1_WSR = 0xAAAA;
#endif
#endif
}
