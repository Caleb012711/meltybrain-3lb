import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const canvas = document.getElementById('hero3d');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 2, 0.1, 100);
camera.position.set(4.2, 3.0, 5.2);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe7f5, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(5,8,4); scene.add(sun);
const grid = new THREE.GridHelper(12, 24, 0xcbd5e1, 0xe4e7ec); grid.position.y = -1.2; scene.add(grid);

const bot = new THREE.Group(); scene.add(bot);
const steel = new THREE.MeshStandardMaterial({color:0x98a2b3, metalness:.9, roughness:.32});
const darkSteel = new THREE.MeshStandardMaterial({color:0x475467, metalness:.85, roughness:.4});
const tpu = new THREE.MeshStandardMaterial({color:0x175cd3, metalness:.05, roughness:.8});
const ti = new THREE.MeshStandardMaterial({color:0xd0d5dd, metalness:1, roughness:.25});
const ledG = new THREE.MeshBasicMaterial({color:0x12b76a});
const ledR = new THREE.MeshBasicMaterial({color:0xf04438});

// weapon ring (torus) + 2 teeth
const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.22, 18, 90), steel); ring.rotation.x = Math.PI/2; bot.add(ring);
for (const a of [0, Math.PI]) {
  const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.35), darkSteel);
  tooth.position.set(Math.cos(a)*2.0, 0, Math.sin(a)*2.0); tooth.rotation.y = -a; bot.add(tooth);
}
// TPU shell
const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.7, 40), tpu); shell.position.y = 0.1; bot.add(shell);
const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.08, 40), ti); plate.position.y = 0.5; bot.add(plate);
// hubmotor pods
for (const s of [-1, 1]) {
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24), ti);
  wheel.rotation.z = Math.PI/2; wheel.position.set(s*1.15, -0.35, 0); bot.add(wheel);
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 28), darkSteel);
  tire.rotation.y = Math.PI/2; tire.position.copy(wheel.position); bot.add(tire);
}
// heading LEDs
const led1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), ledG); led1.position.set(0, 0.35, 1.32); bot.add(led1);
const led2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), ledR); led2.position.set(0, 0.35, -1.32); bot.add(led2);

let spinning = true, exploded = false;
document.getElementById('spinBtn').onclick = e => { spinning = !spinning; e.target.textContent = spinning ? '⏸ pause spin' : '▶ spin'; };
document.getElementById('explodeBtn').onclick = e => {
  exploded = !exploded; e.target.textContent = exploded ? 'Assemble' : 'Explode';
  ring.position.y = exploded ? 1.2 : 0; shell.position.y = exploded ? -0.4 : 0.1; plate.position.y = exploded ? 0.7 : 0.5;
};

// STL upload preview
const loader = new STLLoader();
document.getElementById('stlFile').addEventListener('change', ev => {
  const f = ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const geo = loader.parse(r.result);
    geo.computeVertexNormals(); geo.center();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color:0x12b76a, roughness:.6}));
    m.scale.setScalar(0.05); m.position.y = 1.8; m.rotation.x = -Math.PI/2;
    scene.add(m);
  };
  r.readAsArrayBuffer(f);
});

function resize(){ const w = canvas.clientWidth || 600, h = 440; renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize); resize();
(function tick(t){
  requestAnimationFrame(tick);
  if (spinning) bot.rotation.y += 0.035;
  led1.material = (Math.sin(Date.now()/180) > 0) ? ledG : ledR; // blink = heading beacon demo
  controls.update(); renderer.render(scene, camera);
})();
