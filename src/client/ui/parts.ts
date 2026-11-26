import { DECOR_INFO, FRAME_INFO, GENRE_INFO } from '../../shared/content';
import type { FrameId, Genre, Tile } from '../../shared/types';
import { artImg } from '../art/generate';
import { el, esc } from './dom';
import { icon } from './icons';

export function dot(color: string, cls = ''): string {
  return `<i class="pdot ${cls}" style="--pc:${color}"></i>`;
}

export function genreTag(g: Genre, short = false): string {
  const info = GENRE_INFO[g];
  return `<span class="gt" style="--gc:${info.color}">${icon(g)}<span>${esc(short ? info.short : info.name)}</span></span>`;
}

export function frameTag(f: FrameId): string {
  return `<span class="ft ft-${f}" title="${esc(FRAME_INFO[f].blurb)}"><i></i>${esc(FRAME_INFO[f].name)}</span>`;
}

export function shieldsHtml(n: number): string {
  return `<span class="shields" title="${n} point${n === 1 ? '' : 's'}">${icon('shield', 'ic sh').repeat(n)}</span>`;
}

/** A round bid disc in a player's colour. Null draws the back of a sealed bid. */
export function disc(n: number | null, color: string, cls = ''): string {
  return `<span class="disc ${n === null ? 'back' : ''} ${cls}" style="--pc:${color}">${n === null ? icon('laurel') : n}</span>`;
}

/** A tile's outline at a small scale, for the size picker. */
export function sizeShape(w: number, h: number, unit = 9): string {
  return `<span class="shape" style="width:${w * 1.5 * unit}px;height:${h * unit}px"></span>`;
}

export const sizeText = (w: number, h: number) => `${w}\u00d7${h}`;

export function tileName(t: Tile): string {
  return t.kind === 'painting' ? t.title : DECOR_INFO[t.shape].name;
}

/** Largest size with the tile's proportions (cells are 1.5 times wider than tall) inside a box. */
export function fitBox(t: { w: number; h: number }, boxW: number, boxH: number): { w: number; h: number } {
  const tw = t.w * 1.5;
  const k = Math.min(boxW / tw, boxH / t.h);
  return { w: Math.round(tw * k), h: Math.round(t.h * k) };
}

/** A framed miniature of a tile with the same proportions as on the wall, fitted inside boxW x boxH pixels. */
export function tileThumb(t: Tile, cls = '', boxW = 140, boxH = 92): HTMLElement {
  const size = fitBox(t, boxW, boxH);
  const d = el('div', `thumb ${t.kind === 'decor' ? 'decor' : `frame-${t.frame}`} ${cls}`);
  d.style.width = `${size.w}px`;
  d.style.height = `${size.h}px`;
  // Frame thickness follows the smaller side so small tiles still show their painting.
  d.style.setProperty('--fw', `${Math.max(2, Math.round(Math.min(size.w, size.h) * 0.09))}px`);
  if (t.kind === 'decor') {
    d.innerHTML = `<span class="decor-ic">${icon('decor')}</span>${shieldsHtml(t.points)}`;
    d.title = `${DECOR_INFO[t.shape].name} \u00b7 ${t.points} point${t.points === 1 ? '' : 's'}`;
    return d;
  }
  d.style.setProperty('--gc', GENRE_INFO[t.genre].color);
  d.appendChild(artImg(t, 'thumb-img'));
  if (Math.min(size.w, size.h) >= 26) d.insertAdjacentHTML('beforeend', `<span class="thumb-genre">${icon(t.genre)}</span>`);
  return d;
}

export interface TileCardOpts {
  cls?: string;
  /** Extra HTML under the caption (fit hints, prices). */
  footer?: string;
  onClick?: () => void;
  compact?: boolean;
}

/** A tile with its caption: type, frame, size and the museum value of a painting. */
export function tileCard(t: Tile, o: TileCardOpts = {}): HTMLElement {
  const card = el('div', `tcard ${t.kind} ${o.cls ?? ''} ${o.compact ? 'compact' : ''}`);
  const box = el('div', 'thumb-box');
  box.appendChild(o.compact ? tileThumb(t, '', 120, 74) : tileThumb(t, '', 150, 96));
  card.appendChild(box);
  const cap = el('div', 'tcap');
  if (t.kind === 'painting') {
    cap.innerHTML = `
      <div class="tc-title" title="${esc(t.title)}">${esc(t.title)}</div>
      <div class="tc-meta">${genreTag(t.genre, true)}${frameTag(t.frame)}</div>
      <div class="tc-size"><span>${sizeText(t.w, t.h)}</span><span class="val" title="Museum value: what this painting adds to its type's prestige if it goes unsold">${icon('hall')}${t.value}</span></div>
      ${o.footer ?? ''}`;
  } else {
    cap.innerHTML = `
      <div class="tc-title">${esc(DECOR_INFO[t.shape].name)}</div>
      <div class="tc-meta">${shieldsHtml(t.points)}<span class="muted">${sizeText(t.w, t.h)} decor</span></div>
      ${o.footer ?? ''}`;
  }
  card.appendChild(cap);
  if (o.onClick) {
    card.classList.add('clickable');
    card.tabIndex = 0;
    card.addEventListener('click', o.onClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        o.onClick!();
      }
    });
  }
  return card;
}
