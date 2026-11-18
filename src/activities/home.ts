import * as THREE from 'three';
import type { Game } from '../core/game';
import { breakfastFor, dinnerFor } from '../content/menu';
import { SUBJECTS, pickQuestions, type SubjectId } from '../content/subjects';
import { inPlace } from '../world/places';
import type { Seat } from '../world/world';
import type { Action } from '../ui/hud';
import { runQuiz } from '../ui/quiz';
import { confirmBox } from '../ui/panels';
import { foodPlate } from './props';
import { SCHOOL_OUT } from '../content/schedule';

const t = (h: number, m: number) => h * 60 + m;
export const DINNER_TIME = t(16, 0);

/**
 * Life at home: parents, getting dressed, breakfast, homework, dinner, and bed.
 * It runs all day, unlike the school activities that follow the schedule.
 */
export class HomeLife {
  private eating: { meal: 'breakfast' | 'dinner'; timer: number; plate: THREE.Object3D } | null = null;
  private said = new Set<string>();
  private wasHome = true;
  private doingHomework = false;

  constructor(private g: Game) {
    const w = g.world;
    const table = w.spot('table').pos;
    const ix = g.interactions;
    ix.add({ pos: w.spot('closet').pos, radius: 1.4, label: () => (g.dressed ? 'Change clothes' : 'Get dressed'), use: () => g.openWardrobe('wardrobe') });
    ix.add({
      pos: table,
      radius: 1.9,
      label: 'Eat breakfast',
      enabled: () => g.clock.minutes < t(8, 0) && !g.day.done.has('breakfast') && !this.eating,
      use: () => this.eat('breakfast'),
    });
    ix.add({
      pos: table,
      radius: 1.9,
      label: 'Eat dinner',
      enabled: () => g.clock.minutes >= DINNER_TIME && !g.day.done.has('dinner') && !this.eating,
      use: () => this.eat('dinner'),
    });
    ix.add({
      pos: w.seats.get('homework')![0].pos,
      radius: 1.3,
      label: 'Do homework',
      enabled: () => !g.day.done.has('homework') && (g.clock.minutes < t(7, 55) || g.clock.minutes >= SCHOOL_OUT) && !this.doingHomework,
      use: () => void this.homework(),
    });
    ix.add({ pos: w.spot('bed').pos, radius: 1.5, label: 'Go to sleep', enabled: () => g.clock.minutes >= SCHOOL_OUT, use: () => void this.bed() });
    for (const s of w.seats.get('couch')!) ix.add({ pos: s.pos, radius: 0.9, label: 'Relax', enabled: () => !s.taken, use: () => g.sitPlayer(s, 'sitTalk') });
  }

  reset() {
    this.eating?.plate.removeFromParent();
    this.eating = null;
    this.said.clear();
    this.wasHome = true;
    const mom = this.g.person('mom');
    const dad = this.g.person('dad');
    mom.busy = dad.busy = true;
    mom.placeAt(this.g.world.spot('stove'));
    dad.sitNow(this.g.world.seats.get('kitchen')![2], 'sitTalk');
  }

  greet() {
    const g = this.g;
    void g.bubbles.say(g.person('mom'), 'Mom', `Good morning, ${g.name}! Get dressed at your closet, then come eat breakfast. It's ${breakfastFor(g.save.day)}!`, 7);
  }

  private sayOnce(key: string, who: 'mom' | 'dad', text: string, secs = 5) {
    if (this.said.has(key)) return;
    this.said.add(key);
    void this.g.bubbles.say(this.g.person(who), who === 'mom' ? 'Mom' : 'Dad', text, secs);
  }

  private freeSeat(): Seat {
    const seats = this.g.world.seats.get('kitchen')!;
    let best = seats.find((s) => !s.taken)!;
    for (const s of seats) if (!s.taken && s.pos.distanceTo(this.g.player.pos) < best.pos.distanceTo(this.g.player.pos)) best = s;
    return best;
  }

  private eat(meal: 'breakfast' | 'dinner') {
    const g = this.g;
    const seat = this.freeSeat();
    g.sitPlayer(seat, 'sitTalk');
    const plate = foodPlate(meal === 'breakfast' ? ['#f6c445', '#c53030', '#ffffff'] : ['#c47f2c', '#38a169', '#e53e3e']);
    plate.position.copy(seat.table);
    g.scene.add(plate);
    this.eating = { meal, timer: 6, plate };
    const food = meal === 'breakfast' ? breakfastFor(g.save.day) : dinnerFor(g.save.day);
    void g.bubbles.say(g.person('mom'), 'Mom', meal === 'breakfast' ? `Here you go: ${food}. Eat up!` : `Tonight we're having ${food}. How was school?`, 5);
  }

  private async homework() {
    const g = this.g;
    const seat = g.world.seats.get('homework')![0];
    this.doingHomework = true;
    g.sitPlayer(seat, 'sit');
    g.sceneLock++;
    const ids: SubjectId[] = ['math', 'reading', 'science', 'social', 'writing'];
    const qs = ids.map((id) => pickQuestions(SUBJECTS[id], g.save.day, 1)[0]);
    const res = await runQuiz(g.ui, '📝 Homework', qs, { removeWrong: g.save.upgrades.pencil ?? 0 });
    g.save.totals.correct += res.correct;
    g.save.totals.answered += res.total;
    g.sceneLock--;
    this.doingHomework = false;
    g.toast(`Homework done: ${res.correct} of ${res.total} right`, 'good');
    g.completeTask('homework');
  }

  private async bed() {
    const g = this.g;
    const left = g.day.tasks.filter((x) => !g.day.done.has(x.id));
    if (left.length) {
      const ok = await confirmBox(g.ui, `You still have ${left.length} task${left.length > 1 ? 's' : ''} today (${left.map((x) => x.label).join(', ')}). Go to sleep anyway?`, 'Sleep', 'Not yet');
      if (!ok) return;
    }
    void g.sleep();
  }

  update(dt: number) {
    const g = this.g;
    const time = g.clock.minutes;
    if (this.eating) {
      this.eating.timer -= dt;
      if (this.eating.timer <= 0 || !g.player.seat) {
        const meal = this.eating.meal;
        this.eating.plate.removeFromParent();
        this.eating = null;
        if (g.player.seat || true) {
          g.completeTask(meal);
          if (meal === 'breakfast') this.sayOnce('bye', 'dad', `Have a great day at school, ${g.name}! Math starts at 8:00.`);
          else this.sayOnce('night', 'dad', "Don't forget homework. Bedtime whenever you're tired!");
        }
      }
    }
    const home = inPlace(g.zone, 'home');
    if (this.wasHome && !home && time < t(8, 0) && !g.dressed && !this.said.has('pjs')) {
      this.said.add('pjs');
      g.toast('😳 You left the house in your pajamas!', 'bad', 4);
    }
    if (!this.wasHome && home && time >= t(14, 0)) this.sayOnce('welcome', 'mom', `Welcome home, ${g.name}! How was school? Dinner is at 4:00.`);
    if (home && time >= DINNER_TIME && !g.day.done.has('dinner')) this.sayOnce('dinner', 'mom', 'Dinner is ready! Come sit at the table.');
    this.wasHome = home;
    // parents: mom cooks in the morning and evening; dad sits at the table
    const mom = g.person('mom');
    if (time >= DINNER_TIME && mom.char.pose === null && !mom.seat && !this.said.has('momsat')) {
      this.said.add('momsat');
      mom.sitNow(g.world.seats.get('kitchen')![3], 'sitTalk');
    }
  }

  actions(): Action[] {
    return [];
  }
}
