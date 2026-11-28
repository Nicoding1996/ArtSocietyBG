import { DECOR_INFO, RULES } from '../../shared/content';
import { ranking } from '../../shared/scoring';
import { DECOR_SHAPES, type GameView, type Genre, type PlayerView } from '../../shared/types';
import { typeInfo } from '../theme';
import type { ChatPanel } from './chat';
import { el, esc, ordinal, renderIf } from './dom';
import { icon } from './icons';
import { disc, dot, genreTag, tileThumb } from './parts';
import { WallPeek, miniWall, scoreNow } from './viewers';

export interface HudHandlers {
  onHelp(): void;
  onLeave(): void;
  onToggle(what: 'sfx' | 'music' | 'camera'): void;
  onView(what: 'table' | 'mine' | { pid: string }): void;
  onGalleries(): void;
  onMuseum(genre?: Genre): void;
  onPause(): void;
  /** The host lets a bot play a disconnected player's seat until they are back. */
  onHandOver(pid: string): void;
  onTile(pid: string, tileId: string): void;
  toggles(): { sfx: boolean; music: boolean; camera: boolean };
}

export interface HudOpts {
  /** This player is the host. */
  host: boolean;
  /** Only bots share the table, so the game may pause. */
  canPause: boolean;
}

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
  /** The large wall beside a player card under the pointer. */
  private peek = new WallPeek();
  private last: { v: GameView; me: string | null } | null = null;

  constructor(
    private h: HudHandlers,
    private chat: ChatPanel,
  ) {
    this.side.append(this.museum, chat.root);
    this.root.append(this.top, this.players, this.side, this.promptSlot, this.peek.root);
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

  render(v: GameView, me: string | null, view: string, opts: HudOpts) {
    this.last = { v, me };
    this.renderTop(v, me, view, opts);
    this.renderPlayers(v, me, view, opts);
    this.renderMuseum(v);
  }

  /** Shows the large version of a player's wall beside their card (or hides it). */
  private peekAt(pid: string | null) {
    const card = pid ? this.players.querySelector<HTMLElement>(`.pc[data-pid="${CSS.escape(pid)}"]`) : null;
    const p = this.last?.v.players.find((x) => x.id === pid);
    if (!card || !p || !this.last) return this.peek.hide();
    this.peek.show(this.last.v, p, this.last.me, card.getBoundingClientRect());
  }

  refreshToggles() {
    this.top.dataset.sig = '';
  }

  private renderTop(v: GameView, me: string | null, view: string, opts: HudOpts) {
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
    const sig = JSON.stringify([v.round, status, t, view, final, me, opts.canPause]);
    renderIf(this.top, sig, () => {
      this.top.innerHTML = `
        <div class="tb-left"><span class="logo">Art Society</span><span class="round ${final ? 'final' : ''}">${ph.kind === 'setup' ? 'Setting up' : final ? `Final round \u00b7 ${v.round}` : `Round ${v.round}`}</span></div>
        <div class="tb-center">${status}</div>
        <div class="tb-right">
          <div class="seg views">
            <button class="seg-btn ${view === 'table' ? 'on' : ''}" data-v="table" title="Look at the auction table (T)">${icon('table')}<span>Table</span></button>
            ${me ? `<button class="seg-btn ${view === me ? 'on' : ''}" data-v="mine" title="Look at your wall (M)">${icon('wall')}<span>My wall</span></button>` : ''}
            <button class="seg-btn" data-g="1" title="Every wall side by side (G). Keys 1\u2013${v.players.length} look at each player's wall.">${icon('galleries')}<span>Galleries</span></button>
          </div>
          ${opts.canPause ? `<button class="icon-btn" data-a="pause" title="Pause (Esc)">${icon('pause')}</button>` : ''}
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
          else if (a === 'pause') this.h.onPause();
          else this.h.onToggle(a as 'sfx' | 'music' | 'camera');
        }),
      );
      this.top.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => b.addEventListener('click', () => this.h.onView(b.dataset.v as 'table' | 'mine')));
      this.top.querySelector('[data-g]')?.addEventListener('click', () => this.h.onGalleries());
    });
  }

  private renderPlayers(v: GameView, me: string | null, view: string, opts: HudOpts) {
    const sig = JSON.stringify([
      v.players.map((p) => [p.id, p.name, p.color, p.connected, !!p.autopilot, p.stackTop, p.stackCount, p.handCount, p.hasBid, p.wall.length, p.assistant?.id, p.excess.length, !!p.task, !!p.starter]),
      v.phase,
      v.prestige,
      v.auctioneer,
      me,
      view,
      opts.host,
    ]);
    renderIf(this.players, sig, () => {
      this.players.innerHTML = '';
      v.players.forEach((p, i) => {
        const st = playerStatus(v, p);
        const card = el('div', `pc ${st.busy ? 'busy' : ''} ${p.id === me ? 'me' : ''} ${p.connected ? '' : 'away'} ${view === p.id ? 'viewing' : ''}`);
        card.style.setProperty('--pc', p.color);
        card.dataset.pid = p.id;
        card.setAttribute('aria-label', `Look at ${p.name}'s wall (key ${i + 1})`);
        card.innerHTML = `
          <div class="pc-head">
            <span class="pc-pawn">${icon(p.hat)}</span>
            <span class="pc-name">${esc(p.name)}</span>
            ${v.players[v.auctioneer].id === p.id && v.phase.kind !== 'over' ? `<span class="tag gavel" title="Auctioneer this round">${icon('gavel')}</span>` : ''}
            ${p.id === me ? '<span class="tag">You</span>' : ''}
            ${p.isBot ? `<span class="tag bot" title="Bot">${icon('bot')}</span>` : ''}
            ${!p.connected && !p.isBot ? `<span class="tag away" title="${p.autopilot ? 'Away: a bot plays for them until they are back' : 'Disconnected: the game waits for them'}">${icon('offline')}</span>` : ''}
            <span class="pc-score" title="Score if the evening ended now">${icon('laurel')}<b>${scoreNow(v, p)}</b></span>
          </div>
          <div class="pc-body">
            <div class="pc-main">
              <div class="pc-res">
                <span class="res" title="Top of the bidding stack (breaks ties)">${disc(p.stackTop, p.color, 'tiny')}</span>
                <span class="res" title="Bid cards left">${icon('cards')}<b>${p.handCount}</b></span>
                ${p.excess.length ? `<span class="res bad" title="Excess paintings, \u2212${RULES.excessPenalty} each">${icon('box')}<b>${p.excess.length}</b></span>` : ''}
                <span class="res assist" title="${p.assistant ? 'The assistant is holding a tile' : 'The assistant is free'}">${icon('assistant')}</span>
              </div>
              ${st.text ? `<div class="pc-status ${st.busy ? 'busy' : ''}">${esc(st.text)}</div>` : ''}
            </div>
            <div class="pc-mini"></div>
          </div>
          ${awayLine(p, me, opts.host)}`;
        card.querySelector('.pc-hand')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.h.onHandOver(p.id);
        });
        card.querySelector('.pc-mini')!.appendChild(miniWall(p));
        if (p.assistant) {
          const th = tileThumb(p.assistant, 'mini', 34, 22);
          th.title = "The assistant's tile";
          card.querySelector('.res.assist')!.appendChild(th);
        }
        card.addEventListener('click', () => {
          this.peek.hide();
          this.h.onView({ pid: p.id });
        });
        card.addEventListener('mouseenter', () => this.peekAt(p.id));
        card.addEventListener('mouseleave', () => this.peek.hide());
        this.players.appendChild(card);
      });
      // The cards were rebuilt under the pointer: keep the large wall current.
      const open = this.peek.showing;
      if (open) this.peekAt(this.players.querySelector(`.pc[data-pid="${CSS.escape(open)}"]`)?.matches(':hover') ? open : null);
    });
  }

  private renderMuseum(v: GameView) {
    const rank = ranking(v.prestige);
    const sig = JSON.stringify([v.prestige, Object.values(v.museum).map((m) => m.length), v.supplyTotal, v.decor, v.end]);
    renderIf(this.museum, sig, () => {
      const rows = rank.order
        .map((g) => {
          const info = typeInfo(g);
          const m = rank.multipliers[g];
          const width = Math.min(100, (v.prestige[g] / Math.max(10, ...Object.values(v.prestige))) * 100);
          const n = v.museum[g].length;
          return `<div class="mu-row" data-g="${g}" tabindex="0" role="button" style="--gc:${info.color}" title="${esc(info.name)}: prestige ${v.prestige[g]}, \u00d7${m} if the evening ended now. The museum has ${n} ${esc(info.name)} painting${n === 1 ? '' : 's'}: click to see them.">
            ${genreTag(g)}
            <span class="mu-bar"><i style="width:${width}%"></i></span>
            <span class="mu-pile ${n ? '' : 'none'}">${icon('frame')}${n}</span>
            <b class="mu-val">${v.prestige[g]}</b>
            <span class="mu-mult">\u00d7${m}</span>
          </div>`;
        })
        .join('');
      const decorLeft = DECOR_SHAPES.map((s) => `${DECOR_INFO[s].name} ${v.decor[s]}`).join(' \u00b7 ');
      const inMuseum = Object.values(v.museum).reduce((a, m) => a + m.length, 0);
      this.museum.innerHTML = `
        <div class="panel-title">${icon('hall')} The Museum <small>prestige \u00b7 multiplier now</small></div>
        ${rows}
        <div class="mu-foot"><span title="Paintings left in the supply. Decor left: ${esc(decorLeft)}">${icon('frame')} ${v.supplyTotal} in the supply</span><button class="mu-open" title="See the paintings in the museum">${icon('eye')} Paintings (${inMuseum})</button></div>
        ${v.end && v.phase.kind !== 'over' ? `<div class="mu-end">${icon('flag')} Final round: ${esc(endText(v))}</div>` : ''}`;
      this.museum.querySelectorAll<HTMLElement>('.mu-row').forEach((r) => {
        const open = () => this.h.onMuseum(r.dataset.g as Genre);
        r.addEventListener('click', open);
        r.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          open();
        });
      });
      this.museum.querySelector('.mu-open')?.addEventListener('click', () => this.h.onMuseum());
    });
  }
}

/** The card line of a human who is not at the table, or whose seat a bot plays for now. */
function awayLine(p: PlayerView, me: string | null, host: boolean): string {
  if (p.isBot) return '';
  if (!p.connected) {
    if (p.autopilot) return `<div class="pc-away bot" title="They left or are away. They get their seat back when they return.">${icon('bot')} Away: a bot plays for them</div>`;
    const button = host && p.id !== me ? `<button class="pc-hand" title="A bot plays their seat until they reconnect">${icon('bot')} Let a bot play</button>` : '';
    return `<div class="pc-away wait" title="The game waits for them whenever it is their turn">${icon('offline')} Disconnected: the game waits${button}</div>`;
  }
  if (p.autopilot) return `<div class="pc-away bot">${icon('bot')} ${p.id === me ? 'The autopilot plays for you. Click to take over.' : 'Idle: the autopilot plays for now'}</div>`;
  return '';
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
