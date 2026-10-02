#include "DualAccelerometer.h"

#define SQRT_2               1.41421356f
#define INV_SQRT_2           0.70710678f
#define TWO_PI_F             6.283185307f
#define RADS_TO_RPM          (60.0f / TWO_PI_F)
#define RPM_TO_RADS          (TWO_PI_F / 60.0f)
#define SATURATION_THRESHOLD_MSS (3850.0f) // Close to 400g (3922 m/s^2)

#ifdef ARDUINO
static SPISettings h3lis_spi_settings(10000000, MSBFIRST, SPI_MODE3);
#endif

DualAccelerometer::DualAccelerometer(uint8_t cs1_pin, uint8_t cs2_pin,
                                     float radius1_m, float radius2_m)
    : _cs1(cs1_pin),
      _cs2(cs2_pin),
      _r1_m(radius1_m),
      _r2_m(radius2_m),
      _s1_radial_mss(0.0f),
      _s1_tangential_mss(0.0f),
      _s2_radial_mss(0.0f),
      _s2_tangential_mss(0.0f),
      _centripetal_accel_mss(0.0f),
      _tangential_accel_mss(0.0f),
      _lateral_impact_mss(0.0f),
      _cor_shift_m(0.0f),
      _omega_rad_s(0.0f),
      _rpm(0.0f),
      _alpha_rad_s2(0.0f),
      _sensor1_healthy(false),
      _sensor2_healthy(false),
      _saturation_count(0) {
    _baseline_m = _r1_m + _r2_m;

    memset(&_calib1, 0, sizeof(_calib1));
    _calib1.scale_x = 1.0f;
    _calib1.scale_y = 1.0f;
    _calib1.scale_z = 1.0f;

    memset(&_calib2, 0, sizeof(_calib2));
    _calib2.scale_x = 1.0f;
    _calib2.scale_y = 1.0f;
    _calib2.scale_z = 1.0f;

    memset(&_raw1, 0, sizeof(_raw1));
    memset(&_raw2, 0, sizeof(_raw2));
}

void DualAccelerometer::setRadii(float r1_m, float r2_m) {
    _r1_m = (r1_m > 0.005f) ? r1_m : 0.025f;
    _r2_m = (r2_m > 0.005f) ? r2_m : 0.025f;
    _baseline_m = _r1_m + _r2_m;
}

void DualAccelerometer::writeRegister(uint8_t cs_pin, uint8_t reg, uint8_t val) {
#ifdef ARDUINO
    SPI.beginTransaction(h3lis_spi_settings);
    digitalWriteFast(cs_pin, LOW);
    SPI.transfer(reg & 0x3F); // Bit 7=0 (Write), Bit 6=0 (Single)
    SPI.transfer(val);
    digitalWriteFast(cs_pin, HIGH);
    SPI.endTransaction();
#else
    (void)cs_pin; (void)reg; (void)val;
#endif
}

uint8_t DualAccelerometer::readRegister(uint8_t cs_pin, uint8_t reg) {
#ifdef ARDUINO
    SPI.beginTransaction(h3lis_spi_settings);
    digitalWriteFast(cs_pin, LOW);
    SPI.transfer(reg | H3LIS331_SPI_READ_FLAG);
    uint8_t val = SPI.transfer(0x00);
    digitalWriteFast(cs_pin, HIGH);
    SPI.endTransaction();
    return val;
#else
    (void)cs_pin; (void)reg;
    return H3LIS331_WHO_AM_I_VAL;
#endif
}

void DualAccelerometer::readAxes(uint8_t cs_pin, AccelRawSample &sample) {
#ifdef ARDUINO
    SPI.beginTransaction(h3lis_spi_settings);
    digitalWriteFast(cs_pin, LOW);
    // Send register address with READ and MULTIPLE flags set
    SPI.transfer(H3LIS331_REG_OUT_X_L | H3LIS331_SPI_READ_FLAG | H3LIS331_SPI_MULTIPLE_FLAG);

    uint8_t xl = SPI.transfer(0x00);
    uint8_t xh = SPI.transfer(0x00);
    uint8_t yl = SPI.transfer(0x00);
    uint8_t yh = SPI.transfer(0x00);
    uint8_t zl = SPI.transfer(0x00);
    uint8_t zh = SPI.transfer(0x00);

    digitalWriteFast(cs_pin, HIGH);
    SPI.endTransaction();

    sample.x = (int16_t)(((uint16_t)xh << 8) | xl);
    sample.y = (int16_t)(((uint16_t)yh << 8) | yl);
    sample.z = (int16_t)(((uint16_t)zh << 8) | zl);
#else
    (void)cs_pin; (void)sample;
#endif
}

bool DualAccelerometer::begin() {
#ifdef ARDUINO
    pinMode(_cs1, OUTPUT);
    pinMode(_cs2, OUTPUT);
    digitalWriteFast(_cs1, HIGH);
    digitalWriteFast(_cs2, HIGH);

    SPI.begin();
    delay(10);

    // Read WHO_AM_I from both chips
    uint8_t who1 = readRegister(_cs1, H3LIS331_REG_WHO_AM_I);
    uint8_t who2 = readRegister(_cs2, H3LIS331_REG_WHO_AM_I);

    _sensor1_healthy = (who1 == H3LIS331_WHO_AM_I_VAL);
    _sensor2_healthy = (who2 == H3LIS331_WHO_AM_I_VAL);

    // Configure Sensor 1 if detected
    if (_sensor1_healthy) {
        // CTRL1: Power ON, ODR = 1000Hz (bits 4:3 = 11), X/Y/Z enable (bits 2:0 = 111) -> 0x3F
        writeRegister(_cs1, H3LIS331_REG_CTRL1, 0x3F);
        // CTRL4: Block Data Update (BDU bit 7=1), +-400g scale (bits 5:4 = 11) -> 0xB0
        writeRegister(_cs1, H3LIS331_REG_CTRL4, 0xB0);
    }

    // Configure Sensor 2 if detected
    if (_sensor2_healthy) {
        writeRegister(_cs2, H3LIS331_REG_CTRL1, 0x3F);
        writeRegister(_cs2, H3LIS331_REG_CTRL4, 0xB0);
    }

    return _sensor1_healthy || _sensor2_healthy;
#else
    _sensor1_healthy = true;
    _sensor2_healthy = true;
    return true;
#endif
}

void DualAccelerometer::calibrateStationaryZero(uint16_t samples) {
    if (samples == 0) return;

    float sum_x1 = 0, sum_y1 = 0, sum_z1 = 0;
    float sum_x2 = 0, sum_y2 = 0, sum_z2 = 0;

    for (uint16_t i = 0; i < samples; i++) {
        if (_sensor1_healthy) {
            readAxes(_cs1, _raw1);
            sum_x1 += (float)_raw1.x * H3LIS331_SCALE_400G_MSS;
            sum_y1 += (float)_raw1.y * H3LIS331_SCALE_400G_MSS;
            sum_z1 += (float)_raw1.z * H3LIS331_SCALE_400G_MSS;
        }
        if (_sensor2_healthy) {
            readAxes(_cs2, _raw2);
            sum_x2 += (float)_raw2.x * H3LIS331_SCALE_400G_MSS;
            sum_y2 += (float)_raw2.y * H3LIS331_SCALE_400G_MSS;
            sum_z2 += (float)_raw2.z * H3LIS331_SCALE_400G_MSS;
        }
#ifdef ARDUINO
        delayMicroseconds(1000);
#endif
    }

    if (_sensor1_healthy) {
        _calib1.offset_x_mss = sum_x1 / samples;
        _calib1.offset_y_mss = sum_y1 / samples;
        _calib1.offset_z_mss = sum_z1 / samples;
    }
    if (_sensor2_healthy) {
        _calib2.offset_x_mss = sum_x2 / samples;
        _calib2.offset_y_mss = sum_y2 / samples;
        _calib2.offset_z_mss = sum_z2 / samples;
    }
}

void DualAccelerometer::update(float dt, float spin_direction) {
    if (dt <= 0.00001f) dt = 0.001f;

    // Read SPI registers from available sensors
    if (_sensor1_healthy) {
        readAxes(_cs1, _raw1);
    }
    if (_sensor2_healthy) {
        readAxes(_cs2, _raw2);
    }

    // Convert raw counts to physical acceleration m/s^2 with calibration
    float s1_ax = ((float)_raw1.x * H3LIS331_SCALE_400G_MSS - _calib1.offset_x_mss) * _calib1.scale_x;
    float s1_ay = ((float)_raw1.y * H3LIS331_SCALE_400G_MSS - _calib1.offset_y_mss) * _calib1.scale_y;

    float s2_ax = ((float)_raw2.x * H3LIS331_SCALE_400G_MSS - _calib2.offset_x_mss) * _calib2.scale_x;
    float s2_ay = ((float)_raw2.y * H3LIS331_SCALE_400G_MSS - _calib2.offset_y_mss) * _calib2.scale_y;

    // Detect saturation (near +-400g)
    if (fabsf(s1_ax) > SATURATION_THRESHOLD_MSS || fabsf(s1_ay) > SATURATION_THRESHOLD_MSS ||
        fabsf(s2_ax) > SATURATION_THRESHOLD_MSS || fabsf(s2_ay) > SATURATION_THRESHOLD_MSS) {
        _saturation_count++;
    }

    // 45-Degree Opposed Geometry Coordinate Transformation
    // Axis X is oriented at +45 deg to Radial outward vector
    // Axis Y is oriented at +135 deg to Radial outward vector (+45 deg to Tangential spin vector)
    //
    // a_x = a_r * cos(45) + a_t * sin(45) = (a_r + a_t) / sqrt(2)
    // a_y = -a_r * sin(45) + a_t * cos(45) = (-a_r + a_t) / sqrt(2)
    //
    // -> Radial     a_r = (a_x - a_y) * (1 / sqrt(2)) = (a_x - a_y) * 0.70710678
    // -> Tangential a_t = (a_x + a_y) * (1 / sqrt(2)) = (a_x + a_y) * 0.70710678
    _s1_radial_mss     = (s1_ax - s1_ay) * INV_SQRT_2;
    _s1_tangential_mss = (s1_ax + s1_ay) * INV_SQRT_2;

    _s2_radial_mss     = (s2_ax - s2_ay) * INV_SQRT_2;
    _s2_tangential_mss = (s2_ax + s2_ay) * INV_SQRT_2;

    float omega_inst = 0.0f;
    float alpha_inst = 0.0f;

    if (_sensor1_healthy && _sensor2_healthy) {
        // Dual Opposed Differential Fusion:
        // Centripetal acceleration is purely radial outwards from Center of Rotation:
        // a_c1 = omega^2 * r1, a_c2 = omega^2 * r2
        //
        // An external impact shock vector a_shock creates an identical linear acceleration
        // across the entire chassis. In the opposed coordinate frames (+u for S1, -u for S2):
        // S1_meas = a_c1 + a_shock
        // S2_meas = a_c2 - a_shock
        //
        // Radial Sum = S1_meas + S2_meas = a_c1 + a_c2 = omega^2 * (r1 + r2) = omega^2 * baseline!
        // Common-mode lateral impact a_shock cancels out completely!
        float radial_sum = _s1_radial_mss + _s2_radial_mss;
        if (radial_sum > 0.1f) {
            omega_inst = sqrtf(radial_sum / _baseline_m);
        } else {
            omega_inst = 0.0f;
        }

        // Differential tangential acceleration gives angular acceleration alpha:
        float tangential_sum = _s1_tangential_mss + _s2_tangential_mss;
        alpha_inst = tangential_sum / _baseline_m;

        // Isolate impact magnitude that was successfully rejected:
        _lateral_impact_mss = fabsf(_s1_radial_mss - _s2_radial_mss) * 0.5f;

        // Dynamic Center of Rotation (CoR) tracking when spinning > 300 RPM
        if (omega_inst > (300.0f * RPM_TO_RADS) && radial_sum > 20.0f) {
            float measured_r1 = (_s1_radial_mss / radial_sum) * _baseline_m;
            _cor_shift_m = measured_r1 - _r1_m;
        }
    } else if (_sensor1_healthy) {
        // Single sensor fallback on Sensor 1
        if (_s1_radial_mss > 0.1f) {
            omega_inst = sqrtf(_s1_radial_mss / _r1_m);
        }
        alpha_inst = _s1_tangential_mss / _r1_m;
        _lateral_impact_mss = 0.0f;
        _cor_shift_m = 0.0f;
    } else if (_sensor2_healthy) {
        // Single sensor fallback on Sensor 2
        if (_s2_radial_mss > 0.1f) {
            omega_inst = sqrtf(_s2_radial_mss / _r2_m);
        }
        alpha_inst = _s2_tangential_mss / _r2_m;
        _lateral_impact_mss = 0.0f;
        _cor_shift_m = 0.0f;
    }

    // Apply spin direction (+1.0 for CCW, -1.0 for CW)
    float signed_omega = (spin_direction >= 0.0f) ? omega_inst : -omega_inst;

    // Fast low-pass filter (150Hz cutoff) to eliminate sensor quantization noise
    const float lpf_cutoff_hz = 150.0f;
    float lpf_alpha = dt / (dt + (1.0f / (TWO_PI_F * lpf_cutoff_hz)));
    if (lpf_alpha > 1.0f) lpf_alpha = 1.0f;

    _omega_rad_s += lpf_alpha * (signed_omega - _omega_rad_s);
    _alpha_rad_s2 += lpf_alpha * (alpha_inst - _alpha_rad_s2);

    _rpm = fabsf(_omega_rad_s) * RADS_TO_RPM;
    _centripetal_accel_mss = (_s1_radial_mss + _s2_radial_mss) * 0.5f;
    _tangential_accel_mss = (_s1_tangential_mss + _s2_tangential_mss) * 0.5f;
}
