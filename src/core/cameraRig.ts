import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../util/math';
import type { Colliders } from '../world/colliders';

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();

/**
 * Third-person orbit camera. Drag turns it, it pulls in when a wall is in the way,
 * and it can switch to a front-facing "showcase" view for the avatar creator.
 */
export class CameraRig {
  yaw = Math.PI;
  pitch = 0.32;
  dist = 4.6;
  minDist = 2.2;
  maxDist = 8;
  mode: 'follow' | 'showcase' | 'look' = 'follow';
  /** Showcase: which side of the screen the subject sits on, as a fraction of width (0.5 = center). */
  showcaseCenter = 0.3;
  private target = new THREE.Vector3();
  private shownDist = 4.6;
  private lookAt = new THREE.Vector3();
  private lookFrom = new THREE.Vector3();
  private snap = true;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  rotate(dx: number, dy: number) {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch + dy * 0.005, -0.25, 1.15);
  }

  zoomBy(z: number) {
    this.dist = clamp(this.dist + z, this.minDist, this.maxDist);
  }

  /** Puts the camera behind a facing direction right away. */
  behind(yaw: number) {
    this.yaw = yaw + Math.PI;
    this.snap = true;
  }

  /** Fixed shot used for cut-scenes, such as a teacher talking. */
  look(from: THREE.Vector3, at: THREE.Vector3) {
    this.mode = 'look';
    this.lookFrom.copy(from);
    this.lookAt.copy(at);
  }

  update(dt: number, focus: THREE.Vector3, focusYaw: number, height: number, colliders: Colliders) {
    const cam = this.camera;
    if (this.mode === 'showcase') {
      const d = 2.6;
      const fy = focus.y + height * 0.55;
      cam.position.set(focus.x + Math.sin(focusYaw) * d, fy + 0.15, focus.z + Math.cos(focusYaw) * d);
      cam.lookAt(focus.x, fy, focus.z);
      this.applyOffset();
      return;
    }
    cam.clearViewOffset();
    if (this.mode === 'look') {
      cam.position.lerp(this.lookFrom, 1 - Math.exp(-6 * dt));
      cam.lookAt(this.lookAt);
      this.snap = true;
      return;
    }
    const tx = focus.x;
    const ty = focus.y + height * 0.82;
    const tz = focus.z;
    if (this.snap) {
      this.target.set(tx, ty, tz);
      this.snap = false;
    } else {
      this.target.x = damp(this.target.x, tx, 14, dt);
      this.target.y = damp(this.target.y, ty, 8, dt);
      this.target.z = damp(this.target.z, tz, 14, dt);
    }
    _dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    _origin.copy(this.target);
    const hit = colliders.raycast(_origin, _dir, this.dist + 0.3);
    const want = Math.max(0.6, Math.min(this.dist, hit - 0.3));
    // Pull in fast, ease back out slowly.
    this.shownDist = want < this.shownDist ? want : damp(this.shownDist, want, 3, dt);
    cam.position.copy(this.target).addScaledVector(_dir, this.shownDist);
    if (cam.position.y < 0.3) cam.position.y = 0.3;
    cam.lookAt(this.target);
  }

  /** Slowly swings the camera behind the player while running, like most mobile games. */
  autoFollow(dt: number, moveYaw: number, speed01: number) {
    if (speed01 < 0.3) return;
    this.yaw = dampAngle(this.yaw, moveYaw + Math.PI, 0.6 * speed01, dt);
  }

  private applyOffset() {
    const cam = this.camera;
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    const s = w / 2 - w * this.showcaseCenter;
    cam.setViewOffset(w + 2 * s, hgt, 2 * s, 0, w, hgt);
  }
}
