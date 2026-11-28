import { buildPaintings, genreInfo, makeTitle, scenesOf } from '../shared/content';
import { makeRng } from '../shared/rng';
import { GENRES, THEMES, type ThemeId } from '../shared/types';
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
 * `&theme=avatar` shows a theme's paintings and `&scene=oasis` only one scene. `&game=3` instead deals
 * the paintings of one game (seed 3) and shows them type by type, with their titles.
 */
export function showArtPage(ui: HTMLElement, params: URLSearchParams) {
  const seed0 = Number(params.get('gallery')) || 1;
  const theme = THEMES.find((t) => t === params.get('theme')) ?? 'classic';
  const only = params.get('scene');
  const info = genreInfo(theme);
  ui.className = 'art-page';
  document.getElementById('scene')?.remove();
  if (params.has('game')) {
    showGame(ui, Number(params.get('game')) || 1, theme);
    return;
  }
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

/** All the paintings one game deals, per type, at their real proportions and with their titles. */
function showGame(ui: HTMLElement, seed: number, theme: ThemeId) {
  const info = genreInfo(theme);
  const { supply, starters } = buildPaintings(makeRng(seed), theme);
  for (const genre of GENRES) {
    if (theme !== 'classic' && !scenesOf(genre, theme).length) continue;
    const list = [...starters, ...supply].filter((p) => p.genre === genre).sort((a, b) => a.scene.localeCompare(b.scene));
    const row = document.createElement('div');
    row.className = 'art-row';
    const label = document.createElement('h3');
    label.textContent = `${info[genre].name}: ${list.length} paintings, ${new Set(list.map((p) => p.scene)).size} different subjects (game ${seed})`;
    row.appendChild(label);
    for (const p of list) {
      const fig = document.createElement('figure');
      fig.style.cssText = 'margin:0;display:flex;flex-direction:column;gap:4px';
      const c = paintTile(p);
      const { cw, ch } = canvasSize(p.w, p.h);
      c.style.height = `${ch * 64}px`;
      c.style.width = `${cw * 64}px`;
      const cap = document.createElement('figcaption');
      cap.style.cssText = `font-size:11px;line-height:1.3;color:#cbbd9e;max-width:${Math.max(110, cw * 64)}px`;
      cap.textContent = `${p.title} \u00b7 ${p.w}\u00d7${p.h}`;
      fig.append(c, cap);
      row.appendChild(fig);
    }
    ui.appendChild(row);
  }
}
