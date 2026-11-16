import './style.css';
import { loadAssets } from './characters/assets';
import { Game } from './core/game';
import { loadSave } from './core/save';

// Stop iOS Safari from zooming on double-tap or pinch and from bouncing the page.
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener(
  'touchmove',
  (e) => {
    const el = e.target as HTMLElement;
    if (!el.closest?.('.sheet-body')) e.preventDefault();
  },
  { passive: false },
);
let lastTouch = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouch < 300 && (e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault();
    lastTouch = now;
  },
  { passive: false },
);
document.addEventListener('contextmenu', (e) => e.preventDefault());

async function boot() {
  const fill = document.getElementById('loading-fill')!;
  const text = document.getElementById('loading-text')!;
  try {
    await loadAssets((f) => (fill.style.width = `${Math.round(5 + f * 90)}%`));
  } catch (err) {
    text.textContent = 'Could not load the game. Check your connection and reload.';
    throw err;
  }
  text.textContent = 'Building Sabin Elementary…';
  await new Promise((r) => setTimeout(r, 30));
  const game = new Game(document.getElementById('game') as HTMLCanvasElement, document.getElementById('ui')!, loadSave());
  game.start();
  fill.style.width = '100%';
  document.getElementById('loading')!.classList.add('hidden');
}

void boot();
