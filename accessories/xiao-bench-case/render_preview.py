"""Render the actual exported STL triangles; requires matplotlib and numpy."""
from pathlib import Path
import struct
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import to_rgb
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

root = Path(__file__).resolve().parent
fig = plt.figure(figsize=(12, 6), facecolor='#f7f8fa')
light = np.array([-0.4, -0.5, 1.0]); light /= np.linalg.norm(light)
for i, (name, color, subtitle) in enumerate([
    ('body', '#248e88', '31.3 × 26.6 × 10.9 mm'),
    ('lid', '#dc7640', 'Locating lip faces up for printing'),
]):
    raw = (root / f'{name}.stl').read_bytes()
    count = struct.unpack_from('<I', raw, 80)[0]
    triangles = np.array([struct.unpack_from('<12fH', raw, 84+j*50)[3:12] for j in range(count)]).reshape((-1,3,3))
    normals = np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
    normals /= np.linalg.norm(normals,axis=1)[:,None]
    elev, azim = np.radians([38, -58])
    camera = np.array([np.cos(elev)*np.cos(azim), np.cos(elev)*np.sin(azim), np.sin(elev)])
    visible = normals @ camera > 1e-8
    triangles, normals = triangles[visible], normals[visible]
    brightness = 0.62 + 0.38 * np.maximum(normals @ light, 0)
    colors = np.clip(np.array(to_rgb(color))[None,:]*brightness[:,None],0,1)
    ax = fig.add_subplot(1,2,i+1,projection='3d', facecolor='#f7f8fa')
    ax.add_collection3d(Poly3DCollection(triangles,facecolors=colors,edgecolors='none',linewidths=0))
    ax.set_xlim(-2,34); ax.set_ylim(-2,29); ax.set_zlim(0,18)
    ax.set_box_aspect((36,31,18)); ax.set_proj_type('ortho'); ax.view_init(elev=38,azim=-58)
    ax.set_axis_off(); ax.set_title(f'{name.upper()}\n{subtitle}',fontsize=12,color='#25333f',pad=0)
fig.suptitle('XIAO / BENCH-STORAGE CASE',x=0.075,y=0.96,ha='left',fontsize=21,fontweight='bold',color='#18242d')
fig.text(0.075,0.04,'Actual STL geometry • millimetres • fit-test prototype • physical fit not yet verified',fontsize=11,color='#4a5661')
fig.subplots_adjust(left=0.02,right=0.98,bottom=0.10,top=0.84,wspace=0.03)
fig.savefig(root/'preview.png',dpi=160,facecolor=fig.get_facecolor())
