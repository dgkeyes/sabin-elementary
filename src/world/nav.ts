import * as THREE from 'three';
import type { Colliders } from './colliders';

const EYE = 0.6;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _side = new THREE.Vector3();

/**
 * A small waypoint graph for NPC walking and the player's guide arrow.
 * Two points are linked when a person-wide line between them is clear of walls.
 */
export class Nav {
  readonly nodes: THREE.Vector3[];
  private links: number[][];

  constructor(points: [number, number][], private colliders: Colliders) {
    this.nodes = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.links = this.nodes.map(() => []);
    for (let i = 0; i < this.nodes.length; i++)
      for (let j = i + 1; j < this.nodes.length; j++)
        if (this.nodes[i].distanceTo(this.nodes[j]) < 60 && this.clear(this.nodes[i], this.nodes[j])) {
          this.links[i].push(j);
          this.links[j].push(i);
        }
  }

  /** True when a person can walk straight from a to b. */
  clear(a: THREE.Vector3, b: THREE.Vector3, width = 0.25) {
    _side.set(b.z - a.z, 0, a.x - b.x);
    const len = _side.length();
    if (len < 1e-4) return true;
    _side.multiplyScalar(width / len);
    for (const s of [0, 1, -1]) {
      _a.set(a.x + _side.x * s, EYE, a.z + _side.z * s);
      _b.set(b.x + _side.x * s, EYE, b.z + _side.z * s);
      if (!this.colliders.clearLine(_a, _b)) return false;
    }
    return true;
  }

  /** Waypoints from `from` to `to`, ending at `to`. */
  path(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    if (this.clear(from, to)) return [to.clone()];
    const n = this.nodes.length;
    const START = n;
    const GOAL = n + 1;
    const visible = (p: THREE.Vector3) => {
      const list: number[] = [];
      for (let i = 0; i < n; i++) if (this.nodes[i].distanceToSquared(p) < 3600 && this.clear(p, this.nodes[i], 0.1)) list.push(i);
      if (!list.length) {
        let best = 0;
        for (let i = 1; i < n; i++) if (this.nodes[i].distanceToSquared(p) < this.nodes[best].distanceToSquared(p)) best = i;
        list.push(best);
      }
      return list;
    };
    const fromLinks = visible(from);
    const toLinks = new Set(visible(to));
    const pos = (i: number) => (i === START ? from : i === GOAL ? to : this.nodes[i]);
    const dist = new Float64Array(n + 2).fill(Infinity);
    const prev = new Int32Array(n + 2).fill(-1);
    const done = new Uint8Array(n + 2);
    dist[START] = 0;
    for (;;) {
      let u = -1;
      for (let i = 0; i < n + 2; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || u === GOAL) break;
      done[u] = 1;
      const nbrs = u === START ? fromLinks : u === GOAL ? [] : [...this.links[u], ...(toLinks.has(u) ? [GOAL] : [])];
      for (const v of nbrs) {
        const d = dist[u] + pos(u).distanceTo(pos(v));
        if (d < dist[v]) {
          dist[v] = d;
          prev[v] = u;
        }
      }
    }
    if (prev[GOAL] < 0) return [to.clone()];
    const out: THREE.Vector3[] = [];
    for (let i = GOAL; i !== START && i >= 0; i = prev[i]) out.push(pos(i).clone());
    return out.reverse();
  }
}
