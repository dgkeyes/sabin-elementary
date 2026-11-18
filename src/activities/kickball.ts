import * as THREE from 'three';
import type { Npc } from '../characters/npc';
import type { Game } from '../core/game';
import { sfx } from '../core/sound';
import { kickMultiplier } from '../content/upgrades';
import type { Action } from '../ui/hud';
import { h } from '../util/dom';
import { Ball } from './soccer';
import type { RecessGame } from './recessGames';

const ROLL_SPEED = 10;
const THROW_SPEED = 10;
const FIELDER_SPEED = 3.6;
/** Seconds before fielders react to a kick, and how long they hold the ball before throwing. */
const REACT = 0.6;
const HOLD = 0.8;
const SAFE_RADIUS = 1.3;
const FUMBLE_CHANCE = 0.3;
/** Extra seconds a fumble costs the fielder. */
const FUMBLE_DELAY = 2.5;
const BASE_NAMES = ['home', '1st', '2nd', '3rd', 'home'];
/** Plays in one game. Every play counts, even a strikeout. */
export const KICKBALL_PLAYS = 5;

type Phase = 'idle' | 'ready' | 'pitch' | 'live' | 'carry' | 'throw' | 'pause';

/**
 * Kickball on the playground diamond. Walk to home plate and tap Play kickball.
 * The pitcher rolls the ball; tap Kick when it reaches you, then run the bases with the joystick.
 * A fielder grabs the ball and throws it to the base you are running to: be standing on a base
 * when it gets there or you're out. While you're on base, a teammate kicks and you run again.
 * After a kick you can tap how many bases to run and you run there on your own.
 * A game is KICKBALL_PLAYS plays; stopping early still counts as playing.
 */
export class Kickball implements RecessGame {
  private phase: Phase = 'idle';
  private ball: Ball;
  private crew: Npc[] = [];
  private pitcher!: Npc;
  private fielders: Npc[] = [];
  private batter: Npc | null = null;
  /** Bases you have touched this trip: 0 means at bat, 4 means you scored. */
  private runnerBase = 0;
  private running = false;
  private carrier: Npc | null = null;
  private throwFrom = new THREE.Vector3();
  private throwTo = 0;
  private t = 0;
  private dur = 0;
  private strikes = 0;
  private runs = 0;
  private outs = 0;
  private plays = 0;
  /** The base you chose to run to (1 to 4, 4 is home), or null when you steer yourself. */
  private plan: number | null = null;
  private board: HTMLElement;
  private removeIx: () => void;
  private bases: THREE.Vector3[];

  constructor(private g: Game, private played: () => void) {
    this.bases = [0, 1, 2, 3].map((k) => g.world.spot(`base${k}`).pos.clone());
    this.ball = new Ball(g.scene);
    this.ball.bounded = false;
    this.ball.mesh.visible = false;
    this.ball.mesh.scale.setScalar(1.6); // kickballs are big
    this.board = h('div', { class: 'scoreboard' });
    this.board.style.display = 'none';
    g.ui.append(this.board);
    this.removeIx = g.interactions.add({
      pos: this.bases[0],
      radius: 3,
      label: '🟠 Play kickball',
      enabled: () => this.phase === 'idle' && this.recessLive(),
      use: () => this.start(),
    });
  }

  private recessLive() {
    const b = this.g.day.block('recess');
    const m = this.g.clock.minutes;
    return !!b && m >= b.start && m < b.end;
  }

  private start() {
    const g = this.g;
    const free = g.kids.filter((k) => !k.busy && k.char.root.visible);
    const crew = free.slice(0, 5);
    if (crew.length < 2) {
      g.toast('Not enough kids free for kickball right now.', 'bad');
      return;
    }
    this.crew = crew;
    for (const k of crew) {
      k.busy = true;
      k.steer = new THREE.Vector3();
    }
    this.pitcher = crew[0];
    this.fielders = crew.slice(1, 4);
    this.batter = crew[4] ?? null;
    this.runs = 0;
    this.outs = 0;
    this.plays = 0;
    this.plan = null;
    this.runnerBase = 0;
    this.ball.mesh.visible = true;
    this.board.style.display = '';
    this.renderBoard();
    this.toPositions();
    g.toast(`🟠 Kickball! ${KICKBALL_PLAYS} plays. Tap Kick when the ball reaches you.`, 'good', 3);
    this.played(); // joining a game counts, even if you have to stop early
    this.atBat();
  }

  private stop() {
    const g = this.g;
    this.phase = 'idle';
    this.plan = null;
    g.player.steer = null;
    this.ball.mesh.visible = false;
    this.board.style.display = 'none';
    for (const k of this.crew) {
      k.steer = null;
      k.busy = false;
      k.char.pose = null;
    }
    this.crew = [];
    if (g.player.locked && !g.player.seat) {
      g.player.locked = false;
      g.input.setMoveEnabled(true);
    }
    g.rig.mode = 'follow';
  }

  private spotOf(k: Npc) {
    const i = this.fielders.indexOf(k);
    if (k === this.pitcher) return this.g.world.spot('pitcher');
    if (i >= 0) return this.g.world.spot(`fielder${i}`);
    // the teammate waits beside home plate
    return { pos: this.bases[0].clone().add(new THREE.Vector3(-2.5, 0, -1.2)), yaw: 0 };
  }

  private toPositions() {
    for (const k of this.crew) {
      const s = this.spotOf(k);
      k.place(s.pos, s.yaw);
      k.steer!.set(0, 0, 0);
    }
  }

  private renderBoard() {
    const where = this.runnerBase === 0 ? 'at bat' : `on ${BASE_NAMES[this.runnerBase]}`;
    this.board.textContent = `🟠 Play ${Math.min(this.plays + 1, KICKBALL_PLAYS)} of ${KICKBALL_PLAYS} · Runs ${this.runs} · Outs ${this.outs} · You're ${where}`;
  }

  /** Sets up the next pitch: you kick if you're at home, otherwise your teammate does. */
  private atBat() {
    const g = this.g;
    this.toPositions();
    this.strikes = 0;
    const home = this.bases[0];
    if (this.runnerBase === 0) {
      g.player.stand();
      g.player.teleport(home.clone().add(new THREE.Vector3(0, 0, -0.5)), 0);
      g.player.locked = true;
      g.input.setMoveEnabled(false);
      g.rig.look(home.clone().add(new THREE.Vector3(0.7, 2.4, -4)), home.clone().add(new THREE.Vector3(0, 0.8, 6)));
    } else {
      // stand on your base, the teammate kicks
      const b = this.bases[this.runnerBase];
      g.player.teleport(b, 0);
      if (this.batter) this.batter.place(home.clone().add(new THREE.Vector3(0, 0, -0.5)), 0);
    }
    this.phase = 'ready';
    this.t = 1.2;
  }

  private pitch() {
    const p = this.pitcher.pos;
    const home = this.bases[0];
    this.ball.reset(p.x, p.z - 0.7);
    const dir = new THREE.Vector3(home.x - p.x + (Math.random() - 0.5) * 0.6, 0, home.z - p.z).normalize();
    this.ball.vel.set(dir.x * ROLL_SPEED, 0, dir.z * ROLL_SPEED);
    this.pitcher.char.playOnce('throw', 0.1, 1.4);
    this.phase = 'pitch';
  }

  private kickBall(power: number) {
    const yaw = (Math.random() - 0.5) * 1.1; // spray the ball around the field
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    this.ball.kick(dir, power, 3 + Math.random() * 3);
    this.phase = 'live';
    this.running = true;
    this.carrier = null;
    this.t = REACT;
  }

  private playerKick() {
    const g = this.g;
    if (this.phase !== 'pitch' || this.runnerBase !== 0) return;
    const d = this.ball.pos.distanceTo(g.player.pos.clone().setY(this.ball.pos.y));
    if (d > 2) return g.player.char.kick();
    g.player.char.kick();
    // a well-timed kick (ball close) goes farther
    const timing = 1 - Math.min(1, Math.abs(d - 0.6) / 1.4);
    this.kickBall((8 + timing * 7) * kickMultiplier(g.save.upgrades.kick ?? 0));
    g.player.locked = false;
    g.input.setMoveEnabled(true);
    g.rig.mode = 'follow';
    g.rig.behind(Math.PI / 4);
    g.toast('🏃 Run! Tap how many bases, or steer yourself.', 'good', 2.5);
    this.played();
  }

  /** The next base you need to touch. */
  private get target() {
    return this.runnerBase === 0 && !this.running ? 0 : (this.runnerBase + 1) % 4;
  }

  update(dt: number) {
    if (this.phase === 'idle') return;
    const g = this.g;
    if (!this.recessLive()) return this.stop();
    if (g.player.pos.distanceTo(this.bases[2]) > 40) {
      g.toast('You left the kickball game.', '', 2);
      return this.stop();
    }
    this.ball.update(dt);
    this.t -= dt;

    // run on your own to the base you picked
    if (this.running && this.plan !== null && this.runnerBase < this.plan) {
      const to = this.bases[(this.runnerBase + 1) % 4].clone().sub(g.player.pos).setY(0);
      g.player.steer = to.lengthSq() > 0.01 ? to.normalize() : null;
    } else g.player.steer = null;

    // touching bases in order while running
    if (this.running && this.runnerBase < 4) {
      const next = this.runnerBase + 1;
      const b = this.bases[next % 4];
      if (g.player.pos.distanceTo(b) < SAFE_RADIUS) {
        this.runnerBase = next;
        sfx.tap();
        if (next === 4) {
          this.runs++;
          sfx.cheer();
          g.toast('🏠 You scored a run!', 'good', 3);
          g.save.totals.goals++; // counts toward the sports total
          this.runnerBase = 0;
          this.running = false;
          this.endPlay();
        } else if (this.plan === next) g.toast(`Stay on ${BASE_NAMES[next]}! ✋`, '', 1.6);
        else g.toast(`Touched ${BASE_NAMES[next]}! Keep going or stay safe.`, '', 1.6);
        this.renderBoard();
      }
    }

    switch (this.phase) {
      case 'ready':
        if (this.t <= 0) this.pitch();
        break;
      case 'pitch': {
        const home = this.bases[0];
        if (this.runnerBase > 0 && this.batter && this.ball.pos.distanceTo(home) < 1.1) {
          this.batter.char.kick();
          this.kickBall(9 + Math.random() * 5);
          g.toast('Your teammate kicked it. Pick how far to run!', 'good', 2);
        } else if (Math.hypot(this.ball.vel.x, this.ball.vel.z) < 0.4) {
          // the roll died before the plate: pitch again
          this.phase = 'ready';
          this.t = 0.6;
        } else if (this.ball.pos.z < home.z - 1.5) {
          this.strikes++;
          sfx.wrong();
          if (this.strikes >= 3) {
            g.toast('Strike 3, you\'re out!', 'bad', 2);
            this.out();
          } else {
            g.toast(`Strike ${this.strikes}!`, 'bad', 1.4);
            this.phase = 'ready';
            this.t = 1.2;
          }
        }
        break;
      }
      case 'live':
        this.chase();
        break;
      case 'carry':
        this.ball.pos.copy(this.carrier!.pos).add(new THREE.Vector3(0, 1.1, 0));
        this.ball.vel.set(0, 0, 0);
        if (this.t <= 0) this.throwBall();
        break;
      case 'throw': {
        const to = this.bases[this.throwTo];
        const k = Math.min(1, 1 - this.t / this.dur);
        this.ball.pos.lerpVectors(this.throwFrom, to, k);
        this.ball.pos.y = 1 + Math.sin(k * Math.PI) * 2;
        this.ball.vel.set(0, 0, 0);
        if (k >= 1) this.arrive();
        break;
      }
      case 'pause':
        if (this.t <= 0) this.atBat();
        break;
    }
  }

  /** The nearest fielder runs to the ball; the rest drift back to their spots. */
  private chase() {
    if (this.t > 0) return;
    const ballPos = this.ball.pos;
    let near: Npc | null = null;
    let best = Infinity;
    for (const k of [this.pitcher, ...this.fielders]) {
      const d = k.pos.distanceTo(ballPos.clone().setY(0));
      if (d < best) ((best = d), (near = k));
    }
    for (const k of [this.pitcher, ...this.fielders]) {
      const goal = (k === near ? ballPos : this.spotOf(k).pos).clone().setY(0);
      const to = goal.sub(k.pos).setY(0);
      const d = to.length();
      k.steer!.copy(d < 0.2 ? to.set(0, 0, 0) : to.multiplyScalar(Math.min(FIELDER_SPEED, d * 3) / d));
    }
    if (near && best < 0.7 && ballPos.y < 0.6) {
      this.carrier = near;
      near.steer!.set(0, 0, 0);
      this.phase = 'carry';
      this.t = HOLD;
      // sometimes the fielder fumbles it, which gives a long run a chance
      if (Math.random() < FUMBLE_CHANCE) {
        this.t += FUMBLE_DELAY;
        near.char.playOnce('pickup');
        this.g.toast('😮 They fumbled it! Keep running!', 'good', 2);
      }
      for (const k of this.crew) k.steer?.set(0, 0, 0);
    }
  }

  private throwBall() {
    const c = this.carrier!;
    // fielders throw ahead to the base you picked
    this.throwTo = this.plan !== null ? this.plan % 4 : this.target;
    this.throwFrom.copy(this.ball.pos);
    const to = this.bases[this.throwTo];
    this.dur = Math.max(0.35, this.throwFrom.distanceTo(to) / THROW_SPEED);
    this.t = this.dur;
    c.facePoint(to);
    c.char.playOnce('throw', 0.1, 1.5);
    this.phase = 'throw';
  }

  /** The throw reached a base: are you safe on a base, or caught between them? */
  private arrive() {
    const g = this.g;
    const onBase = this.bases.findIndex((b) => g.player.pos.distanceTo(b) < SAFE_RADIUS);
    // you must leave home after kicking; standing on any base you've reached is safe
    const safe = this.runnerBase > 0 && onBase === this.runnerBase % 4;
    if (safe) {
      g.toast(`Safe on ${BASE_NAMES[this.runnerBase]}! ✋`, 'good', 2);
      this.endPlay();
    } else {
      g.toast('Tagged out! 🟠', 'bad', 2);
      this.out();
    }
  }

  private out() {
    this.outs++;
    this.runnerBase = 0;
    if (this.outs >= 3) {
      this.g.toast('Three outs! New inning.', '', 2);
      this.outs = 0;
    }
    this.endPlay();
  }

  private endPlay() {
    this.running = false;
    this.plan = null;
    this.g.player.steer = null;
    this.plays++;
    if (this.plays >= KICKBALL_PLAYS) {
      sfx.cheer();
      this.g.toast(`🏁 Game over! You scored ${this.runs} run${this.runs === 1 ? '' : 's'} in ${KICKBALL_PLAYS} plays.`, 'good', 4);
      this.stop();
      return;
    }
    this.phase = 'pause';
    this.t = 1.6;
    this.renderBoard();
  }

  /** Run to base `n` (1 to 4) on your own. */
  private runTo(n: number) {
    this.plan = n;
    sfx.tap();
  }

  actions(): Action[] {
    const out: Action[] = [];
    if (this.phase === 'idle') return out;
    if (this.runnerBase === 0 && !this.running && (this.phase === 'pitch' || this.phase === 'ready'))
      out.push({ label: '🦶 Kick!', instant: true, use: () => this.playerKick() });
    if (this.running && this.plan === null && this.runnerBase < 4)
      for (let n = this.runnerBase + 1; n <= 4; n++) {
        const label = n === 4 ? '🏠 Home run!' : `🏃 To ${BASE_NAMES[n]}`;
        out.push({ label, instant: true, use: () => this.runTo(n) });
      }
    out.push({ label: 'Stop kickball', use: () => this.stop() });
    return out;
  }

  dispose() {
    if (this.phase !== 'idle') this.stop();
    this.removeIx();
    this.ball.dispose();
    this.board.remove();
  }
}
