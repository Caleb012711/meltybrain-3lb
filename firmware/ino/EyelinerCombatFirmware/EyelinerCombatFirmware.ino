/**
 * ============================================================================
 * @file EyelinerCombatFirmware.ino
 * @brief Production-Grade Meltybrain Combat Robot Firmware for "Eyeliner" 3lb
 *
 * Hardware:
 * - MCU: PJRC Teensy 4.0 (NXP i.MX RT1062 ARM Cortex-M7 @ 600MHz)
 * - Motors: Dual PropDrive v2 2836 1200KV Hubmotors
 * - ESCs: AM32 55A 4-in-1 Running DShot600 on Pins 4 & 5
 * - Sensors: Dual Opposed H3LIS331DLTR +-400g SPI Accelerometers (Pins 9-13)
 * - Receiver: RadioMaster Pocket / ELRS CRSF Serial1 @ 420kBaud (Pins 0 & 1)
 * - Micro-LiDAR: ST VL53L4CD (I2C Pins 18/19) / TF-Luna (Serial2 Pins 7/8)
 * - Heading LEDs: Front Green (Pin 6), Rear Red (Pin 2)
 *
 * Architecture:
 * - 1,000 Hz (1 ms) Deterministic Fast Control Loop
 * - Dynamic 45-Degree Opposed Accelerometer Impact Rejection
 * - Virtual POV Heading Indicator Beam
 * - 360-Degree Polar LiDAR Autonomous Ramming Interceptor
 * - SPARC Tier-0 Failsafe (<100ms cut) and Hardware Watchdog
 * ============================================================================
 */

#include "DShotDriver.h"
#include "DualAccelerometer.h"
#include "CRSFReceiver.h"
#include "MicroLidarHunter.h"
#include "HeadingTracker.h"

// System States
enum RobotState {
    STATE_DISARMED = 0,
    STATE_ARMED,
    STATE_SPINUP,
    STATE_MELTY_MANUAL,
    STATE_AUTO_AI_HUNT,
    STATE_FAILSAFE
};

// Hardware Pin Definitions
#define PIN_DSHOT_LEFT        4
#define PIN_DSHOT_RIGHT       5
#define PIN_LED_FRONT         6
#define PIN_LED_REAR          2
#define PIN_ACCEL_CS1         9
#define PIN_ACCEL_CS2         10
#define PIN_VBAT_SENSE        14 // Analog A0

// Melty Kinematic Tuning Parameters
#define MELTY_MIN_TRANSLATE_RPM       800.0f
#define MELTY_MAX_OPERATING_RPM       3500.0f
#define MELTY_MAX_LIMIT_RPM           4000.0f
#define MELTY_DEFAULT_LATENCY_S       0.0035f // 3.5ms motor electrical + mechanical latency
#define MELTY_MAX_MODULATION_DEPTH    0.65f   // 65% throttle modulation envelope
#define MELTY_CONTROL_LOOP_US         1000    // 1000 us = 1 kHz loop rate

#define TWO_PI_F                      6.283185307f
#define PI_F                          3.1415926535f

// Device Subsystem Instances
static DShotDriver       dshot(PIN_DSHOT_LEFT, PIN_DSHOT_RIGHT);
static DualAccelerometer accel(PIN_ACCEL_CS1, PIN_ACCEL_CS2, 0.025f, 0.025f);
static CRSFReceiver      crsf;
static MicroLidarHunter  lidar(LIDAR_TYPE_VL53L4CD_I2C);
static HeadingTracker    heading(PIN_LED_FRONT, PIN_LED_REAR);

// Operational Variables
static RobotState system_state = STATE_DISARMED;
static uint32_t last_loop_time_us = 0;
static uint32_t last_telemetry_time_ms = 0;
static uint32_t last_heartbeat_time_ms = 0;

static float base_spin_throttle = 0.0f;
static float current_ramped_throttle = 0.0f;
static float driver_lead_trim_rad = 0.0f;
static float current_vbat_mv = 14800.0f;

// Forward Declarations
void handleStateTransitions(const SafetyStatus &safety);
void executeMeltyDriveModulation(float spin_throttle, float trans_mag, float trans_angle_rad,
                                 float &left_out, float &right_out);
uint16_t readBatteryVoltageMV();
void printTelemetryStream();

void setup() {
    // Initialize USB Serial for pit console & diagnostics
    Serial.begin(115200);

    // Initialize Subsystems
    heading.begin();
    crsf.begin();
    accel.begin();
    dshot.begin(DShotDriver::MODE_UNIDIRECTIONAL);
    lidar.begin();

    pinMode(PIN_VBAT_SENSE, INPUT);

    // Quick sensor zero calibration on boot (robot must be resting on pit table)
    accel.calibrateStationaryZero(200);

    // Send disarm neutral pulses to initialize ESCs
    dshot.armESCs(150);

    last_loop_time_us = micros();
    system_state = STATE_DISARMED;

    Serial.println(F("=================================================="));
    Serial.println(F(" EYELINER 3LB MELTYBRAIN COMBAT FIRMWARE INITIALIZED "));
    Serial.println(F(" Teensy 4.0 @ 600MHz | AM32 DShot600 | CRSF ELRS   "));
    Serial.println(F(" Status: DISARMED (Cycle SA switch with throttle 0)"));
    Serial.println(F("=================================================="));
}

void loop() {
    uint32_t now_us = micros();
    uint32_t dt_us = now_us - last_loop_time_us;

    // Maintain strict 1,000 Hz (1 ms) control loop
    if (dt_us < MELTY_CONTROL_LOOP_US) {
        return;
    }
    last_loop_time_us = now_us;
    float dt_s = (float)dt_us * 1e-6f;

    // 1. Process CRSF Receiver Frames
    crsf.update();

    // 2. Read Accelerometers and Update Kinematics
    accel.update(dt_s, 1.0f); // Spin CCW
    float current_omega = accel.getOmegaRadS();
    float current_rpm = accel.getRPM();

    // 3. Integrate Heading Angle
    heading.update(current_omega, dt_s);
    float current_heading = heading.getHeadingRad();

    // 4. Update Battery Voltage
    current_vbat_mv = readBatteryVoltageMV();

    // 5. Evaluate Safety Conditions
    bool is_failsafe = crsf.isFailsafe();
    bool is_estop = crsf.isEmergencyKillTriggered();
    bool accel_ok = accel.isHealthy();

    SafetyStatus safety = heading.checkSafety(is_failsafe, is_estop, current_rpm,
                                              (uint16_t)current_vbat_mv, accel_ok);

    // 6. State Machine Evaluation
    handleStateTransitions(safety);

    // 7. Update Micro-LiDAR Polar Horizon
    lidar.update(current_heading, current_rpm);

    // 8. Control & Drive Actuation
    float left_throttle = 0.0f;
    float right_throttle = 0.0f;
    float desired_heading = 0.0f;

    switch (system_state) {
        case STATE_DISARMED:
        case STATE_FAILSAFE: {
            left_throttle = 0.0f;
            right_throttle = 0.0f;
            current_ramped_throttle = 0.0f;

            // Heartbeat blink or error strobe
            uint32_t now_ms = millis();
            bool blink = (system_state == STATE_FAILSAFE)
                         ? ((now_ms / 100) % 2 == 0)   // Fast strobe (10 Hz)
                         : ((now_ms / 500) % 2 == 0);  // Slow heartbeat (1 Hz)

            digitalWriteFast(PIN_LED_FRONT, blink ? HIGH : LOW);
            digitalWriteFast(PIN_LED_REAR, blink ? LOW : HIGH);
            break;
        }

        case STATE_ARMED: {
            // Idle on the ground awaiting throttle spin command
            left_throttle = 0.0f;
            right_throttle = 0.0f;
            current_ramped_throttle = 0.0f;

            digitalWriteFast(PIN_LED_FRONT, HIGH);
            digitalWriteFast(PIN_LED_REAR, LOW);
            break;
        }

        case STATE_SPINUP: {
            // Smoothly ramp weapon speed to target setpoint
            float target_throttle = crsf.getThrottle();
            float ramp_rate = 0.75f * dt_s; // ~1.3 seconds 0-100% ramp
            if (current_ramped_throttle < target_throttle) {
                current_ramped_throttle += ramp_rate;
                if (current_ramped_throttle > target_throttle) current_ramped_throttle = target_throttle;
            } else {
                current_ramped_throttle = target_throttle;
            }

            left_throttle = current_ramped_throttle;
            right_throttle = current_ramped_throttle;

            // Visual heading LED indicates spinup
            heading.updateLEDs(0.0f, LED_MODE_FRONT_ONLY);
            break;
        }

        case STATE_MELTY_MANUAL: {
            base_spin_throttle = crsf.getThrottle();
            current_ramped_throttle = base_spin_throttle;

            float trans_mag = crsf.getTranslationMagnitude();
            desired_heading = crsf.getTranslationAngleRad();

            // Heading trim adjustment via yaw stick
            driver_lead_trim_rad = crsf.getYaw() * 0.40f;

            executeMeltyDriveModulation(base_spin_throttle, trans_mag, desired_heading,
                                       left_throttle, right_throttle);

            // Project stationary POV heading beam towards commanded translation direction
            HeadingLEDMode led_mode = (HeadingLEDMode)crsf.getLEDMode();
            heading.updateLEDs(desired_heading, led_mode);
            break;
        }

        case STATE_AUTO_AI_HUNT: {
            base_spin_throttle = crsf.getThrottle();
            current_ramped_throttle = base_spin_throttle;

            float trans_mag = 0.0f;
            if (lidar.hasTarget()) {
                // Autonomous Opponent Lock:
                // Direct translation vector towards target azimuth + dynamic lead angle
                desired_heading = lidar.getAttackAngleRad();
                trans_mag = lidar.getRammingTranslationMagnitude();
            } else {
                // Search rotation when opponent not yet acquired
                desired_heading = 0.0f;
                trans_mag = 0.0f;
            }

            executeMeltyDriveModulation(base_spin_throttle, trans_mag, desired_heading,
                                       left_throttle, right_throttle);

            // Virtual beam illuminates attack vector
            heading.updateLEDs(desired_heading, LED_MODE_FRONT_AND_REAR);
            break;
        }
    }

    // 9. Dispatch DShot600 Packets to ESCs
    dshot.setThrottles(left_throttle, right_throttle);
    dshot.sendFrame();

    // 10. Periodic Pit Telemetry (50 Hz)
    uint32_t now_ms = millis();
    if (now_ms - last_telemetry_time_ms >= 20) {
        last_telemetry_time_ms = now_ms;
        printTelemetryStream();
    }
}

void handleStateTransitions(const SafetyStatus &safety) {
    if (!safety.all_safe) {
        system_state = STATE_FAILSAFE;
        return;
    }

    // Check emergency kill switch
    if (crsf.isEmergencyKillTriggered()) {
        system_state = STATE_FAILSAFE;
        return;
    }

    bool arm_switch = crsf.isArmSwitchActive();
    float throttle = crsf.getThrottle();
    float rpm = accel.getRPM();
    MeltyDriveModeSelect mode_sw = crsf.getModeSelect();

    switch (system_state) {
        case STATE_FAILSAFE:
            // Recover from failsafe only when switch disarmed and throttle zeroed
            if (!arm_switch && throttle < 0.05f) {
                system_state = STATE_DISARMED;
            }
            break;

        case STATE_DISARMED:
            // Arming interlock: SA HIGH + Throttle ZERO
            if (arm_switch && throttle < 0.05f) {
                system_state = STATE_ARMED;
            }
            break;

        case STATE_ARMED:
            if (!arm_switch) {
                system_state = STATE_DISARMED;
            } else if (throttle > 0.05f) {
                system_state = STATE_SPINUP;
            }
            break;

        case STATE_SPINUP:
            if (!arm_switch) {
                system_state = STATE_DISARMED;
            } else if (throttle < 0.03f) {
                system_state = STATE_ARMED;
            } else if (rpm >= MELTY_MIN_TRANSLATE_RPM) {
                if (mode_sw == DRIVE_MODE_AI_HUNT) {
                    system_state = STATE_AUTO_AI_HUNT;
                } else {
                    system_state = STATE_MELTY_MANUAL;
                }
            }
            break;

        case STATE_MELTY_MANUAL:
            if (!arm_switch) {
                system_state = STATE_DISARMED;
            } else if (throttle < 0.05f) {
                system_state = STATE_ARMED;
            } else if (mode_sw == DRIVE_MODE_AI_HUNT) {
                system_state = STATE_AUTO_AI_HUNT;
            }
            break;

        case STATE_AUTO_AI_HUNT:
            if (!arm_switch) {
                system_state = STATE_DISARMED;
            } else if (throttle < 0.05f) {
                system_state = STATE_ARMED;
            } else if (mode_sw == DRIVE_MODE_MANUAL) {
                system_state = STATE_MELTY_MANUAL;
            }
            break;
    }
}

void executeMeltyDriveModulation(float spin_throttle, float trans_mag, float trans_angle_rad,
                                 float &left_out, float &right_out) {
    if (trans_mag < 0.02f) {
        // Pure weapon spin, no translation modulation
        left_out = spin_throttle;
        right_out = spin_throttle;
        return;
    }

    // Dynamic lead angle: compensates for motor latency and driver trim
    float omega = accel.getOmegaRadS();
    float dynamic_lead_rad = omega * MELTY_DEFAULT_LATENCY_S + driver_lead_trim_rad;

    // Instantaneous modulation phase relative to translation angle
    float current_heading = heading.getHeadingRad();
    float phase_rad = current_heading - trans_angle_rad - dynamic_lead_rad;

    // Sinusoidal superposition modulation term [-1.0 .. 1.0]
    float mod_factor = sinf(phase_rad);

    // Modulation depth scaled by translation magnitude
    float max_depth = MELTY_MAX_MODULATION_DEPTH;
    float delta_throttle = trans_mag * max_depth * mod_factor;

    // Differential motor pulse:
    // When left motor surges, right motor dips, pushing chassis towards heading
    left_out  = spin_throttle + delta_throttle;
    right_out = spin_throttle - delta_throttle;

    // Clamp throttle to valid [0.0 .. 1.0] limits
    if (left_out < 0.0f)   left_out = 0.0f;
    if (left_out > 1.0f)   left_out = 1.0f;
    if (right_out < 0.0f)  right_out = 0.0f;
    if (right_out > 1.0f)  right_out = 1.0f;
}

uint16_t readBatteryVoltageMV() {
#ifdef ARDUINO
    // 10:1 resistor divider on Analog pin A0 (Pin 14)
    // 3.3V reference / 1024 counts -> 3.22 mV per count * 11 = ~35.4 mV/count
    uint32_t adc = analogRead(PIN_VBAT_SENSE);
    if (adc == 0) return 14800; // Bench fallback if unpopulated
    return (uint16_t)(adc * 35.4f);
#else
    return 14800;
#endif
}

void printTelemetryStream() {
    if (!Serial) return;

    static const char *state_names[] = {
        "DISARMED", "ARMED", "SPINUP", "MANUAL", "AI_HUNT", "FAILSAFE"
    };

    Serial.print(F("STATE:"));
    Serial.print(state_names[system_state]);
    Serial.print(F(" | RPM:"));
    Serial.print((int)accel.getRPM());
    Serial.print(F(" | ACC1:"));
    Serial.print((int)accel.getS1RadialMSS());
    Serial.print(F(" | ACC2:"));
    Serial.print((int)accel.getS2RadialMSS());
    Serial.print(F(" | IMPACT:"));
    Serial.print((int)accel.getLateralImpactMSS());
    Serial.print(F(" | HDG:"));
    Serial.print((int)heading.getHeadingDeg());
    Serial.print(F(" | VBAT:"));
    Serial.print(current_vbat_mv / 1000.0f, 2);
    Serial.print(F("V | LQ:"));
    Serial.print(crsf.getLinkQuality());
    Serial.print(F("% | LIDAR:"));
    if (lidar.hasTarget()) {
        Serial.print(F("LOCK("));
        Serial.print(lidar.getTargetDistanceM(), 2);
        Serial.print(F("m,"));
        Serial.print((int)(lidar.getTargetAngleRad() * (180.0f / PI_F)));
        Serial.print(F("deg)"));
    } else {
        Serial.print(F("SCAN"));
    }
    Serial.println();
}
