import * as THREE from 'three';
import { GENRE_INFO } from '../shared/content';
import { waitingOnView } from '../shared/options';
import type { GameEvent, GameView, Hung, Painting, PlayerView, RoomView, Tile } from '../shared/types';
import type { Audio } from './audio';
import type { Net } from './net';
import { CELL_H } from './three/layout';
import { PILE_SCALE } from './three/table';
import { ASSIST_SCALE, EXCESS_SCALE, STAGE_SCALE } from './three/wall';
import type { World } from './three/world';
import { Ceremony } from './ui/ceremony';
import type { ChatPanel } from './ui/chat';
import { el, esc, sleep } from './ui/dom';
import { Hud, endText } from './ui/hud';
import { icon } from './ui/icons';
import { banner, closeModal, hideCards, lightbox, modal, recap, revealCard, showHelp, tileTooltip, toast, tooltip } from './ui/overlays';
import { Prompts } from './ui/prompts';
import { refreshViewers, showGalleries, showMuseum, viewerOpen } from './ui/viewers';

const CAMERA_KEY = 'artsociety.camera';

interface Shown {
  wall: Hung[];
  queue: Tile[];
  assistant: Tile | null;
  excess: Painting[];
}

/** Plays server updates as animations, then shows the resulting state in the HUD and the 3D salon. */
export class GameScreen {
  readonly root = el('div', 'game-screen');
  private hud: Hud;
  private prompts: Prompts;
  private ceremony: Ceremony;
  private view: GameView | null = null;
  private queue: { view: GameView; events: GameEvent[] }[] = [];
  private busy = false;
  private disposed = false;
  private shown = new Map<string, Shown>();
  private autoCam = localStorage.getItem(CAMERA_KEY) !== 'off';
  private lastNeed = '';
  private insetSig = '';
  private resizeObs: ResizeObserver;
  /** Set while the tab is in the background: when it went and the last chronicle line seen before. */
  private away: { since: number; lastLog: number } | null = null;
  /** Coming back to a pile of updates: they go straight to the screen instead of playing one by one. */
  private catchingUp = false;
  /** The game ended while the tab was hidden; the Gala waits until the player can see it. */
  private galaWaiting = false;
  private room: RoomView | null = null;
  /** The menu (Esc) is open; `pausing` when it paused the game because only bots share the table. */
  private menu: { pausing: boolean } | null = null;
  /** This tab paused the game when it went to the background, and resumes it on coming back. */
  private autoPaused = false;
  /** The pause state this tab last asked the server for, until a room update confirms it. */
  private pauseWish: boolean | null = null;

  constructor(
    private world: World,
    private net: Net,
    private audio: Audio,
    private chat: ChatPanel,
    private me: () => string | null,
    private isHost: () => boolean,
    private onLeave: () => void,
  ) {
    this.prompts = new Prompts({
      act: (action) => {
        this.audio.click();
        this.net.send({ t: 'act', action });
      },
      place: (req) => {
        const me = this.me();
        if (!me) return;
        this.world.startPlacement({
          pid: me,
          tile: req.tile,
          spots: req.spots,
          mode: req.mode,
          onHover: req.onHover,
          onPin: req.onPin,
          onCommit: req.onCommit,
          lift: req.lift,
          onCancel: req.onCancel,
        });
      },
      stopPlace: () => this.world.stopPlacement(),
      pinned: () => this.world.pinnedSpot(),
      unpin: () => this.world.unpin(),
      marks: (m, f) => {
        const me = this.me();
        if (me) this.world.markNeighbours(me, m, f);
      },
      movable: (ids, onPick) => {
        const me = this.me();
        this.world.setMovable(me && ids?.length ? { pid: me, ids, onPick } : null);
      },
      lookAtMyWall: () => {
        const me = this.me();
        if (me && !(this.world.view.kind === 'wall' && this.world.view.pid === me)) this.go({ kind: 'wall', pid: me, tight: true });
        this.refreshHud();
      },
      tryOn: (on) => {
        const me = this.me();
        if (!me) return;
        // The panel docks beside the wall (see needsMyWall), so the bid cards stay in reach.
        this.hud.setDocked(this.needsMyWall());
        this.lastNeed = on ? `wall:${me}` : 'table';
        if (on && !(this.world.view.kind === 'wall' && this.world.view.pid === me)) this.go({ kind: 'wall', pid: me, tight: true });
        else if (!on) this.go({ kind: 'table' });
        else this.syncFold(this.world.view);
        this.measureInsets();
        this.refreshHud();
      },
      unfold: () => {
        const v = this.world.view;
        if (v.kind !== 'wall') return;
        this.unfoldedFor = v.pid;
        this.syncFold(v);
        this.measureInsets();
      },
      museum: (genre) => this.view && showMuseum(this.view, this.me(), genre),
    });
    this.hud = new Hud(
      {
        onHelp: () => showHelp(),
        onLeave: () => this.confirmLeave(),
        onToggle: (what) => this.toggle(what),
        onView: (what) => this.look(what),
        onGalleries: () => this.galleries(),
        onMuseum: (genre) => this.view && showMuseum(this.view, this.me(), genre),
        onPause: () => this.openMenu(),
        onHandOver: (pid) => this.net.send({ t: 'handOver', id: pid }),
        onTile: () => undefined,
        toggles: () => ({ sfx: this.audio.sfxOn, music: this.audio.musicOn, camera: this.autoCam }),
      },
      chat,
    );
    this.hud.promptSlot.appendChild(this.prompts.root);
    this.ceremony = new Ceremony(world, audio, () => this.net.send({ t: 'toLobby' }), isHost);
    this.root.appendChild(this.hud.root);
    this.ceremony.mount(this.root);
    world.onTileHover = (tile, owner, x, y) => tooltip(tile ? tileTooltip(tile, this.player(owner), this.view) : null, x, y);
    world.onTileClick = (tile, owner) => {
      const v = this.view;
      // A painting on one of the museum piles opens the whole museum at that type.
      if (!owner && v && tile.kind === 'painting' && v.museum[tile.genre].some((m) => m.id === tile.id)) showMuseum(v, this.me(), tile.genre);
      else lightbox(tile, this.player(owner), v);
    };
    world.onWallClick = (pid) => {
      this.go({ kind: 'wall', pid, tight: pid === this.me() && this.needsMyWall() });
      this.refreshHud();
    };
    this.resizeObs = new ResizeObserver(() => this.measureInsets());
    this.resizeObs.observe(this.hud.promptSlot);
    this.resizeObs.observe(this.prompts.root);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibility);
    // The game can start while this tab is in the background.
    if (document.hidden) this.onVisibility();
  }

  private onResize = () => this.measureInsets();

  /**
   * Esc: the menu (after closing a window or unpinning a spot, which come first). 1-4: a player's wall,
   * T: the table, M: my wall, G: every wall side by side.
   */
  private onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const v = this.view;
    if (!v || v.phase.kind === 'over' || this.ceremony.started || this.menu) return;
    if (e.key === 'Escape') {
      this.openMenu();
      e.preventDefault();
      return;
    }
    const k = e.key.toLowerCase();
    const n = /^[1-9]$/.test(k) ? Number(k) : 0;
    if (k === 'g') {
      if (viewerOpen('galleries')) closeModal();
      else this.galleries();
    } else if (k === 't' || k === 'm' || (n && n <= v.players.length)) {
      closeModal();
      this.look(k === 't' ? 'table' : k === 'm' ? 'mine' : { pid: v.players[n - 1].id });
    } else return;
    e.preventDefault();
  };

  /** Turns the camera to the table or a wall, as the top bar's buttons, the player cards and the keys ask. */
  private look(what: 'table' | 'mine' | { pid: string }) {
    const me = this.me();
    if (what === 'table') this.go({ kind: 'table' });
    else if (what === 'mine') {
      if (me) this.go({ kind: 'wall', pid: me, tight: this.needsMyWall() });
    } else this.go({ kind: 'wall', pid: what.pid, tight: what.pid === me && this.needsMyWall() });
    this.refreshHud();
  }

  private galleries() {
    if (this.view) showGalleries(this.view, this.me(), (pid) => this.look({ pid }));
  }

  private confirmLeave() {
    if (confirm('Leave this game? A bot will take over your seat.')) this.onLeave();
  }

  private toggle(what: 'sfx' | 'music' | 'camera') {
    if (what === 'sfx') this.audio.setSfx(!this.audio.sfxOn);
    if (what === 'music') this.audio.setMusic(!this.audio.musicOn);
    if (what === 'camera') {
      this.autoCam = !this.autoCam;
      localStorage.setItem(CAMERA_KEY, this.autoCam ? 'on' : 'off');
      this.lastNeed = '';
      if (this.view) this.camera(this.view);
    }
    this.hud.refreshToggles();
    this.refreshHud();
  }

  // ---------- the menu and pausing ----------

  /** Only bots (or players who are not connected) share the table, so the game may pause. */
  private canPause(): boolean {
    const v = this.view;
    const me = this.me();
    if (!v || !me || v.phase.kind === 'over' || !v.players.some((p) => p.id === me)) return false;
    return v.players.every((p) => p.id === me || p.isBot || !p.connected);
  }

  private askPause(on: boolean) {
    this.pauseWish = on;
    this.net.send({ t: 'pause', on });
  }

  /** The Esc menu. Alone with bots it pauses the game until it closes; with other players it does not. */
  private openMenu() {
    if (!this.view || this.view.phase.kind === 'over' || this.disposed) return;
    const pausing = this.canPause();
    if (pausing && !this.room?.paused) this.askPause(true);
    this.menu = { pausing };
    tooltip(null);
    const me = this.me();
    const onlyBots = this.view.players.every((p) => p.id === me || p.isBot);
    const box = el('div', 'game-menu');
    const draw = () => {
      box.innerHTML = `
        <h2>${icon(pausing ? 'pause' : 'menu')} ${pausing ? 'Paused' : 'Menu'}</h2>
        <p class="lead">${
          pausing
            ? onlyBots
              ? 'The bots wait until you resume.'
              : 'Nobody else is at the table right now, so the game waits until you resume.'
            : 'Other collectors are at the table, so the game goes on while this menu is open.'
        }</p>
        <div class="gm-actions">
          <button class="btn primary gm-resume">${icon('play')} ${pausing ? 'Resume' : 'Back to the game'}</button>
          <button class="btn ghost gm-help">${icon('help')} How to play</button>
          <div class="gm-row">
            <button class="btn ghost gm-sfx">${icon(this.audio.sfxOn ? 'sound' : 'mute')} Sound ${this.audio.sfxOn ? 'on' : 'off'}</button>
            <button class="btn ghost gm-music">${icon('music')} Music ${this.audio.musicOn ? 'on' : 'off'}</button>
          </div>
          <button class="btn ghost gm-leave">${icon('flag')} Leave the game</button>
        </div>
        <p class="gm-foot">Esc ${pausing ? 'resumes' : 'closes this menu'}.</p>`;
      box.querySelector('.gm-resume')!.addEventListener('click', () => closeModal());
      // The rules open over the menu, and the menu comes back when they close.
      box.querySelector('.gm-help')!.addEventListener('click', () => showHelp(() => this.openMenu()));
      box.querySelector('.gm-sfx')!.addEventListener('click', () => {
        this.toggle('sfx');
        draw();
      });
      box.querySelector('.gm-music')!.addEventListener('click', () => {
        this.toggle('music');
        draw();
      });
      box.querySelector('.gm-leave')!.addEventListener('click', () => this.confirmLeave());
    };
    draw();
    modal(box, 'menu-back', () => this.menuClosed());
    box.querySelector<HTMLElement>('.gm-resume')?.focus();
  }

  private menuClosed() {
    const m = this.menu;
    this.menu = null;
    if (m?.pausing && !this.disposed) this.askPause(false);
  }

  /** The room changed: a pause began or ended (perhaps from another tab, or because someone came back). */
  roomChanged(room: RoomView) {
    this.room = room;
    // The host may have changed, which decides who can hand a seat to a bot.
    this.refreshHud();
    if (this.pauseWish !== null) {
      // Updates sent before the server saw this tab's last request are out of date.
      if (room.paused !== this.pauseWish) return;
      this.pauseWish = null;
      return;
    }
    if (room.paused && !this.menu && !this.autoPaused && !document.hidden) this.openMenu();
    else if (!room.paused && this.menu?.pausing) {
      this.menu = null;
      closeModal();
      toast('Someone is back at the table, so the game goes on.');
    }
  }

  dispose() {
    this.disposed = true;
    this.resizeObs.disconnect();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKey);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.world.tw.setInstant(false);
    recap(null);
    if (viewerOpen('galleries') || viewerOpen('museum')) closeModal();
    this.prompts.hide();
    this.ceremony.close();
    hideCards();
    tooltip(null);
    this.world.onTileHover = null;
    this.world.onTileClick = null;
    this.world.onWallClick = null;
    this.world.stopPlacement();
    this.world.setMovable(null);
    this.root.remove();
  }

  private player(id: string | null): PlayerView | undefined {
    return id ? this.view?.players.find((p) => p.id === id) : undefined;
  }

  rejected(message: string) {
    // A refused pause leaves the room as it was.
    this.pauseWish = null;
    toast(message, 'error');
    this.audio.error();
    this.prompts.unlock();
  }

  react(pid: string, emoji: string) {
    this.world.floatOverPawn(pid, `<span class="emoji">${esc(emoji)}</span>`, 'react');
  }

  receive(view: GameView, events: GameEvent[]) {
    this.queue.push({ view, events });
    if (!this.busy) void this.process();
  }

  private async process() {
    this.busy = true;
    while (this.queue.length && !this.disposed) {
      const u = this.queue.shift()!;
      // A hidden tab draws nothing, so its updates go straight to the screen; so does the backlog found
      // on coming back (see onVisibility). Otherwise a short backlog plays a little faster to keep up.
      const skip = document.hidden || this.catchingUp;
      const backlog = this.queue.length;
      this.world.tw.speed = skip ? 40 : backlog > 3 ? 8 : backlog > 0 ? 2.5 : 1;
      if (!skip && (this.view || u.events.some((e) => e.t === 'start')) && u.events.length) {
        for (const e of u.events) {
          if (this.disposed) return;
          if (this.catchingUp) break;
          try {
            await this.play(e, u.view);
          } catch (err) {
            console.error('Animation failed', e, err);
          }
        }
      }
      this.apply(u.view);
    }
    this.world.tw.speed = 1;
    this.busy = false;
    if (this.catchingUp) {
      this.catchingUp = false;
      if (!document.hidden) this.welcomeBack();
    }
  }

  private onVisibility = () => {
    if (document.hidden) {
      this.away ??= { since: performance.now(), lastLog: this.view?.log.at(-1)?.id ?? 0 };
      // A hidden tab gets no frames, so the animation in flight would freeze and hold up every update
      // behind it: finish it now and keep the table current while away.
      this.world.tw.setInstant(true);
      if (this.busy) this.catchingUp = true;
      // Alone with bots: they wait while this tab is in the background.
      if (!this.menu && !this.room?.paused && this.canPause()) {
        this.autoPaused = true;
        this.askPause(true);
      }
      return;
    }
    this.world.tw.setInstant(false);
    if (this.autoPaused) {
      this.autoPaused = false;
      if (!this.menu) this.askPause(false);
    }
    if (this.galaWaiting && this.view) {
      this.galaWaiting = false;
      void this.ceremony.play(this.view, this.me());
    }
    if (!this.away) return;
    if (this.busy) {
      // Still on the last animation (its timers run slowly in a background tab): finish it, skip the rest.
      this.catchingUp = true;
      this.world.tw.speed = 40;
      this.world.tw.flush();
    } else this.welcomeBack();
  };

  /** Back in the tab: what happened meanwhile, from the chronicle, in one card. */
  private welcomeBack() {
    const away = this.away;
    this.away = null;
    const v = this.view;
    if (!away || !v || v.phase.kind === 'over' || performance.now() - away.since < 3000) return;
    const missed = v.log.filter((l) => l.id > away.lastLog);
    if (!missed.length) return;
    const colors = new Map(v.players.map((p) => [p.id, p.color]));
    recap(missed.map((l) => ({ text: l.text, kind: l.kind, color: l.pid ? colors.get(l.pid) : undefined })));
  }

  private wait(ms: number) {
    return sleep(ms / this.world.tw.speed);
  }

  private shownOf(pid: string): Shown {
    let s = this.shown.get(pid);
    if (!s) {
      s = { wall: [], queue: [], assistant: null, excess: [] };
      this.shown.set(pid, s);
    }
    return s;
  }

  private syncWall3d(pid: string) {
    const wall = this.world.walls.get(pid);
    const s = this.shown.get(pid);
    if (!wall || !s) return;
    wall.syncWall(s.wall);
    wall.setStaging(s.queue);
    wall.setAssistant(s.assistant);
    wall.setExcess(s.excess);
  }

  private async play(e: GameEvent, next: GameView) {
    const w = this.world;
    const me = this.me();
    const speed = w.tw.speed;
    const name = (pid: string | null) => next.players.find((p) => p.id === pid)?.name ?? '';
    switch (e.t) {
      case 'start':
        w.setDemo(false);
        this.audio.gong();
        this.apply(next);
        await banner('The salon opens', 'Hang your starting painting over a star', 2200 / speed);
        break;
      case 'starter': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall || s.wall.some((h) => h.tile.id === e.tile.id)) break;
        const from = wall.takeStaged(e.tile.id);
        s.queue = s.queue.filter((t) => t.id !== e.tile.id);
        const hung = { tile: e.tile, x: e.x, y: e.y };
        s.wall.push(hung);
        const at = await wall.hangAnimated(hung, from, w.tw);
        w.burst(at, '#ffe7a8', 30, 0.8);
        this.audio.hang();
        break;
      }
      case 'round': {
        const side = w.sideOf(e.auctioneer);
        this.audio.gong();
        void w.table.moveGavel(w.tw, side);
        this.goTable(1000);
        await banner(`Round ${e.round}`, `${name(e.auctioneer)} holds the gavel${e.final ? ' \u00b7 last bid cards!' : ''}`, 1400 / speed, 'small');
        break;
      }
      case 'lots': {
        this.goTable(900);
        this.audio.gavel(1);
        void banner(`${name(e.pid)} puts up ${e.lots.length} paintings`, '', 1500 / speed, 'small');
        await w.table.dealLots(
          w.tw,
          e.lots,
          () => this.audio.click(),
          () => this.audio.paper(),
        );
        break;
      }
      case 'bid':
        if (e.pid !== me) this.audio.click();
        void w.table.dropBid(w.tw, e.pid);
        await this.wait(120);
        break;
      case 'reveal': {
        // Bidding is over: a painting being tried on the wall is put away, and the table shows the bids.
        this.prompts.stopTrying();
        this.audio.drumroll(0.6);
        await this.wait(600);
        for (const p of next.players) void w.table.flipBid(w.tw, p.id, e.bids[p.id], p.stackCount);
        this.audio.paper();
        await revealCard(e.bids, e.order, e.ties, next.players, me, (2300 + e.ties.length * 900) / speed);
        break;
      }
      case 'take': {
        const wall = w.walls.get(e.pid);
        const from = w.table.removeLot(e.tile.id);
        this.audio.paper();
        if (wall && from) await w.fly(e.tile, from, wall.stagingWorld(), { fromScale: 0.42, toScale: STAGE_SCALE, fromQ: w.tableQuat, toQ: w.wallQuat(e.pid), ms: 850 });
        const s = this.shownOf(e.pid);
        if (!s.queue.some((t) => t.id === e.tile.id)) s.queue.push(e.tile);
        wall?.setStaging(s.queue);
        break;
      }
      case 'hang': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall || s.wall.some((h) => h.tile.id === e.tile.id)) break;
        let from: THREE.Vector3 | null;
        let scale = STAGE_SCALE;
        if (e.from === 'assistant') {
          from = wall.takeAssistant();
          s.assistant = null;
          scale = ASSIST_SCALE;
        } else {
          from = wall.takeStaged(e.tile.id);
          s.queue = s.queue.filter((t) => t.id !== e.tile.id);
        }
        const hung = { tile: e.tile, x: e.x, y: e.y };
        s.wall.push(hung);
        if (e.pid === me) w.stopPlacement();
        const at = await wall.hangAnimated(hung, from, w.tw, scale);
        this.audio.hang();
        w.burst(at, e.tile.kind === 'painting' ? GENRE_INFO[e.tile.genre].color : '#ffe7a8', 26, 0.7, 0.12, 0.9);
        if (e.matches.length) {
          wall.flash([...e.matches, e.tile.id], '#ffd76a');
          this.audio.sparkle();
          w.floatAt(at.clone().setY(at.y + e.tile.h * CELL_H * 0.5), `${icon('frame')} ${e.matches.length} matching frame${e.matches.length === 1 ? '' : 's'}`, 'gain');
        }
        if (e.faux.length) {
          wall.flash([...e.faux, e.tile.id], '#ff5a5a', 1.8);
          this.audio.faux();
          w.floatAt(at.clone().setY(at.y + e.tile.h * CELL_H * 0.5 + 0.2), 'Faux pas!', 'bad');
        }
        await this.wait(e.matches.length || e.faux.length ? 420 : 120);
        break;
      }
      case 'assist': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall) break;
        const from = wall.takeStaged(e.tile.id);
        s.queue = s.queue.filter((t) => t.id !== e.tile.id);
        if (e.pid === me) w.stopPlacement();
        if (from) await w.fly(e.tile, from, wall.assistantWorld(), { fromScale: STAGE_SCALE, toScale: ASSIST_SCALE, fromQ: w.wallQuat(e.pid), ms: 650, arc: 0.4 });
        s.assistant = e.tile;
        wall.setAssistant(e.tile);
        this.audio.paper();
        break;
      }
      case 'exchange': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall) break;
        const from = wall.takeStaged(e.gave.id);
        const pile = w.table.pileWorld(e.gave.genre);
        if (from) await w.fly(e.gave, from, pile, { fromScale: STAGE_SCALE, toScale: PILE_SCALE, fromQ: w.wallQuat(e.pid), toQ: w.flatQuat, ms: 800 });
        this.audio.paper();
        await w.fly(e.got, w.table.pileWorld(e.got.genre), wall.stagingWorld(), { fromScale: PILE_SCALE, toScale: STAGE_SCALE, fromQ: w.flatQuat, toQ: w.wallQuat(e.pid), ms: 800 });
        s.queue = s.queue.map((t) => (t.id === e.gave.id ? e.got : t));
        wall.setStaging(s.queue);
        break;
      }
      case 'excess': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall) break;
        const from = wall.takeStaged(e.tile.id);
        s.queue = s.queue.filter((t) => t.id !== e.tile.id);
        if (e.pid === me) w.stopPlacement();
        const to = wall.excessWorld(s.excess.length);
        if (from) await w.fly(e.tile, from, to, { fromScale: STAGE_SCALE, toScale: EXCESS_SCALE, fromQ: w.wallQuat(e.pid), ms: 700, arc: 0.3 });
        s.excess.push(e.tile);
        wall.setExcess(s.excess);
        this.audio.faux();
        w.floatAt(to.clone().setY(1.2), '\u22122 excess', 'bad');
        break;
      }
      case 'decor': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        s.queue = [...e.tiles, ...s.queue.filter((t) => !e.tiles.some((d) => d.id === t.id))];
        wall?.setStaging(s.queue);
        if (wall) w.burst(wall.stagingWorld(), '#ffd76a', 30, 0.6, 0.12, 0.9);
        this.audio.sparkle();
        await this.wait(250);
        break;
      }
      case 'swapDecor': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall) break;
        // The short tiles glow, then make way for the long one that covers the same spaces.
        const gone = new Set(e.removed.map((d) => d.id));
        wall.flash([...gone], '#ffd76a', 0.9);
        this.audio.paper();
        await this.wait(550);
        s.wall = [...s.wall.filter((h) => !gone.has(h.tile.id)), { tile: e.tile, x: e.x, y: e.y }];
        wall.syncWall(s.wall);
        wall.flash([e.tile.id], '#ffd76a');
        const at = wall.cellWorld(e.x, e.y, e.tile.w, e.tile.h);
        w.burst(at, '#ffe7a8', 24, 0.6, 0.12, 0.9);
        this.audio.sparkle();
        w.floatAt(at.clone().setY(at.y + e.tile.h * CELL_H * 0.5), `${icon('swap')} Decor swapped`, 'gain');
        await this.wait(400);
        break;
      }
      case 'discard': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        const at = wall?.takeStaged(e.tile.id);
        s.queue = s.queue.filter((t) => t.id !== e.tile.id);
        if (at) w.burst(at, '#cccccc', 20, 0.4, 0.1, 0.7);
        break;
      }
      case 'move': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        if (!wall || !s.wall.some((h) => h.tile.id === e.tile.id)) break;
        if (e.pid === me) w.stopPlacement();
        s.wall = s.wall.map((h) => (h.tile.id === e.tile.id ? { tile: h.tile, x: e.x, y: e.y } : h));
        const at = await wall.moveAnimated(e.tile.id, e.x, e.y, w.tw);
        this.audio.hang();
        if (at && e.faux.length) {
          wall.flash([...e.faux, e.tile.id], '#ff5a5a', 1.8);
          this.audio.faux();
          w.floatAt(at.clone().setY(at.y + e.tile.h * CELL_H * 0.5 + 0.2), 'Faux pas!', 'bad');
          await this.wait(420);
        }
        break;
      }
      case 'done':
        if (e.pid === me) w.stopPlacement();
        break;
      case 'museum': {
        this.goTable(900);
        const from = w.table.removeLot(e.tile.id) ?? w.table.supplyWorld();
        const to = w.table.pileWorld(e.tile.genre);
        await this.wait(350);
        await w.fly(e.tile, from, to, { fromScale: 0.42, toScale: PILE_SCALE, fromQ: w.tableQuat, toQ: w.flatQuat, ms: 900 });
        w.table.setMuseum(next.museum);
        this.audio.chime();
        w.floatAt(w.table.markerWorld(e.tile.genre).setY(1.5), `${esc(GENRE_INFO[e.tile.genre].name)} +${e.tile.value}`, 'gain');
        await w.table.movePrestige(w.tw, e.tile.genre, e.from, e.to, e.landed, () => this.audio.tick());
        if (e.to !== e.landed) toast(`${GENRE_INFO[e.tile.genre].name} would land on another marker, so it steps back to ${e.to}.`, 'info', 3600);
        await this.wait(300);
        break;
      }
      case 'trigger':
        this.audio.gong();
        await banner('The final round!', endText({ ...next, end: { reason: e.reason, pid: e.pid } }).replace(/^./, (c) => c.toUpperCase()), 2000 / speed, 'final');
        break;
      case 'over':
        w.stopPlacement();
        await banner('The evening is over', 'To the Grand Gala!', 2200 / speed);
        break;
    }
  }

  /** True when the local player is about to place something on their wall, or tries a painting on it while bidding. */
  private needsMyWall(): boolean {
    const v = this.view;
    const me = this.me();
    if (!v || !me) return false;
    const p = v.players.find((x) => x.id === me);
    if (!p) return false;
    if (v.phase.kind === 'setup') return !!p.starter;
    if (v.phase.kind === 'acquire') return !!p.task || v.phase.order[v.phase.next] === me;
    if (v.phase.kind === 'bid') return this.prompts.tryingOn;
    return false;
  }

  /** Turns to the table unless the person is steering the camera themselves (then the next update retries). */
  private goTable(ms: number) {
    if (!this.autoCam || this.world.userBusy() || this.needsMyWall()) return;
    this.lastNeed = 'table';
    this.go({ kind: 'table' }, ms);
  }

  private camera(v: GameView) {
    const me = this.me();
    if (!this.autoCam || v.phase.kind === 'over') return;
    const need = this.needsMyWall() && me ? `wall:${me}` : 'table';
    if (need === this.lastNeed) return;
    if (this.world.userBusy()) return;
    this.lastNeed = need;
    if (need === 'table') this.go({ kind: 'table' });
    else if (me) this.go({ kind: 'wall', pid: me, tight: true });
  }

  /**
   * Turns the camera to the table or a wall. The bottom panel folds first when a wall is coming, so the
   * camera frames the wall in the space that is really free.
   */
  private go(view: { kind: 'table' } | { kind: 'wall'; pid: string; tight: boolean }, ms?: number) {
    if (view.kind !== 'wall' || view.pid !== this.unfoldedFor) this.unfoldedFor = '';
    this.syncFold(view);
    this.measureInsets(false);
    if (view.kind === 'table') void this.world.viewTable(ms);
    else void this.world.viewWall(view.pid, view.tight, ms);
  }

  /** The wall the player opened the folded panel on (it folds again for any other view). */
  private unfoldedFor = '';

  /**
   * While a wall is on screen the bottom panel (bids, the auction) shrinks to one line. `render` false
   * only records the state, for callers that render the panel straight after.
   */
  private syncFold(view: { kind: string; pid?: string }, render = true) {
    const fold = !this.hud.isDocked && view.kind === 'wall' && view.pid !== this.unfoldedFor;
    if (render) this.prompts.setFolded(fold);
    else this.prompts.folded = fold;
  }

  private viewName(): string {
    const v = this.world.view;
    return v.kind === 'wall' ? v.pid : v.kind;
  }

  private refreshHud() {
    if (this.view) this.hud.render(this.view, this.me(), this.viewName(), { host: this.isHost(), canPause: this.canPause() });
  }

  /** Reads how much of the screen the HUD covers; `refresh` re-frames the current view if that changed. */
  private measureInsets(refresh = true) {
    const top = this.hud.root.querySelector('.topbar')?.getBoundingClientRect();
    const left = this.hud.root.querySelector('.players')?.getBoundingClientRect();
    const right = this.hud.root.querySelector('.side')?.getBoundingClientRect();
    const prompt = this.prompts.root.getBoundingClientRect();
    const ins = {
      top: Math.round(top ? top.bottom + 6 : 64),
      left: Math.round(left && left.width ? left.right + 10 : 20),
      right: Math.round(right && right.width ? window.innerWidth - right.left + 10 : 20),
      bottom: Math.round(!this.hud.isDocked && prompt.height ? window.innerHeight - prompt.top + 8 : 18),
    };
    const sig = JSON.stringify(ins);
    if (sig === this.insetSig) return;
    const first = !this.insetSig;
    this.insetSig = sig;
    this.world.insets = ins;
    if (refresh && !first && !this.world.userBusy() && this.world.view.kind !== 'free') this.world.refreshView(450);
  }

  private apply(v: GameView) {
    this.view = v;
    const me = this.me();
    const w = this.world;
    w.setSeats(
      v.players.map((p) => ({ id: p.id, name: p.name, color: p.color, hat: p.hat })),
      me,
    );
    for (const p of v.players) {
      const queue = [...(p.starter ? [p.starter] : []), ...(p.task?.queue.map((q) => q.tile) ?? [])];
      this.shown.set(p.id, { wall: [...p.wall], queue, assistant: p.assistant, excess: [...p.excess] });
      this.syncWall3d(p.id);
    }
    const t = w.table;
    t.setPrestige(v.prestige);
    t.setMuseum(v.museum);
    t.setSupply(v.supplyTotal);
    const lotIds = v.lots.map((l) => l.id);
    if (lotIds.join() !== t.lotIds().join()) {
      if (v.phase.kind === 'bid' || v.phase.kind === 'acquire') t.showLots(v.lots);
      else t.clearLots();
    }
    for (const p of v.players) t.setStack(p.id, p.stackCount, p.stackTop, v.phase.kind === 'bid' && p.hasBid);
    if (v.phase.kind !== 'over' && v.phase.kind !== 'setup') void t.moveGavel(null, w.sideOf(v.players[v.auctioneer].id));
    w.setActive(waitingOnView(v));
    this.chat.setColors(Object.fromEntries(v.players.map((p) => [p.id, p.color])));
    this.chat.setLog(v.log);
    this.hud.render(v, me, this.viewName(), { host: this.isHost(), canPause: this.canPause() });
    this.hud.setDocked(this.needsMyWall());
    this.syncFold(this.world.view, false);
    this.prompts.render(v, me);
    this.measureInsets();
    this.camera(v);
    this.refreshHud();
    // The Gala takes the whole screen; the galleries and museum windows make way for it.
    if (v.phase.kind === 'over' && (viewerOpen('galleries') || viewerOpen('museum'))) closeModal();
    else refreshViewers(v, me);
    if (v.phase.kind === 'over' && !this.ceremony.started && !this.galaWaiting) {
      if (document.hidden) this.galaWaiting = true;
      else void this.ceremony.play(v, me);
    }
  }
}
