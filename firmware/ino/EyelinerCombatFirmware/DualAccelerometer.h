#ifndef DUAL_ACCELEROMETER_H
#define DUAL_ACCELEROMETER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef ARDUINO
#include <Arduino.h>
#include <SPI.h>
#else
#include <cmath>
#include <cstring>
#endif

/**
 * @file DualAccelerometer.h
 * @brief High-G Dual H3LIS331DLTR SPI Driver for Meltybrain Kinematic Tracking
 *
 * Hardware SPI on Teensy 4.0:
 * SCK  = Pin 13
 * MISO = Pin 12
 * MOSI = Pin 11
 * CS1  = Pin 9  (Sensor 1)
 * CS2  = Pin 10 (Sensor 2)
 *
 * Employs a 45-degree opposed mounting geometry to distribute dynamic range across
 * X & Y axes and cancel lateral impact spikes up to 400g via differential fusion.
 */

// H3LIS331DLTR Register Map
#define H3LIS331_REG_WHO_AM_I         0x0F
#define H3LIS331_WHO_AM_I_VAL         0x32

#define H3LIS331_REG_CTRL1            0x20
#define H3LIS331_REG_CTRL2            0x21
#define H3LIS331_REG_CTRL3            0x22
#define H3LIS331_REG_CTRL4            0x23
#define H3LIS331_REG_CTRL5            0x24

#define H3LIS331_REG_HP_FILTER_RESET  0x25
#define H3LIS331_REG_REFERENCE        0x26
#define H3LIS331_REG_STATUS           0x27

#define H3LIS331_REG_OUT_X_L          0x28
#define H3LIS331_REG_OUT_X_H          0x29
#define H3LIS331_REG_OUT_Y_L          0x2A
#define H3LIS331_REG_OUT_Y_H          0x2B
#define H3LIS331_REG_OUT_Z_L          0x2C
#define H3LIS331_REG_OUT_Z_H          0x2D

// SPI Read/Write and Multiple-byte flags
#define H3LIS331_SPI_READ_FLAG        0x80
#define H3LIS331_SPI_MULTIPLE_FLAG    0x40

// Sensitivity scale for +-400g range (12-bit left-aligned in 16-bit integer)
// 400g / 2048 counts = 0.1953125 g/LSB -> 1.91535 m/s^2 per LSB
#define GRAVITY_MSS                   9.80665f
#define H3LIS331_SCALE_400G_MSS       (0.1953125f * GRAVITY_MSS)

struct AccelRawSample {
    int16_t x;
    int16_t y;
    int16_t z;
};

struct AccelCalibration {
    float offset_x_mss;
    float offset_y_mss;
    float offset_z_mss;
    float scale_x;
    float scale_y;
    float scale_z;
};

class DualAccelerometer {
public:
    DualAccelerometer(uint8_t cs1_pin = 9, uint8_t cs2_pin = 10,
                      float radius1_m = 0.025f, float radius2_m = 0.025f);

    /**
     * @brief Initialize SPI bus, verify sensor communication, configure +-400g @ 1000Hz ODR
     * @return True if at least one sensor responded with WHO_AM_I 0x32
     */
    bool begin();

    /**
     * @brief Zero the static biases while the robot is stationary on pit table
     * @param samples Number of samples to average (e.g. 500)
     */
    void calibrateStationaryZero(uint16_t samples = 500);

    /**
     * @brief Read raw SPI data from both sensors, compute 45-deg transformation,
     * differential common-mode impact rejection, and angular velocity omega.
     * @param dt Time step in seconds (e.g. 0.001f for 1kHz loop)
     * @param spin_direction +1.0f for CCW spin, -1.0f for CW spin
     */
    void update(float dt, float spin_direction = 1.0f);

    // Kinematic State Getters
    float getRPM() const { return _rpm; }
    float getOmegaRadS() const { return _omega_rad_s; }
    float getAlphaRadS2() const { return _alpha_rad_s2; }
    float getCentripetalAccelMSS() const { return _centripetal_accel_mss; }
    float getTangentialAccelMSS() const { return _tangential_accel_mss; }
    float getLateralImpactMSS() const { return _lateral_impact_mss; }
    float getCenterOfRotationShiftM() const { return _cor_shift_m; }

    // Health and status
    bool isSensor1Healthy() const { return _sensor1_healthy; }
    bool isSensor2Healthy() const { return _sensor2_healthy; }
    bool isHealthy() const { return _sensor1_healthy || _sensor2_healthy; }
    uint32_t getSaturationCount() const { return _saturation_count; }

    // Direct access to individual sensor outputs (m/s^2)
    float getS1RadialMSS() const { return _s1_radial_mss; }
    float getS1TangentialMSS() const { return _s1_tangential_mss; }
    float getS2RadialMSS() const { return _s2_radial_mss; }
    float getS2TangentialMSS() const { return _s2_tangential_mss; }

    void setRadii(float r1_m, float r2_m);

private:
    uint8_t _cs1;
    uint8_t _cs2;
    float   _r1_m;
    float   _r2_m;
    float   _baseline_m;

    AccelCalibration _calib1;
    AccelCalibration _calib2;

    AccelRawSample _raw1;
    AccelRawSample _raw2;

    float _s1_radial_mss;
    float _s1_tangential_mss;
    float _s2_radial_mss;
    float _s2_tangential_mss;

    float _centripetal_accel_mss;
    float _tangential_accel_mss;
    float _lateral_impact_mss;
    float _cor_shift_m;

    float _omega_rad_s;
    float _rpm;
    float _alpha_rad_s2;

    bool _sensor1_healthy;
    bool _sensor2_healthy;
    uint32_t _saturation_count;

    // Low-level SPI helper methods
    void writeRegister(uint8_t cs_pin, uint8_t reg, uint8_t val);
    uint8_t readRegister(uint8_t cs_pin, uint8_t reg);
    void readAxes(uint8_t cs_pin, AccelRawSample &sample);
};

#endif // DUAL_ACCELEROMETER_H
