import * as THREE from 'three';
import { solid } from '../characters/accessories';

/** A plate (or tray) with a few blobs of food on it, colored by the meal. */
export function foodPlate(colors: string[], tray = false): THREE.Object3D {
  const g = new THREE.Group();
  if (tray) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.3), solid('#cbd5e0'));
    g.add(t);
  } else {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.02, 18), solid('#ffffff', { rough: 0.4 }));
    g.add(p);
  }
  const offsets: [number, number][] = tray ? [[-0.1, -0.05], [0.08, -0.06], [0.1, 0.07], [-0.12, 0.08]] : [[-0.04, 0], [0.05, 0.03], [0.03, -0.06]];
  colors.forEach((c, i) => {
    const o = offsets[i % offsets.length];
    if (tray && i === 3) {
      const carton = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), solid(c));
      carton.position.set(o[0], 0.06, o[1]);
      g.add(carton);
      return;
    }
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 6), solid(c));
    blob.scale.set(1.2, 0.5, 1);
    blob.position.set(o[0], 0.025, o[1]);
    g.add(blob);
  });
  return g;
}

/** Bright orange practice cone. */
export function cone(): THREE.Mesh {
  const m = new THREE.Mesh(coneGeo, solid('#f97316', { rough: 0.6 }));
  return m;
}
const coneGeo = (() => {
  const g = new THREE.ConeGeometry(0.16, 0.4, 12);
  g.translate(0, 0.2, 0);
  return g;
})();

/** Soccer ball (also used as a kickball, just recolored). */
export function ballMesh(color = '#ffffff', radius = 0.11): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(color);
  const dark = new THREE.Color('#1a202c');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    // color whole triangles: patches near the 12 original vertices are dark
    v.fromBufferAttribute(pos, i).add(v.clone().fromBufferAttribute(pos, i + 1)).add(v.clone().fromBufferAttribute(pos, i + 2)).normalize();
    const patch = Math.abs(v.x) > 0.85 || Math.abs(v.y) > 0.85 || Math.abs(v.z) > 0.85;
    const c = color === '#ffffff' && patch ? dark : base;
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}
