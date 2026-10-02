"""v3: dump all leaves to CSV + full list."""
import os, csv, traceback
CAD_DIR = "/Users/caleblickteig/Documents/meltybrain-3lb/cad"
OUT = "/Users/caleblickteig/Documents/meltybrain-3lb/mechanical/volumes_all.csv"
FILES = ["Main CAD.step"]

def dump(path):
    import FreeCAD, Import
    name = "v3_" + os.path.basename(path).replace(" ","_").replace(".","_")
    try:
        if FreeCAD.getDocument(name):
            FreeCAD.closeDocument(name)
    except Exception:
        pass
    doc = FreeCAD.newDocument(name)
    print(f"IMPORT {path}", flush=True)
    Import.insert(path, doc.Name)
    doc.recompute()
    rows = []
    for o in doc.Objects:
        if o.TypeId in ("App::Origin","App::Line","App::Plane","App::Point"):
            continue
        if hasattr(o, "Group") and o.Group:
            continue
        if hasattr(o, "Shape") and o.Shape is not None:
            try:
                sh = o.Shape
                v = sh.Volume / 1000.0
                b = sh.BoundBox
                rows.append((getattr(o,"Label",o.Name), o.TypeId, v, b.XLength, b.YLength, b.ZLength))
            except Exception as e:
                print(f"ERR {o.Label}: {e}", flush=True)
    rows.sort(key=lambda r: -r[2])
    print(f"LEAVES {len(rows)} TOTAL {sum(r[2] for r in rows):.3f} cm3", flush=True)
    for r in rows:
        print(f"{r[2]:9.3f} | ({r[3]:7.1f},{r[4]:7.1f},{r[5]:7.1f}) | {r[0]} [{r[1]}]", flush=True)
    # write csv
    with open(OUT, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["label","type","vol_cm3","bbx_mm","bby_mm","bbz_mm"])
        w.writerows(rows)
    print(f"WROTE {OUT}", flush=True)
    try:
        FreeCAD.closeDocument(doc.Name)
    except Exception:
        pass

print("V3 START", flush=True)
for f in FILES:
    try:
        dump(os.path.join(CAD_DIR, f))
    except Exception:
        traceback.print_exc()
print("V3 DONE", flush=True)
