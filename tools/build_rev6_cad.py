#!/usr/bin/env python3
"""Rev 6 FreeCAD Automated Assembly & Export Pipeline for Eyeliner 3lb Meltybrain.

Upgrades:
1. Swappable Modular Weapon Systems:
   - Option A: Symmetric 2-tooth AR500 ring (balanced 3,500 RPM spin-up).
   - Option B: Single deep-bite tooth + tungsten counterweight wedge (maximum bite depth at high translation speed).
   - Option C: Undercutter low-profile wedge tooth (gets under opponent ground clearance).
2. Drivetrain & Cleat Refinements:
   - Titanium Ti-6Al-4V 1.55" gear cleat wheels with 32T tooth profile.
   - Dual 626ZZ bearing retainers with thermal fit hubs and 6mm dead axle locks.
3. Shock-Isolated Avionics & LiDAR:
   - Viscoelastic TPU unibody pockets isolating the dual 4S 650mAh LiPo packs.
   - Flush ST VL53L4CD micro-LiDAR aperture with polycarbonate optical debris shield.
4. Parametric Build, STEP/STL Exports, and Studio Renders.
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
DISPLAY_STUDY_DIR = REPO_ROOT / "display-study"

for d in [CAD_DIR, STL_3D_DIR, STL_WEB_DIR, DISPLAY_STUDY_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def create_32t_titanium_cleat_disc():
    """Parametric 32T Grade 5 Titanium Gear Cleat Disc (1.55in OD, 32 Teeth)."""
    r_outer = 39.37 / 2.0  # 19.685 mm
    thickness = 1.2        # mm Ti-6Al-4V
    disc = Part.makeCylinder(r_outer, thickness)
    
    n_teeth = 32
    for i in range(n_teeth):
        angle = i * (360.0 / n_teeth)
        cutter = Part.makeBox(4.5, 1.5, thickness + 1.0)
        pl = FreeCAD.Placement()
        pl.Base = FreeCAD.Vector(17.2, -0.75, -0.5)
        pl.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 16.0) # 16 deg forward bite rake
        cutter.Placement = pl
        
        rot = FreeCAD.Placement()
        rot.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), angle)
        cutter.Placement = rot.multiply(cutter.Placement)
        disc = disc.cut(cutter)
        
    # Center 19mm bore for thermal fit over 626ZZ bearing hub
    bore = Part.makeCylinder(19.0 / 2.0, thickness + 2.0, FreeCAD.Vector(0, 0, -1.0))
    disc = disc.cut(bore)
    
    # 3x M2.5 drive pin holes on PCD 26mm
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


def create_bearing_retainer_hub_and_dual_626zz():
    """Thermal Fit Hub (7075-T6), Dual 626ZZ Ball Bearings, and 6mm Dead Axle Lock."""
    # Aluminum thermal fit hub
    hub_od = 24.0 / 2.0
    flange_od = 26.0 / 2.0
    hub_len = 14.0
    
    hub_base = Part.makeCylinder(hub_od, hub_len)
    flange = Part.makeCylinder(flange_od, 2.0)
    hub = hub_base.fuse(flange)
    
    # 19mm bore for dual 626ZZ bearings (12mm depth)
    bearing_bore = Part.makeCylinder(19.0 / 2.0, 12.0, FreeCAD.Vector(0, 0, 0))
    # 17mm internal retention shoulder step
    shoulder_bore = Part.makeCylinder(17.0 / 2.0, hub_len + 2.0, FreeCAD.Vector(0, 0, -1.0))
    
    hub = hub.cut(shoulder_bore)
    hub = hub.cut(bearing_bore)
    
    # 3x M2.5 threaded flange holes
    for a in [0, 120, 240]:
        rad = math.radians(a)
        th_hole = Part.makeCylinder(1.1, 4.0, FreeCAD.Vector(13.0 * math.cos(rad), 13.0 * math.sin(rad), -1.0))
        hub = hub.cut(th_hole)
        
    # Dual 626ZZ Bearings (6x19x6mm x 2 = 12mm stack)
    b_outer = Part.makeCylinder(19.0 / 2.0, 12.0)
    b_inner = Part.makeCylinder(10.0 / 2.0, 12.0)
    b_bore = Part.makeCylinder(6.0 / 2.0, 12.0)
    
    outer_race = b_outer.cut(b_inner)
    inner_race = b_inner.cut(b_bore)
    bearings = outer_race.fuse(inner_race)
    
    # 6mm precision dead axle shaft
    axle = Part.makeCylinder(6.0 / 2.0, 34.0, FreeCAD.Vector(0, 0, -10.0))
    
    # 6mm dead axle lock collar with anti-rotation D-flat
    collar = Part.makeCylinder(12.0 / 2.0, 6.0, FreeCAD.Vector(0, 0, -8.0))
    collar_bore = Part.makeCylinder(6.0 / 2.0, 8.0, FreeCAD.Vector(0, 0, -9.0))
    d_flat_cut = Part.makeBox(4.0, 14.0, 8.0, FreeCAD.Vector(4.2, -7.0, -9.0))
    collar = collar.cut(collar_bore).cut(d_flat_cut)
    
    # Combined drive hub subassembly
    pod_hub_assembly = hub.fuse(bearings).fuse(axle).fuse(collar)
    return hub, bearings, collar, pod_hub_assembly


def create_complete_cleat_wheel_assembly():
    """Complete 1.55in Cleated Drive Wheel Assembly: Ti Cleats + Hub + Bearings + Shore 20A Silicone."""
    cleat_disc = create_32t_titanium_cleat_disc()
    hub, bearings, collar, _ = create_bearing_retainer_hub_and_dual_626zz()
    
    # Shore 20A silicone tire band between cleats
    tire_od = 37.8 / 2.0
    tire_id = 24.0 / 2.0
    tire_width = 11.5
    tire_cyl = Part.makeCylinder(tire_od, tire_width, FreeCAD.Vector(0, 0, 1.5))
    tire_bore = Part.makeCylinder(tire_id, tire_width + 2.0, FreeCAD.Vector(0, 0, 0.5))
    tire = tire_cyl.cut(tire_bore)
    
    # Position cleat discs: dual outboard and inboard titanium cleats
    cleat_outboard = cleat_disc.copy()
    cleat_outboard.Placement = FreeCAD.Placement(FreeCAD.Vector(0, 0, 0), FreeCAD.Rotation())
    
    cleat_inboard = cleat_disc.copy()
    cleat_inboard.Placement = FreeCAD.Placement(FreeCAD.Vector(0, 0, 12.8), FreeCAD.Rotation())
    
    wheel_solid = cleat_outboard.fuse(cleat_inboard).fuse(tire).fuse(hub).fuse(bearings)
    return wheel_solid, cleat_disc


def create_tpu_battery_isolation_pocket():
    """Viscoelastic TPU Shock Isolation Pocket for 4S 650mAh LiPo Pack."""
    # Outer pocket block (64 x 34 x 24 mm)
    p_len, p_wid, p_h = 64.0, 34.0, 24.0
    pocket = Part.makeBox(p_len, p_wid, p_h, FreeCAD.Vector(-p_len/2.0, -p_wid/2.0, 0))
    
    # Internal battery cavity (60.5 x 30.5 x 20.5 mm)
    b_len, b_wid, b_h = 60.5, 30.5, 20.5
    cavity = Part.makeBox(b_len, b_wid, b_h + 5.0, FreeCAD.Vector(-b_len/2.0, -b_wid/2.0, 2.0))
    pocket = pocket.cut(cavity)
    
    # Energy-absorbing viscoelastic shock ribs on exterior
    # 4 longitudinal ribs
    for y_off in [-14.0, -7.0, 7.0, 14.0]:
        rib_cut = Part.makeBox(p_len + 2.0, 1.5, 1.2, FreeCAD.Vector(-p_len/2.0 - 1.0, y_off - 0.75, 0))
        pocket = pocket.cut(rib_cut)
    # 3 circumferential ribs
    for x_off in [-18.0, 0.0, 18.0]:
        rib_cut_c = Part.makeBox(1.5, p_wid + 2.0, 1.2, FreeCAD.Vector(x_off - 0.75, -p_wid/2.0 - 1.0, 0))
        pocket = pocket.cut(rib_cut_c)
        
    # Wire exit slot for XT30 & 16AWG leads
    wire_slot = Part.makeBox(14.0, 10.0, 10.0, FreeCAD.Vector(p_len/2.0 - 10.0, -5.0, 14.0))
    pocket = pocket.cut(wire_slot)
    
    return pocket


def create_flush_lidar_mount_and_debris_shield():
    """Flush ST VL53L4CD Micro-LiDAR Aperture Mount and Polycarbonate Optical Debris Shield."""
    # Mount body contoured to fit into chassis perimeter at R=70mm
    m_len, m_wid, m_h = 24.0, 16.0, 13.0
    mount_body = Part.makeBox(m_len, m_wid, m_h, FreeCAD.Vector(0, -m_wid/2.0, 0))
    
    # Sensor cavity for ST VL53L4CD PCB (13.5 x 18.0 x 2.5 mm)
    sensor_cavity = Part.makeBox(14.0, 12.0, 4.0, FreeCAD.Vector(3.0, -6.0, 4.5))
    mount_body = mount_body.cut(sensor_cavity)
    
    # Optical aperture: 18 deg field-of-view cone / slot
    aperture_slot = Part.makeBox(8.0, 11.0, 7.0, FreeCAD.Vector(16.0, -5.5, 3.0))
    mount_body = mount_body.cut(aperture_slot)
    
    # Recessed protective bezel for flush optical shield
    bezel_pocket = Part.makeBox(2.0, 14.0, 9.0, FreeCAD.Vector(22.1, -7.0, 2.0))
    mount_body = mount_body.cut(bezel_pocket)
    
    # 2x M2 mounting screw holes
    for y_hole in [-5.5, 5.5]:
        hole = Part.makeCylinder(1.0, m_h + 2.0, FreeCAD.Vector(8.0, y_hole, -1.0))
        mount_body = mount_body.cut(hole)
        
    # Polycarbonate Optical Debris Shield (1.2mm thick Makrolon window)
    shield = Part.makeBox(1.2, 13.6, 8.6, FreeCAD.Vector(22.4, -6.8, 2.2))
    
    return mount_body, shield


def build_weapon_options(existing_doc):
    """Build the 3 Swappable Modular Weapon Options."""
    # Option A: Symmetric 2-tooth AR500 ring (balanced 3,500 RPM spin-up)
    tooth_left = existing_doc.Combat_Tooth_Left.Shape.copy()
    tooth_right = existing_doc.Combat_Tooth_Right.Shape.copy()
    option_a = tooth_left.fuse(tooth_right)
    
    # Option B: Single deep-bite tooth + tungsten counterweight wedge
    # Deep bite tooth: take left tooth and extend the outer hook by 16mm for maximum bite depth
    hook_ext = Part.makeBox(16.0, 26.0, 22.0, FreeCAD.Vector(-152.0, -95.0, 0.0))
    # Hook rake chamfer
    hook_chamfer = Part.makeBox(20.0, 20.0, 26.0, FreeCAD.Vector(-156.0, -75.0, -2.0))
    pl = FreeCAD.Placement()
    pl.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 22.0)
    hook_chamfer.Placement = pl
    hook_ext = hook_ext.cut(hook_chamfer)
    deep_tooth = tooth_left.fuse(hook_ext)
    
    # Tungsten Counterweight Wedge (180 deg opposite, high density 18.0 g/cm3)
    # Mass of deep_tooth in steel (~247g) matched by ~13,700 mm3 of tungsten wedge
    cw_wedge = Part.makeBox(38.0, 44.0, 18.0, FreeCAD.Vector(65.0, -12.0, 2.0))
    # Streamline wedge cut
    cw_cut1 = Part.makeBox(40.0, 30.0, 22.0, FreeCAD.Vector(75.0, 15.0, 0.0))
    pl_cut1 = FreeCAD.Placement()
    pl_cut1.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 28.0)
    cw_cut1.Placement = pl_cut1
    cw_wedge = cw_wedge.cut(cw_cut1)
    
    option_b = deep_tooth.fuse(cw_wedge)
    
    # Option C: Undercutter low-profile wedge tooth (gets under opponent ground clearance)
    # Drop bite plane to Z = -6.0 mm with 14 deg lifting ramp scoop
    scoop_left = Part.makeBox(42.0, 32.0, 14.0, FreeCAD.Vector(-135.0, -80.0, -6.0))
    ramp_cut = Part.makeBox(50.0, 35.0, 15.0, FreeCAD.Vector(-140.0, -82.0, -6.0))
    pl_ramp = FreeCAD.Placement()
    pl_ramp.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), -14.0)
    ramp_cut.Placement = pl_ramp
    scoop_left = scoop_left.cut(ramp_cut)
    
    undercutter_tooth_left = tooth_left.fuse(scoop_left)
    
    # Mirrored right undercutter tooth
    pl_rot180 = FreeCAD.Placement()
    pl_rot180.Rotation = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 180.0)
    undercutter_tooth_right = undercutter_tooth_left.copy()
    undercutter_tooth_right.Placement = pl_rot180
    
    option_c = undercutter_tooth_left.fuse(undercutter_tooth_right)
    
    return option_a, option_b, option_c, deep_tooth, cw_wedge, undercutter_tooth_left, undercutter_tooth_right


def upgrade_chassis_puck_and_plates(existing_doc):
    """Upgrade Chassis Puck with TPU LiPo shock pockets and flush LiDAR aperture."""
    puck = existing_doc.Chassis_Puck.Shape.copy()
    top_plate = existing_doc.Top_Armor_Plate.Shape.copy()
    bottom_plate = existing_doc.Bottom_Skid_Plate.Shape.copy()
    
    # Add flush LiDAR aperture at perimeter R=70mm, 25 deg azimuth
    lidar_aperture = Part.makeBox(18.0, 14.0, 14.0, FreeCAD.Vector(55.0, 20.0, 5.0))
    puck = puck.cut(lidar_aperture)
    
    # 6mm dead axle lock keyway pockets in chassis puck
    for a in [60.0, 240.0]:
        rad = math.radians(a)
        cx = 43.0 * math.cos(rad)
        cy = 43.0 * math.sin(rad)
        axle_pocket = Part.makeCylinder(6.2 / 2.0, 26.0, FreeCAD.Vector(cx, cy, -1.0))
        keyway = Part.makeBox(7.0, 5.0, 10.0, FreeCAD.Vector(cx - 3.5, cy - 2.5, 14.0))
        puck = puck.cut(axle_pocket).cut(keyway)
        bottom_plate = bottom_plate.cut(Part.makeCylinder(6.2 / 2.0, 5.0, FreeCAD.Vector(cx, cy, -4.0)))
        top_plate = top_plate.cut(Part.makeCylinder(6.2 / 2.0, 5.0, FreeCAD.Vector(cx, cy, 23.5)))
        
    return puck, top_plate, bottom_plate


def update_spreadsheet_parameters(doc):
    """Update FreeCAD Spreadsheet with Rev 6 Engineering Parameters."""
    if hasattr(doc, 'Dimensions'):
        s = doc.Dimensions
    else:
        s = doc.addObject('Spreadsheet::Sheet', 'Dimensions')
        s.Label = 'Robot_Parameters'
        
    params = [
        ('A1', 'Parameter'), ('B1', 'Value (mm)'), ('C1', 'Physical & Engineering Role'),
        ('A2', 'BodyDiameter'), ('B2', '140'), ('C2', 'Outer chassis puck diameter'),
        ('A3', 'BodyHeight'), ('B3', '24'), ('C3', 'Chassis unibody thickness'),
        ('A4', 'TopPlateThickness'), ('B4', '3.5'), ('C4', 'Makrolon smoke polycarbonate top armor'),
        ('A5', 'BottomPlateThickness'), ('B5', '3.5'), ('C5', 'Makrolon smoke polycarbonate bottom skid plate'),
        ('A6', 'WheelOuterDiameter'), ('B6', '39.37'), ('C6', '1.55in Titanium Cleat Wheel outer crest diameter'),
        ('A7', 'CleatToothCount'), ('B7', '32'), ('C7', '32T tangential forward-raked cleat teeth profile'),
        ('A8', 'TireWidth'), ('B8', '14'), ('C8', 'Wheel assembly total axial width'),
        ('A9', 'DeadAxleDiameter'), ('B9', '6'), ('C9', 'Precision hardened 6mm dead axle with lock collar'),
        ('A10', 'BearingType'), ('B10', '626ZZ'), ('C10', 'Dual 626ZZ deep groove bearings (12mm stack)'),
        ('A11', 'PodAngle1_Deg'), ('B11', '60'), ('C11', 'Top-right drive pod azimuth'),
        ('A12', 'PodAngle2_Deg'), ('B12', '240'), ('C12', 'Bottom-left drive pod azimuth'),
        ('A13', 'BatteryShockType'), ('B13', 'TPU_95A_Ribbed'), ('C13', 'Viscoelastic TPU LiPo shock isolation cradle'),
        ('A14', 'BatteryPackType'), ('B14', 'Dual_4S_650mAh'), ('C14', 'Tattu R-Line 4S 650mAh 95C LiPo packs'),
        ('A15', 'LiDARSensorType'), ('B15', 'ST_VL53L4CD'), ('C15', 'Direct ToF Micro-LiDAR with Polycarbonate Shield'),
        ('A16', 'ModularWeaponOpt'), ('B16', '3_Configs'), ('C16', 'A: 2-Tooth AR500, B: Single-Bite Tungsten, C: Undercutter'),
        ('A17', 'MaxSpinRPM'), ('B17', '3500'), ('C17', 'Combat operational spin velocity (125 mph tip speed)'),
    ]
    for cell, val in params:
        s.set(cell, str(val))
    doc.recompute()


def export_all_stls_and_steps(parts_dict, assembly_shapes):
    """Export STEP and STL files to cad/, 3d-printing/stl/, and web/public/stl/."""
    print("=== EXPORTING STEP AND STL ASSETS ===")
    
    # 1. Export STEP files to CAD_DIR
    for name, shape in assembly_shapes.items():
        step_path = CAD_DIR / f"{name}.step"
        print(f"Exporting STEP: {step_path.name}...")
        Part.export([shape], str(step_path))
        
    # 2. Export STLs to all three directories
    for name, shape in parts_dict.items():
        cad_stl = CAD_DIR / f"{name}.stl"
        print(f"Exporting STL: {name}.stl...")
        shape.exportStl(str(cad_stl))
        
        # Copy / export to 3d-printing and web
        p3d_stl = STL_3D_DIR / f"{name}.stl"
        web_stl = STL_WEB_DIR / f"{name}.stl"
        p3d_stl.write_bytes(cad_stl.read_bytes())
        web_stl.write_bytes(cad_stl.read_bytes())
        
    print("All STEP and STL exports completed successfully!")


def render_isometric_previews(parts_render_list, out_images):
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

    print("=== RENDERING 3D PREVIEW IMAGES ===")
    
    light = np.array([-0.35, -0.55, 0.75])
    light /= np.linalg.norm(light)
    
    for title, subtitle, render_parts, out_name, elev, azim in out_images:
        fig = plt.figure(figsize=(16, 9), facecolor='#0b0f17')
        ax = fig.add_subplot(1, 1, 1, projection='3d', facecolor='#0b0f17')
        
        for part_name, shape, color, alpha in render_parts:
            # Export temp stl to read triangles
            tmp_stl = f"/tmp/{part_name}_tmp.stl"
            shape.exportStl(tmp_stl)
            raw = Path(tmp_stl).read_bytes()
            if len(raw) < 84:
                continue
            count = struct.unpack_from('<I', raw, 80)[0]
            if count == 0:
                continue
            step = max(1, count // 10000)
            tri_indices = list(range(0, count, step))
            if not tri_indices:
                continue
            tri_list = []
            for j in tri_indices:
                try:
                    vals = struct.unpack_from('<12fH', raw, 84 + j * 50)[3:12]
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
            
            # Shading
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
        fig.text(0.05, 0.04, 'EYELINER 3LB COMBAT MELTYBRAIN • REV 6 CAD SPECIFICATION • 3,500 RPM SPIN VELOCITY', fontsize=10, color='#8b949e')
        fig.text(0.95, 0.04, '32T Ti-6Al-4V CLEATS • DUAL 626ZZ • VISCOELASTIC TPU LiPo POCKETS • ST VL53L4CD', fontsize=10, color='#58a6ff', ha='right')
        
        fig.subplots_adjust(left=0.01, right=0.99, bottom=0.02, top=0.98)
        
        # Save to cad/ and display-study/
        cad_out = CAD_DIR / out_name
        study_out = DISPLAY_STUDY_DIR / out_name
        fig.savefig(str(cad_out), dpi=140, facecolor=fig.get_facecolor())
        fig.savefig(str(study_out), dpi=140, facecolor=fig.get_facecolor())
        plt.close(fig)
        print(f"Rendered: {out_name}")


def main():
    print("==========================================================")
    print("  EYELINER COMBAT MELTYBRAIN (3LB) — REV 6 CAD GENERATOR  ")
    print("==========================================================")
    
    # 1. Open base document
    base_fcstd = CAD_DIR / "eyeliner_combat_v01.FCStd"
    print(f"Loading base CAD: {base_fcstd}...")
    doc = FreeCAD.openDocument(str(base_fcstd))
    
    # 2. Build 32T Titanium Cleat Disc & Hub Assembly
    print("Building 32T Titanium Gear Cleat Wheel...")
    cleat_disc = create_32t_titanium_cleat_disc()
    hub, bearings, collar, hub_assy = create_bearing_retainer_hub_and_dual_626zz()
    wheel_solid, _ = create_complete_cleat_wheel_assembly()
    
    # Place wheels at top-right and bottom-left pods
    pl_tr = FreeCAD.Placement(FreeCAD.Vector(21.5, 37.2391, 12.0), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), -60.0) * FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), 90.0))
    wheel_tr = wheel_solid.copy()
    wheel_tr.Placement = pl_tr
    
    pl_bl = FreeCAD.Placement(FreeCAD.Vector(-21.5, -37.2391, 12.0), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 120.0) * FreeCAD.Rotation(FreeCAD.Vector(0, 1, 0), 90.0))
    wheel_bl = wheel_solid.copy()
    wheel_bl.Placement = pl_bl
    
    # 3. Build Viscoelastic TPU Battery Isolation Pockets
    print("Building Viscoelastic TPU Battery Isolation Pockets...")
    tpu_pocket = create_tpu_battery_isolation_pocket()
    
    pl_bat1 = FreeCAD.Placement(FreeCAD.Vector(-29.7, 29.7, 14.0), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 135.0))
    pocket_1 = tpu_pocket.copy()
    pocket_1.Placement = pl_bat1
    
    pl_bat2 = FreeCAD.Placement(FreeCAD.Vector(29.7, -29.7, 14.0), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 315.0))
    pocket_2 = tpu_pocket.copy()
    pocket_2.Placement = pl_bat2
    
    # 4. Build Flush ST VL53L4CD Micro-LiDAR Mount and Shield
    print("Building Flush ST VL53L4CD Micro-LiDAR Mount & Debris Shield...")
    lidar_mount, lidar_shield = create_flush_lidar_mount_and_debris_shield()
    pl_lidar = FreeCAD.Placement(FreeCAD.Vector(47.5, 22.0, 11.5), FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 25.0))
    lidar_mount.Placement = pl_lidar
    lidar_shield.Placement = pl_lidar
    
    # 5. Upgrade Chassis Puck and Armor Plates
    print("Upgrading Chassis Puck and Polycarbonate Armor Plates...")
    chassis_puck, top_plate, bottom_plate = upgrade_chassis_puck_and_plates(doc)
    
    # 6. Build the 3 Modular Swappable Weapon Options
    print("Engineering 3 Modular Swappable Weapon Systems...")
    opt_a, opt_b, opt_c, deep_tooth, cw_wedge, under_l, under_r = build_weapon_options(doc)
    
    # 7. Update objects in FreeCAD Document
    print("Updating FreeCAD document structure...")
    update_spreadsheet_parameters(doc)
    
    # Update existing parts
    doc.Chassis_Puck.Shape = chassis_puck
    doc.Top_Armor_Plate.Shape = top_plate
    doc.Bottom_Skid_Plate.Shape = bottom_plate
    doc.Wheel_Assembly_TopRight.Shape = wheel_tr
    doc.Wheel_Assembly_BottomLeft.Shape = wheel_bl
    
    # Add new Rev 6 components to Document
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

    add_or_update("Weapon_Option_A_Symmetric_2Tooth", "Weapon Option A (Symmetric 2-Tooth AR500)", opt_a, "WeaponAssembly")
    add_or_update("Weapon_Option_B_Single_Bite_Tungsten", "Weapon Option B (Single-Bite + Tungsten Wedge)", opt_b, "WeaponAssembly")
    add_or_update("Weapon_Option_C_Undercutter_Wedge", "Weapon Option C (Undercutter Low-Profile Wedge)", opt_c, "WeaponAssembly")
    add_or_update("TPU_Battery_Pocket_1", "TPU_Battery_Isolation_Pocket_1 (95A Viscoelastic)", pocket_1, "ElectronicsAssembly")
    add_or_update("TPU_Battery_Pocket_2", "TPU_Battery_Isolation_Pocket_2 (95A Viscoelastic)", pocket_2, "ElectronicsAssembly")
    add_or_update("LiDAR_Optical_Debris_Shield", "LiDAR_Optical_Debris_Shield (Makrolon Polycarbonate)", lidar_shield, "ElectronicsAssembly")
    add_or_update("LiDAR_Mount_Rev6", "LiDAR_Mount_Rev6 (Flush ST VL53L4CD)", lidar_mount, "ElectronicsAssembly")
    
    doc.recompute()
    
    # Save Rev 6 FCStd and update Rev 1 FCStd
    fcstd_v06 = CAD_DIR / "eyeliner_combat_v06.FCStd"
    print(f"Saving FreeCAD Project: {fcstd_v06}...")
    doc.saveAs(str(fcstd_v06))
    doc.saveAs(str(base_fcstd))
    
    # 8. Define export sets
    # Assembly shapes for STEP
    full_assembly_rev6 = Part.Compound([
        chassis_puck, top_plate, bottom_plate, wheel_tr, wheel_bl,
        opt_a, pocket_1, pocket_2, lidar_mount, lidar_shield
    ])
    
    assembly_steps = {
        "eyeliner_combat_v06": full_assembly_rev6,
        "eyeliner_combat_v01": full_assembly_rev6,
        "weapon_option_a_symmetric_2tooth": opt_a,
        "weapon_option_b_single_bite_tungsten": opt_b,
        "weapon_option_c_undercutter_wedge": opt_c,
        "titanium_cleat_wheel_32T_1.55in": cleat_disc,
        "drive_pod_626zz_hub_assembly": hub_assy,
        "eyeliner_chassis_puck_rev6": chassis_puck,
        "eyeliner_lidar_mount_rev6": lidar_mount,
    }
    
    # Individual parts for STL
    parts_stls = {
        "weapon_option_a_symmetric_2tooth": opt_a,
        "weapon_option_b_single_bite_tungsten": opt_b,
        "weapon_option_c_undercutter_wedge": opt_c,
        "titanium_cleat_disc_1.55in": cleat_disc,
        "eyeliner_wheel_cleat_left": cleat_disc,
        "eyeliner_wheel_cleat_right": cleat_disc,
        "bearing_retainer_626zz_hub": hub,
        "dead_axle_lock_6mm": collar,
        "tpu_battery_isolation_pocket": tpu_pocket,
        "lidar_polycarbonate_debris_shield": lidar_shield,
        "eyeliner_lidar_mount": lidar_mount,
        "eyeliner_chassis_puck": chassis_puck,
        "eyeliner_combat_v01-chassis": chassis_puck,
        "eyeliner_top_plate": top_plate,
        "eyeliner_combat_v01-top_plate": top_plate,
        "eyeliner_bottom_plate": bottom_plate,
        "eyeliner_combat_v01-bottom_plate": bottom_plate,
        "eyeliner_silicone_tire_left": doc.Wheel_Assembly_BottomLeft.Shape,
        "eyeliner_silicone_tire_right": doc.Wheel_Assembly_TopRight.Shape,
        "eyeliner_motor_left": doc.Motor_PropDrive_BottomLeft.Shape,
        "eyeliner_motor_right": doc.Motor_PropDrive_TopRight.Shape,
        "eyeliner_battery_pack_1": doc.Battery_Pack_1.Shape,
        "eyeliner_battery_pack_2": doc.Battery_Pack_2.Shape,
    }
    
    export_all_stls_and_steps(parts_stls, assembly_steps)
    
    # 9. Render previews for CAD and Display Study
    full_assembly_colored = [
        ('chassis', chassis_puck, '#72c2d9', 0.85),
        ('top_plate', top_plate, '#1b222c', 0.80),
        ('bottom_plate', bottom_plate, '#1b222c', 0.80),
        ('wheel_tr', wheel_tr, '#c5cbd3', 0.95),
        ('wheel_bl', wheel_bl, '#c5cbd3', 0.95),
        ('weapon_a', opt_a, '#ff4757', 0.95),
        ('pocket1', pocket_1, '#00d2d3', 0.90),
        ('pocket2', pocket_2, '#00d2d3', 0.90),
        ('lidar_mount', lidar_mount, '#2e3d49', 0.95),
        ('lidar_shield', lidar_shield, '#54a0ff', 0.60),
    ]

    renders = [
        (
            'EYELINER REV 6 • COMBAT MELTYBRAIN (3LB)',
            'Full Assembly with Rev 6 32T Titanium Cleats, AR500 Modular Teeth, and Viscoelastic TPU Isolation',
            full_assembly_colored,
            'eyeliner_rev6_isometric_overview.png',
            32, -45
        ),
        (
            'SWAPPABLE WEAPON SYSTEMS • 3 MODULAR CONFIGURATIONS',
            'Option A: Symmetric 2-Tooth (3,500 RPM) | Option B: Deep-Bite + Tungsten Wedge | Option C: Low-Profile Undercutter',
            [
                ('opt_a', opt_a, '#ff6b6b', 0.90),
                ('opt_b', opt_b, '#feca57', 0.90),
                ('opt_c', opt_c, '#48dbfb', 0.90),
                ('chassis_ref', chassis_puck, '#34495e', 0.35),
            ],
            'eyeliner_rev6_weapon_modular_options.png',
            45, -60
        ),
        (
            'DRIVETRAIN & TRACTION • 32T TITANIUM CLEATS & 626ZZ HUB',
            'Grade 5 Ti-6Al-4V 1.55in Cleats (16° Forward Bite Rake) • Dual 626ZZ Bearings • 6mm Dead Axle Lock',
            [
                ('cleat', cleat_disc, '#dcdde1', 0.95),
                ('hub_assy', hub_assy, '#f5cd79', 0.90),
                ('wheel_tr', wheel_tr, '#576574', 0.70),
            ],
            'eyeliner_rev6_32T_titanium_cleats_and_hub.png',
            28, -35
        ),
        (
            'SHOCK-ISOLATED AVIONICS & INTERNAL CORE ARCHITECTURE',
            'Viscoelastic TPU Unibody LiPo Shock Pockets (4S 650mAh) • Teensy 4.0 • Dual ±400g H3LIS331DL Accelerometers',
            [
                ('chassis', chassis_puck, '#2c3e50', 0.40),
                ('pocket1', pocket_1, '#00d2d3', 0.95),
                ('pocket2', pocket_2, '#00d2d3', 0.95),
                ('bat1', doc.Battery_Pack_1.Shape, '#1e272e', 0.85),
                ('bat2', doc.Battery_Pack_2.Shape, '#1e272e', 0.85),
                ('mcu', doc.Teensy_40_MCU.Shape, '#2ecc71', 0.95),
                ('acc1', doc.Accel_Sensor_1_Front.Shape, '#e74c3c', 0.95),
                ('acc2', doc.Accel_Sensor_2_Rear.Shape, '#e74c3c', 0.95),
            ],
            'eyeliner_rev6_shock_isolated_avionics_internals.png',
            55, -40
        ),
        (
            'AUTONOMOUS COMBAT NAVIGATION • FLUSH ST VL53L4CD MICRO-LiDAR',
            'Aerodynamic Perimeter Aperture with 1.2mm Polycarbonate Optical Debris Shield (940nm VCSEL Direct ToF Ranging)',
            [
                ('chassis_sec', chassis_puck, '#34495e', 0.45),
                ('lidar_mount', lidar_mount, '#1e272e', 0.95),
                ('lidar_shield', lidar_shield, '#00a8ff', 0.70),
            ],
            'eyeliner_rev6_flush_lidar_aperture_detail.png',
            25, 20
        ),
    ]
    
    render_isometric_previews(None, renders)
    
    # Also update standard cad viewer previews in cad/
    cad_previews = [
        ('EYELINER REV 6 • TOP ARMOR & BITE PROFILE', '', full_assembly_colored, 'eyeliner_combat_v01.png', 35, -45),
        ('EYELINER REV 6 • UNDERSIDE GROUND CLEARANCE', '', full_assembly_colored, 'eyeliner_combat_v01_underside.png', -35, -45),
        ('EYELINER REV 6 • INTERNAL ELECTRONICS & TPU POCKETS', '', [('c', chassis_puck, '#2c3e50', 0.4), ('p', pocket_1, '#00d2d3', 0.9)], 'eyeliner_combat_v01_internals.png', 50, -40),
        ('EYELINER REV 6 • 32T TITANIUM CLEAT DETAIL', '', [('c', cleat_disc, '#dcdde1', 0.95), ('h', hub_assy, '#f5cd79', 0.9)], 'eyeliner_cleat_wheel_detail.png', 30, -30),
        ('EYELINER REV 6 • FLUSH MICRO-LiDAR DETAIL', '', [('m', lidar_mount, '#1e272e', 0.95), ('s', lidar_shield, '#00a8ff', 0.7)], 'eyeliner_combat_v01_lidar_detail.png', 25, 25),
    ]
    render_isometric_previews(None, cad_previews)
    
    print("\n==========================================================")
    print("  REV 6 CAD UPGRADE & EXPORT PIPELINE FINISHED SUCCESSFULLY! ")
    print("==========================================================")


if __name__ == "__main__":
    main()
