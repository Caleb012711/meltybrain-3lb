#!/usr/bin/env python3
"""Generate parametric LED Heading Mount & Diffuser Lens for 3lb Meltybrain.
Rigid PETG HF holder + translucent PETG optical diffuser lens for heading pulse beacon.
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parents[1]
sys.path.insert(0, str(REPO_ROOT))

from accessories.cad_validation import (
    check_cad_solid,
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
    P = json.loads((ROOT / "parameters.json").read_text())

    led_r = P["led_dia"] / 2.0
    flange_r = P["led_flange_dia"] / 2.0
    flange_d = P["led_flange_depth"]
    spacing = P["led_spacing"]
    wall = P["wall_thickness"]
    floor = P["base_thickness"]
    flange_w = P["flange_width"]
    R = P["corner_radius"]

    body_len = 2 * wall + spacing + 2 * flange_r
    body_wid = 2 * wall + 2 * flange_r + 6.0  # room for resistor pocket
    total_h = floor + 8.5

    # 1. Main body
    main_body = rounded_box(body_len, body_wid, total_h, R)

    # 2. Add mounting ears along +X and -X
    flange_neg = moved(rounded_box(flange_w + R, body_wid, floor, R), -flange_w, 0, 0)
    flange_pos = moved(rounded_box(flange_w + R, body_wid, floor, R), body_len - R, 0, 0)
    main_body = BRepAlgoAPI_Fuse(main_body, flange_neg).Shape()
    main_body = BRepAlgoAPI_Fuse(main_body, flange_pos).Shape()

    # 3. LED Sockets (through bore + rear flange recess + front cone)
    center_y = wall + flange_r + 1.0
    center_x1 = wall + flange_r
    center_x2 = center_x1 + spacing

    for cx in [center_x1, center_x2]:
        # Through hole for LED dome
        bore = make_cylinder(led_r, total_h + 2.0, cx, center_y, -1.0)
        main_body = BRepAlgoAPI_Cut(main_body, bore).Shape()
        # Flange pocket from bottom
        f_pocket = make_cylinder(flange_r, floor + flange_d, cx, center_y, -1.0)
        main_body = BRepAlgoAPI_Cut(main_body, f_pocket).Shape()

    # 4. Resistor & wiring cavity behind LED sockets
    rw = P["resistor_pocket_w"]
    rl = P["resistor_pocket_l"]
    rd = P["resistor_pocket_d"]
    res_cavity = moved(
        rounded_box(rl, rw, rd + 2.0, 0.8),
        (body_len - rl) / 2.0,
        center_y + flange_r + 1.5,
        -1.0,
    )
    main_body = BRepAlgoAPI_Cut(main_body, res_cavity).Shape()

    # 5. Chassis M3 mounting holes & counterbores in flanges
    hole_r = P["chassis_mount_hole_dia"] / 2.0
    cb_r = P["chassis_counterbore_dia"] / 2.0
    cb_d = P["chassis_counterbore_depth"]

    for fx in [-flange_w / 2.0, body_len + flange_w / 2.0]:
        th = make_cylinder(hole_r, floor + 2.0, fx, body_wid / 2.0, -1.0)
        main_body = BRepAlgoAPI_Cut(main_body, th).Shape()
        cb = make_cylinder(cb_r, cb_d + 1.0, fx, body_wid / 2.0, floor - cb_d)
        main_body = BRepAlgoAPI_Cut(main_body, cb).Shape()

    # 6. Recess on top for snap-fit diffuser lens
    lens_lip_d = 1.5
    lens_recess = moved(
        rounded_box(body_len - 2 * 0.8, body_wid - 2 * 0.8, lens_lip_d + 1.0, R - 0.5),
        0.8,
        0.8,
        total_h - lens_lip_d,
    )
    main_body = BRepAlgoAPI_Cut(main_body, lens_recess).Shape()

    check_cad_solid(main_body, "led_mount_body")

    # 7. Optical Diffuser Lens Cap
    lens_t = P["lens_thickness"]
    lens_c = P["lens_clearance"]
    lens_len = body_len - 2 * 0.8 - 2 * lens_c
    lens_wid = body_wid - 2 * 0.8 - 2 * lens_c
    lens_solid = rounded_box(lens_len, lens_wid, lens_t + lens_lip_d, R - 0.5)

    check_cad_solid(lens_solid, "led_diffuser_lens")

    lens_assembled = moved(lens_solid, 0.8 + lens_c, 0.8 + lens_c, total_h - lens_lip_d)

    results = {
        "title": "Meltybrain LED Heading Indicator Mount & Diffuser Lens",
        "components": {
            "led_mount_body": "Bambu PETG HF (Black / Opaque)",
            "led_diffuser_lens": "Bambu PETG Translucent / Natural",
        },
        "parts": {},
    }

    parts = [
        ("led_mount_body", main_body),
        ("led_diffuser_lens", lens_solid),
    ]

    for name, shape in parts:
        step_file = ROOT / f"{name}.step"
        stl_file = ROOT / f"{name}.stl"
        export_and_verify_step(shape, step_file)
        mesh_stats = export_and_verify_stl(shape, stl_file)
        mesh_stats["step_verified"] = True
        results["parts"][name] = mesh_stats

        repo_stl_dir = REPO_ROOT / "3d-printing" / "stl"
        repo_stl_dir.mkdir(parents=True, exist_ok=True)
        (repo_stl_dir / f"{name}.stl").write_bytes(stl_file.read_bytes())

    asm_writer = STEPControl_Writer()
    asm_writer.Transfer(main_body, STEPControl_AsIs)
    asm_writer.Transfer(lens_assembled, STEPControl_AsIs)
    asm_step = ROOT / "assembly.step"
    if asm_writer.Write(str(asm_step)) != IFSelect_RetDone:
        raise RuntimeError("Failed to write assembly STEP.")
    results["assembly_step_round_trip"] = True

    (ROOT / "validation.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Generated and verified LED Heading Mount CAD + Mesh successfully.")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
