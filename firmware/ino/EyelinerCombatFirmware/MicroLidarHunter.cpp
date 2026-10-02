#include "MicroLidarHunter.h"

#define TWO_PI_F             6.283185307f
#define BIN_ANGLE_WIDTH_RAD  (TWO_PI_F / (float)LIDAR_POLAR_BINS)
#define VL53L4CD_I2C_ADDR    0x29

MicroLidarHunter::MicroLidarHunter(LidarSensorType sensor_type)
    : _sensor_type(sensor_type),
      _target_locked(false),
      _target_bin(0),
      _target_azimuth_rad(0.0f),
      _attack_azimuth_rad(0.0f),
      _target_distance_mm(0),
      _last_target_time_ms(0),
      _total_samples(0),
      _uart_idx(0) {
    for (uint8_t i = 0; i < LIDAR_POLAR_BINS; i++) {
        _polar_map[i].current_dist_mm = LIDAR_MAX_RANGE_MM;
        _polar_map[i].filtered_dist_mm = LIDAR_MAX_RANGE_MM;
        _polar_map[i].wall_baseline_mm = 2200; // 2.2m default arena wall baseline
        _polar_map[i].hit_count = 0;
        _polar_map[i].last_update_ms = 0;
    }
}

bool MicroLidarHunter::begin() {
#ifdef ARDUINO
    if (_sensor_type == LIDAR_TYPE_VL53L4CD_I2C) {
        Wire.begin();
        Wire.setClock(400000); // 400kHz fast I2C mode
        delay(10);

        // Ping VL53L4CD
        Wire.beginTransmission(VL53L4CD_I2C_ADDR);
        if (Wire.endTransmission() != 0) {
            // Fallback to simulated if device not on bus
            _sensor_type = LIDAR_TYPE_SIMULATED;
            return false;
        }
        return true;
    } else if (_sensor_type == LIDAR_TYPE_TF_LUNA_UART) {
        Serial2.begin(115200); // Benewake TF-Luna default UART
        delay(10);
        return true;
    }
#endif
    return true;
}

bool MicroLidarHunter::pollVL53L4CD(uint16_t &dist_mm) {
#ifdef ARDUINO
    // Read 2-byte distance register 0x0096 / 0x0097 from VL53L4CD
    Wire.beginTransmission(VL53L4CD_I2C_ADDR);
    Wire.write(0x00);
    Wire.write(0x96);
    if (Wire.endTransmission(false) != 0) {
        return false;
    }

    if (Wire.requestFrom((uint8_t)VL53L4CD_I2C_ADDR, (uint8_t)2) == 2) {
        uint8_t msb = Wire.read();
        uint8_t lsb = Wire.read();
        dist_mm = ((uint16_t)msb << 8) | lsb;
        return (dist_mm >= LIDAR_MIN_RANGE_MM && dist_mm <= LIDAR_MAX_RANGE_MM);
    }
#else
    (void)dist_mm;
#endif
    return false;
}

bool MicroLidarHunter::pollTFLuna(uint16_t &dist_mm) {
#ifdef ARDUINO
    while (Serial2.available() > 0) {
        uint8_t b = Serial2.read();

        if (_uart_idx == 0) {
            if (b == 0x59) _uart_buf[_uart_idx++] = b;
        } else if (_uart_idx == 1) {
            if (b == 0x59) _uart_buf[_uart_idx++] = b;
            else _uart_idx = 0;
        } else {
            _uart_buf[_uart_idx++] = b;
            if (_uart_idx >= 9) {
                // Verify checksum
                uint8_t checksum = 0;
                for (uint8_t i = 0; i < 8; i++) checksum += _uart_buf[i];

                if (checksum == _uart_buf[8]) {
                    uint16_t dist_cm = (uint16_t)_uart_buf[2] | ((uint16_t)_uart_buf[3] << 8);
                    dist_mm = dist_cm * 10;
                    _uart_idx = 0;
                    return (dist_mm >= LIDAR_MIN_RANGE_MM && dist_mm <= LIDAR_MAX_RANGE_MM);
                }
                _uart_idx = 0;
            }
        }
    }
#else
    (void)dist_mm;
#endif
    return false;
}

void MicroLidarHunter::processRangeSample(uint16_t distance_mm, float angle_rad) {
    if (distance_mm < LIDAR_MIN_RANGE_MM || distance_mm > LIDAR_MAX_RANGE_MM) {
        return;
    }

    _total_samples++;

    // Wrap angle to [0..2pi)
    while (angle_rad < 0.0f) angle_rad += TWO_PI_F;
    while (angle_rad >= TWO_PI_F) angle_rad -= TWO_PI_F;

    // Determine polar bin [0..35]
    uint8_t bin = (uint8_t)((angle_rad / TWO_PI_F) * LIDAR_POLAR_BINS);
    if (bin >= LIDAR_POLAR_BINS) bin = LIDAR_POLAR_BINS - 1;

    PolarScanBin &b = _polar_map[bin];
    b.current_dist_mm = distance_mm;

    // Instant initialization on first detection, then smooth with moving average
    if (b.hit_count == 0) {
        b.filtered_dist_mm = distance_mm;
    } else {
        const float alpha = 0.35f;
        b.filtered_dist_mm = (uint16_t)(alpha * distance_mm + (1.0f - alpha) * b.filtered_dist_mm);
    }
    if (b.hit_count < 255) b.hit_count++;

#ifdef ARDUINO
    b.last_update_ms = millis();
#endif
}

void MicroLidarHunter::update(float current_heading_rad, float current_rpm) {
    uint16_t dist_mm = 0;
    bool sample_ready = false;

    if (_sensor_type == LIDAR_TYPE_VL53L4CD_I2C) {
        sample_ready = pollVL53L4CD(dist_mm);
    } else if (_sensor_type == LIDAR_TYPE_TF_LUNA_UART) {
        sample_ready = pollTFLuna(dist_mm);
    }

    if (sample_ready) {
        processRangeSample(dist_mm, current_heading_rad);
    }

    trackOpponent(current_rpm);
}

void MicroLidarHunter::trackOpponent(float current_rpm) {
    uint16_t closest_dist = 65535;
    int16_t best_bin = -1;

#ifdef ARDUINO
    uint32_t now = millis();
#else
    uint32_t now = 0;
#endif

    // Search for closest foreground cluster distinct from arena walls
    for (uint8_t i = 0; i < LIDAR_POLAR_BINS; i++) {
        PolarScanBin &b = _polar_map[i];

        // Ensure bin measurement is fresh (< 200ms)
        if (now - b.last_update_ms > 200 && now >= 200) {
            continue;
        }

        // Check if distance is substantially closer than known arena wall envelope
        bool is_foreground = (b.filtered_dist_mm + LIDAR_WALL_MARGIN_MM) < b.wall_baseline_mm;
        bool is_valid_opponent_range = (b.filtered_dist_mm >= LIDAR_MIN_RANGE_MM &&
                                        b.filtered_dist_mm <= LIDAR_OPPONENT_THRESHOLD_MM);

        if (is_foreground && is_valid_opponent_range) {
            if (b.filtered_dist_mm < closest_dist) {
                closest_dist = b.filtered_dist_mm;
                best_bin = i;
            }
        }
    }

    if (best_bin >= 0 && closest_dist <= LIDAR_OPPONENT_THRESHOLD_MM) {
        _target_locked = true;
        _target_bin = (uint8_t)best_bin;
        _target_distance_mm = closest_dist;
        _last_target_time_ms = now;

        // Compute smooth target azimuth from bin center
        _target_azimuth_rad = ((float)_target_bin + 0.5f) * BIN_ANGLE_WIDTH_RAD;

        // Phase advance / lead compensation for translation drive
        // At 3000 RPM, the robot takes ~3.5ms motor response latency to apply translation vector.
        // Rotational lead angle = omega * latency:
        float omega = current_rpm * (TWO_PI_F / 60.0f);
        const float motor_latency_s = 0.0035f;
        float lead_angle_rad = omega * motor_latency_s;

        // Ramming vector aims straight along target azimuth plus lead
        _attack_azimuth_rad = _target_azimuth_rad + lead_angle_rad;
        while (_attack_azimuth_rad >= TWO_PI_F) _attack_azimuth_rad -= TWO_PI_F;
    } else {
        if (now - _last_target_time_ms > LIDAR_TRACK_TIMEOUT_MS) {
            _target_locked = false;
        }
    }
}

float MicroLidarHunter::getRammingTranslationMagnitude() const {
    if (!_target_locked) {
        return 0.0f; // No target locked: keep pure weapon spin
    }

    // When opponent locked: modulate full translational power to ram opponent!
    // Closer target gets maximum translational thrust
    if (_target_distance_mm < 600) {
        return 1.0f; // Full ramming attack thrust
    } else if (_target_distance_mm < 1200) {
        return 0.85f;
    } else {
        return 0.70f;
    }
}

uint16_t MicroLidarHunter::getBinDistanceMM(uint8_t bin) const {
    if (bin < LIDAR_POLAR_BINS) {
        return _polar_map[bin].filtered_dist_mm;
    }
    return LIDAR_MAX_RANGE_MM;
}

void MicroLidarHunter::learnArenaWalls(uint16_t duration_ms) {
    (void)duration_ms;
    // Snapshot current filtered distances as arena baseline walls
    for (uint8_t i = 0; i < LIDAR_POLAR_BINS; i++) {
        if (_polar_map[i].filtered_dist_mm > 800) {
            _polar_map[i].wall_baseline_mm = _polar_map[i].filtered_dist_mm;
        } else {
            _polar_map[i].wall_baseline_mm = 2000;
        }
    }
}
