import * as THREE from 'three';
import type { AnimName, Character } from '../characters/character';
import type { Npc } from '../characters/npc';
import type { Game } from '../core/game';
import { sfx } from '../core/sound';
import { h } from '../util/dom';

/**
 * PE: Coach calls out moves and you do them with taps and swipes ("Coach says"),
 * then you build a freestyle routine in the move picker and perform it for the class.
 *
 * To add a move: add an entry to MOVES. `gesture` is how Coach Says asks for it.
 */
export type Gesture = 'tap' | 'up' | 'down' | 'left' | 'right';

export interface Move {
  id: string;
  name: string;
  icon: string;
  gesture: Gesture;
  /** Plays the move on a character. Returns seconds it takes. */
  play: (c: Character, hop: () => void) => number;
}

const once = (anim: AnimName, speed = 1) => (c: Character) => {
  c.playOnce(anim, 0.12, speed);
  return 1.1;
};
const hold = (anim: AnimName, secs: number) => (c: Character) => {
  c.pose = anim;
  setTimeout(() => c.pose === anim && (c.pose = null), secs * 1000);
  return secs;
};

export const MOVES: Move[] = [
  { id: 'jump', name: 'Jump', icon: '⬆️', gesture: 'up', play: (c, hop) => (c.playOnce('ninja', 0.08, 1.6), hop(), 0.9) },
  { id: 'squat', name: 'Squat', icon: '⬇️', gesture: 'down', play: hold('crouch', 0.9) },
  { id: 'rollL', name: 'Roll left', icon: '⬅️', gesture: 'left', play: once('roll', 1.4) },
  { id: 'rollR', name: 'Roll right', icon: '➡️', gesture: 'right', play: once('roll', 1.4) },
  { id: 'jab', name: 'Boxing jab', icon: '👆', gesture: 'tap', play: once('punch', 1.5) },
  {
    id: 'star',
    name: 'Star jump',
    icon: '⭐',
    gesture: 'up',
    play: (c, hop) => {
      c.armsUp = 1;
      hop();
      setTimeout(() => (c.armsUp = 0), 700);
      return 0.9;
    },
  },
  { id: 'dance', name: 'Dance', icon: '💃', gesture: 'tap', play: hold('dance', 2) },
  { id: 'cheer', name: 'Cheer', icon: '🙌', gesture: 'tap', play: once('yes', 1.3) },
  { id: 'slide', name: 'Baseball slide', icon: '🛝', gesture: 'down', play: hold('slide', 1.2) },
  { id: 'throw', name: 'Throw', icon: '🥏', gesture: 'tap', play: once('throw', 1.3) },
  { id: 'cross', name: 'Cross punch', icon: '🥊', gesture: 'tap', play: once('punch2', 1.4) },
];

const ARROW: Record<Gesture, string> = { tap: 'TAP', up: 'SWIPE ⬆', down: 'SWIPE ⬇', left: 'SWIPE ⬅', right: 'SWIPE ➡' };

/** A full-screen pad that reports taps and swipes. */
function gesturePad(root: HTMLElement, onGesture: (g: Gesture) => void) {
  const pad = h('div', { style: 'position:absolute;inset:0;z-index:11;touch-action:none' });
  let start: { x: number; y: number } | null = null;
  pad.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    start = { x: e.clientX, y: e.clientY };
  });
  pad.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.hypot(dx, dy) < 30) onGesture('tap');
    else if (Math.abs(dx) > Math.abs(dy)) onGesture(dx > 0 ? 'right' : 'left');
    else onGesture(dy > 0 ? 'down' : 'up');
  });
  root.append(pad);
  return pad;
}

/** Makes the player (or an NPC) do a move. */
export function doMove(g: Game, who: 'player' | Npc, move: Move) {
  if (who === 'player') {
    const p = g.player;
    const hop = () => {
      p.vel.y = 4.6;
      p.onGround = false;
    };
    const wasLocked = p.locked;
    p.locked = false;
    const t = move.play(p.char, hop);
    p.locked = wasLocked;
    return t;
  }
  return move.play(who.char, () => who.hop());
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function peClass(g: Game, coach: Npc): Promise<void> {
  const kids = g.kids.filter((k) => k.char.root.visible && k.pos.distanceTo(g.player.pos) < 14);
  const s = g.world.spot('gym0');
  g.player.teleport(s.pos, s.yaw);
  g.player.locked = true;
  g.input.setMoveEnabled(false);
  coach.facePoint(s.pos);
  // from beside the coach, looking back at you and the class
  g.rig.look(new THREE.Vector3(25.2, 2.5, -9.2), new THREE.Vector3(20.6, 0.9, -12.3));

  // ---------- Part 1: Coach says ----------
  const card = h('div', { class: 'panel coach-card', style: 'top:calc(var(--safe-top) + 90px);font-size:30px;min-width:340px' });
  const sub = h('div', { style: 'font-size:16px;opacity:.6;margin-top:4px' }, 'Swipe or tap anywhere');
  // Skip: jump ahead to freestyle after the current call
  let skipped = false;
  const skip = h('button', { class: 'skip-btn', style: 'position:absolute;right:calc(var(--safe-right) + 16px);top:calc(var(--safe-top) + 90px);z-index:13;font-size:18px;padding:10px 16px', ontap: () => {
    skipped = true;
    skip.textContent = 'Skipping…';
  } }, '⏭ Skip');
  g.ui.append(card, skip);
  let want: Move | null = null;
  let hit = false;
  const pad = gesturePad(g.ui, (gest) => {
    if (!want || hit) return;
    if (gest === want.gesture) {
      hit = true;
      sfx.right();
      doMove(g, 'player', want);
    } else {
      sfx.wrong();
      card.style.background = '#fed7d7';
      setTimeout(() => (card.style.background = ''), 300);
    }
  });
  const calls = [...MOVES].sort(() => Math.random() - 0.5).slice(0, 8);
  let score = 0;
  for (let i = 0; i < calls.length; i++) {
    want = calls[i];
    hit = false;
    const window = 2600 - i * 170;
    card.innerHTML = '';
    card.append(h('div', null, `${want.icon} ${want.name}!`), h('div', { style: 'font-size:22px;color:var(--blue)' }, ARROW[want.gesture]), sub);
    void g.bubbles.say(coach, coach.name, `${want.name}!`, window / 1000);
    sfx.whistle();
    // classmates join in, a little late
    kids.forEach((k, j) => setTimeout(() => doMove(g, k, want!), 300 + j * 90));
    await sleep(window);
    if (hit) score++;
    if (skipped) break;
  }
  skip.remove();
  want = null;
  pad.remove();
  card.remove();
  g.save.totals.correct += score;
  g.save.totals.answered += calls.length;
  await g.bubbles.say(coach, coach.name, score >= 6 ? `${score} out of ${calls.length}! You've got great moves!` : `${score} out of ${calls.length}. Good hustle, keep practicing!`, 30, true);

  // ---------- Part 2: move picker and freestyle ----------
  await g.bubbles.say(coach, coach.name, 'Freestyle time! Pick 4 moves for your routine, then show us.', 30, true);
  const routine = await movePicker(g);
  void g.bubbles.say(coach, coach.name, 'Everybody watch!', 3);
  for (const m of routine) {
    const t = doMove(g, 'player', m);
    sfx.tap();
    await sleep(Math.max(900, t * 1000));
  }
  kids.forEach((k) => k.char.playOnce('yes'));
  sfx.cheer();
  g.player.locked = false;
  g.player.teleport(s.pos, s.yaw);
  g.player.locked = true;
}

/** Lets the player choose four moves. The last routine is remembered for next time. */
function movePicker(g: Game): Promise<Move[]> {
  return new Promise((resolve) => {
    const saved = g.save.peRoutine;
    const picked: Move[] = saved.map((id) => MOVES.find((m) => m.id === id)).filter((m): m is Move => !!m);
    const slots = h('div', { style: 'display:flex;gap:8px;margin:10px 0' });
    const go = h('button', { class: 'btn green', style: 'width:100%' }, 'Perform! ▶');
    const render = () => {
      slots.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const m = picked[i];
        const slot = h('button', { class: 'opt', style: 'flex:1;font-size:15px;min-height:64px' }, m ? `${m.icon} ${m.name}` : `${i + 1}`);
        slot.addEventListener('click', () => {
          picked.splice(i, 1);
          render();
        });
        slots.append(slot);
      }
      go.style.opacity = picked.length === 4 ? '1' : '.4';
    };
    const grid = h(
      'div',
      { class: 'opt-grid' },
      MOVES.map((m) => {
        const b = h('button', { class: 'opt' }, `${m.icon} ${m.name}`);
        b.addEventListener('click', () => {
          if (picked.length >= 4) picked.shift();
          picked.push(m);
          doMove(g, 'player', m); // preview
          render();
        });
        return b;
      }),
    );
    const panel = h(
      'div',
      { class: 'panel', style: 'position:absolute;left:calc(var(--safe-left) + 16px);top:calc(var(--safe-top) + 150px);width:min(440px,42vw);padding:14px;z-index:12' },
      h('div', { style: 'font-size:22px;font-weight:800' }, '🤸 Move picker'),
      h('div', { style: 'opacity:.6;font-size:14px' }, 'Tap moves to add them. Tap a slot to remove one.'),
      slots,
      grid,
      h('div', { style: 'height:12px' }),
      go,
    );
    go.addEventListener('click', () => {
      if (picked.length < 4) return;
      g.save.peRoutine = picked.map((m) => m.id);
      g.persist();
      panel.remove();
      resolve(picked);
    });
    g.ui.append(panel);
    render();
  });
}
