import { GENRE_INFO, scenesOf } from '../shared/content';
import { GENRES } from '../shared/types';
import { canvasSize, paintTile } from './art/generate';

const SIZES: [number, number][] = [
  [1, 2],
  [2, 2],
  [3, 2],
  [2, 4],
  [5, 3],
  [3, 6],
];

/** Every scene of every type, painted in several tile shapes. */
export function showArtPage(ui: HTMLElement, seed0: number) {
  ui.className = 'art-page';
  document.getElementById('scene')?.remove();
  for (const genre of GENRES) {
    for (const scene of scenesOf(genre)) {
      const row = document.createElement('div');
      row.className = 'art-row';
      const label = document.createElement('h3');
      label.textContent = `${GENRE_INFO[genre].name} \u00b7 ${scene}`;
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
