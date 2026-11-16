import * as THREE from 'three';
import { damp, dampAngle } from '../util/math';
import type { Colliders } from '../world/colliders';
import type { Nav } from '../world/nav';
import type { Seat, Spot } from '../world/world';
import type { AnimName, Character } from './character';

export interface GoOpts {
  run?: boolean;
  /** Face this way on arrival. */
  face?: number;
  onArrive?: () => void;
  /** Pose to hold on arrival, such as 'talk' or 'fold'. */
  pose?: AnimName | null;
}

const _d = new THREE.Vector3();
const _probe = new THREE.Vector3();

/** Little things people do when nothing else is telling them what to do. */
const ADULT_FIDGETS: { anim: AnimName; hold?: number }[] = [
  { anim: 'yes' },
  { anim: 'interact' },
  { anim: 'talk', hold: 3 },
  { anim: 'fold', hold: 4 },
];
const KID_FIDGETS: { anim: AnimName; hold?: number }[] = [{ anim: 'yes' }, { anim: 'talk', hold: 2.5 }, { anim: 'fold', hold: 3 }, { anim: 'interact' }];
/** How far adults wander from where they were put, in meters. */
const STROLL_RADIUS = 1.3;

/** A computer-controlled person: teachers, parents, and AI kids. */
export class Npc {
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  /** Walking speed in m/s; running is twice as fast. */
  walkSpeed = 1.3;
  /** When set, the NPC moves at this velocity instead of following a path (sports AI). */
  steer: THREE.Vector3 | null = null;
  seat: Seat | null = null;
  /** Set by the current activity so the classmates director leaves this NPC alone. */
  busy = false;
  /** Seconds the NPC has been unable to make progress. */
  private stuck = 0;
  private path: THREE.Vector3[] = [];
  private opts: GoOpts = {};
  private lastDist = Infinity;
  /** Where the current trip ends. */
  readonly dest = new THREE.Vector3();
  moving = false;
  /** Vertical velocity for hops. */
  private vy = 0;
  /** Fidget and (adults) take short strolls when idle, so nobody stands frozen. */
  ambient = true;
  private home = new THREE.Vector3();
  private homeYaw = 0;
  private idleT = 2 + Math.random() * 4;
  private strolling = false;
  private fidgetPose: AnimName | null = null;
  private fidgetUntil = 0;
  private clock = 0;

  constructor(public char: Character, public id: string) {}

  get name() {
    return this.char.name;
  }

  place(p: THREE.Vector3, yaw: number) {
    this.leaveSeat();
    this.pos.copy(p);
    this.yaw = yaw;
    this.home.copy(p);
    this.homeYaw = yaw;
    this.strolling = false;
    this.path = [];
    this.moving = false;
    this.sync();
  }

  placeAt(s: Spot, pose: AnimName | null = null) {
    this.place(s.pos, s.yaw);
    this.char.pose = pose;
  }

  goTo(dest: THREE.Vector3, nav: Nav, opts: GoOpts = {}) {
    this.strolling = false;
    this.leaveSeat();
    this.char.pose = null;
    this.dest.copy(dest);
    this.path = nav.path(this.pos, dest);
    this.opts = opts;
    this.moving = true;
    this.stuck = 0;
    this.lastDist = Infinity;
  }

  /** Walks to a seat and sits down. */
  goSit(seat: Seat, nav: Nav, pose: AnimName = 'sit', onSat?: () => void, run = false) {
    seat.taken = this;
    this.goTo(seat.pos, nav, {
      run,
      onArrive: () => {
        this.sitNow(seat, pose);
        onSat?.();
      },
    });
  }

  sitNow(seat: Seat, pose: AnimName = 'sit') {
    this.leaveSeat();
    seat.taken = this;
    this.seat = seat;
    this.pos.copy(seat.pos);
    this.yaw = seat.yaw;
    this.path = [];
    this.moving = false;
    this.char.pose = pose;
    this.sync();
  }

  leaveSeat() {
    if (this.seat) {
      if (this.seat.taken === this) this.seat.taken = null;
      this.seat = null;
      this.char.pose = null;
    }
  }

  hop() {
    if (this.pos.y <= 0.001) this.vy = 4.5;
  }

  /** Skips the walk and jumps to the end of the current trip. */
  finishTrip() {
    if (!this.moving) return;
    this.pos.copy(this.dest);
    this.path = [];
    this.arrive();
  }

  private arrive() {
    this.moving = false;
    // a real trip (not a stroll) sets a new spot to hang around
    if (!this.strolling) {
      this.home.copy(this.pos);
      this.homeYaw = this.opts.face ?? this.yaw;
    }
    this.strolling = false;
    if (this.opts.face !== undefined) this.yaw = this.opts.face;
    if (this.opts.pose !== undefined) this.char.pose = this.opts.pose;
    const cb = this.opts.onArrive;
    this.opts = {};
    cb?.();
  }

  update(dt: number, colliders: Colliders, far: boolean) {
    let speed = 0;
    if (this.steer) {
      this.vel.x = damp(this.vel.x, this.steer.x, 8, dt);
      this.vel.z = damp(this.vel.z, this.steer.z, 8, dt);
      this.pos.addScaledVector(this.vel, dt);
      speed = Math.hypot(this.vel.x, this.vel.z);
      if (speed > 0.2) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 10, dt);
      colliders.collide(this.pos, 0.26, 1.2, 0.3);
    } else if (this.moving) {
      if (far) return this.finishTrip();
      const target = this.path[0];
      _d.subVectors(target, this.pos).setY(0);
      const dist = _d.length();
      const last = this.path.length === 1;
      if (dist < (last ? 0.12 : 0.5)) {
        this.path.shift();
        if (!this.path.length) {
          this.pos.x = target.x;
          this.pos.z = target.z;
          this.vel.set(0, 0, 0);
          this.arrive();
        }
      } else {
        const sp = this.walkSpeed * (this.opts.run ? 2.1 : 1) * Math.min(1, last ? dist / 0.6 + 0.3 : 1);
        _d.multiplyScalar(sp / dist);
        this.vel.x = damp(this.vel.x, _d.x, 10, dt);
        this.vel.z = damp(this.vel.z, _d.z, 10, dt);
        this.pos.addScaledVector(this.vel, dt);
        speed = Math.hypot(this.vel.x, this.vel.z);
        this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 9, dt);
        // Unstick: if not getting closer for a while, skip ahead.
        if (dist < this.lastDist - 0.01) {
          this.lastDist = dist;
          this.stuck = 0;
        } else if ((this.stuck += dt) > 2.5) {
          this.pos.copy(target);
          this.lastDist = Infinity;
          this.stuck = 0;
        }
      }
    } else if (this.opts.face === undefined && this.char.pose === null) {
      this.vel.set(0, 0, 0);
    }
    if (this.vy !== 0 || this.pos.y > 0) {
      this.vy -= 16 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) {
        this.pos.y = 0;
        this.vy = 0;
      }
    }
    if (!far) this.ambientUpdate(dt, colliders);
    if (!far) this.char.updateMotion(speed, this.pos.y > 0.25);
    this.sync();
  }

  /** Stops any fidget or stroll so an activity can take over (a teacher starting the lesson). */
  settle() {
    if (this.fidgetPose && this.char.pose === this.fidgetPose) this.char.pose = null;
    this.fidgetPose = null;
    if (this.strolling) {
      this.strolling = false;
      this.moving = false;
      this.path = [];
      this.vel.set(0, 0, 0);
    }
  }

  /** Idle behavior: every few seconds, gesture or (adults) step somewhere nearby and back. */
  private ambientUpdate(dt: number, colliders: Colliders) {
    this.clock += dt;
    if (this.fidgetPose && this.clock >= this.fidgetUntil) {
      if (this.char.pose === this.fidgetPose) this.char.pose = null;
      this.fidgetPose = null;
    }
    if (!this.ambient || this.moving || this.steer || this.seat || this.char.pose !== null || this.char.busy || this.pos.y > 0.01) return;
    if ((this.idleT -= dt) > 0) return;
    const kid = this.char.kid;
    this.idleT = (kid ? 4 : 3) + Math.random() * 5;
    const awayFromHome = this.pos.distanceTo(this.home) > 0.3;
    if (!kid && (awayFromHome ? Math.random() < 0.7 : Math.random() < 0.45)) {
      const to = awayFromHome ? this.home.clone() : this.strollTarget(colliders);
      if (to) {
        this.strolling = true;
        this.path = [to];
        this.dest.copy(to);
        this.opts = { face: awayFromHome ? this.homeYaw : Math.random() * Math.PI * 2 };
        this.moving = true;
        this.stuck = 0;
        this.lastDist = Infinity;
        return;
      }
    }
    const list = kid ? KID_FIDGETS : ADULT_FIDGETS;
    const f = list[Math.floor(Math.random() * list.length)];
    if (f.hold) {
      this.char.pose = f.anim;
      this.fidgetPose = f.anim;
      this.fidgetUntil = this.clock + f.hold;
    } else this.char.playOnce(f.anim);
  }

  /** A nearby open spot within STROLL_RADIUS of home, with nothing solid in the way. */
  private strollTarget(colliders: Colliders) {
    for (let tries = 0; tries < 5; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.6 + Math.random() * (STROLL_RADIUS - 0.6);
      const to = new THREE.Vector3(this.home.x + Math.sin(a) * r, 0, this.home.z + Math.cos(a) * r);
      let clear = true;
      for (let k = 1; k <= 4 && clear; k++) {
        _probe.lerpVectors(this.pos, to, k / 4).setY(0);
        const x = _probe.x, z = _probe.z;
        colliders.collide(_probe, 0.3, 1.2, 0.3);
        if (Math.hypot(_probe.x - x, _probe.z - z) > 0.01) clear = false;
      }
      if (clear) return to;
    }
    return null;
  }

  facePoint(p: THREE.Vector3) {
    this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
    this.sync();
  }

  sync() {
    this.char.root.position.copy(this.pos);
    this.char.root.rotation.y = this.yaw;
  }
}
