import * as THREE from 'three';
import { CLOTHING_BY_ID, HAIR_BY_ID, type Pattern } from '../content/clothing';
import type { Look, Worn } from '../core/save';
import type { BodyType } from './assets';
import { BODY_LANDMARKS } from './lookShader';

/**
 * Small 3D add-ons: hats, backpacks, skirts, hoods, glasses, and hair extras.
 * Each part is built in the body's rest-pose model space (meters, +Y up, +Z forward)
 * and attached to a bone, so it follows the animation.
 */
export type AttachBone = 'Head' | 'spine_03' | 'pelvis';
export interface Attachment {
  bone: AttachBone;
  object: THREE.Object3D;
}

const matCache = new Map<string, THREE.Material>();
export function solid(color: string, opts: { rough?: number; metal?: number; emissive?: string } = {}) {
  const key = `${color}|${opts.rough ?? 0.8}|${opts.metal ?? 0}|${opts.emissive ?? ''}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.8, metalness: opts.metal ?? 0, emissive: opts.emissive ?? '#000000' });
    matCache.set(key, m);
  }
  return m;
}

const texCache = new Map<string, THREE.Texture>();
/** Little canvas textures so skirts and hats can show the same patterns as painted clothes. */
export function patterned(pattern: Pattern, c1: string, c2: string) {
  if (pattern === 'solid' || pattern === 'twoTone') return solid(c1);
  const key = `${pattern}|${c1}|${c2}`;
  let tex = texCache.get(key);
  if (!tex) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d')!;
    g.fillStyle = c1;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = c2;
    if (pattern === 'stripes') for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 8);
    else if (pattern === 'plaid') {
      g.globalAlpha = 0.45;
      for (let i = 0; i < 64; i += 16) {
        g.fillRect(i, 0, 8, 64);
        g.fillRect(0, i, 64, 8);
      }
    } else if (pattern === 'dots' || pattern === 'flowers' || pattern === 'star' || pattern === 'heart') {
      for (let y = 8; y < 64; y += 16)
        for (let x = 8; x < 64; x += 16) {
          g.beginPath();
          g.arc(x + ((y / 16) % 2) * 8, y, pattern === 'flowers' ? 6 : 4, 0, Math.PI * 2);
          g.fill();
        }
    } else if (pattern === 'rainbow') {
      const cols = ['#e53e3e', '#f6ad55', '#f6e05e', '#68d391', '#4299e1', '#9f7aea'];
      cols.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(0, (i * 64) / cols.length, 64, 64 / cols.length + 1);
      });
    } else if (pattern === 'camo') {
      for (let i = 0; i < 14; i++) {
        g.beginPath();
        g.ellipse((i * 37) % 64, (i * 23) % 64, 9, 6, i, 0, Math.PI * 2);
        g.fill();
      }
    } else if (pattern === 'denim') {
      g.globalAlpha = 0.15;
      for (let i = -64; i < 64; i += 3) {
        g.beginPath();
        g.moveTo(i, 0);
        g.lineTo(i + 64, 64);
        g.strokeStyle = '#ffffff';
        g.stroke();
      }
    }
    tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    texCache.set(key, tex);
  }
  const mk = `tex|${key}`;
  let m = matCache.get(mk);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    matCache.set(mk, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** Head center and radius in rest space. */
export function headInfo(body: BodyType) {
  const L = BODY_LANDMARKS[body];
  const r = body === 'f' ? 0.105 : 0.112;
  const c = new THREE.Vector3(0, L.headTop - r - 0.012, L.head.z + 0.02);
  return { c, r, top: L.headTop };
}

function hat(worn: Worn, body: BodyType): THREE.Object3D | null {
  const item = CLOTHING_BY_ID.get(worn.id);
  if (!item) return null;
  const { c, r } = headInfo(body);
  const g = new THREE.Group();
  const m1 = patterned(item.pattern, worn.color, worn.color2);
  const m2 = solid(worn.color2);
  const dome = (scale = 1.12, h = 1) => {
    const d = mesh(new THREE.SphereGeometry(r * scale, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m1, c.x, c.y + 0.015, c.z);
    d.scale.y = h;
    return d;
  };
  switch (item.shape) {
    case 'cap': {
      g.add(dome(1.1, 0.95));
      const brim = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.01, 16, 1, false, -Math.PI / 2, Math.PI), m2, c.x, c.y + 0.02, c.z + r * 0.92);
      brim.scale.set(1.1, 1, 1.3);
      brim.rotation.x = 0.12;
      g.add(brim);
      break;
    }
    case 'beanie': {
      g.add(dome(1.12, 1.25));
      g.add(mesh(new THREE.TorusGeometry(r * 1.1, 0.018, 8, 24), m2, c.x, c.y + 0.02, c.z)).children.at(-1)!.rotateX(Math.PI / 2);
      g.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), m2, c.x, c.y + r * 1.4 + 0.03, c.z));
      break;
    }
    case 'sunhat': {
      g.add(dome(1.12, 1.0));
      g.add(mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.008, 28), m1, c.x, c.y + 0.03, c.z));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.13, r * 1.13, 0.03, 24, 1, true), m2, c.x, c.y + 0.05, c.z));
      break;
    }
    case 'bucket': {
      g.add(mesh(new THREE.CylinderGeometry(r * 0.95, r * 1.15, 0.11, 20), m1, c.x, c.y + 0.07, c.z));
      g.add(mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.65, 0.04, 20, 1, true), m1, c.x, c.y, c.z));
      break;
    }
    case 'headband': {
      const t = mesh(new THREE.TorusGeometry(r * 1.03, 0.012, 8, 28, Math.PI * 1.1), m1, c.x, c.y + 0.02, c.z - 0.005);
      t.rotation.set(-0.3, 0, -Math.PI * 0.05);
      g.add(t);
      break;
    }
    case 'bow': {
      const bow = new THREE.Group();
      const wing = new THREE.ConeGeometry(0.035, 0.07, 10);
      const a = mesh(wing, m1, -0.035, 0, 0);
      a.rotation.z = Math.PI / 2;
      const b = mesh(wing, m1, 0.035, 0, 0);
      b.rotation.z = -Math.PI / 2;
      bow.add(a, b, mesh(new THREE.SphereGeometry(0.018, 8, 6), m1));
      bow.position.set(c.x + r * 0.55, c.y + r * 0.8, c.z + 0.01);
      bow.rotation.z = -0.4;
      g.add(bow);
      break;
    }
    case 'crown': {
      const gold = solid(worn.color, { rough: 0.3, metal: 0.8 });
      g.add(mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.05, 16, 1, true), gold, c.x, c.y + r * 0.85, c.z));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        g.add(mesh(new THREE.ConeGeometry(0.018, 0.05, 6), gold, c.x + Math.sin(a) * r * 0.85, c.y + r * 0.85 + 0.045, c.z + Math.cos(a) * r * 0.85));
      }
      g.add(mesh(new THREE.SphereGeometry(0.013, 8, 6), solid(worn.color2, { rough: 0.2 }), c.x, c.y + r * 0.85, c.z + r * 0.86));
      break;
    }
    case 'catears': {
      for (const s of [-1, 1]) {
        const e = mesh(new THREE.ConeGeometry(0.035, 0.075, 4), m1, c.x + s * r * 0.55, c.y + r * 0.9, c.z - 0.01);
        e.rotation.z = -s * 0.35;
        g.add(e);
        const inner = mesh(new THREE.ConeGeometry(0.02, 0.045, 4), m2, c.x + s * r * 0.55, c.y + r * 0.88, c.z + 0.005);
        inner.rotation.z = -s * 0.35;
        g.add(inner);
      }
      break;
    }
    case 'propeller': {
      g.add(dome(1.1, 0.95));
      g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), solid('#e2e8f0'), c.x, c.y + r * 1.05 + 0.03, c.z));
      const prop = new THREE.Group();
      prop.position.set(c.x, c.y + r * 1.05 + 0.055, c.z);
      prop.add(mesh(new THREE.BoxGeometry(0.2, 0.004, 0.03), m2));
      prop.userData.spin = 14;
      g.add(prop);
      break;
    }
  }
  return g;
}

function backpack(worn: Worn, body: BodyType): THREE.Object3D | null {
  const item = CLOTHING_BY_ID.get(worn.id);
  if (!item) return null;
  const L = BODY_LANDMARKS[body];
  const g = new THREE.Group();
  const m1 = patterned(item.pattern, worn.color, worn.color2);
  const m2 = solid(worn.color2);
  const back = L.spine.z - (body === 'm' ? 0.17 : 0.15);
  const y = L.spine.y - 0.1;
  const size: Record<string, [number, number, number]> = { classic: [0.3, 0.38, 0.14], mini: [0.22, 0.26, 0.1], sport: [0.28, 0.4, 0.12], big: [0.36, 0.48, 0.18], rocket: [0.3, 0.38, 0.12] };
  const [w, hgt, d] = size[String(item.shape)] ?? size.classic;
  if (item.shape === 'rocket') {
    const metal = solid(worn.color, { rough: 0.35, metal: 0.6 });
    for (const s of [-1, 1]) {
      g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 12), metal, s * 0.08, y, back - 0.06));
      g.add(mesh(new THREE.ConeGeometry(0.06, 0.1, 12), m2, s * 0.08, y + 0.21, back - 0.06));
      const flame = mesh(new THREE.ConeGeometry(0.04, 0.12, 10), solid('#f6ad55', { emissive: '#dd6b20' }), s * 0.08, y - 0.23, back - 0.06);
      flame.rotation.x = Math.PI;
      g.add(flame);
    }
  } else {
    const box = mesh(new THREE.BoxGeometry(w, hgt, d), m1, 0, y, back - d / 2 + 0.03);
    g.add(box);
    g.add(mesh(new THREE.SphereGeometry(w / 2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m1, 0, y + hgt / 2, back - d / 2 + 0.03)).children.at(-1)!.scale.set(1, 0.35, d / w);
    g.add(mesh(new THREE.BoxGeometry(w * 0.7, hgt * 0.4, 0.05), m2, 0, y - hgt * 0.18, back - d + 0.02));
    if (item.shape === 'sport') g.add(mesh(new THREE.BoxGeometry(0.03, hgt, d + 0.005), m2, 0, y, back - d / 2 + 0.03));
  }
  // straps over the shoulders
  const strap = solid(worn.color2 === '#ffffff' ? '#4a5568' : worn.color2);
  for (const s of [-1, 1]) {
    const st = mesh(new THREE.BoxGeometry(0.035, 0.32, 0.018), strap, s * 0.09, L.spine.y + 0.0, L.spine.z + (body === 'm' ? 0.13 : 0.11));
    st.rotation.x = -0.12;
    g.add(st);
    const over = mesh(new THREE.BoxGeometry(0.035, 0.018, 0.25), strap, s * 0.09, L.spine.y + 0.16, L.spine.z - 0.02);
    g.add(over);
  }
  return g;
}

function bottomExtras(worn: Worn, body: BodyType): THREE.Object3D | null {
  const item = CLOTHING_BY_ID.get(worn.id);
  if (!item || item.category !== 'skirts') return null;
  const L = BODY_LANDMARKS[body];
  const len = Number(item.shape);
  const top = L.waist + 0.02;
  const rTop = body === 'f' ? 0.155 : 0.165;
  const g = new THREE.Group();
  const m1 = patterned(item.pattern, worn.color, worn.color2);
  const skirt = mesh(new THREE.CylinderGeometry(rTop, rTop + len * 0.62, len, 24, 1, true), m1, 0, top - len / 2, L.pelvis.z + 0.01);
  skirt.scale.z = 0.82;
  (skirt.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  g.add(skirt);
  if (item.extra === 'tutu') {
    for (let i = 0; i < 3; i++) {
      const ring = mesh(new THREE.TorusGeometry(rTop + 0.04 + i * 0.03, 0.03, 6, 24), solid(i % 2 ? worn.color2 : worn.color), 0, top - 0.06 - i * 0.07, L.pelvis.z + 0.01);
      ring.rotation.x = Math.PI / 2;
      ring.scale.y = 0.85;
      g.add(ring);
    }
  }
  return g;
}

function topExtras(worn: Worn, body: BodyType): Attachment[] {
  const item = CLOTHING_BY_ID.get(worn.id);
  if (!item?.extra) return [];
  const L = BODY_LANDMARKS[body];
  const out: Attachment[] = [];
  const neckY = L.head.y - 0.07;
  if (item.extra === 'hood') {
    const hood = mesh(new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.5), patterned(item.pattern, worn.color, worn.color2), 0, neckY - 0.02, L.head.z - 0.11);
    hood.scale.set(1.05, 0.55, 0.65);
    out.push({ bone: 'spine_03', object: hood });
  }
  if (item.extra === 'collar' || item.extra === 'jacket') {
    const col = mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.05, 16, 1, true), solid(item.extra === 'jacket' ? worn.color : worn.color2 === '#ffffff' ? worn.color : worn.color2), 0, neckY - 0.01, L.head.z - 0.02);
    (col.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    out.push({ bone: 'spine_03', object: col });
  }
  return out;
}

function hairExtras(styleId: string, hairMat: THREE.Material, body: BodyType): THREE.Object3D | null {
  const style = HAIR_BY_ID.get(styleId);
  if (!style?.extras?.length) return null;
  const { c, r } = headInfo(body);
  const g = new THREE.Group();
  const cap = (len: number, rad: number) => new THREE.CapsuleGeometry(rad, len, 6, 10);
  for (const ex of style.extras) {
    if (ex === 'ponytail') {
      const p = mesh(cap(0.16, 0.035), hairMat, c.x, c.y - 0.05, c.z - r - 0.04);
      p.rotation.x = 0.35;
      g.add(p, mesh(new THREE.SphereGeometry(0.04, 10, 8), hairMat, c.x, c.y + 0.03, c.z - r - 0.005));
    } else if (ex === 'pigtails') {
      for (const s of [-1, 1]) {
        const p = mesh(cap(0.12, 0.03), hairMat, c.x + s * (r + 0.02), c.y - 0.06, c.z - 0.03);
        p.rotation.z = s * 0.3;
        g.add(p, mesh(new THREE.SphereGeometry(0.035, 10, 8), hairMat, c.x + s * (r - 0.005), c.y + 0.015, c.z - 0.03));
      }
    } else if (ex === 'topbun') {
      g.add(mesh(new THREE.SphereGeometry(0.055, 12, 10), hairMat, c.x, c.y + r + 0.03, c.z - 0.03));
    } else if (ex === 'puff') {
      const p = mesh(new THREE.IcosahedronGeometry(0.08, 2), hairMat, c.x, c.y + r * 0.7, c.z - r * 0.7);
      g.add(p);
    } else if (ex === 'afro') {
      const p = mesh(new THREE.IcosahedronGeometry(r * 1.45, 2), hairMat, c.x, c.y + 0.035, c.z - 0.03);
      p.scale.set(1, 0.92, 0.95);
      g.add(p);
    } else if (ex === 'braids') {
      for (const s of [-1, 1]) {
        const p = mesh(cap(0.24, 0.022), hairMat, c.x + s * 0.06, c.y - 0.16, c.z - r * 0.75);
        p.rotation.x = 0.2;
        g.add(p);
      }
    } else if (ex === 'highpony') {
      g.add(mesh(new THREE.SphereGeometry(0.04, 10, 8), hairMat, c.x, c.y + r * 0.75, c.z - r * 0.55));
      const p = mesh(cap(0.2, 0.034), hairMat, c.x, c.y + r * 0.3, c.z - r - 0.07);
      p.rotation.x = 0.5;
      g.add(p);
    } else if (ex === 'sidepony') {
      g.add(mesh(new THREE.SphereGeometry(0.036, 10, 8), hairMat, c.x + r * 0.85, c.y + 0.02, c.z - 0.04));
      const p = mesh(cap(0.18, 0.032), hairMat, c.x + r + 0.05, c.y - 0.1, c.z - 0.04);
      p.rotation.z = 0.25;
      g.add(p);
    } else if (ex === 'mohawk') {
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36;
        const spike = mesh(new THREE.ConeGeometry(0.022, 0.08, 6), hairMat, c.x, c.y + Math.cos(a) * (r + 0.02), c.z + Math.sin(a) * (r + 0.02));
        spike.rotation.x = a;
        g.add(spike);
      }
    } else if (ex === 'backbow') {
      const wing = new THREE.ConeGeometry(0.035, 0.08, 10);
      const red = solid('#e53e3e');
      const a = mesh(wing, red, c.x - 0.04, c.y + 0.02, c.z - r - 0.01);
      a.rotation.z = Math.PI / 2;
      const b = mesh(wing, red, c.x + 0.04, c.y + 0.02, c.z - r - 0.01);
      b.rotation.z = -Math.PI / 2;
      g.add(a, b);
    }
  }
  return g;
}

function glasses(body: BodyType): THREE.Object3D {
  const { c, r } = headInfo(body);
  const g = new THREE.Group();
  const frame = solid('#1a202c', { rough: 0.4 });
  const eyeY = c.y - 0.012;
  const z = c.z + r * 0.93;
  for (const s of [-1, 1]) g.add(mesh(new THREE.TorusGeometry(0.022, 0.0035, 6, 18), frame, c.x + s * 0.032, eyeY, z));
  g.add(mesh(new THREE.BoxGeometry(0.02, 0.004, 0.004), frame, c.x, eyeY + 0.005, z));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.004, 0.004, 0.1), frame, c.x + s * 0.055, eyeY + 0.004, z - 0.05));
  return g;
}

export function buildAccessories(look: Look, body: BodyType, hairMat: THREE.Material, wearsGlasses: boolean): Attachment[] {
  const out: Attachment[] = [];
  const add = (bone: AttachBone, o: THREE.Object3D | null) => o && out.push({ bone, object: o });
  if (look.hat) add('Head', hat(look.hat, body));
  if (look.backpack) add('spine_03', backpack(look.backpack, body));
  add('pelvis', bottomExtras(look.bottom, body));
  out.push(...topExtras(look.top, body));
  add('Head', hairExtras(look.hair, hairMat, body));
  if (wearsGlasses) add('Head', glasses(body));
  return out;
}
