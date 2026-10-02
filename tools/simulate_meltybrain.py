#!/usr/bin/env python3
"""
Meltybrain 3lb 2D Planar Rigid-Body Dynamic Simulation.

Simulates:
- Brushless hubmotor torque curves and rotational spin-up to 3500 RPM.
- Dual opposed H3LIS331DLTR high-G accelerometer sampling with noise, quantization, and shock.
- Optical beacon pulse generation and detection.
- Firmware controller execution via libmelty C dynamic library.
- Planar translational drift trajectory (X, Y position and velocity).
- Performance metrics: Translation Speed, Heading Error RMS, Phase Lock Time.
"""

import ctypes
import math
import os
import sys
import numpy as np

# Add test structs and cdll
from test_melty_math import (
    DualH3LIS331Tracker,
    MeltyHeadingEstimator,
    MeltyDriveModulator,
    MeltyRCInput,
    MeltyFailsafe,
    AccelCalib,
    H3LIS331RawSample,
    mss_to_raw,
    LIB_PATH
)

def load_melty_lib():
    lib = ctypes.CDLL(LIB_PATH)
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

class MeltySimConfig:
    mass_kg: float = 1.36          # 3.0 lb
    radius_outer_m: float = 0.10   # 200mm dia shell
    inertia_z_kgm2: float = 0.0055 # Robot yaw inertia
    wheel_radius_m: float = 0.022  # 44mm wheels
    wheel_track_m: float = 0.140   # 140mm track width
    
    # Motor model: 1200KV, 4S (15.0V)
    motor_kv: float = 1200.0
    vbat_v: float = 15.0
    motor_tau_s: float = 0.0035    # 3.5ms electrical+inductive lag
    
    # Sensor positions
    r1_nom_m: float = 0.025
    r2_nom_m: float = 0.025
    cor_shift_m: float = 0.002     # 2mm mechanical imbalance
    
    # Friction & Ground interaction
    bearing_drag_coeff: float = 0.00015
    aero_drag_coeff: float = 0.00002

class MeltySimulator:
    def __init__(self, config: MeltySimConfig = MeltySimConfig()):
        self.cfg = config
        self.clib = load_melty_lib()
        
        # State
        self.t_s: float = 0.0
        self.pos_x_m: float = 0.0
        self.pos_y_m: float = 0.0
        self.vel_x_mps: float = 0.0
        self.vel_y_mps: float = 0.0
        self.theta_rad: float = 0.0
        self.omega_rad_s: float = 0.0
        self.alpha_rad_s2: float = 0.0
        
        # Low pass motor response state
        self.actual_throttle_l: float = 0.0
        self.actual_throttle_r: float = 0.0
        
        # Firmware Controller structs
        self.tracker = DualH3LIS331Tracker()
        self.heading = MeltyHeadingEstimator()
        self.drive = MeltyDriveModulator()
        self.failsafe = MeltyFailsafe()
        self.rc = MeltyRCInput()
        
        self.clib.dual_h3lis331_init(ctypes.byref(self.tracker), ctypes.c_float(self.cfg.r1_nom_m), ctypes.c_float(self.cfg.r2_nom_m))
        self.clib.melty_heading_init(ctypes.byref(self.heading))
        self.clib.melty_drive_init(ctypes.byref(self.drive))
        self.clib.melty_failsafe_init(ctypes.byref(self.failsafe))

    def step(self, dt: float):
        t_us = int(self.t_s * 1e6)
        t_ms = int(self.t_s * 1000)
        
        # 1. True Sensor Measurements
        r1_actual = self.cfg.r1_nom_m + self.cfg.cor_shift_m
        r2_actual = self.cfg.r2_nom_m - self.cfg.cor_shift_m
        
        true_a_c1 = (self.omega_rad_s ** 2) * r1_actual
        true_a_c2 = (self.omega_rad_s ** 2) * r2_actual
        true_a_t1 = self.alpha_rad_s2 * r1_actual
        true_a_t2 = self.alpha_rad_s2 * r2_actual
        
        # Add realistic sensor noise (Gaussian noise ~ 1.5g RMS)
        noise_s1_x = np.random.normal(0, 1.5 * 9.80665)
        noise_s1_y = np.random.normal(0, 1.5 * 9.80665)
        noise_s2_x = np.random.normal(0, 1.5 * 9.80665)
        noise_s2_y = np.random.normal(0, 1.5 * 9.80665)
        
        s1 = H3LIS331RawSample(x=mss_to_raw(true_a_c1 + noise_s1_x), y=mss_to_raw(true_a_t1 + noise_s1_y), z=0)
        s2 = H3LIS331RawSample(x=mss_to_raw(true_a_c2 + noise_s2_x), y=mss_to_raw(true_a_t2 + noise_s2_y), z=0)
        
        # 2. Firmware Step
        self.clib.dual_h3lis331_update(ctypes.byref(self.tracker), ctypes.byref(s1), ctypes.byref(s2), ctypes.c_float(dt), ctypes.c_float(1.0))
        self.clib.melty_heading_update(ctypes.byref(self.heading), ctypes.c_float(self.tracker.omega_rad_s), ctypes.c_float(self.tracker.alpha_rad_s2), ctypes.c_float(dt), ctypes.c_uint32(t_us))
        self.clib.melty_failsafe_update(ctypes.byref(self.failsafe), ctypes.byref(self.rc), ctypes.c_float(self.heading.rpm_fused), ctypes.c_uint16(int(self.cfg.vbat_v * 1000)), ctypes.c_uint32(t_ms))
        
        # 3. Beacon Trigger Check (optical sensor passes 0 rad in global arena frame)
        prev_theta = self.theta_rad - self.omega_rad_s * dt
        if (prev_theta < 0 and self.theta_rad >= 0) or (math.floor(self.theta_rad / (2 * math.pi)) > math.floor(prev_theta / (2 * math.pi))):
            jitter_us = int(np.random.normal(0, 25))
            self.clib.melty_heading_on_beacon_pulse(ctypes.byref(self.heading), ctypes.c_uint32(t_us + jitter_us), ctypes.c_float(0.0))
            
        # 4. Drive Modulation
        if self.failsafe.state == 2 or self.failsafe.state == 3: # ARMED or SPINNING
            trans_mag = math.hypot(self.rc.ch_trans_x, self.rc.ch_trans_y)
            trans_angle = math.atan2(self.rc.ch_trans_y, self.rc.ch_trans_x)
            self.clib.melty_drive_modulate(ctypes.byref(self.drive),
                                           ctypes.c_float(self.rc.ch_throttle),
                                           ctypes.c_float(trans_mag),
                                           ctypes.c_float(trans_angle),
                                           ctypes.c_float(self.heading.heading_rad),
                                           ctypes.c_float(self.heading.omega_fused_rad_s),
                                           ctypes.c_float(self.heading.rpm_fused))
            cmd_l = self.drive.throttle_left
            cmd_r = self.drive.throttle_right
        else:
            self.drive.throttle_left = 0.0
            self.drive.throttle_right = 0.0
            self.drive.dshot_cmd_left = 0
            self.drive.dshot_cmd_right = 0
            cmd_l = 0.0
            cmd_r = 0.0
            
        # 5. Motor Dynamics (first order lag)
        alpha_motor = dt / (dt + self.cfg.motor_tau_s)
        self.actual_throttle_l += alpha_motor * (cmd_l - self.actual_throttle_l)
        self.actual_throttle_r += alpha_motor * (cmd_r - self.actual_throttle_r)
        
        # 6. Physical Forces and Torques
        max_thrust_per_wheel = 6.0 # Newtons peak per wheel at 4S
        f_left = self.actual_throttle_l * max_thrust_per_wheel
        f_right = self.actual_throttle_r * max_thrust_per_wheel
        
        torque_spin = (f_left + f_right) * (self.cfg.wheel_track_m * 0.5)
        drag_torque = (self.cfg.bearing_drag_coeff * self.omega_rad_s) + (self.cfg.aero_drag_coeff * (self.omega_rad_s ** 2))
        net_torque = torque_spin - drag_torque
        
        self.alpha_rad_s2 = net_torque / self.cfg.inertia_z_kgm2
        self.omega_rad_s += self.alpha_rad_s2 * dt
        self.theta_rad = (self.theta_rad + self.omega_rad_s * dt) % (2.0 * math.pi)
        
        # Differential modulation produces net forward thrust along body axis
        f_forward_body = (f_left - f_right)
        
        # Global arena force vector along heading angle theta
        f_global_x = f_forward_body * math.cos(self.theta_rad)
        f_global_y = f_forward_body * math.sin(self.theta_rad)
        
        # Ground linear damping / rolling resistance
        f_damping_x = -1.2 * self.vel_x_mps
        f_damping_y = -1.2 * self.vel_y_mps
        
        accel_x = (f_global_x + f_damping_x) / self.cfg.mass_kg
        accel_y = (f_global_y + f_damping_y) / self.cfg.mass_kg
        
        self.vel_x_mps += accel_x * dt
        self.vel_y_mps += accel_y * dt
        self.pos_x_m += self.vel_x_mps * dt
        self.pos_y_m += self.vel_y_mps * dt
        self.t_s += dt

def run_mission_simulation():
    print("=================================================================")
    print("      MELTYBRAIN 3LB DYNAMIC TRANSLATIONAL DRIFT SIMULATION      ")
    print("=================================================================")
    
    sim = MeltySimulator()
    dt = 0.001 # 1kHz loop
    
    # 1. Arming Phase (t = 0.0 to 0.5s)
    sim.rc.ch_arm_switch = True
    sim.rc.ch_throttle = 0.0
    sim.rc.ch_trans_x = 0.0
    sim.rc.ch_trans_y = 0.0
    sim.rc.last_rc_frame_ms = 0
    
    for _ in range(500):
        sim.rc.last_rc_frame_ms = int(sim.t_s * 1000)
        sim.step(dt)
        
    print(f"[t={sim.t_s:.2f}s] System Armed: state = {sim.failsafe.state} (ARMED)")
    
    # 2. Spin-Up Phase (t = 0.5 to 3.0s) -> Throttle 75% targeting ~2800-3200 RPM
    sim.rc.ch_throttle = 0.75
    for _ in range(2500):
        sim.rc.last_rc_frame_ms = int(sim.t_s * 1000)
        sim.step(dt)
        
    rpm = sim.heading.rpm_fused
    centripetal_g = sim.tracker.centripetal_accel_mss / 9.80665
    print(f"[t={sim.t_s:.2f}s] Spun Up: RPM = {rpm:.1f}, Centripetal G = {centripetal_g:.1f}g, Beacon Locked = {sim.heading.beacon_locked}")
    
    # 3. Translational Drift Phase (t = 3.0 to 7.0s)
    # Command stick: Drive East (+X direction, trans_x = 0.85, trans_y = 0.0)
    target_heading_deg = 0.0 # East
    sim.rc.ch_trans_x = 0.85
    sim.rc.ch_trans_y = 0.0
    
    start_pos = (sim.pos_x_m, sim.pos_y_m)
    heading_errors = []
    
    for step in range(4000):
        sim.rc.last_rc_frame_ms = int(sim.t_s * 1000)
        sim.step(dt)
        
        err = abs(math.atan2(math.sin(sim.heading.heading_rad - sim.theta_rad), math.cos(sim.heading.heading_rad - sim.theta_rad)))
        heading_errors.append(math.degrees(err))
        
    end_pos = (sim.pos_x_m, sim.pos_y_m)
    delta_x = end_pos[0] - start_pos[0]
    delta_y = end_pos[1] - start_pos[1]
    trans_dist = math.hypot(delta_x, delta_y)
    trans_speed = trans_dist / 4.0 # 4 seconds translation
    actual_heading_deg = math.degrees(math.atan2(delta_y, delta_x))
    heading_tracking_rms = math.sqrt(float(np.mean(np.square(heading_errors))))
    
    print("-----------------------------------------------------------------")
    print("TRANSLATION PERFORMANCE RESULTS:")
    print(f"  Translation Distance:      {trans_dist:.3f} m")
    print(f"  Average Translation Speed: {trans_speed:.3f} m/s ({trans_speed * 2.237:.2f} mph)")
    print(f"  Commanded Direction:       {target_heading_deg:.1f}°")
    print(f"  Actual Drift Direction:    {actual_heading_deg:.1f}°")
    print(f"  Direction Alignment Error: {abs(actual_heading_deg - target_heading_deg):.2f}°")
    print(f"  Heading Estimator RMS Err: {heading_tracking_rms:.2f}°")
    print(f"  Estimated CoR Shift:       {sim.tracker.cor_shift_m * 1000:.2f} mm (True: {sim.cfg.cor_shift_m * 1000:.2f} mm)")
    print("-----------------------------------------------------------------")
    
    # 4. Failsafe Test Phase (t = 7.0 to 8.0s) -> Drop RC link
    print(f"[t={sim.t_s:.2f}s] Dropping RC Link (Simulating transmitter signal loss)...")
    for _ in range(1000):
        sim.step(dt)
        
    print(f"[t={sim.t_s:.2f}s] Failsafe Triggered: state = {sim.failsafe.state} (FAILSAFE_ACTIVE)")
    print(f"  Motors Commanded Throttle: Left={sim.drive.throttle_left:.2f}, Right={sim.drive.throttle_right:.2f}")
    print(f"  DShot Output: Left={sim.drive.dshot_cmd_left}, Right={sim.drive.dshot_cmd_right}")
    print("=================================================================")
    
    assert trans_speed > 0.40, f"Translation speed {trans_speed:.3f} m/s too low"
    assert abs(actual_heading_deg - target_heading_deg) < 10.0, f"Drift heading error {abs(actual_heading_deg - target_heading_deg)}° too high"
    assert sim.failsafe.state == 4, "Failsafe did not activate on link loss"
    assert sim.drive.dshot_cmd_left == 0 and sim.drive.dshot_cmd_right == 0, "Motors not stopped on failsafe"
    print("ALL SIMULATION VALIDATION CHECKS PASSED.")

if __name__ == "__main__":
    run_mission_simulation()
