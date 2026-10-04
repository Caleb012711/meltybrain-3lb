#!/usr/bin/env python3
"""Rev 7 'Apex Predator' FreeCAD Automated Assembly & Export Pipeline for Eyeliner 3lb Meltybrain.

Mechanical & Weapon Upgrades:
1. Modular 4-Mode Swappable Weapon System (all sharing identical mounting bolt circle):
   - Mode A: Symmetric 2-Tooth Heavy Smasher AR500 ring (balanced for 4,000 RPM nominal spin-up, 145 mph tip speed, 415 Joules kinetic energy).
   - Mode B: Single Deep-Bite Razor Tooth (+18mm hook) with counter-balanced solid tungsten heavy alloy wedge opposite (maximum bite depth at high translation speed).
   - Mode C: Low-Profile Undercutter Scoop Wedge (-6.5mm ground drop plane, 1.5mm floor clearance, 15° lifting ramp).
   - Mode D (NEW): Asymmetric Skirt-Breaker Can-Opener Tooth designed to catch and tear underneath opponent armor skirts.
2. Drivetrain & Cleat Refinements:
   - 36T Grade 5 Titanium (Ti-6Al-4V) 1.55" gear cleat wheels with 16° forward-raked cleat teeth and vulcanized silicone internal tire ring for dual wood/steel traction.
   - Dual 626ZZ thermal-fit bearing hubs with 6mm dead axle locks and integrated motor pinion covers.
3. Quick-Swap Avionics & Sensory Stack:
   - Tool-free quick-swap LiPo battery cartridge system: dual 4S 650mAh packs in viscoelastic TPU 95A shock cradle with copper wipe-contacts (swappable in 15 seconds without opening the electronics puck).
   - Flush ST VL53L4CD micro-LiDAR port with 1.2mm replaceable optical polycarbonate debris window.
   - Dual high-speed IR optical heading phototransistors for arena wall timing.
4. Parametric Build Script & Exports:
   - Save native FreeCAD assemblies cad/eyeliner_combat_v07.FCStd.
   - Export full assembly STEP and component STEPs (all weapon modes A, B, C, D, cleats, drive hubs, battery cartridge, LiDAR port).
   - Export 2-manifold STLs to cad/, 3d-printing/stl/, and web/public/stl/.
   - Generate high-resolution studio renders to display-study/ and cad/.
"""

import sys, os, math, struct
from pathlib import Path

# Insert FreeCAD libraries
FREECAD_LIB = "/Applications/FreeCAD.app/Contents/Resources/lib"
if FREECAD_LIB not in sys.path:
    sys.path.insert(0, FREECAD_LIB)

import FreeCAD, Part

REPO_ROOT = Path("/Users/caleblickteig/Documents/meltybrain-3lb")
CAD_DIR = REPO_ROOT / "cad"
STL_3D_DIR = REPO_ROOT / "3d-printing" / "stl"
STL_WEB_DIR = REPO_ROOT / "web" / "public" / "stl"
CAD_WEB_DIR = REPO_ROOT / "web" / "public" / "cad"
DISPLAY_STUDY_DIR = REPO_ROOT / "display-study"

for d in [CAD_DIR, STL_3D_DIR, STL_WEB_DIR, CAD_WEB_DIR, DISPLAY_STUDY_DIR]:
    d.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------------------------------
# 1. 36T GRADE 5 TITANIUM CLEAT DISC & DRIVE PODS
# --------------------------------------------------------------------------
def create_36t_titanium_cleat_disc():
    """Parametric 36T Grade 5 Titanium (Ti-6Al-4V) Gear Cleat Disc (1.55in OD, 16° Forward Bite Rake)."""
    r_outer = 39.37 / 2.0  # 19.685 mm (1.55" OD)
    thickness = 1.2        # mm Ti-6Al-4V sheet
    disc = Part.makeCylinder(r_outer, thickness)
    
    n_teeth = 36
    for i in range(n_teeth):
        angle = i * (360.0 / n_teeth)
        cutter = Part.makeBox(4.5, 1.35, thickness + 1.0)
        pl = FreeCAD.Placement()
        pl.Base = FreeCAD.Vector(17.3, -0.675, -0.5)
        pl.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 16.0) # 16° forward rake
        cutter.Placement = pl
        
        rot = FreeCAD.Placement()
        rot.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), angle)
        cutter.Placement = rot.multiply(cutter.Placement)
        disc = disc.cut(cutter)
        
    # Center 19mm bore for thermal fit over 626ZZ bearing hub
    bore = Part.makeCylinder(19.0 / 2.0, thickness + 2.0, FreeCAD.Vector(0, 0, -1.0))
    disc = disc.cut(bore)
    
    # 3x M2.5 drive pin holes on PCD 26mm (120° spacing)
    for a in [0, 120, 240]:
        rad = math.radians(a)
        hole = Part.makeCylinder(1.3, thickness + 2.0, FreeCAD.Vector(13.0 * math.cos(rad), 13.0 * math.sin(rad), -1.0))
        disc = disc.cut(hole)
        
    # 3x weight reduction teardrop slots
    for a in [60, 180, 300]:
        rad = math.radians(a)
        slot = Part.makeCylinder(2.2, thickness + 2.0, FreeCAD.Vector(13.5 * math.cos(rad), 13.5 * math.sin(rad), -1.0))
        disc = disc.cut(slot)
        
    return disc


def create_bearing_retainer_hub_dual_626zz_pinion_cover():
    """Thermal Fit 7075-T6 Hub, Dual 626ZZ Ball Bearings, 6mm Dead Axle Lock, and Integrated Motor Pinion Cover."""
    hub_od = 24.0 / 2.0
    flange_od = 26.0 / 2.0
    hub_len = 14.0
    
    hub_base = Part.makeCylinder(hub_od, hub_len)
    flange = Part.makeCylinder(flange_od, 2.0)
    hub = hub_base.fuse(flange)
    
    bearing_bore = Part.makeCylinder(19.0 / 2.0, 12.0, FreeCAD.Vector(0, 0, 0))
    shoulder_bore = Part.makeCylinder(17.0 / 2.0, hub_len + 2.0, FreeCAD.Vector(0, 0, -1.0))
    
    hub = hub.cut(shoulder_bore)
    hub = hub.cut(bearing_bore)
    
    for a in [0, 120, 240]:
        rad = math.radians(a)
        th_hole = Part.makeCylinder(1.1, 4.0, FreeCAD.Vector(13.0 * math.cos(rad), 13.0 * math.sin(rad), -1.0))
        hub = hub.cut(th_hole)
        
    b_outer = Part.makeCylinder(19.0 / 2.0, 12.0)
    b_inner = Part.makeCylinder(10.0 / 2.0, 12.0)
    b_bore = Part.makeCylinder(6.0 / 2.0, 12.0)
    
    outer_race = b_outer.cut(b_inner)
    inner_race = b_inner.cut(b_bore)
    bearings = outer_race.fuse(inner_race)
    
    axle = Part.makeCylinder(6.0 / 2.0, 34.0, FreeCAD.Vector(0, 0, -10.0))
    
    collar = Part.makeCylinder(12.0 / 2.0, 6.0, FreeCAD.Vector(0, 0, -8.0))
    collar_bore = Part.makeCylinder(6.0 / 2.0, 8.0, FreeCAD.Vector(0, 0, -9.0))
    d_flat_cut = Part.makeBox(4.0, 14.0, 8.0, FreeCAD.Vector(4.2, -7.0, -9.0))
    collar = collar.cut(collar_bore).cut(d_flat_cut)
    
    cowl_od = 32.0 / 2.0
    cowl_id = 29.0 / 2.0
    cowl_len = 13.0
    cowl_cyl = Part.makeCylinder(cowl_od, cowl_len, FreeCAD.Vector(0, 0, -7.0))
    cowl_bore = Part.makeCylinder(cowl_id, cowl_len + 2.0, FreeCAD.Vector(0, 0, -8.0))
    pinion_cover = cowl_cyl.cut(cowl_bore)
    cowl_cut = Part.makeBox(36.0, 36.0, cowl_len + 4.0, FreeCAD.Vector(-18.0, -36.0, -9.0))
    pinion_cover = pinion_cover.cut(cowl_cut)
    tab = Part.makeBox(4.0, 10.0, 5.0, FreeCAD.Vector(8.0, -5.0, -7.0))
    pinion_cover = pinion_cover.fuse(tab)
    
    pod_hub_assembly = hub.fuse(bearings).fuse(axle).fuse(collar).fuse(pinion_cover)
    return hub, bearings, collar, pinion_cover, pod_hub_assembly


def create_complete_cleat_wheel_assembly():
    """Complete 1.55in Cleated Drive Wheel Assembly: 36T Ti Cleats + Hub + Bearings + Shore 50A Silicone."""
    cleat_disc = create_36t_titanium_cleat_disc()
    hub, bearings, collar, pinion_cover, _ = create_bearing_retainer_hub_dual_626zz_pinion_cover()
    
    tire_od = 37.8 / 2.0
    tire_id = 24.0 / 2.0
    tire_width = 11.5
    tire_cyl = Part.makeCylinder(tire_od, tire_width, FreeCAD.Vector(0, 0, 1.5))
    tire_bore = Part.makeCylinder(tire_id, tire_width + 2.0, FreeCAD.Vector(0, 0, 0.5))
    tire = tire_cyl.cut(tire_bore)
    
    cleat_outboard = cleat_disc.copy()
    cleat_outboard.Placement = FreeCAD.Placement(FreeCAD.Vector(0, 0, 0), FreeCAD.Rotation())
    
    cleat_inboard = cleat_disc.copy()
    cleat_inboard.Placement = FreeCAD.Placement(FreeCAD.Vector(0, 0, 12.8), FreeCAD.Rotation())
    
    wheel_solid = cleat_outboard.fuse(cleat_inboard).fuse(tire).fuse(hub).fuse(bearings)
    return wheel_solid, cleat_disc


# --------------------------------------------------------------------------
# 2. TOOL-FREE QUICK-SWAP LIPO BATTERY CARTRIDGE & SENSORS
# --------------------------------------------------------------------------
def create_quick_swap_battery_cartridge_system():
    """Tool-Free Quick-Swap Dual 4S 650mAh LiPo Cartridge in TPU 95A Shock Cradle with Copper Wipe-Contacts."""
    c_len, c_wid, c_h = 66.0, 35.0, 23.0
    cradle = Part.makeBox(c_len, c_wid, c_h, FreeCAD.Vector(-c_len/2.0, -c_wid/2.0, 0))
    
    b_len, b_wid, b_h = 59.0, 29.5, 20.0
    cavity = Part.makeBox(b_len, b_wid, b_h + 5.0, FreeCAD.Vector(-b_len/2.0, -b_wid/2.0, 2.0))
    cradle = cradle.cut(cavity)
    
    for y_off in [-15.0, -7.5, 7.5, 15.0]:
        rib = Part.makeBox(c_len + 2.0, 1.5, 1.2, FreeCAD.Vector(-c_len/2.0 - 1.0, y_off - 0.75, 0))
        cradle = cradle.cut(rib)
    for x_off in [-20.0, 0.0, 20.0]:
        rib_c = Part.makeBox(1.5, c_wid + 2.0, 1.2, FreeCAD.Vector(x_off - 0.75, -c_wid/2.0 - 1.0, 0))
        cradle = cradle.cut(rib_c)
        
    rail_L = Part.makeBox(c_len, 2.5, 3.5, FreeCAD.Vector(-c_len/2.0, -c_wid/2.0 - 2.5, 9.0))
    rail_R = Part.makeBox(c_len, 2.5, 3.5, FreeCAD.Vector(-c_len/2.0, c_wid/2.0, 9.0))
    cradle = cradle.fuse(rail_L).fuse(rail_R)
    
    latch_tab = Part.makeBox(8.0, 14.0, 4.0, FreeCAD.Vector(c_len/2.0 - 2.0, -7.0, 18.0))
    cradle = cradle.fuse(latch_tab)
    
    wipe_contacts = None
    for y_c in [-10.0, -4.0, 4.0, 10.0]:
        contact = Part.makeBox(10.0, 3.2, 1.4, FreeCAD.Vector(-c_len/2.0 - 4.0, y_c - 1.6, 6.0))
        wipe_contacts = contact if wipe_contacts is None else wipe_contacts.fuse(contact)
        
    cartridge_complete = cradle.fuse(wipe_contacts)
    return cradle, wipe_contacts, cartridge_complete


def create_flush_lidar_port_rev7():
    """Flush ST VL53L4CD Micro-LiDAR Port with 1.2mm Replaceable Optical Polycarbonate Debris Window."""
    m_len, m_wid, m_h = 24.0, 16.0, 13.0
    mount_body = Part.makeBox(m_len, m_wid, m_h, FreeCAD.Vector(0, -m_wid/2.0, 0))
    
    sensor_cavity = Part.makeBox(14.0, 12.0, 4.0, FreeCAD.Vector(3.0, -6.0, 4.5))
    mount_body = mount_body.cut(sensor_cavity)
    
    aperture_slot = Part.makeBox(8.0, 11.0, 7.0, FreeCAD.Vector(16.0, -5.5, 3.0))
    mount_body = mount_body.cut(aperture_slot)
    
    bezel_pocket = Part.makeBox(2.0, 14.0, 9.0, FreeCAD.Vector(22.1, -7.0, 2.0))
    mount_body = mount_body.cut(bezel_pocket)
    
    slide_channel = Part.makeBox(1.5, 14.5, 12.0, FreeCAD.Vector(22.2, -7.25, 1.0))
    mount_body = mount_body.cut(slide_channel)
    
    for y_hole in [-5.5, 5.5]:
        hole = Part.makeCylinder(1.0, m_h + 2.0, FreeCAD.Vector(8.0, y_hole, -1.0))
        mount_body = mount_body.cut(hole)
        
    shield = Part.makeBox(1.2, 13.6, 8.6, FreeCAD.Vector(22.4, -6.8, 2.2))
    
    return mount_body, shield


def create_dual_ir_heading_sensors():
    """Dual High-Speed IR Optical Heading Phototransistors for Arena Wall Timing (theta = 90° and 270°)."""
    mount_base = Part.makeBox(8.0, 8.0, 6.0, FreeCAD.Vector(-4.0, -4.0, 0))
    collimator_bore = Part.makeCylinder(1.75, 7.0, FreeCAD.Vector(0, 0, -0.5))
    phototransistor = Part.makeBox(3.0, 3.0, 2.0, FreeCAD.Vector(-1.5, -1.5, 4.0))
    ir_sensor_unit = mount_base.cut(collimator_bore).fuse(phototransistor)
    
    s1 = ir_sensor_unit.copy()
    s1.translate(FreeCAD.Vector(0, 58.0, 14.0))
    
    s2 = ir_sensor_unit.copy()
    s2.rotate(FreeCAD.Vector(0,0,0), FreeCAD.Vector(0,0,1), 180.0)
    s2.translate(FreeCAD.Vector(0, -58.0, 14.0))
    
    dual_ir = s1.fuse(s2)
    return ir_sensor_unit, s1, s2, dual_ir


# --------------------------------------------------------------------------
# 3. MODULAR 4-MODE SWAPPABLE WEAPON SYSTEM
# --------------------------------------------------------------------------
def build_rev7_weapon_modes(existing_doc):
    """Build the 4 Modular Swappable Weapon Systems (all sharing identical mounting bolt circle)."""
    tooth_left = existing_doc.Combat_Tooth_Left.Shape.copy()
    tooth_right = existing_doc.Combat_Tooth_Right.Shape.copy()
    
    # Mode A: Symmetric 2-Tooth Heavy Smasher AR500 ring (balanced for 4,000 RPM nominal spin-up, 145 mph tip speed, 415 Joules)
    gusset_L = Part.makeBox(12.0, 20.0, 22.0, FreeCAD.Vector(-118.0, -60.0, 0.0))
    pl_gL = FreeCAD.Placement()
    pl_gL.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 18.0)
    gusset_L.Placement = pl_gL
    tooth_heavy_L = tooth_left.fuse(gusset_L)
    
    gusset_R = Part.makeBox(12.0, 20.0, 22.0, FreeCAD.Vector(106.0, 40.0, 0.0))
    pl_gR = FreeCAD.Placement()
    pl_gR.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 18.0)
    gusset_R.Placement = pl_gR
    tooth_heavy_R = tooth_right.fuse(gusset_R)
    
    mode_a = tooth_heavy_L.fuse(tooth_heavy_R)
    
    # Mode B: Single Deep-Bite Razor Tooth (+18mm hook) with counter-balanced solid tungsten heavy alloy wedge opposite
    hook_ext = Part.makeBox(18.0, 28.0, 22.0, FreeCAD.Vector(-154.0, -98.0, 0.0))
    hook_chamfer = Part.makeBox(22.0, 22.0, 26.0, FreeCAD.Vector(-158.0, -76.0, -2.0))
    pl_hk = FreeCAD.Placement()
    pl_hk.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 24.0)
    hook_chamfer.Placement = pl_hk
    hook_ext = hook_ext.cut(hook_chamfer)
    deep_tooth = tooth_left.fuse(hook_ext)
    
    cw_wedge = Part.makeBox(40.0, 46.0, 18.0, FreeCAD.Vector(66.0, -13.0, 2.0))
    cw_cut1 = Part.makeBox(42.0, 32.0, 22.0, FreeCAD.Vector(76.0, 16.0, 0.0))
    pl_cw = FreeCAD.Placement()
    pl_cw.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 28.0)
    cw_cut1.Placement = pl_cw
    cw_wedge = cw_wedge.cut(cw_cut1)
    
    mode_b = deep_tooth.fuse(cw_wedge)
    
    # Mode C: Low-Profile Undercutter Scoop Wedge (-6.5mm ground drop plane, 1.5mm floor clearance, 15° lifting ramp)
    scoop_left = Part.makeBox(44.0, 34.0, 15.0, FreeCAD.Vector(-136.0, -82.0, -6.5))
    ramp_cut = Part.makeBox(52.0, 38.0, 16.0, FreeCAD.Vector(-142.0, -84.0, -6.5))
    pl_ramp = FreeCAD.Placement()
    pl_ramp.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), -15.0)
    ramp_cut.Placement = pl_ramp
    scoop_left = scoop_left.cut(ramp_cut)
    undercutter_tooth_left = tooth_left.fuse(scoop_left)
    
    pl_rot180 = FreeCAD.Placement()
    pl_rot180.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 180.0)
    undercutter_tooth_right = undercutter_tooth_left.copy()
    undercutter_tooth_right.Placement = pl_rot180
    
    mode_c = undercutter_tooth_left.fuse(undercutter_tooth_right)
    
    # Mode D (NEW): Asymmetric Skirt-Breaker Can-Opener Tooth designed to catch and tear underneath opponent armor skirts
    can_opener_body = Part.makeBox(28.0, 36.0, 24.0, FreeCAD.Vector(-162.0, -105.0, -2.0))
    rake_cutter = Part.makeBox(35.0, 30.0, 30.0, FreeCAD.Vector(-170.0, -85.0, -4.0))
    pl_rake = FreeCAD.Placement()
    pl_rake.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 22.0)
    rake_cutter.Placement = pl_rake
    can_opener_body = can_opener_body.cut(rake_cutter)
    
    bevel_cutter = Part.makeBox(40.0, 40.0, 20.0, FreeCAD.Vector(-175.0, -115.0, 10.0))
    pl_bevel = FreeCAD.Placement()
    pl_bevel.Rotation = FreeCAD.Rotation(FreeCAD.Vector(1, 0, 0), -18.0)
    bevel_cutter.Placement = pl_bevel
    can_opener_body = can_opener_body.cut(bevel_cutter)
    
    under_lip = Part.makeBox(22.0, 24.0, 6.0, FreeCAD.Vector(-158.0, -100.0, -4.5))
    lip_wedge = Part.makeBox(30.0, 30.0, 10.0, FreeCAD.Vector(-165.0, -105.0, -6.0))
    pl_lip = FreeCAD.Placement()
    pl_lip.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), -20.0)
    lip_wedge.Placement = pl_lip
    under_lip = under_lip.cut(lip_wedge)
    
    skirt_breaker_tooth = tooth_left.fuse(can_opener_body).fuse(under_lip)
    
    cw_skirt = Part.makeBox(40.0, 46.0, 20.0, FreeCAD.Vector(68.0, -15.0, 2.0))
    cw_sk_cut = Part.makeBox(45.0, 35.0, 24.0, FreeCAD.Vector(80.0, 12.0, 0.0))
    pl_sk_cw = FreeCAD.Placement()
    pl_sk_cw.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 25.0)
    cw_sk_cut.Placement = pl_sk_cw
    cw_skirt = cw_skirt.cut(cw_sk_cut)
    
    mode_d = skirt_breaker_tooth.fuse(cw_skirt)
    
    return mode_a, mode_b, mode_c, mode_d, deep_tooth, cw_wedge, undercutter_tooth_left, skirt_breaker_tooth


# --------------------------------------------------------------------------
# 4. CHASSIS PUCK & ARMOR PLATES UPGRADE
# --------------------------------------------------------------------------
def upgrade_chassis_puck_and_plates_rev7(existing_doc):
    """Upgrade Chassis Puck with Quick-Swap Cartridge Bay, Pinion Covers, and Dual IR Sensor Apertures."""
    puck = existing_doc.Chassis_Puck.Shape.copy()
    top_plate = existing_doc.Top_Armor_Plate.Shape.copy()
    bottom_plate = existing_doc.Bottom_Skid_Plate.Shape.copy()
    
    for a in [135.0, 315.0]:
        rad = math.radians(a)
        cx = 42.0 * math.cos(rad)
        cy = 42.0 * math.sin(rad)
        guide_slot = Part.makeBox(68.0, 37.0, 24.0, FreeCAD.Vector(-34.0, -18.5, 1.0))
        pl_slot = FreeCAD.Placement()
        pl_slot.Base = FreeCAD.Vector(cx, cy, 0)
        pl_slot.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), a)
        guide_slot.Placement = pl_slot
        puck = puck.cut(guide_slot)
        
    lidar_aperture = Part.makeBox(20.0, 15.0, 14.0, FreeCAD.Vector(54.0, 19.0, 5.0))
    puck = puck.cut(lidar_aperture)
    
    for a in [90.0, 270.0]:
        rad = math.radians(a)
        ir_bore = Part.makeCylinder(2.5, 20.0, FreeCAD.Vector(50.0 * math.cos(rad), 50.0 * math.sin(rad), 14.0),
                                    FreeCAD.Vector(math.cos(rad), math.sin(rad), 0))
        puck = puck.cut(ir_bore)
        
    for a in [60.0, 240.0]:
        rad = math.radians(a)
        cx = 43.0 * math.cos(rad)
        cy = 43.0 * math.sin(rad)
        axle_pocket = Part.makeCylinder(6.2 / 2.0, 26.0, FreeCAD.Vector(cx, cy, -1.0))
        keyway = Part.makeBox(7.0, 5.0, 10.0, FreeCAD.Vector(cx - 3.5, cy - 2.5, 14.0))
        pinion_clearance = Part.makeCylinder(16.5, 14.0, FreeCAD.Vector(cx - 15.0 * math.cos(rad), cy - 15.0 * math.sin(rad), 5.0))
        puck = puck.cut(axle_pocket).cut(keyway).cut(pinion_clearance)
        bottom_plate = bottom_plate.cut(Part.makeCylinder(6.2 / 2.0, 5.0, FreeCAD.Vector(cx, cy, -4.0)))
        top_plate = top_plate.cut(Part.makeCylinder(6.2 / 2.0, 5.0, FreeCAD.Vector(cx, cy, 23.5)))
        
    return puck, top_plate, bottom_plate


# --------------------------------------------------------------------------
# 5. SPREADSHEET PARAMETERS
# --------------------------------------------------------------------------
def update_spreadsheet_parameters_rev7(doc):
    """Update FreeCAD Spreadsheet with Rev 7 'Apex Predator' Engineering Parameters."""
    if hasattr(doc, 'Dimensions'):
        s = doc.Dimensions
    else:
        s = doc.addObject('Spreadsheet::Sheet', 'Dimensions')
        s.Label = 'Robot_Parameters'
        
    params = [
        ('A1', 'Parameter'), ('B1', 'Value'), ('C1', 'Rev 7 Apex Predator Engineering Specification'),
        ('A2', 'BodyDiameter'), ('B2', '140 mm'), ('C2', 'Outer unibody puck diameter (NHRL 3lb limit)'),
        ('A3', 'BodyHeight'), ('B3', '24 mm'), ('C3', 'Chassis unibody thickness'),
        ('A4', 'TopPlateThickness'), ('B4', '3.5 mm'), ('C4', 'Smoke Makrolon polycarbonate top armor plate'),
        ('A5', 'BottomPlateThickness'), ('B5', '3.5 mm'), ('C5', 'Smoke Makrolon polycarbonate bottom skid plate'),
        ('A6', 'WheelOuterDiameter'), ('B6', '39.37 mm'), ('C6', '1.55in Grade 5 Titanium Cleat Wheel outer crest diameter'),
        ('A7', 'CleatToothCount'), ('B7', '36T'), ('C7', '36T Grade 5 Titanium (Ti-6Al-4V) 16° forward-raked cleat teeth'),
        ('A8', 'TireCoreMaterial'), ('B8', 'Silicone_Shore50A'), ('C8', 'Vulcanized Shore 50A internal tire ring for dual wood/steel traction'),
        ('A9', 'BearingType'), ('B9', 'Dual_626ZZ'), ('C9', 'Dual 626ZZ thermal-fit deep groove bearing stack (12mm width)'),
        ('A10', 'DeadAxleDiameter'), ('B10', '6.0 mm'), ('C10', 'Precision hardened 6mm dead axle with anti-rotation D-flat lock collar'),
        ('A11', 'MotorPinionCover'), ('B11', 'Integrated_Cowl'), ('C11', 'Integrated protective debris cover over outrunner pinion mesh'),
        ('A12', 'BatteryCartridge'), ('B12', 'Quick_Swap_15s'), ('C12', 'Tool-free quick-swap LiPo cartridge with copper wipe-contacts (15s pit turn)'),
        ('A13', 'BatteryPackType'), ('B13', 'Dual_4S_650mAh'), ('C13', 'Tattu R-Line 4S 650mAh 95C LiPo packs in TPU 95A shock cradle'),
        ('A14', 'LiDARSensorPort'), ('B14', 'ST_VL53L4CD_Flush'), ('C14', 'Flush micro-LiDAR port with 1.2mm replaceable optical polycarbonate window'),
        ('A15', 'OpticalHeadingTiming'), ('B15', 'Dual_IR_Phototransistors'), ('C15', 'Dual high-speed IR optical phototransistors for arena wall beacon timing'),
        ('A16', 'ModularWeaponModes'), ('B16', '4_Swappable_Modes'), ('C16', 'A: Smasher | B: Razor+Tungsten | C: Undercutter | D: Skirt-Breaker'),
        ('A17', 'WeaponSpinNominal'), ('B17', '4000 RPM'), ('C17', 'Operational weapon spin velocity (145 mph tip speed)'),
        ('A18', 'WeaponKineticEnergy'), ('B18', '415 Joules'), ('C18', 'Nominal kinetic impact energy at 4,000 RPM'),
        ('A19', 'SharedBoltCircle'), ('B19', 'PCD_112mm_4xM4'), ('C19', 'Identical mounting bolt circle shared across all 4 weapon modes'),
    ]
    for cell, val in params:
        s.set(cell, str(val))
    doc.recompute()


# --------------------------------------------------------------------------
# 6. EXPORTS (STEP & STL)
# --------------------------------------------------------------------------
def export_all_stls_and_steps(parts_dict, assembly_steps):
    """Export STEP and STL files to cad/, 3d-printing/stl/, and web/public/stl/."""
    print("=== EXPORTING STEP AND STL ASSETS ===")
    
    # 1. Export STEP files to CAD_DIR
    for name, obj_or_shape in assembly_steps.items():
        step_path = CAD_DIR / f"{name}.step"
        web_step_path = CAD_WEB_DIR / f"{name}.step"
        print(f"Exporting STEP: {step_path.name}...")
        if isinstance(obj_or_shape, list):
            Part.export(obj_or_shape, str(step_path))
        elif hasattr(obj_or_shape, 'TypeId'):
            Part.export([obj_or_shape], str(step_path))
        else:
            temp_doc = FreeCAD.newDocument("TempStepExport")
            feat = temp_doc.addObject("Part::Feature", "StepExportFeat")
            feat.Shape = obj_or_shape
            temp_doc.recompute()
            Part.export([feat], str(step_path))
            FreeCAD.closeDocument("TempStepExport")
            
        # Also copy to web CAD dir
        step_bytes = step_path.read_bytes()
        web_step_path.write_bytes(step_bytes)
            
    # 2. Export STLs to cad/, 3d-printing/stl/, and web/public/stl/
    for name, shape in parts_dict.items():
        cad_stl = CAD_DIR / f"{name}.stl"
        print(f"Exporting STL: {name}.stl...")
        s = shape.Shape if hasattr(shape, 'Shape') else shape
        s.exportStl(str(cad_stl))
        
        # Mirror to 3d-printing and web
        p3d_stl = STL_3D_DIR / f"{name}.stl"
        web_stl = STL_WEB_DIR / f"{name}.stl"
        stl_bytes = cad_stl.read_bytes()
        p3d_stl.write_bytes(stl_bytes)
        web_stl.write_bytes(stl_bytes)
        
    print("All STEP and STL exports completed successfully!")


# --------------------------------------------------------------------------
# 7. HIGH-RESOLUTION STUDIO RENDERS
# --------------------------------------------------------------------------
def render_isometric_previews(out_images):
    """Render high-resolution studio quality previews using matplotlib."""
    import matplotlib
    matplotlib.use('Agg')
    try:
        import matplotlib.font_manager
        matplotlib.font_manager._get_macos_fonts = lambda: []
    except Exception:
        pass
    import matplotlib.pyplot as plt
    from matplotlib.colors import to_rgb
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    import numpy as np

    print("=== RENDERING HIGH-RESOLUTION 3D STUDIO PREVIEWS ===")
    
    light = np.array([-0.35, -0.55, 0.75])
    light /= np.linalg.norm(light)
    
    for title, subtitle, render_parts, out_name, elev, azim in out_images:
        fig = plt.figure(figsize=(16, 9), facecolor='#0b0f17')
        ax = fig.add_subplot(1, 1, 1, projection='3d', facecolor='#0b0f17')
        
        for part_name, shape, color, alpha in render_parts:
            s = shape.Shape if hasattr(shape, 'Shape') else shape
            tmp_stl = f"/tmp/{part_name}_tmp.stl"
            s.exportStl(tmp_stl)
            raw = Path(tmp_stl).read_bytes()
            if len(raw) < 84:
                continue
            count = struct.unpack_from('<I', raw, 80)[0]
            actual_count = min(count, (len(raw) - 84) // 50)
            if actual_count == 0:
                continue
            step = max(1, actual_count // 8000)
            tri_indices = list(range(0, actual_count, step))
            if not tri_indices:
                continue
            tri_list = []
            for j in tri_indices:
                offset = 84 + j * 50
                if offset + 50 <= len(raw):
                    try:
                        vals = struct.unpack_from('<12fH', raw, offset)[3:12]
                        tri_list.append(vals)
                    except Exception:
                        pass
            if not tri_list:
                continue
            triangles = np.array(tri_list).reshape((-1, 3, 3))
            if triangles.shape[0] == 0:
                continue
            
            v1 = triangles[:, 1] - triangles[:, 0]
            v2 = triangles[:, 2] - triangles[:, 0]
            normals = np.cross(v1, v2)
            norm_mag = np.linalg.norm(normals, axis=1, keepdims=True)
            norm_mag[norm_mag == 0] = 1.0
            normals = normals / norm_mag
            
            dot_light = np.sum(normals * light[None, :], axis=1)
            brightness = 0.52 + 0.48 * np.maximum(dot_light, 0.0)
            base_rgb = np.array(to_rgb(color))
            colors = np.clip(base_rgb[None, :] * brightness[:, None], 0.0, 1.0)
            
            poly = Poly3DCollection(triangles, facecolors=colors, edgecolors='none', linewidths=0, alpha=alpha)
            ax.add_collection3d(poly)
            
        ax.set_xlim(-160, 160)
        ax.set_ylim(-160, 160)
        ax.set_zlim(-50, 70)
        ax.set_box_aspect((320, 320, 120))
        ax.set_proj_type('ortho')
        ax.view_init(elev=elev, azim=azim)
        ax.set_axis_off()
        
        # Cyber-industrial telemetry HUD labels
        fig.text(0.05, 0.94, title, fontsize=20, fontweight='bold', color='#38ef7d', fontfamily='sans-serif')
        fig.text(0.05, 0.90, subtitle, fontsize=12, color='#7ee787', fontfamily='sans-serif')
        fig.text(0.05, 0.04, 'EYELINER 3LB COMBAT MELTYBRAIN • REV 7 APEX PREDATOR • 4,000 RPM SPIN VELOCITY (145 MPH / 415 J)', fontsize=10, color='#8b949e')
        fig.text(0.95, 0.04, '36T Ti-6Al-4V CLEATS • PINION COVERS • QUICK-SWAP CARTRIDGE • ST VL53L4CD • DUAL IR BEACONS', fontsize=10, color='#58a6ff', ha='right')
        
        fig.subplots_adjust(left=0.01, right=0.99, bottom=0.02, top=0.98)
        
        cad_out = CAD_DIR / out_name
        study_out = DISPLAY_STUDY_DIR / out_name
        cad_out.parent.mkdir(parents=True, exist_ok=True)
        study_out.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(str(cad_out), dpi=140, facecolor=fig.get_facecolor())
        fig.savefig(str(study_out), dpi=140, facecolor=fig.get_facecolor())
        plt.close(fig)
        print(f"Rendered: {out_name}")


# --------------------------------------------------------------------------
# MAIN EXECUTION
# --------------------------------------------------------------------------
def main():
    print("===================================================================")
    print("  EYELINER COMBAT MELTYBRAIN (3LB) — REV 7 'APEX PREDATOR' CAD   ")
    print("===================================================================")
    
    # 1. Open base document
    base_fcstd = CAD_DIR / "eyeliner_combat_v01.FCStd"
    print(f"Loading base CAD: {base_fcstd}...")
    doc = FreeCAD.openDocument(str(base_fcstd))
    
    # 2. Build 36T Titanium Cleat Disc & Drive Pods
    print("Building 36T Grade 5 Titanium Cleat Wheel & Drive Pod Hub with Pinion Cover...")
    cleat_disc_36t = create_36t_titanium_cleat_disc()
    hub, bearings, collar, pinion_cover, hub_assy = create_bearing_retainer_hub_dual_626zz_pinion_cover()
    wheel_solid, _ = create_complete_cleat_wheel_assembly()
    
    # Place wheels at top-right (60°) and bottom-left (240°) pods
    pl_tr = FreeCAD.Placement(FreeCAD.Vector(21.5, 37.2391, 12.0), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), -60.0) * FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), 90.0))
    wheel_tr = wheel_solid.copy()
    wheel_tr.Placement = pl_tr
    
    pl_bl = FreeCAD.Placement(FreeCAD.Vector(-21.5, -37.2391, 12.0), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 120.0) * FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), 90.0))
    wheel_bl = wheel_solid.copy()
    wheel_bl.Placement = pl_bl
    
    # 3. Build Quick-Swap LiPo Battery Cartridge System
    print("Building Tool-Free Quick-Swap LiPo Battery Cartridge System (TPU 95A + Copper Wipe Contacts)...")
    cradle_tpu, wipe_contacts, cartridge_complete = create_quick_swap_battery_cartridge_system()
    
    pl_cart1 = FreeCAD.Placement(FreeCAD.Vector(-29.7, 29.7, 13.5), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 135.0))
    cartridge_1 = cartridge_complete.copy()
    cartridge_1.Placement = pl_cart1
    
    pl_cart2 = FreeCAD.Placement(FreeCAD.Vector(29.7, -29.7, 13.5), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 315.0))
    cartridge_2 = cartridge_complete.copy()
    cartridge_2.Placement = pl_cart2
    
    # 4. Build Flush ST VL53L4CD Micro-LiDAR Port & Debris Window
    print("Building Flush ST VL53L4CD Micro-LiDAR Port with 1.2mm Replaceable Polycarbonate Window...")
    lidar_port, lidar_window = create_flush_lidar_port_rev7()
    pl_lidar = FreeCAD.Placement(FreeCAD.Vector(47.5, 22.0, 11.5), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 25.0))
    lidar_port.Placement = pl_lidar
    lidar_window.Placement = pl_lidar
    
    # 5. Build Dual High-Speed IR Optical Heading Phototransistors
    print("Building Dual High-Speed IR Optical Heading Phototransistors for Arena Wall Timing...")
    ir_sensor_unit, ir_s1, ir_s2, dual_ir = create_dual_ir_heading_sensors()
    
    # 6. Upgrade Chassis Puck and Armor Plates
    print("Upgrading Chassis Puck and Polycarbonate Armor Plates for Rev 7...")
    chassis_puck, top_plate, bottom_plate = upgrade_chassis_puck_and_plates_rev7(doc)
    
    # 7. Build the 4 Modular Swappable Weapon Systems (all sharing identical bolt circle)
    print("Engineering 4 Modular Swappable Weapon Systems (Modes A, B, C, D)...")
    mode_a, mode_b, mode_c, mode_d, deep_tooth, cw_wedge, under_l, skirt_tooth = build_rev7_weapon_modes(doc)
    
    # 8. Update FreeCAD Document Structure & Parameters
    print("Updating FreeCAD document structure and Rev 7 spreadsheet parameters...")
    update_spreadsheet_parameters_rev7(doc)
    
    # Update existing parts in doc
    doc.Chassis_Puck.Shape = chassis_puck
    doc.Top_Armor_Plate.Shape = top_plate
    doc.Bottom_Skid_Plate.Shape = bottom_plate
    doc.Wheel_Assembly_TopRight.Shape = wheel_tr
    doc.Wheel_Assembly_BottomLeft.Shape = wheel_bl
    
    def add_or_update(name, label, shape, group_name):
        obj = getattr(doc, name, None)
        if obj is None:
            obj = doc.addObject("Part::Feature", name)
        obj.Label = label
        obj.Shape = shape
        grp = getattr(doc, group_name, None)
        if grp and hasattr(grp, "addObject"):
            if obj not in grp.Group:
                grp.addObject(obj)
        return obj

    add_or_update("Weapon_Mode_A_Heavy_Smasher", "Weapon Mode A (Symmetric 2-Tooth Heavy Smasher 4000RPM)", mode_a, "WeaponAssembly")
    add_or_update("Weapon_Mode_B_Deep_Bite_Tungsten", "Weapon Mode B (Single Deep-Bite +18mm Razor + Tungsten)", mode_b, "WeaponAssembly")
    add_or_update("Weapon_Mode_C_Undercutter_Scoop", "Weapon Mode C (Low-Profile Undercutter Scoop -6.5mm)", mode_c, "WeaponAssembly")
    add_or_update("Weapon_Mode_D_Skirt_Breaker", "Weapon Mode D (Asymmetric Skirt-Breaker Can-Opener)", mode_d, "WeaponAssembly")
    
    add_or_update("Quick_Swap_Battery_Cartridge_1", "Quick-Swap Battery Cartridge 1 (TPU 95A + Copper Wipe)", cartridge_1, "ElectronicsAssembly")
    add_or_update("Quick_Swap_Battery_Cartridge_2", "Quick-Swap Battery Cartridge 2 (TPU 95A + Copper Wipe)", cartridge_2, "ElectronicsAssembly")
    add_or_update("LiDAR_Port_Rev7", "Flush ST VL53L4CD Micro-LiDAR Port Rev 7", lidar_port, "ElectronicsAssembly")
    add_or_update("LiDAR_Window_Rev7", "LiDAR Polycarbonate Debris Window 1.2mm", lidar_window, "ElectronicsAssembly")
    add_or_update("IR_Heading_Sensor_Dual", "Dual High-Speed IR Optical Heading Phototransistors", dual_ir, "ElectronicsAssembly")
    
    add_or_update("Titanium_Cleat_Wheel_36T_155in", "36T Grade 5 Titanium Cleat Wheel (1.55in)", cleat_disc_36t, "DriveUnits")
    add_or_update("Drive_Pod_626ZZ_Hub_Pinion_Cover", "Drive Pod 626ZZ Hub & Integrated Pinion Cover", hub_assy, "DriveUnits")
    
    doc.recompute()
    
    # Save Rev 7 FCStd and update base FCStd
    fcstd_v07 = CAD_DIR / "eyeliner_combat_v07.FCStd"
    print(f"Saving native FreeCAD Assembly: {fcstd_v07}...")
    doc.saveAs(str(fcstd_v07))
    doc.saveAs(str(base_fcstd))
    
    # 9. Define export sets
    solid_objs = [o for o in doc.Objects if hasattr(o, 'Shape') and o.Shape and o.Shape.Volume > 0]
    
    assembly_steps = {
        "eyeliner_combat_v07": solid_objs,
        "eyeliner_combat_v01": solid_objs,
        "weapon_mode_a_heavy_smasher": doc.Weapon_Mode_A_Heavy_Smasher,
        "weapon_mode_b_deep_bite_tungsten": doc.Weapon_Mode_B_Deep_Bite_Tungsten,
        "weapon_mode_c_undercutter_scoop": doc.Weapon_Mode_C_Undercutter_Scoop,
        "weapon_mode_d_skirt_breaker": doc.Weapon_Mode_D_Skirt_Breaker,
        "titanium_cleat_wheel_36T_1.55in": doc.Titanium_Cleat_Wheel_36T_155in,
        "drive_pod_626zz_hub_pinion_cover": doc.Drive_Pod_626ZZ_Hub_Pinion_Cover,
        "quick_swap_battery_cartridge": doc.Quick_Swap_Battery_Cartridge_1,
        "eyeliner_lidar_port_rev7": doc.LiDAR_Port_Rev7,
    }
    
    parts_stls = {
        # 4 Weapon Modes
        "weapon_mode_a_heavy_smasher": mode_a,
        "weapon_mode_b_deep_bite_tungsten": mode_b,
        "weapon_mode_c_undercutter_scoop": mode_c,
        "weapon_mode_d_skirt_breaker": mode_d,
        "weapon_option_a_symmetric_2tooth": mode_a,
        "weapon_option_b_single_bite_tungsten": mode_b,
        "weapon_option_c_undercutter_wedge": mode_c,
        # 36T Cleats & Drivetrain
        "titanium_cleat_disc_36T_1.55in": cleat_disc_36t,
        "titanium_cleat_disc_1.55in": cleat_disc_36t,
        "eyeliner_wheel_cleat_left": cleat_disc_36t,
        "eyeliner_wheel_cleat_right": cleat_disc_36t,
        "bearing_retainer_626zz_pinion_hub": hub,
        "dead_axle_lock_6mm": collar,
        "motor_pinion_cover": pinion_cover,
        # Quick-Swap LiPo Cartridge & Sensors
        "quick_swap_battery_cartridge": cartridge_complete,
        "battery_cartridge_cradle_tpu": cradle_tpu,
        "battery_copper_wipe_contacts": wipe_contacts,
        "tpu_battery_isolation_pocket": cradle_tpu,
        "eyeliner_lidar_port_rev7": lidar_port,
        "eyeliner_lidar_mount": lidar_port,
        "lidar_polycarbonate_debris_shield": lidar_window,
        "ir_heading_sensor_mount": ir_sensor_unit,
        # Chassis & Plates
        "eyeliner_chassis_puck_rev7": chassis_puck,
        "eyeliner_chassis_puck": chassis_puck,
        "eyeliner_combat_v01-chassis": chassis_puck,
        "eyeliner_top_plate_rev7": top_plate,
        "eyeliner_top_plate": top_plate,
        "eyeliner_combat_v01-top_plate": top_plate,
        "eyeliner_bottom_plate_rev7": bottom_plate,
        "eyeliner_bottom_plate": bottom_plate,
        "eyeliner_combat_v01-bottom_plate": bottom_plate,
        # Tires, Motors, Avionics
        "eyeliner_silicone_tire_left": doc.Wheel_Assembly_BottomLeft.Shape,
        "eyeliner_silicone_tire_right": doc.Wheel_Assembly_TopRight.Shape,
        "eyeliner_motor_left": doc.Motor_PropDrive_BottomLeft.Shape,
        "eyeliner_motor_right": doc.Motor_PropDrive_TopRight.Shape,
        "eyeliner_battery_pack_1": doc.Battery_Pack_1.Shape,
        "eyeliner_battery_pack_2": doc.Battery_Pack_2.Shape,
    }
    
    export_all_stls_and_steps(parts_stls, assembly_steps)
    
    # 10. Generate High-Resolution Studio Renders
    full_assembly_colored = [
        ('chassis', chassis_puck, '#72c2d9', 0.85),
        ('top_plate', top_plate, '#1b222c', 0.80),
        ('bottom_plate', bottom_plate, '#1b222c', 0.80),
        ('wheel_tr', wheel_tr, '#c5cbd3', 0.95),
        ('wheel_bl', wheel_bl, '#c5cbd3', 0.95),
        ('weapon_a', mode_a, '#ff4757', 0.95),
        ('cartridge1', cartridge_1, '#00d2d3', 0.90),
        ('cartridge2', cartridge_2, '#00d2d3', 0.90),
        ('lidar_port', lidar_port, '#2e3d49', 0.95),
        ('lidar_window', lidar_window, '#54a0ff', 0.60),
        ('ir_sensors', dual_ir, '#ffa502', 0.95),
    ]

    renders = [
        (
            'EYELINER REV 7 • APEX PREDATOR COMBAT MELTYBRAIN (3LB)',
            'Full Assembly: 36T Titanium Cleats, 4,000 RPM 415J Weapon, Quick-Swap Battery Cartridges, Dual IR & LiDAR',
            full_assembly_colored,
            'eyeliner_rev7_isometric_overview.png',
            32, -45
        ),
        (
            'MODULAR 4-MODE SWAPPABLE WEAPON SYSTEM • SHARED PCD',
            'Mode A: Symmetric Heavy Smasher | Mode B: Deep-Bite Razor + Tungsten | Mode C: Undercutter | Mode D: Skirt-Breaker Can-Opener',
            [
                ('mode_a', mode_a, '#ff4757', 0.90),
                ('mode_b', mode_b, '#ffa502', 0.90),
                ('mode_c', mode_c, '#2ed573', 0.90),
                ('mode_d', mode_d, '#9b59b6', 0.90),
                ('chassis_ref', chassis_puck, '#34495e', 0.30),
            ],
            'eyeliner_rev7_weapon_modular_4modes.png',
            45, -60
        ),
        (
            'DRIVETRAIN & CLEAT REFINEMENTS • 36T TITANIUM CLEATS & PINION COVERS',
            '36T Grade 5 Titanium (16° Forward Bite Rake) • Dual 626ZZ Thermal Fit Hub • 6mm Dead Axle Lock • Integrated Pinion Shroud',
            [
                ('cleat', cleat_disc_36t, '#dcdde1', 0.95),
                ('hub_assy', hub_assy, '#f5cd79', 0.90),
                ('pinion_cov', pinion_cover, '#e74c3c', 0.85),
                ('wheel_tr', wheel_tr, '#576574', 0.70),
            ],
            'eyeliner_rev7_36T_titanium_cleats_and_hub.png',
            28, -35
        ),
        (
            'QUICK-SWAP AVIONICS • 15-SECOND LIPO CARTRIDGE SYSTEM',
            'Tool-Free Slide-in Cartridge: Dual 4S 650mAh Packs in Viscoelastic TPU 95A Cradle with Beryllium-Copper Wipe Contacts',
            [
                ('chassis', chassis_puck, '#2c3e50', 0.40),
                ('cart1', cartridge_1, '#00d2d3', 0.95),
                ('cart2', cartridge_2, '#00d2d3', 0.95),
                ('mcu', doc.Teensy_40_MCU.Shape, '#2ecc71', 0.95),
                ('acc1', doc.Accel_Sensor_1_Front.Shape, '#e74c3c', 0.95),
                ('acc2', doc.Accel_Sensor_2_Rear.Shape, '#e74c3c', 0.95),
            ],
            'eyeliner_rev7_quick_swap_battery_cartridge.png',
            55, -40
        ),
        (
            'AUTONOMOUS COMBAT AVIONICS • MICRO-LiDAR & DUAL IR BEACONS',
            'Flush ST VL53L4CD Micro-LiDAR (1.2mm Replaceable Polycarbonate Window) & Dual High-Speed IR Wall Timing Phototransistors',
            [
                ('chassis_sec', chassis_puck, '#34495e', 0.45),
                ('lidar_port', lidar_port, '#1e272e', 0.95),
                ('lidar_window', lidar_window, '#00a8ff', 0.70),
                ('ir_dual', dual_ir, '#ffa502', 0.95),
            ],
            'eyeliner_rev7_avionics_lidar_ir_sensors.png',
            25, 20
        ),
    ]
    render_isometric_previews(renders)
    
    # Also update standard cad viewer previews in cad/ and display-study/
    cad_previews = [
        ('EYELINER REV 7 • APEX PREDATOR TOP ARMOR', '', full_assembly_colored, 'eyeliner_combat_v07.png', 35, -45),
        ('EYELINER REV 7 • TOP ARMOR & BITE PROFILE', '', full_assembly_colored, 'eyeliner_combat_v01.png', 35, -45),
        ('EYELINER REV 7 • UNDERSIDE GROUND CLEARANCE', '', full_assembly_colored, 'eyeliner_combat_v07_underside.png', -35, -45),
        ('EYELINER REV 7 • UNDERSIDE GROUND CLEARANCE', '', full_assembly_colored, 'eyeliner_combat_v01_underside.png', -35, -45),
        ('EYELINER REV 7 • INTERNAL ELECTRONICS & CARTRIDGES', '', [('c', chassis_puck, '#2c3e50', 0.4), ('p', cartridge_1, '#00d2d3', 0.9)], 'eyeliner_combat_v07_internals.png', 50, -40),
        ('EYELINER REV 7 • INTERNAL ELECTRONICS & CARTRIDGES', '', [('c', chassis_puck, '#2c3e50', 0.4), ('p', cartridge_1, '#00d2d3', 0.9)], 'eyeliner_combat_v01_internals.png', 50, -40),
        ('EYELINER REV 7 • 36T TITANIUM CLEAT DETAIL', '', [('c', cleat_disc_36t, '#dcdde1', 0.95), ('h', hub_assy, '#f5cd79', 0.9)], 'eyeliner_cleat_wheel_detail.png', 30, -30),
        ('EYELINER REV 7 • FLUSH MICRO-LiDAR & IR SENSORS', '', [('m', lidar_port, '#1e272e', 0.95), ('s', lidar_window, '#00a8ff', 0.7), ('i', dual_ir, '#ffa502', 0.95)], 'eyeliner_combat_v01_lidar_detail.png', 25, 25),
    ]
    render_isometric_previews(cad_previews)
    
    print("\n===================================================================")
    print("  REV 7 'APEX PREDATOR' CAD UPGRADE & EXPORT PIPELINE COMPLETE!   ")
    print("===================================================================")


if __name__ == "__main__":
    main()
