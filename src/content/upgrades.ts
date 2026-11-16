/**
 * Things to buy with cash earned from daily tasks. Nothing costs real money.
 * `prices` has one entry per level. Effects are read through upgradeLevel() where they apply.
 */
export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  describe: (level: number) => string;
  prices: number[];
}

export const UPGRADES: Upgrade[] = [
  { id: 'speed', name: 'Speedy Shoes', icon: '👟', describe: (l) => `Move ${12 * (l + 1)}% faster everywhere.`, prices: [20, 40, 70] },
  { id: 'jump', name: 'Spring Socks', icon: '🧦', describe: (l) => `Jump ${20 * (l + 1)}% higher.`, prices: [15, 35] },
  { id: 'kick', name: 'Power Kick', icon: '⚽', describe: (l) => `Kick the ball ${20 * (l + 1)}% harder.`, prices: [20, 45] },
  { id: 'piggy', name: 'Piggy Bank', icon: '🐷', describe: (l) => `Earn $${l + 1} extra for every task you finish.`, prices: [25, 60, 100] },
  { id: 'pencil', name: 'Lucky Pencil', icon: '✏️', describe: (l) => (l === 0 ? 'Crosses out one wrong answer on every class question.' : 'Crosses out two wrong answers.'), prices: [30, 70] },
  { id: 'treats', name: 'Starbucks Card', icon: '💳', describe: (l) => `Starbucks speed boosts last ${50 * (l + 1)}% longer.`, prices: [15, 35] },
];

export const UPGRADE_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export const speedMultiplier = (lv: number) => 1 + 0.12 * lv;
export const jumpMultiplier = (lv: number) => 1 + 0.2 * lv;
export const kickMultiplier = (lv: number) => 1 + 0.2 * lv;
export const treatBoostMultiplier = (lv: number) => 1 + 0.5 * lv;
