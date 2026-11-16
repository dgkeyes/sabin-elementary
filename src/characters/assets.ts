import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type BodyType = 'f' | 'm';

/** Bone that drives each body part. Used by the clothing shader and accessories. */
export const PART = { head: 0, torso: 1, pelvis: 2, upperarm: 3, lowerarm: 4, hand: 5, thigh: 6, calf: 7, foot: 8, clavicle: 9 } as const;

export interface BodyAsset {
  gltf: GLTF;
  /** Bind-pose height of the mesh in meters. */
  height: number;
  /** Model-space rest matrix of every bone, by name. */
  rest: Map<string, THREE.Matrix4>;
  clips: Map<string, THREE.AnimationClip>;
}

export interface Assets {
  bodies: Record<BodyType, BodyAsset>;
  /** Hair meshes in model space at rest, by mesh name. */
  hair: Map<string, THREE.Mesh>;
}

let assets: Assets | null = null;
export const getAssets = () => {
  if (!assets) throw new Error('assets not loaded');
  return assets;
};

/** Hips height of the animation rig; bodies with longer legs get their hips raised by the difference. */
const ANIM_PELVIS_Z = 0.917;

export async function loadAssets(onProgress: (f: number) => void): Promise<Assets> {
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager);
  const base = import.meta.env.BASE_URL + 'models/';
  const files = ['body_f.glb', 'body_m.glb', 'hair.glb', 'anims.glb'];
  const done = new Array(files.length).fill(0);
  const results = await Promise.all(
    files.map((f, i) =>
      loader.loadAsync(base + f, (e) => {
        if (e.total) done[i] = e.loaded / e.total;
        onProgress(done.reduce((a, b) => a + b, 0) / files.length);
      }),
    ),
  );
  const [bf, bm, hairG, animG] = results;

  const bodies = {} as Record<BodyType, BodyAsset>;
  for (const [key, g] of [['f', bf], ['m', bm]] as const) {
    g.scene.updateMatrixWorld(true);
    const rest = new Map<string, THREE.Matrix4>();
    let pelvisZ = ANIM_PELVIS_Z;
    g.scene.traverse((o) => {
      if ((o as THREE.Bone).isBone) rest.set(o.name, o.matrixWorld.clone());
      if (o.name === 'pelvis') pelvisZ = o.position.z;
    });
    let height = 1.75;
    g.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh && m.material && (m.material as THREE.Material).name.startsWith('MI_Superhero')) {
        m.geometry.computeBoundingBox();
        height = m.geometry.boundingBox!.max.y;
        tagBodyParts(m);
        flattenChest(m.geometry);
        smoothBody(m.geometry);
      }
    });
    bodies[key] = { gltf: g, height, rest, clips: retargetClips(animG.animations, pelvisZ - ANIM_PELVIS_Z) };
  }

  const hair = new Map<string, THREE.Mesh>();
  hairG.scene.updateMatrixWorld(true);
  hairG.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const name = (m.parent && m.parent !== hairG.scene && !m.name.startsWith('Hair') && !m.name.startsWith('Eyebrows') ? m.parent.name : m.name).replace(/_\d+$/, '');
      const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
      geo.computeBoundingBox();
      const mesh = new THREE.Mesh(geo, m.material);
      mesh.name = name;
      hair.set(name, mesh);
    }
  });

  assets = { bodies, hair };
  return assets;
}

/** Copies clips for a body, lifting the hips so feet stay on the ground. */
function retargetClips(src: THREE.AnimationClip[], lift: number) {
  const out = new Map<string, THREE.AnimationClip>();
  for (const clip of src) {
    const c = clip.clone();
    c.tracks = c.tracks.filter((t) => !t.name.startsWith('root.'));
    for (const t of c.tracks) {
      if (t.name === 'pelvis.position') {
        const v = t.values;
        for (let i = 2; i < v.length; i += 3) v[i] += lift;
      }
    }
    out.set(c.name, c);
  }
  return out;
}

const BONE_PART: [RegExp, number][] = [
  [/^(Head|neck)/, PART.head],
  [/^clavicle/, PART.clavicle],
  [/^spine/, PART.torso],
  [/^pelvis|^root/, PART.pelvis],
  [/^upperarm/, PART.upperarm],
  [/^lowerarm/, PART.lowerarm],
  [/^(hand|index|middle|ring|pinky|thumb)/, PART.hand],
  [/^thigh/, PART.thigh],
  [/^calf/, PART.calf],
  [/^(foot|ball)/, PART.foot],
];

/**
 * Adds per-vertex attributes the clothing shader needs:
 *   aPart  - which body part the vertex belongs to (strongest bone)
 *   aAlong - 0..1 position along that limb (shoulder->elbow, hip->knee...), for sleeve and pant lengths
 */
function tagBodyParts(mesh: THREE.SkinnedMesh) {
  const geo = mesh.geometry;
  if (geo.getAttribute('aPart')) return;
  const bones = mesh.skeleton.bones;
  const bonePos = mesh.skeleton.boneInverses.map((inv) => new THREE.Vector3().setFromMatrixPosition(inv.clone().invert()));
  const idx = (name: string) => bones.findIndex((b) => b.name === name);
  const boneParts = bones.map((b) => BONE_PART.find(([re]) => re.test(b.name))?.[1] ?? PART.torso);
  // Limb segments: bone -> next joint.
  const seg = new Map<number, [THREE.Vector3, THREE.Vector3]>();
  for (const side of ['l', 'r']) {
    const pairs: [string, string][] = [
      [`upperarm_${side}`, `lowerarm_${side}`],
      [`lowerarm_${side}`, `hand_${side}`],
      [`thigh_${side}`, `calf_${side}`],
      [`calf_${side}`, `foot_${side}`],
    ];
    for (const [a, b] of pairs) seg.set(idx(a), [bonePos[idx(a)], bonePos[idx(b)]]);
  }
  const si = geo.getAttribute('skinIndex');
  const sw = geo.getAttribute('skinWeight');
  const pos = geo.getAttribute('position');
  const n = pos.count;
  const part = new Float32Array(n);
  const along = new Float32Array(n);
  const v = new THREE.Vector3();
  const ab = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    // Sum weights per part, take the strongest part, then its strongest bone.
    const sums = new Map<number, number>();
    let bestBone = si.getX(i);
    let bestW = -1;
    for (let k = 0; k < 4; k++) {
      const b = si.getComponent(i, k);
      const w = sw.getComponent(i, k);
      const p = boneParts[b];
      sums.set(p, (sums.get(p) ?? 0) + w);
    }
    let bestPart: number = PART.torso;
    let bestSum = -1;
    for (const [p, s] of sums) if (s > bestSum) (bestSum = s), (bestPart = p);
    for (let k = 0; k < 4; k++) {
      const b = si.getComponent(i, k);
      const w = sw.getComponent(i, k);
      if (boneParts[b] === bestPart && w > bestW) (bestW = w), (bestBone = b);
    }
    part[i] = bestPart;
    const s = seg.get(bestBone);
    if (s) {
      v.fromBufferAttribute(pos, i).sub(s[0]);
      ab.subVectors(s[1], s[0]);
      along[i] = THREE.MathUtils.clamp(v.dot(ab) / ab.lengthSq(), 0, 1);
    }
  }
  geo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  geo.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
}

/**
 * The source bodies are adult "superhero" builds. Pull the front of the chest in toward the
 * sternum so everyone (especially the kids) has a plain, flat chest under their shirt.
 */
function flattenChest(geo: THREE.BufferGeometry) {
  const pos = geo.getAttribute('position');
  const part = geo.getAttribute('aPart');
  const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
  for (let i = 0; i < pos.count; i++) {
    const p = Math.round(part.getX(i));
    if (p !== PART.torso && p !== PART.clavicle) continue;
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const w = smooth(1.14, 1.24, y) * (1 - smooth(1.38, 1.46, y));
    if (w <= 0 || z <= 0.095) continue;
    pos.setZ(i, THREE.MathUtils.lerp(z, 0.095 + (z - 0.095) * 0.3, w));
  }
  pos.needsUpdate = true;
}

/**
 * The source bodies have bodybuilder muscles modeled into the mesh, which show through painted-on
 * clothes. This stores a smoothed copy of the torso and limbs (aSmooth, aSmoothN) that the body shader
 * blends toward: fully for kids and under clothes, partly for adults. Head and hands keep their detail.
 * Taubin smoothing (alternating shrink and inflate steps) removes bumps without shrinking the body.
 */
function smoothBody(geo: THREE.BufferGeometry) {
  if (geo.getAttribute('aSmooth')) return;
  const pos = geo.getAttribute('position');
  const nrm = geo.getAttribute('normal');
  const part = geo.getAttribute('aPart');
  const index = geo.getIndex();
  const n = pos.count;
  // weld split vertices (UV seams) by position
  const weld = new Int32Array(n);
  const keyToId = new Map<string, number>();
  const firstOf: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let id = keyToId.get(k);
    if (id === undefined) {
      id = firstOf.length;
      keyToId.set(k, id);
      firstOf.push(i);
    }
    weld[i] = id;
  }
  const m = firstOf.length;
  const P = new Float32Array(m * 3);
  const movable = new Uint8Array(m).fill(1);
  for (let i = 0; i < n; i++) {
    const id = weld[i];
    P[id * 3] = pos.getX(i);
    P[id * 3 + 1] = pos.getY(i);
    P[id * 3 + 2] = pos.getZ(i);
    const p = Math.round(part.getX(i));
    if (p === PART.head || p === PART.hand) movable[id] = 0;
  }
  const nb: Set<number>[] = Array.from({ length: m }, () => new Set<number>());
  const tri = index ? (k: number) => index.getX(k) : (k: number) => k;
  const triCount = index ? index.count : n;
  for (let k = 0; k < triCount; k += 3) {
    const a = weld[tri(k)], b = weld[tri(k + 1)], c = weld[tri(k + 2)];
    nb[a].add(b).add(c);
    nb[b].add(a).add(c);
    nb[c].add(a).add(b);
  }
  const lists = nb.map((s) => [...s]);
  const tmp = new Float32Array(m * 3);
  const step = (lambda: number) => {
    for (let i = 0; i < m; i++) {
      const L = lists[i];
      if (!movable[i] || !L.length) {
        tmp[i * 3] = P[i * 3];
        tmp[i * 3 + 1] = P[i * 3 + 1];
        tmp[i * 3 + 2] = P[i * 3 + 2];
        continue;
      }
      let x = 0, y = 0, z = 0;
      for (const j of L) {
        x += P[j * 3];
        y += P[j * 3 + 1];
        z += P[j * 3 + 2];
      }
      const inv = 1 / L.length;
      for (let c = 0; c < 3; c++) {
        const avg = (c === 0 ? x : c === 1 ? y : z) * inv;
        tmp[i * 3 + c] = P[i * 3 + c] + lambda * (avg - P[i * 3 + c]);
      }
    }
    P.set(tmp);
  };
  for (let it = 0; it < 120; it++) {
    step(0.5);
    step(-0.53);
  }
  // kid shape: narrower hips and a flatter seat (the adult hourglass reads as grown-up)
  const sm = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
  for (let i = 0; i < m; i++) {
    if (!movable[i]) continue;
    const y = P[i * 3 + 1];
    // flat chest
    const wc = sm(1.08, 1.2, y) * (1 - sm(1.4, 1.5, y));
    const zc = P[i * 3 + 2];
    if (wc > 0 && zc > 0.06 && Math.abs(P[i * 3]) < 0.2) P[i * 3 + 2] = 0.06 + (zc - 0.06) * (1 - 0.65 * wc);
    const w = sm(0.62, 0.85, y) * (1 - sm(1.05, 1.18, y));
    if (w <= 0) continue;
    P[i * 3] *= 1 - 0.12 * w;
    const z = P[i * 3 + 2];
    if (z < -0.06) P[i * 3 + 2] = -0.06 + (z + 0.06) * (1 - 0.45 * w);
  }
  // smoothed normals, accumulated per welded vertex so seams stay invisible
  const N = new Float32Array(m * 3);
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  for (let k = 0; k < triCount; k += 3) {
    const a = weld[tri(k)], b = weld[tri(k + 1)], c = weld[tri(k + 2)];
    va.fromArray(P, a * 3);
    vb.fromArray(P, b * 3).sub(va);
    vc.fromArray(P, c * 3).sub(va);
    vb.cross(vc);
    for (const id of [a, b, c]) {
      N[id * 3] += vb.x;
      N[id * 3 + 1] += vb.y;
      N[id * 3 + 2] += vb.z;
    }
  }
  const sp = new Float32Array(n * 3);
  const sn = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const id = weld[i];
    sp[i * 3] = P[id * 3];
    sp[i * 3 + 1] = P[id * 3 + 1];
    sp[i * 3 + 2] = P[id * 3 + 2];
    if (movable[id]) v.fromArray(N, id * 3).normalize();
    else v.fromBufferAttribute(nrm, i); // keep the original normal on head and hands
    v.toArray(sn, i * 3);
  }
  geo.setAttribute('aSmooth', new THREE.BufferAttribute(sp, 3));
  geo.setAttribute('aSmoothN', new THREE.BufferAttribute(sn, 3));
}
