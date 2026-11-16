import { SAVE_KEY } from '../config';
import type { TodaySave } from '../game/day';

export type Identity = 'girl' | 'boy' | 'they';

/** The parts of you that stay the same. Set once in the avatar creator. */
export interface Avatar {
  name: string;
  identity: Identity;
  body: 'f' | 'm';
  /** 0.94 .. 1.06 */
  height: number;
  /** 0.92 .. 1.1 width multiplier */
  build: number;
  skin: string;
  eyes: string;
  freckles: boolean;
  glasses: boolean;
}

export interface Worn {
  id: string;
  color: string;
  color2: string;
}

/** What you are wearing. Changeable any time; saved outfits are Looks. */
export interface Look {
  hair: string;
  hairColor: string;
  top: Worn;
  bottom: Worn;
  shoes: Worn;
  hat: Worn | null;
  backpack: Worn | null;
}

export interface SavedOutfit {
  name: string;
  look: Look;
}

export interface DayRecord {
  day: number;
  attended: string[];
  late: string[];
  absent: string[];
  tasksDone: number;
  tasksTotal: number;
  cashEarned: number;
}

export interface SaveData {
  version: 1;
  avatar: Avatar | null;
  look: Look | null;
  outfits: SavedOutfit[];
  cash: number;
  /** upgrade id -> level bought */
  upgrades: Record<string, number>;
  /** clothing or hair ids bought in the shop */
  unlocked: string[];
  day: number;
  history: DayRecord[];
  totals: { attended: number; late: number; absent: number; perfectDays: number; correct: number; answered: number; goals: number; treats: number };
  settings: { quality: 'high' | 'low'; sound: boolean };
  /** Progress on the current day, so reloading keeps finished tasks (the day restarts in the morning). */
  today: TodaySave | null;
  /** Freestyle routine picked in PE (move ids). */
  peRoutine: string[];
  /** Latest painting from art class, as a small JPEG data URL. Hangs in your bedroom. */
  artwork: string | null;
}

export function freshSave(): SaveData {
  return {
    version: 1,
    avatar: null,
    look: null,
    outfits: [],
    cash: 0,
    upgrades: {},
    unlocked: [],
    day: 1,
    history: [],
    totals: { attended: 0, late: 0, absent: 0, perfectDays: 0, correct: 0, answered: 0, goals: 0, treats: 0 },
    settings: { quality: 'high', sound: true },
    today: null,
    peRoutine: [],
    artwork: null,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const data = JSON.parse(raw) as Partial<SaveData>;
    // Merge onto a fresh save so fields added in later versions get defaults.
    const base = freshSave();
    return { ...base, ...data, totals: { ...base.totals, ...data.totals }, settings: { ...base.settings, ...data.settings } } as SaveData;
  } catch {
    return freshSave();
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Private browsing or full storage: keep playing without saving.
  }
}
