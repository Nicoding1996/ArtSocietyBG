/** The four painting types. Each painting scores by its type's final prestige rank. */
export const GENRES = ['city', 'portrait', 'still', 'landscape'] as const;
export type Genre = (typeof GENRES)[number];

/** Frame styles. A new painting touching paintings with the same frame earns decor. */
export const FRAMES = ['gilded', 'ivory', 'silver', 'walnut'] as const;
export type FrameId = (typeof FRAMES)[number];

/** Decor tile shapes, written width x height in wall cells. Points equal the area. */
export const DECOR_SHAPES = ['1x1', '2x1', '1x2', '3x1', '1x3'] as const;
export type DecorShape = (typeof DECOR_SHAPES)[number];

export const HATS = ['beret', 'tophat', 'bowler', 'flower'] as const;
export type HatId = (typeof HATS)[number];

/** "wxh", e.g. "2x3" is two cells wide and three cells tall. */
export type SizeKey = `${number}x${number}`;

export interface Painting {
  id: string;
  kind: 'painting';
  genre: Genre;
  frame: FrameId;
  /** Width and height in wall cells. Paintings are never rotated. */
  w: number;
  h: number;
  /** The number on the back: width + height. Moves the prestige marker when the museum gets it. */
  value: number;
  /** Seed for the procedural painting, identical on every client. */
  seed: number;
  /** Which composition the art generator paints. */
  scene: string;
  title: string;
  starter?: boolean;
}

export interface Decor {
  id: string;
  kind: 'decor';
  shape: DecorShape;
  w: number;
  h: number;
  points: number;
}

export type Tile = Painting | Decor;

/** A tile hanging on a gallery wall; (x, y) is its top-left cell, x from the left, y from the top. */
export interface Hung {
  tile: Tile;
  x: number;
  y: number;
}

/** Where a tile waiting to be hung came from. Only auction paintings may be exchanged or stored as excess. */
export type IncomingFrom = 'auction' | 'museum' | 'reward' | 'excess';

export interface Incoming {
  tile: Tile;
  from: IncomingFrom;
}

/** Decor still to be chosen from the supply. */
export interface Reward {
  /** The most the decor may be worth: the number of touching matching frames, or 1 for an excess painting. */
  points: number;
  from: 'frames' | 'excess';
}

/** A player's placement work for the current round. */
export interface Task {
  /** Tiles waiting to be hung; the first one is being handled. */
  queue: Incoming[];
  /** Decor still to be chosen from the supply, first one first. */
  rewards: Reward[];
  /** Ids of the tiles hung on the wall during this task. Until the player is done they may still move. */
  placed: string[];
  /** Of those, the paintings in a frame match that earned decor (the new painting and the ones it touched): they stay put. */
  locked: string[];
}

export interface PlayerState {
  id: string;
  name: string;
  color: string;
  hat: HatId;
  isBot: boolean;
  connected: boolean;
  wall: Hung[];
  /** The assistant holds at most one tile for later. */
  assistant: Tile | null;
  /** Paintings that did not fit: -2 each, and a second one ends the game. */
  excess: Painting[];
  /** Bid cards still in hand (secret to other players). */
  hand: number[];
  /** Bidding stack, bottom first: the starting card, then every card played. Only the top is public. */
  stack: number[];
  /** Card chosen this round, secret until every bid is in. */
  bid: number | null;
  /** The starting painting, until it is hung during setup. */
  starter: Painting | null;
  /** Whether the player has taken a painting at this round's auction. */
  took: boolean;
  task: Task | null;
  /** Set by the server: a bot plays this human's seat for now (they left, or are away and the room allows it). */
  autopilot?: boolean;
}

export type Phase =
  | { kind: 'setup' }
  | { kind: 'select' }
  | { kind: 'bid' }
  | { kind: 'acquire'; order: string[]; next: number; bids: Record<string, number>; ties: TieBreak[] }
  | { kind: 'over' };

export type PhaseKind = Phase['kind'];

/** How players with equal bids were separated: by the first earlier cards in their stacks that differ. */
export interface TieBreak {
  bid: number;
  /** Neighbours in the final order. depth 1 is the card under this round's bid, and so on. */
  steps: { winner: string; loser: string; depth: number; winnerCard: number; loserCard: number }[];
}

export type EndReason = 'full' | 'excess' | 'cards' | 'supply';

export type LogKind = 'round' | 'auction' | 'bid' | 'take' | 'hang' | 'museum' | 'decor' | 'warn' | 'end' | 'info';

export interface LogEntry {
  id: number;
  kind: LogKind;
  text: string;
  pid?: string;
}

export interface GenreScore {
  genre: Genre;
  multiplier: number;
  count: number;
  /** Paintings of this type that touch another of the same type: they score nothing. */
  faux: number;
  points: number;
}

export interface PlayerResult {
  pid: string;
  genres: GenreScore[];
  prestigePoints: number;
  decorPoints: number;
  eyelineCount: number;
  eyelinePoints: number;
  full: boolean;
  fullPoints: number;
  corners: number;
  cornerPoints: number;
  excess: number;
  excessPoints: number;
  total: number;
  /** Tiebreak: the value of bid cards left in hand. */
  handValue: number;
  rank: number;
  /** Painting ids in faux pas and in the eyeline (for highlighting walls). */
  fauxIds: string[];
  eyelineIds: string[];
}

export interface GameResults {
  players: PlayerResult[];
  winners: string[];
  multipliers: Record<Genre, number>;
  /** Types from most to least prestigious. */
  ranking: Genre[];
  top: Genre | null;
  reason: EndReason;
}

export interface GameState {
  seed: number;
  rng: number;
  round: number;
  /** Index into players of the auctioneer (holder of the gavel). */
  auctioneer: number;
  players: PlayerState[];
  /** Face-down paintings. Clients only see how many of each size are left. */
  supply: Painting[];
  /** Paintings revealed for this round's auction. */
  lots: Painting[];
  /** Unsold paintings, piled by type. Players may exchange with them. */
  museum: Record<Genre, Painting[]>;
  /** Prestige marker positions; markers never share a space above zero. */
  prestige: Record<Genre, number>;
  /** Decor tiles left in the supply, by shape. */
  decor: Record<DecorShape, number>;
  decorSeq: number;
  phase: Phase;
  /** Set as soon as an end condition is met; the round is finished first. */
  end: { reason: EndReason; pid: string | null } | null;
  log: LogEntry[];
  logSeq: number;
  results: GameResults | null;
}

/** A player as one client sees them: other players' hands, stacks and bids are hidden. */
export interface PlayerView extends Omit<PlayerState, 'hand' | 'stack' | 'bid'> {
  /** Own hand (or everyone's once the game is over), otherwise null. */
  hand: number[] | null;
  handCount: number;
  stack: number[] | null;
  stackTop: number;
  stackCount: number;
  bid: number | null;
  hasBid: boolean;
}

export interface GameView extends Omit<GameState, 'rng' | 'supply' | 'players'> {
  players: PlayerView[];
  /** Face-down paintings left, by size. */
  supply: Record<string, number>;
  supplyTotal: number;
  you: string | null;
}

export type Action =
  | { type: 'starter'; x: number; y: number }
  | { type: 'auction'; sizes: string[] }
  | { type: 'bid'; card: number }
  | { type: 'take'; lot: string }
  | { type: 'hang'; which: 'new' | 'assistant'; x: number; y: number }
  | { type: 'assist' }
  | { type: 'exchange'; museum: string }
  | { type: 'excess' }
  | { type: 'decor'; shapes: DecorShape[] }
  /** Replace the decor tiles covering this spot with one `shape` tile from the supply (only when a size has run out). */
  | { type: 'swapDecor'; shape: DecorShape; x: number; y: number }
  /** Go without the decor when the supply has none of that value left. */
  | { type: 'skipDecor' }
  | { type: 'discard' }
  /** Move a tile hung this round to (x, y). */
  | { type: 'move'; tile: string; x: number; y: number }
  | { type: 'done' };

export type ActionType = Action['type'];

export type GameEvent =
  | { t: 'start' }
  | { t: 'starter'; pid: string; tile: Painting; x: number; y: number }
  | { t: 'round'; round: number; auctioneer: string; final: boolean }
  | { t: 'lots'; pid: string; lots: Painting[] }
  | { t: 'bid'; pid: string }
  | { t: 'reveal'; bids: Record<string, number>; order: string[]; ties: TieBreak[] }
  | { t: 'take'; pid: string; tile: Painting; pick: number }
  | {
      t: 'hang';
      pid: string;
      tile: Tile;
      x: number;
      y: number;
      from: IncomingFrom | 'assistant';
      /** Touching paintings with the same frame. */
      matches: string[];
      /** Touching paintings of the same type. */
      faux: string[];
    }
  | { t: 'assist'; pid: string; tile: Tile; from: IncomingFrom }
  | { t: 'exchange'; pid: string; gave: Painting; got: Painting }
  | { t: 'excess'; pid: string; tile: Painting }
  | { t: 'decor'; pid: string; tiles: Decor[]; reward: number }
  | { t: 'swapDecor'; pid: string; removed: Decor[]; tile: Decor; x: number; y: number }
  | { t: 'discard'; pid: string; tile: Decor }
  | {
      t: 'move';
      pid: string;
      tile: Tile;
      fromX: number;
      fromY: number;
      x: number;
      y: number;
      /** Paintings of the same type it touches at its new spot. */
      faux: string[];
    }
  | { t: 'done'; pid: string }
  | { t: 'museum'; tile: Painting; from: number; to: number; landed: number }
  | { t: 'trigger'; reason: EndReason; pid: string | null }
  | { t: 'over' };

export interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  hat: HatId;
  isBot: boolean;
  connected: boolean;
}

export interface RoomSettings {
  /** A bot plays for anyone disconnected for a while or sitting idle, until they are back. Off: the game waits. */
  autopilot: boolean;
}

export interface RoomView {
  code: string;
  hostId: string;
  status: 'lobby' | 'game';
  players: LobbyPlayer[];
  settings: RoomSettings;
  /** The only human at the table paused the game: the bots wait. */
  paused: boolean;
}

export type ClientMessage =
  | { t: 'hello'; token: string; room?: string }
  | { t: 'create'; name: string }
  | { t: 'join'; code: string; name: string }
  | { t: 'leave' }
  | { t: 'profile'; name?: string; color?: string; hat?: HatId }
  | { t: 'addBot' }
  | { t: 'removeBot'; id: string }
  | { t: 'start' }
  | { t: 'act'; action: Action }
  | { t: 'chat'; text: string }
  | { t: 'react'; emoji: string }
  | { t: 'back' }
  | { t: 'toLobby' }
  | { t: 'settings'; autopilot: boolean }
  /** The host lets a bot play a disconnected player's seat until that player comes back. */
  | { t: 'handOver'; id: string }
  | { t: 'pause'; on: boolean };

export type ServerMessage =
  | { t: 'welcome'; serverTime: number; lan: string[]; build?: string }
  | { t: 'room'; room: RoomView; you: string; serverTime: number }
  | { t: 'game'; view: GameView; events: GameEvent[]; serverTime: number }
  | { t: 'chat'; pid: string; name: string; color: string; text: string }
  | { t: 'react'; pid: string; emoji: string }
  | { t: 'error'; message: string }
  | { t: 'idle' }
  | { t: 'left' };
