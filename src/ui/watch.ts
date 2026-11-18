import type { Game } from '../core/game';
import { sfx } from '../core/sound';
import { DINNER_TIME } from '../activities/home';
import { dinnerFor } from '../content/menu';
import { SCHOOL_OUT } from '../content/schedule';
import { QUICK_TEXTS, parentReply, type Parent } from '../content/texts';
import { h } from '../util/dom';
import { formatTime } from '../util/math';
import { sheet } from './panels';

interface Msg {
  from: 'me' | Parent;
  text: string;
  time: number;
}

/** Today's conversations, cleared each morning. */
const threads: { day: number; mom: Msg[]; dad: Msg[] } = { day: 0, mom: [], dad: [] };

/** Texting Mom and Dad on your watch. School rules: only after school. */
export function openWatch(g: Game) {
  if (g.clock.minutes < SCHOOL_OUT) {
    g.toast('⌚ No texting during school! Your watch works after school.', 'bad', 3);
    return false;
  }
  if (threads.day !== g.save.day) Object.assign(threads, { day: g.save.day, mom: [], dad: [] });
  let who: Parent = 'mom';
  const log = h('div', { class: 'watch-log' });
  const tabs = (['mom', 'dad'] as Parent[]).map((p) => h('button', { class: 'watch-tab', ontap: () => ((who = p), render()) }, p === 'mom' ? '👩 Mom' : '👨 Dad'));
  const input = h('input', { class: 'watch-input', type: 'text', placeholder: 'Type a message…', maxLength: 120 }) as HTMLInputElement;
  const quick = h('div', { class: 'watch-quick' });
  const render = () => {
    tabs.forEach((t, i) => t.classList.toggle('on', (i === 0 ? 'mom' : 'dad') === who));
    log.innerHTML = '';
    const list = threads[who];
    if (!list.length) log.append(h('div', { class: 'watch-empty' }, `Send ${who === 'mom' ? 'Mom' : 'Dad'} a text!`));
    for (const m of list) log.append(h('div', { class: `bubble-msg ${m.from === 'me' ? 'me' : 'them'}` }, m.text, h('div', { class: 'msg-time' }, formatTime(m.time))));
    log.scrollTop = log.scrollHeight;
  };
  const send = (text: string) => {
    text = text.trim();
    if (!text) return;
    const to = who;
    threads[to].push({ from: 'me', text, time: g.clock.minutes });
    sfx.tap();
    render();
    const ctx = {
      name: g.name,
      time: g.clock.minutes,
      dinner: dinnerFor(g.save.day),
      dinnerTime: DINNER_TIME,
      practiceDone: g.day.done.has('practice'),
      homeworkDone: g.day.done.has('homework'),
    };
    // a short "typing" pause, then the reply
    setTimeout(() => {
      threads[to].push({ from: to, text: parentReply(to, text, ctx), time: g.clock.minutes });
      sfx.right();
      if (who === to && log.isConnected) render();
      else g.toast(`⌚ ${to === 'mom' ? 'Mom' : 'Dad'} texted back!`, 'good', 2);
    }, 1200);
  };
  for (const q of QUICK_TEXTS) quick.append(h('button', { class: 'watch-chip', ontap: () => send(q) }, q));
  const sendBtn = h('button', { class: 'btn', ontap: () => (send(input.value), (input.value = '')) }, 'Send');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      send(input.value);
      input.value = '';
    }
  });
  input.addEventListener('pointerdown', (e) => e.stopPropagation());
  const body = h('div', { class: 'watch' }, h('div', { class: 'watch-tabs' }, tabs), log, quick, h('div', { class: 'watch-row' }, input, sendBtn));
  sheet(g.ui, '⌚ Messages', body);
  render();
  return true;
}
