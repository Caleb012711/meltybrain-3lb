"""Volume audit for meltybrain 3lb - runs inside freecadcmd."""
import sys
import os
import traceback

CAD_DIR = "/Users/caleblickteig/Documents/meltybrain-3lb/cad"
OUT_DIR = "/Users/caleblickteig/Documents/meltybrain-3lb/mechanical"
FILES = ["Main CAD.step", "Wheel Pod.step", "Standard Weapon Teeth.step", "Undercutter Config.step"]

def audit_one(path):
    import FreeCAD
    import Import
    doc_name = "audit_" + os.path.basename(path).replace(" ", "_").replace(".", "_")
    # clean up existing doc with same name
    try:
        if FreeCAD.getDocument(doc_name):
            FreeCAD.closeDocument(doc_name)
    except Exception:
        pass
    doc = FreeCAD.newDocument(doc_name)
    print(f"\n===== FILE: {os.path.basename(path)} size={os.path.getsize(path)/1e6:.2f} MB =====", flush=True)
    try:
        Import.insert(path, doc.Name)
    except Exception as e:
        print(f"Import.insert failed: {e}", flush=True)
        traceback.print_exc()
        # fallback: Import.read?
        try:
            Import.read(path)
            doc = FreeCAD.ActiveDocument
        except Exception as e2:
            print(f"Import.read also failed: {e2}", flush=True)
            return None
    doc.recompute()
    objs = doc.Objects
    print(f"Top-level objects: {len(objs)}", flush=True)
    total_vol_cm3 = 0.0
    rows = []
    for i, o in enumerate(objs):
        label = getattr(o, "Label", o.Name)
        typ = o.TypeId if hasattr(o, "TypeId") else type(o).__name__
        vol = None
        bb = None
        bb_vol = None
        try:
            if hasattr(o, "Shape") and o.Shape is not None:
                try:
                    s = o.Shape
                    # compound: sum solids
                    if hasattr(s, "Solids") and s.Solids:
                        vol = sum(sol.S.Volume for sol in s.Solids) / 1000.0  # mm^3 -> cm^3
                        nsol = len(s.Solids)
                    else:
                        vol = s.Volume / 1000.0
                        nsol = 0
                    b = s.BoundBox
                    bb = (b.XLength, b.YLength, b.ZLength)
                    bb_vol = (b.XLength * b.YLength * b.ZLength) / 1000.0
                    total_vol_cm3 += vol if vol else 0
                    rows.append((label, typ, vol, nsol, bb, bb_vol))
                    print(f"[{i}] label='{label}' type={typ} nsolids={nsol} vol_cm3={vol:.3f} bbox_mm=({bb[0]:.1f},{bb[1]:.1f},{bb[2]:.1f}) bbox_cm3={bb_vol:.1f}", flush=True)
                except Exception as e:
                    print(f"[{i}] label='{label}' type={typ} SHAPE-ERR: {e}", flush=True)
            else:
                # group / assembly container - walk children
                print(f"[{i}] label='{label}' type={typ} (no Shape)", flush=True)
                # try to expand
                if hasattr(o, "Group"):
                    for j, c in enumerate(o.Group):
                        cl = getattr(c, "Label", c.Name)
                        ct = c.TypeId if hasattr(c, "TypeId") else type(c).__name__
                        try:
                            if hasattr(c, "Shape") and c.Shape is not None:
                                cs = c.Shape
                                if hasattr(cs, "Solids") and cs.Solids:
                                    cv = sum(ss.Volume for ss in cs.Solids) / 1000.0
                                    nso = len(cs.Solids)
                                else:
                                    cv = cs.Volume / 1000.0
                                    nso = 0
                                b = cs.BoundBox
                                total_vol_cm3 += cv if cv else 0
                                print(f"  -[{j}] label='{cl}' type={ct} nsolids={nso} vol_cm3={cv:.3f} bbox_mm=({b.XLength:.1f},{b.YLength:.1f},{b.ZLength:.1f})", flush=True)
                            else:
                                print(f"  -[{j}] label='{cl}' type={ct} (no Shape)", flush=True)
                        except Exception as e2:
                            print(f"  -[{j}] label='{cl}' ERR {e2}", flush=True)
        except Exception as e:
            print(f"[{i}] ERR {e}", flush=True)
    print(f">>> TOTAL solid vol cm3 = {total_vol_cm3:.3f} (= {total_vol_cm3*1000:.0f} mm^3)", flush=True)
    # deep walk: count all objects with Shape
    try:
        all_vol = 0.0
        count = 0
        for o in doc.Objects:
            # recursive via InList/OutList? just flat + Group expansion
            stack = [o]
            seen = set()
            while stack:
                cur = stack.pop()
                if id(cur) in seen:
                    continue
                seen.add(id(cur))
                if hasattr(cur, "Group") and cur.Group:
                    stack.extend(cur.Group)
                if hasattr(cur, "Shape") and cur.Shape is not None:
                    try:
                        # only count leaf-ish? avoid double count: if it has Group children, skip parent vol
                        if hasattr(cur, "Group") and cur.Group:
                            continue
                        v = cur.Shape.Volume / 1000.0
                        all_vol += v
                        count += 1
                    except Exception:
                        pass
        print(f">>> LEAF-SUM solids={count} vol_cm3={all_vol:.3f}", flush=True)
    except Exception as e:
        print(f"leaf-sum failed: {e}", flush=True)
    try:
        FreeCAD.closeDocument(doc.Name)
    except Exception:
        pass
    return total_vol_cm3

if __name__ == "__main__":
    print("FreeCAD audit start", flush=True)
    for f in FILES:
        p = os.path.join(CAD_DIR, f)
        if not os.path.exists(p):
            print(f"MISSING {p}", flush=True)
            continue
        try:
            audit_one(p)
        except Exception:
            traceback.print_exc()
    print("AUDIT DONE", flush=True)
