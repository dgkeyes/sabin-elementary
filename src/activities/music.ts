import type { Npc } from '../characters/npc';
import type { Game } from '../core/game';
import { sfx } from '../core/sound';
import { h } from '../util/dom';

/** One instrument pad. To add one, add an entry with a sound from core/sound.ts. */
const PADS = [
  { name: 'Drum', icon: '🥁', color: '#e53e3e', play: sfx.drum },
  { name: 'Clap', icon: '👏', color: '#f6ad55', play: sfx.clap },
  { name: 'Bell', icon: '🔔', color: '#4299e1', play: sfx.bellHit },
  { name: 'Bass', icon: '🎸', color: '#805ad5', play: sfx.bass },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Music class: echo rhythms. The teacher plays a pattern on the pads, you tap it back.
 * Patterns get one beat longer each round. A miss just moves on.
 */
export async function musicClass(g: Game, teacher: Npc): Promise<void> {
  await g.bubbles.say(teacher, teacher.name, "Let's play echo! Watch and listen to my rhythm, then tap it back.", 30, true);
  const pads = PADS.map((p) =>
    h('button', { class: 'pad', style: `background:${p.color}` }, h('div', { style: 'font-size:46px' }, p.icon), h('div', null, p.name)),
  );
  const status = h('div', { style: 'font-size:22px;font-weight:800;text-align:center;min-height:30px' });
  const dots = h('div', { style: 'display:flex;gap:8px;justify-content:center;min-height:20px;margin:6px 0' });
  const panel = h(
    'div',
    { class: 'panel', style: 'position:absolute;left:50%;bottom:calc(var(--safe-bottom) + 18px);transform:translateX(-50%);width:min(720px,92vw);padding:16px;z-index:12' },
    status,
    dots,
    h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px' }, pads),
  );
  g.ui.append(panel);

  const flash = (i: number) => {
    PADS[i].play();
    pads[i].classList.add('lit');
    setTimeout(() => pads[i].classList.remove('lit'), 220);
  };
  let onPad: ((i: number) => void) | null = null;
  pads.forEach((b, i) =>
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!onPad) return;
      flash(i);
      onPad(i);
    }),
  );
  const showDots = (n: number, done: number) => {
    dots.innerHTML = '';
    for (let i = 0; i < n; i++) dots.append(h('div', { style: `width:16px;height:16px;border-radius:50%;background:${i < done ? 'var(--green)' : '#cbd5e0'}` }));
  };

  let score = 0;
  const rounds = [3, 4, 5, 6];
  for (const len of rounds) {
    const pattern = Array.from({ length: len }, () => Math.floor(Math.random() * PADS.length));
    status.textContent = '👂 Listen…';
    showDots(len, 0);
    teacher.char.pose = 'talk';
    await sleep(700);
    for (const i of pattern) {
      flash(i);
      await sleep(560);
    }
    teacher.char.pose = null;
    status.textContent = '👉 Your turn!';
    const ok = await new Promise<boolean>((resolve) => {
      let at = 0;
      const timer = setTimeout(() => finish(false), 3000 + len * 1200);
      const finish = (v: boolean) => {
        clearTimeout(timer);
        onPad = null;
        resolve(v);
      };
      onPad = (i) => {
        if (i !== pattern[at]) return finish(false);
        at++;
        showDots(len, at);
        if (at === pattern.length) finish(true);
      };
    });
    if (ok) {
      score++;
      sfx.right();
      status.textContent = '🌟 Perfect echo!';
      teacher.char.playOnce('yes');
    } else {
      sfx.wrong();
      status.textContent = 'Close! Next rhythm…';
    }
    await sleep(1100);
  }
  panel.remove();
  g.save.totals.correct += score;
  g.save.totals.answered += rounds.length;
  g.persist();
  if (score === rounds.length) sfx.cheer();
  await g.bubbles.say(teacher, teacher.name, score >= 3 ? `${score} out of ${rounds.length} rhythms! You have a great ear.` : `${score} out of ${rounds.length}. Rhythm takes practice, you'll get it!`, 30, true);
}
