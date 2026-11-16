/**
 * Clothing, hair, and avatar options.
 *
 * Tops, pants, skirts, and shoes are painted onto the body by a shader (see characters/lookShader.ts),
 * so a new item is just a row in this file. Hats, backpacks, skirts, hoods, and hair add-ons are small
 * 3D shapes built in characters/accessories.ts.
 *
 * To add an item: append it to CLOTHING with a unique id. Give it a price to make it a shop unlock.
 */

export type Category = 'tops' | 'pants' | 'skirts' | 'shoes' | 'hats' | 'backpacks';
export type Slot = 'top' | 'bottom' | 'shoes' | 'hat' | 'backpack';

/** Patterns the shader can draw. Color 2 is the pattern color. */
export const PATTERNS = {
  solid: 0,
  stripes: 1,
  dots: 2,
  plaid: 3,
  twoTone: 4, // tops: sleeves in color 2; shoes: toe and sole
  star: 5,
  heart: 6,
  sideStripe: 7,
  camo: 8,
  rainbow: 9,
  number: 10,
  denim: 11,
  flowers: 12,
  lightning: 13,
} as const;
export type Pattern = keyof typeof PATTERNS;

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  /**
   * tops: sleeve length (-1 none, 0.45 short, 1.5 three-quarter, 1.95 long)
   * pants: leg length (0..1 down the thigh, 1..2 down the calf)
   * skirts: skirt length in meters (adult scale)
   * shoes: how far up the calf the shoe reaches (0.9 low, 0.75 high-top, 0.45 boot)
   * hats/backpacks: shape name in accessories.ts
   */
  shape: number | string;
  pattern: Pattern;
  colors: [string, string];
  /** Puffs the garment out from the body, in meters. */
  inflate?: number;
  /** Extra 3D parts: 'hood', 'collar', 'tutu', 'jacket'. */
  extra?: string;
  /** Cash price; 0 or missing means it is in the starter set. */
  price?: number;
}

export const CLOTHING: ClothingItem[] = [
  // ---------- tops ----------
  { id: 'tee', name: 'T-shirt', category: 'tops', shape: 0.45, pattern: 'solid', colors: ['#3b82f6', '#ffffff'] },
  { id: 'tee-stripes', name: 'Striped tee', category: 'tops', shape: 0.45, pattern: 'stripes', colors: ['#ffffff', '#e05252'] },
  { id: 'long-sleeve', name: 'Long sleeve', category: 'tops', shape: 1.95, pattern: 'solid', colors: ['#38a169', '#ffffff'] },
  { id: 'tank', name: 'Tank top', category: 'tops', shape: -1, pattern: 'solid', colors: ['#f6ad55', '#ffffff'] },
  { id: 'raglan', name: 'Baseball tee', category: 'tops', shape: 1.5, pattern: 'twoTone', colors: ['#ffffff', '#2b6cb0'] },
  { id: 'hoodie', name: 'Hoodie', category: 'tops', shape: 1.95, pattern: 'solid', colors: ['#805ad5', '#ffffff'], inflate: 0.016, extra: 'hood' },
  { id: 'star-tee', name: 'Star tee', category: 'tops', shape: 0.45, pattern: 'star', colors: ['#1a202c', '#f6e05e'] },
  { id: 'heart-tee', name: 'Heart tee', category: 'tops', shape: 0.45, pattern: 'heart', colors: ['#fbb6ce', '#e53e3e'] },
  { id: 'polo', name: 'Polo', category: 'tops', shape: 0.45, pattern: 'solid', colors: ['#2c7a7b', '#ffffff'], extra: 'collar' },
  { id: 'plaid-shirt', name: 'Flannel', category: 'tops', shape: 1.95, pattern: 'plaid', colors: ['#c53030', '#1a202c'], inflate: 0.01, extra: 'collar' },
  { id: 'jersey', name: 'Soccer jersey', category: 'tops', shape: 0.45, pattern: 'number', colors: ['#2b6cb0', '#ffffff'], price: 20 },
  { id: 'dots-top', name: 'Polka dot top', category: 'tops', shape: 0.45, pattern: 'dots', colors: ['#fefcbf', '#d53f8c'], price: 10 },
  { id: 'rainbow-tee', name: 'Rainbow tee', category: 'tops', shape: 0.45, pattern: 'rainbow', colors: ['#ffffff', '#ffffff'], price: 25 },
  { id: 'camo-hoodie', name: 'Camo hoodie', category: 'tops', shape: 1.95, pattern: 'camo', colors: ['#5a6b3c', '#2f3a1f'], inflate: 0.016, extra: 'hood', price: 30 },
  { id: 'flower-top', name: 'Flower top', category: 'tops', shape: 1.5, pattern: 'flowers', colors: ['#bee3f8', '#f687b3'], price: 15 },
  { id: 'bolt-tee', name: 'Lightning tee', category: 'tops', shape: 0.45, pattern: 'lightning', colors: ['#2d3748', '#f6e05e'], price: 15 },
  { id: 'jacket', name: 'Jean jacket', category: 'tops', shape: 1.95, pattern: 'denim', colors: ['#4a6fa5', '#e2e8f0'], inflate: 0.02, extra: 'jacket', price: 35 },
  { id: 'stripe-long', name: 'Striped long sleeve', category: 'tops', shape: 1.95, pattern: 'stripes', colors: ['#2c5282', '#ffffff'] },
  { id: 'sharks-tee', name: 'Sabin Sharks tee', category: 'tops', shape: 0.45, pattern: 'twoTone', colors: ['#2b6cb0', '#ffffff'] },
  { id: 'red-jersey', name: 'Red jersey', category: 'tops', shape: 0.45, pattern: 'number', colors: ['#c53030', '#ffffff'], price: 20 },
  { id: 'star-hoodie', name: 'Star hoodie', category: 'tops', shape: 1.95, pattern: 'star', colors: ['#2a4365', '#f6e05e'], inflate: 0.016, extra: 'hood', price: 30 },
  { id: 'heart-sweater', name: 'Heart sweater', category: 'tops', shape: 1.95, pattern: 'heart', colors: ['#fed7e2', '#d53f8c'], inflate: 0.012, price: 20 },
  { id: 'bolt-hoodie', name: 'Lightning hoodie', category: 'tops', shape: 1.95, pattern: 'lightning', colors: ['#1a202c', '#f6e05e'], inflate: 0.016, extra: 'hood', price: 30 },
  { id: 'rainbow-hoodie', name: 'Rainbow hoodie', category: 'tops', shape: 1.95, pattern: 'rainbow', colors: ['#ffffff', '#ffffff'], inflate: 0.016, extra: 'hood', price: 40 },
  { id: 'flower-polo', name: 'Flower polo', category: 'tops', shape: 0.45, pattern: 'flowers', colors: ['#fefcbf', '#38a169'], extra: 'collar', price: 15 },

  // ---------- pants ----------
  { id: 'jeans', name: 'Jeans', category: 'pants', shape: 1.93, pattern: 'denim', colors: ['#3c5a8a', '#2a4066'] },
  { id: 'joggers', name: 'Joggers', category: 'pants', shape: 1.9, pattern: 'sideStripe', colors: ['#4a5568', '#ffffff'], inflate: 0.008 },
  { id: 'shorts', name: 'Shorts', category: 'pants', shape: 0.6, pattern: 'solid', colors: ['#2d3748', '#ffffff'], inflate: 0.008 },
  { id: 'leggings', name: 'Leggings', category: 'pants', shape: 1.93, pattern: 'solid', colors: ['#1a202c', '#ffffff'] },
  { id: 'capris', name: 'Capris', category: 'pants', shape: 1.45, pattern: 'solid', colors: ['#e9d8a6', '#ffffff'] },
  { id: 'khakis', name: 'Khakis', category: 'pants', shape: 1.93, pattern: 'solid', colors: ['#c8b48a', '#ffffff'], inflate: 0.006 },
  { id: 'soccer-shorts', name: 'Soccer shorts', category: 'pants', shape: 0.55, pattern: 'sideStripe', colors: ['#1a202c', '#f6e05e'], inflate: 0.01 },
  { id: 'plaid-pants', name: 'Plaid pants', category: 'pants', shape: 1.93, pattern: 'plaid', colors: ['#2c5282', '#9b2c2c'], price: 15 },
  { id: 'camo-shorts', name: 'Camo shorts', category: 'pants', shape: 0.65, pattern: 'camo', colors: ['#5a6b3c', '#2f3a1f'], inflate: 0.01, price: 15 },
  { id: 'rainbow-leggings', name: 'Rainbow leggings', category: 'pants', shape: 1.93, pattern: 'rainbow', colors: ['#ffffff', '#ffffff'], price: 20 },
  { id: 'cargo-shorts', name: 'Cargo shorts', category: 'pants', shape: 0.75, pattern: 'solid', colors: ['#a0916b', '#ffffff'], inflate: 0.012 },
  { id: 'track-pants', name: 'Track pants', category: 'pants', shape: 1.9, pattern: 'sideStripe', colors: ['#c53030', '#ffffff'], inflate: 0.008 },
  { id: 'star-leggings', name: 'Star leggings', category: 'pants', shape: 1.93, pattern: 'star', colors: ['#2a4365', '#f6e05e'], price: 15 },
  { id: 'flower-pants', name: 'Flower pants', category: 'pants', shape: 1.93, pattern: 'flowers', colors: ['#e6fffa', '#d53f8c'], inflate: 0.006, price: 15 },
  { id: 'heart-leggings', name: 'Heart leggings', category: 'pants', shape: 1.93, pattern: 'heart', colors: ['#fbb6ce', '#c53030'], price: 15 },
  { id: 'bolt-shorts', name: 'Lightning shorts', category: 'pants', shape: 0.6, pattern: 'lightning', colors: ['#2b6cb0', '#f6e05e'], inflate: 0.01, price: 15 },

  // ---------- skirts ----------
  { id: 'skirt', name: 'Skirt', category: 'skirts', shape: 0.38, pattern: 'solid', colors: ['#d53f8c', '#ffffff'] },
  { id: 'pleated', name: 'Pleated skirt', category: 'skirts', shape: 0.42, pattern: 'plaid', colors: ['#2c5282', '#c53030'] },
  { id: 'long-skirt', name: 'Long skirt', category: 'skirts', shape: 0.62, pattern: 'flowers', colors: ['#faf089', '#e53e3e'] },
  { id: 'denim-skirt', name: 'Denim skirt', category: 'skirts', shape: 0.32, pattern: 'denim', colors: ['#4a6fa5', '#2a4066'] },
  { id: 'tutu', name: 'Tutu', category: 'skirts', shape: 0.3, pattern: 'solid', colors: ['#fbb6ce', '#ffffff'], extra: 'tutu', price: 20 },
  { id: 'star-skirt', name: 'Star skirt', category: 'skirts', shape: 0.4, pattern: 'dots', colors: ['#2a4365', '#faf089'], price: 15 },
  { id: 'plaid-mini', name: 'Plaid mini', category: 'skirts', shape: 0.3, pattern: 'plaid', colors: ['#9b2c2c', '#1a202c'] },
  { id: 'heart-skirt', name: 'Heart skirt', category: 'skirts', shape: 0.38, pattern: 'heart', colors: ['#ffffff', '#e53e3e'], price: 15 },
  { id: 'rainbow-skirt', name: 'Rainbow skirt', category: 'skirts', shape: 0.45, pattern: 'rainbow', colors: ['#ffffff', '#ffffff'], price: 20 },
  { id: 'purple-tutu', name: 'Purple tutu', category: 'skirts', shape: 0.3, pattern: 'solid', colors: ['#b794f4', '#ffffff'], extra: 'tutu', price: 20 },

  // ---------- shoes ----------
  { id: 'sneakers', name: 'Sneakers', category: 'shoes', shape: 0.9, pattern: 'twoTone', colors: ['#e53e3e', '#ffffff'] },
  { id: 'high-tops', name: 'High-tops', category: 'shoes', shape: 0.76, pattern: 'twoTone', colors: ['#1a202c', '#ffffff'] },
  { id: 'boots', name: 'Boots', category: 'shoes', shape: 0.5, pattern: 'solid', colors: ['#744210', '#2d1a06'], inflate: 0.012 },
  { id: 'flats', name: 'Flats', category: 'shoes', shape: 0.97, pattern: 'solid', colors: ['#2d3748', '#ffffff'] },
  { id: 'cleats', name: 'Soccer cleats', category: 'shoes', shape: 0.9, pattern: 'twoTone', colors: ['#f6e05e', '#1a202c'] },
  { id: 'rain-boots', name: 'Rain boots', category: 'shoes', shape: 0.35, pattern: 'dots', colors: ['#f6e05e', '#ffffff'], inflate: 0.018, price: 15 },
  { id: 'glow-sneakers', name: 'Light-up sneakers', category: 'shoes', shape: 0.9, pattern: 'rainbow', colors: ['#ffffff', '#ffffff'], price: 30 },
  { id: 'pink-high-tops', name: 'Pink high-tops', category: 'shoes', shape: 0.76, pattern: 'twoTone', colors: ['#f687b3', '#ffffff'] },
  { id: 'star-sneakers', name: 'Star sneakers', category: 'shoes', shape: 0.9, pattern: 'star', colors: ['#2b6cb0', '#f6e05e'], price: 15 },
  { id: 'cowboy-boots', name: 'Cowboy boots', category: 'shoes', shape: 0.45, pattern: 'twoTone', colors: ['#9c4221', '#f6e05e'], inflate: 0.012, price: 25 },
  { id: 'heart-flats', name: 'Heart flats', category: 'shoes', shape: 0.97, pattern: 'heart', colors: ['#fbb6ce', '#e53e3e'], price: 10 },

  // ---------- hats ----------
  { id: 'cap', name: 'Baseball cap', category: 'hats', shape: 'cap', pattern: 'solid', colors: ['#2b6cb0', '#ffffff'] },
  { id: 'beanie', name: 'Beanie', category: 'hats', shape: 'beanie', pattern: 'stripes', colors: ['#e53e3e', '#ffffff'] },
  { id: 'sunhat', name: 'Sun hat', category: 'hats', shape: 'sunhat', pattern: 'solid', colors: ['#f6e05e', '#e53e3e'] },
  { id: 'bucket', name: 'Bucket hat', category: 'hats', shape: 'bucket', pattern: 'solid', colors: ['#68d391', '#ffffff'] },
  { id: 'headband', name: 'Headband', category: 'hats', shape: 'headband', pattern: 'solid', colors: ['#d53f8c', '#ffffff'] },
  { id: 'bow', name: 'Hair bow', category: 'hats', shape: 'bow', pattern: 'solid', colors: ['#e53e3e', '#ffffff'] },
  { id: 'crown', name: 'Crown', category: 'hats', shape: 'crown', pattern: 'solid', colors: ['#ecc94b', '#e53e3e'], price: 40 },
  { id: 'cat-ears', name: 'Cat ears', category: 'hats', shape: 'catears', pattern: 'solid', colors: ['#1a202c', '#fbb6ce'], price: 20 },
  { id: 'propeller', name: 'Propeller cap', category: 'hats', shape: 'propeller', pattern: 'solid', colors: ['#3182ce', '#e53e3e'], price: 25 },
  { id: 'team-cap', name: 'Sharks cap', category: 'hats', shape: 'cap', pattern: 'solid', colors: ['#c53030', '#ffffff'] },
  { id: 'cozy-beanie', name: 'Cozy beanie', category: 'hats', shape: 'beanie', pattern: 'stripes', colors: ['#805ad5', '#fbb6ce'], price: 10 },
  { id: 'gold-bow', name: 'Gold bow', category: 'hats', shape: 'bow', pattern: 'solid', colors: ['#ecc94b', '#ffffff'], price: 10 },
  { id: 'white-ears', name: 'Bunny-white ears', category: 'hats', shape: 'catears', pattern: 'solid', colors: ['#ffffff', '#fbb6ce'], price: 20 },
  { id: 'silver-crown', name: 'Silver crown', category: 'hats', shape: 'crown', pattern: 'solid', colors: ['#cbd5e0', '#3182ce'], price: 40 },

  // ---------- backpacks ----------
  { id: 'backpack', name: 'Backpack', category: 'backpacks', shape: 'classic', pattern: 'solid', colors: ['#3182ce', '#f6ad55'] },
  { id: 'mini-pack', name: 'Mini backpack', category: 'backpacks', shape: 'mini', pattern: 'solid', colors: ['#d53f8c', '#ffffff'] },
  { id: 'sport-pack', name: 'Sport pack', category: 'backpacks', shape: 'sport', pattern: 'solid', colors: ['#2d3748', '#f6e05e'] },
  { id: 'big-pack', name: 'Big backpack', category: 'backpacks', shape: 'big', pattern: 'solid', colors: ['#38a169', '#2f855a'] },
  { id: 'jetpack', name: 'Rocket pack', category: 'backpacks', shape: 'rocket', pattern: 'solid', colors: ['#a0aec0', '#e53e3e'], price: 50 },
  { id: 'galaxy-pack', name: 'Galaxy backpack', category: 'backpacks', shape: 'classic', pattern: 'solid', colors: ['#44337a', '#f6e05e'], price: 15 },
  { id: 'sunny-mini', name: 'Sunny mini pack', category: 'backpacks', shape: 'mini', pattern: 'solid', colors: ['#f6e05e', '#ed8936'], price: 10 },
  { id: 'gold-rocket', name: 'Gold rocket pack', category: 'backpacks', shape: 'rocket', pattern: 'solid', colors: ['#ecc94b', '#3182ce'], price: 75 },
];

export const CLOTHING_BY_ID = new Map(CLOTHING.map((c) => [c.id, c]));

export const CATEGORIES: { id: Category; name: string; slot: Slot; optional: boolean }[] = [
  { id: 'tops', name: 'Tops', slot: 'top', optional: false },
  { id: 'pants', name: 'Pants', slot: 'bottom', optional: false },
  { id: 'skirts', name: 'Skirts', slot: 'bottom', optional: false },
  { id: 'shoes', name: 'Shoes', slot: 'shoes', optional: false },
  { id: 'hats', name: 'Hats', slot: 'hat', optional: true },
  { id: 'backpacks', name: 'Backpacks', slot: 'backpack', optional: true },
];

export const CLOTH_COLORS = [
  '#ffffff', '#1a202c', '#718096', '#e53e3e', '#f6ad55', '#f6e05e', '#68d391', '#38a169',
  '#4fd1c5', '#3182ce', '#2c5282', '#805ad5', '#d53f8c', '#fbb6ce', '#c8b48a', '#744210', '#3c5a8a',
];

// ---------- hair ----------

export interface HairStyle {
  id: string;
  name: string;
  /** Mesh name in public/models/hair.glb, or null for none. */
  mesh: string | null;
  /** Clip hair below this height above the eyes (meters, adult scale). Used to make a bob from long hair. */
  clipBelow?: number;
  /** Extra 3D parts built in accessories.ts. */
  extras?: string[];
  price?: number;
}

export const HAIR_STYLES: HairStyle[] = [
  { id: 'long', name: 'Long', mesh: 'Hair_Long' },
  { id: 'bob', name: 'Bob', mesh: 'Hair_Long', clipBelow: -0.06 },
  { id: 'ponytail', name: 'Ponytail', mesh: 'Hair_BuzzedFemale', extras: ['ponytail'] },
  { id: 'pigtails', name: 'Pigtails', mesh: 'Hair_BuzzedFemale', extras: ['pigtails'] },
  { id: 'buns', name: 'Space buns', mesh: 'Hair_Buns' },
  { id: 'topbun', name: 'Top bun', mesh: 'Hair_BuzzedFemale', extras: ['topbun'] },
  { id: 'parted', name: 'Side part', mesh: 'Hair_SimpleParted' },
  { id: 'short', name: 'Short', mesh: 'Hair_Buzzed' },
  { id: 'curly', name: 'Curly puff', mesh: 'Hair_BuzzedFemale', extras: ['puff'] },
  { id: 'braids', name: 'Braids', mesh: 'Hair_BuzzedFemale', extras: ['braids'] },
  { id: 'shaved', name: 'Buzz cut', mesh: 'Hair_BuzzedFemale' },
  { id: 'bald', name: 'Bald', mesh: null },
  { id: 'long-pony', name: 'Long + bow', mesh: 'Hair_Long', extras: ['backbow'], price: 10 },
  { id: 'mohawk', name: 'Mohawk', mesh: null, extras: ['mohawk'], price: 15 },
  { id: 'afro', name: 'Big curls', mesh: 'Hair_BuzzedFemale', extras: ['afro'], price: 10 },
  { id: 'halfup', name: 'Half-up bun', mesh: 'Hair_Long', extras: ['topbun'], price: 10 },
  { id: 'bob-bow', name: 'Bob + bow', mesh: 'Hair_Long', clipBelow: -0.06, extras: ['backbow'], price: 10 },
  { id: 'highpony', name: 'High ponytail', mesh: 'Hair_BuzzedFemale', extras: ['highpony'], price: 10 },
  { id: 'sidepony', name: 'Side ponytail', mesh: 'Hair_BuzzedFemale', extras: ['sidepony'], price: 10 },
  { id: 'parted-pony', name: 'Short pony', mesh: 'Hair_SimpleParted', extras: ['ponytail'], price: 10 },
  { id: 'spiky', name: 'Spiky top', mesh: 'Hair_Buzzed', extras: ['mohawk'], price: 15 },
  { id: 'long-braids', name: 'Long braids', mesh: 'Hair_Long', clipBelow: -0.06, extras: ['braids'], price: 15 },
];
export const HAIR_BY_ID = new Map(HAIR_STYLES.map((h) => [h.id, h]));

/** Which source body each hair mesh was modeled on, so it can be moved onto the other body. */
export const HAIR_NATIVE_BODY: Record<string, 'f' | 'm'> = {
  Hair_Long: 'f',
  Hair_Buns: 'f',
  Hair_BuzzedFemale: 'f',
  Hair_Buzzed: 'm',
  Hair_SimpleParted: 'm',
  Hair_Beard: 'm',
};

export const HAIR_COLORS = [
  '#1b1311', '#3b2417', '#5c3a21', '#8a5a33', '#a0522d', '#c97b3d', '#d9b26f', '#efe1b0',
  '#9a9a9a', '#e05297', '#7c5cff', '#3a86ff', '#2bb673',
];

export const SKIN_TONES = ['#f6d7c3', '#efc3a4', '#e0ac8a', '#c98e66', '#a8714d', '#8a5a3c', '#6b432b', '#4a2e1f'];
export const EYE_COLORS = ['#4b2e17', '#7a4a1e', '#8e7a3a', '#3e7a4a', '#3d6fb0', '#6f7f8f'];
