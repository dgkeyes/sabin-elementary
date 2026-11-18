import { dailySchedule, type Block } from '../content/schedule';
import { SUBJECTS, type SubjectId } from '../content/subjects';

export type Attendance = 'ontime' | 'late' | 'absent';

export interface TaskDef {
  id: string;
  label: string;
}

export interface TodaySave {
  day: number;
  done: string[];
  attendance: [string, Attendance][];
  cashEarned: number;
}

const TASK_LABELS: Record<string, string> = {
  dress: 'Get dressed',
  breakfast: 'Eat breakfast',
  recess: 'Play at recess',
  lunch: 'Eat lunch',
  practice: 'Soccer practice',
  homework: 'Do homework',
  dinner: 'Eat dinner',
};

/** Everything about the current day: its schedule, checklist, and attendance. */
export class DayState {
  readonly blocks: Block[];
  readonly tasks: TaskDef[];
  readonly done = new Set<string>();
  readonly attendance = new Map<string, Attendance>();
  cashEarned = 0;

  constructor(readonly day: number, saved?: TodaySave | null) {
    this.blocks = dailySchedule(day);
    this.tasks = [];
    for (const b of this.blocks) {
      if (!b.task) continue;
      const label = b.subject ? `Go to ${SUBJECTS[b.subject as SubjectId].name}` : TASK_LABELS[b.task] ?? b.title;
      this.tasks.push({ id: b.task, label });
      if (b.task === 'practice') this.tasks.push({ id: 'homework', label: TASK_LABELS.homework });
    }
    if (saved && saved.day === day) {
      saved.done.forEach((d) => this.done.add(d));
      saved.attendance.forEach(([k, v]) => this.attendance.set(k, v));
      this.cashEarned = saved.cashEarned;
    }
  }

  block(id: string) {
    return this.blocks.find((b) => b.id === id);
  }

  /** A block counts as finished once its task is done or attendance is final. */
  finished(b: Block) {
    if (b.kind === 'walk') return true;
    if (b.attendance && this.attendance.has(b.id)) return true;
    if (b.task && this.done.has(b.task)) return true;
    return false;
  }

  /** Where you should be next: the first unfinished block that has not ended. */
  targetBlock(time: number): Block | null {
    for (const b of this.blocks) {
      if (time >= b.end || this.finished(b)) continue;
      return b;
    }
    return null;
  }

  /**
   * The one task to do next, in the day's order: get dressed, eat breakfast, then the schedule.
   * Tasks whose time has passed are skipped (getting dressed waits until breakfast is over),
   * and homework waits until after soccer practice.
   */
  nextTask(time: number): TaskDef | null {
    for (const task of this.tasks) {
      if (this.done.has(task.id)) continue;
      const blockId = task.id === 'dress' ? 'breakfast' : task.id === 'homework' ? 'evening' : null;
      const b = blockId ? this.block(blockId) : this.blocks.find((x) => x.task === task.id);
      if (b && time >= b.end) continue;
      return task;
    }
    return null;
  }

  toSave(): TodaySave {
    return { day: this.day, done: [...this.done], attendance: [...this.attendance], cashEarned: this.cashEarned };
  }
}
