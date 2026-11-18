/**
 * Map layout. Meters, +x east, +z south, y up. Home is in the south, school in the north.
 *
 *   z = -64 .. 0    school campus (building z -30..-8, field and playground behind it)
 *   z =  24 .. 32   Maple Street (road you cross)
 *   z =  58 .. 74   your house (two stories)
 */

/** Height of your house's upstairs floor. */
export const UPSTAIRS = 3.1;
/** The stair hole in the upstairs floor: x0, x1, z0 (top step), z1 (bottom step). */
export const STAIRWELL = [7.4, 9, 61.85, 65.45] as const;
/** Where the guide arrow points to go up or down the stairs. */
export const STAIR_BOTTOM: [number, number] = [8.2, 66.4];
export const STAIR_TOP: [number, number] = [8.2, 60.9];
/** The hall side of your bedroom door, upstairs. */
export const BEDROOM_DOOR: [number, number] = [0.8, 65.2];
/** Which floor a height is on (0 downstairs, 1 upstairs). */
export const floorOf = (y: number) => (y > 1.8 ? 1 : 0);
export type PlaceId =
  | 'bedroom'
  | 'kitchen'
  | 'home'
  | 'neighborhood'
  | 'starbucks'
  | 'campus'
  | 'school'
  | 'hall'
  | 'room5a'
  | 'room5b'
  | 'science'
  | 'art'
  | 'music'
  | 'gym'
  | 'cafeteria'
  | 'playground'
  | 'field';

export interface Zone {
  id: PlaceId;
  name: string;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Which roof to hide while inside. */
  building?: 'home' | 'school' | 'starbucks';
  /** Only on this floor (0 or 1); zones without one cover every floor. */
  floor?: number;
}

/** Smaller zones are listed first; the first match wins. */
export const ZONES: Zone[] = [
  { id: 'bedroom', name: 'Your bedroom', x0: -9, z0: 64, x1: 0, z1: 74, building: 'home', floor: 1 },
  { id: 'kitchen', name: 'Kitchen', x0: -9, z0: 58, x1: 0, z1: 66, building: 'home', floor: 0 },
  { id: 'home', name: 'Home', x0: -9, z0: 58, x1: 9, z1: 74, building: 'home' },
  { id: 'starbucks', name: 'Starbucks', x0: -22, z0: 36, x1: -10, z1: 46, building: 'starbucks' },
  { id: 'room5a', name: 'Room 5A', x0: -26, z0: -16, x1: -12, z1: -8, building: 'school' },
  { id: 'art', name: 'Art Room', x0: -12, z0: -16, x1: 0, z1: -8, building: 'school' },
  { id: 'music', name: 'Music Room', x0: 6, z0: -16, x1: 16, z1: -8, building: 'school' },
  { id: 'gym', name: 'Gym', x0: 16, z0: -16, x1: 26, z1: -8, building: 'school' },
  { id: 'science', name: 'Science Lab', x0: -26, z0: -30, x1: -12, z1: -20, building: 'school' },
  { id: 'room5b', name: 'Room 5B', x0: -12, z0: -30, x1: 2, z1: -20, building: 'school' },
  { id: 'cafeteria', name: 'Cafeteria', x0: 6, z0: -30, x1: 26, z1: -20, building: 'school' },
  { id: 'hall', name: 'Hallway', x0: -26, z0: -30, x1: 26, z1: -8, building: 'school' },
  { id: 'playground', name: 'Playground', x0: -50, z0: -64, x1: -4, z1: -32 },
  { id: 'field', name: 'Soccer field', x0: 4, z0: -64, x1: 50, z1: -32 },
  { id: 'campus', name: 'Sabin Elementary', x0: -50, z0: -64, x1: 50, z1: 0 },
];

export function zoneAt(x: number, z: number, y = 0): Zone | null {
  const f = floorOf(y);
  for (const zn of ZONES) if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1 && (zn.floor === undefined || zn.floor === f)) return zn;
  return null;
}

/** True when the zone is the place or inside it (a classroom is inside the school). */
export function inPlace(zone: Zone | null, place: PlaceId) {
  if (!zone) return place === 'neighborhood';
  if (zone.id === place) return true;
  if (place === 'school') return zone.building === 'school';
  if (place === 'home') return zone.building === 'home';
  if (place === 'campus') return zone.building === 'school' || ['playground', 'field', 'campus'].includes(zone.id);
  if (place === 'field' && zone.id === 'playground') return true; // recess: anywhere outside behind school
  return false;
}

export const PLACE_NAMES: Record<PlaceId, string> = {
  bedroom: 'your bedroom',
  kitchen: 'the kitchen',
  home: 'home',
  neighborhood: 'the neighborhood',
  starbucks: 'Starbucks',
  campus: 'school',
  school: 'school',
  hall: 'the hallway',
  room5a: 'Room 5A',
  room5b: 'Room 5B',
  science: 'the Science Lab',
  art: 'the Art Room',
  music: 'the Music Room',
  gym: 'the Gym',
  cafeteria: 'the Cafeteria',
  playground: 'the playground',
  field: 'the soccer field',
};

/** Where the guide arrow leads for each place. */
export const PLACE_TARGET: Record<PlaceId, [number, number]> = {
  bedroom: [-4.5, 69],
  kitchen: [-2.5, 62.5],
  home: [3, 61],
  neighborhood: [3, 30],
  starbucks: [-16, 41],
  campus: [3, -4],
  school: [3, -12],
  hall: [3, -18],
  room5a: [-19, -12],
  room5b: [-5, -25],
  science: [-19, -25],
  art: [-6, -12],
  music: [11, -12],
  gym: [21, -12],
  cafeteria: [16, -25],
  playground: [-26, -46],
  field: [26, -36],
};

/**
 * Navigation points. Links are found automatically by line of sight, so add a point
 * at every doorway and corner a walker needs to get around.
 */
export const NAV_POINTS: [number, number][] = [
  // home
  [-2.5, 62.5], [3, 61], [3, 59.2], [3, 56.6], [3, 54], [2, 68], [-5, 68],
  // street and Starbucks
  [3, 40], [3, 28], [-16, 34.5], [-16, 37.5], [-16, 40.5], [3, 12],
  // school front
  [3, 0], [3, -4], [3, -7], [3, -12], [3, -18],
  // hallway doors
  [-19, -18], [-6, -18], [-5, -18], [11, -18], [12, -18], [21, -18],
  [-19, -14.5], [-6, -14.5], [11, -14.5], [21, -14.5],
  [-19, -21.5], [-5, -21.5], [12, -21.5],
  [-19, -25], [-5, -25], [16, -25], [-19, -12], [-6, -12], [11, -12], [21, -12],
  // back exits
  [4, -22], [4, -29], [4, -32], [21, -28.8], [21, -32],
  // outside
  [26, -36], [26, -48], [-26, -46], [-26, -36], [30, -4], [30, -34], [-30, -4], [-30, -34], [-38, -15],
];
