import * as THREE from 'three';
import { GRAVITY, JUMP_VELOCITY, RUN_SPEED, WALK_SPEED } from '../config';
import { damp, dampAngle } from '../util/math';
import type { Colliders } from '../world/colliders';
import type { Seat } from '../world/world';
import type { AnimName, Character } from './character';

const _v = new THREE.Vector3();

/** The character you control. */
export class Player {
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  onGround = true;
  /** Locked players ignore the joystick (seated, in a cut-scene, on the monkey bars). */
  locked = false;
  seat: Seat | null = null;
  /** World-space move direction used while the joystick is idle (kickball base running). */
  steer: THREE.Vector3 | null = null;
  speedMult = 1;
  jumpMult = 1;
  /** Horizontal speed this frame, m/s. */
  speed = 0;
  readonly radius = 0.28;

  constructor(public char: Character) {}

  teleport(p: THREE.Vector3, yaw: number) {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.sync();
  }

  sit(seat: Seat, pose: AnimName = 'sit') {
    this.stand();
    seat.taken = this;
    this.seat = seat;
    this.locked = true;
    this.teleport(seat.pos, seat.yaw);
    this.char.pose = pose;
  }

  stand() {
    if (this.seat) {
      const s = this.seat;
      s.taken = null;
      this.seat = null;
      // step out from the chair, away from the table
      this.pos.x -= Math.sin(s.yaw) * 0.55;
      this.pos.z -= Math.cos(s.yaw) * 0.55;
      this.sync();
    }
    this.char.pose = null;
    this.locked = false;
  }

  /** `dir` is the wanted move direction in world space with length 0..1. */
  update(dt: number, dir: THREE.Vector3, jump: boolean, colliders: Colliders) {
    if (this.locked) {
      // Hops still work while locked in place (PE moves); seats and the monkey bars keep vel.y at 0.
      if (this.vel.y !== 0 && !this.seat) {
        this.vel.y -= GRAVITY * dt;
        this.pos.y += this.vel.y * dt;
        if (this.pos.y <= 0) {
          this.pos.y = 0;
          this.vel.y = 0;
          this.onGround = true;
        }
      }
      this.speed = 0;
      this.char.updateMotion(0, this.pos.y > 0.25);
      this.sync();
      return;
    }
    const mag = Math.min(1, dir.length());
    const top = (mag < 0.7 ? WALK_SPEED * (mag / 0.7) : RUN_SPEED) * this.speedMult;
    _v.copy(dir);
    if (mag > 0.01) _v.multiplyScalar(top / mag);
    const accel = this.onGround ? 12 : 4;
    this.vel.x = damp(this.vel.x, _v.x, accel, dt);
    this.vel.z = damp(this.vel.z, _v.z, accel, dt);
    if (mag > 0.05) this.yaw = dampAngle(this.yaw, Math.atan2(dir.x, dir.z), 12, dt);
    if (jump && this.onGround) {
      this.vel.y = JUMP_VELOCITY * this.jumpMult;
      this.onGround = false;
      this.char.playOnce('jumpStart', 0.08, 2.2);
    }
    this.vel.y -= GRAVITY * dt;
    this.pos.addScaledVector(this.vel, dt);
    const ground = colliders.collide(this.pos, this.radius, 1.3, 0.35);
    if (this.pos.y <= ground) {
      if (!this.onGround && this.vel.y < -6) this.char.playOnce('land', 0.05, 2.5);
      this.pos.y = ground;
      this.vel.y = 0;
      this.onGround = true;
    } else if (this.pos.y > ground + 0.05) {
      this.onGround = false;
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    this.char.updateMotion(this.speed, !this.onGround && this.pos.y > ground + 0.25);
    this.sync();
  }

  sync() {
    this.char.root.position.copy(this.pos);
    this.char.root.rotation.y = this.yaw;
  }
}
