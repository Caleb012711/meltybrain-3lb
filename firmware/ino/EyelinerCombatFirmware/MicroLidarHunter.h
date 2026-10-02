#ifndef MICRO_LIDAR_HUNTER_H
#define MICRO_LIDAR_HUNTER_H

#include <stdint.h>
#include <stdbool.h>

#ifdef ARDUINO
#include <Arduino.h>
#include <Wire.h>
#else
#include <cmath>
#include <cstring>
#endif

/**
 * @file MicroLidarHunter.h
 * @brief High-speed Micro-LiDAR (VL53L4CD / TF-Luna) 360-Degree Target Hunter
 *
 * Designed for 3,000 RPM (50 rev/sec) spinning meltybrain combat robots.
 * Maps distance vs. rotational angle into a 36-bin (10-degree) polar scan map.
 * Filters arena wall background and tracks opponent centroid azimuth to automatically
 * modulate translational phase and ram the opponent in AUTO_AI_HUNT mode!
 */

#define LIDAR_POLAR_BINS               36      // 36 bins = 10 degrees per bin
#define LIDAR_MAX_RANGE_MM             3500    // 3.5m max arena range
#define LIDAR_MIN_RANGE_MM             100     // 10cm min deadzone
#define LIDAR_OPPONENT_THRESHOLD_MM    1800    // Opponents detected within 1.8m
#define LIDAR_WALL_MARGIN_MM           350     // Target must be 35cm closer than arena wall
#define LIDAR_TRACK_TIMEOUT_MS         250     // Target lock lost after 250ms silence

// Supported Sensor Hardware Types
enum LidarSensorType {
    LIDAR_TYPE_VL53L4CD_I2C = 0, // ST VL53L4CD on Wire (Pins 18 SDA, 19 SCL)
    LIDAR_TYPE_TF_LUNA_UART = 1, // Benewake TF-Luna on Serial2 (Pins 7 RX, 8 TX)
    LIDAR_TYPE_SIMULATED    = 2  // Bench simulation / fallback
};

struct PolarScanBin {
    uint16_t current_dist_mm;     // Most recent distance measurement
    uint16_t filtered_dist_mm;    // Exponential moving average distance
    uint16_t wall_baseline_mm;    // Learned arena wall background envelope
    uint8_t  hit_count;           // Number of detections in this bin
    uint32_t last_update_ms;      // Timestamp of last update
};

class MicroLidarHunter {
public:
    MicroLidarHunter(LidarSensorType sensor_type = LIDAR_TYPE_VL53L4CD_I2C);

    /**
     * @brief Initialize hardware bus (I2C Wire or Serial2) and sensor registers
     * @return True if sensor handshake succeeded
     */
    bool begin();

    /**
     * @brief Poll LiDAR sensor for new range sample and map into polar horizon
     * @param current_heading_rad Instantaneous bot heading [0..2pi) from HeadingTracker
     * @param current_rpm Instantaneous bot rotational speed
     */
    void update(float current_heading_rad, float current_rpm);

    /**
     * @brief Learn background arena walls while robot is in center arena
     */
    void learnArenaWalls(uint16_t duration_ms = 1500);

    /**
     * @brief Manual feed for simulated range sample or external supervisor
     * @param distance_mm Measured range in mm
     * @param angle_rad Angle at which measurement was captured [0..2pi)
     */
    void processRangeSample(uint16_t distance_mm, float angle_rad);

    // AI Opponent Hunting Getters
    bool hasTarget() const { return _target_locked; }
    float getTargetAngleRad() const { return _target_azimuth_rad; }
    float getAttackAngleRad() const { return _attack_azimuth_rad; }
    float getTargetDistanceM() const { return (float)_target_distance_mm / 1000.0f; }
    float getRammingTranslationMagnitude() const;

    // Diagnostics & Raw Map
    uint16_t getBinDistanceMM(uint8_t bin) const;
    uint8_t getTargetBin() const { return _target_bin; }
    uint32_t getSampleCount() const { return _total_samples; }

private:
    LidarSensorType _sensor_type;
    PolarScanBin    _polar_map[LIDAR_POLAR_BINS];

    bool     _target_locked;
    uint8_t  _target_bin;
    float    _target_azimuth_rad;
    float    _attack_azimuth_rad;
    uint16_t _target_distance_mm;
    uint32_t _last_target_time_ms;
    uint32_t _total_samples;

    // TF-Luna UART frame parser buffer
    uint8_t  _uart_buf[9];
    uint8_t  _uart_idx;

    void trackOpponent(float current_rpm);
    bool pollVL53L4CD(uint16_t &dist_mm);
    bool pollTFLuna(uint16_t &dist_mm);
};

#endif // MICRO_LIDAR_HUNTER_H
