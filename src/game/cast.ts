import { CLOTHING, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN_TONES } from '../content/clothing';
import type { Appearance } from '../characters/character';
import type { Avatar, Identity, Look, Worn } from '../core/save';
import { pick, rng } from '../util/math';

/** Builds a worn item, defaulting to the item's own colors. */
export function wear(id: string, color?: string, color2?: string): Worn {
  const item = CLOTHING.find((c) => c.id === id);
  if (!item) throw new Error('unknown clothing ' + id);
  return { id, color: color ?? item.colors[0], color2: color2 ?? item.colors[1] };
}

export function look(hair: string, hairColor: string, top: Worn, bottom: Worn, shoes: Worn, hat: Worn | null = null, backpack: Worn | null = null): Look {
  return { hair, hairColor, top, bottom, shoes, hat, backpack };
}

/** What you sleep in. Shown each morning until you get dressed. */
export function pajamas(l: Look): Look {
  return { ...l, top: wear('long-sleeve', '#9f7aea', '#ffffff'), bottom: wear('joggers', '#b794f4', '#ffffff'), shoes: wear('flats', '#e9d8fd', '#ffffff'), hat: null, backpack: null };
}

export function defaultAvatar(identity: Identity): Avatar {
  return {
    name: '',
    identity,
    body: identity === 'boy' ? 'm' : 'f',
    height: 1,
    build: 1,
    skin: SKIN_TONES[3],
    eyes: EYE_COLORS[0],
    freckles: false,
    glasses: false,
  };
}

export function defaultLook(identity: Identity): Look {
  if (identity === 'girl') return look('ponytail', HAIR_COLORS[2], wear('tee-stripes'), wear('jeans'), wear('sneakers'), null, wear('backpack', '#805ad5', '#f6e05e'));
  if (identity === 'boy') return look('short', HAIR_COLORS[1], wear('tee'), wear('joggers'), wear('high-tops'), null, wear('backpack'));
  return look('bob', HAIR_COLORS[4], wear('hoodie', '#38a169'), wear('jeans'), wear('sneakers', '#3182ce'), null, wear('sport-pack'));
}

// ---------- NPCs ----------

export interface CastMember {
  id: string;
  name: string;
  appearance: Appearance;
  look: Look;
  kid: boolean;
}

const adult = (body: 'f' | 'm', skin: string, height = 1, build = 1, glasses = false): Appearance => ({ body, skin, eyes: EYE_COLORS[1], freckles: false, glasses, height, build });

/** Grown-ups. teacherLook in subjects/ refers to these ids. */
export const ADULTS: CastMember[] = [
  { id: 'rivera', name: 'Ms. Rivera', kid: false, appearance: adult('f', SKIN_TONES[3]), look: look('bob', '#2a1a12', wear('raglan', '#ffffff', '#c53030'), wear('long-skirt', '#2c5282', '#f6e05e'), wear('flats')) },
  { id: 'patel', name: 'Mr. Patel', kid: false, appearance: adult('m', SKIN_TONES[5], 1.02, 1, true), look: look('parted', '#1b1311', wear('long-sleeve', '#f7fafc'), wear('khakis'), wear('boots', '#4a3428')) },
  { id: 'okafor', name: 'Mrs. Okafor', kid: false, appearance: adult('f', SKIN_TONES[7], 1.01), look: look('topbun', '#1b1311', wear('flower-top', '#fefcbf', '#d69e2e'), wear('long-skirt', '#9b2c2c', '#f6e05e'), wear('flats', '#744210')) },
  { id: 'lee', name: 'Mx. Lee', kid: false, appearance: adult('f', SKIN_TONES[1], 0.98, 1, true), look: look('short', '#5c3a21', wear('plaid-shirt', '#d69e2e', '#2d3748'), wear('jeans'), wear('high-tops', '#e53e3e')) },
  { id: 'bell', name: 'Mr. Bell', kid: false, appearance: adult('m', SKIN_TONES[2], 0.98, 1.05), look: look('shaved', '#9a9a9a', wear('polo', '#553c9a', '#ffffff'), wear('khakis', '#2d3748'), wear('flats', '#1a202c')) },
  { id: 'davis', name: 'Coach Davis', kid: false, appearance: adult('m', SKIN_TONES[6], 1.03, 1.05), look: look('shaved', '#1b1311', wear('jersey', '#2b6cb0', '#ffffff'), wear('soccer-shorts'), wear('cleats'), wear('cap', '#2b6cb0', '#ffffff')) },
  { id: 'lunch', name: 'Mrs. Gomez', kid: false, appearance: adult('f', SKIN_TONES[4], 0.96, 1.08), look: look('buns', '#3b2417', wear('tee', '#e05252'), wear('khakis', '#2d3748'), wear('flats', '#1a202c'), wear('headband', '#ffffff')) },
  { id: 'barista', name: 'Jordan', kid: false, appearance: adult('m', SKIN_TONES[2], 1, 0.95), look: look('parted', '#8a5a33', wear('polo', '#00704a', '#ffffff'), wear('jeans', '#1a202c'), wear('flats', '#1a202c'), wear('cap', '#00704a', '#ffffff')) },
];

/** Parents look a little like you: same skin tone. */
export function parents(skin: string): CastMember[] {
  return [
    { id: 'mom', name: 'Mom', kid: false, appearance: adult('f', skin), look: look('long', '#3b2417', wear('long-sleeve', '#e53e3e'), wear('jeans'), wear('flats', '#744210')) },
    { id: 'dad', name: 'Dad', kid: false, appearance: adult('m', skin, 1.04), look: look('short', '#3b2417', wear('plaid-shirt', '#2c5282', '#1a202c'), wear('khakis'), wear('boots', '#4a3428')) },
  ];
}

const KID_NAMES: [string, Identity][] = [
  ['Maya', 'girl'], ['Leo', 'boy'], ['Ava', 'girl'], ['Noah', 'boy'], ['Zoe', 'girl'], ['Eli', 'they'],
  ['Priya', 'girl'], ['Sam', 'boy'], ['Lucy', 'girl'], ['Mateo', 'boy'], ['Jada', 'girl'],
];

/** Classmates are random but the same every day. */
export function classmates(): CastMember[] {
  const r = rng(20261115);
  const tops = CLOTHING.filter((c) => c.category === 'tops' && !c.price);
  const pants = CLOTHING.filter((c) => c.category === 'pants' && !c.price);
  const skirts = CLOTHING.filter((c) => c.category === 'skirts' && !c.price);
  const shoes = CLOTHING.filter((c) => c.category === 'shoes' && !c.price);
  const packs = CLOTHING.filter((c) => c.category === 'backpacks' && !c.price);
  return KID_NAMES.map(([name, identity], i) => {
    const girl = identity === 'girl';
    const body = identity === 'boy' ? 'm' : identity === 'girl' ? 'f' : r() < 0.5 ? 'f' : 'm';
    const hairs = girl ? ['long', 'ponytail', 'pigtails', 'buns', 'braids', 'curly', 'bob', 'topbun'] : identity === 'boy' ? ['short', 'parted', 'shaved', 'curly', 'short'] : ['bob', 'short', 'curly'];
    const bottom = girl && r() < 0.4 ? pick(skirts, r) : pick(pants, r);
    const top = pick(tops, r);
    const color = top.pattern === 'solid' ? pick(CLOTH_COLORS, r) : undefined;
    return {
      id: `kid${i}`,
      name,
      kid: true,
      appearance: { body, skin: pick(SKIN_TONES, r), eyes: pick(EYE_COLORS, r), freckles: r() < 0.25, glasses: r() < 0.2, height: 0.94 + r() * 0.1, build: 0.95 + r() * 0.08 },
      look: look(pick(hairs, r), pick(HAIR_COLORS.slice(0, 9), r), wear(top.id, color), wear(bottom.id), wear(pick(shoes, r).id), r() < 0.15 ? wear('cap', pick(CLOTH_COLORS, r)) : null, wear(pick(packs, r).id, pick(CLOTH_COLORS, r))),
    };
  });
}
