#!/usr/bin/env python3
"""Generate a standalone, unpowered XIAO storage case. Requires cadquery-ocp.

All dimensions are millimetres. Source: parameters.json and source-reference.json.
This is an accessory prototype, with no attachment to a robot or moving assembly.
"""
import hashlib
import argparse
import json
import math
import shutil
import subprocess
import sys
import struct
from collections import Counter
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from OCP.Bnd import Bnd_Box
from OCP.BRepAdaptor import BRepAdaptor_Curve
from OCP.BRepAlgoAPI import BRepAlgoAPI_Common, BRepAlgoAPI_Cut, BRepAlgoAPI_Fuse
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepBuilderAPI import BRepBuilderAPI_Transform
from OCP.BRepCheck import BRepCheck_Analyzer
from OCP.BRepFilletAPI import BRepFilletAPI_MakeFillet
from OCP.BRepGProp import BRepGProp
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox, BRepPrimAPI_MakeCylinder
from OCP.GeomAbs import GeomAbs_Line
from OCP.GProp import GProp_GProps
from OCP.IFSelect import IFSelect_RetDone
from OCP.STEPControl import STEPControl_AsIs, STEPControl_Reader, STEPControl_Writer
from OCP.StlAPI import StlAPI_Writer
from OCP.TopAbs import TopAbs_EDGE, TopAbs_SOLID
from OCP.TopExp import TopExp_Explorer
from OCP.TopoDS import TopoDS
from OCP.gp import gp_Ax1, gp_Ax2, gp_Dir, gp_Pnt, gp_Trsf, gp_Vec

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--publish', action='store_true', help='Copy the package and preview into this repository website public assets.')
args = parser.parse_args()
P = json.loads((ROOT / 'parameters.json').read_text())
if not all(isinstance(v, (int, float)) and math.isfinite(v) and v > 0 for v in P.values()):
    raise ValueError('All dimensions must be finite positive numbers.')
source = json.loads((ROOT / 'source-reference.json').read_text())[0]
source_dimensions = sorted(source['aabb_mm'], reverse=True)
if any(P[key] < dim for key, dim in zip(('board_length', 'board_width', 'board_height'), source_dimensions)):
    raise ValueError('The component envelope cannot be smaller than the measured source CAD.')
L = P['board_length'] + 2 * P['side_clearance'] + 2 * P['wall']
W = P['board_width'] + 2 * P['side_clearance'] + 2 * P['wall']
H = P['board_height'] + P['headroom'] + P['floor']
R = P['corner_radius']
wall, gap = P['wall'], P['lid_clearance_per_side']
lip_inset = wall + gap
lip_inner_inset = lip_inset + P['lid_lip_wall']
if not (lip_inner_inset < R < min(L, W) / 2):
    raise ValueError('Corner radius must exceed the lip inner inset and fit the case footprint.')
if P['lid_lip_height'] >= P['headroom']:
    raise ValueError('The lip must remain above the stored component envelope.')


def moved(shape, x=0, y=0, z=0):
    t = gp_Trsf(); t.SetTranslation(gp_Vec(x, y, z))
    return BRepBuilderAPI_Transform(shape, t, True).Shape()


def rounded_box(length, width, height, radius):
    shape = BRepPrimAPI_MakeBox(length, width, height).Shape()
    fillet = BRepFilletAPI_MakeFillet(shape)
    edges = TopExp_Explorer(shape, TopAbs_EDGE)
    while edges.More():
        edge = TopoDS.Edge_s(edges.Current())
        curve = BRepAdaptor_Curve(edge)
        if curve.GetType() == GeomAbs_Line and abs(curve.Line().Direction().Z()) > 0.999:
            fillet.Add(radius, edge)
        edges.Next()
    fillet.Build()
    if not fillet.IsDone():
        raise RuntimeError('Corner fillet failed.')
    return fillet.Shape()


def volume(shape):
    props = GProp_GProps(); BRepGProp.VolumeProperties_s(shape, props)
    return props.Mass()


def solid_count(shape):
    iterator = TopExp_Explorer(shape, TopAbs_SOLID); count = 0
    while iterator.More():
        count += 1; iterator.Next()
    return count


def mesh_check(path):
    raw = path.read_bytes()
    count = struct.unpack_from('<I', raw, 80)[0]
    if len(raw) != 84 + count * 50:
        raise RuntimeError('STL binary length mismatch.')
    edges, directions, points = Counter(), Counter(), []
    signed_volume = 0.0
    for i in range(count):
        data = struct.unpack_from('<12fH', raw, 84 + 50 * i)
        a, b, c = [tuple(round(x, 6) for x in data[j:j+3]) for j in (3, 6, 9)]
        ab = [b[j] - a[j] for j in range(3)]
        ac = [c[j] - a[j] for j in range(3)]
        cross = (ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0])
        if sum(v*v for v in cross) < 1e-14:
            raise RuntimeError('Degenerate STL triangle.')
        for u, v in ((a, b), (b, c), (c, a)):
            edge = tuple(sorted((u, v))); edges[edge] += 1
            directions[edge] += 1 if u < v else -1
        signed_volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6
        points.extend((a, b, c))
    if any(n != 2 for n in edges.values()) or any(directions.values()) or signed_volume <= 0:
        raise RuntimeError('STL is not a closed, consistently oriented positive-volume mesh.')
    return {'triangles': count, 'closed_manifold_edges': True, 'consistent_winding': True,
            'volume_mm3': signed_volume, 'bbox_mm': [max(v[j] for v in points)-min(v[j] for v in points) for j in range(3)]}


outer = rounded_box(L, W, H, R)
cavity = moved(rounded_box(L-2*wall, W-2*wall, H, R-wall), wall, wall, P['floor'])
body = BRepAlgoAPI_Cut(outer, cavity).Shape()
plate = rounded_box(L, W, P['lid_plate'], R)
lip_outer = moved(rounded_box(L-2*lip_inset, W-2*lip_inset, P['lid_lip_height'], R-lip_inset), lip_inset, lip_inset, P['lid_plate'])
lip_inner = moved(rounded_box(L-2*lip_inner_inset, W-2*lip_inner_inset, P['lid_lip_height']+2, R-lip_inner_inset), lip_inner_inset, lip_inner_inset, P['lid_plate']-1)
lip = BRepAlgoAPI_Cut(lip_outer, lip_inner).Shape()
lid = BRepAlgoAPI_Fuse(plate, lip).Shape()
# A shallow front-edge finger recess, outside the inner locating lip.
recess = BRepPrimAPI_MakeCylinder(gp_Ax2(gp_Pnt(L/2, -1.4, -1), gp_Dir(0,0,1)), 3, P['lid_plate']+2).Shape()
lid = BRepAlgoAPI_Cut(lid, recess).Shape()

rotation = gp_Trsf(); rotation.SetRotation(gp_Ax1(gp_Pnt(0,0,0), gp_Dir(1,0,0)), math.pi)
lid_assembled = moved(BRepBuilderAPI_Transform(lid, rotation, True).Shape(), 0, W, H+P['lid_plate'])
envelope = moved(BRepPrimAPI_MakeBox(P['board_length'], P['board_width'], P['board_height']).Shape(), wall+P['side_clearance'], wall+P['side_clearance'], P['floor'])
interferences = {name: abs(volume(BRepAlgoAPI_Common(a,b).Shape())) for name,a,b in (
    ('body_lid',body,lid_assembled), ('body_board_envelope',body,envelope), ('lid_board_envelope',lid_assembled,envelope))}
if any(v > 1e-6 for v in interferences.values()):
    raise RuntimeError(f'Assembly interference: {interferences}')

report = {'status': 'FIT-TEST PROTOTYPE — physical fit not verified', 'units': 'mm',
          'source_step_sha256': '6ef8e559608ab10c1c77ae6c8206081db6deea8d553960bb906b317635392106',
          'clearance_per_side_mm': gap, 'interference_volume_mm3': interferences, 'parts': {}}
for name, shape in [('body', body), ('lid', lid)]:
    if not BRepCheck_Analyzer(shape).IsValid() or solid_count(shape) != 1 or volume(shape) <= 0:
        raise RuntimeError(f'Invalid CAD solid: {name}')
    step = ROOT / f'{name}.step'; writer = STEPControl_Writer()
    writer.Transfer(shape, STEPControl_AsIs)
    if writer.Write(str(step)) != IFSelect_RetDone:
        raise RuntimeError('STEP export failed.')
    reader = STEPControl_Reader()
    if reader.ReadFile(str(step)) != IFSelect_RetDone:
        raise RuntimeError('STEP re-import failed.')
    reader.TransferRoots(); restored = reader.OneShape()
    if not BRepCheck_Analyzer(restored).IsValid() or solid_count(restored) != 1 or abs(volume(restored)-volume(shape)) > 0.001:
        raise RuntimeError('STEP round-trip validation failed.')
    BRepMesh_IncrementalMesh(shape, 0.04, False, 0.15, True)
    stl = ROOT / f'{name}.stl'; mesh_writer = StlAPI_Writer(); mesh_writer.ASCIIMode = False
    if not mesh_writer.Write(shape, str(stl)):
        raise RuntimeError('STL export failed.')
    metrics = mesh_check(stl)
    if abs(metrics['volume_mm3']-volume(shape))/volume(shape) > 0.01:
        raise RuntimeError('Mesh and CAD volumes differ by more than 1%.')
    metrics.update({'cad_valid': True, 'solid_count': 1, 'step_round_trip': True,
                    'cad_volume_mm3': volume(shape), 'sha256': hashlib.sha256(stl.read_bytes()).hexdigest()})
    report['parts'][name] = metrics
(ROOT / 'validation.json').write_text(json.dumps(report, indent=2)+'\n')
assembly_writer = STEPControl_Writer()
assembly_writer.Transfer(body, STEPControl_AsIs)
assembly_writer.Transfer(lid_assembled, STEPControl_AsIs)
if assembly_writer.Write(str(ROOT / 'assembly.step')) != IFSelect_RetDone:
    raise RuntimeError('Assembly STEP export failed.')
assembly_reader = STEPControl_Reader()
if assembly_reader.ReadFile(str(ROOT / 'assembly.step')) != IFSelect_RetDone:
    raise RuntimeError('Assembly STEP re-import failed.')
assembly_reader.TransferRoots()
if solid_count(assembly_reader.OneShape()) != 2 or not BRepCheck_Analyzer(assembly_reader.OneShape()).IsValid():
    raise RuntimeError('Assembly STEP round-trip validation failed.')
report['assembly_step_round_trip'] = True
(ROOT / 'validation.json').write_text(json.dumps(report, indent=2)+'\n')
archive = ROOT / 'xiao-bench-case.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    for filename in ('body.step','lid.step','assembly.step','body.stl','lid.stl','generate.py','parameters.json','source-reference.json','validation.json','README.md','render_preview.py','export_viewer.py'):
        z.write(ROOT / filename, f'xiao-bench-case/{filename}')
    if (ROOT / 'preview.png').exists():
        z.write(ROOT / 'preview.png', 'xiao-bench-case/preview.png')
print(json.dumps(report, indent=2))
print(f'Package: {archive}')
if args.publish:
    public = ROOT.parents[1] / 'web' / 'public'
    if not public.is_dir():
        raise RuntimeError('--publish requires the original repository layout.')
    target = public / 'accessories'; target.mkdir(exist_ok=True)
    shutil.copy2(archive, target / archive.name)
    if (ROOT / 'preview.png').exists():
        shutil.copy2(ROOT / 'preview.png', target / 'xiao-bench-case.png')
    subprocess.run([sys.executable, str(ROOT / 'export_viewer.py'), '--publish'], check=True)
