import * as THREE from 'three';
import type { Game } from '../core/game';
import type { Block } from '../content/schedule';
import type { Npc } from '../characters/npc';
import { h } from '../util/dom';
import type { Action } from '../ui/hud';
import type { Activity } from './activity';
import { cone } from './props';
import { Ball, FIELD, playerKick } from './soccer';

const LATE_GRACE = 2;

interface Drill {
  name: string;
  intro: string;
  /** Sets up cones and the ball; returns the goal count for the meter. */
  setup(): number;
  /** Returns progress so far (same units as setup's goal). */
  update(dt: number): number;
  /** One tip based on how it went: what to improve. */
  tip(seconds: number): string;
  kick?: boolean;
}

/**
 * Soccer practice after school. Coach Davis runs warm-ups, shuttle sprints, a dribbling course,
 * and shooting, and gives a tip after each drill about what to improve.
 */
export class PracticeActivity implements Activity {
  finished = false;
  private coach: Npc;
  private state: 'waiting' | 'drill' | 'talk' | 'done' = 'waiting';
  private drills: Drill[];
  private index = 0;
  private card: HTMLElement;
  private cardText: HTMLElement;
  private meter: HTMLElement;
  private props: THREE.Object3D[] = [];
  private ball: Ball | null = null;
  private drillTime = 0;
  private removeIx: () => void;
  private ended = false;
  private kickCd = 0;
  private skipDrill = false;
  private teammates: Npc[] = [];

  constructor(private g: Game, readonly block: Block) {
    this.coach = g.person('davis');
    this.coach.busy = true;
    const spot = new THREE.Vector3(FIELD.cx, 0, FIELD.z1 - 2.5);
    this.coach.place(spot, Math.PI);
    this.coach.char.pose = null; // the coach moves around on their own between drills
    this.removeIx = g.interactions.add({
      pos: spot,
      radius: 3.5,
      label: '⚽ Start practice',
      enabled: () => this.state === 'waiting' && !this.ended,
      use: () => void this.join(),
    });
    // a couple of kids from the team run alongside you
    this.teammates = g.kids.filter((k) => !k.busy).slice(0, 3);
    this.teammates.forEach((k, i) => {
      k.busy = true;
      k.place(new THREE.Vector3(FIELD.cx - 2 + i * 2, 0, FIELD.z1 - 4.5), Math.PI);
      k.char.pose = i === 1 ? 'talk' : null;
    });
    this.cardText = h('div');
    this.meter = h('div', { style: 'width:0%' });
    this.card = h('div', { class: 'panel coach-card', style: 'display:none' }, this.cardText, h('div', { class: 'meter' }, this.meter));
    g.ui.append(this.card);
    this.drills = this.makeDrills();
  }

  private async join() {
    const g = this.g;
    const late = g.clock.minutes > this.block.start + LATE_GRACE;
    g.day.attendance.set(this.block.id, late ? 'late' : 'ontime');
    g.toast(late ? '⏰ A little late to practice' : '🔔 On time for practice!', late ? 'bad' : 'good');
    g.completeTask('practice');
    this.state = 'talk';
    this.coach.settle();
    this.coach.char.pose = 'talk';
    this.coach.facePoint(g.player.pos);
    await g.bubbles.say(this.coach, this.coach.name, `Welcome to practice, ${g.name}! Four drills today. Listen for my tips.`, 30, true);
    this.coach.char.pose = null;
    void this.startDrill();
  }

  private clearProps() {
    for (const p of this.props) p.removeFromParent();
    this.props = [];
    this.ball?.dispose();
    this.ball = null;
  }

  private addCone(x: number, z: number, color?: string) {
    const c = cone();
    if (color) c.material = new THREE.MeshLambertMaterial({ color });
    c.position.set(x, 0, z);
    this.g.scene.add(c);
    this.props.push(c);
    return c;
  }

  private async startDrill() {
    const g = this.g;
    if (this.ended) return this.finish();
    const d = this.drills[this.index];
    this.clearProps();
    this.state = 'talk';
    await g.bubbles.say(this.coach, this.coach.name, `Drill ${this.index + 1}: ${d.name}. ${d.intro}`, 30, true);
    if (this.ended) return this.finish();
    const goal = d.setup();
    this.drillTime = 0;
    this.card.style.display = '';
    this.cardText.textContent = `${d.name}: 0 / ${goal}`;
    this.meter.style.width = '0%';
    this.state = 'drill';
    (this as unknown as { goal: number }).goal = goal;
  }

  update(dt: number) {
    const g = this.g;
    this.kickCd -= dt;
    if (this.state !== 'drill') {
      if (this.state === 'waiting' && g.player.pos.distanceTo(this.coach.pos) < 12 && !this.coach.moving) this.coach.facePoint(g.player.pos);
      return;
    }
    const d = this.drills[this.index];
    this.drillTime += dt;
    const goal = (this as unknown as { goal: number }).goal;
    const prog = this.skipDrill ? goal : Math.min(goal, d.update(dt));
    this.ball?.update(dt);
    if (this.ball) this.ball.touch(g.player.pos, g.player.vel, 'player');
    this.cardText.textContent = `${d.name}: ${prog} / ${goal}`;
    this.meter.style.width = `${(prog / goal) * 100}%`;
    // teammates jog in place near the coach
    this.teammates.forEach((k, i) => {
      if (!k.moving && Math.random() < dt * 0.3) {
        const p = new THREE.Vector3(FIELD.cx - 6 + i * 4 + (Math.random() - 0.5) * 3, 0, FIELD.z1 - 6 - Math.random() * 3);
        k.goTo(p, g.world.nav, { run: true });
      }
    });
    if (prog >= goal) {
      const skipped = this.skipDrill;
      this.skipDrill = false;
      this.state = 'talk';
      this.card.style.display = 'none';
      this.coach.char.playOnce('yes');
      const tip = skipped ? "Skipping that one. We'll try it again tomorrow!" : d.tip(this.drillTime);
      this.index++;
      void g.bubbles.say(this.coach, this.coach.name, tip, 30, true).then(() => {
        if (this.index >= this.drills.length) void this.wrapUp();
        else void this.startDrill();
      });
    }
  }

  private async wrapUp() {
    const g = this.g;
    this.clearProps();
    await g.bubbles.say(this.coach, this.coach.name, `Great practice, ${g.name}! Get some rest. See you tomorrow!`, 5);
    this.finish();
  }

  private finish() {
    this.state = 'done';
    this.clearProps();
    this.card.style.display = 'none';
    this.finished = true;
  }

  private makeDrills(): Drill[] {
    const g = this.g;
    const P = () => g.player.pos;
    const near = (o: THREE.Object3D, r = 1.2) => Math.hypot(P().x - o.position.x, P().z - o.position.z) < r;
    const z = FIELD.z1 - 8;
    return [
      {
        name: 'Warm-up jog',
        intro: 'Jog through the four yellow cones in order. Nice and easy!',
        setup: () => {
          const pts: [number, number][] = [
            [FIELD.cx - 6, z],
            [FIELD.cx - 6, z - 8],
            [FIELD.cx + 6, z - 8],
            [FIELD.cx + 6, z],
          ];
          pts.forEach(([x, zz]) => this.addCone(x, zz, '#facc15'));
          (this as unknown as { step: number }).step = 0;
          return pts.length;
        },
        update: () => {
          const s = this as unknown as { step: number };
          const c = this.props[s.step];
          if (c && near(c)) {
            (c as THREE.Mesh).material = new THREE.MeshLambertMaterial({ color: '#22c55e' });
            s.step++;
          }
          return s.step;
        },
        tip: (sec) => (sec < 25 ? 'Smooth warm-up! Warm muscles help prevent injuries.' : 'Good! Tip: keep moving between cones, a warm-up should get your heart pumping.'),
      },
      {
        name: 'Shuttle sprints',
        intro: 'Run back and forth between the two orange cones, three times. Push the joystick all the way to sprint!',
        setup: () => {
          this.addCone(FIELD.cx - 8, z);
          this.addCone(FIELD.cx + 8, z);
          (this as unknown as { step: number }).step = 0;
          return 6;
        },
        update: () => {
          const s = this as unknown as { step: number };
          const c = this.props[s.step % 2 === 0 ? 1 : 0];
          if (c && near(c, 1.4)) s.step++;
          return s.step;
        },
        tip: (sec) => (sec < 28 ? 'Fast feet! Tip: stay low when you turn so you do not lose speed.' : 'Tip: lean forward and pump your arms to sprint faster. Push the joystick all the way!'),
      },
      {
        name: 'Dribbling',
        intro: 'Dribble the ball through the gates of blue cones. Walk into the ball to push it, small touches!',
        setup: () => {
          this.ball = new Ball(g.scene);
          this.ball.bounded = false;
          this.ball.reset(FIELD.cx - 10, z - 4 + 1.5);
          const gates = [-6, -1, 4, 9];
          gates.forEach((dx, i) => {
            const zz = z - 4 + (i % 2 ? -2 : 2);
            this.addCone(FIELD.cx + dx, zz - 1.2, '#3b82f6');
            this.addCone(FIELD.cx + dx, zz + 1.2, '#3b82f6');
          });
          (this as unknown as { step: number }).step = 0;
          return gates.length;
        },
        update: () => {
          const s = this as unknown as { step: number };
          const a = this.props[s.step * 2];
          const b = this.props[s.step * 2 + 1];
          if (a && b && this.ball) {
            const bx = this.ball.pos.x;
            const bz = this.ball.pos.z;
            const gx = a.position.x;
            if (Math.abs(bx - gx) < 0.6 && bz > a.position.z && bz < b.position.z) {
              for (const c of [a, b]) (c as THREE.Mesh).material = new THREE.MeshLambertMaterial({ color: '#22c55e' });
              s.step++;
            }
          }
          return s.step;
        },
        tip: (sec) => (sec < 45 ? 'Great control! Tip: look up between touches so you can see defenders.' : 'Tip: use small touches and walk slowly near the cones. Speed comes with practice!'),
      },
      {
        name: 'Shooting',
        intro: 'Score 3 goals into the right goal. Get close, face the goal, and tap Kick!',
        kick: true,
        setup: () => {
          this.ball = new Ball(g.scene);
          this.ball.bounded = true;
          const s = this as unknown as { step: number };
          s.step = 0;
          const reset = () => this.ball!.reset(FIELD.x1 - 12, FIELD.cz + (Math.random() - 0.5) * 6);
          this.ball.onGoal = (side) => {
            if (side > 0) {
              s.step++;
              g.toast(`⚽ Goal ${s.step}!`, 'good', 2);
              g.save.totals.goals++;
            }
            setTimeout(reset, 900);
          };
          reset();
          return 3;
        },
        update: () => (this as unknown as { step: number }).step,
        tip: (sec) => (sec < 40 ? 'What a striker! Tip: aim for the corners, keepers hate that.' : 'Tip: get closer before you shoot, and face the goal when you kick.'),
      },
    ];
  }

  blockEnded() {
    this.ended = true;
    if (this.state === 'waiting') this.finish();
    else if (this.state === 'drill') {
      this.g.toast('Practice time is up!', '', 3);
      void this.wrapUp();
    }
  }

  actions(): Action[] {
    const d = this.drills[this.index];
    const out: Action[] = [];
    if (this.state === 'drill' && d?.kick && this.ball && this.ball.pos.distanceTo(this.g.player.pos.clone().setY(0.11)) < 1.7)
      out.push(
        {
          label: '⚽ Kick',
          instant: true,
          use: () => {
            if (this.kickCd > 0 || !this.ball) return;
            this.kickCd = 0.35;
            playerKick(this.g, this.ball, FIELD.x1, 10);
          },
        },
      );
    if (this.state === 'drill') out.push({ label: '⏭ Skip drill', use: () => (this.skipDrill = true) });
    return out;
  }

  dispose() {
    this.clearProps();
    this.card.remove();
    this.removeIx();
    this.coach.char.pose = null;
    for (const k of this.teammates) k.busy = false;
  }
}
