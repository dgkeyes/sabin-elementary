/**
 * Game-wide tuning knobs. Change these to rebalance the game.
 */

/**
 * How many in-game minutes pass for every real second.
 * At 0.5, one class period (45 game minutes) lasts 90 real seconds and
 * the whole day from 7:00 AM to bedtime is about half an hour.
 */
export const GAME_MINUTES_PER_REAL_SECOND = 0.5;

/**
 * Game minutes between classes to walk to the next room (20 real seconds at the rate above).
 * The clock also stops while you are doing a class or have a menu open, so the whole passing
 * period is always yours.
 */
export const PASSING_MINUTES = 10;
/** Arriving this many game minutes after the bell still counts as on time. */
export const LATE_GRACE_MINUTES = 2;

/** Every session (and every new day) starts at this time, in minutes after midnight. */
export const DAY_START = 7 * 60;
/** At this time you fall asleep wherever you are. */
export const BEDTIME_LIMIT = 23 * 60 + 59;

/** Kids are scaled down from the adult-sized base models. */
export const KID_SCALE = 0.8;
export const ADULT_SCALE = 1.0;

/** Base movement speeds in meters per second. The Speedy Shoes upgrade adds to these. */
export const WALK_SPEED = 2.2;
export const RUN_SPEED = 4.6;
export const JUMP_VELOCITY = 5.2;
export const GRAVITY = 16;

/** Cash rewards. */
export const CASH_PER_TASK = 2;
export const CASH_ALL_TASKS_BONUS = 15;

/** localStorage key for the save file. */
export const SAVE_KEY = 'sabin-elementary-save-v1';
