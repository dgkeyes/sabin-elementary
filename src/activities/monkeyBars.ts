import * as THREE from 'three';
import type { Game } from '../core/game';
import type { Action } from '../ui/hud';

const BAR_Y = 2.01;
const FIRST_X = -17.6;
const LAST_X = -12.6;
const STEP = 0.5;
const Z = -38;

/** Monkey bars on the playground: hang on, tap Swing to reach for the next bar, get to the end. */
export class MonkeyBars {
  private on = false;
  private bar = 0;
  private from = 0;
  private swingT = 1;
  private removeIx: () => void;
  private best = 0;

  constructor(private g: Game, private onFinish: () => void) {
    this.removeIx = g.interactions.add({
      pos: g.world.spot('mbStart').pos,
      radius: 1.6,
      label: '🐒 Monkey bars',
      enabled: () => !this.on,
      use: () => this.start(),
    });
  }

  private get bars() {
    return Math.round((LAST_X - FIRST_X) / STEP);
  }

  private start() {
    const g = this.g;
    this.on = true;
    this.bar = 0;
    this.from = 0;
    this.swingT = 1;
    g.player.locked = true;
    g.player.char.pose = 'jump';
    g.player.char.armsUp = 1;
    g.input.setMoveEnabled(false);
    g.player.yaw = Math.PI / 2;
    this.place(0);
    g.toast('Tap Swing to grab the next bar!', '', 2.5);
  }

  private place(x: number) {
    const g = this.g;
    const reach = 2.08 * g.player.char.scale;
    g.player.pos.set(FIRST_X + x * STEP, BAR_Y - reach, Z);
    g.player.vel.set(0, 0, 0);
    g.player.sync();
  }

  private swing() {
    if (this.swingT < 0.85) return;
    this.from = this.bar;
    this.bar++;
    this.swingT = 0;
  }

  stop(reachedEnd = false) {
    if (!this.on) return;
    const g = this.g;
    this.on = false;
    g.player.char.armsUp = 0;
    g.player.char.pose = null;
    g.player.locked = false;
    g.player.vel.set(0, -1, 0);
    g.player.onGround = false;
    g.input.setMoveEnabled(true);
    if (reachedEnd) {
      g.toast(`🐒 You crossed the monkey bars!`, 'good');
      this.onFinish();
    } else if (this.bar > this.best) g.toast(`You made it ${this.bar} bars`, '');
    this.best = Math.max(this.best, this.bar);
  }

  update(dt: number) {
    if (!this.on) return;
    if (this.swingT < 1) {
      this.swingT = Math.min(1, this.swingT + dt / 0.35);
      const e = this.swingT * this.swingT * (3 - 2 * this.swingT);
      this.place(THREE.MathUtils.lerp(this.from, this.bar, e));
      // a little forward swing
      this.g.player.pos.y += Math.sin(this.swingT * Math.PI) * 0.06;
      this.g.player.sync();
      if (this.swingT >= 1 && this.bar >= this.bars) {
        const end = this.g.world.spot('mbEnd').pos;
        this.stop(true);
        this.g.player.pos.x = end.x;
        this.g.player.sync();
      }
    }
  }

  actions(): Action[] {
    if (!this.on) return [];
    return [
      { label: 'Swing ➜', instant: true, use: () => this.swing() },
      { label: 'Let go', use: () => this.stop() },
    ];
  }

  dispose() {
    this.stop();
    this.removeIx();
  }
}
