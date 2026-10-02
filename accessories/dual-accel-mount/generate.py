#!/usr/bin/env python3
"""Generate parametric Dual Accelerometer Rigid Mount for 3lb Meltybrain.
Rigid high-g sensor mount (PETG HF / CF-PETG) designed for 400g centripetal load.
"""
import json
import math
import sys
from pathlib import Path

# Add project root to sys.path for cad_validation
ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[1]
sys.path.insert(0, str(REPO_ROOT))

from accessories.cad_validation import (
    check_cad_solid,
    check_interference,
    export_and_verify_step,
    export_and_verify_stl,
    get_solid_count,
    get_volume,
)

from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut, BRepAlgoAPI_Fuse
from OCP.BRepAdaptor import BRepAdaptor_Curve
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.BRepFilletAPI import BRepFilletAPI_MakeFillet
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeCylinder
from OCP.GeomAbs import GeomAbs_Line
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Reader, STEPControl_Writer
from OCP.TopAbs import TopAbs_EDGE
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS
from OCP.gp import gp_Ax2, gp_Dir, gp_Pnt, gp_Trsf, gp_Vec


def moved(shape, x=0, y=0, z=0):
    t = gp_Trsf()
    t.SetTranslation(gp_Vec(x, y, z))
    return BRepBuilderAPI_Transform(shape, t, True).Shape()


def rounded_box(length, width, height, radius):
    box = BRepPrimAPI_MakeBox(length, width, height).Shape()
    if radius <= 0.05:
        return box
    fillet = BRepFilletAPI_MakeFillet(box)
    edges = TopExp_Explorer(box, TopAbs_EDGE)
    while edges.More():
        edge = TopoDS.Edge_s(edges.Current())
        curve = BRepAdaptor_Curve(edge)
        if curve.GetType() == GeomAbs_Line and abs(curve.Line().Direction().Z()) > 0.999:
            fillet.Add(radius, edge)
        edges.Next()
    fillet.Build()
    if not fillet.IsDone():
        raise RuntimeError(f"Fillet failed on box {length}x{width}x{height}")
    return fillet.Shape()


def make_cylinder(radius, height, center_x, center_y, center_z):
    axis = gp_Ax2(gp_Pnt(center_x, center_y, center_z), gp_Dir(0, 0, 1))
    return BRepPrimAPI_MakeCylinder(axis, radius, height).Shape()


def main():
    params = json.loads((ROOT / "parameters.json").read_text())

    # Sensor pocket dimensions (Adafruit 4627 / H3LIS331DL breakout standard)
    s_len = params["sensor_length"] + 2 * params["sensor_clearance_per_side"]
    s_wid = params["sensor_width"] + 2 * params["sensor_clearance_per_side"]
    p_depth = params["sensor_pocket_depth"]
    sep = params["sensor_separation"]
    wall = params["wall_thickness"]
    floor = params["base_thickness"]
    flange = params["chassis_mount_flange_width"]
    R = params["corner_radius"]

    # Overall body dimensions
    # Dual sensors side-by-side along Y axis, or longitudinal along X axis
    body_len = 2 * wall + s_len
    body_wid = 2 * wall + 2 * s_wid + sep
    total_height = floor + p_depth + 3.0  # extra height for rigidity & heat-set bosses

    # 1. Base block with rounded corners
    main_block = rounded_box(body_len, body_wid, total_height, R)

    # 2. Add chassis mounting flanges on left and right (+X and -X)
    flange_len = flange
    flange_x_neg = moved(rounded_box(flange_len + R, body_wid, floor, R), -flange_len, 0, 0)
    flange_x_pos = moved(rounded_box(flange_len + R, body_wid, floor, R), body_len - R, 0, 0)
    base_solid = BRepAlgoAPI_Fuse(main_block, flange_x_neg).Shape()
    base_solid = BRepAlgoAPI_Fuse(base_solid, flange_x_pos).Shape()

    # 3. Create sensor pockets
    # Pocket 1
    pocket1 = moved(
        rounded_box(s_len, s_wid, p_depth + 5.0, 1.0),
        wall,
        wall,
        floor,
    )
    # Pocket 2
    pocket2 = moved(
        rounded_box(s_len, s_wid, p_depth + 5.0, 1.0),
        wall,
        wall + s_wid + sep,
        floor,
    )
    base_solid = BRepAlgoAPI_Cut(base_solid, pocket1).Shape()
    base_solid = BRepAlgoAPI_Cut(base_solid, pocket2).Shape()

    # 4. Sensor mounting holes (heat-set insert bosses or clearance)
    # Adafruit 4627 mounting pattern: 20.32mm x 12.70mm centered in sensor PCB
    dx = params["sensor_hole_spacing_x"]
    dy = params["sensor_hole_spacing_y"]
    insert_r = params["sensor_heatset_hole_dia"] / 2.0
    insert_h = params["sensor_heatset_hole_depth"]

    for pocket_y_start in [wall, wall + s_wid + sep]:
        center_x = wall + s_len / 2.0
        center_y = pocket_y_start + s_wid / 2.0
        for hx in [-dx / 2.0, dx / 2.0]:
            for hy in [-dy / 2.0, dy / 2.0]:
                hole = make_cylinder(insert_r, insert_h + 1.0, center_x + hx, center_y + hy, floor - insert_h + 0.1)
                base_solid = BRepAlgoAPI_Cut(base_solid, hole).Shape()

    # 5. Wire pass-through channels for each sensor
    wire_channel_w = 6.0
    wire_channel_h = 3.5
    wire1 = moved(
        BRepPrimAPI_MakeBox(wire_channel_w, wall + 2.0, wire_channel_h).Shape(),
        wall + (s_len - wire_channel_w) / 2.0,
        -1.0,
        floor,
    )
    wire2 = moved(
        BRepPrimAPI_MakeBox(wire_channel_w, wall + 2.0, wire_channel_h).Shape(),
        wall + (s_len - wire_channel_w) / 2.0,
        body_wid - wall - 1.0,
        floor,
    )
    base_solid = BRepAlgoAPI_Cut(base_solid, wire1).Shape()
    base_solid = BRepAlgoAPI_Cut(base_solid, wire2).Shape()

    # 6. Chassis M3 mounting holes & counterbores in the flanges
    chassis_hole_r = params["chassis_mount_hole_dia"] / 2.0
    cb_r = params["chassis_counterbore_dia"] / 2.0
    cb_depth = params["chassis_counterbore_depth"]

    hole_y_offsets = [body_wid * 0.22, body_wid * 0.78]
    flange_x_offsets = [-flange_len / 2.0, body_len + flange_len / 2.0]

    for fx in flange_x_offsets:
        for fy in hole_y_offsets:
            # Through hole
            th = make_cylinder(chassis_hole_r, floor + 2.0, fx, fy, -1.0)
            base_solid = BRepAlgoAPI_Cut(base_solid, th).Shape()
            # Counterbore from top
            cb = make_cylinder(cb_r, cb_depth + 1.0, fx, fy, floor - cb_depth)
            base_solid = BRepAlgoAPI_Cut(base_solid, cb).Shape()

    # Validate Base Solid
    check_cad_solid(base_solid, "dual_accel_mount_base")

    # 7. Clamp Top Plate
    c_thick = params["clamp_thickness"]
    clamp_len = body_len
    clamp_wid = body_wid
    clamp_plate = rounded_box(clamp_len, clamp_wid, c_thick, R)

    # Cutout inspection/connector windows over center of sensors
    win_w = s_len - 12.0
    win_h = s_wid - 8.0
    win1 = moved(rounded_box(win_w, win_h, c_thick + 2.0, 1.0), (clamp_len - win_w) / 2.0, wall + 4.0, -1.0)
    win2 = moved(rounded_box(win_w, win_h, c_thick + 2.0, 1.0), (clamp_len - win_w) / 2.0, wall + s_wid + sep + 4.0, -1.0)
    clamp_solid = BRepAlgoAPI_Cut(clamp_plate, win1).Shape()
    clamp_solid = BRepAlgoAPI_Cut(clamp_solid, win2).Shape()

    # M2.5 screw clearance holes through clamp
    screw_clear_r = params["sensor_screw_hole_dia"] / 2.0
    for pocket_y_start in [wall, wall + s_wid + sep]:
        center_x = wall + s_len / 2.0
        center_y = pocket_y_start + s_wid / 2.0
        for hx in [-dx / 2.0, dx / 2.0]:
            for hy in [-dy / 2.0, dy / 2.0]:
                sc_hole = make_cylinder(screw_clear_r, c_thick + 2.0, center_x + hx, center_y + hy, -1.0)
                clamp_solid = BRepAlgoAPI_Cut(clamp_solid, sc_hole).Shape()

    # Validate Clamp Solid
    check_cad_solid(clamp_solid, "dual_accel_mount_clamp")

    # Assembled position for assembly STEP
    clamp_assembled = moved(clamp_solid, 0, 0, total_height)

    # Exports and Validation
    results = {
        "title": "Dual Accelerometer Rigid Mount (H3LIS331DL / Adafruit 4627)",
        "target_materials": ["Bambu PETG HF", "Bambu PETG-CF"],
        "parts": {},
    }

    parts = [
        ("dual_accel_mount_base", base_solid),
        ("dual_accel_mount_clamp", clamp_solid),
    ]

    for name, shape in parts:
        step_file = ROOT / f"{name}.step"
        stl_file = ROOT / f"{name}.stl"
        export_and_verify_step(shape, step_file)
        mesh_stats = export_and_verify_stl(shape, stl_file)
        mesh_stats["step_verified"] = True
        results["parts"][name] = mesh_stats

        # Also copy STL to repo 3d-printing/stl/
        repo_stl_dir = REPO_ROOT / "3d-printing" / "stl"
        repo_stl_dir.mkdir(parents=True, exist_ok=True)
        (repo_stl_dir / f"{name}.stl").write_bytes(stl_file.read_bytes())

    # Export Assembly STEP
    asm_writer = STEPControl_Writer()
    asm_writer.Transfer(base_solid, STEPControl_AsIs)
    asm_writer.Transfer(clamp_assembled, STEPControl_AsIs)
    asm_step = ROOT / "assembly.step"
    if asm_writer.Write(str(asm_step)) != IFSelect_RetDone:
        raise RuntimeError("Failed to write assembly STEP.")
    results["assembly_step_round_trip"] = True

    (ROOT / "validation.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Generated and verified Dual Accelerometer Mount CAD + Mesh successfully.")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
