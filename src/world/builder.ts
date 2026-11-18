import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Colliders } from './colliders';

export interface BoxOpts {
  /** Adds a collider (default true). */
  solid?: boolean;
  /** Collider also blocks the camera (default true). */
  cam?: boolean;
  /** Puts the part in a named group that can be hidden, such as a roof. */
  group?: string;
}

/**
 * Collects static scenery as vertex-colored geometry and merges it into a few meshes,
 * so the whole world draws in a handful of draw calls on iPad.
 */
export class StaticBuilder {
  private parts = new Map<string, THREE.BufferGeometry[]>();
  private color = new THREE.Color();
  /** Raises everything built next by this many meters (an upstairs floor). */
  oy = 0;
  /** Group for parts built next that don't name one. */
  group = 'main';

  constructor(readonly colliders: Colliders) {}

  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: THREE.ColorRepresentation, opts: BoxOpts = {}) {
    const w = Math.abs(x1 - x0);
    const hgt = Math.abs(y1 - y0);
    const d = Math.abs(z1 - z0);
    const g = new THREE.BoxGeometry(w, hgt, d);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(g, color, opts.group);
    if (opts.solid !== false) this.colliders.add(x0, y0 + this.oy, z0, x1, y1 + this.oy, z1, opts.cam ?? true);
  }

  /** Adds any geometry that is already positioned in world space. */
  add(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, group = this.group) {
    const geo = g.index ? g.toNonIndexed() : g;
    if (this.oy) geo.translate(0, this.oy, 0);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    this.color.set(color);
    const n = geo.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      c[i * 3] = this.color.r;
      c[i * 3 + 1] = this.color.g;
      c[i * 3 + 2] = this.color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    let list = this.parts.get(group);
    if (!list) this.parts.set(group, (list = []));
    list.push(geo);
  }

  /** Shape helpers that place a primitive at a point. */
  cylinder(x: number, y0: number, z: number, r: number, h: number, color: THREE.ColorRepresentation, seg = 10, solid = true, group?: string) {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    g.translate(x, y0 + h / 2, z);
    this.add(g, color, group);
    if (solid) this.colliders.add(x - r * 0.8, y0 + this.oy, z - r * 0.8, x + r * 0.8, y0 + h + this.oy, z + r * 0.8, true);
  }

  /** A wall along X at depth z, with door gaps given as [centerX, width]. */
  wallX(z: number, x0: number, x1: number, h: number, color: THREE.ColorRepresentation, doors: [number, number][] = [], t = 0.2, doorH = 2.4) {
    const cuts = doors.map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]);
    let x = x0;
    for (const [a, b] of cuts) {
      if (a > x) this.box(x, 0, z - t / 2, a, h, z + t / 2, color);
      this.box(a, doorH, z - t / 2, b, h, z + t / 2, color, { solid: true });
      x = b;
    }
    if (x < x1) this.box(x, 0, z - t / 2, x1, h, z + t / 2, color);
  }

  /** A wall along Z at x, with door gaps given as [centerZ, width]. */
  wallZ(x: number, z0: number, z1: number, h: number, color: THREE.ColorRepresentation, doors: [number, number][] = [], t = 0.2, doorH = 2.4) {
    const cuts = doors.map(([c, w]) => [c - w / 2, c + w / 2]).sort((a, b) => a[0] - b[0]);
    let z = z0;
    for (const [a, b] of cuts) {
      if (a > z) this.box(x - t / 2, 0, z, x + t / 2, h, a, color);
      this.box(x - t / 2, doorH, a, x + t / 2, h, b, color);
      z = b;
    }
    if (z < z1) this.box(x - t / 2, 0, z, x + t / 2, h, z1, color);
  }

  build(material: THREE.Material): Map<string, THREE.Mesh> {
    const out = new Map<string, THREE.Mesh>();
    for (const [name, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = name;
      mesh.matrixAutoUpdate = false;
      out.set(name, mesh);
      list.forEach((g) => g.dispose());
    }
    this.parts.clear();
    return out;
  }
}

/** A plane with text drawn on a canvas, for signs and whiteboards. */
export function textPlane(lines: string[], w: number, h: number, opts: { bg?: string; fg?: string; font?: number; px?: number } = {}) {
  const px = opts.px ?? 128;
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * px);
  cv.height = Math.round(h * px);
  const g = cv.getContext('2d')!;
  g.fillStyle = opts.bg ?? '#ffffff';
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = opts.fg ?? '#1d2433';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const fs = (opts.font ?? 0.25) * px;
  g.font = `bold ${fs}px -apple-system, Helvetica, Arial, sans-serif`;
  lines.forEach((l, i) => g.fillText(l, cv.width / 2, cv.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.2));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}
