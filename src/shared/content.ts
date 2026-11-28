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
 * The Avatar theme's subjects, by nation (see AVATAR_GENRE_INFO). Each nation has more subjects than a game
 * has paintings of it, so no subject appears twice in a game. Water is painted so far; until a nation is,
 * its paintings use the classic scenes. A title only names what every painting of its subject shows.
 */
const AVATAR_SCENES: SceneTable = {
  city: {
    // The Northern Water Tribe
    icecity: [['The City of Ice', 'The Northern Water Tribe', 'Towers of Ice', 'The Great Ice Wall', 'The Northern City'], ['at Moonrise', 'under the Full Moon', 'in the Long Night', 'in Deep Winter', 'by Moonlight']],
    watergate: [['The Water Gate', 'The Great Wall Opens', 'Gate of the North', 'Passage through the Ice', 'The Ice Wall Parts'], ['', '', 'at Dawn', 'for a Canoe', 'in Winter']],
    canals: [['Canals of the Northern Tribe', 'The Ice Canal', 'Under the Ice Bridges', 'Boats on the Canal', 'The Water Streets'], ['', '', 'at Dusk', 'by Moonlight', 'after the Snowfall']],
    // Tui and La
    oasis: [['The Spirit Oasis', 'Tui and La', 'Moon and Ocean', 'Push and Pull', 'Two Koi'], ['', '', 'at Midnight', 'in Balance', 'Circling']],
    oasisgarden: [['The Hidden Garden', 'Garden of the Spirit Oasis', 'Green Heart of the North', 'Spring inside the Ice', 'The Warm Garden'], ['', '', 'at Midnight', 'by Moonlight', 'in Winter']],
    oceanspirit: [['The Ocean Spirit Rises', 'La Awakens', 'Koizilla', 'The Wrath of the Ocean', 'The Great Koi'], ['', '', 'over the Fleet', 'at the Siege', 'in the Night Sea']],
    // The southern village
    southpole: [['The Southern Water Tribe', 'Village at the South Pole', 'Home on the Ice', 'The Snow Wall', 'The Southern Village'], ['', 'in Winter', 'after the Snowfall', 'at the Edge of the World', 'on a Still Day']],
    watchtower: [['Sokka\u2019s Watchtower', 'The Lookout', 'The Snow Tower', 'On Watch at the Wall', 'The Southern Lookout'], ['', '', 'at Dawn', 'in the Wind', 'before the Penguins']],
    blacksnow: [['Black Snow', 'Ash on the Wind', 'The Black Snow Falls', 'Before the Raid', 'Soot over the South'], ['', '', 'across the Village', 'in Winter', 'at Dusk']],
    // Korra's South Pole
    portal: [['The Southern Spirit Portal', 'The Gate between Worlds', 'Light of the Southern Portal', 'Where the Spirits Cross', 'The Portal in the Ice'], ['', '', 'at Solstice', 'by Night', 'under the Lights']],
    festival: [['The Glacier Spirits Festival', 'Lanterns of the South', 'The Festival of Lights', 'The Southern Capital', 'Fair on the Ice'], ['', '', 'at Night', 'in Midwinter', 'under the Stars']],
    // The southern sea
    warfleet: [['Hakoda\u2019s Fleet', 'The Water Tribe Warships', 'Sails of the South', 'The Southern Fleet', 'Warriors of the South'], ['', '', 'Setting Out', 'at Dawn', 'on the Open Sea']],
    icedodging: [['Ice Dodging', 'Through the Icebergs', 'The Rite of Ice Dodging', 'A Narrow Passage', 'Sailing the Ice Field'], ['', '', 'at Dawn', 'in a Heavy Sea', 'in the Fog']],
    iceberg: [['The Boy in the Iceberg', 'The Glowing Iceberg', 'Light in the Ice', 'What the Sea Kept', 'A Hundred Years in the Ice'], ['', '', 'at Dusk', 'in the Southern Waters', 'by Night']],
    // Keepsakes
    keepsakes: [['Boomerang and Necklace', 'Keepsakes of the South', 'Treasures of the Water Tribe', 'Still Life with Boomerang', 'Things from Home'], ['', '', 'on a Fur Pelt', 'by Lamplight', 'in Blue and White']],
    scroll: [['The Waterbending Scroll', 'The Scroll of Forms', 'Lessons on a Scroll', 'The Stolen Scroll', 'Waterbending Forms'], ['', '', 'Unrolled', 'by Lamplight', 'in Blue and Black']],
    vial: [['The Vial of Spirit Water', 'Spirit Water', 'Water from the Oasis', 'The Healer\u2019s Vial', 'A Gift from Pakku'], ['', '', 'on Its Cord', 'by Moonlight', 'in Blue']],
    // Creatures of the poles
    polarbeardog: [['Polar Bear Dog', 'Naga', 'Naga on the Ice', 'The Faithful Polar Bear Dog', 'White Giant of the South'], ['', '', 'at Rest', 'in the Snow', 'on Watch']],
    penguins: [['Penguin Sledding', 'Otter Penguins', 'Down the Slope', 'The Penguin Run', 'Sledding Season'], ['', '', 'at Noon', 'in Fresh Snow', 'on the Big Hill']],
    seals: [['Seals on the Ice', 'The Floe', 'Basking Seals', 'Seals and Ice', 'The Seal Colony'], ['', '', 'at Noon', 'in the Thaw', 'by the Open Sea']],
    // On their own
    redmoon: [['The Night the Moon Turned Red', 'The Red Moon', 'When the Moon Went Red', 'The Moon Spirit Falls', 'A Red Moon'], ['', '', 'over the North', 'above the Ice Wall', 'during the Siege']],
    swamp: [['The Great Tree of the Swamp', 'The Foggy Swamp', 'The Banyan-Grove Tree', 'Heart of the Swamp', 'Roots in the Mist'], ['', '', 'in the Fog', 'at Dusk', 'after the Rain']],
    icefishing: [['Ice Fishing', 'The Fishing Hole', 'Spear and Catch', 'A Day\u2019s Catch', 'Fishing through the Ice'], ['', '', 'at Noon', 'in the Cold', 'off the Village']],
    hut: [['Inside a Southern Hut', 'By the Cooking Fire', 'Stew on the Fire', 'Home in the South', 'Warm Hides'], ['', '', 'in Winter', 'at Night', 'after the Hunt']],
    banner: [['The Water Tribe Banner', 'Moon and Wave', 'Colours of the South', 'The Blue Flag', 'Banner over the Ice'], ['', '', 'in the Wind', 'at Dawn', 'in a Gale']],
    chiefpalace: [['The Chief\u2019s Palace', 'The Palace of Ice', 'Above the Northern City', 'The Palace Steps', 'Seat of the North'], ['', '', 'at Moonrise', 'in Snow', 'by Night']],
    siegefleet: [['The Fire Navy Arrives', 'Ships at the Northern Wall', 'The Siege of the North', 'Black Ships off the Ice', 'The Fleet at the Wall'], ['', '', 'in the Fog', 'at Dawn', 'under Ash']],
    dusk: [['Icebergs', 'The Ice Field', 'Floating Mountains', 'The Edge of the Pack Ice', 'The Southern Sea'], ['at Dusk', 'at Sundown', 'in the Long Evening', 'in the Last Light', 'before Nightfall']],
    // People
    katara: [['Katara', 'The Waterbender', 'Katara of the Southern Tribe', 'Master Katara', 'Daughter of the South'], ['', '', 'with Her Mother\u2019s Necklace', 'at Fourteen', 'in Blue']],
    sokka: [['Sokka', 'The Warrior of the South', 'Sokka of the Southern Tribe', 'Meat and Sarcasm Guy', 'The Plan Guy'], ['', '', 'with Boomerang', 'on Watch', 'at Fifteen']],
  },
  portrait: {
    // The capital
    firecapital: [['The Fire Nation Capital', 'The City in the Crater', 'Caldera City', 'The Royal City', 'Roofs of the Capital'], ['', '', 'at Sunset', 'in Ash', 'from the Harbour']],
    throneroom: [['The Throne Room', 'The Wall of Flame', 'Before the Fire Lord', 'Throne of Fire', 'The Fire Lord\u2019s Court'], ['', '', 'in Red and Gold', 'at Audience', 'Burning']],
    turtleducks: [['The Turtle-Duck Pond', 'Turtle Ducks', 'Feeding the Turtle Ducks', 'The Palace Pond', 'Ducks under the Willow'], ['', '', 'in Spring', 'at Dusk', 'in the Royal Garden']],
    // Ember Island
    beachhouse: [['The Beach House', 'Ember Island', 'The Royal Retreat', 'House by the Sea', 'The House on Ember Island'], ['', '', 'at Sunset', 'out of Season', 'in Summer']],
    emberplayers: [['The Ember Island Players', 'An Evening at the Theatre', 'The Island Playhouse', 'Curtain Up', 'The Boy in the Iceberg, Staged'], ['', '', 'on Opening Night', 'in Four Acts', 'by Lamplight']],
    // The Sun Warriors
    sunwarriors: [['The Sun Warriors\u2019 Ruins', 'The Ancient City', 'The Lost Sun Warriors', 'Temple of the Sun', 'Steps to the Sun'], ['', '', 'in the Jungle', 'at Noon', 'Overgrown']],
    ranshaw: [['Ran and Shaw', 'The Masters', 'The Last Dragons', 'Dance of the Dragons', 'The Dragon Dance'], ['', '', 'in Flight', 'in Many Colours', 'over the Temple']],
    eternalflame: [['The Eternal Flame', 'The First Fire', 'The Flame That Never Dies', 'Fire of the Sun Warriors', 'The Sacred Flame'], ['', '', 'in the Dark', 'on Its Altar', 'Burning']],
    // Sozin's Comet
    comet: [['Sozin\u2019s Comet', 'The Comet', 'Fire in the Sky', 'The Comet Returns', 'Comet over the Volcano'], ['', '', 'at Night', 'Rising', 'at Summer\u2019s End']],
    airships: [['The Airship Fleet', 'Airships', 'The Fleet Aloft', 'War Balloons', 'Ships of the Air'], ['', '', 'under a Burning Sky', 'at Dawn', 'over the Earth Kingdom']],
    // Avatar Roku
    firetemple: [['The Fire Temple', 'The Temple on Crescent Island', 'Crescent Island', 'The Sages\u2019 Temple', 'Temple on the Volcano'], ['', '', 'at the Solstice', 'at Dusk', 'in Smoke']],
    rokuisland: [['Avatar Roku\u2019s Island', 'The Island Erupts', 'The Last Day of Roku', 'Fire and Ash', 'The Volcano Wakes'], ['', '', 'at Night', 'at Dusk', 'in Red']],
    // The Boiling Rock
    boilingrock: [['The Boiling Rock', 'The Prison in the Lake', 'The Inescapable Prison', 'Steam over the Rock', 'The Boiling Lake'], ['', '', 'at Midday', 'at Dusk', 'from the Shore']],
    gondola: [['The Gondola', 'Across the Boiling Lake', 'The Prison Gondola', 'The Line to the Rock', 'Escape by Gondola'], ['', '', 'in Steam', 'at Dawn', 'on Its Cable']],
    // Treasures
    bluespirit: [['The Blue Spirit', 'Mask and Swords', 'The Blue Mask', 'The Masked Swordsman', 'Dao Swords'], ['', '', 'at Rest', 'on Red Cloth', 'by Night']],
    crown: [['The Fire Lord\u2019s Crown', 'The Flame Crown', 'Crown of the Fire Nation', 'The Royal Headpiece', 'The Crown Prince\u2019s Crown'], ['', '', 'in Gold', 'on Red Silk', 'by Firelight']],
    warmap: [['The War Room', 'Map of the World', 'The Generals\u2019 Table', 'Plans of the War', 'The Campaign Map'], ['', '', 'by Lamplight', 'at Council', 'in Red Ink']],
    // Creatures
    komodo: [['Komodo Rhinos', 'The Rhino Riders\u2019 Mounts', 'Rough Rhinos', 'The March of the Rhinos', 'The Cavalry'], ['', '', 'on the Road', 'at Dawn', 'in Armour']],
    hawk: [['The Messenger Hawk', 'The Palace Hawk', 'Hawk on Its Perch', 'The Courier', 'Hawky'], ['', '', 'with a Scroll', 'at Rest', 'at Dawn']],
    fang: [['Fang', 'Avatar Roku\u2019s Dragon', 'The Red Dragon', 'The Avatar\u2019s Companion', 'Dragon in the Clouds'], ['', '', 'in Flight', 'over the Sea', 'at Sunset']],
    // On their own
    blacksun: [['The Day of Black Sun', 'The Eclipse', 'The Sun Goes Dark', 'The Black Sun', 'Eight Minutes of Dark'], ['', '', 'at Noon', 'over the Palace', 'in Silence']],
    zukoship: [['Zuko\u2019s Ship', 'The Prince\u2019s Ship', 'The Hunt for the Avatar', 'The Banished Prince\u2019s Ship', 'The Steamship'], ['', '', 'in the Ice', 'at Sea', 'at Dawn']],
    agnikai: [['Agni Kai', 'The Duel', 'The Courtyard of Fire', 'Fire Duel', 'Under the Palace Roofs'], ['', '', 'at Sunset', 'at Dawn', 'in Smoke']],
    paintedlady: [['The Painted Lady', 'Spirit of the River', 'The Lady in the Mist', 'Guardian of Jang Hui', 'The Painted Lady\u2019s Village'], ['', '', 'by Moonlight', 'by Night', 'on the Water']],
    wanted: [['Wanted', 'Wanted Posters', 'Reward Offered', 'Notices on the Wall', 'The Blue Spirit, Wanted'], ['', '', 'in the Rain', 'by the Gate', 'Torn']],
    lanterns: [['Lanterns of the Capital', 'The Lantern Festival', 'Lights of the Fire Nation', 'A Thousand Lanterns', 'Red Lanterns'], ['', '', 'at Night', 'in the Wind', 'over the Harbour']],
    volcanic: [['The Volcanic Islands', 'Islands of Fire', 'The Fire Nation Archipelago', 'The Smoking Isles', 'Smoke on the Horizon'], ['at Sunset', 'at Dusk', 'in the Last Light', 'Glowing', '']],
    probending: [['The Pro-Bending Arena', 'Pro-Bending', 'The Arena on the Bay', 'The Championship', 'The Fire Ferrets\u2019 Arena'], ['', '', 'at Night', 'Lit Up', 'in the Final Round']],
    // People
    zuko: [['Prince Zuko', 'Zuko', 'The Banished Prince', 'Fire Lord Zuko', 'The Prince of the Fire Nation'], ['', '', 'with His Scar', 'in Red', 'at Sixteen']],
    iroh: [['General Iroh', 'Uncle Iroh', 'The Dragon of the West', 'Iroh', 'The Tea Master'], ['', '', 'with His Teapot', 'Smiling', 'in Red and Gold']],
  },
  still: {},
  landscape: {
    // Ba Sing Se
    outerwall: [['The Outer Wall', 'The Walls of Ba Sing Se', 'The Impenetrable City', 'The Great Wall of the Earth Kingdom', 'Wall across the Plain'], ['', '', 'in Mist', 'at Dawn', 'after Rain']],
    upperring: [['The Upper Ring', 'The Earth King\u2019s Palace', 'Palace of the Earth King', 'Roofs of the Upper Ring', 'The Royal Palace of Ba Sing Se'], ['', '', 'in Mist', 'at Dawn', 'in Spring']],
    monorail: [['The Ring Train', 'Rails across Ba Sing Se', 'Between the Rings', 'The Stone Train', 'Train to the Upper Ring'], ['', '', 'in Mist', 'at Dusk', 'over the Rooftops']],
    // Omashu
    omashu: [['Omashu', 'The Mountain City', 'Omashu on Its Peak', 'The City of King Bumi', 'Towers of Omashu'], ['', '', 'in Mist', 'at Dawn', 'from the Bridge']],
    mailchutes: [['The Mail Chutes', 'Riding the Chutes', 'Delivery Service', 'The Chutes of Omashu', 'Down the Mountain'], ['', '', 'at Full Speed', 'at Noon', 'in Spring']],
    lovers: [['The Cave of Two Lovers', 'Love Is Brightest in the Dark', 'The Secret Tunnel', 'Crystals in the Dark', 'The Lovers\u2019 Tomb'], ['', '', 'Glowing', 'by Crystal Light', 'Underground']],
    // Kyoshi Island
    kyoshiisland: [['Kyoshi Island', 'The Village of Kyoshi', 'Under Avatar Kyoshi', 'Kyoshi\u2019s Statue', 'The Island Village'], ['', '', 'in Mist', 'at Dawn', 'in Summer']],
    unagi: [['The Unagi', 'The Great Eel', 'Unagi in the Bay', 'The Beast of Kyoshi Bay', 'The Serpent Rises'], ['', '', 'in a Storm', 'at Dawn', 'off the Point']],
    kyoshifans: [['Fans of the Kyoshi Warriors', 'Kyoshi Warrior Fans', 'The Warrior\u2019s Fans', 'Fans and Headdress', 'Armour of the Kyoshi Warriors'], ['', '', 'in Green and Gold', 'on Silk', 'Laid Out']],
    // The Si Wong Desert
    sandsailer: [['The Sandsailer', 'Sailing the Dunes', 'Across the Si Wong', 'Wind over the Sand', 'The Desert Crossing'], ['', '', 'at Noon', 'in a Sandstorm', 'at Dusk']],
    library: [['Wan Shi Tong\u2019s Library', 'The Library under the Sand', 'He Who Knows Ten Thousand Things', 'The Spirit Library', 'The Sinking Library'], ['', '', 'in the Desert', 'at Noon', 'at Dusk']],
    mistypalms: [['Misty Palms Oasis', 'The Oasis', 'Palms in the Desert', 'Water in the Si Wong', 'The Last Oasis'], ['', '', 'at Noon', 'at Dusk', 'in the Heat']],
    // The Jasmine Dragon
    jasmine: [['The Jasmine Dragon', 'Iroh\u2019s Tea Shop', 'The Finest Tea in the City', 'Tea in the Upper Ring', 'The Tea Shop'], ['', '', 'in Spring', 'at Dawn', 'on a Quiet Street']],
    teaset: [['A Pot of Jasmine Tea', 'Tea for Two', 'Leaves from the Vine', 'Tea Things', 'The Tea Tray'], ['', '', 'with Cups', 'by the Window', 'in Green and Gold']],
    // Korra's Earth
    zaofu: [['Zaofu', 'The Metal City', 'Domes of Zaofu', 'The City of the Beifongs', 'Petals of Metal'], ['', '', 'at Dawn', 'Opening', 'in Mist']],
    republiccity: [['Republic City', 'The City by the Bay', 'Lights of Republic City', 'The Skyline', 'Aang Memorial Island'], ['', '', 'at Night', 'in Fog', 'at Dusk']],
    colossus: [['The Colossus', 'The Giant of Metal', 'Kuvira\u2019s Machine', 'The Great Mecha', 'Iron Giant over the City'], ['', '', 'Advancing', 'in Smoke', 'at Dusk']],
    // Creatures
    badgermoles: [['Badgermoles', 'The First Earthbenders', 'In the Badgermoles\u2019 Cave', 'Badgermole Burrow', 'Listening to the Earth'], ['', '', 'Underground', 'in the Dark', 'at Rest']],
    bosco: [['Bosco', 'The Earth King\u2019s Bear', 'Bosco in the Palace Garden', 'The Royal Bear', 'A Bear in Green'], ['', '', 'at Rest', 'in Spring', 'at Court']],
    ostrichhorses: [['Ostrich Horses', 'Riders on the Plain', 'The Ostrich Horse Herd', 'Ostrich Horses Grazing', 'The Long Road'], ['', '', 'at Dawn', 'in the Grass', 'in the Wind']],
    // On their own
    cabbages: [['My Cabbages!', 'The Cabbage Cart', 'The Cabbage Merchant', 'Cabbages for Sale', 'Market Day'], ['', '', 'at Noon', 'on the Road', 'Once Again']],
    drill: [['The Drill', 'The Siege of Ba Sing Se', 'The Great Machine', 'The Fire Nation Drill', 'Iron against Stone'], ['', '', 'at the Outer Wall', 'in Dust', 'at Dawn']],
    laogai: [['Lake Laogai', 'The Quiet Lake', 'What Lies under Lake Laogai', 'The Lake Outside the City', 'Still Water'], ['', '', 'at Dawn', 'in Mist', 'in Autumn']],
    greatdivide: [['The Great Divide', 'The Canyon', 'The Deepest Canyon', 'Across the Great Divide', 'Walls of the Canyon'], ['', '', 'at Noon', 'at Dusk', 'in Mist']],
    serpentpass: [['The Serpent\u2019s Pass', 'The Narrow Path', 'Between Two Lakes', 'The Pass to Ba Sing Se', 'The Serpent\u2019s Road'], ['', '', 'in Mist', 'at Dawn', 'in a Storm']],
    earthrumble: [['Earth Rumble', 'The Blind Bandit\u2019s Ring', 'The Rumble Arena', 'The Earthbending Ring', 'Earth Rumble Six'], ['', '', 'at Night', 'by Lamplight', 'Sold Out']],
    makapu: [['Makapu Village', 'The Volcano above Makapu', 'Aunt Wu\u2019s Village', 'The Village under the Mountain', 'Clouds over Makapu'], ['', '', 'in Spring', 'at Dawn', 'in Mist']],
    beifong: [['The Beifong Estate', 'The House in Gaoling', 'Garden of the Beifongs', 'Home of the Blind Bandit', 'Walls of the Beifong Estate'], ['', '', 'in Spring', 'at Dusk', 'in the Rain']],
    // People
    toph: [['Toph Beifong', 'The Blind Bandit', 'The Greatest Earthbender', 'Toph', 'The Melon Lord'], ['', '', 'Listening', 'in Green', 'at Twelve']],
    bumi: [['King Bumi', 'The Mad Genius', 'The King of Omashu', 'Bumi', 'The Old King'], ['', '', 'Laughing', 'in Green and Gold', 'on His Throne']],
  },
};

/** Subjects that look best on tall or on wide paintings; the rest suit any shape. */
const AVATAR_FIT: Record<string, 'tall' | 'wide'> = {
  canals: 'tall',
  oceanspirit: 'tall',
  watchtower: 'tall',
  portal: 'tall',
  vial: 'tall',
  banner: 'tall',
  chiefpalace: 'tall',
  oasisgarden: 'wide',
  southpole: 'wide',
  festival: 'wide',
  warfleet: 'wide',
  scroll: 'wide',
  penguins: 'wide',
  seals: 'wide',
  siegefleet: 'wide',
  dusk: 'wide',
  // Earth
  omashu: 'tall',
  mailchutes: 'tall',
  monorail: 'tall',
  library: 'tall',
  colossus: 'tall',
  greatdivide: 'tall',
  makapu: 'tall',
  outerwall: 'wide',
  upperring: 'wide',
  sandsailer: 'wide',
  zaofu: 'wide',
  republiccity: 'wide',
  ostrichhorses: 'wide',
  drill: 'wide',
  serpentpass: 'wide',
  laogai: 'wide',
  // Fire
  ranshaw: 'tall',
  eternalflame: 'tall',
  comet: 'tall',
  firetemple: 'tall',
  hawk: 'tall',
  paintedlady: 'tall',
  wanted: 'tall',
  firecapital: 'wide',
  throneroom: 'wide',
  airships: 'wide',
  boilingrock: 'wide',
  gondola: 'wide',
  warmap: 'wide',
  komodo: 'wide',
  zukoship: 'wide',
  agnikai: 'wide',
  volcanic: 'wide',
};

const shapeOf = (p: { w: number; h: number }): 'tall' | 'wide' | 'any' => {
  const a = (p.w * RULES.cellAspect) / p.h;
  return a < 0.85 ? 'tall' : a > 1.3 ? 'wide' : 'any';
};

/**
 * Gives each painting of one type its own subject from the theme, so none repeats in the game. Tall and wide
 * paintings choose first, each taking a subject that suits its shape when one is left.
 */
function dealSubjects(r: Rand, paintings: Painting[], genre: Genre, theme: ThemeId, used: Set<string>) {
  const all = scenesOf(genre, theme);
  const pool: string[] = [];
  const rank = { tall: 0, wide: 1, any: 2 };
  const order = shuffle(r, [...paintings]).sort((a, b) => rank[shapeOf(a)] - rank[shapeOf(b)]);
  for (const p of order) {
    // More paintings than subjects (a nation still being painted): start the list again.
    if (!pool.length) pool.push(...shuffle(r, [...all]));
    const want = shapeOf(p);
    let i = pool.findIndex((s) => (AVATAR_FIT[s] ?? 'any') === want);
    if (i < 0) i = pool.findIndex((s) => !AVATAR_FIT[s]);
    if (i < 0) i = 0;
    p.scene = pool.splice(i, 1)[0];
    p.title = makeTitle(r, genre, p.scene, used, theme);
  }
}

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
 * and every type/frame pair 7 times. The supply comes back shuffled. In a theme, each type's paintings get
 * the theme's subjects with none repeated (types the theme has no subjects for keep the classic scenes).
 */
export function buildPaintings(r: Rand, theme: ThemeId = 'classic'): { supply: Painting[]; starters: Painting[] } {
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
  if (theme !== 'classic')
    for (const g of GENRES)
      if (scenesOf(g, theme).length)
        dealSubjects(
          r,
          [...supply, ...starters].filter((p) => p.genre === g),
          g,
          theme,
          used,
        );
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
