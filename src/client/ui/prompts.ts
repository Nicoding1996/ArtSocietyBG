import { DECOR_INFO, GENRE_INFO, PAINTING_SIZES, RULES, sizeKey } from '../../shared/content';
import { taskOptions } from '../../shared/options';
import type { Action, DecorShape, GameView, PlayerView, Tile } from '../../shared/types';
import { cornersCovered, coversStar, gridOf, legalSpots, matchingFrames, overlapsEyeline, sameGenre, starterSpots } from '../../shared/wall';
import { el, esc, renderIf } from './dom';
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
}

export interface PromptHost {
  act(a: Action): void;
  place(req: PlaceRequest): void;
  stopPlace(): void;
  pinned(): Spot | null;
  unpin(): void;
  marks(matches: string[], faux: string[]): void;
  /** Looks at your own wall (used when you start choosing a painting). */
  lookAtMyWall(): void;
}

interface Local {
  key: string;
  sizes: string[];
  bid: number | null;
  lot: string | null;
  which: 'new' | 'assistant';
  decor: DecorShape[];
  pending: boolean;
}

const fresh = (key: string): Local => ({ key, sizes: [], bid: null, lot: null, which: 'new', decor: [], pending: false });

export class Prompts {
  readonly root = el('div', 'prompt');
  private local: Local = fresh('');
  private view: GameView | null = null;
  private me: string | null = null;
  private info: HTMLElement | null = null;

  constructor(private host: PromptHost) {}

  /** The server rejected the last action: let the player try again. */
  unlock() {
    this.local.pending = false;
    this.rerender();
  }

  hide() {
    this.root.innerHTML = '';
    this.root.dataset.sig = '';
    this.root.className = 'prompt';
    this.host.stopPlace();
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
    const taskSig = p ? JSON.stringify([p.task, p.assistant?.id, p.starter?.id, p.wall.length]) : '';
    const key = `${ph.kind}:${v.round}:${taskSig}:${ph.kind === 'acquire' ? ph.next : ''}`;
    if (key !== this.local.key) this.local = fresh(key);
    if (!p || ph.kind === 'over') return this.hide();
    const L = this.local;
    const sig = JSON.stringify([key, L, this.host.pinned(), v.players.map((x) => [x.hasBid, !!x.task, !!x.starter]), v.supply, v.museum.city.length + v.museum.portrait.length + v.museum.still.length + v.museum.landscape.length]);
    renderIf(this.root, sig, () => {
      this.root.className = `prompt ${L.pending ? 'pending' : ''}`;
      this.root.innerHTML = '';
      this.info = null;
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
      if (this.animatedKey === key) this.root.querySelectorAll('.pr-box').forEach((b) => b.classList.add('still'));
      this.animatedKey = key;
    });
  }

  // ---------- helpers ----------

  private box(cls: string, kicker: string, title: string, hint = ''): HTMLElement {
    const b = el('div', `pr-box ${cls}`, `${kicker ? `<div class="pr-kicker">${kicker}</div>` : ''}<div class="pr-title">${title}</div>${hint ? `<div class="pr-hint">${hint}</div>` : ''}`);
    this.root.appendChild(b);
    return b;
  }

  private button(label: string, cls: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const b = el('button', `btn ${cls}`, label);
    if (disabled || this.local.pending) b.disabled = true;
    b.addEventListener('click', onClick);
    return b;
  }

  /** Placement on my own wall with live feedback about the spot under the pointer. */
  private place(v: GameView, p: PlayerView, tile: Tile, spots: Spot[], mode: 'place' | 'preview', commit: (s: Spot) => void) {
    if (this.local.pending) return;
    this.host.place({
      tile,
      spots,
      mode,
      onHover: (s) => this.showSpotInfo(v, p, tile, s),
      onPin: () => this.rerender(),
      onCommit: (s) => commit(s),
    });
  }

  private showSpotInfo(v: GameView, p: PlayerView, tile: Tile, s: (Spot & { valid: boolean }) | null) {
    if (!this.info) return;
    if (!s) {
      this.info.innerHTML = '';
      this.host.marks([], []);
      return;
    }
    if (!s.valid) {
      this.info.innerHTML = `<span class="chip bad">${icon('close')} Not here: tiles must touch another tile along an edge and stay on empty space</span>`;
      this.host.marks([], []);
      return;
    }
    const chips: string[] = [];
    let matches: string[] = [];
    let faux: string[] = [];
    if (v.phase.kind === 'setup') {
      if (coversStar(tile.w, tile.h, s.x, s.y)) chips.push(`<span class="chip good">${icon('star')} Covers a star</span>`);
    } else if (tile.kind === 'painting') {
      const grid = gridOf(p.wall);
      matches = matchingFrames(p.wall, grid, tile, s.x, s.y);
      faux = sameGenre(p.wall, grid, tile, s.x, s.y);
      if (matches.length) chips.push(`<span class="chip gold">${icon('frame')} ${matches.length} matching frame${matches.length === 1 ? '' : 's'}: decor worth up to ${matches.length}</span>`);
      if (faux.length) chips.push(`<span class="chip bad">${icon('close')} Faux pas: touches ${faux.length === 1 ? 'another' : faux.length} ${esc(GENRE_INFO[tile.genre].name)}${faux.length === 1 ? '' : 's'}, they won't score</span>`);
      if (overlapsEyeline(s.y, tile.h)) chips.push(`<span class="chip">${icon('eye')} In the eyeline</span>`);
    }
    const corners = cornersCovered(tile.w, tile.h, s.x, s.y);
    if (corners) chips.push(`<span class="chip good">Covers ${corners === 1 ? 'a corner' : `${corners} corners`}</span>`);
    if (!chips.length) chips.push(`<span class="chip">${icon('check')} A fine spot</span>`);
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
      acts.appendChild(this.button('Move', 'ghost', () => this.host.unpin()));
    } else acts.insertAdjacentHTML('afterbegin', `<span class="pr-hint">Point at your wall, click to pin a spot, click it again to hang.</span>`);
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
    this.infoLine(side);
    const acts = el('div', 'pr-actions');
    side.appendChild(acts);
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
    box.appendChild(acts);
  }

  /** Lot cards with hints about whether they fit on my wall. */
  private lotRow(v: GameView, p: PlayerView, onPick?: (id: string) => void): HTMLElement {
    const row = el('div', 'lots');
    const grid = gridOf(p.wall);
    for (const lot of v.lots) {
      const spots = legalSpots(grid, lot.w, lot.h);
      const fit = spots.length ? `<span class="fit ok">${icon('check')} fits</span>` : `<span class="fit no">${icon('close')} no room</span>`;
      const card = tileCard(lot, {
        compact: true,
        cls: `${this.local.lot === lot.id ? 'selected' : ''}`,
        footer: fit,
        onClick: onPick && !this.local.pending ? () => onPick(lot.id) : undefined,
      });
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
    box.appendChild(hand);
    const acts = el('div', 'pr-actions');
    acts.appendChild(this.button(L.bid ? `Seal my bid of ${L.bid}` : 'Choose a card', 'primary', () => L.bid && this.send({ type: 'bid', card: L.bid }), !L.bid));
    box.appendChild(acts);
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
      strip.appendChild(el('div', `ord ${state} ${x.id === this.me ? 'me' : ''}`, `${disc(ph.bids[pid], x.color, 'small')}<span>${esc(x.name)}</span>${label}`));
    });
    return strip;
  }

  private renderAcquire(v: GameView, p: PlayerView): boolean {
    const ph = v.phase;
    if (ph.kind !== 'acquire') return false;
    const L = this.local;
    if (p.task) return this.renderTask(v, p);
    if (ph.order[ph.next] === p.id) {
      const box = this.box('wide', 'Your pick', 'Choose a painting', 'Click one to try it on your wall, then take it.');
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
        this.infoLine(box);
        if (!spots.length) this.info!.innerHTML = `<span class="chip bad">${icon('close')} It does not fit on your wall right now</span>`;
        this.place(v, p, lot, spots, 'preview', () => undefined);
        acts.appendChild(this.button(`Take \u201c${esc(lot.title)}\u201d`, 'primary', () => this.send({ type: 'take', lot: lot.id })));
      } else acts.appendChild(this.button('Choose a painting above', 'primary', () => undefined, true));
      box.appendChild(acts);
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
      const box = this.box(
        'task',
        `${icon('frame')} Matching frames`,
        opt.multi ? `Take decor adding up to ${k} points` : `Take a decor tile worth up to ${k}`,
        'Decor fills awkward gaps and scores its shields at the end. You can hang it now or give it to your assistant.',
      );
      const row = el('div', 'decor-pick');
      const total = L.decor.reduce((s, d) => s + DECOR_INFO[d].points, 0);
      for (const s of opt.decorShapes) {
        const d = DECOR_INFO[s];
        const takenNow = L.decor.filter((x) => x === s).length;
        const left = v.decor[s] - takenNow;
        const fits = legalSpots(grid, d.w, d.h).length > 0;
        const b = el(
          'button',
          'decor-btn',
          `${sizeShape(d.w, d.h, 12)}<span class="dn">${esc(d.name)}</span>${shieldsHtml(d.points)}<span class="dl">${left} left${fits ? '' : ' \u00b7 no room'}</span>`,
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
        box.appendChild(acts);
      }
      return false;
    }

    if (opt.stage === 'finish') {
      const a = p.assistant!;
      const box = this.box('task', `${icon('assistant')} Your assistant`, 'Hang the tile your assistant is holding?', 'Or keep it for a later round. A tile still held at the end scores nothing.');
      const row = el('div', 'task-row');
      row.appendChild(tileCard(a));
      const side = el('div', 'task-side');
      row.appendChild(side);
      box.appendChild(row);
      this.infoLine(side);
      const acts = el('div', 'pr-actions');
      side.appendChild(acts);
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
      this.infoLine(side);
      side.appendChild(acts);
      const which = usingAssistant ? 'assistant' : 'new';
      const commit = (sp: Spot) => this.send({ type: 'hang', which, x: sp.x, y: sp.y });
      this.commitHandler = commit;
      this.pinnedActions(acts);
      this.place(v, p, tile, legalSpots(grid, tile.w, tile.h), 'place', commit);
      placing = true;
    } else {
      side.appendChild(el('div', 'warn', `${icon('close')} ${tile.kind === 'painting' ? 'This painting' : 'This decor'} does not fit anywhere on your wall.`));
      side.appendChild(acts);
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
    return placing;
  }
}
