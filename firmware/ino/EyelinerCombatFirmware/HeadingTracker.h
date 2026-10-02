#ifndef HEADING_TRACKER_H
#define HEADING_TRACKER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef ARDUINO
#include <Arduino.h>
#else
#include <cmath>
#include <cstring>
#endif

/**
 * @file HeadingTracker.h
 * @brief High-precision Heading Estimator, Visual POV Beacon, and Safety Watchdog
 *
 * Front Green LED on Pin 6, Rear Red LED on Pin 2.
 * Integrates high-speed rotational angle theta from dual accelerometer omega.
 * Flashes LEDs at precise phase angles to project a stationary virtual heading
 * beam visible to the pilot at 3,000 RPM.
 *
 * Implements hardware watchdog feeding, over-RPM shutoff, brownout detection,
 * and SPARC-compliant 100ms link-loss failsafe enforcement.
 */

#define FRONT_LED_PIN                 6   // High-intensity Green LED
#define REAR_LED_PIN                  2   // High-intensity Red LED
#define BEACON_SENSOR_PIN             15  // Optional IR phototransistor interrupt

#define DEFAULT_LED_WINDOW_RAD        0.2618f // 15 degrees window
#define OVER_RPM_CRITICAL_LIMIT       4000.0f // Absolute safety spin cutoff
#define VBAT_BROWNOUT_MV              12000   // 12.0V 4S LiPo cutoff (3.0V/cell)
#define VBAT_WARNING_MV               13600   // 13.6V 4S LiPo warning

enum HeadingLEDMode {
    LED_MODE_OFF = 0,
    LED_MODE_FRONT_ONLY = 1,
    LED_MODE_FRONT_AND_REAR = 2,
    LED_MODE_CONTINUOUS_SEARCH = 3
};

struct SafetyStatus {
    bool rc_link_ok;
    bool accel_ok;
    bool vbat_ok;
    bool rpm_safe;
    bool estop_safe;
    bool all_safe;
};

class HeadingTracker {
public:
    HeadingTracker(uint8_t front_led_pin = FRONT_LED_PIN,
                   uint8_t rear_led_pin = REAR_LED_PIN);

    /**
     * @brief Configure LED pins and initialize watchdog timer
     */
    void begin();

    /**
     * @brief Fast integration step called in high-rate 1kHz control loop
     * @param omega_rad_s Instantaneous angular rate from accelerometers
     * @param dt Time delta in seconds
     */
    void update(float omega_rad_s, float dt);

    /**
     * @brief Optical beacon external interrupt sync
     * @param pulse_time_us Microsecond timestamp of IR flash
     */
    void onBeaconPulse(uint32_t pulse_time_us);

    /**
     * @brief Update visual heading beam LEDs based on commanded translation angle
     * @param target_heading_rad Desired translation heading [0..2pi)
     * @param mode LED display mode (Off, Front Only, Front & Rear)
     * @param window_rad Beam angular flash width
     */
    void updateLEDs(float target_heading_rad, HeadingLEDMode mode = LED_MODE_FRONT_AND_REAR,
                    float window_rad = DEFAULT_LED_WINDOW_RAD);

    /**
     * @brief Perform comprehensive safety health check and service hardware watchdog
     * @param is_failsafe CRSF link failsafe status
     * @param is_estop Emergency kill switch status
     * @param current_rpm Instantaneous measured RPM
     * @param vbat_mv Battery voltage in mV
     * @param accel_healthy Dual accelerometer health flag
     * @return SafetyStatus structure with pass/fail evaluation
     */
    SafetyStatus checkSafety(bool is_failsafe, bool is_estop, float current_rpm,
                             uint16_t vbat_mv, bool accel_healthy);

    /**
     * @brief Feed the hardware watchdog timer
     */
    void kickWatchdog();

    // Heading Getters
    float getHeadingRad() const { return _heading_rad; }
    float getHeadingDeg() const { return _heading_rad * (180.0f / 3.14159265f); }
    bool isFrontLEDOn() const { return _front_led_state; }
    bool isRearLEDOn() const { return _rear_led_state; }
    bool isBeaconLocked() const { return _beacon_locked; }

    static float wrap2Pi(float angle_rad);
    static float angleDiff(float a, float b);

private:
    uint8_t _front_led_pin;
    uint8_t _rear_led_pin;

    float   _heading_rad;
    float   _pll_phase_error;
    float   _pll_freq_trim;
    bool    _beacon_locked;
    uint32_t _last_beacon_us;

    bool    _front_led_state;
    bool    _rear_led_state;

    uint32_t _last_watchdog_kick_ms;
};

#endif // HEADING_TRACKER_H
