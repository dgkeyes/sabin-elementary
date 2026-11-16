/**
 * The Starbucks menu (kid-friendly items). Prices are in game cash.
 * `boost` is game minutes of extra speed after you finish it (0 for none).
 * To add an item, add a row; `colors` are the cup or treat colors drawn on the table.
 */
export interface CafeItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  boost: number;
  line: string;
  colors: [string, string];
}

export const CAFE_MENU: CafeItem[] = [
  { id: 'cocoa', name: 'Hot cocoa', icon: '☕', price: 3, boost: 60, line: 'One hot cocoa with whipped cream, coming up!', colors: ['#ffffff', '#6b3e26'] },
  { id: 'frapp', name: 'Strawberry crème frappé', icon: '🍓', price: 4, boost: 90, line: 'A pink drink for a pink day!', colors: ['#ffffff', '#f19cbb'] },
  { id: 'lemonade', name: 'Lemonade', icon: '🍋', price: 2, boost: 40, line: 'Fresh lemonade, nice and cold.', colors: ['#f6e05e', '#fffbea'] },
  { id: 'cakepop', name: 'Cake pop', icon: '🍭', price: 2, boost: 30, line: 'Birthday cake pop! Every day is somebody\'s birthday.', colors: ['#ed64a6', '#ffffff'] },
  { id: 'cookie', name: 'Chocolate chip cookie', icon: '🍪', price: 1, boost: 20, line: 'Warm cookie, right out of the oven.', colors: ['#c58b4b', '#4a2c17'] },
  { id: 'milk', name: 'Vanilla milk', icon: '🥛', price: 1, boost: 0, line: 'A classic. Enjoy!', colors: ['#ffffff', '#fdf6e3'] },
];
