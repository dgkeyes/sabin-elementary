import * as THREE from 'three';
import type { Game } from '../core/game';
import type { Block } from '../content/schedule';
import { mealFor } from '../content/menu';
import type { Npc } from '../characters/npc';
import type { Seat } from '../world/world';
import type { Action } from '../ui/hud';
import type { Activity } from './activity';
import { foodPlate } from './props';
import { formatTime } from '../util/math';

/** Lunch: grab today's tray from the counter, then sit at any free seat and eat. */
export class LunchActivity implements Activity {
  finished = false;
  private hasTray = false;
  private eating = 0;
  private tray: THREE.Object3D | null = null;
  private trays: THREE.Object3D[] = [];
  private removers: (() => void)[] = [];
  private lady: Npc;

  constructor(private g: Game, readonly block: Block) {
    const meal = mealFor(g.save.day);
    this.lady = g.person('lunch');
    this.lady.busy = true;
    this.lady.placeAt(g.world.spot('lunchlady'));
    const line = g.world.spot('lunchline');
    this.removers.push(
      g.interactions.add({
        pos: line.pos,
        radius: 1.8,
        label: 'Get lunch',
        enabled: () => !this.hasTray && !g.day.done.has('lunch'),
        use: () => {
          this.hasTray = true;
          this.lady.char.playOnce('interact');
          void g.bubbles.say(this.lady, this.lady.name, `Today is ${meal.name} with ${meal.sides}. Enjoy, hon!`, 4.5);
          g.toast('🍱 Now find a seat at any table', '', 3);
        },
      }),
    );
    for (const s of g.world.seats.get('cafeteria') ?? [])
      this.removers.push(g.interactions.add({ pos: s.pos, radius: 0.75, label: 'Sit and eat', enabled: () => this.hasTray && !s.taken && !g.player.seat, use: () => this.sit(s) }));
    // put trays in front of kids as they sit
    for (const s of g.world.seats.get('cafeteria') ?? []) {
      const t = foodPlate(meal.colors, true);
      t.position.copy(s.table);
      t.visible = false;
      t.userData.seat = s;
      g.scene.add(t);
      this.trays.push(t);
    }
  }

  private sit(s: Seat) {
    const g = this.g;
    g.sitPlayer(s, 'sitTalk');
    this.tray = this.trays.find((t) => t.userData.seat === s) ?? null;
    this.eating = 9;
    // say hi to someone nearby
    const friend = g.kids.find((k) => k.seat?.group === 'cafeteria' && k.pos.distanceTo(s.pos) < 2.2);
    if (friend) void g.bubbles.say(friend, friend.name, `Hi ${g.name}! The ${mealFor(g.save.day).name.toLowerCase()} is so good today.`, 4);
  }

  update(dt: number) {
    const g = this.g;
    for (const t of this.trays) {
      const s = t.userData.seat as Seat;
      t.visible = !!s.taken && (s.taken !== g.player || this.hasTray);
    }
    if (this.eating > 0 && g.player.seat) {
      this.eating -= dt;
      if (this.eating <= 0) {
        this.hasTray = false;
        if (this.tray) this.tray.visible = false;
        g.completeTask('lunch');
        const next = g.day.blocks.find((b) => b.start >= this.block.end);
        g.toast(next ? `😋 Yum! ${next.title} starts at ${formatTime(next.start)}` : '😋 Yum!', '', 3);
      }
    }
  }

  blockEnded() {
    const g = this.g;
    if (g.player.seat?.group === 'cafeteria') g.standUp();
    if (this.hasTray && !g.day.done.has('lunch')) g.completeTask('lunch');
    this.finished = true;
  }

  actions(): Action[] {
    return [];
  }

  dispose() {
    this.removers.forEach((r) => r());
    this.trays.forEach((t) => t.removeFromParent());
  }
}
