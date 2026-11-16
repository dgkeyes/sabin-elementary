import * as THREE from 'three';
import { clamp } from '../util/math';

/** Axis-aligned solid box. `cam` boxes also block the camera and line-of-sight checks. */
export interface Box {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
  cam: boolean;
  stamp: number;
}

const CELL = 8;
const key = (ix: number, iz: number) => (ix + 2000) * 8192 + (iz + 2000);

/** All static collision in the world, bucketed in a grid so lookups stay cheap. */
export class Colliders {
  readonly boxes: Box[] = [];
  private grid = new Map<number, Box[]>();
  private stamp = 0;
  private tmp: Box[] = [];

  add(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, cam = true): Box {
    const b: Box = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), cam, stamp: 0 };
    this.boxes.push(b);
    for (let ix = Math.floor(b.x0 / CELL); ix <= Math.floor(b.x1 / CELL); ix++)
      for (let iz = Math.floor(b.z0 / CELL); iz <= Math.floor(b.z1 / CELL); iz++) {
        const k = key(ix, iz);
        let list = this.grid.get(k);
        if (!list) this.grid.set(k, (list = []));
        list.push(b);
      }
    return b;
  }

  near(x0: number, z0: number, x1: number, z1: number, out: Box[]) {
    this.stamp++;
    for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++)
      for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
        const list = this.grid.get(key(ix, iz));
        if (!list) continue;
        for (const b of list)
          if (b.stamp !== this.stamp) {
            b.stamp = this.stamp;
            out.push(b);
          }
      }
    return out;
  }

  /**
   * Pushes a standing cylinder (feet at p.y) out of solid boxes and returns the ground height under it.
   * Boxes whose top is within `step` of the feet count as floor, so curbs and steps can be walked onto.
   */
  collide(p: THREE.Vector3, r: number, h: number, step: number): number {
    const list = this.tmp;
    list.length = 0;
    this.near(p.x - r - 1, p.z - r - 1, p.x + r + 1, p.z + r + 1, list);
    let ground = 0;
    for (const b of list) {
      if (b.y1 <= p.y + step) {
        const m = r * 0.4;
        if (p.x > b.x0 - m && p.x < b.x1 + m && p.z > b.z0 - m && p.z < b.z1 + m) ground = Math.max(ground, b.y1);
        continue;
      }
      if (b.y0 >= p.y + h) continue;
      const cx = clamp(p.x, b.x0, b.x1);
      const cz = clamp(p.z, b.z0, b.z1);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        const pen = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z];
        const i = pen.indexOf(Math.min(...pen));
        if (i === 0) p.x = b.x0 - r;
        else if (i === 1) p.x = b.x1 + r;
        else if (i === 2) p.z = b.z0 - r;
        else p.z = b.z1 + r;
      }
    }
    return ground;
  }

  /** Distance along a normalized ray to the first camera-blocking box, or `max`. */
  raycast(o: THREE.Vector3, d: THREE.Vector3, max: number): number {
    const list = this.tmp;
    list.length = 0;
    const ex = o.x + d.x * max;
    const ez = o.z + d.z * max;
    this.near(Math.min(o.x, ex), Math.min(o.z, ez), Math.max(o.x, ex), Math.max(o.z, ez), list);
    let best = max;
    for (const b of list) {
      if (!b.cam) continue;
      let t0 = 0;
      let t1 = best;
      let ok = true;
      for (let a = 0; a < 3 && ok; a++) {
        const oa = a === 0 ? o.x : a === 1 ? o.y : o.z;
        const da = a === 0 ? d.x : a === 1 ? d.y : d.z;
        const lo = a === 0 ? b.x0 : a === 1 ? b.y0 : b.z0;
        const hi = a === 0 ? b.x1 : a === 1 ? b.y1 : b.z1;
        if (Math.abs(da) < 1e-9) {
          if (oa < lo || oa > hi) ok = false;
        } else {
          let ta = (lo - oa) / da;
          let tb = (hi - oa) / da;
          if (ta > tb) [ta, tb] = [tb, ta];
          t0 = Math.max(t0, ta);
          t1 = Math.min(t1, tb);
          if (t0 > t1) ok = false;
        }
      }
      if (ok && t0 < best) best = t0;
    }
    return best;
  }

  /** True when nothing camera-blocking lies between two points. */
  clearLine(a: THREE.Vector3, b: THREE.Vector3) {
    const d = _d.subVectors(b, a);
    const len = d.length();
    if (len < 1e-4) return true;
    d.divideScalar(len);
    return this.raycast(a, d, len) >= len - 1e-3;
  }
}
const _d = new THREE.Vector3();
