/** School lunch rotates through this menu, one entry per school day. */
export interface Meal {
  name: string;
  sides: string;
  /** Colors of the food on the tray: main, side, fruit, drink. */
  colors: [string, string, string, string];
}

export const LUNCH_MENU: Meal[] = [
  { name: 'Cheese pizza', sides: 'carrot sticks, an apple, and milk', colors: ['#f6c445', '#ed8936', '#e53e3e', '#ffffff'] },
  { name: 'Chicken tacos', sides: 'rice, beans, an orange, and milk', colors: ['#f6e05e', '#f7fafc', '#ed8936', '#ffffff'] },
  { name: 'Spaghetti and meatballs', sides: 'green beans, grapes, and chocolate milk', colors: ['#c53030', '#38a169', '#805ad5', '#7b4a2a'] },
  { name: 'Grilled cheese and tomato soup', sides: 'apple slices and milk', colors: ['#d69e2e', '#c53030', '#68d391', '#ffffff'] },
  { name: 'Chicken nuggets', sides: 'tater tots, a banana, and milk', colors: ['#c47f2c', '#d69e2e', '#f6e05e', '#ffffff'] },
  { name: 'Mac and cheese', sides: 'broccoli, strawberries, and milk', colors: ['#f6ad55', '#2f855a', '#e53e3e', '#ffffff'] },
  { name: 'Turkey sandwich', sides: 'a salad, a pear, and juice', colors: ['#e2c48f', '#48bb78', '#c6d84a', '#f6ad55'] },
];

export const BREAKFASTS = ['pancakes with berries', 'scrambled eggs and toast', 'oatmeal with bananas', 'waffles', 'cereal and orange juice', 'a breakfast burrito'];
export const DINNERS = ['tacos', 'spaghetti', 'stir fry', 'homemade pizza', 'chicken and rice', 'soup and sandwiches', 'burgers'];

export const mealFor = (day: number) => LUNCH_MENU[(day - 1) % LUNCH_MENU.length];
export const breakfastFor = (day: number) => BREAKFASTS[(day - 1) % BREAKFASTS.length];
export const dinnerFor = (day: number) => DINNERS[(day * 3) % DINNERS.length];
