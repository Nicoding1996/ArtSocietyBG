import { DECOR_INFO, GENRE_INFO, RULES } from '../../shared/content';
import { ranking, scoreWall } from '../../shared/scoring';
import { DECOR_SHAPES, type GameView, type PlayerView } from '../../shared/types';
import { emptyCells, gridOf } from '../../shared/wall';
import type { ChatPanel } from './chat';
import { el, esc, renderIf } from './dom';
import { icon } from './icons';
import { disc, dot, genreTag, tileThumb } from './parts';

export interface HudHandlers {
  onHelp(): void;
  onLeave(): void;
  onToggle(what: 'sfx' | 'music' | 'camera'): void;
  onView(what: 'table' | 'mine' | { pid: string }): void;
  onTile(pid: string, tileId: string): void;
  toggles(): { sfx: boolean; music: boolean; camera: boolean };
}

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

/** What a player is doing right now, for their card. */
export function playerStatus(v: GameView, p: PlayerView): { text: string; busy: boolean } {
  const ph = v.phase;
  switch (ph.kind) {
    case 'setup':
      return p.starter ? { text: 'Hanging a starting painting\u2026', busy: true } : { text: 'Ready', busy: false };
    case 'select':
      return v.players[v.auctioneer].id === p.id ? { text: 'Choosing paintings\u2026', busy: true } : { text: '', busy: false };
    case 'bid':
      return p.hasBid ? { text: 'Bid sealed', busy: false } : { text: 'Thinking about a bid\u2026', busy: true };
    case 'acquire': {
      const i = ph.order.indexOf(p.id);
      const bid = ph.bids[p.id];
      if (p.task) return { text: `Hanging (bid ${bid})\u2026`, busy: true };
      if (ph.order[ph.next] === p.id) return { text: `Choosing a painting (bid ${bid})\u2026`, busy: true };
      if (i >= ph.next) return { text: `Picks ${ordinal(i + 1)} (bid ${bid})`, busy: false };
      return { text: `Done (bid ${bid})`, busy: false };
    }
    case 'over':
      return { text: '', busy: false };
  }
}

export class Hud {
  readonly root = el('div', 'hud');
  private top = el('div', 'topbar');
  private players = el('div', 'players');
  private side = el('div', 'side');
  private museum = el('div', 'museum panel');
  readonly promptSlot = el('div', 'prompt-slot');
  private docked = false;

  constructor(
    private h: HudHandlers,
    private chat: ChatPanel,
  ) {
    this.side.append(this.museum, chat.root);
    this.root.append(this.top, this.players, this.side, this.promptSlot);
  }

  /**
   * While you hang tiles the prompt moves into the right-hand column (in place of the chat), so your
   * wall can fill the whole height of the screen.
   */
  setDocked(on: boolean) {
    if (on === this.docked) return;
    this.docked = on;
    this.root.classList.toggle('docked', on);
    if (on) this.side.insertBefore(this.promptSlot, this.chat.root);
    else {
      this.root.appendChild(this.promptSlot);
      this.chat.showLatest();
    }
  }

  get isDocked() {
    return this.docked;
  }

  render(v: GameView, me: string | null, view: string) {
    this.renderTop(v, me, view);
    this.renderPlayers(v, me, view);
    this.renderMuseum(v);
  }

  refreshToggles() {
    this.top.dataset.sig = '';
  }

  private renderTop(v: GameView, me: string | null, view: string) {
    const t = this.h.toggles();
    const ph = v.phase;
    const auct = v.players[v.auctioneer];
    let status: string;
    switch (ph.kind) {
      case 'setup':
        status = 'Everyone hangs a starting painting over a star';
        break;
      case 'select':
        status = auct.id === me ? `<b class="you">${icon('gavel')} You hold the gavel</b>: choose ${v.players.length + 1} paintings` : `${dot(auct.color)} <b>${esc(auct.name)}</b>&nbsp;is choosing the paintings`;
        break;
      case 'bid': {
        const done = v.players.filter((p) => p.hasBid).length;
        status = `${icon('cards')} Secret bids \u00b7 ${done}/${v.players.length} sealed`;
        break;
      }
      case 'acquire': {
        const picker = v.players.find((p) => p.id === ph.order[ph.next]);
        status = picker ? (picker.id === me ? '<b class="you">Your pick!</b>' : `${dot(picker.color)} <b>${esc(picker.name)}</b>&nbsp;is choosing`) : 'Hanging the paintings';
        break;
      }
      case 'over':
        status = 'The evening is over';
        break;
    }
    const final = !!v.end && ph.kind !== 'over';
    const sig = JSON.stringify([v.round, status, t, view, final, me]);
    renderIf(this.top, sig, () => {
      this.top.innerHTML = `
        <div class="tb-left"><span class="logo">Art Society</span><span class="round ${final ? 'final' : ''}">${ph.kind === 'setup' ? 'Setting up' : final ? `Final round \u00b7 ${v.round}` : `Round ${v.round}`}</span></div>
        <div class="tb-center">${status}</div>
        <div class="tb-right">
          <div class="seg views">
            <button class="seg-btn ${view === 'table' ? 'on' : ''}" data-v="table" title="Look at the auction table">${icon('table')}<span>Table</span></button>
            ${me ? `<button class="seg-btn ${view === me ? 'on' : ''}" data-v="mine" title="Look at your wall">${icon('wall')}<span>My wall</span></button>` : ''}
          </div>
          <button class="icon-btn ${t.camera ? 'on' : ''}" data-a="camera" title="Camera follows the action">${icon('camera')}</button>
          <button class="icon-btn" data-a="help" title="How to play">${icon('help')}</button>
          <button class="icon-btn ${t.sfx ? 'on' : ''}" data-a="sfx" title="Sound effects">${icon(t.sfx ? 'sound' : 'mute')}</button>
          <button class="icon-btn ${t.music ? 'on' : ''}" data-a="music" title="Music">${icon('music')}</button>
          <button class="icon-btn" data-a="leave" title="Leave the game">${icon('flag')}</button>
        </div>`;
      this.top.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) =>
        b.addEventListener('click', () => {
          const a = b.dataset.a!;
          if (a === 'help') this.h.onHelp();
          else if (a === 'leave') this.h.onLeave();
          else this.h.onToggle(a as 'sfx' | 'music' | 'camera');
        }),
      );
      this.top.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => b.addEventListener('click', () => this.h.onView(b.dataset.v as 'table' | 'mine')));
    });
  }

  private renderPlayers(v: GameView, me: string | null, view: string) {
    const rank = ranking(v.prestige);
    const sig = JSON.stringify([
      v.players.map((p) => [p.id, p.name, p.color, p.connected, p.stackTop, p.stackCount, p.handCount, p.hasBid, p.wall.length, p.assistant?.id, p.excess.length, !!p.task, !!p.starter]),
      v.phase,
      v.prestige,
      v.auctioneer,
      me,
      view,
    ]);
    renderIf(this.players, sig, () => {
      this.players.innerHTML = '';
      for (const p of v.players) {
        const st = playerStatus(v, p);
        const score = scoreWall({ id: p.id, wall: p.wall, excess: p.excess, hand: null }, rank).total;
        const filled = RULES.wallW * RULES.wallH - emptyCells(gridOf(p.wall));
        const pct = Math.round((filled / (RULES.wallW * RULES.wallH)) * 100);
        const card = el('div', `pc ${st.busy ? 'busy' : ''} ${p.id === me ? 'me' : ''} ${p.connected ? '' : 'away'} ${view === p.id ? 'viewing' : ''}`);
        card.style.setProperty('--pc', p.color);
        card.title = `Look at ${p.name}'s wall`;
        card.innerHTML = `
          <div class="pc-head">
            <span class="pc-pawn">${icon(p.hat)}</span>
            <span class="pc-name">${esc(p.name)}</span>
            ${v.players[v.auctioneer].id === p.id && v.phase.kind !== 'over' ? `<span class="tag gavel" title="Auctioneer this round">${icon('gavel')}</span>` : ''}
            ${p.id === me ? '<span class="tag">You</span>' : ''}
            ${p.isBot ? `<span class="tag bot" title="Bot">${icon('bot')}</span>` : ''}
            ${!p.connected && !p.isBot ? `<span class="tag away" title="Disconnected: the autopilot plays for now">${icon('offline')}</span>` : ''}
            <span class="pc-score" title="Score if the evening ended now">${icon('laurel')}<b>${score}</b></span>
          </div>
          <div class="pc-res">
            <span class="res" title="Top of the bidding stack (breaks ties)">${disc(p.stackTop, p.color, 'tiny')}</span>
            <span class="res" title="Bid cards left">${icon('cards')}<b>${p.handCount}</b></span>
            <span class="res" title="Wall covered">${icon('wall')}<b>${pct}%</b></span>
            ${p.excess.length ? `<span class="res bad" title="Excess paintings, \u2212${RULES.excessPenalty} each">${icon('box')}<b>${p.excess.length}</b></span>` : ''}
            <span class="res assist" title="${p.assistant ? 'The assistant is holding a tile' : 'The assistant is free'}">${icon('assistant')}</span>
          </div>
          ${st.text ? `<div class="pc-status ${st.busy ? 'busy' : ''}">${esc(st.text)}</div>` : ''}`;
        if (p.assistant) {
          const th = tileThumb(p.assistant, 'mini', 34, 22);
          th.title = "The assistant's tile";
          card.querySelector('.res.assist')!.appendChild(th);
        }
        card.addEventListener('click', () => this.h.onView({ pid: p.id }));
        this.players.appendChild(card);
      }
    });
  }

  private renderMuseum(v: GameView) {
    const rank = ranking(v.prestige);
    const sig = JSON.stringify([v.prestige, Object.values(v.museum).map((m) => m.length), v.supplyTotal, v.decor, v.end]);
    renderIf(this.museum, sig, () => {
      const rows = rank.order
        .map((g) => {
          const info = GENRE_INFO[g];
          const m = rank.multipliers[g];
          const width = Math.min(100, (v.prestige[g] / Math.max(10, ...Object.values(v.prestige))) * 100);
          return `<div class="mu-row" style="--gc:${info.color}" title="${esc(info.name)}: prestige ${v.prestige[g]}, ${v.museum[g].length} in the museum">
            ${genreTag(g)}
            <span class="mu-bar"><i style="width:${width}%"></i></span>
            <b class="mu-val">${v.prestige[g]}</b>
            <span class="mu-mult">\u00d7${m}</span>
          </div>`;
        })
        .join('');
      const decorLeft = DECOR_SHAPES.map((s) => `${DECOR_INFO[s].name} ${v.decor[s]}`).join(' \u00b7 ');
      this.museum.innerHTML = `
        <div class="panel-title">${icon('hall')} The Museum <small>prestige \u00b7 multiplier now</small></div>
        ${rows}
        <div class="mu-foot"><span title="${esc(decorLeft)}">${icon('frame')} ${v.supplyTotal} paintings left in the supply</span></div>
        ${v.end && v.phase.kind !== 'over' ? `<div class="mu-end">${icon('flag')} Final round: ${esc(endText(v))}</div>` : ''}`;
    });
  }
}

export function endText(v: GameView): string {
  const who = v.players.find((p) => p.id === v.end?.pid)?.name ?? '';
  switch (v.end?.reason) {
    case 'full':
      return `${who}'s wall is complete.`;
    case 'excess':
      return `${who} stored a second excess painting.`;
    case 'cards':
      return 'the last bid cards have been played.';
    case 'supply':
      return 'the supply is nearly empty.';
    default:
      return '';
  }
}
