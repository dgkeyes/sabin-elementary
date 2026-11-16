import * as THREE from 'three';

/** Something you can walk up to and use with the action button. */
export interface Interactable {
  pos: THREE.Vector3;
  radius: number;
  label: string | (() => string);
  enabled?: () => boolean;
  use: () => void;
}

export class Interactions {
  private list = new Set<Interactable>();

  /** Registers an interactable and returns a function that removes it. */
  add(i: Interactable) {
    this.list.add(i);
    return () => this.list.delete(i);
  }

  nearest(p: THREE.Vector3): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const i of this.list) {
      const dx = i.pos.x - p.x;
      const dz = i.pos.z - p.z;
      const d = dx * dx + dz * dz;
      if (d > i.radius * i.radius || d >= bestD) continue;
      if (Math.abs(i.pos.y - p.y) > 2.5) continue;
      if (i.enabled && !i.enabled()) continue;
      best = i;
      bestD = d;
    }
    return best;
  }
}

export const labelOf = (i: Interactable) => (typeof i.label === 'string' ? i.label : i.label());
