type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown> & { class?: string; style?: string };

/** Tiny DOM builder: h('button', { class: 'btn', onclick }, 'Hi'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') {
        const ev = k.slice(2);
        if (ev === 'tap') onTap(el, v as () => void);
        else el.addEventListener(ev, v as EventListener);
      } else if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k in el && typeof v !== 'string') (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

/**
 * Fast tap handler for touch UI. Fires on pointerup when the finger did not move much,
 * so taps feel instant on iPad and do not double-fire with click.
 */
export function onTap(el: HTMLElement, fn: (e: PointerEvent) => void) {
  let down: { id: number; x: number; y: number } | null = null;
  el.addEventListener('pointerdown', (e) => {
    down = { id: e.pointerId, x: e.clientX, y: e.clientY };
    e.stopPropagation();
  });
  el.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved < 24) {
      e.stopPropagation();
      fn(e);
    }
  });
  el.addEventListener('pointercancel', () => (down = null));
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
