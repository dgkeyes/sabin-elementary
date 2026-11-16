import * as THREE from 'three';
import type { Npc } from '../characters/npc';
import { CAFE_MENU, type CafeItem } from '../content/cafe';
import { treatBoostMultiplier } from '../content/upgrades';
import type { Game } from '../core/game';
import { sfx } from '../core/sound';
import { sheet } from '../ui/panels';
import { h } from '../util/dom';
import type { Seat } from '../world/world';

const SIP_SECONDS = 7;

/**
 * The Starbucks down the street, open whenever you visit. Order at the counter with cash,
 * then sit at a table to enjoy it. Most treats give a short speed boost (game.boostUntil).
 */
export class Starbucks {
  private barista: Npc;
  private holding: CafeItem | null = null;
  private sipping = 0;
  private cup: THREE.Object3D;

  constructor(private g: Game) {
    this.barista = g.person('barista');
    this.barista.busy = true;
    this.barista.placeAt(g.world.spot('barista'));
    this.cup = cupMesh();
    this.cup.visible = false;
    g.scene.add(this.cup);
    g.interactions.add({
      pos: g.world.spot('order').pos,
      radius: 1.8,
      label: () => (this.holding ? `Enjoy your ${this.holding.name.toLowerCase()} at a table` : '☕ Order at Starbucks'),
      enabled: () => !this.sipping,
      use: () => !this.holding && this.openMenu(),
    });
    for (const s of g.world.seats.get('starbucks') ?? [])
      g.interactions.add({ pos: s.pos, radius: 0.8, label: () => `Sit and enjoy ${this.holding?.icon ?? ''}`, enabled: () => !!this.holding && !s.taken && !g.player.seat, use: () => this.sit(s) });
  }

  private openMenu() {
    const g = this.g;
    this.barista.facePoint(g.player.pos);
    this.barista.char.playOnce('yes');
    void g.bubbles.say(this.barista, this.barista.name, `Hi ${g.name}! What can I get you?`, 3);
    const body = h('div');
    let close = () => {};
    body.append(
      h('div', { style: 'font-size:20px;font-weight:800;margin-bottom:10px' }, `You have $${g.save.cash}`),
      h('div', { style: 'opacity:.7;margin-bottom:12px' }, 'Treats with ⚡ make you walk faster for a while.'),
      h(
        'div',
        { class: 'opt-grid' },
        CAFE_MENU.map((item) => {
          const afford = g.save.cash >= item.price;
          const b = h(
            'button',
            { class: `opt${afford ? '' : ' locked'}`, style: 'min-width:200px;text-align:left' },
            `${item.icon} ${item.name}`,
            h('span', { class: 'price' }, ` $${item.price}${item.boost ? ' ⚡' : ''}`),
          );
          b.addEventListener('click', () => {
            if (!afford) return g.toast(`You need $${item.price - g.save.cash} more. Finish your tasks to earn cash!`, 'bad');
            g.save.cash -= item.price;
            g.persist();
            this.holding = item;
            sfx.cash();
            this.barista.char.playOnce('interact');
            void g.bubbles.say(this.barista, this.barista.name, item.line, 4);
            g.toast(`${item.icon} Find a table to enjoy it`, 'good', 3);
            close();
          });
          return b;
        }),
      ),
    );
    close = sheet(g.ui, '☕ Starbucks menu', body);
  }

  private sit(s: Seat) {
    const g = this.g;
    g.sitPlayer(s, 'sitTalk');
    this.cup.position.copy(s.table);
    this.colorCup(this.holding!);
    this.cup.visible = true;
    this.sipping = SIP_SECONDS;
  }

  private colorCup(item: CafeItem) {
    const [cup, top] = item.colors;
    (this.cup.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>).material.color.set(cup);
    (this.cup.children[1] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>).material.color.set(top);
  }

  update(dt: number) {
    const g = this.g;
    if (this.sipping <= 0) return;
    if (!g.player.seat) {
      // stood up early: take it to go
      this.sipping = 0;
      this.cup.visible = false;
      return;
    }
    this.sipping -= dt;
    if (this.sipping <= 0) {
      const item = this.holding!;
      this.holding = null;
      this.cup.visible = false;
      g.save.totals.treats++;
      if (item.boost) {
        const mins = Math.round(item.boost * treatBoostMultiplier(g.save.upgrades.treats ?? 0));
        g.boostUntil = Math.max(g.boostUntil, g.clock.minutes) + mins;
        g.applyUpgrades();
        g.toast(`${item.icon} Delicious! ⚡ You feel speedy for ${mins} minutes.`, 'good', 3.5);
      } else g.toast(`${item.icon} Delicious!`, 'good', 2.5);
      g.persist();
    }
  }

  /** A new day: drop anything you were carrying. */
  reset() {
    this.holding = null;
    this.sipping = 0;
    this.cup.visible = false;
    this.barista.placeAt(this.g.world.spot('barista'));
  }
}

function cupMesh() {
  const grp = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 12), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  cup.position.y = 0.07;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.03, 12), new THREE.MeshLambertMaterial({ color: '#6b3e26' }));
  top.position.y = 0.15;
  grp.add(cup, top);
  return grp;
}
