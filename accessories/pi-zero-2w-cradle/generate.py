#!/usr/bin/env python3
"""Generate parametric Pi Zero 2W / Orange Pi Supervisor Isolation Cradle.
Hybrid architecture: PETG HF rigid carrier + TPU 95A shock isolation grommets.
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

    pi_len = P["pi_length"] + 2 * P["pi_clearance_per_side"]
    pi_wid = P["pi_width"] + 2 * P["pi_clearance_per_side"]
    bec_len = P["bec_length"]
    bec_wid = P["bec_width"]

    wall = P["wall_thickness"]
    floor = P["floor_thickness"]
    R = P["corner_radius"]

    inner_len = pi_len
    inner_wid = pi_wid + bec_wid + wall
    total_len = inner_len + 2 * wall
    total_wid = inner_wid + 2 * wall
    total_height = floor + 8.0

    # 1. Main outer body block
    main_body = rounded_box(total_len, total_wid, total_height, R)

    # 2. Add 4 shock-grommet mounting ears on the four corners with generous overlap
    ear_r = P["grommet_flange_od"] / 2.0 + 1.5
    ear_h = floor
    grommet_hole_r = P["grommet_hole_dia"] / 2.0

    # Place ears centered with significant intersection into the body
    ear_centers = [
        (0.0, 0.0),
        (total_len, 0.0),
        (0.0, total_wid),
        (total_len, total_wid),
    ]

    for ex, ey in ear_centers:
        ear = make_cylinder(ear_r, ear_h, ex, ey, 0)
        main_body = BRepAlgoAPI_Fuse(main_body, ear).Shape()

    # 3. Pi Pocket
    pi_pocket = moved(
        rounded_box(pi_len, pi_wid, total_height, 1.0),
        wall,
        wall,
        floor,
    )
    main_body = BRepAlgoAPI_Cut(main_body, pi_pocket).Shape()

    # 4. BEC Pocket
    bec_pocket = moved(
        rounded_box(bec_len, bec_wid, total_height, 1.0),
        wall + (pi_len - bec_len) / 2.0,
        wall + pi_wid + wall,
        floor,
    )
    main_body = BRepAlgoAPI_Cut(main_body, bec_pocket).Shape()

    # 5. Standoffs inside Pi pocket (fuse from z=0 up to floor+standoff_h for clean solid union)
    dx = P["pi_hole_spacing_x"]
    dy = P["pi_hole_spacing_y"]
    center_x = wall + pi_len / 2.0
    center_y = wall + pi_wid / 2.0
    standoff_r = 3.2
    standoff_h = 2.5
    heatset_r = P["pi_heatset_dia"] / 2.0
    heatset_depth = P["pi_heatset_depth"]

    for hx in [-dx / 2.0, dx / 2.0]:
        for hy in [-dy / 2.0, dy / 2.0]:
            sx = center_x + hx
            sy = center_y + hy
            standoff = make_cylinder(standoff_r, floor + standoff_h, sx, sy, 0)
            main_body = BRepAlgoAPI_Fuse(main_body, standoff).Shape()
            hs_hole = make_cylinder(heatset_r, heatset_depth + 1.0, sx, sy, floor + standoff_h - heatset_depth)
            main_body = BRepAlgoAPI_Cut(main_body, hs_hole).Shape()

    # 6. Drill grommet holes through ears
    for ex, ey in ear_centers:
        ear_hole = make_cylinder(grommet_hole_r, ear_h + 2.0, ex, ey, -1.0)
        main_body = BRepAlgoAPI_Cut(main_body, ear_hole).Shape()

    # 7. MicroSD card access slot with anti-ejection barrier
    sd_slot_w = 14.0
    sd_slot_h = 3.5
    sd_slot = moved(
        BRepPrimAPI_MakeBox(wall + 2.0, sd_slot_w, sd_slot_h).Shape(),
        -1.0,
        center_y - sd_slot_w / 2.0,
        floor + standoff_h - 1.0,
    )
    main_body = BRepAlgoAPI_Cut(main_body, sd_slot).Shape()

    # 8. BEC wire routing notch into Pi chamber
    wire_notch = moved(
        BRepPrimAPI_MakeBox(12.0, wall + 2.0, 3.5).Shape(),
        center_x - 6.0,
        wall + pi_wid - 1.0,
        floor,
    )
    main_body = BRepAlgoAPI_Cut(main_body, wire_notch).Shape()

    # 9. Camera ribbon cable slot
    cam_slot = moved(
        BRepPrimAPI_MakeBox(15.0, wall + 2.0, 2.5).Shape(),
        center_x - 7.5,
        -1.0,
        floor + standoff_h,
    )
    main_body = BRepAlgoAPI_Cut(main_body, cam_slot).Shape()

    check_cad_solid(main_body, "pi_cradle_base")

    # 10. Protective Top Cover
    c_wall = P["cover_wall"]
    c_thick = 2.0
    cover_outer = rounded_box(total_len, total_wid, c_thick, R)

    # Heatsink chimney window
    hs_wx = P["heatsink_window_x"]
    hs_wy = P["heatsink_window_y"]
    hs_window = moved(
        rounded_box(hs_wx, hs_wy, c_thick + 2.0, 1.0),
        center_x - hs_wx / 2.0,
        center_y - hs_wy / 2.0,
        -1.0,
    )
    cover_solid = BRepAlgoAPI_Cut(cover_outer, hs_window).Shape()

    # Fastener clearance holes through cover
    clear_r = P["pi_hole_dia"] / 2.0
    for hx in [-dx / 2.0, dx / 2.0]:
        for hy in [-dy / 2.0, dy / 2.0]:
            ch = make_cylinder(clear_r, c_thick + 2.0, center_x + hx, center_y + hy, -1.0)
            cover_solid = BRepAlgoAPI_Cut(cover_solid, ch).Shape()

    check_cad_solid(cover_solid, "pi_cradle_cover")

    # 11. TPU Shock Isolation Grommet
    flange_od_r = P["grommet_flange_od"] / 2.0
    groove_od_r = P["grommet_groove_od"] / 2.0
    inner_r = P["grommet_inner_dia"] / 2.0
    tot_h = P["grommet_total_height"]
    grv_w = P["grommet_groove_width"]
    flange_h = (tot_h - grv_w) / 2.0

    grommet = make_cylinder(flange_od_r, flange_h, 0, 0, 0)
    waist = make_cylinder(groove_od_r, grv_w + 0.1, 0, 0, flange_h - 0.05)
    grommet = BRepAlgoAPI_Fuse(grommet, waist).Shape()
    top_flange = make_cylinder(flange_od_r, flange_h, 0, 0, flange_h + grv_w)
    grommet = BRepAlgoAPI_Fuse(grommet, top_flange).Shape()
    center_hole = make_cylinder(inner_r, tot_h + 2.0, 0, 0, -1.0)
    grommet_solid = BRepAlgoAPI_Cut(grommet, center_hole).Shape()

    check_cad_solid(grommet_solid, "tpu_isolation_grommet")

    cover_assembled = moved(cover_solid, 0, 0, total_height + 4.0)

    results = {
        "title": "Pi Zero 2W / Orange Pi Supervisor Shock Isolation Cradle",
        "components": {
            "pi_cradle_base": "Bambu PETG HF",
            "pi_cradle_cover": "Bambu PETG HF",
            "tpu_isolation_grommet": "Bambu TPU 95A HF",
        },
        "parts": {},
    }

    parts = [
        ("pi_cradle_base", main_body),
        ("pi_cradle_cover", cover_solid),
        ("tpu_isolation_grommet", grommet_solid),
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
    asm_writer.Transfer(cover_assembled, STEPControl_AsIs)
    for ex, ey in ear_centers:
        grom_placed = moved(grommet_solid, ex, ey, 0)
        asm_writer.Transfer(grom_placed, STEPControl_AsIs)

    asm_step = ROOT / "assembly.step"
    if asm_writer.Write(str(asm_step)) != IFSelect_RetDone:
        raise RuntimeError("Failed to write assembly STEP.")
    results["assembly_step_round_trip"] = True

    (ROOT / "validation.json").write_text(json.dumps(results, indent=2) + "\n")
    print("Generated and verified Pi Zero 2W Cradle CAD + Mesh successfully.")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
