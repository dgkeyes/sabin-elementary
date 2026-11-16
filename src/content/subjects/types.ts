export interface Question {
  q: string;
  choices: string[];
  /** Index of the right choice. Choices are shuffled when shown. */
  answer: number;
  /** Shown after the answer, right or wrong. */
  explain?: string;
}

export interface Lesson {
  title: string;
  /** What the teacher says before the questions, one speech bubble per line. */
  intro: string[];
  questions: Question[];
  /** Optional generator for endless practice, such as times tables. */
  generate?: () => Question;
}

/**
 * How the class is played after the teacher's intro:
 *  quiz  - multiple-choice questions
 *  pe    - tap/swipe moves (activities/pe.ts)
 *  art   - pick colors and shapes to make a picture, then a short quiz
 *  music - tap the beat, then a short quiz
 */
export type ClassMode = 'quiz' | 'pe' | 'art' | 'music';

export interface Subject {
  id: string;
  name: string;
  teacher: string;
  /** Which NPC look to use for the teacher, see game/cast.ts. */
  teacherLook: string;
  mode: ClassMode;
  emoji: string;
  lessons: Lesson[];
}
