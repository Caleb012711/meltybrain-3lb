#ifndef MELTY_CONFIG_H
#define MELTY_CONFIG_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ========================================================================== */
/*                             GEOMETRY & SENSORS                             */
/* ========================================================================== */

/** Nominal distance from Center of Rotation to Sensor 1 in meters (e.g. 25mm) */
#define MELTY_ACCEL_RADIUS_1_M            (0.025f)

/** Nominal distance from Center of Rotation to Sensor 2 in meters (e.g. 25mm) */
#define MELTY_ACCEL_RADIUS_2_M            (0.025f)

/** Total baseline between dual opposed accelerometers in meters (50mm) */
#define MELTY_ACCEL_BASELINE_M            (MELTY_ACCEL_RADIUS_1_M + MELTY_ACCEL_RADIUS_2_M)

/** Earth standard gravity in m/s^2 */
#define MELTY_GRAVITY_MSS                 (9.80665f)

/** H3LIS331DLTR Full Scale sensitivity in m/s^2 per LSB at +-400g (12-bit / 400g) */
/* 400g / 2048 LSB = ~0.1953 g/LSB -> 1.9154 m/s^2 per LSB */
#define H3LIS331_SCALE_400G_MSS_PER_LSB   (0.1953125f * MELTY_GRAVITY_MSS)

/** Maximum safe operational RPM (3500 RPM test cap, 4000 RPM absolute cutoff) */
#define MELTY_MAX_OPERATING_RPM           (3500.0f)
#define MELTY_MAX_LIMIT_RPM               (4000.0f)

/** Minimum RPM required before enabling translational modulation */
#define MELTY_MIN_TRANSLATE_RPM           (800.0f)

/* ========================================================================== */
/*                             CONTROL LOOP TIMING                            */
/* ========================================================================== */

/** Fast control loop frequency in Hz (e.g. 1000 Hz or 8000 Hz) */
#define MELTY_CONTROL_LOOP_HZ             (1000.0f)
#define MELTY_CONTROL_LOOP_DT             (1.0f / MELTY_CONTROL_LOOP_HZ)

/** Telemetry rate in Hz */
#define MELTY_TELEMETRY_HZ                (50.0f)

/** RC link loss failsafe timeout in milliseconds (SPARC standard <= 100ms) */
#define MELTY_RC_TIMEOUT_MS               (100)

/** Brownout minimum voltage for 4S LiPo in millivolts */
#define MELTY_VBAT_CRITICAL_MV            (12000)
#define MELTY_VBAT_WARNING_MV             (13600)

/* ========================================================================== */
/*                       TRANSLATIONAL DRIVE PARAMETERS                       */
/* ========================================================================== */

/** Default motor mechanical + electrical response latency in seconds */
#define MELTY_DEFAULT_MOTOR_LATENCY_S     (0.0035f) /* 3.5 ms */

/** Maximum translation throttle modulation depth (0.0 to 1.0) */
#define MELTY_MAX_MODULATION_DEPTH        (0.65f)

/** LED flash window size in radians (for virtual heading beam) */
#define MELTY_LED_WINDOW_RAD              (0.2618f) /* ~15 degrees */

#ifdef __cplusplus
}
#endif

#endif /* MELTY_CONFIG_H */
