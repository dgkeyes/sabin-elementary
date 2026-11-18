import * as THREE from 'three';
import { StaticBuilder, textPlane } from './builder';
import { Colliders } from './colliders';
import { Nav } from './nav';
import { BEDROOM_DOOR, NAV_POINTS, STAIR_BOTTOM, STAIRWELL, UPSTAIRS } from './places';

export interface Spot {
  pos: THREE.Vector3;
  /** Facing direction: (sin yaw, cos yaw). */
  yaw: number;
}
export interface Seat extends Spot {
  group: string;
  taken: object | null;
  /** Where food or books go on the table in front of the seat. */
  table: THREE.Vector3;
}

const COL = {
  grass: '#6fae4f',
  grass2: '#64a046',
  path: '#d9d4c7',
  road: '#4a4f57',
  roadLine: '#f2d14b',
  brick: '#b5523b',
  trim: '#efe6d4',
  wallIn: '#f3ead8',
  floorSchool: '#d6cfc0',
  roof: '#5a6170',
  wood: '#a8794e',
  woodDark: '#7a5534',
  desk: '#c9a46b',
  chair: '#3a7bd5',
  white: '#f7f7f2',
  window: '#9ccfe8',
  fence: '#8d9399',
  chips: '#b08a5a',
  dirt: '#c8925c',
  line: '#ffffff',
  houseA: '#8fa9c1',
  houseRoof: '#6b4f3f',
  homeIn: '#f5efe3',
  carpet: '#b7a6d6',
  tile: '#e8e2d5',
  green: '#00704a',
};

/** The whole static world: neighborhood, home, Starbucks, and Sabin Elementary. */
export class World {
  readonly root = new THREE.Group();
  readonly colliders = new Colliders();
  readonly seats = new Map<string, Seat[]>();
  readonly spots = new Map<string, Spot>();
  readonly roofs = new Map<string, THREE.Object3D>();
  /** Upstairs floors by building, hidden while you are downstairs inside. */
  readonly uppers = new Map<string, THREE.Object3D>();
  readonly nav: Nav;
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private b: StaticBuilder;
  private signs: THREE.Object3D[] = [];

  constructor() {
    this.b = new StaticBuilder(this.colliders);
    this.ground();
    this.street();
    this.home();
    this.neighborhood();
    this.starbucks();
    this.school();
    this.playground();
    this.field();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const [name, mesh] of this.b.build(mat)) {
      this.root.add(mesh);
      if (name.startsWith('roof:')) this.roofs.set(name.slice(5), mesh);
      if (name.startsWith('upper:')) this.uppers.set(name.slice(6), mesh);
    }
    for (const s of this.signs) {
      s.updateMatrix();
      s.matrixAutoUpdate = false;
      this.root.add(s);
    }
    this.nav = new Nav(NAV_POINTS, this.colliders);

    this.hemi = new THREE.HemisphereLight('#dfefff', '#6b7a55', 1.6);
    this.sun = new THREE.DirectionalLight('#fff4e0', 1.9);
    this.sun.position.set(30, 60, 20);
    this.root.add(this.hemi, this.sun);
  }

  spot(name: string) {
    const s = this.spots.get(name);
    if (!s) throw new Error('missing spot ' + name);
    return s;
  }

  /** Lights and sky follow the clock: morning, day, sunset, night. */
  setTimeOfDay(min: number, scene: THREE.Scene) {
    const h = min / 60;
    const keys: [number, string, number, number][] = [
      // hour, sky, sun, hemi
      [6, '#f3c9a0', 1.1, 1.2],
      [9, '#9fd0f5', 1.9, 1.6],
      [16, '#9fd0f5', 1.9, 1.6],
      [18.5, '#f0a36b', 1.2, 1.3],
      [20, '#2b3a66', 0.35, 0.9],
      [24, '#0d1530', 0.15, 0.75],
    ];
    let i = 0;
    while (i < keys.length - 2 && h > keys[i + 1][0]) i++;
    const [h0, s0, a0, b0] = keys[i];
    const [h1, s1, a1, b1] = keys[i + 1];
    const t = THREE.MathUtils.clamp((h - h0) / (h1 - h0), 0, 1);
    const sky = new THREE.Color(s0).lerp(new THREE.Color(s1), t);
    (scene.background as THREE.Color).copy(sky);
    scene.fog?.color.copy(sky);
    this.sun.intensity = THREE.MathUtils.lerp(a0, a1, t);
    this.hemi.intensity = THREE.MathUtils.lerp(b0, b1, t);
  }

  // ---------------------------------------------------------------- helpers

  private sign(lines: string[], w: number, h: number, x: number, y: number, z: number, rotY: number, opts?: Parameters<typeof textPlane>[3]) {
    const m = textPlane(lines, w, h, opts);
    m.position.set(x, y, z);
    m.rotation.y = rotY;
    this.signs.push(m);
    return m;
  }

  private seat(group: string, x: number, z: number, yaw: number, tableDist = 0.5, tableH = 0.66) {
    let list = this.seats.get(group);
    if (!list) this.seats.set(group, (list = []));
    const y = this.b.oy;
    const s: Seat = {
      group,
      pos: new THREE.Vector3(x, y, z),
      yaw,
      taken: null,
      table: new THREE.Vector3(x + Math.sin(yaw) * tableDist, y + tableH, z + Math.cos(yaw) * tableDist),
    };
    list.push(s);
    return s;
  }

  private setSpot(name: string, x: number, z: number, yaw: number) {
    this.spots.set(name, { pos: new THREE.Vector3(x, this.b.oy, z), yaw });
  }

  private chair(x: number, z: number, yaw: number, color: string = COL.chair) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.4));
    seat.position.set(0, 0.36, 0);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.05));
    back.position.set(0, 0.6, -0.2);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.3));
    leg.position.set(0, 0.17, 0);
    g.add(seat, back, leg);
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.updateMatrixWorld(true);
    for (const m of g.children as THREE.Mesh[]) this.b.add(m.geometry.clone().applyMatrix4(m.matrixWorld), m === leg ? '#5c6470' : color);
  }

  /** Gable roof over a rectangle, ridge along the longer side. */
  private gable(x0: number, x1: number, z0: number, z1: number, y: number, h: number, color: string, group: string, overhang = 0.4) {
    x0 -= overhang;
    x1 += overhang;
    z0 -= overhang;
    z1 += overhang;
    const alongX = x1 - x0 >= z1 - z0;
    const pts: number[][] = [];
    if (alongX) {
      const zm = (z0 + z1) / 2;
      const [A, B, C, D, E, F] = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [x0, y + h, zm], [x1, y + h, zm]];
      pts.push(A, E, F, A, F, B, D, C, F, D, F, E, A, D, E, B, F, C);
    } else {
      const xm = (x0 + x1) / 2;
      const [A, B, C, D, E, F] = [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0], [xm, y + h, z0], [xm, y + h, z1]];
      pts.push(A, E, F, A, F, B, D, C, F, D, F, E, A, D, E, B, F, C);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    orientOutward(geo, new THREE.Vector3((x0 + x1) / 2, y + h * 0.3, (z0 + z1) / 2));
    this.b.add(geo, color, group);
  }

  private tree(x: number, z: number, s = 1) {
    this.b.cylinder(x, 0, z, 0.22 * s, 2.2 * s, '#6b4a2f', 6, true);
    const c = new THREE.IcosahedronGeometry(1.6 * s, 0);
    c.translate(x, 3.1 * s, z);
    this.b.add(c, (Math.round(x * 7 + z * 3) & 1) ? '#3f8f3a' : '#4c9a3f');
    const c2 = new THREE.IcosahedronGeometry(1.1 * s, 0);
    c2.translate(x + 0.4 * s, 4.1 * s, z - 0.3 * s);
    this.b.add(c2, '#57a648');
  }

  private bush(x: number, z: number, s = 0.6) {
    const c = new THREE.IcosahedronGeometry(s, 0);
    c.scale(1.3, 0.8, 1);
    c.translate(x, s * 0.6, z);
    this.b.add(c, '#3d8a3a');
  }

  private windowX(z: number, x: number, y: number, w = 1.6, h = 1.2, out = 1) {
    this.b.box(x - w / 2, y, z, x + w / 2, y + h, z + 0.05 * out, COL.window, { solid: false });
    this.b.box(x - w / 2 - 0.08, y - 0.08, z, x + w / 2 + 0.08, y, z + 0.08 * out, COL.trim, { solid: false });
  }
  private windowZ(x: number, z: number, y: number, w = 1.6, h = 1.2, out = 1) {
    this.b.box(x, y, z - w / 2, x + 0.05 * out, y + h, z + w / 2, COL.window, { solid: false });
    this.b.box(x, y - 0.08, z - w / 2 - 0.08, x + 0.08 * out, y, z + w / 2 + 0.08, COL.trim, { solid: false });
  }

  // ---------------------------------------------------------------- areas

  private ground() {
    const g = new THREE.PlaneGeometry(420, 420);
    g.rotateX(-Math.PI / 2);
    this.b.add(g, COL.grass);
    // campus lawn slightly different green
    this.b.box(-50, 0, -64, 50, 0.005, 0, COL.grass2, { solid: false });
  }

  private street() {
    const b = this.b;
    // Maple Street
    b.box(-120, 0, 24, 120, 0.02, 32, COL.road, { solid: false });
    for (let x = -118; x < 120; x += 6) b.box(x, 0.02, 27.9, x + 3, 0.03, 28.1, COL.roadLine, { solid: false });
    // crosswalk
    for (let x = 1.2; x < 5; x += 0.9) b.box(x, 0.02, 24.2, x + 0.5, 0.03, 31.8, COL.white, { solid: false });
    // sidewalks along the street
    b.box(-120, 0, 21.8, 120, 0.06, 24, COL.path, { solid: false });
    b.box(-120, 0, 32, 120, 0.06, 34.2, COL.path, { solid: false });
    // path from home to the street and from the street to school
    b.box(1.8, 0, 34.2, 4.2, 0.06, 57.2, COL.path, { solid: false });
    b.box(1.8, 0, -8, 4.2, 0.06, 21.8, COL.path, { solid: false });
    // street lamps
    for (const x of [-40, -12, 12, 40]) {
      b.cylinder(x, 0, 22.4, 0.08, 4.2, '#555b63', 6, true);
      b.box(x - 0.25, 4.1, 22.2, x + 0.25, 4.3, 22.9, '#fff6c8', { solid: false });
    }
    // stop sign by the crosswalk
    b.cylinder(5, 0, 33.2, 0.05, 2.2, '#9aa0a6', 6, true);
    const oct = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 8);
    oct.rotateX(Math.PI / 2);
    oct.rotateZ(Math.PI / 8);
    oct.translate(5, 2.3, 33.2);
    b.add(oct, '#d32f2f');
    this.sign(['MAPLE ST'], 2, 0.35, 3, 2.9, 33.0, 0, { bg: '#2f7d32', fg: '#ffffff', font: 0.24 });
  }

  /**
   * Your two-story house. Downstairs: kitchen, dining area, living room, and stairs.
   * Upstairs (group upper:home, hidden while you are downstairs): your bedroom, a bathroom,
   * your parents' room, and the hall. The roof hides while you are inside.
   */
  private home() {
    const b = this.b;
    const U = UPSTAIRS;
    const H2 = 2.8; // upstairs wall height
    const [X0, X1, Z0, Z1] = [-9, 9, 58, 74];
    const [SX0, SX1, SZ0, SZ1] = STAIRWELL;

    // ---------- downstairs
    b.box(X0, 0, Z0, X1, 0.04, 66, COL.tile, { solid: false });
    b.box(X0, 0, 66, X1, 0.04, Z1, '#b98d5f', { solid: false });
    // exterior walls, downstairs half: outside siding, inside paint
    const shell = (h: number, front: [number, number][]) => {
      b.wallX(Z0 - 0.06, X0 - 0.1, X1 + 0.1, h, COL.houseA, front, 0.12, 2.2);
      b.wallX(Z0 + 0.06, X0, X1, h, COL.homeIn, front, 0.12, 2.2);
      b.wallX(Z1 + 0.06, X0 - 0.1, X1 + 0.1, h, COL.houseA, [], 0.12);
      b.wallX(Z1 - 0.06, X0, X1, h, COL.homeIn, [], 0.12);
      b.wallZ(X0 - 0.06, Z0, Z1, h, COL.houseA, [], 0.12);
      b.wallZ(X0 + 0.06, Z0, Z1, h, COL.homeIn, [], 0.12);
      b.wallZ(X1 + 0.06, Z0, Z1, h, COL.houseA, [], 0.12);
      b.wallZ(X1 - 0.06, Z0, Z1, h, COL.homeIn, [], 0.12);
    };
    shell(U, [[3, 1.4]]);
    for (const x of [-5.5, 6.5]) this.windowX(Z0 - 0.12, x, 1.2, 1.6, 1.0, -1);
    for (const x of [-5, 4]) this.windowX(Z1 + 0.12, x, 1.0, 1.6, 1.0, 1);
    this.windowZ(X0 - 0.12, 69, 1.0, 1.6, 1.0, -1);
    this.windowZ(X1 + 0.12, 69.7, 1.0, 1.6, 1.0, 1);
    // front door frame, step, and sign
    b.box(2.1, 0, Z0 - 0.8, 3.9, 0.15, Z0 - 0.12, '#9a9a9a', { solid: false });
    b.box(2.2, 2.2, Z0 - 0.16, 3.8, 2.35, Z0 - 0.1, COL.trim, { solid: false });
    this.sign(['HOME'], 1.0, 0.3, 3, 2.6, Z0 - 0.2, Math.PI, { bg: '#ffffff', fg: '#3b4a5a', font: 0.22 });
    // band between the floors, outside
    b.box(X0 - 0.15, U - 0.1, Z0 - 0.15, X1 + 0.15, U + 0.05, Z0 - 0.1, COL.trim, { solid: false });
    b.box(X0 - 0.15, U - 0.1, Z1 + 0.1, X1 + 0.15, U + 0.05, Z1 + 0.15, COL.trim, { solid: false });

    // stairs along the east wall: start by the living room and climb toward the front
    const steps = 14; // short steps (22 cm) so walking up never catches on one
    const run = (SZ1 - SZ0) / steps;
    for (let i = 1; i <= steps; i++) b.box(SX0 + 0.1, 0, SZ1 - run * i, SX1 - 0.1, (U / steps) * i, SZ1 - run * (i - 1), i % 2 ? '#a0714a' : '#8d6240', { cam: false });
    b.box(SX0 - 0.02, 0, SZ0, SX0 + 0.1, U, SZ1, COL.homeIn, { cam: false }); // wall under the stairs' open side
    this.setSpot('stairsBottom', STAIR_BOTTOM[0], STAIR_BOTTOM[1], Math.PI);

    // kitchen (front left)
    b.box(X0, 0, Z0 + 0.1, -2, 0.9, Z0 + 0.75, '#f5f5f5', { cam: false }); // counters on the front wall
    b.box(X0, 0.9, Z0 + 0.1, -2, 0.95, Z0 + 0.8, '#4a5568', { solid: false });
    b.box(X0 + 0.05, 0, Z0 + 0.8, X0 + 0.7, 0.9, 62.2, '#f5f5f5', { cam: false }); // counters on the side wall
    b.box(X0 + 0.05, 0.9, Z0 + 0.8, X0 + 0.75, 0.95, 62.2, '#4a5568', { solid: false });
    b.box(X0 + 0.1, 0.95, 59.9, X0 + 0.65, 0.98, 60.8, '#1a202c', { solid: false }); // stove top
    b.box(X0 + 0.05, 0, 62.6, X0 + 0.8, 1.9, 63.7, '#e2e8f0', { cam: false }); // fridge
    this.setSpot('stove', -7.7, 60.35, -Math.PI / 2);
    this.setSpot('parent2', -1.2, 61.6, -Math.PI / 2);
    // kitchen table + chairs
    const [tx, tz] = [-4.5, 62.6];
    b.box(tx - 0.8, 0.7, tz - 0.5, tx + 0.8, 0.76, tz + 0.5, COL.wood, { cam: false });
    b.box(tx - 0.1, 0, tz - 0.1, tx + 0.1, 0.7, tz + 0.1, COL.woodDark, { solid: false });
    this.setSpot('table', tx, tz, 0);
    for (const [x, z, yaw] of [[tx - 0.4, tz - 1.05, 0], [tx + 0.4, tz - 1.05, 0], [tx - 0.4, tz + 1.05, Math.PI], [tx + 0.4, tz + 1.05, Math.PI]] as const) {
      this.chair(x, z, yaw, '#c0874f');
      this.seat('kitchen', x, z, yaw, 0.55, 0.77);
    }

    // dining nook / family area (back left)
    const rug0 = new THREE.CircleGeometry(1.6, 20);
    rug0.rotateX(-Math.PI / 2);
    rug0.translate(-5, 0.05, 70);
    b.add(rug0, '#d08b5b');
    b.box(X0 + 0.05, 0, 71, X0 + 0.6, 1.8, 73.4, COL.wood, { cam: false }); // bookshelf
    for (let i = 0; i < 4; i++) b.box(X0 + 0.1, 0.3 + i * 0.4, 71.1, X0 + 0.58, 0.33 + i * 0.4, 73.3, COL.woodDark, { solid: false });
    b.box(-6, 0, 73.2, -3.6, 1.0, 73.9, '#2d2d2d', { cam: false }); // piano
    b.box(-6, 1.0, 73.5, -3.6, 1.3, 73.9, '#2d2d2d', { solid: false });
    b.box(-5.9, 0.75, 73.0, -3.7, 0.8, 73.2, '#f7f7f7', { solid: false });

    // living room (back right)
    b.box(1.5, 0, 73.1, 4.7, 0.45, 73.95, '#4f6d8f', { cam: false });
    b.box(1.5, 0.45, 73.6, 4.7, 0.9, 73.95, '#4f6d8f', { solid: false });
    this.seat('couch', 2.3, 72.8, Math.PI, 0.5);
    this.seat('couch', 3.9, 72.8, Math.PI, 0.5);
    b.box(2.2, 0, 70.2, 4, 0.42, 71, COL.wood, { cam: false }); // coffee table
    b.box(8.2, 0, 68.4, 8.9, 0.6, 71, COL.woodDark, { cam: false }); // tv stand
    b.box(8.6, 0.6, 68.6, 8.75, 1.5, 70.8, '#111111', { solid: false });
    const plant = new THREE.IcosahedronGeometry(0.4, 0);
    plant.translate(8.4, 0.8, 73.4);
    b.add(plant, '#3d8a3a');

    // ---------- upstairs
    b.oy = U;
    b.group = 'upper:home';
    // floor slab, with a hole over the stairs (cam: false so it never pulls the camera in)
    const slab = (x0: number, z0: number, x1: number, z1: number, color: string) => b.box(x0, -0.15, z0, x1, 0, z1, color, { cam: false });
    slab(X0, Z0, SX0, Z1, '#b98d5f');
    slab(SX0, Z0, X1, SZ0, '#b98d5f');
    slab(SX0, SZ1 + 0.05, X1, Z1, '#b98d5f');
    b.box(X0, 0, 64, 0, 0.02, Z1, COL.carpet, { solid: false }); // your bedroom carpet
    b.box(X0, 0, Z0, 0, 0.02, 64, '#dfe7ee', { solid: false }); // bathroom tile
    shell(H2, []);
    // railing around the stair hole
    b.box(SX0 - 0.05, 0, SZ0, SX0 + 0.05, 1.0, SZ1 + 0.05, COL.woodDark, { cam: false });
    b.box(SX0 - 0.05, 0, SZ1, X1, 1.0, SZ1 + 0.1, COL.woodDark, { cam: false });
    // rooms: bathroom (front left), your bedroom (back left), parents' room (back right), hall (front right)
    b.wallZ(0, Z0, Z1, H2, COL.homeIn, [[61, 1.2], [BEDROOM_DOOR[1], 1.4]], 0.14, 2.2);
    b.wallX(64, X0, 0, H2, COL.homeIn, [], 0.14);
    b.wallX(66, 0, X1, H2, COL.homeIn, [[3.5, 1.4]], 0.14, 2.2);
    for (const x of [-5, 4]) this.windowX(Z0 - 0.12, x, 1.0, 1.6, 1.0, -1);
    for (const x of [-5.5, 4]) this.windowX(Z1 + 0.12, x, 1.0, 1.6, 1.0, 1);
    this.windowZ(X0 - 0.12, 69, 1.0, 1.6, 1.0, -1);
    this.windowZ(X1 + 0.12, 70, 1.0, 1.6, 1.0, 1);

    // your bedroom
    b.box(X0 + 0.05, 0, 70.6, -6.6, 0.42, 72.4, '#f0f0f0', { cam: false }); // mattress
    b.box(-6.6, 0.3, 70.6, -6.55, 0.45, 72.4, '#6c63ff', { solid: false });
    b.box(-8.2, 0.42, 70.62, -6.6, 0.5, 72.38, '#6c63ff', { solid: false }); // blanket
    b.box(-8.9, 0.42, 70.9, -8.3, 0.55, 72.1, '#ffffff', { solid: false }); // pillow
    b.box(X0, 0, 70.5, X0 + 0.15, 1.0, 72.5, COL.woodDark, { cam: false }); // headboard
    this.setSpot('bed', -6.1, 71.5, -Math.PI / 2);
    // closet with mirror on the back wall
    b.box(-4.4, 0, Z1 - 0.7, -2.15, 2.2, Z1 - 0.1, '#ffffff', { cam: false });
    b.box(-3.3, 0.4, Z1 - 0.74, -3.25, 2.0, Z1 - 0.7, '#9aa5b1', { solid: false });
    b.box(-4.2, 0.5, Z1 - 0.74, -3.4, 1.9, Z1 - 0.7, '#cfe8f5', { solid: false });
    this.setSpot('closet', -3.3, 72.4, 0);
    this.setSpot('wake', -4.5, 69.2, Math.PI);
    this.setSpot('bedroomArt', -6.6, Z1 - 0.15, Math.PI);
    // homework desk
    b.box(X0 + 0.05, 0.62, 65, X0 + 0.7, 0.67, 66.3, COL.desk, { cam: false });
    b.box(X0 + 0.1, 0, 65.05, X0 + 0.6, 0.62, 65.15, COL.desk, { solid: false });
    b.box(X0 + 0.1, 0, 66.15, X0 + 0.6, 0.62, 66.25, COL.desk, { solid: false });
    b.box(X0 + 0.1, 0.67, 65.2, X0 + 0.4, 0.69, 65.6, '#e53e3e', { solid: false }); // book
    this.chair(-7.85, 65.65, -Math.PI / 2, '#e9a23b');
    this.seat('homework', -7.85, 65.65, -Math.PI / 2, 0.55, 0.68);
    // rug + bookshelf
    const rug = new THREE.CircleGeometry(1.3, 20);
    rug.rotateX(-Math.PI / 2);
    rug.translate(-4.5, 0.05, 69);
    b.add(rug, '#f6c445');
    b.box(-0.65, 0, 71.2, -0.15, 1.6, 72.4, COL.wood, { cam: false });
    for (let i = 0; i < 4; i++) b.box(-0.6, 0.3 + i * 0.36, 71.3, -0.17, 0.33 + i * 0.36, 72.3, COL.woodDark, { solid: false });
    // beanbag
    const bean = new THREE.SphereGeometry(0.55, 10, 8);
    bean.scale(1, 0.6, 1);
    bean.translate(-1.4, 0.3, 66.2);
    b.add(bean, '#e9608a');

    // bathroom
    b.box(X0 + 0.05, 0, Z0 + 0.1, -7, 0.55, 60, '#ffffff', { cam: false }); // tub
    b.box(X0 + 0.25, 0.4, Z0 + 0.3, -7.2, 0.56, 59.8, '#9fd3ec', { solid: false });
    b.box(-4.2, 0, Z0 + 0.1, -3.2, 0.85, Z0 + 0.6, '#ffffff', { cam: false }); // sink
    b.box(-4.1, 1.2, Z0 + 0.06, -3.3, 1.9, Z0 + 0.1, '#cfe8f5', { solid: false }); // mirror
    b.box(-2.2, 0, Z0 + 0.1, -1.6, 0.45, Z0 + 0.8, '#ffffff', { cam: false }); // toilet

    // parents' room
    b.box(2.5, 0, 71.7, 5.5, 0.5, Z1 - 0.05, '#f0f0f0', { cam: false });
    b.box(2.5, 0.5, 71.7, 5.5, 0.58, 73.2, '#2f855a', { solid: false });
    b.box(2.4, 0, Z1 - 0.2, 5.6, 1.2, Z1 - 0.05, COL.woodDark, { cam: false });
    b.box(7.6, 0, 67, 8.9, 1.1, 68.6, COL.wood, { cam: false }); // dresser
    // hall: a plant at the top of the stairs
    const plant2 = new THREE.IcosahedronGeometry(0.35, 0);
    plant2.translate(0.6, 0.7, 58.6);
    b.add(plant2, '#3d8a3a');
    b.oy = 0;
    b.group = 'main';

    // roof (hidden when you are inside)
    const top = U + H2;
    b.box(X0 - 0.3, top, Z0 - 0.3, X1 + 0.3, top + 0.15, Z1 + 0.3, COL.homeIn, { solid: false, group: 'roof:home' });
    this.gable(X0 - 0.2, X1 + 0.2, Z0 - 0.2, Z1 + 0.2, top + 0.15, 2.6, COL.houseRoof, 'roof:home');

    // yard
    for (const [x, z] of [[-12, 57], [12, 57], [-12.5, 71], [12.5, 69]]) this.tree(x, z, 0.9);
    for (const x of [-6, -1.5, 6.5]) this.bush(x, Z0 - 1.0, 0.5);
    // mailbox
    b.cylinder(5.5, 0, 55, 0.05, 1.0, '#555', 6, true);
    b.box(5.3, 1.0, 54.8, 5.7, 1.3, 55.4, '#2b6cb0', { solid: false });
  }

  private house(x0: number, z0: number, x1: number, z1: number, color: string, roofColor: string, doorSide: 'n' | 's') {
    const b = this.b;
    b.box(x0, 0, z0, x1, 2.8, z1, color);
    this.gable(x0, x1, z0, z1, 2.8, 2.0, roofColor, 'main', 0.4);
    const dz = doorSide === 'n' ? z0 - 0.05 : z1 + 0.05;
    const xm = (x0 + x1) / 2;
    b.box(xm - 0.5, 0, dz - 0.03, xm + 0.5, 2.0, dz + 0.03, '#7b3f2b', { solid: false });
    this.windowX(dz, xm - 2.5, 1.0, 1.4, 1.0, doorSide === 'n' ? -1 : 1);
    this.windowX(dz, xm + 2.5, 1.0, 1.4, 1.0, doorSide === 'n' ? -1 : 1);
  }

  private neighborhood() {
    const houses: [number, number, number, number, string, string, 'n' | 's'][] = [
      [14, 42, 24, 50, '#e8d5a8', '#8b3a3a', 'n'],
      [30, 40, 40, 48, '#c9d8c5', '#4a5568', 'n'],
      [-40, 42, -30, 50, '#d8b4a0', '#5a4636', 'n'],
      [-56, 40, -46, 48, '#b8c8de', '#7b3f2b', 'n'],
      [14, 8, 24, 16, '#f0e0c0', '#4a5568', 's'],
      [32, 8, 42, 16, '#d6a99a', '#5a4636', 's'],
      [-26, 8, -16, 16, '#c3d7e0', '#8b3a3a', 's'],
      [-44, 8, -34, 16, '#e3d3b0', '#4a5568', 's'],
    ];
    for (const h of houses) this.house(...h);
    for (const [x, z] of [[-8, 50], [10, 38], [28, 54], [-28, 38], [-60, 54], [48, 46], [-8, 12], [8, 6], [28, 4], [-30, 4], [48, 12], [-50, 16], [60, 30], [-66, 30]]) this.tree(x, z, 1);
  }

  private starbucks() {
    const b = this.b;
    const [x0, z0, x1, z1] = [-22, 36, -10, 46];
    const H = 3.2;
    b.box(x0, 0, z0, x1, 0.04, z1, '#b08968', { solid: false });
    const ext = '#3d3a36';
    b.wallX(z0 - 0.06, x0 - 0.1, x1 + 0.1, H, ext, [[-16, 1.6]], 0.12, 2.4);
    b.wallX(z0 + 0.06, x0, x1, H, '#efe3cf', [[-16, 1.6]], 0.12, 2.4);
    b.wallX(z1, x0 - 0.1, x1 + 0.1, H, ext, [], 0.24);
    b.wallZ(x0, z0, z1, H, ext, [], 0.24);
    b.wallZ(x1, z0, z1, H, ext, [], 0.24);
    for (const x of [-20, -12.5]) this.windowX(z0 - 0.14, x, 0.8, 2.6, 1.8, -1);
    // awning + sign
    b.box(x0 - 0.2, 2.6, z0 - 1.2, x1 + 0.2, 2.75, z0 - 0.1, COL.green, { solid: false });
    this.sign(['STARBUCKS'], 4.4, 0.6, -16, 3.0, z0 - 0.2, Math.PI, { bg: COL.green, fg: '#ffffff', font: 0.36 });
    b.box(x0 - 0.2, H, z0 - 0.2, x1 + 0.2, H + 0.25, z1 + 0.2, '#2d2a26', { solid: false, group: 'roof:starbucks' });
    // counter
    b.box(-21.8, 0, 43.4, -13.5, 1.05, 44.1, '#5b3a29', { cam: false });
    b.box(-21.8, 1.05, 43.3, -13.5, 1.1, 44.2, '#e8e1d6', { solid: false });
    b.box(-21.6, 1.1, 43.5, -20.8, 1.6, 44.0, '#8a8f96', { solid: false }); // espresso machine
    b.box(-14.6, 1.1, 43.6, -13.8, 1.35, 44.0, '#f7f7f2', { solid: false }); // pastry case
    b.box(-21.8, 1.8, 45.85, -13.5, 2.6, 45.9, '#1e3932', { solid: false }); // menu board
    this.sign(['Cocoa  $3   Cake pop  $2', 'Lemonade  $2   Cookie  $1'], 4, 0.7, -17.6, 2.2, 45.84, Math.PI, { bg: '#1e3932', fg: '#ffffff', font: 0.17 });
    this.setSpot('barista', -17.6, 44.9, Math.PI);
    this.setSpot('order', -17.6, 42.7, 0);
    // tables
    for (const [tx, tz] of [[-20.2, 39.2], [-12.2, 39.2], [-12.2, 42.2]]) {
      b.cylinder(tx, 0, tz, 0.4, 0.74, '#4a3a2e', 12, true);
      for (const s of [-1, 1]) {
        this.chair(tx + s * 0.75, tz, s > 0 ? -Math.PI / 2 : Math.PI / 2, '#2d2a26');
        this.seat('starbucks', tx + s * 0.75, tz, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.55, 0.75);
      }
    }
    const plant = new THREE.IcosahedronGeometry(0.5, 0);
    plant.translate(-21.2, 0.7, 36.8);
    b.add(plant, '#3d8a3a');
  }

  /**
   * Sabin Elementary: brick building with a hallway in the middle,
   * front rooms (Room 5A, Art, entry, Music, Gym) and back rooms (Science, Room 5B, exit, Cafeteria).
   */
  private school() {
    const b = this.b;
    const H = 3.2;
    const [X0, X1, Z0, Z1] = [-26, 26, -30, -8];
    b.box(X0, 0, Z0, X1, 0.04, Z1, COL.floorSchool, { solid: false });
    b.box(X0, 0.04, -20, X1, 0.05, -16, '#c8c0ae', { solid: false }); // hallway runner
    b.box(0, 0.04, -16, 6, 0.05, Z1, '#c8c0ae', { solid: false });
    // exterior walls (brick outside, cream inside)
    const ext = (fn: 'wallX' | 'wallZ', at: number, a0: number, a1: number, doors: [number, number][], out: number) => {
      b[fn](at + out * 0.08, a0 - 0.16, a1 + 0.16, H, COL.brick, doors, 0.16, 2.5);
      b[fn](at - out * 0.04, a0, a1, H, COL.wallIn, doors, 0.08, 2.5);
    };
    ext('wallX', Z1, X0, X1, [[3, 2.6]], 1);
    ext('wallX', Z0, X0, X1, [[4, 1.8], [21, 1.8]], -1);
    ext('wallZ', X0, Z0, Z1, [], -1);
    ext('wallZ', X1, Z0, Z1, [], 1);
    // interior walls
    const W = COL.wallIn;
    b.wallX(-16, X0, 0, H, W, [[-19, 1.6], [-6, 1.6]], 0.16);
    b.wallX(-16, 6, X1, H, W, [[11, 1.6], [21, 1.6]], 0.16);
    b.wallX(-20, X0, 2, H, W, [[-19, 1.6], [-5, 1.6]], 0.16);
    b.wallX(-20, 6, X1, H, W, [[12, 1.8]], 0.16);
    b.wallZ(-12, -16, Z1, H, W, [], 0.16);
    b.wallZ(0, -16, Z1, H, W, [], 0.16);
    b.wallZ(6, -16, Z1, H, W, [], 0.16);
    b.wallZ(16, -16, Z1, H, W, [], 0.16);
    b.wallZ(-12, Z0, -20, H, W, [], 0.16);
    b.wallZ(2, Z0, -20, H, W, [], 0.16);
    b.wallZ(6, Z0, -20, H, W, [], 0.16);
    // windows on the outside
    for (const x of [-22, -16, -8, -3, 10, 14, 19, 24]) this.windowX(Z1 + 0.17, x, 1.0, 1.8, 1.4, 1);
    for (const x of [-22, -16, -8, -2, 10, 15, 26 - 2]) this.windowX(Z0 - 0.17, x, 1.0, 1.8, 1.4, -1);
    for (const z of [-26, -12]) {
      this.windowZ(X0 - 0.17, z, 1.0, 2.2, 1.4, -1);
      this.windowZ(X1 + 0.17, z, 1.0, 2.2, 1.4, 1);
    }
    // entrance: steps, columns, facade with the name
    b.box(0.6, 0, -7.6, 5.4, 0.12, -6.4, '#cfcfcf', { solid: false });
    for (const x of [0.4, 5.6]) b.box(x - 0.25, 0, -7.95, x + 0.25, 3.6, -7.45, COL.trim);
    b.box(-0.4, 3.2, -8.3, 6.4, 4.6, -7.7, COL.brick, { solid: false });
    b.box(-0.5, 4.6, -8.4, 6.5, 4.75, -7.6, COL.trim, { solid: false });
    this.sign(['SABIN ELEMENTARY'], 5.6, 0.75, 3, 3.95, -7.66, 0, { bg: '#f7f2e6', fg: '#8b2e1f', font: 0.42 });
    // roof (hidden when you are inside)
    b.box(X0 - 0.3, H, Z0 - 0.3, X1 + 0.3, H + 0.3, Z1 + 0.3, COL.roof, { solid: false, group: 'roof:school' });
    b.box(-2, H + 0.3, -22, 8, H + 2.6, -16, COL.brick, { solid: false, group: 'roof:school' }); // clock tower
    b.box(-2.2, H + 2.6, -22.2, 8.2, H + 2.8, -15.8, COL.trim, { solid: false, group: 'roof:school' });
    const clock = new THREE.CylinderGeometry(1.1, 1.1, 0.1, 24);
    clock.rotateX(Math.PI / 2);
    clock.translate(3, H + 1.45, -15.94);
    b.add(clock, '#ffffff', 'roof:school');
    b.box(2.95, H + 1.45, -15.88, 3.05, H + 2.25, -15.84, '#1a202c', { solid: false, group: 'roof:school' });
    b.box(3, H + 1.4, -15.88, 3.6, H + 1.5, -15.84, '#1a202c', { solid: false, group: 'roof:school' });

    // flagpole and lawn
    b.cylinder(-3, 0, -3, 0.07, 8, '#cfd4da', 8, true);
    b.box(-2.93, 6.6, -3.02, -1.4, 7.6, -2.98, '#2b6cb0', { solid: false });
    for (const x of [-20, -10, 14, 22]) this.bush(x, -6.6, 0.7);
    for (const [x, z] of [[-40, -6], [40, -6], [-46, -24], [46, -24], [-14, 6], [18, 4]]) this.tree(x, z, 1.1);

    // fence around campus with a gate at the front path
    const fence = (x0: number, z0: number, x1: number, z1: number) => {
      b.box(x0, 0, z0, x1, 1.1, z1, COL.fence, { solid: false });
      this.colliders.add(x0, 0, z0, x1, 1.1, z1, true);
    };
    fence(-50, -0.05, 0.4, 0.05);
    fence(5.6, -0.05, 50, 0.05);
    fence(-50.05, -64, -49.95, 0);
    fence(49.95, -64, 50.05, 0);
    fence(-50, -64.05, 50, -63.95);
    b.cylinder(0.4, 0, 0, 0.12, 1.6, COL.brick, 8, true);
    b.cylinder(5.6, 0, 0, 0.12, 1.6, COL.brick, 8, true);

    // ---- rooms
    this.classroom('room5a', -26, -16, -12, -8, ['Room 5A', 'Math + Reading + Writing'], 5);
    this.classroom('room5b', -12, -30, 2, -20, ['Room 5B', 'Social Studies'], 5);
    this.classroom('science', -26, -30, -12, -20, ['Science Lab', 'Be curious!'], 5, '#ffffff', '#8aa1b1');
    this.classroom('art', -12, -16, 0, -8, ['Art Room', 'Create!'], 4, '#f7f0e0', '#d97706');
    this.classroom('music', 6, -16, 16, -8, ['Music Room', '♪ ♫ ♪'], 4, '#fff', '#7c3aed');
    // music extras
    b.box(14.6, 0, -15.6, 15.8, 1.0, -14.2, '#1a1a1a', { cam: false }); // piano
    b.cylinder(15, 0, -9.2, 0.35, 0.5, '#c53030', 12, true); // drum
    // art extras: easels and paint
    for (const z of [-14.8, -9.2]) {
      b.box(-1.0, 0, z - 0.4, -0.9, 1.6, z + 0.4, COL.wood, { solid: false });
      b.box(-1.1, 0.9, z - 0.35, -1.0, 1.5, z + 0.35, '#ffffff', { solid: false });
    }
    // gym
    b.box(16, 0.04, -16, 26, 0.05, -8, '#d9a066', { solid: false });
    b.box(16.2, 0.05, -12.05, 25.8, 0.06, -11.95, '#ffffff', { solid: false });
    const ring = new THREE.RingGeometry(1.1, 1.2, 24);
    ring.rotateX(-Math.PI / 2);
    ring.translate(21, 0.06, -12);
    b.add(ring, '#ffffff');
    b.box(25.6, 2.4, -12.9, 25.8, 3.1, -11.1, '#ffffff', { solid: false });
    this.sign(['GYM'], 1.6, 0.5, 21, 2.7, -15.9, 0, { bg: '#2b6cb0', fg: '#ffffff', font: 0.3 });
    // PE spots: 4 columns x 3 rows facing the coach. gym0 (yours) is front row, middle.
    const gymSpots: [number, number][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) gymSpots.push([17.4 + c * 1.6, -14.4 + r * 2.4]);
    gymSpots.unshift(...gymSpots.splice(7, 1));
    gymSpots.forEach(([x, z], i) => this.setSpot(`gym${i}`, x, z, Math.PI / 2));
    this.setSpot('teacher:gym', 24.5, -12, -Math.PI / 2);
    // cafeteria
    this.cafeteria();
    // hallway decor: lockers
    // keep lockers at least 0.8 m clear of every doorway so nothing blocks a classroom door
    const clearOf = (x: number, doors: number[]) => doors.every((d) => x + 0.55 < d - 1.6 || x > d + 1.6);
    for (let x = -24; x < -13; x += 0.6) if (clearOf(x, [-19])) b.box(x, 0, -16.5, x + 0.55, 1.8, -16.1, x % 1.2 < 0.6 ? '#2b6cb0' : '#3182ce', { cam: false });
    for (let x = 7; x < 10; x += 0.6) if (clearOf(x, [12])) b.box(x, 0, -19.9, x + 0.55, 1.8, -19.5, '#38a169', { cam: false });
    this.sign(['Go Sabin Sharks!'], 3, 0.6, -2, 2.4, -19.88, 0, { bg: '#2b6cb0', fg: '#ffffff', font: 0.28 });
  }

  /** Desks face the board on the west wall. */
  private classroom(id: string, x0: number, z0: number, x1: number, z1: number, board: string[], cols: number, deskColor = COL.desk, accent = '#2b6cb0') {
    const b = this.b;
    const zc = (z0 + z1) / 2;
    // board
    b.box(x0 + 0.1, 0.9, zc - 2.2, x0 + 0.16, 2.3, zc + 2.2, '#ffffff', { solid: false });
    this.sign(board, 4.2, 1.2, x0 + 0.18, 1.6, zc, Math.PI / 2, { bg: '#fdfdfb', fg: accent, font: 0.24 });
    b.box(x0 + 0.1, 0, z0 + 0.3, x0 + 0.5, 1.8, z0 + 1.6, COL.wood, { cam: false }); // shelf
    // teacher desk
    b.box(x0 + 1.0, 0, zc + 2.0, x0 + 2.2, 0.76, zc + 3.1, COL.woodDark, { cam: false });
    this.setSpot(`teacher:${id}`, x0 + 1.5, zc, Math.PI / 2);
    // student desks: 3 rows
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < cols; c++) {
        const x = x0 + 3.8 + c * 2.0;
        const z = zc - 2 + r * 2;
        b.box(x - 0.85, 0.62, z - 0.38, x - 0.35, 0.66, z + 0.38, deskColor, { cam: false });
        b.box(x - 0.8, 0, z - 0.3, x - 0.4, 0.62, z + 0.3, '#8a8f96', { solid: false });
        this.chair(x, z, -Math.PI / 2, accent);
        this.seat(id, x, z, -Math.PI / 2, 0.6, 0.67);
      }
    // ceiling lights look nice from inside
    void x1;
  }

  private cafeteria() {
    const b = this.b;
    b.box(6, 0.04, -30, 26, 0.05, -20, '#e6dfcf', { solid: false });
    // serving counter on the east wall
    b.box(23.6, 0, -28, 24.6, 1.0, -22, '#b0b7bf', { cam: false });
    b.box(23.5, 1.0, -28, 24.7, 1.06, -22, '#d9dee3', { solid: false });
    for (let i = 0; i < 4; i++) b.box(23.8, 1.06, -27.4 + i * 1.4, 24.4, 1.14, -26.6 + i * 1.4, ['#f6c445', '#e05252', '#68d391', '#ed8936'][i], { solid: false });
    this.setSpot('lunchlady', 25.3, -25, -Math.PI / 2);
    this.setSpot('lunchline', 22.8, -25, Math.PI / 2);
    this.sign(['LUNCH'], 2, 0.5, 25.88, 2.4, -25, -Math.PI / 2, { bg: '#e05252', fg: '#ffffff', font: 0.3 });
    // tables
    for (const tx of [10, 16])
      for (const tz of [-27.2, -23.6]) {
        b.box(tx - 1.6, 0.66, tz - 0.45, tx + 1.6, 0.72, tz + 0.45, '#e2e8f0', { cam: false });
        b.box(tx - 1.5, 0, tz - 0.1, tx + 1.5, 0.66, tz + 0.1, '#718096', { solid: false });
        for (const s of [-1, 1]) {
          b.box(tx - 1.6, 0.34, tz + s * 0.85 - 0.18, tx + 1.6, 0.4, tz + s * 0.85 + 0.18, '#3182ce', { solid: false });
          for (const dx of [-1, 0, 1]) this.seat('cafeteria', tx + dx, tz + s * 0.8, s > 0 ? Math.PI : 0, 0.48, 0.73);
        }
      }
  }

  private playground() {
    const b = this.b;
    b.box(-22, 0, -47, -6, 0.04, -33, COL.chips, { solid: false });
    // monkey bars along x
    const [mx0, mx1, mz] = [-18, -12, -38];
    for (const x of [mx0, mx1])
      for (const s of [-1, 1]) b.cylinder(x, 0, mz + s * 0.38, 0.05, 2.05, '#e53e3e', 8, true);
    for (const s of [-1, 1]) b.box(mx0, 1.98, mz + s * 0.38 - 0.03, mx1, 2.04, mz + s * 0.38 + 0.03, '#e53e3e', { solid: false });
    for (let x = mx0 + 0.4; x < mx1 - 0.2; x += 0.5) {
      const bar = new THREE.CylinderGeometry(0.025, 0.025, 0.76, 6);
      bar.rotateX(Math.PI / 2);
      bar.translate(x, 2.01, mz);
      b.add(bar, '#f6e05e');
    }
    this.setSpot('mbStart', mx0 - 0.6, mz, Math.PI / 2);
    this.setSpot('mbEnd', mx1 + 0.6, mz, Math.PI / 2);
    // slide
    b.box(-9.6, 0, -43.6, -8.4, 1.5, -42.4, '#3182ce');
    b.box(-9.6, 1.5, -43.6, -8.4, 1.6, -42.4, '#f6e05e', { solid: false });
    const slide = new THREE.BoxGeometry(0.9, 0.06, 3.2);
    slide.rotateX(-0.48);
    slide.translate(-9, 0.78, -40.9);
    b.add(slide, '#f6ad55');
    for (let i = 0; i < 5; i++) b.box(-9.5, 0.3 * i, -44.2, -8.5, 0.3 * i + 0.05, -43.8, '#718096', { solid: false });
    // swings
    for (const x of [-20, -16]) b.cylinder(x, 0, -44, 0.06, 2.4, '#718096', 6, true);
    b.box(-20, 2.35, -44.05, -16, 2.45, -43.95, '#718096', { solid: false });
    for (const x of [-19, -17]) {
      b.box(x - 0.01, 0.55, -44.01, x + 0.01, 2.35, -43.99, '#2d3748', { solid: false });
      b.box(x - 0.25, 0.5, -44.15, x + 0.25, 0.55, -43.85, '#2d3748', { solid: false });
    }
    // sandbox
    b.box(-14, 0, -46, -11, 0.2, -44, COL.woodDark, { solid: false });
    b.box(-13.8, 0.2, -45.8, -11.2, 0.22, -44.2, '#e9d8a6', { solid: false });
    // kickball diamond
    const home = new THREE.Vector3(-34, 0, -60);
    const fwd = new THREE.Vector3(0, 0, 1); // the diamond opens north, away from the back fence
    const right = new THREE.Vector3(1, 0, 0);
    const base = (k: number) => {
      const d = 9;
      if (k === 0) return home.clone();
      if (k === 1) return home.clone().addScaledVector(fwd, d * 0.707).addScaledVector(right, d * 0.707);
      if (k === 2) return home.clone().addScaledVector(fwd, d * 1.414);
      return home.clone().addScaledVector(fwd, d * 0.707).addScaledVector(right, -d * 0.707);
    };
    const dia = new THREE.CircleGeometry(9.5, 4);
    dia.rotateX(-Math.PI / 2);
    dia.rotateY(Math.PI / 4);
    dia.translate(home.x, 0.015, home.z + 9 * 0.707);
    b.add(dia, COL.dirt);
    for (let k = 0; k < 4; k++) {
      const p = base(k);
      b.box(p.x - 0.3, 0.02, p.z - 0.3, p.x + 0.3, 0.06, p.z + 0.3, '#ffffff', { solid: false });
      this.setSpot(`base${k}`, p.x, p.z, 0);
    }
    this.setSpot('pitcher', home.x, home.z + 6.5, Math.PI);
    [[-34, -44], [-26, -47], [-42, -47]].forEach(([x, z], i) => this.setSpot(`fielder${i}`, x, z, Math.PI));
    this.sign(['KICKBALL'], 2.4, 0.5, -34, 1.2, -63.6, 0, { bg: '#d97706', fg: '#ffffff', font: 0.3 });
    b.cylinder(-35.2, 0, -63.6, 0.05, 1.5, '#555', 6, true);
    b.cylinder(-32.8, 0, -63.6, 0.05, 1.5, '#555', 6, true);
    this.sign(['PLAYGROUND'], 2.6, 0.5, -14, 2.2, -32.5, 0, { bg: '#38a169', fg: '#ffffff', font: 0.3 });
    // benches
    for (const x of [-12, -20]) b.box(x - 1, 0.4, -32.8, x + 1, 0.48, -32.4, COL.wood, { cam: false });
  }

  /** Soccer pitch: x 8..46, z -60..-36, goals at both ends. */
  private field() {
    const b = this.b;
    const [x0, x1, z0, z1] = [8, 46, -60, -36];
    for (let i = 0; i < 8; i++) {
      const xa = x0 + ((x1 - x0) / 8) * i;
      if (i % 2) b.box(xa, 0, z0, xa + (x1 - x0) / 8, 0.008, z1, '#5d9a43', { solid: false });
    }
    const line = (a: number, c: number, bb: number, d: number) => b.box(a, 0.008, c, bb, 0.018, d, COL.line, { solid: false });
    line(x0, z0 - 0.05, x1, z0 + 0.05);
    line(x0, z1 - 0.05, x1, z1 + 0.05);
    line(x0 - 0.05, z0, x0 + 0.05, z1);
    line(x1 - 0.05, z0, x1 + 0.05, z1);
    line(26.95, z0, 27.05, z1);
    const circ = new THREE.RingGeometry(3.9, 4.0, 40);
    circ.rotateX(-Math.PI / 2);
    circ.translate(27, 0.013, -48);
    b.add(circ, COL.line);
    for (const [gx, dir] of [[x0, 1], [x1, -1]] as const) {
      // penalty box
      line(gx, -54.05, gx + dir * 6, -53.95);
      line(gx, -42.05, gx + dir * 6, -41.95);
      line(gx + dir * 6 - 0.05, -54, gx + dir * 6 + 0.05, -42);
      // goal frame (behind the line)
      const back = gx - dir * 1.4;
      for (const z of [-50.5, -45.5]) {
        b.box(gx - 0.06, 0, z - 0.06, gx + 0.06, 2.0, z + 0.06, '#ffffff');
        b.box(Math.min(gx, back), 0, z - 0.02, Math.max(gx, back), 2.0, z + 0.02, '#e2e8f0', { solid: true, cam: false });
      }
      b.box(gx - 0.06, 1.94, -50.5, gx + 0.06, 2.06, -45.5, '#ffffff', { solid: false });
      b.box(back - 0.02, 0, -50.5, back + 0.02, 2.0, -45.5, '#e2e8f0', { cam: false });
      b.box(Math.min(gx, back), 1.98, -50.5, Math.max(gx, back), 2.0, -45.5, '#e2e8f0', { solid: false });
    }
    // bleachers
    for (let i = 0; i < 3; i++) b.box(14, 0, -33.4 + i * 0.5, 40, 0.4 + i * 0.4, -33.0 + i * 0.5, '#a0aec0', { cam: false });
    this.sign(['SABIN SHARKS'], 4, 0.6, 27, 2.0, -31.9, Math.PI, { bg: '#2b6cb0', fg: '#ffffff', font: 0.34 });
    // practice cones are placed by the practice activity
  }
}

/** Flips any triangle whose normal points toward `center`. */
function orientOutward(geo: THREE.BufferGeometry, center: THREE.Vector3) {
  const p = geo.getAttribute('position') as THREE.BufferAttribute;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), m = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    n.subVectors(b, a).cross(c.clone().sub(a));
    m.copy(a).add(b).add(c).divideScalar(3).sub(center);
    if (n.dot(m) < 0) {
      p.setXYZ(i + 1, c.x, c.y, c.z);
      p.setXYZ(i + 2, b.x, b.y, b.z);
    }
  }
  geo.computeVertexNormals();
}
