import { DECOR_SHAPES, FRAMES, GENRES, type Decor, type DecorShape, type FrameId, type Genre, type Painting, type ThemeId } from './types';
import { pick, shuffle, type Rand } from './rng';

/** Every rule number lives here. */
export const RULES = {
  /** The gallery wall is a grid of 10 columns by 14 rows. Cells are 1.5 times wider than tall. */
  wallW: 10,
  wallH: 14,
  cellAspect: 1.5,
  /** Rows (counted from the top, inclusive) of the light band between the eye markers. */
  eyeTop: 8,
  eyeBottom: 10,
  /** The two star cells; the starting painting must cover at least one. */
  stars: [
    [4, 4],
    [5, 4],
  ] as [number, number][],
  corners: [
    [0, 0],
    [9, 0],
    [0, 13],
    [9, 13],
  ] as [number, number][],
  /** Every player holds the same bid cards, numbered 1 to 20. */
  cards: 20,
  /** One starting card each, dealt at random: lowest becomes the first auctioneer. */
  startCards: [1, 2, 3, 4],
  multipliers: [5, 4, 3, 2],
  eyelinePoints: 3,
  fullPoints: 5,
  cornerPenalty: 2,
  excessPenalty: 2,
  /** Storing this many excess paintings ends the game. */
  excessLimit: 2,
  minPlayers: 2,
  maxPlayers: 4,
  decorSupply: { '1x1': 36, '2x1': 18, '1x2': 18, '3x1': 18, '1x3': 18 } as Record<DecorShape, number>,
} as const;

/** 112 paintings for the supply: 16 for each value from 3 to 9 (value = width + height). */
export const PAINTING_SIZES: { w: number; h: number; count: number }[] = [
  { w: 1, h: 2, count: 16 },
  { w: 2, h: 2, count: 8 },
  { w: 1, h: 3, count: 8 },
  { w: 3, h: 2, count: 8 },
  { w: 2, h: 3, count: 8 },
  { w: 3, h: 3, count: 8 },
  { w: 2, h: 4, count: 8 },
  { w: 4, h: 3, count: 6 },
  { w: 3, h: 4, count: 5 },
  { w: 2, h: 5, count: 5 },
  { w: 5, h: 3, count: 5 },
  { w: 4, h: 4, count: 6 },
  { w: 3, h: 5, count: 5 },
  { w: 5, h: 4, count: 8 },
  { w: 3, h: 6, count: 8 },
];

export const sizeKey = (w: number, h: number) => `${w}x${h}` as const;

export function parseSize(key: string): { w: number; h: number } | null {
  const m = /^(\d)x(\d)$/.exec(key);
  if (!m) return null;
  const w = Number(m[1]);
  const h = Number(m[2]);
  return PAINTING_SIZES.some((s) => s.w === w && s.h === h) ? { w, h } : null;
}

export interface GenreDef {
  name: string;
  short: string;
  color: string;
  blurb: string;
}

export const GENRE_INFO: Record<Genre, GenreDef> = {
  city: { name: 'City Life', short: 'City', color: '#4f8ad0', blurb: 'Boulevards, harbours and lamplit cafés.' },
  portrait: { name: 'Portrait', short: 'Portrait', color: '#cf5470', blurb: 'Faces of the age, from countesses to poets.' },
  still: { name: 'Still Life', short: 'Still life', color: '#dba640', blurb: 'Fruit, flowers and bottles caught in a quiet light.' },
  landscape: { name: 'Landscape', short: 'Landscape', color: '#5aa86a', blurb: 'Fields, ponds, mountains and the open sea.' },
};

/**
 * The Avatar theme paints each type as one of the four nations, in the colour the type already has.
 * The type ids stay the same, so the rules never see the theme.
 */
export const AVATAR_GENRE_INFO: Record<Genre, GenreDef> = {
  city: { name: 'Water', short: 'Water', color: '#4f8ad0', blurb: 'The Water Tribes of the poles: cities of ice, ocean spirits and the people of the sea.' },
  portrait: { name: 'Fire', short: 'Fire', color: '#cf5470', blurb: 'The Fire Nation: palaces in a volcano, dragons and royal grudges.' },
  still: { name: 'Air', short: 'Air', color: '#dba640', blurb: 'The Air Nomads: temples above the clouds, sky bison and monks at play.' },
  landscape: { name: 'Earth', short: 'Earth', color: '#5aa86a', blurb: 'The Earth Kingdom: walled cities, mountain passes and stubborn kings.' },
};

export const genreInfo = (theme: ThemeId): Record<Genre, GenreDef> => (theme === 'avatar' ? AVATAR_GENRE_INFO : GENRE_INFO);

export interface FrameDef {
  name: string;
  color: string;
  blurb: string;
}

export const FRAME_INFO: Record<FrameId, FrameDef> = {
  gilded: { name: 'Gilded', color: '#d9ac4a', blurb: 'Carved gold, with shells on the corners and scrolls along the edges.' },
  // Shown as "Pearl"; the id stays 'ivory' so nothing that stores frames has to change.
  ivory: { name: 'Pearl', color: '#efe8df', blurb: 'Pearl-white lacquer with stepped corners, trimmed in gold.' },
  silver: { name: 'Silver', color: '#b8c3cf', blurb: 'Slim polished silver with rounded corners.' },
  walnut: { name: 'Walnut', color: '#8a5634', blurb: 'Wide grained walnut with a brass inner edge.' },
};

export interface DecorDef {
  name: string;
  /** Lower-case plural, for sentences like "3 candle sconces". */
  plural: string;
  w: number;
  h: number;
  points: number;
}

export const DECOR_INFO: Record<DecorShape, DecorDef> = {
  '1x1': { name: 'Candle sconce', plural: 'candle sconces', w: 1, h: 1, points: 1 },
  '2x1': { name: 'Pair of cameos', plural: 'pairs of cameos', w: 2, h: 1, points: 2 },
  '1x2': { name: 'Potted fern', plural: 'potted ferns', w: 1, h: 2, points: 2 },
  '3x1': { name: 'Curio shelf', plural: 'curio shelves', w: 3, h: 1, points: 3 },
  '1x3': { name: 'Pier mirror', plural: 'pier mirrors', w: 1, h: 3, points: 3 },
};

export function makeDecor(shape: DecorShape, id: string): Decor {
  const d = DECOR_INFO[shape];
  return { id, kind: 'decor', shape, w: d.w, h: d.h, points: d.points };
}

/** Names a group of decor tiles: "3 candle sconces", "a candle sconce and a pair of cameos". */
export function decorList(tiles: readonly { shape: DecorShape }[]): string {
  const counts = new Map<DecorShape, number>();
  for (const t of tiles) counts.set(t.shape, (counts.get(t.shape) ?? 0) + 1);
  const parts = [...counts].map(([s, n]) => (n === 1 ? `a ${DECOR_INFO[s].name.toLowerCase()}` : `${n} ${DECOR_INFO[s].plural}`));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : (parts[0] ?? '');
}

export const PLAYER_COLORS = ['#f08a24', '#1fb5a8', '#9b6bf0', '#ff7eb6', '#d9d2c3', '#5cc8ff'];

export const BOT_NAMES = ['Vincent van Bot', 'Pablo Pixasso', 'Frida Kahlobot', 'Claude Monay', 'Rembot', 'Edgar Degauss'];

/** Compositions per type, each with two lists of title parts: a title is one from each. */
type SceneTable = Record<Genre, Record<string, [string[], string[]]>>;

/** Compositions the art generator knows, per type, with title parts in the same order. */
const SCENES: SceneTable = {
  landscape: {
    lilies: [['Water Lilies', 'The Lily Pond', 'Willow Reflections', 'Pond in the Shade', 'Lilies and Clouds'], ['at Dawn', 'in June', 'after the Rain', 'near the Mill', 'at Dusk', 'in Late Summer']],
    poppies: [['Poppy Field', 'Summer Meadow', 'A Walk in the Poppies', 'Red Hillside', 'Meadow with Parasol'], ['at Noon', 'in July', 'near the Village', 'under Drifting Clouds', 'in the Breeze']],
    wheat: [['Wheatfield', 'Harvest Rows', 'Golden Field', 'Field with Crows', 'The Reapers\u2019 Road'], ['under a Restless Sky', 'at Harvest', 'in the Mistral', 'at Midday', 'before the Storm']],
    fuji: [['The White Peak', 'Red Mountain', 'Distant Summit', 'View of the Peak', 'Mountain and Pines'], ['from the Bay', 'at First Light', 'in Autumn', 'over the Rice Fields', 'across the Lake']],
    wave: [['The Great Swell', 'Breaking Wave', 'Boats in a Heavy Sea', 'Storm off the Cape', 'The Rising Tide'], ['at Dawn', 'off the Point', 'in Winter', 'near the Shore', 'under Grey Skies']],
    blossom: [['Cherry Blossoms', 'Plum Branch', 'Spring Orchard', 'Petals on the Wind', 'Blossoming Bough'], ['by Moonlight', 'in April', 'at the Shrine', 'over the River', 'at Evening']],
  },
  city: {
    harbour: [['The Harbour', 'Quayside', 'Masts at Sunset', 'Morning Port', 'Boats by the Pier'], ['in Haze', 'at Low Tide', 'at Sunrise', 'in October', 'after the Storm']],
    village: [['Starlit Village', 'Night over the Rooftops', 'The Steeple', 'Sleeping Town', 'Hillside Houses'], ['at Midnight', 'under Swirling Stars', 'by Moonlight', 'in Winter', 'after Vespers']],
    boulevard: [['Rain on the Boulevard', 'The Avenue', 'Umbrellas', 'Wet Cobbles', 'Evening Traffic'], ['in November', 'at Six O\u2019Clock', 'after the Shower', 'in the Grey Light', 'near the Opera']],
    cafe: [['Caf\u00e9 Terrace', 'The Corner Caf\u00e9', 'Lamplight on the Square', 'Late Supper', 'The Yellow Awning'], ['at Night', 'under the Stars', 'on a Warm Evening', 'after the Theatre', 'by Gaslight']],
    bridge: [['The Old Bridge', 'Riverbank', 'Skyline over the River', 'The Embankment', 'Barges by the Bridge'], ['at Sunset', 'in Fog', 'at Evening', 'in Spring', 'at Golden Hour']],
  },
  portrait: {
    classic: [['Lady in Velvet', 'The Notary', 'Man with a Gold Chain', 'The Countess', 'Portrait of a Bookseller', 'The Admiral\u2019s Widow'], ['', '', 'by Candlelight', 'in Black', 'at Forty', 'in Her Study']],
    garden: [['Afternoon in the Garden', 'Lady with a Sun Hat', 'The Gardener\u2019s Daughter', 'Girl in White', 'Summer Bonnet'], ['', 'among the Roses', 'by the Arbour', 'in Dappled Light', 'at Noon']],
    modern: [['Seated Woman', 'The Poet', 'Portrait in Ochre', 'Long-Necked Muse', 'The Sculptor\u2019s Wife', 'Young Man in a Blue Coat'], ['', '', 'in Red', 'Resting', 'with Folded Hands', 'in Profile']],
    cubist: [['Harlequin', 'Woman in Fragments', 'The Card Player', 'Portrait Seen Twice', 'Man with a Pipe'], ['', 'in Ochre', 'in Grey and Gold', 'at the Caf\u00e9', 'Refracted']],
  },
  still: {
    fruit: [['Apples and Pears', 'Fruit Bowl', 'Oranges on a Cloth', 'The Kitchen Table', 'Plums and a Jug'], ['', 'in Morning Light', 'with a White Napkin', 'on a Blue Cloth', 'by the Window']],
    flowers: [['Peonies in a Jug', 'Sunflowers in a Vase', 'Bouquet of Roses', 'Irises in Blue Glass', 'Spring Flowers'], ['', 'on a Marble Shelf', 'at the Window', 'in Late May', 'with Fallen Petals']],
    bottles: [['Bottles and Lemons', 'Wine and Bread', 'Pewter and Lemons', 'The Cellar Shelf', 'Green Bottles'], ['', 'by Candlelight', 'on a Dark Table', 'with a Knife', 'in Amber Light']],
    cubist: [['Still Life with Newspaper', 'Pipe and Glass', 'Bottle and Jug', 'Table in Fragments', 'Fruit Dish'], ['', 'Refracted', 'in Ochre', 'Seen Twice', 'on a Round Table']],
    guitar: [['Guitar', 'Mandolin and Sheet Music', 'Violin on a Table', 'The Guitar'], ['', 'Seen Twice', 'in Grey and Gold', 'and Newspaper', 'by the Window']],
  },
};

/**
 * The Avatar theme's compositions, by nation (see AVATAR_GENRE_INFO). Water is painted so far; the other
 * nations follow. A title only names what every painting of its scene shows.
 */
const AVATAR_SCENES: SceneTable = {
  city: {
    icecity: [['The City of Ice', 'The Northern Water Tribe', 'Canals of the North', 'The Great Ice Wall', 'The Water Gate'], ['at Moonrise', 'under the Full Moon', 'in the Long Night', 'in Deep Winter', 'by Moonlight']],
    oasis: [['The Spirit Oasis', 'Tui and La', 'Moon and Ocean', 'Push and Pull', 'Two Koi'], ['', '', 'at Midnight', 'in Balance', 'Circling']],
    southpole: [['The Southern Water Tribe', 'The Watchtower', 'Village at the South Pole', 'Home on the Ice', 'The Snow Wall'], ['', 'in Winter', 'after the Snowfall', 'at the Edge of the World', 'on a Still Day']],
    katara: [['Katara', 'The Waterbender', 'Katara of the Southern Tribe', 'Master Katara', 'Daughter of the South'], ['', '', 'with Her Mother\u2019s Necklace', 'at Fourteen', 'in Blue']],
    sokka: [['Sokka', 'The Warrior of the South', 'Sokka of the Southern Tribe', 'Meat and Sarcasm Guy', 'The Plan Guy'], ['', '', 'with Boomerang', 'on Watch', 'at Fifteen']],
    korra: [['Korra', 'Avatar Korra', 'Korra of the Southern Tribe', 'The Southern Avatar', 'The Avatar of Republic City'], ['', '', 'at Seventeen', 'in Blue', 'at the South Pole']],
    keepsakes: [['Boomerang and Necklace', 'Keepsakes of the South', 'Treasures of the Water Tribe', 'Still Life with Boomerang', 'Things from Home'], ['', '', 'on a Fur Pelt', 'by Lamplight', 'in Blue and White']],
  },
  portrait: {},
  still: {},
  landscape: {},
};

const sceneTable = (theme: ThemeId): SceneTable => (theme === 'avatar' ? AVATAR_SCENES : SCENES);

export function scenesOf(genre: Genre, theme: ThemeId = 'classic'): string[] {
  return Object.keys(sceneTable(theme)[genre]);
}

/** A title for a painting of `scene` that isn't in `used` yet (and adds it there). */
export function makeTitle(r: Rand, genre: Genre, scene: string, used: Set<string>, theme: ThemeId = 'classic'): string {
  const [a, b] = sceneTable(theme)[genre][scene];
  for (let i = 0; i < 24; i++) {
    const suffix = pick(r, b);
    const t = suffix ? `${pick(r, a)} ${suffix}` : pick(r, a);
    if (!used.has(t)) {
      used.add(t);
      return t;
    }
  }
  const t = `${pick(r, a)} (Study ${used.size})`;
  used.add(t);
  return t;
}

function makePainting(r: Rand, id: string, genre: Genre, frame: FrameId, w: number, h: number, used: Set<string>, starter = false): Painting {
  const scene = pick(r, scenesOf(genre));
  const p: Painting = {
    id,
    kind: 'painting',
    genre,
    frame,
    w,
    h,
    value: w + h,
    seed: Math.floor(r() * 2 ** 31),
    scene,
    title: makeTitle(r, genre, scene, used),
  };
  if (starter) p.starter = true;
  return p;
}

/**
 * The paintings for one game. Types and frames are spread evenly: 28 of each type, 28 of each frame,
 * and every type/frame pair 7 times. The supply comes back shuffled.
 */
export function buildPaintings(r: Rand): { supply: Painting[]; starters: Painting[] } {
  const used = new Set<string>();
  const supply: Painting[] = [];
  let i = 0;
  for (const s of PAINTING_SIZES) {
    for (let k = 0; k < s.count; k++, i++) {
      const genre = GENRES[i % 4];
      const frame = FRAMES[(i + Math.floor(i / 4)) % 4];
      supply.push(makePainting(r, `p${i + 1}`, genre, frame, s.w, s.h, used));
    }
  }
  const frames = shuffle(r, [...FRAMES]);
  const starters = GENRES.map((g, k) => makePainting(r, `s${k + 1}`, g, frames[k], 2, 3, used, true));
  return { supply: shuffle(r, supply), starters: shuffle(r, starters) };
}

export function emptyDecorSupply(): Record<DecorShape, number> {
  return Object.fromEntries(DECOR_SHAPES.map((s) => [s, RULES.decorSupply[s]])) as Record<DecorShape, number>;
}

/** A few sample walls for the home screen backdrop (no game needed). */
export function demoPaintings(r: Rand, count: number): Painting[] {
  const { supply } = buildPaintings(r);
  return supply.slice(0, count);
}
