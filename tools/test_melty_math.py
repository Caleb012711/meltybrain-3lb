#!/usr/bin/env python3
"""
Unit tests and mathematical verification suite for Meltybrain 3lb firmware algorithms.
Covers:
1. Dual opposed H3LIS331 high-G accelerometer fusion, tangential/centripetal decomposition, and CoR shift immunity.
2. Heading estimation and optical/hall beacon Phase-Locked Loop (PLL) sync under noisy conditions.
3. Translational drive sine-wave throttle superposition and lead angle compensation.
4. Failsafe watchdog, arming sequence, over-RPM shutdown, and telemetry CRC-8.
"""

import ctypes
import math
import os
import pytest
import numpy as np

# Load C firmware shared library
LIB_PATH = os.path.join(os.path.dirname(__file__), "..", "firmware", "libmelty.dylib")

class H3LIS331RawSample(ctypes.Structure):
    _fields_ = [
        ("x", ctypes.c_int16),
        ("y", ctypes.c_int16),
        ("z", ctypes.c_int16),
    ]

class AccelCalib(ctypes.Structure):
    _fields_ = [
        ("offset_x_mss", ctypes.c_float),
        ("offset_y_mss", ctypes.c_float),
        ("offset_z_mss", ctypes.c_float),
        ("scale_x", ctypes.c_float),
        ("scale_y", ctypes.c_float),
        ("scale_z", ctypes.c_float),
    ]

class DualH3LIS331Tracker(ctypes.Structure):
    _fields_ = [
        ("baseline_m", ctypes.c_float),
        ("nominal_r1_m", ctypes.c_float),
        ("nominal_r2_m", ctypes.c_float),
        ("calib1", AccelCalib),
        ("calib2", AccelCalib),
        ("s1_radial_mss", ctypes.c_float),
        ("s1_tangential_mss", ctypes.c_float),
        ("s2_radial_mss", ctypes.c_float),
        ("s2_tangential_mss", ctypes.c_float),
        ("centripetal_accel_mss", ctypes.c_float),
        ("tangential_accel_mss", ctypes.c_float),
        ("omega_rad_s", ctypes.c_float),
        ("rpm", ctypes.c_float),
        ("alpha_rad_s2", ctypes.c_float),
        ("cor_shift_m", ctypes.c_float),
        ("sensor1_healthy", ctypes.c_bool),
        ("sensor2_healthy", ctypes.c_bool),
        ("sample_count", ctypes.c_uint32),
        ("saturated_count", ctypes.c_uint32),
    ]

class MeltyHeadingEstimator(ctypes.Structure):
    _fields_ = [
        ("heading_rad", ctypes.c_float),
        ("omega_fused_rad_s", ctypes.c_float),
        ("rpm_fused", ctypes.c_float),
        ("last_beacon_time_us", ctypes.c_uint32),
        ("beacon_period_s", ctypes.c_float),
        ("beacon_omega_rad_s", ctypes.c_float),
        ("phase_error_rad", ctypes.c_float),
        ("pll_integrator", ctypes.c_float),
        ("kp_pll", ctypes.c_float),
        ("ki_pll", ctypes.c_float),
        ("phase_step_gain", ctypes.c_float),
        ("beacon_locked", ctypes.c_bool),
        ("consecutive_beacons", ctypes.c_uint32),
        ("missed_beacons", ctypes.c_uint32),
        ("rejected_glitches", ctypes.c_uint32),
        ("led_active", ctypes.c_bool),
        ("led_offset_rad", ctypes.c_float),
    ]

class MeltyDriveModulator(ctypes.Structure):
    _fields_ = [
        ("motor_latency_s", ctypes.c_float),
        ("lead_angle_trim_rad", ctypes.c_float),
        ("trans_gain", ctypes.c_float),
        ("min_spin_throttle", ctypes.c_float),
        ("dshot_mode", ctypes.c_int),
        ("effective_lead_rad", ctypes.c_float),
        ("modulation_phase_rad", ctypes.c_float),
        ("modulation_value", ctypes.c_float),
        ("throttle_left", ctypes.c_float),
        ("throttle_right", ctypes.c_float),
        ("dshot_cmd_left", ctypes.c_uint16),
        ("dshot_cmd_right", ctypes.c_uint16),
    ]

class MeltyRCInput(ctypes.Structure):
    _fields_ = [
        ("ch_throttle", ctypes.c_float),
        ("ch_trans_x", ctypes.c_float),
        ("ch_trans_y", ctypes.c_float),
        ("ch_yaw_trim", ctypes.c_float),
        ("ch_arm_switch", ctypes.c_bool),
        ("ch_beacon_select", ctypes.c_bool),
        ("last_rc_frame_ms", ctypes.c_uint32),
        ("link_quality_pct", ctypes.c_uint8),
        ("rssi_dbm", ctypes.c_int8),
        ("rc_link_lost", ctypes.c_bool),
    ]

class MeltyFailsafe(ctypes.Structure):
    _fields_ = [
        ("state", ctypes.c_int),
        ("state_entered_ms", ctypes.c_uint32),
        ("accel_healthy", ctypes.c_bool),
        ("vbat_healthy", ctypes.c_bool),
        ("rc_healthy", ctypes.c_bool),
        ("over_rpm_detected", ctypes.c_bool),
        ("vbat_mv", ctypes.c_uint16),
        ("peak_rpm", ctypes.c_float),
        ("failsafe_events_count", ctypes.c_uint32),
    ]

@pytest.fixture(scope="module")
def clib():
    assert os.path.exists(LIB_PATH), f"Library {LIB_PATH} not found. Run make in firmware/ first."
    lib = ctypes.CDLL(LIB_PATH)
    
    # C function signatures
    lib.dual_h3lis331_init.argtypes = [ctypes.POINTER(DualH3LIS331Tracker), ctypes.c_float, ctypes.c_float]
    lib.dual_h3lis331_set_calibration.argtypes = [ctypes.POINTER(DualH3LIS331Tracker), ctypes.POINTER(AccelCalib), ctypes.POINTER(AccelCalib)]
    lib.dual_h3lis331_update.argtypes = [ctypes.POINTER(DualH3LIS331Tracker), ctypes.POINTER(H3LIS331RawSample), ctypes.POINTER(H3LIS331RawSample), ctypes.c_float, ctypes.c_float]
    
    lib.melty_heading_init.argtypes = [ctypes.POINTER(MeltyHeadingEstimator)]
    lib.melty_heading_update.argtypes = [ctypes.POINTER(MeltyHeadingEstimator), ctypes.c_float, ctypes.c_float, ctypes.c_float, ctypes.c_uint32]
    lib.melty_heading_on_beacon_pulse.argtypes = [ctypes.POINTER(MeltyHeadingEstimator), ctypes.c_uint32, ctypes.c_float]
    lib.melty_heading_on_beacon_pulse.restype = ctypes.c_bool
    lib.melty_heading_update_led.argtypes = [ctypes.POINTER(MeltyHeadingEstimator), ctypes.c_float, ctypes.c_float]
    lib.melty_wrap_2pi.argtypes = [ctypes.c_float]
    lib.melty_wrap_2pi.restype = ctypes.c_float
    lib.melty_wrap_pi.argtypes = [ctypes.c_float]
    lib.melty_wrap_pi.restype = ctypes.c_float

    lib.melty_drive_init.argtypes = [ctypes.POINTER(MeltyDriveModulator)]
    lib.melty_drive_modulate.argtypes = [ctypes.POINTER(MeltyDriveModulator), ctypes.c_float, ctypes.c_float, ctypes.c_float, ctypes.c_float, ctypes.c_float, ctypes.c_float]
    lib.melty_drive_throttle_to_dshot.argtypes = [ctypes.c_float, ctypes.c_int]
    lib.melty_drive_throttle_to_dshot.restype = ctypes.c_uint16

    lib.melty_failsafe_init.argtypes = [ctypes.POINTER(MeltyFailsafe)]
    lib.melty_failsafe_update.argtypes = [ctypes.POINTER(MeltyFailsafe), ctypes.POINTER(MeltyRCInput), ctypes.c_float, ctypes.c_uint16, ctypes.c_uint32]

    lib.melty_crc8.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.c_size_t]
    lib.melty_crc8.restype = ctypes.c_uint8

    return lib

LSB_SCALE_MSS = 0.1953125 * 9.80665

def mss_to_raw(mss: float) -> int:
    val = int(round(mss / LSB_SCALE_MSS))
    return max(-32768, min(32767, val))

# ============================================================================
# 1. High-G Accelerometer Sensor Fusion & RPM Tracking Tests
# ============================================================================

def test_dual_accel_rpm_tracking_up_to_3500(clib):
    """Verify dual H3LIS331 tracker accurately calculates RPM up to 3500 RPM."""
    tracker = DualH3LIS331Tracker()
    r1 = 0.025  # 25 mm
    r2 = 0.025  # 25 mm
    clib.dual_h3lis331_init(ctypes.byref(tracker), r1, r2)
    
    test_rpms = [500.0, 1200.0, 2400.0, 3200.0, 3500.0]
    dt = 0.001  # 1kHz loop
    
    for target_rpm in test_rpms:
        omega = target_rpm * (2.0 * math.pi / 60.0)
        a_r1 = (omega ** 2) * r1
        a_r2 = (omega ** 2) * r2
        
        s1 = H3LIS331RawSample(x=mss_to_raw(a_r1), y=0, z=0)
        s2 = H3LIS331RawSample(x=mss_to_raw(a_r2), y=0, z=0)
        
        for _ in range(50):
            clib.dual_h3lis331_update(ctypes.byref(tracker), ctypes.byref(s1), ctypes.byref(s2), dt, 1.0)
            
        assert abs(tracker.rpm - target_rpm) < 5.0, f"RPM mismatch: expected {target_rpm}, got {tracker.rpm}"
        assert tracker.cor_shift_m == pytest.approx(0.0, abs=0.001)

def test_dual_accel_external_shock_and_cor_shift_rejection(clib):
    """
    Verify dual opposed configuration rejects rotating external linear acceleration shocks
    and maintains exact RPM tracking even when Center of Rotation (CoR) shifts.
    """
    tracker = DualH3LIS331Tracker()
    r1_nom = 0.025
    r2_nom = 0.025
    clib.dual_h3lis331_init(ctypes.byref(tracker), r1_nom, r2_nom)
    
    target_rpm = 3000.0
    omega = target_rpm * (2.0 * math.pi / 60.0)
    
    # 5mm Center of Rotation shift
    cor_shift = 0.005  # +5mm shift (r1=30mm, r2=20mm)
    r1_actual = r1_nom + cor_shift
    r2_actual = r2_nom - cor_shift
    
    dt = 0.001
    shock_peak_mss = 50.0 * 9.80665  # 50g arena impact shock
    
    cor_shifts_recorded = []
    
    # Simulate 5 full revolutions (100ms at 3000 RPM)
    for step in range(100):
        t = step * dt
        # In the rotating robot frame, an arena-fixed shock modulates at angular frequency omega
        shock_proj = shock_peak_mss * math.cos(omega * t)
        
        a_r1 = (omega ** 2) * r1_actual + shock_proj
        a_r2 = (omega ** 2) * r2_actual - shock_proj
        
        s1 = H3LIS331RawSample(x=mss_to_raw(a_r1), y=0, z=0)
        s2 = H3LIS331RawSample(x=mss_to_raw(a_r2), y=0, z=0)
        
        clib.dual_h3lis331_update(ctypes.byref(tracker), ctypes.byref(s1), ctypes.byref(s2), dt, 1.0)
        cor_shifts_recorded.append(tracker.cor_shift_m)
        
    # Instantaneous RPM is completely invariant to shock and CoR shift
    assert abs(tracker.rpm - target_rpm) < 5.0
    # Mean CoR shift matches true +5mm shift
    mean_cor_shift = float(np.mean(cor_shifts_recorded[-40:]))
    assert abs(mean_cor_shift - cor_shift) < 0.001

def test_tangential_acceleration_spinup(clib):
    """Verify tangential acceleration differential measures angular acceleration alpha = d(omega)/dt."""
    tracker = DualH3LIS331Tracker()
    r1 = 0.025
    r2 = 0.025
    clib.dual_h3lis331_init(ctypes.byref(tracker), r1, r2)
    
    alpha_true = 800.0  # rad/s^2
    a_t1 = alpha_true * r1  # 20.0 m/s^2
    a_t2 = alpha_true * r2  # 20.0 m/s^2
    
    s1 = H3LIS331RawSample(x=0, y=mss_to_raw(a_t1), z=0)
    s2 = H3LIS331RawSample(x=0, y=mss_to_raw(a_t2), z=0)
    
    dt = 0.001
    for _ in range(50):
        clib.dual_h3lis331_update(ctypes.byref(tracker), ctypes.byref(s1), ctypes.byref(s2), dt, 1.0)
        
    # Allow 400g LSB quantization window (~1 LSB = 1.91 m/s^2 / 0.05m = ~38 rad/s^2)
    assert abs(tracker.alpha_rad_s2 - alpha_true) < 40.0

# ============================================================================
# 2. Heading Estimator & Beacon PLL Sync Tests Under Noise
# ============================================================================

def test_heading_beacon_pll_phase_lock(clib):
    """
    Simulate heading tracking with noisy accelerometer integration and verify
    that the optical/hall beacon PLL acquires and maintains tight phase lock.
    """
    est = MeltyHeadingEstimator()
    clib.melty_heading_init(ctypes.byref(est))
    
    true_rpm = 2500.0
    true_omega = true_rpm * (2.0 * math.pi / 60.0)
    rev_period_s = 60.0 / true_rpm  # 0.024s (24ms)
    
    # Inject +5% bias in the accelerometer omega
    accel_omega = true_omega * 1.05
    
    sim_time_s = 0.0
    dt = 0.001
    t_us = 0
    next_beacon_s = rev_period_s
    true_heading = 0.0
    
    phase_errors = []
    
    for step in range(2500):  # 2.5 seconds simulation
        sim_time_s += dt
        t_us += int(dt * 1e6)
        true_heading = (true_heading + true_omega * dt) % (2.0 * math.pi)
        
        clib.melty_heading_update(ctypes.byref(est), accel_omega, 0.0, dt, t_us)
        
        if sim_time_s >= next_beacon_s:
            jitter_us = int(np.random.normal(0, 30))
            beacon_t_us = t_us + jitter_us
            accepted = clib.melty_heading_on_beacon_pulse(ctypes.byref(est), beacon_t_us, 0.0)
            assert accepted is True
            next_beacon_s += rev_period_s
            phase_errors.append(est.phase_error_rad)
            
    assert est.beacon_locked is True
    # Steady state phase error is tightly locked near zero (< 0.08 rad / 4.5 deg)
    assert abs(phase_errors[-1]) < 0.08
    # Fused RPM locked onto true 2500 RPM
    assert abs(est.rpm_fused - true_rpm) < 10.0

def test_heading_beacon_glitch_rejection(clib):
    """Verify spurious optical pulses / arena reflection glitches are rejected."""
    est = MeltyHeadingEstimator()
    clib.melty_heading_init(ctypes.byref(est))
    
    rpm = 3000.0
    rev_period_us = int((60.0 / rpm) * 1e6)  # 20,000 us
    
    t_us = 100000
    clib.melty_heading_on_beacon_pulse(ctypes.byref(est), t_us, 0.0)
    t_us += rev_period_us
    clib.melty_heading_on_beacon_pulse(ctypes.byref(est), t_us, 0.0)
    assert est.beacon_locked is True
    
    # Spurious pulse 3ms later
    glitch_t_us = t_us + 3000
    accepted = clib.melty_heading_on_beacon_pulse(ctypes.byref(est), glitch_t_us, 0.0)
    assert accepted is False
    assert est.rejected_glitches == 1
    
    # Valid pulse
    t_us += rev_period_us
    accepted2 = clib.melty_heading_on_beacon_pulse(ctypes.byref(est), t_us, 0.0)
    assert accepted2 is True

# ============================================================================
# 3. Translational Drive Modulation & Phase Lead Angle Tests
# ============================================================================

def test_translational_modulation_sine_wave_and_lead_angle(clib):
    """
    Verify sine-wave throttle superposition and phase lead angle calculation
    across 360-degree rotation.
    """
    mod = MeltyDriveModulator()
    clib.melty_drive_init(ctypes.byref(mod))
    
    mod.motor_latency_s = 0.0035
    mod.trans_gain = 0.5
    
    target_rpm = 3000.0
    omega = target_rpm * (2.0 * math.pi / 60.0)
    expected_lead = omega * 0.0035
    
    base_spin_throttle = 0.60
    trans_mag = 0.80
    trans_angle = math.pi / 4.0  # +45 deg
    
    left_throttles = []
    right_throttles = []
    angles = np.linspace(0, 2 * math.pi, 360, endpoint=False)
    
    for heading in angles:
        clib.melty_drive_modulate(ctypes.byref(mod),
                                  base_spin_throttle,
                                  trans_mag,
                                  trans_angle,
                                  float(heading),
                                  float(omega),
                                  float(target_rpm))
        
        left_throttles.append(mod.throttle_left)
        right_throttles.append(mod.throttle_right)
        
    left_arr = np.array(left_throttles)
    right_arr = np.array(right_throttles)
    
    assert abs(mod.effective_lead_rad - expected_lead) < 1e-4
    assert np.mean(left_arr) == pytest.approx(base_spin_throttle, abs=0.01)
    assert np.mean(right_arr) == pytest.approx(base_spin_throttle, abs=0.01)
    
    peak_idx = np.argmax(left_arr)
    peak_heading = angles[peak_idx]
    expected_peak_heading = (trans_angle - expected_lead) % (2.0 * math.pi)
    
    angle_diff = abs(clib.melty_wrap_pi(float(peak_heading - expected_peak_heading)))
    assert angle_diff < 0.05

def test_dshot_conversion(clib):
    """Verify standard DShot 11-bit conversion."""
    assert clib.melty_drive_throttle_to_dshot(0.0, 0) == 0
    assert clib.melty_drive_throttle_to_dshot(0.5, 0) == 48 + int(0.5 * (2047 - 48))
    assert clib.melty_drive_throttle_to_dshot(1.0, 0) == 2047
    
    assert clib.melty_drive_throttle_to_dshot(0.0, 1) == 0
    assert clib.melty_drive_throttle_to_dshot(1.0, 1) == 2047
    assert clib.melty_drive_throttle_to_dshot(-1.0, 1) == 48

# ============================================================================
# 4. Failsafe & Telemetry Verification Tests
# ============================================================================

def test_failsafe_arming_and_rc_timeout(clib):
    """Verify 2-action arming sequence and link loss failsafe."""
    fs = MeltyFailsafe()
    clib.melty_failsafe_init(ctypes.byref(fs))
    assert fs.state == 0  # DISARMED
    
    rc = MeltyRCInput()
    rc.ch_arm_switch = True
    rc.ch_throttle = 0.50
    rc.last_rc_frame_ms = 1000
    rc.rc_link_lost = False
    
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 0.0, 14800, 1000)
    assert fs.state == 0  # Still DISARMED
    
    rc.ch_throttle = 0.0
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 0.0, 14800, 1020)
    assert fs.state == 2  # ARMED
    
    rc.ch_throttle = 0.40
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 500.0, 14700, 1050)
    assert fs.state == 3  # SPINNING
    
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 1500.0, 14600, 1200)
    assert fs.state == 4  # FAILSAFE_ACTIVE
    assert fs.failsafe_events_count == 1

def test_over_rpm_and_brownout_protection(clib):
    """Verify safety shutdown on over-RPM (>4000 RPM) and brownout (<12.0V)."""
    fs = MeltyFailsafe()
    clib.melty_failsafe_init(ctypes.byref(fs))
    
    rc = MeltyRCInput()
    rc.ch_arm_switch = True
    rc.ch_throttle = 0.0
    rc.last_rc_frame_ms = 1000
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 0.0, 15000, 1000)
    assert fs.state == 2  # ARMED
    
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 4100.0, 14500, 1020)
    assert fs.state == 5  # OVER_RPM_SHUTDOWN
    assert fs.over_rpm_detected is True
    
    clib.melty_failsafe_init(ctypes.byref(fs))
    rc.ch_arm_switch = True
    rc.ch_throttle = 0.0
    rc.last_rc_frame_ms = 2000
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 0.0, 15000, 2000)
    clib.melty_failsafe_update(ctypes.byref(fs), ctypes.byref(rc), 500.0, 11800, 2020)
    assert fs.state == 6  # BROWNOUT_CUTOFF

def test_telemetry_crc8(clib):
    """Verify telemetry packet CRC-8 implementation."""
    data = (ctypes.c_uint8 * 4)(0x4D, 0x54, 0x01, 0x02)
    crc = clib.melty_crc8(data, 4)
    assert crc != 0
    assert clib.melty_crc8(data, 4) == crc
