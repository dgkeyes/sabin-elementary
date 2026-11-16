import { reading, writing } from './language';
import { math } from './math';
import { science } from './science';
import { social } from './social';
import { art, music, pe } from './specials';
import type { Question, Subject } from './types';
import { shuffle } from '../../util/math';

export type { Question, Lesson, Subject, ClassMode } from './types';

/** Every class subject. Add a new subject file and list it here. */
export const SUBJECTS = { math, reading, science, social, writing, art, music, pe } satisfies Record<string, Subject>;
export type SubjectId = keyof typeof SUBJECTS;

export const QUESTIONS_PER_CLASS = 4;

/** Today's lesson rotates through the subject's lessons by day number. */
export function lessonFor(subject: Subject, day: number) {
  return subject.lessons[(day - 1) % subject.lessons.length];
}

/** Picks questions for a class and shuffles the answer choices. */
export function pickQuestions(subject: Subject, day: number, n = QUESTIONS_PER_CLASS): Question[] {
  const lesson = lessonFor(subject, day);
  const pool = lesson.generate ? Array.from({ length: n }, lesson.generate) : shuffle([...lesson.questions]).slice(0, n);
  return pool.map(shuffleChoices);
}

export function shuffleChoices(q: Question): Question {
  const order = shuffle(q.choices.map((_, i) => i));
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}
