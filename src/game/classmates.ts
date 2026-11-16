import * as THREE from 'three';
import type { Game } from '../core/game';
import type { Npc } from '../characters/npc';
import { playerSeatIndex } from '../activities/classroom';
import { rng, shuffle } from '../util/math';
import { SCHOOL_OUT } from '../content/schedule';

const AWAY = new THREE.Vector3(0, 0, 400);
const t = (h: number, m: number) => h * 60 + m;

/**
 * Moves the AI classmates through the day: they arrive in the morning, go to every class,
 * play at recess, eat lunch, and go home. Activities can borrow a kid by setting `busy`.
 */
export class Classmates {
  private phase = '';
  private chatTimer = 8;

  constructor(private g: Game) {}

  reset() {
    this.phase = '';
  }

  private phaseAt(time: number) {
    if (time < t(7, 40)) return 'away';
    let id = '';
    for (const b of this.g.day.blocks) {
      if (!['class', 'recess', 'lunch', 'practice'].includes(b.kind)) continue;
      if (time >= b.start - 6 && time < b.end) id = b.id;
    }
    if (id) return id;
    if (time < t(8, 0)) return 'arrive';
    if (time >= SCHOOL_OUT) return 'away';
    return 'hall';
  }

  update(dt: number) {
    const phase = this.phaseAt(this.g.clock.minutes);
    if (phase !== this.phase) {
      this.phase = phase;
      this.assign(phase);
    }
    // a little chatter
    this.chatTimer -= dt;
    if (this.chatTimer <= 0) {
      this.chatTimer = 10 + Math.random() * 10;
      this.chatter();
    }
  }

  private free() {
    return this.g.kids.filter((k) => !k.busy);
  }

  private assign(phase: string) {
    const g = this.g;
    const nav = g.world.nav;
    const kids = this.free();
    const r = rng(g.save.day * 31 + phase.length);
    if (phase === 'away') {
      for (const k of kids) {
        if (k.pos.z > 300) continue;
        k.goTo(new THREE.Vector3(3, 0, 20), nav, { onArrive: () => k.place(AWAY, 0) });
      }
      return;
    }
    if (phase === 'arrive' || phase === 'hall') {
      kids.forEach((k, i) => {
        const spot = new THREE.Vector3(-6 + (i % 6) * 2.4 + r(), 0, -2.5 - Math.floor(i / 6) * 2 - r());
        if (k.pos.z > 300) k.place(new THREE.Vector3(3 + (r() - 0.5) * 2, 0, 6 + i * 1.5), Math.PI);
        k.goTo(spot, nav, { pose: i % 3 === 0 ? 'talk' : null, face: r() * 6 });
      });
      return;
    }
    const block = g.day.block(phase);
    if (!block) return;
    if (block.kind === 'class') {
      const seats = g.world.seats.get(block.place);
      if (seats) {
        const free = seats.filter((_, i) => i !== playerSeatIndex(seats.length));
        kids.forEach((k, i) => {
          if (k.pos.z > 300) k.place(new THREE.Vector3(3, 0, -6), Math.PI);
          const s = free[i % free.length];
          k.goSit(s, nav, 'sit', undefined, true);
        });
      } else {
        // gym: line up on the spots
        kids.forEach((k, i) => {
          if (k.pos.z > 300) k.place(new THREE.Vector3(3, 0, -6), Math.PI);
          const s = g.world.spot(`gym${(i + 1) % 12}`);
          k.goTo(s.pos, nav, { face: s.yaw, run: true });
        });
      }
    } else if (block.kind === 'lunch') {
      const seats = shuffle([...(g.world.seats.get('cafeteria') ?? [])], r).filter((s) => !s.taken);
      kids.forEach((k, i) => k.goSit(seats[i], nav, 'sitTalk', undefined, true));
    } else if (block.kind === 'recess') {
      kids.forEach((k, i) => {
        const p = new THREE.Vector3(-20 + r() * 12, 0, -46 + r() * 12);
        k.goTo(p, nav, { pose: i % 2 ? 'talk' : 'dance', face: r() * 6, run: true });
      });
    } else if (block.kind === 'practice') {
      for (const k of kids) k.goTo(new THREE.Vector3(3, 0, 20), nav, { onArrive: () => k.place(AWAY, 0) });
    }
  }

  private chatter() {
    const g = this.g;
    const near = g.kids.filter((k) => k.char.root.visible && k.pos.distanceTo(g.player.pos) < 9 && !k.busy);
    if (!near.length) return;
    const k = near[Math.floor(Math.random() * near.length)];
    const lines = this.lines(k);
    void g.bubbles.say(k, k.name, lines[Math.floor(Math.random() * lines.length)], 3.5);
  }

  private lines(k: Npc) {
    const g = this.g;
    const name = g.name;
    const block = g.day.targetBlock(g.clock.minutes);
    const base = [`Hi ${name}!`, 'Did you finish the homework?', 'I love your outfit!', 'Want to play soccer at recess?', 'I can\'t wait for lunch.', 'This is my favorite day of the week!'];
    if (k.seat?.group === 'cafeteria') return ['This is so good!', 'Want to trade snacks?', 'Are you playing soccer after school?', `Sit with us, ${name}!`];
    if (block?.kind === 'class') return [...base.slice(0, 3), `We have ${block.title} next.`, 'Hurry, the bell is about to ring!'];
    return base;
  }
}
