#!/usr/bin/env python3
"""STEP -> STL + GLB for web viewer. Units: mm. One entrypoint."""
import argparse, json, os, sys
import numpy as np

def solid_stats(solid):
    """Volume cm³, bbox mm, CAD face count for one solid."""
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_FACE
    from OCP.GProp import GProp_GProps
    from OCP.BRepGProp import BRepGProp
    from OCP.Bnd import Bnd_Box
    from OCP.BRepBndLib import BRepBndLib
    nfaces = 0
    fe = TopExp_Explorer(solid, TopAbs_FACE)
    while fe.More():
        nfaces += 1
        fe.Next()
    props = GProp_GProps()
    BRepGProp.VolumeProperties_s(solid, props)
    vol_cm3 = round(props.Mass() / 1000.0, 3)
    try:
        cog = props.CentreOfMass()
        centroid = [round(cog.X(), 1), round(cog.Y(), 1), round(cog.Z(), 1)]
    except Exception:
        centroid = [0.0, 0.0, 0.0]
    box = Bnd_Box()
    BRepBndLib.Add_s(solid, box)
    try:
        xmin, ymin, zmin = box.GetXMin(), box.GetYMin(), box.GetZMin()
        xmax, ymax, zmax = box.GetXMax(), box.GetYMax(), box.GetZMax()
    except Exception:
        xmin = ymin = zmin = xmax = ymax = zmax = 0.0
    bbox = [round(xmax - xmin, 1), round(ymax - ymin, 1), round(zmax - zmin, 1)]
    return vol_cm3, bbox, nfaces, centroid


def assign_role(vol, bbox, faces):
    """Deterministic role from volume + bbox aspect only. First match wins."""
    dmax = max(bbox) if bbox else 0
    dmin = min(bbox) if bbox else 0
    chunk = (dmin / dmax) if dmax else 0
    if vol > 50:
        return "shell-tpu"
    # Large thin solids with many CAD faces are cut plates (armor with
    # lightening holes), not the weapon band: a true ring is a simple
    # profile with few faces. Plates must win before the ring rule.
    if dmin <= 6 and dmax >= 100:
        return "chassis-alu"
    if dmax >= 100 and dmin <= 6 and vol >= 15:
        return "weapon-steel"
    if vol >= 8 and chunk >= 0.5 and faces >= 30:
        return "weapon-steel"
    if dmin <= 6 and 20 <= dmax <= 80 and 0.1 <= vol < 8:
        return "chassis-alu"
    if 2 <= vol <= 20 and faces <= 12 and chunk >= 0.3:
        return "electro-green"
    if 0.5 <= vol < 8 and dmin >= 8 and faces >= 15:
        return "pod-metal"
    if vol < 8 and faces >= 300:
        return "pod-metal"
    return "fastener-dark"


def step_to_meshes(path, linear=0.1, angular=0.2618):
    from OCP.STEPControl import STEPControl_Reader
    from OCP.TopExp import TopExp_Explorer
    from OCP.TopAbs import TopAbs_SOLID
    from OCP.BRepMesh import BRepMesh_IncrementalMesh
    from OCP.BRep import BRep_Tool
    from OCP.TopLoc import TopLoc_Location
    from OCP.Poly import Poly_Connect
    import trimesh
    r = STEPControl_Reader()
    if r.ReadFile(path) != 1:
        raise RuntimeError(f"ReadFile failed: {path}")
    r.TransferRoots()
    shape = r.OneShape()
    exp = TopExp_Explorer(shape, TopAbs_SOLID)
    meshes = []
    stats = []
    n = 0
    while exp.More():
        solid = exp.Current()
        n += 1
        vol_cm3, bbox, nfaces, centroid = solid_stats(solid)
        BRepMesh_IncrementalMesh(solid, linear, False, angular, True)
        # walk faces via explorer for triangulation
        from OCP.TopExp import TopExp_Explorer as E2
        from OCP.TopAbs import TopAbs_FACE
        from OCP.BRep import BRep_Tool as BT
        from OCP.Poly import Poly_Triangulation
        fe = E2(solid, TopAbs_FACE)
        from OCP.TopoDS import TopoDS
        from OCP.TopAbs import TopAbs_REVERSED
        verts_all, faces_all = [], []
        voff = 0
        while fe.More():
            face = TopoDS.Face(fe.Current())
            loc = TopLoc_Location()
            tri = BT.Triangulation_s(face, loc)
            if tri is None:
                fe.Next(); continue
            rev = face.Orientation() == TopAbs_REVERSED
            tr = loc.Transformation()
            # nodes
            nn = tri.NbNodes()
            arr = np.zeros((nn, 3))
            for i in range(1, nn+1):
                p = tri.Node(i)
                pt = p.Transformed(tr)
                arr[i-1] = [pt.X(), pt.Y(), pt.Z()]
            nt = tri.NbTriangles()
            fl = []
            for i in range(1, nt+1):
                t = tri.Triangle(i)
                a, b, c = t.Get()
                if rev:
                    fl.append([a-1+voff, c-1+voff, b-1+voff])
                else:
                    fl.append([a-1+voff, b-1+voff, c-1+voff])
            verts_all.append(arr); faces_all.extend(fl)
            voff += nn
            fe.Next()
        if verts_all:
            V = np.vstack(verts_all)
            F = np.array(faces_all, dtype=np.int64)
            m = trimesh.Trimesh(vertices=V, faces=F, process=False)
            m.merge_vertices(merge_tex=True, merge_norm=True, digits_vertex=8, digits_norm=8)
            m.update_faces(m.nondegenerate_faces())
            m.remove_infinite_values()
            m.remove_unreferenced_vertices()
            try:
                m.fix_inversion()
            except Exception:
                pass
            m.fix_normals()
            m.process(validate=True)
            # Crease-split: faces sharing an edge with dihedral > 30 deg get
            # duplicated vertices so flat faces keep crisp normals instead
            # of smearing into fillets. Union-find over smooth edges only.
            try:
                _F = m.faces.copy()
                _parent = list(range(len(_F) * 3 + 1))

                def _find(_a):
                    while _parent[_a] != _a:
                        _parent[_a] = _parent[_parent[_a]]
                        _a = _parent[_a]
                    return _a

                def _union_sets(_a, _b):
                    _ra, _rb = _find(_a), _find(_b)
                    if _ra != _rb:
                        _parent[_ra] = _rb

                _adj = m.face_adjacency
                _ang = m.face_adjacency_angles
                _edg = m.face_adjacency_edges
                _pairs = []
                for (_fa, _fb), (_va, _vb), _an in zip(_adj, _edg, _ang):
                    if _an > np.radians(30):
                        continue
                    for _vv in (_va, _vb):
                        _ka = int(np.where(_F[_fa] == _vv)[0][0])
                        _kb = int(np.where(_F[_fb] == _vv)[0][0])
                        _pairs.append((_fa * 3 + _ka, _fb * 3 + _kb))
                _flat_v = m.vertices[_F.reshape(-1)]
                if _pairs:
                    for _a, _b in _pairs:
                        _union_sets(_a, _b)
                    _groups = np.array([_find(_i) for _i in range(len(_F) * 3)], dtype=np.int64)
                    _seen = {}
                    _nv = []
                    _idx = np.empty(len(_F) * 3, dtype=np.int64)
                    for _ci in range(len(_F) * 3):
                        _g = int(_groups[_ci])
                        if _g not in _seen:
                            _seen[_g] = len(_nv)
                            _nv.append(_flat_v[_ci])
                        _idx[_ci] = _seen[_g]
                    m.vertices = np.array(_nv)
                    m.faces = _idx.reshape((-1, 3))
                else:
                    m.vertices = _flat_v
                    m.faces = np.arange(len(_F) * 3, dtype=np.int64).reshape((-1, 3))
                m.remove_unreferenced_vertices()
                m.compute_vertex_normals()
            except Exception:
                pass
            meshes.append(m)
            q = 1 if (vol_cm3 < 0.01 or nfaces <= 6) else 0
            stats.append({
                "vol_cm3": vol_cm3,
                "bbox_mm": bbox,
                "faces": nfaces,
                "role": assign_role(vol_cm3, bbox, nfaces),
                "c": centroid,
                "m": [round(vol_cm3 * 7.85, 1), round(vol_cm3 * 2.7, 1)],
                "q": q,
            })
        exp.Next()
    return meshes, stats, n

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=False)
    ap.add_argument("--name", required=False)
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--out", default="web/public/cad")
    ap.add_argument("--linear-deflection", type=float, default=0.1)
    ap.add_argument("--angular-deflection", type=float, default=0.2618)
    ap.add_argument("--manifest", action="store_true")
    a = ap.parse_args()
    root = "/workspaces/meltybrain-3lb"
    jobs = []
    if a.all:
        # (src, name, linear_mm, angular_rad, face_budget, min_share)
        jobs = [
            (f"{root}/Standard Weapon Teeth.step", "standard-weapon-teeth", 0.025, 0.08, 40000, 2000),
            (f"{root}/Undercutter Config.step", "undercutter-config", 0.04, 0.10, 60000, 1500),
            (f"{root}/Wheel Pod.step", "wheel-pod", 0.04, 0.10, 110000, 1000),
            (f"{root}/Main CAD.step", "main-cad", 0.05, 0.12, 140000, 800),
        ]
    else:
        if not a.inp or not a.name:
            print("need --in + --name or --all"); sys.exit(2)
        jobs = [(a.inp, a.name, a.linear_deflection, a.angular_deflection, 220000, 800)]
    os.makedirs(a.out, exist_ok=True)
    manifest = []
    if os.path.exists(os.path.join(a.out, "manifest.json")):
        manifest = json.load(open(os.path.join(a.out, "manifest.json")))
    import trimesh
    for src, name, lin, ang, budget, minshare in jobs:
        print(f"== {src} -> {name} (lin={lin} ang={ang})", flush=True)
        meshes, stats, nsolids = step_to_meshes(src, lin, ang)
        if not meshes:
            print(f"WARN: no meshes from {src}"); continue
        # degenerate thread artifacts: keep in STL/manifest, drop from GLB
        keep = []
        for m, st in zip(meshes, stats):
            degen = (st["vol_cm3"] < 0.01)
            st["dropped_from_glb"] = bool(degen)
            if not degen:
                keep.append((m, st))
        print(f"  kept {len(keep)}/{len(meshes)} solids for GLB ({len(meshes)-len(keep)} degenerates dropped)")
        gmeshes = [m for m, _ in keep]
        gstats = [st for _, st in keep]
        orig_idx = [i for i, (_, st) in enumerate(zip(meshes, stats)) if not st["dropped_from_glb"]]
        total_faces = sum(len(m.faces) for m in gmeshes)

        def is_thin_plate(st):
            bb = st["bbox_mm"]
            return min(bb) <= 1.5 and max(bb) >= 10.0

        # decimate proportionally; thin plates are already minimal — never touch them
        if total_faces > budget:
            decimated = []
            for m, st in zip(gmeshes, gstats):
                if is_thin_plate(st):
                    decimated.append(m)
                    continue
                share = max(minshare, int(budget * len(m.faces) / total_faces))
                if len(m.faces) > share:
                    try:
                        decimated.append(m.simplify_quadric_decimation(face_count=share))
                    except Exception:
                        decimated.append(m)
                else:
                    decimated.append(m)
            gmeshes = decimated
            print(f"  decimated {total_faces} -> {sum(len(m.faces) for m in gmeshes)} faces")
        scene = trimesh.Scene()
        # STL ships the viewer-resolution set (degenerates dropped, decimated):
        # full-res mass truth lives in parts.json, not in the download.
        combined = trimesh.util.concatenate(gmeshes)
        stl_p = os.path.join(a.out, f"{name}.stl")
        glb_p = os.path.join(a.out, f"{name}.glb")
        combined.export(stl_p)
        # GLB keeps one node per solid so the viewer can explode the assembly.
        # Node names use ORIGINAL solid indices so parts.json joins stay valid
        # even when degenerates are dropped.
        gscene = trimesh.Scene()
        for m, oi in zip(gmeshes, orig_idx):
            gscene.add_geometry(m, node_name=f"solid_{oi:03d}", geom_name=f"solid_{oi:03d}")
        gscene.export(glb_p)
        parts = []
        for i, st in enumerate(stats):
            parts.append({
                "node": f"solid_{i:03d}",
                "role": st["role"],
                "vol_cm3": st["vol_cm3"],
                "bbox_mm": st["bbox_mm"],
                "faces": st["faces"],
                "dropped_from_glb": st.get("dropped_from_glb", False),
            })
        parts_p = os.path.join(a.out, f"{name}.parts.json")
        json.dump(parts, open(parts_p, "w"), indent=1)
        from collections import Counter
        print(f"  roles={dict(Counter(p['role'] for p in parts))}")
        for p in (stl_p, glb_p):
            manifest = [m for m in manifest if m["filename"] != os.path.basename(p)]
            manifest.append({"filename": os.path.basename(p), "bytes": os.path.getsize(p), "solids": nsolids, "units": "mm"})
        print(f"  solids={nsolids} faces={len(combined.faces)} stl={os.path.getsize(stl_p)} glb={os.path.getsize(glb_p)}")
    if a.manifest or a.all:
        json.dump(manifest, open(os.path.join(a.out, "manifest.json"), "w"), indent=1)
        print("manifest:", manifest)

if __name__ == "__main__":
    main()
