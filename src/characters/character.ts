import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ADULT_SCALE, KID_SCALE } from '../config';
import { HAIR_BY_ID, HAIR_NATIVE_BODY } from '../content/clothing';
import type { Avatar, Look } from '../core/save';
import { buildAccessories, headInfo, type AttachBone } from './accessories';
import { getAssets, type BodyType } from './assets';
import { applyLookUniforms, makeBodyMaterial, makeEyeMaterial } from './lookShader';

/** Friendly names for the animation clips in public/models/anims.glb. */
export const ANIM = {
  idle: 'Idle_Loop',
  walk: 'Walk_Loop',
  run: 'Jog_Fwd_Loop',
  sprint: 'Sprint_Loop',
  jumpStart: 'Jump_Start',
  jump: 'Jump_Loop',
  land: 'Jump_Land',
  sit: 'Sitting_Idle_Loop',
  sitTalk: 'Sitting_Talking_Loop',
  sitEnter: 'Sitting_Enter',
  talk: 'Idle_Talking_Loop',
  dance: 'Dance_Loop',
  eat: 'Consume',
  yes: 'Yes',
  no: 'Idle_No_Loop',
  fold: 'Idle_FoldArms_Loop',
  phone: 'Idle_TalkingPhone_Loop',
  throw: 'OverhandThrow',
  interact: 'Interact',
  pickup: 'PickUp_Table',
  crouch: 'Crouch_Idle_Loop',
  punch: 'Punch_Jab',
  punch2: 'Punch_Cross',
  roll: 'Roll',
  ninja: 'NinjaJump_Start',
  slide: 'Slide_Loop',
  carry: 'Walk_Carry_Loop',
  spell: 'Spell_Simple_Shoot',
} as const;
export type AnimName = keyof typeof ANIM;

/** Animation playback speeds in meters per second at scale 1. */
const WALK_ANIM_SPEED = 1.45;
/** Kids' arms and shoulders relative to the adult rig. */
const KID_ARM_SCALE = 0.9;
const RUN_ANIM_SPEED = 3.3;

export interface Appearance {
  body: BodyType;
  skin: string;
  eyes: string;
  freckles: boolean;
  glasses: boolean;
  height: number;
  build: number;
}

export function appearanceOf(a: Avatar): Appearance {
  return { body: a.body, skin: a.skin, eyes: a.eyes, freckles: a.freckles, glasses: a.glasses, height: a.height, build: a.build };
}

const tmpM = new THREE.Matrix4();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _qw = new THREE.Quaternion();
const _qp = new THREE.Quaternion();

export class Character {
  readonly root = new THREE.Group();
  private model!: THREE.Object3D;
  private bodyMat!: THREE.MeshStandardMaterial;
  private eyeMat!: THREE.MeshStandardMaterial;
  private hairMat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide });
  private bones = new Map<string, THREE.Bone>();
  private attach = new Map<AttachBone, THREE.Group>();
  private hairMesh: THREE.Mesh | null = null;
  private extras: THREE.Object3D[] = [];
  private spinners: THREE.Object3D[] = [];
  private mixer!: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;
  private currentName = '';
  private oneShot: { action: THREE.AnimationAction; until: number } | null = null;
  private time = 0;
  private kickT = -1;
  private shadow: THREE.Mesh;
  appearance!: Appearance;
  look!: Look;
  readonly kid: boolean;
  /** Overrides locomotion with a looping pose such as 'sit' or 'dance'. */
  pose: AnimName | null = null;
  /** 0..1: raises both arms straight up (hanging on bars, cheering). */
  armsUp = 0;
  name = '';

  constructor(appearance: Appearance, look: Look, kid = true) {
    this.kid = kid;
    this.shadow = new THREE.Mesh(blobGeo, blobMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.renderOrder = -1;
    this.root.add(this.shadow);
    this.setAppearance(appearance);
    this.setLook(look);
  }

  get scale() {
    return (this.kid ? KID_SCALE : ADULT_SCALE) * this.appearance.height;
  }

  /** Rebuilds the body. Use only when the body type changes; skin and face changes are cheap. */
  setAppearance(a: Appearance) {
    const bodyChanged = !this.appearance || this.appearance.body !== a.body;
    this.appearance = a;
    if (bodyChanged) this.buildBody();
    const s = this.scale;
    this.model.scale.set(s * a.build, s, s * a.build);
    (this.eyeMat.userData.eye.uEye.value as THREE.Color).set(a.eyes);
    if (this.look) this.setLook(this.look);
    this.shadow.scale.setScalar(s * a.build);
  }

  private buildBody() {
    if (this.model) {
      this.root.remove(this.model);
      this.mixer.stopAllAction();
    }
    const asset = getAssets().bodies[this.appearance.body];
    this.model = SkeletonUtils.clone(asset.gltf.scene);
    this.bones.clear();
    this.model.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones.set(o.name, o as THREE.Bone);
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) {
        m.frustumCulled = false;
        const src = m.material as THREE.MeshStandardMaterial;
        if (src.name.startsWith('MI_Superhero')) {
          this.bodyMat = makeBodyMaterial(src, this.appearance.body);
          m.material = this.bodyMat;
        } else if (src.name === 'MI_Eyes') {
          this.eyeMat = makeEyeMaterial(src);
          m.material = this.eyeMat;
        } else {
          this.hairMat.map = src.map;
          m.material = this.hairMat; // eyebrows
        }
      }
    });
    // Kids: bigger heads for their size, narrower shoulders and slimmer arms, and a smoother build
    // (the source bodies are adult superheroes). Adults keep some of their muscle detail.
    if (this.kid) {
      this.bones.get('Head')?.scale.setScalar(1.12);
      for (const side of ['l', 'r']) this.bones.get(`clavicle_${side}`)?.scale.setScalar(KID_ARM_SCALE);
    }
    this.bodyMat.userData.look.uSmooth.value = this.kid ? 1 : 0.55;
    this.attach.clear();
    for (const name of ['Head', 'spine_03', 'pelvis'] as AttachBone[]) {
      const bone = this.bones.get(name)!;
      const g = new THREE.Group();
      g.matrixAutoUpdate = false;
      g.matrix.copy(asset.rest.get(name)!).invert();
      bone.add(g);
      this.attach.set(name, g);
    }
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions.clear();
    this.current = null;
    this.currentName = '';
    this.hairMesh = null;
    this.extras = [];
  }

  setLook(look: Look) {
    this.look = structuredClone(look);
    applyLookUniforms(this.bodyMat, look, this.appearance.skin, this.appearance.freckles);
    this.hairMat.color.set(look.hairColor);
    // hair
    if (this.hairMesh) this.hairMesh.removeFromParent();
    this.hairMesh = null;
    const style = HAIR_BY_ID.get(look.hair);
    if (style?.mesh) {
      const src = getAssets().hair.get(style.mesh);
      if (src) {
        let geo = src.geometry;
        if (style.clipBelow !== undefined) geo = clipGeometry(geo, headInfo(HAIR_NATIVE_BODY[style.mesh] ?? 'f').c.y + style.clipBelow);
        this.hairMat.map = (src.material as THREE.MeshStandardMaterial).map;
        this.hairMat.needsUpdate = true;
        const m = new THREE.Mesh(geo, this.hairMat);
        const native = HAIR_NATIVE_BODY[style.mesh] ?? 'f';
        if (native !== this.appearance.body) {
          const from = headInfo(native);
          const to = headInfo(this.appearance.body);
          const s = to.r / from.r;
          m.matrixAutoUpdate = false;
          m.matrix.makeTranslation(to.c.x, to.c.y, to.c.z).multiply(tmpM.makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(-from.c.x, -from.c.y, -from.c.z));
        }
        this.attach.get('Head')!.add(m);
        this.hairMesh = m;
      }
    }
    // accessories
    for (const e of this.extras) e.removeFromParent();
    this.extras = [];
    this.spinners = [];
    for (const a of buildAccessories(look, this.appearance.body, this.hairMat, this.appearance.glasses)) {
      this.attach.get(a.bone)!.add(a.object);
      this.extras.push(a.object);
      a.object.traverse((o) => o.userData.spin && this.spinners.push(o));
    }
  }

  private action(name: AnimName) {
    let a = this.actions.get(name);
    if (!a) {
      const clip = getAssets().bodies[this.appearance.body].clips.get(ANIM[name]);
      if (!clip) throw new Error('missing clip ' + name);
      a = this.mixer.clipAction(clip);
      this.actions.set(name, a);
    }
    return a;
  }

  private fadeTo(name: AnimName, fade = 0.2, timeScale = 1) {
    const next = this.action(name);
    next.timeScale = timeScale;
    if (this.current === next) return;
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = next;
    this.currentName = name;
  }

  /** Plays a clip once, then returns to locomotion. */
  playOnce(name: AnimName, fade = 0.15, timeScale = 1) {
    const a = this.action(name);
    a.reset().setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.timeScale = timeScale;
    a.fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = null;
    this.currentName = '';
    this.oneShot = { action: a, until: this.time + a.getClip().duration / timeScale - fade };
  }

  get busy() {
    return !!this.oneShot;
  }

  kick() {
    this.kickT = 0;
  }

  /** speed in m/s on the ground; airborne switches to the jump loop. */
  updateMotion(speed: number, airborne = false) {
    if (this.oneShot) return;
    if (this.pose) return this.fadeTo(this.pose, 0.3);
    if (airborne) return this.fadeTo('jump', 0.15);
    const s = this.scale;
    if (speed < 0.15) this.fadeTo('idle', 0.25);
    else if (speed < 2.6 * s) this.fadeTo('walk', 0.2, Math.max(0.5, speed / (WALK_ANIM_SPEED * s)));
    else this.fadeTo('run', 0.2, Math.max(0.7, speed / (RUN_ANIM_SPEED * s)));
  }

  update(dt: number) {
    this.time += dt;
    if (this.oneShot && this.time >= this.oneShot.until) {
      const a = this.oneShot.action;
      this.oneShot = null;
      a.fadeOut(0.2);
      this.current = null;
      this.updateMotion(0);
    }
    this.mixer.update(dt);
    if (this.kickT >= 0) {
      this.kickT += dt;
      const t = this.kickT / 0.35;
      const thigh = this.bones.get('thigh_r');
      if (thigh) thigh.rotateX(-Math.sin(Math.min(t, 1) * Math.PI) * 1.1 + (t < 0.3 ? Math.sin((t / 0.3) * Math.PI) * 0.5 : 0));
      if (t >= 1) this.kickT = -1;
    }
    if (this.armsUp > 0) this.raiseArms();
    for (const s of this.spinners) s.rotation.y += s.userData.spin * dt;
  }

  /** Points each arm segment upward by rotating it in world space, so it works for any bone axes. */
  private raiseArms() {
    this.model.updateMatrixWorld(true);
    for (const side of ['l', 'r']) {
      const out = side === 'l' ? 1 : -1;
      for (const [a, b] of [[`upperarm_${side}`, `lowerarm_${side}`], [`lowerarm_${side}`, `hand_${side}`]]) {
        const bone = this.bones.get(a);
        const child = this.bones.get(b);
        if (!bone || !child || !bone.parent) continue;
        const p0 = bone.getWorldPosition(_a);
        const p1 = child.getWorldPosition(_b);
        const cur = _c.subVectors(p1, p0).normalize();
        // up and slightly out to the side, in the character's frame
        const want = _d.set(out * 0.18, 1, 0).applyQuaternion(this.root.quaternion).normalize();
        const delta = _q.setFromUnitVectors(cur, want);
        if (this.armsUp < 1) delta.slerp(_qi, 1 - this.armsUp);
        bone.getWorldQuaternion(_qw);
        _qw.premultiply(delta);
        bone.parent.getWorldQuaternion(_qp);
        bone.quaternion.copy(_qp.invert().multiply(_qw));
        bone.updateMatrixWorld(true);
      }
    }
  }

  get animName() {
    return this.currentName;
  }

  /** World position of a bone, such as the right foot for kicks. */
  bonePosition(name: string, out = new THREE.Vector3()) {
    const b = this.bones.get(name);
    return b ? b.getWorldPosition(out) : out.copy(this.root.position);
  }

  get headHeight() {
    return 1.8 * this.scale;
  }

  dispose() {
    this.root.removeFromParent();
    this.mixer.stopAllAction();
    this.bodyMat.dispose();
    this.eyeMat.dispose();
    this.hairMat.dispose();
  }
}

/** Removes triangles below a height, for shorter cuts made from long hair. */
function clipGeometry(src: THREE.BufferGeometry, minY: number) {
  const key = `clip${minY.toFixed(3)}`;
  const cached = src.userData[key] as THREE.BufferGeometry | undefined;
  if (cached) return cached;
  const geo = src.clone();
  const pos = geo.getAttribute('position');
  const idx = geo.getIndex()!;
  const keep: number[] = [];
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
    if (Math.min(pos.getY(a), pos.getY(b), pos.getY(c)) >= minY) keep.push(a, b, c);
  }
  geo.setIndex(keep);
  src.userData[key] = geo;
  return geo;
}

const blobGeo = new THREE.CircleGeometry(0.42, 20);
const blobMat = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
})();
