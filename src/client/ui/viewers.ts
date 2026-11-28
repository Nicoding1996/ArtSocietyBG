import { FRAME_INFO, RULES } from '../../shared/content';
import { ranking, scoreWall } from '../../shared/scoring';
import { GENRES, type GameView, type Genre, type PlayerView } from '../../shared/types';
import { emptyCells, fauxPasIds, fits, gridOf } from '../../shared/wall';
import { artImg } from '../art/generate';
import { typeIcon, typeInfo } from '../theme';
import { el, esc } from './dom';
import { icon } from './icons';
import { closeModal, modal } from './overlays';
import { dot, genreTag, shieldsHtml, tileCard, tileThumb } from './parts';

const W = RULES.wallW;
const H = RULES.wallH;
const pct = (n: number, of: number) => `${+((n / of) * 100).toFixed(4)}%`;

/** Share of a wall that is covered, in percent. */
export function coverage(p: Pick<PlayerView, 'wall'>): number {
  return Math.round(((W * H - emptyCells(gridOf(p.wall))) / (W * H)) * 100);
}

/** What a player would score if the evening ended now. */
export function scoreNow(v: GameView, p: PlayerView): number {
  return scoreWall({ id: p.id, wall: p.wall, excess: p.excess, hand: null }, ranking(v.prestige)).total;
}

/**
 * A player's wall drawn as a plan: every tile in its place on the 10 x 14 grid, the eyeline band and the
 * corners that are still bare. With `art` the paintings show their pictures in their frame's colour
 * (the large views); without, each painting is a block in its type's colour (the player cards).
 * Hatching marks paintings in a faux pas.
 */
export function miniWall(p: Pick<PlayerView, 'wall'>, art = false): HTMLElement {
  const box = el('div', `mw ${art ? 'art' : ''}`);
  box.style.aspectRatio = `${W * RULES.cellAspect} / ${H}`;
  const place = (d: HTMLElement, x: number, y: number, w: number, h: number) => {
    d.style.left = pct(x, W);
    d.style.top = pct(y, H);
    d.style.width = pct(w, W);
    d.style.height = pct(h, H);
  };
  const band = el('div', 'mw-eye');
  place(band, 0, RULES.eyeTop, W, RULES.eyeBottom - RULES.eyeTop + 1);
  box.appendChild(band);
  const grid = gridOf(p.wall);
  for (const [x, y] of RULES.corners) {
    if (grid[y * W + x] >= 0) continue;
    const c = el('i', 'mw-corner');
    place(c, x, y, 1, 1);
    box.appendChild(c);
  }
  const faux = fauxPasIds(p.wall, grid);
  for (const h of p.wall) {
    const t = h.tile;
    const d = el('div', `mw-t ${t.kind}`);
    place(d, h.x, h.y, t.w, t.h);
    if (t.kind === 'painting') {
      d.style.setProperty('--gc', typeInfo(t.genre).color);
      d.style.setProperty('--fc', FRAME_INFO[t.frame].color);
      if (faux.has(t.id)) d.classList.add('faux');
      if (art) {
        d.title = `${typeInfo(t.genre).name} \u00b7 ${FRAME_INFO[t.frame].name} frame${faux.has(t.id) ? ' \u00b7 faux pas' : ''}`;
        // The type's colour on a tab at the foot, like the label on the frames in the salon.
        d.append(artImg(t, 'mw-img'), el('span', 'mw-g', icon(typeIcon(t.genre))));
      }
    } else if (art) d.innerHTML = shieldsHtml(t.points);
    box.appendChild(d);
  }
  return box;
}

/** The line under a large wall: paintings of each type, wall covered, excess and the assistant's tile. */
function wallFacts(p: PlayerView): HTMLElement {
  const types = GENRES.map((g) => {
    const n = p.wall.filter((h) => h.tile.kind === 'painting' && h.tile.genre === g).length;
    return `<span class="wf-g" style="--gc:${typeInfo(g).color}" title="${esc(typeInfo(g).name)}: ${n} on the wall">${icon(typeIcon(g))}<b>${n}</b></span>`;
  }).join('');
  const foot = el(
    'div',
    'wf',
    `${types}<span class="wf-gap"></span><span title="Wall covered">${icon('wall')}<b>${coverage(p)}%</b></span>${
      p.excess.length ? `<span class="bad" title="Excess paintings, \u2212${RULES.excessPenalty} each">${icon('box')}<b>${p.excess.length}</b></span>` : ''
    }`,
  );
  const helper = el('span', 'wf-assist', icon('assistant'));
  helper.title = p.assistant ? "The assistant's tile" : 'The assistant is free';
  if (p.assistant) helper.appendChild(tileThumb(p.assistant, 'mini', 30, 20));
  foot.appendChild(helper);
  return foot;
}

/** The large version of a player's wall, shown beside their card while the pointer rests on it. */
export class WallPeek {
  readonly root = el('div', 'wall-peek');
  private pid: string | null = null;

  get showing(): string | null {
    return this.pid;
  }

  show(v: GameView, p: PlayerView, me: string | null, anchor: DOMRect) {
    this.pid = p.id;
    this.root.style.setProperty('--pc', p.color);
    this.root.innerHTML = `<div class="wp-head">${dot(p.color)}<b class="wp-name">${esc(p.name)}</b>${p.id === me ? '<span class="tag">You</span>' : ''}<span class="wp-score" title="Score if the evening ended now">${icon('laurel')}<b>${scoreNow(v, p)}</b></span></div>`;
    this.root.append(miniWall(p, true), wallFacts(p), el('div', 'wp-hint', 'Click the card to look at this wall in the salon'));
    this.root.classList.add('show');
    const h = this.root.offsetHeight;
    const top = Math.max(70, Math.min(anchor.top, window.innerHeight - h - 12));
    this.root.style.transform = `translate(${Math.round(anchor.right + 12)}px, ${Math.round(top)}px)`;
  }

  hide() {
    this.pid = null;
    this.root.classList.remove('show');
  }
}

// ---------- windows that stay current while open ----------

interface OpenViewer {
  el: HTMLElement;
  sig: (v: GameView) => string;
  render: (v: GameView, me: string | null) => void;
  last: string;
}

let viewer: OpenViewer | null = null;

function openViewer(cls: string, sig: (v: GameView) => string, render: (wrap: HTMLElement, v: GameView, me: string | null) => void, v: GameView, me: string | null): HTMLElement {
  const wrap = el('div', `viewer ${cls}`);
  render(wrap, v, me);
  modal(wrap, `${cls}-back`);
  viewer = { el: wrap, sig, render: (x, m) => render(wrap, x, m), last: sig(v) };
  return wrap;
}

/** Redraws the galleries or the museum window, if one is open, after the game moved on. */
export function refreshViewers(v: GameView, me: string | null) {
  const o = viewer;
  if (!o) return;
  if (!o.el.isConnected) {
    viewer = null;
    return;
  }
  const sig = o.sig(v);
  if (sig === o.last) return;
  o.last = sig;
  const box = o.el.closest<HTMLElement>('.modal');
  const top = box?.scrollTop ?? 0;
  o.render(v, me);
  if (box) box.scrollTop = top;
}

export function viewerOpen(kind: 'galleries' | 'museum'): boolean {
  return !!viewer?.el.isConnected && viewer.el.classList.contains(kind === 'galleries' ? 'galleries' : 'museum-view');
}

// ---------- the galleries: every wall side by side ----------

export function showGalleries(v: GameView, me: string | null, look: (pid: string) => void) {
  openViewer(
    'galleries',
    (x) => JSON.stringify([x.players.map((p) => [p.id, p.name, p.wall.length, p.assistant?.id ?? null, p.excess.length]), x.lots.map((l) => l.id), x.prestige, x.phase.kind]),
    (wrap, x, m) => renderGalleries(wrap, x, m, look),
    v,
    me,
  );
}

function renderGalleries(wrap: HTMLElement, v: GameView, me: string | null, look: (pid: string) => void) {
  wrap.innerHTML = `<h2>${icon('galleries')} The galleries</h2>
    <p class="lead">Every wall as it stands right now. Click one to look at it in the salon.</p>`;
  const grid = el('div', 'gal-grid');
  grid.style.setProperty('--n', String(v.players.length));
  v.players.forEach((p, i) => {
    const card = el('button', `gal-card ${p.id === me ? 'me' : ''}`);
    card.type = 'button';
    card.style.setProperty('--pc', p.color);
    card.title = `Look at ${p.name}'s wall (key ${i + 1})`;
    card.innerHTML = `<div class="gal-head"><kbd>${i + 1}</kbd>${dot(p.color)}<b class="gal-name">${esc(p.name)}</b>${p.id === me ? '<span class="tag">You</span>' : ''}<span class="gal-score" title="Score if the evening ended now">${icon('laurel')}<b>${scoreNow(v, p)}</b></span></div>`;
    card.append(miniWall(p, true), wallFacts(p));
    card.addEventListener('click', () => {
      closeModal();
      look(p.id);
    });
    grid.appendChild(card);
  });
  wrap.appendChild(grid);
  if (v.lots.length && (v.phase.kind === 'bid' || v.phase.kind === 'acquire')) {
    const grids = v.players.map((p) => ({ p, g: gridOf(p.wall) }));
    const sec = el('div', 'gal-lots', `<h3>${icon('gavel')} On offer, and who has room for it</h3>`);
    const row = el('div', 'gal-lot-row');
    for (const lot of v.lots) {
      const dots = grids
        .map(({ p, g }) => {
          const ok = fits(g, lot.w, lot.h);
          return `<span class="fitdot ${ok ? 'ok' : 'no'}" style="--pc:${p.color}" title="${esc(p.name)}: ${ok ? 'has room' : 'no room'}"></span>`;
        })
        .join('');
      row.appendChild(tileCard(lot, { compact: true, footer: `<div class="fitdots">${dots}</div>` }));
    }
    sec.appendChild(row);
    wrap.appendChild(sec);
  }
  wrap.appendChild(
    el('p', 'viewer-keys', `Keys: <kbd>1</kbd>\u2013<kbd>${v.players.length}</kbd> a player's wall \u00b7 <kbd>T</kbd> the table \u00b7 <kbd>M</kbd> your wall \u00b7 <kbd>G</kbd> this overview`),
  );
}

// ---------- the museum: the paintings nobody took ----------

export function showMuseum(v: GameView, me: string | null, focus?: Genre) {
  const wrap = openViewer(
    'museum-view',
    (x) => JSON.stringify([GENRES.map((g) => x.museum[g].map((m) => m.id)), x.prestige, x.players.find((p) => p.id === me)?.wall.length ?? 0]),
    (w, x, m) => renderMuseum(w, x, m, focus),
    v,
    me,
  );
  if (focus) requestAnimationFrame(() => wrap.querySelector('.mv-sec.focus')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
}

function renderMuseum(wrap: HTMLElement, v: GameView, me: string | null, focus?: Genre) {
  const mine = v.players.find((p) => p.id === me) ?? null;
  const grid = mine ? gridOf(mine.wall) : null;
  const rank = ranking(v.prestige);
  const total = GENRES.reduce((n, g) => n + v.museum[g].length, 0);
  wrap.innerHTML = `<h2>${icon('hall')} The museum</h2>
    <p class="lead">The paintings nobody took at auction, by type (${total} so far). If a painting you take has no room on your wall, you can give it to your assistant or swap it for one of the same type from here that fits. A swap leaves prestige as it is.</p>`;
  for (const g of rank.order) {
    const list = [...v.museum[g]].reverse();
    const fitting = grid ? list.filter((m) => fits(grid, m.w, m.h)).length : 0;
    const sec = el(
      'section',
      `mv-sec ${g === focus ? 'focus' : ''}`,
      `<div class="mv-head">${genreTag(g)}<span class="mv-stat">prestige <b>${v.prestige[g]}</b> \u00b7 <b>\u00d7${rank.multipliers[g]}</b> now \u00b7 ${list.length} painting${list.length === 1 ? '' : 's'}${
        grid && list.length ? ` \u00b7 ${fitting} fit${fitting === 1 ? 's' : ''} your wall` : ''
      }</span></div>`,
    );
    sec.style.setProperty('--gc', typeInfo(g).color);
    const row = el('div', 'mv-list');
    if (!list.length) row.appendChild(el('div', 'mv-empty', 'None yet.'));
    for (const m of list) {
      const ok = grid ? fits(grid, m.w, m.h) : null;
      const footer = ok === null ? '' : ok ? `<span class="fit ok">${icon('check')} fits your wall</span>` : `<span class="fit no">${icon('close')} no room</span>`;
      row.appendChild(tileCard(m, { compact: true, cls: ok === false ? 'dim' : '', footer }));
    }
    sec.appendChild(row);
    wrap.appendChild(sec);
  }
}
