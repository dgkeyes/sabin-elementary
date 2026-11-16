import { PASSING_MINUTES } from '../config';
import type { PlaceId } from '../world/places';
import type { SubjectId } from './subjects';

/**
 * The daily schedule. Times are minutes after midnight.
 * Days run Monday to Friday and repeat forever; day 1 is a Monday.
 *
 * To add a class: give it a subject in content/subjects and a block here.
 * To add an after-school activity: add a block with kind 'activity'.
 */
export type BlockKind = 'home' | 'walk' | 'class' | 'recess' | 'lunch' | 'practice' | 'evening';

export interface Block {
  id: string;
  kind: BlockKind;
  start: number;
  end: number;
  title: string;
  place: PlaceId;
  subject?: SubjectId;
  /** Task id in the daily checklist, if this block has one. */
  task?: string;
  /** Classes and practice track attendance. */
  attendance?: boolean;
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
export const weekday = (day: number) => WEEKDAYS[(day - 1) % 5];

const t = (h: number, m: number) => h * 60 + m;

/** Art, music, and PE take turns in the special slot. */
const SPECIALS: SubjectId[] = ['pe', 'art', 'music', 'pe', 'art'];
export const specialFor = (day: number) => SPECIALS[(day - 1) % 5];

export function dailySchedule(day: number): Block[] {
  const special = specialFor(day);
  const cls = (id: SubjectId, start: number, end: number, place: PlaceId, title: string): Block => ({
    id,
    kind: 'class',
    start,
    end,
    title,
    place,
    subject: id,
    task: id,
    attendance: true,
  });
  const specialPlace: PlaceId = special === 'pe' ? 'gym' : special === 'art' ? 'art' : 'music';
  const specialName = special === 'pe' ? 'PE' : special === 'art' ? 'Art' : 'Music';
  // School blocks run back to back with PASSING_MINUTES between them to get to the next room.
  let at = t(8, 0);
  const next = (mins: number) => {
    const start = at;
    at += mins + PASSING_MINUTES;
    return [start, start + mins] as const;
  };
  const CLASS = 40;
  const school: Block[] = [
    cls('math', ...next(CLASS), 'room5a', 'Math'),
    cls('reading', ...next(CLASS), 'room5a', 'Reading'),
    cls('science', ...next(CLASS), 'science', 'Science'),
    cls(special, ...next(CLASS), specialPlace, specialName),
  ];
  const [r0, r1] = next(30);
  school.push({ id: 'recess', kind: 'recess', start: r0, end: r1, title: 'Recess', place: 'field', task: 'recess' });
  const [l0, l1] = next(30);
  school.push({ id: 'lunch', kind: 'lunch', start: l0, end: l1, title: 'Lunch', place: 'cafeteria', task: 'lunch' });
  school.push(cls('social', ...next(CLASS), 'room5b', 'Social Studies'), cls('writing', ...next(CLASS), 'room5a', 'Writing'));
  const [p0, p1] = next(45);
  school.push({ id: 'practice', kind: 'practice', start: p0, end: p1, title: 'Soccer practice', place: 'field', task: 'practice', attendance: true });
  return [
    { id: 'dress', kind: 'home', start: t(7, 0), end: t(7, 15), title: 'Get dressed', place: 'bedroom', task: 'dress' },
    { id: 'breakfast', kind: 'home', start: t(7, 15), end: t(7, 45), title: 'Breakfast', place: 'kitchen', task: 'breakfast' },
    { id: 'walk', kind: 'walk', start: t(7, 45), end: t(8, 0), title: 'Walk to school', place: 'school' },
    ...school,
    { id: 'evening', kind: 'evening', start: at, end: t(23, 59), title: 'Evening at home', place: 'kitchen', task: 'dinner' },
  ];
}

/** When school (including practice) is over and the evening starts. The same every day. */
export const SCHOOL_OUT = dailySchedule(1).find((b) => b.id === 'evening')!.start;

/** The block happening now, or the next one if we are between blocks. */
export function currentBlock(blocks: Block[], time: number) {
  return blocks.find((b) => time >= b.start && time < b.end) ?? null;
}
export function nextBlock(blocks: Block[], time: number) {
  return blocks.find((b) => b.start > time) ?? null;
}
