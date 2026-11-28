import { RULES, scenesOf } from '../../shared/content';
import type { Genre, Painting } from '../../shared/types';
import { makePainter, type Painter } from './common';
import { cubistScene } from './cubism';
import { cityScene } from './city';
import { impressionScene } from './impressionism';
import { portraitScene } from './portrait';
import { postScene } from './postimpressionism';
import { stillScene } from './still';
import { ukiyoeScene } from './ukiyoe';
import { waterScene } from './avatar/water';
import { earthScene } from './avatar/earth';

/** Gap between a tile's edge and its frame, and the frame's width, in wall units (cell height = 1). */
export const TILE_MARGIN = 0.05;
export const FRAME_WIDTH = 0.19;
const INSET = TILE_MARGIN + FRAME_WIDTH;

/** Size of the painted canvas inside the frame of a w x h tile, in wall units. */
export function canvasSize(w: number, h: number): { cw: number; ch: number } {
  return { cw: w * RULES.cellAspect - 2 * INSET, ch: h - 2 * INSET };
}

export type ArtKey = Pick<Painting, 'genre' | 'scene' | 'seed' | 'w' | 'h'>;

const SCENES: Record<string, (p: Painter) => void> = {
  lilies: (p) => impressionScene(p, 'lilies'),
  poppies: (p) => impressionScene(p, 'poppies'),
  harbour: (p) => impressionScene(p, 'harbour'),
  wheat: (p) => postScene(p, 'wheat'),
  village: (p) => postScene(p, 'village'),
  fuji: (p) => ukiyoeScene(p, 'fuji'),
  wave: (p) => ukiyoeScene(p, 'wave'),
  blossom: (p) => ukiyoeScene(p, 'blossom'),
  boulevard: (p) => cityScene(p, 'boulevard'),
  cafe: (p) => cityScene(p, 'cafe'),
  bridge: (p) => cityScene(p, 'bridge'),
  classic: (p) => portraitScene(p, 'classic'),
  garden: (p) => portraitScene(p, 'garden'),
  modern: (p) => portraitScene(p, 'modern'),
  fruit: (p) => stillScene(p, 'fruit'),
  flowers: (p) => stillScene(p, 'flowers'),
  bottles: (p) => stillScene(p, 'bottles'),
  guitar: (p) => cubistScene(p, 'guitar'),
};

// Avatar theme: each nation's painter. Unpainted subjects show a placeholder. Subject ids are shared
// with the classic scenes in one table, so they must not repeat.
const AVATAR_PAINTERS: [Genre, (p: Painter, scene: string) => void][] = [
  ['city', waterScene],
  ['landscape', earthScene],
];
for (const [genre, paint] of AVATAR_PAINTERS)
  for (const scene of scenesOf(genre, 'avatar')) {
    if (SCENES[scene]) console.error(`Avatar subject "${scene}" has the same id as another scene`);
    SCENES[scene] = (p) => paint(p, scene);
  }

function sceneFor(art: ArtKey): (p: Painter) => void {
  if (art.scene === 'cubist') return (p) => cubistScene(p, art.genre === 'portrait' ? 'portrait' : 'still');
  return SCENES[art.scene] ?? SCENES.lilies;
}

/** Every scene is composed on a canvas of about this many virtual pixels, whatever its shape. */
const VIRTUAL_AREA = 300_000;

/** Real pixel size of the texture for a tile: sharp enough on screen, capped for memory. */
export function texturePixels(w: number, h: number): { pw: number; ph: number } {
  const { cw, ch } = canvasSize(w, h);
  let pw = cw * 120;
  let ph = ch * 120;
  const short = Math.min(pw, ph);
  if (short < 230) {
    pw *= 230 / short;
    ph *= 230 / short;
  }
  const long = Math.max(pw, ph);
  if (long > 1024) {
    pw *= 1024 / long;
    ph *= 1024 / long;
  }
  return { pw: Math.round(pw), ph: Math.round(ph) };
}

export function paintTile(art: ArtKey, scale = 1): HTMLCanvasElement {
  const { cw, ch } = canvasSize(art.w, art.h);
  const { pw, ph } = texturePixels(art.w, art.h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.round(pw * scale));
  canvas.height = Math.max(8, Math.round(ph * scale));
  const aspect = cw / ch;
  const vw = Math.sqrt(VIRTUAL_AREA * aspect);
  const p = makePainter(canvas, art.seed, 1, vw, vw / aspect);
  try {
    sceneFor(art)(p);
  } catch (err) {
    console.error('Painting failed', art, err);
    p.c.fillStyle = '#7a6a55';
    p.c.fillRect(0, 0, p.w, p.h);
  }
  return canvas;
}

interface Entry {
  canvas: HTMLCanvasElement | null;
  url: string | null;
  urlWaiters: ((url: string) => void)[];
  canvasWaiters: ((canvas: HTMLCanvasElement) => void)[];
}

const cache = new Map<string, Entry>();
const queue: ArtKey[] = [];
let pumping = false;

const keyOf = (a: ArtKey) => `${a.scene}:${a.genre}:${a.seed}:${a.w}x${a.h}`;

/** Paints queued artworks in small time slices so the frame rate survives a full gallery. */
function pump() {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const start = performance.now();
    while (queue.length && performance.now() - start < 18) {
      const art = queue.shift()!;
      const e = cache.get(keyOf(art))!;
      if (e.canvas) continue;
      const canvas = paintTile(art);
      e.canvas = canvas;
      for (const fn of e.canvasWaiters.splice(0)) fn(canvas);
      // JPEG encoding happens off the main thread; only <img> users wait for it.
      canvas.toBlob(
        (blob) => {
          e.url = blob ? URL.createObjectURL(blob) : canvas.toDataURL('image/jpeg', 0.9);
          for (const fn of e.urlWaiters.splice(0)) fn(e.url);
        },
        'image/jpeg',
        0.9,
      );
    }
    if (queue.length) setTimeout(step, 0);
    else pumping = false;
  };
  setTimeout(step, 0);
}

function ensure(art: ArtKey, urgent = false): Entry {
  const key = keyOf(art);
  let e = cache.get(key);
  if (!e) {
    e = { canvas: null, url: null, urlWaiters: [], canvasWaiters: [] };
    cache.set(key, e);
    if (urgent) queue.unshift(art);
    else queue.push(art);
    pump();
  } else if (urgent && !e.canvas) {
    const i = queue.findIndex((q) => keyOf(q) === key);
    if (i > 0) queue.unshift(...queue.splice(i, 1));
  }
  return e;
}

/** Canvas for 3D textures. Calls back once painted (immediately if cached). */
export function artCanvas(art: ArtKey, cb: (canvas: HTMLCanvasElement) => void, urgent = false) {
  const e = ensure(art, urgent);
  if (e.canvas) cb(e.canvas);
  else e.canvasWaiters.push(cb);
}

/** <img> element that fills in when the painting is ready. */
export function artImg(art: ArtKey, cls = 'art-img'): HTMLImageElement {
  const img = document.createElement('img');
  img.className = cls + ' loading';
  img.alt = '';
  img.decoding = 'async';
  img.draggable = false;
  const show = (url: string) => {
    img.src = url;
    img.classList.remove('loading');
  };
  const e = ensure(art, true);
  if (e.url) show(e.url);
  else e.urlWaiters.push(show);
  return img;
}
