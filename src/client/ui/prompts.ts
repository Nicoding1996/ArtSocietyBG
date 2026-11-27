import { DECOR_INFO, GENRE_INFO, PAINTING_SIZES, RULES, decorList, sizeKey } from '../../shared/content';
import { taskOptions } from '../../shared/options';
import { ranking, scoreWall } from '../../shared/scoring';
import { DECOR_SHAPES, type Action, type DecorShape, type GameView, type Genre, type Hung, type Painting, type PlayerView, type Tile } from '../../shared/types';
import { cornersCovered, coversStar, fits, gridOf, legalSpots, matchingFrames, moveSpots, overlapsEyeline, sameGenre, starterSpots } from '../../shared/wall';
import { el, esc, ordinal, renderIf } from './dom';
import { icon } from './icons';
import { disc, dot, genreTag, shieldsHtml, sizeShape, sizeText, tileCard, tileName } from './parts';

export interface Spot {
  x: number;
  y: number;
}

export interface PlaceRequest {
  tile: Tile;
  spots: Spot[];
  mode: 'place' | 'preview';
  onHover: (spot: (Spot & { valid: boolean }) | null) => void;
  onPin: (spot: Spot | null) => void;
  onCommit: (spot: Spot) => void;
  /** Moving a tile already on the wall: it is lifted off while the ghost shows where it would go. */
  lift?: string;
  /** Esc with no spot pinned. */
  onCancel?: () => void;
}

export interface PromptHost {
  act(a: Action): void;
  place(req: PlaceRequest): void;
  stopPlace(): void;
  pinned(): Spot | null;
  unpin(): void;
  marks(matches: string[], faux: string[]): void;
  /** Tiles on my wall that a click picks up to move (null for none). */
  movable(ids: string[] | null, onPick: (id: string) => void): void;
  /** Looks at your own wall (used when you start choosing a painting). */
  lookAtMyWall(): void;
  /** Opens the folded panel again while a wall stays on screen. */
  unfold(): void;
  /** Opens the museum window, at one type's paintings. */
  museum(genre: Genre): void;
}

interface Local {
  key: string;
  sizes: string[];
  bid: number | null;
  lot: string | null;
  which: 'new' | 'assistant';
  decor: DecorShape[];
  /** The tile hung this round that is being moved. */
  moving: string | null;
  pending: boolean;
}

const fresh = (key: string): Local => ({ key, sizes: [], bid: null, lot: null, which: 'new', decor: [], moving: null, pending: false });

/**
 * Where a painting with no room on a player's wall could still go: the assistant (free now, or once the
 * tile it holds is hung) and how many same-type museum paintings would fit to swap it for.
 */
function noRoom(v: GameView, p: PlayerView, lot: Painting): { helper: 'free' | 'after' | null; swaps: number } {
  const grid = gridOf(p.wall);
  return {
    helper: !p.assistant ? 'free' : fits(grid, p.assistant.w, p.assistant.h) ? 'after' : null,
    swaps: v.museum[lot.genre].filter((m) => fits(grid, m.w, m.h)).length,
  };
}

export class Prompts {
  readonly root = el('div', 'prompt');
  private local: Local = fresh('');
  private view: GameView | null = null;
  private me: string | null = null;
  private info: HTMLElement | null = null;
  /** True while hovering the decor swap button outlines tiles on my wall. */
  private swapMarked = false;
  /** Tiles a click on my wall picks up to move, collected while the panel is drawn. */
  private movableIds: string[] | null = null;
  folded = false;

  constructor(private host: PromptHost) {}

  /** A rebuilt or hidden panel loses the hovered swap button without a mouseleave, so its outlines go here. */
  private clearSwapMarks() {
    if (!this.swapMarked) return;
    this.swapMarked = false;
    this.host.marks([], []);
  }

  /** The server rejected the last action: let the player try again. */
  unlock() {
    this.local.pending = false;
    this.rerender();
  }

  hide() {
    this.clearSwapMarks();
    this.root.innerHTML = '';
    this.root.dataset.sig = '';
    this.root.className = 'prompt';
    this.host.stopPlace();
    this.host.movable(null, () => undefined);
  }

  /** Picks up a tile hung this round to move it. */
  private startMove(id: string) {
    if (this.local.pending) return;
    this.local.moving = id;
    this.host.unpin();
    this.rerender();
  }

  private cancelMove() {
    this.local.moving = null;
    this.host.unpin();
    this.rerender();
  }

  private rerender() {
    this.root.dataset.sig = '';
    if (this.view) this.render(this.view, this.me);
  }

  /** The panel animates in when its subject changes, not on every small update. */
  private animatedKey = '';

  private send(a: Action) {
    this.local.pending = true;
    this.host.stopPlace();
    this.host.act(a);
    this.rerender();
  }

  render(v: GameView, me: string | null) {
    this.view = v;
    this.me = me;
    const p = v.players.find((x) => x.id === me);
    const ph = v.phase;
    // Where every tile hangs, so a move (which leaves the task as it was) still starts the panel afresh.
    const taskSig = p ? JSON.stringify([p.task, p.assistant?.id, p.starter?.id, p.wall.map((h) => h.x * 100 + h.y)]) : '';
    const key = `${ph.kind}:${v.round}:${taskSig}:${ph.kind === 'acquire' ? ph.next : ''}`;
    if (key !== this.local.key) this.local = fresh(key);
    if (!p || ph.kind === 'over') return this.hide();
    const L = this.local;
    const sig = JSON.stringify([key, L, this.host.pinned(), this.folded, v.players.map((x) => [x.hasBid, !!x.task, !!x.starter]), v.supply, v.museum.city.length + v.museum.portrait.length + v.museum.still.length + v.museum.landscape.length]);
    renderIf(this.root, sig, () => {
      this.clearSwapMarks();
      this.root.className = `prompt ${L.pending ? 'pending' : ''} ${this.folded ? 'folded' : ''}`;
      this.root.innerHTML = '';
      this.info = null;
      this.movableIds = null;
      let placing = false;
      switch (ph.kind) {
        case 'setup':
          placing = this.renderSetup(v, p);
          break;
        case 'select':
          this.renderSelect(v, p);
          break;
        case 'bid':
          this.renderBid(v, p);
          break;
        case 'acquire':
          placing = this.renderAcquire(v, p);
          break;
      }
      if (!placing) this.host.stopPlace();
      this.host.movable(L.pending ? null : this.movableIds, (id) => this.startMove(id));
      for (const side of this.root.querySelectorAll('.task-side')) if (!side.childElementCount) side.remove();
      for (const body of this.root.querySelectorAll<HTMLElement>('.pr-body')) this.watchOverflow(body);
      if (this.folded) {
        // Folded while a wall is on screen: one line that says what the step is, and a way back.
        for (const box of this.root.querySelectorAll('.pr-box')) {
          const b = el('button', 'btn ghost pr-unfold', `${icon('up')} Show`);
          b.title = 'Open this panel again';
          b.addEventListener('click', () => this.host.unfold());
          box.appendChild(b);
        }
      }
      if (this.animatedKey === key) this.root.querySelectorAll('.pr-box').forEach((b) => b.classList.add('still'));
      this.animatedKey = key;
    });
  }

  /** Folds the panel down to one line, so a wall can use the screen (see GameScreen.syncFold). */
  setFolded(on: boolean) {
    if (on === this.folded) return;
    this.folded = on;
    this.rerender();
  }

  // ---------- helpers ----------

  /**
   * A prompt box. It returns the box's body, which scrolls when the window is short; whatever goes in
   * the box's foot (see `foot`) stays in view below it.
   */
  private box(cls: string, kicker: string, title: string, hint = ''): HTMLElement {
    const b = el('div', `pr-box ${cls}`);
    const body = el('div', 'pr-body', `${kicker ? `<div class="pr-kicker">${kicker}</div>` : ''}<div class="pr-title">${title}</div>${hint ? `<div class="pr-hint">${hint}</div>` : ''}`);
    b.appendChild(body);
    this.root.appendChild(b);
    return body;
  }

  /** The part of a prompt box that never scrolls away: the controls that finish the step. */
  private foot(body: HTMLElement): HTMLElement {
    const box = body.parentElement!;
    let f = box.querySelector<HTMLElement>(':scope > .pr-foot');
    if (!f) {
      f = el('div', 'pr-foot');
      box.appendChild(f);
    }
    return f;
  }

  /** Fades the bottom edge of a body that has more to scroll to. */
  private watchOverflow(body: HTMLElement) {
    const update = () => body.classList.toggle('more', body.scrollHeight - body.scrollTop - body.clientHeight > 2);
    body.addEventListener('scroll', update, { passive: true });
    requestAnimationFrame(update);
  }

  private button(label: string, cls: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const b = el('button', `btn ${cls}`, label);
    if (disabled || this.local.pending) b.disabled = true;
    b.addEventListener('click', onClick);
    return b;
  }

  /** Placement on my own wall with live feedback about the spot under the pointer. */
  private place(
    v: GameView,
    p: PlayerView,
    tile: Tile,
    spots: Spot[],
    mode: 'place' | 'preview',
    commit: (s: Spot) => void,
    move?: { onCancel: () => void },
  ) {
    if (this.local.pending) return;
    this.host.place({
      tile,
      spots,
      mode,
      onHover: (s) => this.showSpotInfo(v, p, tile, s, !!move),
      onPin: () => this.rerender(),
      onCommit: (s) => commit(s),
      lift: move ? tile.id : undefined,
      onCancel: move?.onCancel,
    });
  }

  /**
   * What hanging `tile` at the spot would do: frames it matches, faux pas, the eyeline, corners, and the
   * score before and after. `moving` means the tile is already on the wall and is being moved.
   */
  private showSpotInfo(v: GameView, p: PlayerView, tile: Tile, s: (Spot & { valid: boolean }) | null, moving = false) {
    if (!this.info) return;
    if (!s) {
      this.info.innerHTML = '';
      this.host.marks([], []);
      return;
    }
    if (!s.valid) {
      this.info.innerHTML = moving
        ? `<span class="chip bad">${icon('close')} Not here: it must stay on empty space, touching another tile, and every tile must still touch the rest of the wall</span>`
        : `<span class="chip bad">${icon('close')} Not here: tiles must touch another tile along an edge and stay on empty space</span>`;
      this.host.marks([], []);
      return;
    }
    const wall = moving ? p.wall.filter((h) => h.tile.id !== tile.id) : p.wall;
    const after: Hung[] = [...wall, { tile, x: s.x, y: s.y }];
    const chips: string[] = [scoreChip(v, p, after)];
    let matches: string[] = [];
    let faux: string[] = [];
    if (v.phase.kind === 'setup') {
      if (coversStar(tile.w, tile.h, s.x, s.y)) chips.push(`<span class="chip good">${icon('star')} Covers a star</span>`);
    } else if (tile.kind === 'painting') {
      const grid = gridOf(wall);
      matches = matchingFrames(wall, grid, tile, s.x, s.y);
      faux = sameGenre(wall, grid, tile, s.x, s.y);
      const n = matches.length;
      if (n && moving) chips.push(`<span class="chip">${icon('frame')} ${n} matching frame${n === 1 ? '' : 's'}, but a move earns no decor</span>`);
      else if (n) chips.push(`<span class="chip gold">${icon('frame')} ${n} matching frame${n === 1 ? '' : 's'}: decor worth up to ${n}</span>`);
      if (faux.length) chips.push(`<span class="chip bad">${icon('close')} Faux pas: touches ${faux.length === 1 ? 'another' : faux.length} ${esc(GENRE_INFO[tile.genre].name)}${faux.length === 1 ? '' : 's'}, they won't score</span>`);
      if (overlapsEyeline(s.y, tile.h)) chips.push(`<span class="chip">${icon('eye')} In the eyeline</span>`);
    }
    const corners = cornersCovered(tile.w, tile.h, s.x, s.y);
    if (corners) chips.push(`<span class="chip good">Covers ${corners === 1 ? 'a corner' : `${corners} corners`}</span>`);
    this.info.innerHTML = chips.join('');
    this.host.marks(matches, faux);
  }

  private infoLine(box: HTMLElement): HTMLElement {
    const i = el('div', 'spot-info');
    box.appendChild(i);
    this.info = i;
    return i;
  }

  private pinnedActions(acts: HTMLElement, label = 'Hang here') {
    const pin = this.host.pinned();
    if (pin) {
      acts.appendChild(this.button(`${icon('check')} ${label}`, 'primary', () => this.commitPinned()));
      acts.appendChild(this.button('Another spot', 'ghost', () => this.host.unpin()));
    } else acts.insertAdjacentHTML('afterbegin', `<span class="pr-hint">Point at your wall, click to pin a spot, click it again to ${label === 'Hang here' ? 'hang' : 'confirm'}.</span>`);
  }

  /** The line saying which tiles hung this round can still move, when some can. */
  private movesHint(box: HTMLElement, ids: string[], p: PlayerView) {
    if (!ids.length) return;
    this.movableIds = ids;
    const one = ids.length === 1 ? p.wall.find((h) => h.tile.id === ids[0])?.tile : null;
    const what = one
      ? `${one.kind === 'painting' ? `\u201c${esc(one.title)}\u201d` : `the ${esc(DECOR_INFO[one.shape].name.toLowerCase())}`} until you press Done: click it on your wall`
      : `the ${ids.length} tiles you hung this round until you press Done: click one on your wall`;
    const kept = p.task?.locked?.length ? ' Paintings that earned decor stay put.' : '';
    box.appendChild(el('div', 'pr-hint moves-hint', `${icon('swap')}<span>You can still move ${what}.${kept}</span>`));
  }

  private commitHandler: ((s: Spot) => void) | null = null;

  private commitPinned() {
    const pin = this.host.pinned();
    if (pin && this.commitHandler) this.commitHandler(pin);
  }

  // ---------- phases ----------

  private renderSetup(v: GameView, p: PlayerView): boolean {
    const s = p.starter;
    if (!s) {
      const left = v.players.filter((x) => x.starter).map((x) => esc(x.name));
      this.box('slim center', '', 'Your starting painting is up', left.length ? `Waiting for ${left.join(', ')}\u2026` : '');
      return false;
    }
    const box = this.box('task', 'Setting up', 'Hang your starting painting', `It must cover at least one ${icon('star')} star in the middle of your wall.`);
    const row = el('div', 'task-row');
    row.appendChild(tileCard(s));
    const side = el('div', 'task-side');
    row.appendChild(side);
    box.appendChild(row);
    this.infoLine(this.foot(box));
    const acts = el('div', 'pr-actions');
    this.foot(box).appendChild(acts);
    const commit = (sp: Spot) => this.send({ type: 'starter', x: sp.x, y: sp.y });
    this.commitHandler = commit;
    this.pinnedActions(acts);
    this.place(v, p, s, starterSpots(s.w, s.h), 'place', commit);
    return true;
  }

  private renderSelect(v: GameView, p: PlayerView) {
    const auct = v.players[v.auctioneer];
    const want = v.players.length + 1;
    if (auct.id !== p.id) {
      this.box('slim center', `${icon('gavel')} The auction`, `${dot(auct.color)} ${esc(auct.name)} is choosing ${want} paintings`, 'They choose by size only. Type and frame stay hidden until the reveal.');
      return;
    }
    const L = this.local;
    const box = this.box(
      'wide',
      `${icon('gavel')} You hold the gavel`,
      `Choose ${want} paintings to put up for auction`,
      'Only the size shows on the back: type and frame are a surprise. The number is the prestige the museum gains if that painting is left over.',
    );
    const grid = el('div', 'size-grid');
    const used = (k: string) => L.sizes.filter((x) => x === k).length;
    for (const s of PAINTING_SIZES) {
      const k = sizeKey(s.w, s.h);
      const left = (v.supply[k] ?? 0) - used(k);
      const b = el('button', `size-btn v${s.w + s.h}`, `${sizeShape(s.w, s.h)}<span class="sz">${sizeText(s.w, s.h)}</span><span class="sv">${s.w + s.h}</span><span class="sl">${left} left</span>`);
      b.disabled = left <= 0 || L.sizes.length >= want || L.pending;
      b.title = `${sizeText(s.w, s.h)} painting, museum value ${s.w + s.h}`;
      b.addEventListener('click', () => {
        L.sizes.push(k);
        this.rerender();
      });
      grid.appendChild(b);
    }
    box.appendChild(grid);
    const chips = el('div', 'size-chips');
    chips.innerHTML = L.sizes.length ? '' : '<span class="muted">Nothing chosen yet</span>';
    L.sizes.forEach((k, i) => {
      const [w, h] = k.split('x').map(Number);
      const c = el('button', 'chip removable', `${sizeShape(w, h, 6)} ${sizeText(w, h)} ${icon('close')}`);
      c.title = 'Remove';
      c.addEventListener('click', () => {
        L.sizes.splice(i, 1);
        this.rerender();
      });
      chips.appendChild(c);
    });
    const acts = el('div', 'pr-actions');
    acts.appendChild(chips);
    acts.appendChild(
      this.button('Surprise me', 'ghost', () => {
        const pool: string[] = [];
        for (const [k, n] of Object.entries(v.supply)) for (let i = 0; i < n - used(k); i++) pool.push(k);
        while (L.sizes.length < want && pool.length) L.sizes.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        this.rerender();
      }, L.sizes.length >= want),
    );
    acts.appendChild(this.button(`Reveal ${want} paintings`, 'primary', () => this.send({ type: 'auction', sizes: [...L.sizes] }), L.sizes.length !== want));
    this.foot(box).appendChild(acts);
  }

  /**
   * Lot cards with hints about whether they fit on my wall and, when one does not, where it could go:
   * to my assistant, swapped for a same-type museum painting that fits, or else into excess.
   */
  private lotRow(v: GameView, p: PlayerView, onPick?: (id: string) => void): HTMLElement {
    const row = el('div', 'lots');
    const grid = gridOf(p.wall);
    for (const lot of v.lots) {
      let fit = `<span class="fit ok">${icon('check')} fits</span>`;
      if (!legalSpots(grid, lot.w, lot.h).length) {
        const { helper, swaps } = noRoom(v, p, lot);
        const type = esc(GENRE_INFO[lot.genre].name);
        const alts = [
          helper
            ? `<span class="fit-alt" title="${helper === 'free' ? 'Your assistant is free and could hold it for later' : "Hang your assistant's tile first, then the assistant could hold this one"}">${icon('assistant')} assistant</span>`
            : '',
          swaps
            ? `<button class="fit-alt swap" title="The museum has ${swaps} ${type} painting${swaps === 1 ? '' : 's'} that would fit your wall: you could swap this one for ${swaps === 1 ? 'it' : 'one of them'}. Click to see the museum.">${icon('swap')} ${swaps} to swap</button>`
            : '',
        ].join('');
        fit = `<span class="fit no">${icon('close')} no room</span>${
          alts
            ? `<span class="fit-alts">${alts}</span>`
            : `<span class="fit-alts"><span class="fit-alt bad" title="Nothing could take it: it would be stored as excess (\u2212${RULES.excessPenalty} at the end) and you would take a 1-point decor tile">${icon('box')} excess</span></span>`
        }`;
      }
      const card = tileCard(lot, {
        compact: true,
        cls: `${this.local.lot === lot.id ? 'selected' : ''}`,
        footer: fit,
        onClick: onPick && !this.local.pending ? () => onPick(lot.id) : undefined,
      });
      const swap = card.querySelector<HTMLElement>('.fit-alt.swap');
      if (swap) {
        swap.addEventListener('click', (e) => {
          e.stopPropagation();
          this.host.museum(lot.genre);
        });
        // Enter on the button opens the museum rather than choosing the card.
        swap.addEventListener('keydown', (e) => e.stopPropagation());
      }
      row.appendChild(card);
    }
    return row;
  }

  private renderBid(v: GameView, p: PlayerView) {
    const L = this.local;
    const box = this.box('wide', `${icon('cards')} Secret bids`, 'Bid for the first choice', `Highest card chooses first. Each card is used once. Ties are settled by the card underneath: yours is ${disc(p.stackTop, p.color, 'tiny')}.`);
    box.appendChild(this.lotRow(v, p));
    if (p.hasBid) {
      const waiting = v.players.filter((x) => !x.hasBid).map((x) => esc(x.name));
      box.appendChild(el('div', 'sealed', `${icon('check')} Your sealed bid: ${disc(p.bid, p.color, 'small')} ${waiting.length ? `Waiting for ${waiting.join(', ')}\u2026` : ''}`));
      return;
    }
    const hand = el('div', 'hand');
    const mine = new Set(p.hand ?? []);
    for (let n = 1; n <= RULES.cards; n++) {
      const have = mine.has(n);
      const b = el('button', `bidcard ${L.bid === n ? 'on' : ''}`, `<span>${n}</span>`);
      b.style.setProperty('--pc', p.color);
      b.disabled = !have || L.pending;
      b.title = have ? `Bid ${n}` : 'Already played';
      b.addEventListener('click', () => {
        L.bid = n;
        this.rerender();
      });
      hand.appendChild(b);
    }
    // The cards and the seal button stay in view; only the paintings scroll on a short window.
    this.foot(box).appendChild(hand);
    const acts = el('div', 'pr-actions');
    acts.appendChild(this.button(L.bid ? `Seal my bid of ${L.bid}` : 'Choose a card', 'primary', () => L.bid && this.send({ type: 'bid', card: L.bid }), !L.bid));
    this.foot(box).appendChild(acts);
  }

  private orderStrip(v: GameView): HTMLElement {
    const ph = v.phase;
    const strip = el('div', 'order');
    if (ph.kind !== 'acquire') return strip;
    ph.order.forEach((pid, i) => {
      const x = v.players.find((q) => q.id === pid);
      if (!x) return;
      const state = i < ph.next ? (x.task ? 'hanging' : 'done') : i === ph.next ? 'picking' : 'waiting';
      const label = state === 'done' ? icon('check') : state === 'hanging' ? icon('frame') : state === 'picking' ? icon('arrow') : '';
      const pill = el('div', `ord ${state} ${x.id === this.me ? 'me' : ''}`, `${disc(ph.bids[pid], x.color, 'small')}<span>${esc(x.name)}</span>${label}`);
      const doing = { done: 'has picked', hanging: 'is hanging a painting', picking: 'is picking now', waiting: 'is waiting' }[state];
      pill.title = `${x.name} bid ${ph.bids[pid]}: picks ${ordinal(i + 1)} and ${doing}`;
      strip.appendChild(pill);
    });
    return strip;
  }

  private renderAcquire(v: GameView, p: PlayerView): boolean {
    const ph = v.phase;
    if (ph.kind !== 'acquire') return false;
    const L = this.local;
    if (p.task) return this.renderTask(v, p);
    if (ph.order[ph.next] === p.id) {
      const box = this.box('wide pick', 'Your pick', 'Choose a painting', 'Click one to try it on your wall, then take it.');
      box.prepend(this.orderStrip(v));
      box.appendChild(
        this.lotRow(v, p, (id) => {
          L.lot = id;
          this.host.lookAtMyWall();
          this.rerender();
        }),
      );
      const lot = v.lots.find((l) => l.id === L.lot);
      const acts = el('div', 'pr-actions');
      if (lot) {
        const spots = legalSpots(gridOf(p.wall), lot.w, lot.h);
        this.infoLine(this.foot(box));
        if (!spots.length) {
          const { helper, swaps } = noRoom(v, p, lot);
          const ways = [helper === 'free' ? 'your assistant can hold it' : helper === 'after' ? 'your assistant can hold it once its tile is hung' : '', swaps ? `swap it at the museum (${swaps} fit${swaps === 1 ? 's' : ''})` : ''].filter(Boolean);
          this.info!.innerHTML = `<span class="chip bad">${icon('close')} No room on your wall: ${ways.length ? ways.join(', or ') : `it would be excess (\u2212${RULES.excessPenalty})`}</span>`;
        }
        this.place(v, p, lot, spots, 'preview', () => undefined);
        acts.appendChild(this.button(`Take <span class="ell">\u201c${esc(lot.title)}\u201d</span>`, 'primary', () => this.send({ type: 'take', lot: lot.id })));
      } else acts.appendChild(this.button('Choose a painting above', 'primary', () => undefined, true));
      this.foot(box).appendChild(acts);
      return !!lot;
    }
    const picker = v.players.find((x) => x.id === ph.order[ph.next]);
    const busy = v.players.filter((x) => x.task).map((x) => esc(x.name));
    const box = this.box(
      'slim center',
      '',
      picker ? `${dot(picker.color)} ${esc(picker.name)} is choosing a painting` : 'Everyone is hanging their paintings',
      !picker && busy.length ? `Waiting for ${busy.join(', ')}\u2026` : p.took ? 'Your painting is hung.' : '',
    );
    box.prepend(this.orderStrip(v));
    return false;
  }

  private renderTask(v: GameView, p: PlayerView): boolean {
    const opt = taskOptions(v, p)!;
    const L = this.local;
    const grid = gridOf(p.wall);

    if (opt.stage === 'decor') {
      const k = opt.reward;
      const forExcess = opt.rewardFrom === 'excess';
      const box = this.box(
        'task',
        forExcess ? `${icon('box')} Excess painting` : `${icon('frame')} Matching frames`,
        forExcess ? 'Take your 1-point decor tile' : opt.multi ? `Take decor adding up to ${k} points` : `Take a decor tile worth up to ${k}`,
        'Decor fills awkward gaps and scores its shields at the end. You can hang it now or give it to your assistant.',
      );
      const row = el('div', 'decor-pick');
      const total = L.decor.reduce((s, d) => s + DECOR_INFO[d].points, 0);
      // Sold-out sizes stay on show, so it is clear why they cannot be taken.
      for (const s of DECOR_SHAPES.filter((x) => DECOR_INFO[x].points <= k)) {
        const d = DECOR_INFO[s];
        const takenNow = L.decor.filter((x) => x === s).length;
        const left = v.decor[s] - takenNow;
        const fits = legalSpots(grid, d.w, d.h).length > 0;
        const b = el(
          'button',
          'decor-btn',
          `${sizeShape(d.w, d.h, 12)}<span class="dn">${esc(d.name)}</span>${shieldsHtml(d.points)}<span class="dl">${v.decor[s] <= 0 ? 'sold out' : `${left} left${fits ? '' : ' \u00b7 no room'}`}</span>`,
        );
        b.disabled = L.pending || left <= 0 || (opt.multi && total + d.points > k);
        b.addEventListener('click', () => {
          if (!opt.multi) return this.send({ type: 'decor', shapes: [s] });
          L.decor.push(s);
          this.rerender();
        });
        row.appendChild(b);
      }
      box.appendChild(row);
      const swap = opt.swaps[0];
      if (swap) {
        // The rulebook's way out when a size runs out: trade short decor on the wall for one long tile.
        const wrap = el(
          'div',
          'decor-swap',
          `<div class="pr-hint">${icon('swap')} The supply has run out of ${swap.frees.map((s) => esc(DECOR_INFO[s].plural)).join(' and ')}. Swap decor on your wall for a longer tile to put some back. Your points stay the same.</div>`,
        );
        const b = this.button(
          `${icon('swap')} Swap ${esc(decorList(swap.removed))} for a ${esc(DECOR_INFO[swap.shape].name.toLowerCase())}`,
          opt.decorShapes.length ? 'ghost' : 'primary',
          () => {
            this.clearSwapMarks();
            this.send({ type: 'swapDecor', shape: swap.shape, x: swap.x, y: swap.y });
          },
        );
        b.addEventListener('mouseenter', () => {
          if (this.local.pending) return;
          this.swapMarked = true;
          this.host.marks(swap.removed.map((d) => d.id), []);
        });
        b.addEventListener('mouseleave', () => this.clearSwapMarks());
        wrap.appendChild(b);
        // When nothing in the supply can be taken, the swap is the way forward, so it stays in view.
        (opt.decorShapes.length ? box : this.foot(box)).appendChild(wrap);
      }
      if (opt.canSkipDecor) {
        const acts = el('div', 'pr-actions');
        acts.appendChild(this.button('Go without', 'ghost', () => this.send({ type: 'skipDecor' })));
        this.foot(box).appendChild(acts);
      }
      if (opt.multi) {
        const acts = el('div', 'pr-actions');
        const chips = el('div', 'size-chips');
        chips.innerHTML = L.decor.length ? '' : '<span class="muted">Add decor above</span>';
        L.decor.forEach((s, i) => {
          const c = el('button', 'chip removable', `${esc(DECOR_INFO[s].name)} ${icon('close')}`);
          c.addEventListener('click', () => {
            L.decor.splice(i, 1);
            this.rerender();
          });
          chips.appendChild(c);
        });
        acts.appendChild(chips);
        acts.appendChild(el('span', 'pr-hint', `${total} of ${k}`));
        acts.appendChild(this.button('Take this decor', 'primary', () => this.send({ type: 'decor', shapes: [...L.decor] }), !L.decor.length));
        this.foot(box).appendChild(acts);
      }
      return false;
    }

    // Rearranging: a tile hung this round is picked up and goes to a new spot.
    if (L.moving) {
      if (opt.moves.includes(L.moving)) return this.renderMove(v, p, L.moving, opt.moves);
      L.moving = null;
    }

    if (opt.stage === 'finish') {
      const a = opt.canHangAssistant ? p.assistant : null;
      if (!a) {
        // Only moves are left: the round waits until the player says they are finished.
        const box = this.box('task done-step', `${icon('check')} Everything is hung`, 'Finished with your wall for this round?');
        this.movesHint(box, opt.moves, p);
        const acts = el('div', 'pr-actions');
        acts.appendChild(this.button(`${icon('check')} Done for this round`, 'primary', () => this.send({ type: 'done' })));
        this.foot(box).appendChild(acts);
        return false;
      }
      const box = this.box('task', `${icon('assistant')} Your assistant`, 'Hang the tile your assistant is holding?', 'Or keep it for a later round. A tile still held at the end scores nothing.');
      const row = el('div', 'task-row');
      row.appendChild(tileCard(a));
      const side = el('div', 'task-side');
      row.appendChild(side);
      box.appendChild(row);
      this.movesHint(box, opt.moves, p);
      this.infoLine(this.foot(box));
      const acts = el('div', 'pr-actions');
      this.foot(box).appendChild(acts);
      const commit = (sp: Spot) => this.send({ type: 'hang', which: 'assistant', x: sp.x, y: sp.y });
      this.commitHandler = commit;
      this.pinnedActions(acts);
      acts.appendChild(this.button('Done for this round', this.host.pinned() ? 'ghost' : 'primary', () => this.send({ type: 'done' })));
      this.place(v, p, a, legalSpots(grid, a.w, a.h), 'place', commit);
      return true;
    }

    // Stage 'tile': the next tile to deal with.
    const head = opt.head!;
    const usingAssistant = L.which === 'assistant' && opt.canHangAssistant && !!p.assistant;
    const tile = usingAssistant ? p.assistant! : head.tile;
    const titles: Record<string, string> = {
      auction: 'Hang your new painting',
      museum: 'Hang the painting from the museum',
      reward: 'Hang your decor',
      excess: 'Hang your consolation decor',
    };
    const box = this.box(
      'task',
      usingAssistant ? `${icon('assistant')} From your assistant` : head.from === 'auction' ? `${icon('gavel')} Bought at auction` : head.from === 'museum' ? `${icon('hall')} From the museum` : `${icon('decor')} Decor`,
      usingAssistant ? `Hang your assistant's ${tile.kind === 'painting' ? 'painting' : 'decor'} first` : titles[head.from],
    );
    const row = el('div', 'task-row');
    row.appendChild(tileCard(tile));
    const side = el('div', 'task-side');
    row.appendChild(side);
    box.appendChild(row);
    const acts = el('div', 'pr-actions');
    let placing = false;
    const fits = usingAssistant ? opt.assistantFits : opt.headFits;
    if (fits) {
      this.infoLine(this.foot(box));
      this.foot(box).appendChild(acts);
      const which = usingAssistant ? 'assistant' : 'new';
      const commit = (sp: Spot) => this.send({ type: 'hang', which, x: sp.x, y: sp.y });
      this.commitHandler = commit;
      this.pinnedActions(acts);
      this.place(v, p, tile, legalSpots(grid, tile.w, tile.h), 'place', commit);
      placing = true;
    } else {
      side.appendChild(el('div', 'warn', `${icon('close')} ${tile.kind === 'painting' ? 'This painting' : 'This decor'} does not fit anywhere on your wall.`));
      this.foot(box).appendChild(acts);
    }
    if (!usingAssistant) {
      if (opt.canAssist) acts.appendChild(this.button(`${icon('assistant')} Give to my assistant`, fits ? 'ghost' : 'primary', () => this.send({ type: 'assist' })));
      if (opt.canHangAssistant && p.assistant)
        acts.appendChild(
          this.button(`Hang my assistant's ${esc(tileName(p.assistant))} first`, 'ghost', () => {
            L.which = 'assistant';
            this.host.unpin();
            this.rerender();
          }),
        );
      if (!fits && head.tile.kind === 'painting' && head.from === 'auction') {
        if (opt.exchange.length) {
          const ex = el('div', 'exchange', `<div class="ex-title">${icon('swap')} Or swap it for a ${esc(GENRE_INFO[head.tile.genre].name)} from the museum that fits:</div>`);
          const list = el('div', 'ex-list');
          for (const m of opt.exchange) list.appendChild(tileCard(m, { compact: true, onClick: L.pending ? undefined : () => this.send({ type: 'exchange', museum: m.id }) }));
          ex.appendChild(list);
          box.appendChild(ex);
        } else if (!opt.canAssist && !opt.canExcess) {
          side.appendChild(el('div', 'pr-hint', 'Hang your assistant\u2019s tile to make room, then hand this one over.'));
        }
        if (opt.canExcess)
          acts.appendChild(this.button(`${icon('box')} Store as excess (\u2212${RULES.excessPenalty})`, opt.canAssist ? 'ghost danger' : 'primary danger', () => this.send({ type: 'excess' })));
        if (!opt.exchange.length && !opt.canExcess && opt.canAssist) side.appendChild(el('div', 'pr-hint', `No ${esc(GENRE_INFO[head.tile.genre].name)} in the museum fits either.`));
      }
      if (opt.canDiscard) acts.appendChild(this.button('Put it back', 'ghost', () => this.send({ type: 'discard' })));
    } else {
      acts.appendChild(
        this.button('Back to the new tile', 'ghost', () => {
          L.which = 'new';
          this.host.unpin();
          this.rerender();
        }),
      );
    }
    if (head.tile.kind === 'painting' && !usingAssistant) side.prepend(el('div', 'pr-hint tight', `${genreTag(head.tile.genre)} Avoid touching another ${esc(GENRE_INFO[head.tile.genre].name)}. Match its frame for decor.`));
    this.movesHint(box, opt.moves, p);
    return placing;
  }

  /** Moving a tile hung this round to another spot on the wall. */
  private renderMove(v: GameView, p: PlayerView, id: string, moves: string[]): boolean {
    const h = p.wall.find((x) => x.tile.id === id)!;
    const t = h.tile;
    const box = this.box(
      'task',
      `${icon('swap')} Rearranging`,
      t.kind === 'painting' ? `Move \u201c${esc(t.title)}\u201d` : `Move the ${esc(DECOR_INFO[t.shape].name.toLowerCase())}`,
      t.kind === 'painting' ? 'A move never earns decor, even beside a matching frame.' : '',
    );
    const row = el('div', 'task-row');
    row.appendChild(tileCard(t));
    box.appendChild(row);
    this.infoLine(this.foot(box));
    const acts = el('div', 'pr-actions');
    this.foot(box).appendChild(acts);
    const commit = (sp: Spot) => this.send({ type: 'move', tile: id, x: sp.x, y: sp.y });
    this.commitHandler = commit;
    this.pinnedActions(acts, 'Move here');
    acts.appendChild(this.button('Cancel', 'ghost', () => this.cancelMove()));
    // Another of this round's tiles can be picked up instead.
    this.movableIds = moves.filter((m) => m !== id);
    this.place(v, p, t, moveSpots(p.wall, id), 'place', commit, { onCancel: () => this.cancelMove() });
    return true;
  }
}

/** The score if the evening ended now, as the wall is and with a tile at the spot under the pointer. */
function scoreChip(v: GameView, p: PlayerView, after: Hung[]): string {
  const rank = ranking(v.prestige);
  const was = scoreWall({ id: p.id, wall: p.wall, excess: p.excess, hand: null }, rank).total;
  const now = scoreWall({ id: p.id, wall: after, excess: p.excess, hand: null }, rank).total;
  const d = now - was;
  const tip = `Your score if the evening ended now: ${was} as your wall is, ${now} with it here${d ? ` (${d > 0 ? '+' : ''}${d})` : ''}`;
  return `<span class="chip score ${d > 0 ? 'good' : d < 0 ? 'bad' : ''}" title="${tip}">${icon('laurel')} ${was} \u2192 <b>${now}</b></span>`;
}
