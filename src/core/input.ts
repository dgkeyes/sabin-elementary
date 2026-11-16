import { h } from '../util/dom';

/**
 * Roblox-style touch controls:
 *  - touch the left part of the screen to get a joystick where your thumb lands
 *  - drag anywhere else to turn the camera (two fingers pinch to zoom)
 *  - the jump button sits bottom right
 * Keyboard (WASD/arrows, space, E) works too, for testing on a computer.
 */
export class Input {
  /** Joystick: x right, y forward, length 0..1. */
  readonly move = { x: 0, y: 0 };
  camDX = 0;
  camDY = 0;
  zoom = 0;
  private jumpQueued = false;
  private actionQueued = false;
  enabled = true;
  /** Hide the joystick and ignore movement, for seated scenes. */
  moveEnabled = true;

  private stickId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private camPointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private keys = new Set<string>();
  private base: HTMLElement;
  private knob: HTMLElement;
  private hint: HTMLElement;
  readonly jumpBtn: HTMLButtonElement;
  /** Taps that do not move are reported here, for tapping things in the world. */
  onTapWorld: ((x: number, y: number) => void) | null = null;
  private tapStart = new Map<number, { x: number; y: number; t: number }>();

  constructor(surface: HTMLElement, ui: HTMLElement) {
    this.knob = h('div', { class: 'stick-knob' });
    this.base = h('div', { class: 'stick-base', style: 'display:none' }, this.knob);
    this.hint = h('div', { class: 'stick-base stick-hint' }, h('div', { class: 'stick-knob' }));
    this.jumpBtn = h('button', { class: 'round-btn jump-btn' }, 'Jump');
    ui.append(this.base, this.hint);

    surface.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveEv(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    this.jumpBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.jumpQueued = true;
      this.jumpBtn.classList.add('pressed');
    });
    this.jumpBtn.addEventListener('pointerup', () => this.jumpBtn.classList.remove('pressed'));
    this.jumpBtn.addEventListener('pointercancel', () => this.jumpBtn.classList.remove('pressed'));
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (e.code === 'Space') this.jumpQueued = true;
      if (e.code === 'KeyE' || e.code === 'Enter') this.actionQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());
    this.layoutHint();
    window.addEventListener('resize', () => this.layoutHint());
  }

  private layoutHint() {
    this.hint.style.left = `calc(var(--safe-left) + 110px)`;
    this.hint.style.top = `calc(100% - var(--safe-bottom) - 110px)`;
  }

  private down(e: PointerEvent) {
    if (!this.enabled) return;
    this.tapStart.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    const w = window.innerWidth;
    if (this.moveEnabled && this.stickId === null && e.clientX < w * 0.42 && e.clientY > window.innerHeight * 0.3) {
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.base.style.display = 'block';
      this.base.style.left = e.clientX + 'px';
      this.base.style.top = e.clientY + 'px';
      this.knob.style.transform = '';
      this.hint.style.display = 'none';
    } else {
      this.camPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.camPointers.size === 2) this.pinchDist = this.pinchSpan();
    }
  }

  private pinchSpan() {
    const [a, b] = [...this.camPointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private moveEv(e: PointerEvent) {
    if (e.pointerId === this.stickId) {
      const max = 60;
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        // drag the base along so the stick never feels stuck
        const over = len - max;
        this.stickOrigin.x += (dx / len) * over;
        this.stickOrigin.y += (dy / len) * over;
        this.base.style.left = this.stickOrigin.x + 'px';
        this.base.style.top = this.stickOrigin.y + 'px';
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / max;
      this.move.y = -dy / max;
      return;
    }
    const p = this.camPointers.get(e.pointerId);
    if (!p) return;
    if (this.camPointers.size >= 2) {
      p.x = e.clientX;
      p.y = e.clientY;
      const d = this.pinchSpan();
      this.zoom += (this.pinchDist - d) * 0.02;
      this.pinchDist = d;
      return;
    }
    this.camDX += e.clientX - p.x;
    this.camDY += e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
  }

  private up(e: PointerEvent) {
    const start = this.tapStart.get(e.pointerId);
    this.tapStart.delete(e.pointerId);
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.move.x = this.move.y = 0;
      this.base.style.display = 'none';
      if (this.moveEnabled) this.hint.style.display = '';
    }
    if (this.camPointers.delete(e.pointerId) && start && this.onTapWorld) {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 12 && performance.now() - start.t < 400) this.onTapWorld(e.clientX, e.clientY);
    }
  }

  reset() {
    this.stickId = null;
    this.move.x = this.move.y = 0;
    this.camPointers.clear();
    this.keys.clear();
    this.base.style.display = 'none';
  }

  setMoveEnabled(on: boolean) {
    if (on === this.moveEnabled) return;
    this.moveEnabled = on;
    if (!on) {
      this.stickId = null;
      this.move.x = this.move.y = 0;
      this.base.style.display = 'none';
    }
    this.hint.style.display = on ? '' : 'none';
    this.jumpBtn.style.visibility = on ? '' : 'hidden';
  }

  /** Joystick or keyboard movement, length 0..1. */
  readMove() {
    let x = this.move.x;
    let y = this.move.y;
    if (this.keys.size) {
      const k = this.keys;
      const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const ky = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      if (kx || ky) {
        const walk = k.has('ShiftLeft') || k.has('ShiftRight') ? 0.5 : 1;
        const l = Math.hypot(kx, ky);
        x = (kx / l) * walk;
        y = (ky / l) * walk;
      }
    }
    if (!this.moveEnabled || !this.enabled) return { x: 0, y: 0 };
    return { x, y };
  }

  consumeJump() {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j && this.enabled && this.moveEnabled;
  }
  consumeAction() {
    const a = this.actionQueued;
    this.actionQueued = false;
    return a && this.enabled;
  }
  consumeCamera() {
    const d = { dx: this.camDX, dy: this.camDY, zoom: this.zoom };
    this.camDX = this.camDY = this.zoom = 0;
    return d;
  }
}
