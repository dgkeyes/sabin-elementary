import type { Activity } from '../activities/activity';
import { ClassActivity } from '../activities/classroom';
import { HomeLife } from '../activities/home';
import { LunchActivity } from '../activities/lunch';
import { PracticeActivity } from '../activities/practice';
import { RecessActivity } from '../activities/recess';
import type { Block } from '../content/schedule';
import type { Game } from '../core/game';
import type { Action } from '../ui/hud';
import { Classmates } from './classmates';

/** Minutes before a block starts that its activity is set up (teacher in place, kids walking over). */
const LEAD: Partial<Record<Block['kind'], number>> = { class: 6, practice: 8, lunch: 2, recess: 0 };

/** Starts and ends activities as the clock moves through the day's schedule. */
export class Director {
  readonly home: HomeLife;
  readonly classmates: Classmates;
  private running: { block: Block; act: Activity; ended: boolean }[] = [];
  private started = new Set<string>();

  constructor(private g: Game) {
    this.home = new HomeLife(g);
    this.classmates = new Classmates(g);
  }

  reset() {
    for (const r of this.running) r.act.dispose?.();
    this.running = [];
    this.started.clear();
    this.home.reset();
    this.classmates.reset();
  }

  endDay() {
    this.reset();
  }

  private create(b: Block): Activity | null {
    switch (b.kind) {
      case 'class':
        return new ClassActivity(this.g, b);
      case 'recess':
        return new RecessActivity(this.g, b);
      case 'lunch':
        return new LunchActivity(this.g, b);
      case 'practice':
        return new PracticeActivity(this.g, b);
      default:
        return null;
    }
  }

  /** The running activity for a block id, if any. */
  activity(id: string) {
    return this.running.find((r) => r.block.id === id)?.act ?? null;
  }

  update(dt: number) {
    const g = this.g;
    const t = g.clock.minutes;
    for (const b of g.day.blocks) {
      if (this.started.has(b.id)) continue;
      const lead = LEAD[b.kind];
      if (lead === undefined) continue;
      if (t >= b.start - lead && t < b.end) {
        this.started.add(b.id);
        const act = this.create(b);
        if (act) this.running.push({ block: b, act, ended: false });
      }
    }
    for (const r of this.running) {
      r.act.update(dt);
      if (!r.ended && t >= r.block.end) {
        r.ended = true;
        r.act.blockEnded();
        if (r.block.attendance && !g.day.attendance.has(r.block.id)) {
          g.day.attendance.set(r.block.id, 'absent');
          g.toast(`🚫 You missed ${r.block.title}. Marked absent.`, 'bad', 4);
          g.persist();
        }
      }
    }
    for (const r of this.running.filter((x) => x.act.finished)) r.act.dispose?.();
    this.running = this.running.filter((x) => !x.act.finished);
    this.home.update(dt);
    this.classmates.update(dt);
  }

  actions(): Action[] {
    const out: Action[] = [];
    for (const r of this.running) if (r.act.actions) out.push(...r.act.actions());
    out.push(...this.home.actions());
    return out;
  }
}
