#!/usr/bin/env python3
"""Generate parametric TPU 95A Dual 4S LiPo Battery Cradle for 3lb Meltybrain.
Energy-absorbing shock mount with integrated strap channels and anti-pullthrough bosses.
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

    p_len = P["pack_length"]
    p_wid = P["pack_width"]
    p_h = P["pack_height"]
    sep = P["pack_separation"]
    wall = P["wall_thickness"]
    floor = P["floor_thickness"]
    flange = P["flange_width"]
    R = P["corner_radius"]

    body_len = p_len + 2 * wall
    body_wid = 2 * p_wid + sep + 2 * wall
    body_h = floor + p_h * 0.75  # 75% height for positive grip while allowing strap wrap

    # 1. Main outer body block
    main_body = rounded_box(body_len, body_wid, body_h, R)

    # 2. Add mounting flanges along the +X and -X ends
    flange_neg = moved(rounded_box(flange + R, body_wid, floor + 2.0, R), -flange, 0, 0)
    flange_pos = moved(rounded_box(flange + R, body_wid, floor + 2.0, R), body_len - R, 0, 0)
    main_body = BRepAlgoAPI_Fuse(main_body, flange_neg).Shape()
    main_body = BRepAlgoAPI_Fuse(main_body, flange_pos).Shape()

    # 3. Dual LiPo Pockets
    pocket1 = moved(
        rounded_box(p_len, p_wid, body_h + 2.0, 1.5),
        wall,
        wall,
        floor,
    )
    pocket2 = moved(
        rounded_box(p_len, p_wid, body_h + 2.0, 1.5),
        wall,
        wall + p_wid + sep,
        floor,
    )
    main_body = BRepAlgoAPI_Cut(main_body, pocket1).Shape()
    main_body = BRepAlgoAPI_Cut(main_body, pocket2).Shape()

    # 4. Velcro strap channels across Y axis (underside / sidewall recesses)
    strap_w = P["strap_channel_width"]
    strap_d = P["strap_channel_depth"]

    for sx_offset in [body_len * 0.28, body_len * 0.72]:
        strap_cut = moved(
            BRepPrimAPI_MakeBox(strap_w, body_wid + 2 * wall + 10.0, strap_d).Shape(),
            sx_offset - strap_w / 2.0,
            -5.0,
            -0.1,
        )
        main_body = BRepAlgoAPI_Cut(main_body, strap_cut).Shape()

    # 5. Wire pass-through / XT30 lead exit notches at +X end
    wire_notch1 = moved(
        rounded_box(wall + flange + 4.0, 10.0, p_h, 1.0),
        body_len - wall - 1.0,
        wall + (p_wid - 10.0) / 2.0,
        floor,
    )
    wire_notch2 = moved(
        rounded_box(wall + flange + 4.0, 10.0, p_h, 1.0),
        body_len - wall - 1.0,
        wall + p_wid + sep + (p_wid - 10.0) / 2.0,
        floor,
    )
    main_body = BRepAlgoAPI_Cut(main_body, wire_notch1).Shape()
    main_body = BRepAlgoAPI_Cut(main_body, wire_notch2).Shape()

    # 6. Chassis M3 mounting holes & counterbores in flanges
    hole_r = P["chassis_mount_hole_dia"] / 2.0
    cb_r = P["chassis_counterbore_dia"] / 2.0
    cb_d = P["chassis_counterbore_depth"]

    flange_xs = [-flange / 2.0, body_len + flange / 2.0]
    flange_ys = [body_wid * 0.25, body_wid * 0.75]

    for fx in flange_xs:
        for fy in flange_ys:
            th = make_cylinder(hole_r, floor + 4.0, fx, fy, -1.0)
            main_body = BRepAlgoAPI_Cut(main_body, th).Shape()
            cb = make_cylinder(cb_r, cb_d + 1.0, fx, fy, floor + 2.0 - cb_d)
            main_body = BRepAlgoAPI_Cut(main_body, cb).Shape()

    check_cad_solid(main_body, "tpu_battery_cradle")

    results = {
        "title": "Dual 4S 550mAh LiPo TPU 95A Battery Cradle",
        "material": "Bambu TPU 95A HF",
        "parts": {},
    }

    step_file = ROOT / "battery_cradle.step"
    stl_file = ROOT / "battery_cradle.stl"
    export_and_verify_step(main_body, step_file)
    mesh_stats = export_and_verify_stl(main_body, stl_file)
    mesh_stats["step_verified"] = True
    results["parts"]["battery_cradle"] = mesh_stats

    # Copy to 3d-printing/stl/
    repo_stl_dir = REPO_ROOT / "3d-printing" / "stl"
    repo_stl_dir.mkdir(parents=True, exist_ok=True)
    (repo_stl_dir / "battery_cradle.stl").write_bytes(stl_file.read_bytes())

    (ROOT / "validation.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Generated and verified TPU Battery Cradle CAD + Mesh successfully.")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
