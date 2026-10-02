"""v2: leaf-level volumes sorted, keyword aggregates. Run via freecadcmd -c exec(open(...).read())."""
import os, traceback
CAD_DIR = "/Users/caleblickteig/Documents/meltybrain-3lb/cad"
FILES = ["Main CAD.step", "Wheel Pod.step", "Standard Weapon Teeth.step", "Undercutter Config.step"]

def leaves(doc):
    out = []
    for o in doc.Objects:
        # skip datum
        if o.TypeId in ("App::Origin","App::Line","App::Plane","App::Point"):
            continue
        has_group = hasattr(o, "Group") and o.Group
        if has_group:
            continue  # container, children will be visited separately
        if hasattr(o, "Shape") and o.Shape is not None:
            try:
                sh = o.Shape
                v = sh.Volume / 1000.0  # mm3->cm3
                b = sh.BoundBox
                bb = (b.XLength, b.YLength, b.ZLength)
                out.append((getattr(o,"Label",o.Name), o.TypeId, v, bb))
            except Exception as e:
                out.append((getattr(o,"Label",o.Name), o.TypeId, None, str(e)))
    return out

def audit_one(path):
    import FreeCAD, Import
    name = "v2_" + os.path.basename(path).replace(" ","_").replace(".","_")
    try:
        if FreeCAD.getDocument(name):
            FreeCAD.closeDocument(name)
    except Exception:
        pass
    doc = FreeCAD.newDocument(name)
    print(f"\n===== {os.path.basename(path)} =====", flush=True)
    Import.insert(path, doc.Name)
    doc.recompute()
    rows = leaves(doc)
    rows_ok = [r for r in rows if r[2] is not None]
    rows_ok.sort(key=lambda r: -r[2])
    print(f"leaf objects with Shape: {len(rows_ok)} (skipped datum/containers)", flush=True)
    tot = sum(r[2] for r in rows_ok)
    print(f"TOTAL leaf vol = {tot:.3f} cm3", flush=True)
    print(f"--- TOP 60 by volume ---", flush=True)
    for lab, typ, v, bb in rows_ok[:60]:
        print(f"vol={v:9.3f} cm3 | bbox=({bb[0]:7.1f},{bb[1]:7.1f},{bb[2]:7.1f}) mm | {lab}", flush=True)
    # keyword aggregates
    import re
    keys = ["ring","teeth","tooth","pod","plate","screw","nut","bearing","motor","wheel","undercut","compound","solid","core","mesh","boss","chamfer","cut","shield","body","pins","esc","bec","receptor","battery","switch"]
    print(f"--- keyword sums (label contains, case-insensitive) ---", flush=True)
    for k in keys:
        s = sum(r[2] for r in rows_ok if k in r[0].lower())
        n = sum(1 for r in rows_ok if k in r[0].lower())
        if n:
            print(f"  '{k}': n={n} vol={s:.3f} cm3", flush=True)
    # also: big bbox filter - ring candidates: bbox diameter 200-230mm in X&Y
    print(f"--- ring candidates (bbox X>150mm and Y>150mm) ---", flush=True)
    for lab, typ, v, bb in rows_ok:
        if bb[0] > 150 and bb[1] > 150:
            print(f"vol={v:9.3f} | bbox=({bb[0]:.1f},{bb[1]:.1f},{bb[2]:.1f}) | {lab}", flush=True)
    try:
        FreeCAD.closeDocument(doc.Name)
    except Exception:
        pass

print("V2 START", flush=True)
for f in FILES:
    try:
        audit_one(os.path.join(CAD_DIR, f))
    except Exception:
        traceback.print_exc()
print("V2 DONE", flush=True)
