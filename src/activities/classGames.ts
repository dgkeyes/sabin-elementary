import type { Npc } from '../characters/npc';
import type { Game } from '../core/game';
import type { ClassMode, Subject } from '../content/subjects';
import { artClass } from './art';
import { musicClass } from './music';
import { peClass } from './pe';

/**
 * Class games for subjects that are not plain quizzes. A missing mode falls back to the quiz.
 * Each game resolves when the class part is over. Art and music add a short quiz after the game
 * (see QUIZ_AFTER); PE is all movement.
 */
export type ClassGame = (g: Game, subject: Subject, teacher: Npc) => Promise<void>;

export const CLASS_GAMES: Partial<Record<ClassMode, ClassGame>> = {
  pe: (g, _s, coach) => peClass(g, coach),
  art: (g, _s, teacher) => artClass(g, teacher),
  music: (g, _s, teacher) => musicClass(g, teacher),
};

/** How many quiz questions follow a class game (0 for none). */
export const QUIZ_AFTER: Partial<Record<ClassMode, number>> = { art: 2, music: 2 };
