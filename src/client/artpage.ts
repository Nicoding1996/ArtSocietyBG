import { genreInfo, makeTitle, scenesOf } from '../shared/content';
import { makeRng } from '../shared/rng';
import { GENRES, THEMES } from '../shared/types';
import { canvasSize, paintTile } from './art/generate';

const SIZES: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 2],
  [3, 2],
  [2, 4],
  [5, 3],
  [3, 6],
];

/**
 * Every scene of every type, painted in several tile shapes. `?gallery=7` uses another seed,
 * `&theme=avatar` shows a theme's paintings and `&scene=oasis` only one scene.
 */
export function showArtPage(ui: HTMLElement, params: URLSearchParams) {
  const seed0 = Number(params.get('gallery')) || 1;
  const theme = THEMES.find((t) => t === params.get('theme')) ?? 'classic';
  const only = params.get('scene');
  const info = genreInfo(theme);
  ui.className = 'art-page';
  document.getElementById('scene')?.remove();
  for (const genre of GENRES) {
    for (const scene of scenesOf(genre, theme)) {
      if (only && scene !== only) continue;
      const row = document.createElement('div');
      row.className = 'art-row';
      const label = document.createElement('h3');
      const title = makeTitle(makeRng(seed0), genre, scene, new Set(), theme);
      label.textContent = `${info[genre].name} \u00b7 ${scene} \u00b7 \u201c${title}\u201d`;
      row.appendChild(label);
      SIZES.forEach(([w, h], i) => {
        const c = paintTile({ genre, scene, seed: seed0 * 1000 + i * 7919, w, h });
        const { cw, ch } = canvasSize(w, h);
        c.style.height = `${ch * 64}px`;
        c.style.width = `${cw * 64}px`;
        c.title = `${w}\u00d7${h}`;
        row.appendChild(c);
      });
      ui.appendChild(row);
    }
  }
}
