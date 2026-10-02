"""Create the two-part Explorer GLB directly from the validated STL exports.

Uses the site's existing millimetre mesh convention. The lid transformation is
identical to generate.py's seated assembly. No extra dependencies are needed.
"""
import argparse
import json
import re
import shutil
import struct
from pathlib import Path

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--publish', action='store_true')
args = parser.parse_args()
p = json.loads((root / 'parameters.json').read_text())
validation = json.loads((root / 'validation.json').read_text())
width = p['board_width'] + 2*p['side_clearance'] + 2*p['wall']
top = p['board_height'] + p['headroom'] + p['floor'] + p['lid_plate']
gltf = {'asset': {'version': '2.0', 'generator': 'XIAO accessory STL viewer export'},
        'scene': 0, 'scenes': [{'nodes': [0, 1]}], 'nodes': [], 'meshes': [],
        'materials': [], 'buffers': [], 'bufferViews': [], 'accessors': []}
binary = bytearray(); parts = []; assembly_triangles = []

def attribute(values):
    offset = len(binary)
    binary.extend(struct.pack(f'<{len(values)}f', *values))
    view = len(gltf['bufferViews'])
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(values)*4, 'target': 34962})
    idx = len(gltf['accessors'])
    gltf['accessors'].append({'bufferView': view, 'componentType': 5126, 'count': len(values)//3, 'type': 'VEC3',
                             'min': [min(values[j::3]) for j in range(3)], 'max': [max(values[j::3]) for j in range(3)]})
    return idx

for index, (name, color) in enumerate([('body', [0.016, 0.27, 0.25, 1]), ('lid', [0.72, 0.18, 0.05, 1])]):
    raw = (root / f'{name}.stl').read_bytes(); count = struct.unpack_from('<I', raw, 80)[0]
    positions, normals = [], []
    for i in range(count):
        triangle = list(struct.unpack_from('<12fH', raw, 84+50*i))
        if name == 'lid':
            triangle[1] *= -1; triangle[2] *= -1
            for j in (3, 6, 9):
                triangle[j+1] = width-triangle[j+1]
                triangle[j+2] = top-triangle[j+2]
        positions.extend(triangle[3:12]); normals.extend(triangle[:3]*3)
        assembly_triangles.append(struct.pack('<12fH', *triangle))
    position_idx, normal_idx = attribute(positions), attribute(normals)
    gltf['materials'].append({'name': f'Case {name}', 'pbrMetallicRoughness': {'baseColorFactor': color, 'metallicFactor': 0, 'roughnessFactor': 0.65}, 'doubleSided': True})
    gltf['nodes'].append({'name': f'solid_{index:03d}', 'mesh': index})
    gltf['meshes'].append({'name': f'Case {name}', 'primitives': [{'attributes': {'POSITION': position_idx, 'NORMAL': normal_idx}, 'material': index}]})
    metrics = validation['parts'][name]
    parts.append({'node': f'solid_{index:03d}', 'name': f'Case {name}', 'role': f'case-{name}',
                  'vol_cm3': round(metrics['cad_volume_mm3']/1000, 4), 'bbox_mm': [round(v, 4) for v in metrics['bbox_mm']],
                  'faces': len(re.findall(r'=\s*ADVANCED_FACE\(', (root / f'{name}.step').read_text())), 'dropped_from_glb': False})

gltf['buffers'] = [{'byteLength': len(binary)}]
encoded = json.dumps(gltf, separators=(',', ':')).encode(); encoded += b' ' * (-len(encoded) % 4)
binary.extend(b'\0' * (-len(binary) % 4))
glb = struct.pack('<III', 0x46546C67, 2, 12+8+len(encoded)+8+len(binary))
glb += struct.pack('<II', len(encoded), 0x4E4F534A)+encoded+struct.pack('<II', len(binary), 0x004E4942)+binary
out = root / 'viewer'; out.mkdir(exist_ok=True)
(out / 'xiao-bench-case.glb').write_bytes(glb)
(out / 'xiao-bench-case.parts.json').write_text(json.dumps(parts, indent=2)+'\n')
(out / 'xiao-bench-case.stl').write_bytes(b'XIAO seated assembly reference; use body/lid STLs to print'.ljust(80,b'\0')+struct.pack('<I',len(assembly_triangles))+b''.join(assembly_triangles))
if args.publish:
    public = root.parents[1] / 'web' / 'public' / 'accessories'
    public.mkdir(exist_ok=True)
    for file in out.iterdir():
        shutil.copy2(file, public / file.name)
    shutil.copy2(root / 'assembly.step', public / 'xiao-bench-case.step')
print('Exported two named Explorer meshes, part metadata, and assembly reference.')
