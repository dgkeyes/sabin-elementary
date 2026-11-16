import { setSound } from '../core/sound';
import type { Game } from '../core/game';
import { PLACE_NAMES } from '../world/places';
import { UPGRADES } from '../content/upgrades';
import { weekday } from '../content/schedule';
import { h } from '../util/dom';
import { formatTime } from '../util/math';
import type { DayRecord } from '../core/save';

/** A centered sheet with a title and a close button. Returns a function that closes it. */
export function sheet(root: HTMLElement, title: string, body: HTMLElement, onClose?: () => void) {
  const close = () => {
    ov.remove();
    onClose?.();
  };
  const ov = h(
    'div',
    { class: 'overlay' },
    h('div', { class: 'panel sheet' }, h('div', { class: 'sheet-head' }, h('h2', null, title), h('button', { class: 'close-btn', ontap: close }, '✕')), h('div', { class: 'sheet-body' }, body)),
  );
  ov.addEventListener('pointerdown', (e) => {
    if (e.target === ov) close();
  });
  root.append(ov);
  return close;
}

export function confirmBox(root: HTMLElement, text: string, yes: string, no: string): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      ov.remove();
      resolve(v);
    };
    const ov = h(
      'div',
      { class: 'overlay' },
      h(
        'div',
        { class: 'panel', style: 'padding:24px;max-width:480px;text-align:center' },
        h('div', { style: 'font-size:22px;font-weight:700;margin-bottom:18px' }, text),
        h('div', { style: 'display:flex;gap:12px;justify-content:center' }, h('button', { class: 'btn secondary', ontap: () => done(false) }, no), h('button', { class: 'btn', ontap: () => done(true) }, yes)),
      ),
    );
    root.append(ov);
  });
}

export function openSchedule(g: Game) {
  const t = g.clock.minutes;
  const body = h('div');
  body.append(h('div', { style: 'font-weight:700;margin-bottom:8px;opacity:.7' }, `${weekday(g.save.day)}, day ${g.save.day} · it is ${formatTime(t)}`));
  const target = g.day.targetBlock(t);
  for (const b of g.day.blocks) {
    const att = g.day.attendance.get(b.id);
    const done = b.task ? g.day.done.has(b.task) : false;
    const past = t >= b.end;
    let badge: HTMLElement | null = null;
    if (att === 'late') badge = h('span', { class: 'badge yellow' }, 'Late');
    else if (att === 'absent') badge = h('span', { class: 'badge red' }, 'Absent');
    else if (done || att === 'ontime') badge = h('span', { class: 'badge green' }, '✓ Done');
    else if (t >= b.start && t < b.end) badge = h('span', { class: 'badge yellow' }, 'Now');
    else if (past && b.task) badge = h('span', { class: 'badge red' }, 'Missed');
    body.append(
      h(
        'div',
        { class: `sched-row ${b === target ? 'now' : ''} ${past && !(b === target) ? 'past' : ''}` },
        h('div', { class: 'time' }, formatTime(b.start)),
        h('div', { class: 'what' }, b.title, h('div', { class: 'where' }, PLACE_NAMES[b.place])),
        b === target ? h('span', { class: 'badge' }, '➡ Next') : null,
        badge,
      ),
    );
  }
  body.append(h('div', { class: 'opt-label' }, `Today's tasks (${g.day.done.size}/${g.day.tasks.length}) · finish them all for a $ bonus`));
  const grid = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:17px;font-weight:600' });
  for (const task of g.day.tasks) grid.append(h('div', { style: g.day.done.has(task.id) ? 'opacity:.55' : '' }, (g.day.done.has(task.id) ? '✅ ' : '⬜ ') + task.label));
  body.append(grid);
  const tot = g.save.totals;
  body.append(h('div', { class: 'opt-label' }, 'Report card'), h('div', { style: 'font-size:16px' }, `On time: ${tot.attended} · Late: ${tot.late} · Absent: ${tot.absent} · Perfect days: ${tot.perfectDays} · Answers right: ${tot.correct}/${tot.answered}`));
  const guideBtn = h('button', { class: 'btn small secondary', style: 'margin-top:14px' }, g.guideOn ? '🧭 Guide arrow: ON' : '🧭 Guide arrow: OFF');
  guideBtn.addEventListener('click', () => {
    g.guideOn = !g.guideOn;
    guideBtn.textContent = g.guideOn ? '🧭 Guide arrow: ON' : '🧭 Guide arrow: OFF';
  });
  const qualityBtn = h('button', { class: 'btn small secondary', style: 'margin:14px 0 0 10px' }, `Graphics: ${g.save.settings.quality === 'high' ? 'Sharp' : 'Fast'}`);
  qualityBtn.addEventListener('click', () => {
    g.save.settings.quality = g.save.settings.quality === 'high' ? 'low' : 'high';
    g.applyQuality();
    g.persist();
    qualityBtn.textContent = `Graphics: ${g.save.settings.quality === 'high' ? 'Sharp' : 'Fast'}`;
  });
  const soundBtn = h('button', { class: 'btn small secondary', style: 'margin:14px 0 0 10px' }, g.save.settings.sound ? '🔊 Sound: ON' : '🔇 Sound: OFF');
  soundBtn.addEventListener('click', () => {
    g.save.settings.sound = !g.save.settings.sound;
    setSound(g.save.settings.sound);
    g.persist();
    soundBtn.textContent = g.save.settings.sound ? '🔊 Sound: ON' : '🔇 Sound: OFF';
  });
  body.append(guideBtn, qualityBtn, soundBtn);
  return sheet(g.ui, '📅 Today', body);
}

export function openShop(g: Game) {
  const body = h('div');
  const render = () => {
    body.innerHTML = '';
    body.append(h('div', { style: 'font-size:20px;font-weight:800;margin-bottom:12px' }, `You have $${g.save.cash}`), h('div', { style: 'opacity:.7;margin-bottom:12px' }, 'Earn cash by finishing your daily tasks. New clothes and hairstyles are in the 👕 wardrobe.'));
    for (const u of UPGRADES) {
      const lv = g.save.upgrades[u.id] ?? 0;
      const maxed = lv >= u.prices.length;
      const price = u.prices[lv];
      const btn = maxed ? h('span', { class: 'badge green' }, 'MAX') : h('button', { class: 'btn small green', style: g.save.cash < price ? 'opacity:.45' : '' }, `Buy $${price}`);
      if (!maxed)
        btn.addEventListener('click', () => {
          if (g.save.cash < price) return g.toast(`You need $${price - g.save.cash} more`, 'bad');
          g.save.cash -= price;
          g.save.upgrades[u.id] = lv + 1;
          g.applyUpgrades();
          g.persist();
          g.toast(`${u.icon} ${u.name} level ${lv + 1}!`, 'good');
          render();
        });
      body.append(
        h(
          'div',
          { class: 'shop-item' },
          h('div', { class: 'icon' }, u.icon),
          h('div', { class: 'info' }, h('b', null, `${u.name} `, h('span', { style: 'font-size:14px;opacity:.6' }, `level ${lv}/${u.prices.length}`)), h('div', null, maxed ? u.describe(lv - 1) : u.describe(lv))),
          btn,
        ),
      );
    }
  };
  render();
  return sheet(g.ui, '🛒 Shop', body);
}

/** The night screen between days. */
export function showSleep(root: HTMLElement, rec: DayRecord, lines: string[]): Promise<void> {
  return new Promise((resolve) => {
    const el = h(
      'div',
      { class: 'sleep' },
      h('div', { class: 'zzz' }, '🌙 💤'),
      h('h1', null, 'Sleeping…'),
      h(
        'div',
        { class: 'summary' },
        h('div', { style: 'font-weight:800;margin-bottom:6px' }, `Day ${rec.day} report`),
        h('div', null, `📚 Classes on time: ${rec.attended.length}`),
        rec.late.length ? h('div', null, `⏰ Late to: ${rec.late.join(', ')}`) : null,
        rec.absent.length ? h('div', null, `🚫 Absent from: ${rec.absent.join(', ')}`) : null,
        h('div', null, `✅ Tasks: ${rec.tasksDone} of ${rec.tasksTotal}`),
        h('div', null, `💵 Cash earned: $${rec.cashEarned}`),
        lines.map((l) => h('div', null, l)),
      ),
    );
    const btn = h('button', { class: 'btn', style: 'opacity:0;transition:opacity .5s' }, '☀️ Good morning!');
    btn.addEventListener('click', () => {
      el.remove();
      resolve();
    });
    el.append(btn);
    root.append(el);
    setTimeout(() => (btn.style.opacity = '1'), 1200);
  });
}
