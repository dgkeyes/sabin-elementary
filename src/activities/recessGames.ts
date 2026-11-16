import { Kickball } from './kickball';
import type { Game } from '../core/game';
import type { Action } from '../ui/hud';

/**
 * Extra recess games that run alongside soccer and the monkey bars.
 * Each one is created when recess starts and disposed when it ends.
 * `played` marks the recess task as done.
 */
export interface RecessGame {
  update(dt: number): void;
  actions(): Action[];
  dispose(): void;
}

export type RecessGameFactory = (g: Game, played: () => void) => RecessGame;

/** Add a recess game by listing its factory here. */
export const RECESS_GAMES: RecessGameFactory[] = [(g, played) => new Kickball(g, played)];
