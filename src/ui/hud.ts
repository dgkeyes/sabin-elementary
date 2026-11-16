import * as THREE from 'three';
import type { Game } from '../core/game';
import { weekday } from '../content/schedule';
import { clear, h, onTap } from '../util/dom';
import { formatTime } from '../util/math';

export interface Action {
  label: string;
  use: () => void;
  /** Hold-style actions fire on press instead of release (kicks). */
  instant?: boolean;
}

/** Clock, next-up card, cash, menu buttons, task list, action buttons, and toasts. */
export class Hud {
  readonly el: HTMLElement;
  private clockEl: HTMLElement;
  private dayEl: HTMLElement;
  private nextTitle: HTMLElement;
  private nextSub: HTMLElement;
  private cashEl: HTMLElement;
  private tasksEl: HTMLElement;
  private actionsEl: HTMLElement;
  private toastsEl: HTMLElement;
  private top: HTMLElement;
  private actionKey = '';
  private tasksKey = '';
  private lastActions: Action[] = [];

  constructor(private game: Game, root: HTMLElement) {
    this.clockEl = h('div', null, '7:00 AM');
    this.dayEl = h('div', { class: 'sub' }, 'Monday');
    const clockChip = h('div', { class: 'chip clock', style: 'flex-direction:column;align-items:flex-start;gap:0' }, this.clockEl, this.dayEl);
    this.nextTitle = h('div');
    this.nextSub = h('div', { class: 'sub' });
    const nextChip = h('div', { class: 'chip hud-next', onclick: () => game.openSchedule() }, this.nextTitle, this.nextSub);
    this.cashEl = h('span', null, '$0');
    const cashChip = h('button', { class: 'chip', ontap: () => game.openShop() }, '💵 ', this.cashEl);
    this.top = h(
      'div',
      { class: 'hud-top' },
      clockChip,
      nextChip,
      h('div', { class: 'hud-spacer' }),
      cashChip,
      h('button', { class: 'icon-btn', ontap: () => game.openSchedule(), title: 'Schedule' }, '📅'),
      h('button', { class: 'icon-btn', ontap: () => game.openWardrobe('wardrobe'), title: 'Clothes' }, '👕'),
      h('button', { class: 'icon-btn', ontap: () => game.openShop(), title: 'Shop' }, '🛒'),
    );
    this.tasksEl = h('div', { class: 'tasks-mini', ontap: () => game.openSchedule() });
    this.actionsEl = h('div', { class: 'action-row' });
    const actions = h('div', { class: 'action-buttons' }, this.actionsEl, game.input.jumpBtn);
    this.toastsEl = h('div', { class: 'toasts' });
    this.el = h('div', { class: 'hud', style: 'position:absolute;inset:0;pointer-events:none' }, this.top, this.tasksEl, actions, this.toastsEl);
    for (const c of [this.top, this.tasksEl, actions]) c.style.pointerEvents = 'auto';
    this.top.style.pointerEvents = 'none';
    actions.style.pointerEvents = 'none';
    root.append(this.el);
  }

  setVisible(on: boolean) {
    this.el.style.display = on ? '' : 'none';
  }

  update() {
    const g = this.game;
    const t = g.clock.minutes;
    this.clockEl.textContent = formatTime(t);
    this.dayEl.textContent = `${weekday(g.save.day)} · Day ${g.save.day}`;
    this.cashEl.textContent = `$${g.save.cash}`;
    const info = g.guideInfo();
    this.nextTitle.textContent = info.title;
    this.nextSub.innerHTML = '';
    this.nextSub.append(info.late ? h('span', { class: 'late' }, info.sub) : info.sub);

    // task list: next few undone tasks
    const undone = g.day.tasks.filter((x) => !g.day.done.has(x.id));
    const key = undone.map((x) => x.id).join() + g.day.done.size;
    if (key !== this.tasksKey) {
      this.tasksKey = key;
      clear(this.tasksEl);
      this.tasksEl.append(h('div', { style: 'opacity:.6;font-size:12px' }, `TODAY ${g.day.done.size}/${g.day.tasks.length}`));
      for (const x of undone.slice(0, 3)) this.tasksEl.append(h('div', null, '☐ ' + x.label));
      if (!undone.length) this.tasksEl.append(h('div', null, '🎉 All done!'));
    }

    // action buttons
    const acts = g.currentActions();
    const akey = acts.map((a) => a.label).join('|');
    this.lastActions = acts;
    if (akey !== this.actionKey) {
      this.actionKey = akey;
      clear(this.actionsEl);
      acts.forEach((a, i) => {
        const b = h('button', { class: 'round-btn action' }, a.label);
        if (a.instant)
          b.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.lastActions[i]?.use();
          });
        else onTap(b, () => this.lastActions[i]?.use());
        this.actionsEl.append(b);
      });
    }
  }

  toast(text: string, kind: '' | 'good' | 'bad' = '', seconds = 3) {
    const t = h('div', { class: `toast ${kind}` }, text);
    this.toastsEl.append(t);
    while (this.toastsEl.children.length > 3) this.toastsEl.firstChild!.remove();
    setTimeout(() => t.remove(), seconds * 1000);
  }
}

// ---------------------------------------------------------------- speech bubbles

export interface Speaker {
  pos: THREE.Vector3;
  char: { headHeight: number };
}

interface Bubble {
  el: HTMLElement;
  who: Speaker;
  until: number;
  resolve?: () => void;
}

const _p = new THREE.Vector3();

/** Speech bubbles that float over people's heads. */
export class Bubbles {
  private list: Bubble[] = [];
  private time = 0;
  constructor(private root: HTMLElement, private camera: THREE.Camera) {}

  /** Shows a bubble. Resolves when it closes: after `seconds`, or when tapped if `tap`. */
  say(who: Speaker, name: string, text: string, seconds = 4, tap = false): Promise<void> {
    this.clear(who);
    return new Promise((resolve) => {
      const el = h('div', { class: 'bubble' + (tap ? ' tap' : '') }, h('div', { class: 'who' }, name), text, tap ? h('div', { class: 'tap-hint' }, 'tap to continue') : null);
      const b: Bubble = { el, who, until: this.time + seconds, resolve };
      if (tap) onTap(el, () => this.close(b));
      this.root.append(el);
      this.list.push(b);
      this.position(b);
    });
  }

  clear(who?: Speaker) {
    for (const b of [...this.list]) if (!who || b.who === who) this.close(b);
  }

  private close(b: Bubble) {
    const i = this.list.indexOf(b);
    if (i < 0) return;
    this.list.splice(i, 1);
    b.el.remove();
    b.resolve?.();
  }

  private position(b: Bubble) {
    _p.copy(b.who.pos);
    _p.y += b.who.char.headHeight + 0.25;
    _p.project(this.camera);
    const hidden = _p.z > 1 || _p.z < -1;
    const x = THREE.MathUtils.clamp((_p.x * 0.5 + 0.5) * window.innerWidth, 190, window.innerWidth - 190);
    const y = THREE.MathUtils.clamp((-_p.y * 0.5 + 0.5) * window.innerHeight, 330, window.innerHeight - 40);
    b.el.style.left = x + 'px';
    b.el.style.top = y + 'px';
    b.el.style.visibility = hidden ? 'hidden' : '';
  }

  update(dt: number) {
    this.time += dt;
    for (const b of [...this.list]) {
      if (this.time >= b.until) this.close(b);
      else this.position(b);
    }
  }
}
