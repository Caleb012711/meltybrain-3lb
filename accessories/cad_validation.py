#!/usr/bin/env python3
"""CAD and Mesh validation utilities for parametric accessories.
Validates OpenCASCADE shapes, STEP round-trips, and binary STL manifolds.
"""
import hashlib
import json
import math
import struct
from collections import Counter
from pathlib import Path

from OCP.BRepAlgoAPI import BRepAlgoAPI_Common
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepGProp import BRepGProp
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.GProp import GProp_GProps
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Reader, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopAbs import TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer


def get_volume(shape):
    """Compute exact B-Rep volume of a TopoDS_Shape."""
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, props)
    return props.Mass()


def get_solid_count(shape):
    """Count number of TopoDS_Solid components in shape."""
    iterator = TopExp_Explorer(shape, TopAbs_SOLID)
    count = 0
    while iterator.More():
        count += 1
        iterator.Next()
    return count


def check_cad_solid(shape, name="solid"):
    """Verify shape is a valid single solid with positive volume."""
    analyzer = BRepCheck_Analyzer(shape)
    if not analyzer.IsValid():
        raise RuntimeError(f"CAD shape '{name}' is not topologically valid.")
    solids = get_solid_count(shape)
    if solids != 1:
        raise RuntimeError(f"CAD shape '{name}' has {solids} solids (expected 1).")
    vol = get_volume(shape)
    if vol <= 1e-6:
        raise RuntimeError(f"CAD shape '{name}' has invalid volume: {vol} mm3.")
    return vol


def export_and_verify_step(shape, step_path: Path):
    """Export shape to STEP and verify round-trip re-import."""
    step_path = Path(step_path)
    writer = STEPControl_Writer()
    writer.Transfer(shape, STEPControl_AsIs)
    if writer.Write(str(step_path)) != IFSelect_RetDone:
        raise RuntimeError(f"Failed to write STEP file: {step_path}")
    
    reader = STEPControl_Reader()
    if reader.ReadFile(str(step_path)) != IFSelect_RetDone:
        raise RuntimeError(f"Failed to read back STEP file: {step_path}")
    reader.TransferRoots()
    restored = reader.OneShape()
    
    analyzer = BRepCheck_Analyzer(restored)
    if not analyzer.IsValid():
        raise RuntimeError(f"Restored STEP shape '{step_path.name}' is invalid.")
    
    orig_vol = get_volume(shape)
    restored_vol = get_volume(restored)
    if abs(orig_vol - restored_vol) > 0.01:
        raise RuntimeError(f"STEP round-trip volume mismatch: {orig_vol:.4f} vs {restored_vol:.4f} mm3")
    return True


def export_and_verify_stl(shape, stl_path: Path, linear_deflection=0.03, angular_deflection=0.12):
    """Tessellate shape, export binary STL, and strictly verify manifold topology."""
    stl_path = Path(stl_path)
    BRepMesh_IncrementalMesh(shape, linear_deflection, False, angular_deflection, True)
    writer = StlAPI_Writer()
    writer.ASCIIMode = False
    if not writer.Write(shape, str(stl_path)):
        raise RuntimeError(f"Failed to export STL: {stl_path}")
    
    # Rigorous binary STL mesh validation
    raw = stl_path.read_bytes()
    if len(raw) < 84:
        raise RuntimeError(f"STL file '{stl_path.name}' is too short ({len(raw)} bytes).")
    tri_count = struct.unpack_from('<I', raw, 80)[0]
    expected_size = 84 + tri_count * 50
    if len(raw) != expected_size:
        raise RuntimeError(f"STL binary length mismatch: expected {expected_size} bytes, got {len(raw)} bytes.")
    
    edges = Counter()
    directions = Counter()
    points = []
    signed_volume = 0.0
    
    for i in range(tri_count):
        offset = 84 + 50 * i
        data = struct.unpack_from('<12fH', raw, offset)
        # vertex coords rounded to 6 decimals for robust vertex welding
        a = tuple(round(x, 6) for x in data[3:6])
        b = tuple(round(x, 6) for x in data[6:9])
        c = tuple(round(x, 6) for x in data[9:12])
        
        ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
        ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
        normal_cross = (
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0]
        )
        cross_len_sq = sum(v * v for v in normal_cross)
        if cross_len_sq < 1e-14:
            raise RuntimeError(f"Degenerate triangle detected at index {i} in '{stl_path.name}'.")
        
        for u, v in ((a, b), (b, c), (c, a)):
            edge = tuple(sorted((u, v)))
            edges[edge] += 1
            directions[edge] += 1 if u < v else -1
        
        signed_volume += (
            a[0] * (b[1] * c[2] - b[2] * c[1]) +
            a[1] * (b[2] * c[0] - b[0] * c[2]) +
            a[2] * (b[0] * c[1] - b[1] * c[0])
        ) / 6.0
        points.extend((a, b, c))
    
    non_manifold = [e for e, count in edges.items() if count != 2]
    if non_manifold:
        raise RuntimeError(f"Non-manifold edges detected ({len(non_manifold)}) in '{stl_path.name}'.")
    
    inconsistent_winding = [e for e, d in directions.items() if d != 0]
    if inconsistent_winding:
        raise RuntimeError(f"Inconsistent triangle winding detected ({len(inconsistent_winding)} edges) in '{stl_path.name}'.")
    
    if signed_volume <= 1e-6:
        raise RuntimeError(f"Mesh has non-positive volume: {signed_volume:.4f} mm3 in '{stl_path.name}'.")
    
    cad_vol = get_volume(shape)
    vol_error_pct = abs(signed_volume - cad_vol) / cad_vol * 100.0
    if vol_error_pct > 1.5:
        raise RuntimeError(f"Mesh volume ({signed_volume:.2f}) deviates from CAD volume ({cad_vol:.2f}) by {vol_error_pct:.2f}% in '{stl_path.name}'.")
    
    bbox = [
        max(p[j] for p in points) - min(p[j] for p in points)
        for j in range(3)
    ]
    
    return {
        "triangles": tri_count,
        "closed_manifold_edges": True,
        "consistent_winding": True,
        "mesh_volume_mm3": round(signed_volume, 3),
        "cad_volume_mm3": round(cad_vol, 3),
        "volume_deviation_pct": round(vol_error_pct, 3),
        "bbox_mm": [round(b, 3) for b in bbox],
        "sha256": hashlib.sha256(raw).hexdigest()
    }


def check_interference(shape_a, shape_b, name_a="part_a", name_b="part_b"):
    """Check boolean common volume between two shapes."""
    common = BRepAlgoAPI_Common(shape_a, shape_b).Shape()
    vol = abs(get_volume(common))
    if vol > 1e-5:
        raise RuntimeError(f"Interference detected between '{name_a}' and '{name_b}': {vol:.6f} mm3.")
    return vol
