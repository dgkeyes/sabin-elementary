import * as THREE from 'three';
import type { Npc } from '../characters/npc';
import type { Game } from '../core/game';
import { sfx } from '../core/sound';
import { h } from '../util/dom';

const COLORS = ['#1a202c', '#ffffff', '#e53e3e', '#f6ad55', '#f6e05e', '#48bb78', '#4299e1', '#805ad5', '#ed64a6', '#8b5a2b'];
const STAMPS = ['✏️', '⭐', '❤️', '🌸', '☀️', '🌈', '🐱', '🏠'];
const PROMPTS = ['your favorite animal', 'your dream house', 'a sunny day at the park', 'yourself as a superhero', 'your favorite food', 'an underwater world', 'outer space'];

/** Art class: paint a picture on an easel. It hangs in the art room and in your bedroom. */
export async function artClass(g: Game, teacher: Npc): Promise<void> {
  const prompt = PROMPTS[(g.save.day - 1) % PROMPTS.length];
  await g.bubbles.say(teacher, teacher.name, `Today, paint ${prompt}! Use the brush and the stamps.`, 30, true);
  const url = await paint(g, `🎨 Paint ${prompt}`);
  g.save.artwork = url;
  g.persist();
  hangArtwork(g);
  sfx.cheer();
  await g.bubbles.say(teacher, teacher.name, 'What a masterpiece! I hung it on the wall. A copy is going home to your bedroom too.', 30, true);
}

function paint(g: Game, title: string): Promise<string> {
  return new Promise((resolve) => {
    const W = 640;
    const H = 440;
    const cv = h('canvas', { width: W, height: H, style: 'width:100%;border-radius:12px;background:#fff;touch-action:none;display:block;box-shadow:inset 0 0 0 2px #e2e8f0' }) as HTMLCanvasElement;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, H);
    let color = COLORS[2];
    let size = 14;
    let stamp = '✏️';
    const colorBtns = COLORS.map((col) => {
      const b = h('button', { class: 'swatch', style: `background:${col};width:36px;height:36px` });
      b.addEventListener('click', () => {
        color = col;
        if (stamp === '🧽') stamp = '✏️';
        refresh();
      });
      return b;
    });
    const stampBtns = [...STAMPS, '🧽'].map((s) => {
      const b = h('button', { class: 'opt', style: 'min-height:44px;padding:6px 10px;font-size:22px' }, s);
      b.addEventListener('click', () => {
        stamp = s;
        refresh();
      });
      return b;
    });
    const sizeBtns = [6, 14, 30].map((s) => {
      const b = h('button', { class: 'opt', style: 'min-height:44px;padding:4px;font-size:14px' }, s === 6 ? 'Thin' : s === 14 ? 'Med' : 'Thick');
      b.addEventListener('click', () => {
        size = s;
        refresh();
      });
      return b;
    });
    const refresh = () => {
      colorBtns.forEach((b, i) => b.classList.toggle('on', COLORS[i] === color));
      stampBtns.forEach((b) => b.classList.toggle('on', b.textContent === stamp));
      sizeBtns.forEach((b, i) => b.classList.toggle('on', [6, 14, 30][i] === size));
    };
    refresh();
    const pos = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    let last: { x: number; y: number } | null = null;
    cv.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      const p = pos(e);
      if (stamp !== '✏️' && stamp !== '🧽') {
        c.font = `${size * 4 + 20}px serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(stamp, p.x, p.y);
        sfx.tap();
        return;
      }
      last = p;
      dot(p);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = pos(e);
      c.strokeStyle = stamp === '🧽' ? '#ffffff' : color;
      c.lineWidth = stamp === '🧽' ? size * 2.5 : size;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(last.x, last.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      last = p;
    });
    const end = () => (last = null);
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    const dot = (p: { x: number; y: number }) => {
      c.fillStyle = stamp === '🧽' ? '#ffffff' : color;
      c.beginPath();
      c.arc(p.x, p.y, (stamp === '🧽' ? size * 2.5 : size) / 2, 0, Math.PI * 2);
      c.fill();
    };
    const fill = h('button', { class: 'btn small secondary' }, '🪣 Fill');
    fill.addEventListener('click', () => {
      c.fillStyle = color;
      c.fillRect(0, 0, W, H);
    });
    const done = h('button', { class: 'btn green small' }, 'Hang it up ✔');
    const panel = h(
      'div',
      { class: 'overlay', style: 'background:rgba(10,20,40,.2)' },
      h(
        'div',
        { class: 'panel', style: 'width:min(940px,96vw);padding:14px;display:flex;gap:14px;max-height:94vh' },
        h('div', { style: 'flex:1;min-width:0' }, h('div', { style: 'font-weight:800;font-size:20px;margin-bottom:8px' }, title), cv),
        h(
          'div',
          { style: 'width:230px;display:flex;flex-direction:column;gap:8px;overflow-y:auto' },
          h('div', { style: 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px' }, colorBtns),
          h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px' }, stampBtns),
          h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px' }, sizeBtns),
          fill,
          done,
        ),
      ),
    );
    done.addEventListener('click', () => {
      const small = document.createElement('canvas');
      small.width = 320;
      small.height = 220;
      small.getContext('2d')!.drawImage(cv, 0, 0, 320, 220);
      panel.remove();
      resolve(small.toDataURL('image/jpeg', 0.75));
    });
    g.ui.append(panel);
  });
}

const hung: THREE.Object3D[] = [];

/** Puts the saved painting in frames in the art room and your bedroom. Call at start and after painting. */
export function hangArtwork(g: Game) {
  for (const m of hung) m.removeFromParent();
  hung.length = 0;
  const url = g.save.artwork;
  if (!url) return;
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const frameMat = new THREE.MeshLambertMaterial({ color: '#8b5a2b' });
  const make = (x: number, y: number, z: number, rotY: number) => {
    const grp = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.98, 0.04), frameMat);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.82), mat);
    pic.position.z = 0.025;
    grp.add(frame, pic);
    grp.position.set(x, y, z);
    grp.rotation.y = rotY;
    g.scene.add(grp);
    hung.push(grp);
  };
  make(-6, 1.7, -8.2, Math.PI); // art room, north wall
  const art = g.world.spot('bedroomArt');
  make(art.pos.x, art.pos.y + 1.6, art.pos.z, art.yaw); // bedroom, by the bed
}
