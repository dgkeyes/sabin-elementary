import type { Action } from '../ui/hud';

/**
 * Something that runs during part of the day: a class, recess, lunch, practice.
 * The director creates one when its schedule block is about to start and keeps
 * updating it until `finished` is true.
 *
 * To add a new kind of activity (homework club, art club, a field trip), write a class
 * like this and create it in game/director.ts for its block kind.
 */
export interface Activity {
  update(dt: number): void;
  /** The block's time is over. Wrap up; set finished when ready to be removed. */
  blockEnded(): void;
  readonly finished: boolean;
  /** Extra buttons to show while this activity runs, such as Kick or Stand up. */
  actions?(): Action[];
  dispose?(): void;
}
