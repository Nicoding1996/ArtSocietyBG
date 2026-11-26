import * as THREE from 'three';
import { GENRE_INFO } from '../shared/content';
import { waitingOnView } from '../shared/options';
import type { GameEvent, GameView, Hung, Painting, PlayerView, Tile } from '../shared/types';
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
import { banner, hideCards, lightbox, revealCard, showHelp, tileTooltip, toast, tooltip } from './ui/overlays';
import { Prompts } from './ui/prompts';

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

  constructor(
    private world: World,
    private net: Net,
    private audio: Audio,
    private chat: ChatPanel,
    private me: () => string | null,
    isHost: () => boolean,
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
        this.world.startPlacement({ pid: me, tile: req.tile, spots: req.spots, mode: req.mode, onHover: req.onHover, onPin: req.onPin, onCommit: req.onCommit });
      },
      stopPlace: () => this.world.stopPlacement(),
      pinned: () => this.world.pinnedSpot(),
      unpin: () => this.world.unpin(),
      marks: (m, f) => {
        const me = this.me();
        if (me) this.world.markNeighbours(me, m, f);
      },
      lookAtMyWall: () => {
        const me = this.me();
        if (me && !(this.world.view.kind === 'wall' && this.world.view.pid === me)) void this.world.viewWall(me, true);
        this.refreshHud();
      },
    });
    this.hud = new Hud(
      {
        onHelp: () => showHelp(),
        onLeave: () => {
          if (confirm('Leave this game? An autopilot will take over your seat.')) this.onLeave();
        },
        onToggle: (what) => {
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
        },
        onView: (what) => {
          const me = this.me();
          if (what === 'table') void this.world.viewTable();
          else if (what === 'mine') {
            if (me) void this.world.viewWall(me, this.needsMyWall());
          } else void this.world.viewWall(what.pid, what.pid === me && this.needsMyWall());
          this.refreshHud();
        },
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
    world.onTileClick = (tile, owner) => lightbox(tile, this.player(owner), this.view);
    world.onWallClick = (pid) => {
      void this.world.viewWall(pid, pid === this.me() && this.needsMyWall());
      this.refreshHud();
    };
    this.resizeObs = new ResizeObserver(() => this.measureInsets());
    this.resizeObs.observe(this.hud.promptSlot);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => this.measureInsets();

  dispose() {
    this.disposed = true;
    this.resizeObs.disconnect();
    window.removeEventListener('resize', this.onResize);
    this.prompts.hide();
    this.ceremony.close();
    hideCards();
    tooltip(null);
    this.world.onTileHover = null;
    this.world.onTileClick = null;
    this.world.onWallClick = null;
    this.world.stopPlacement();
    this.root.remove();
  }

  private player(id: string | null): PlayerView | undefined {
    return id ? this.view?.players.find((p) => p.id === id) : undefined;
  }

  rejected(message: string) {
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
      // Catch up quickly if updates pile up (for example after the tab was in the background).
      const backlog = this.queue.length;
      this.world.tw.speed = backlog > 3 ? 8 : backlog > 0 ? 2.5 : 1;
      if ((this.view || u.events.some((e) => e.t === 'start')) && u.events.length) {
        for (const e of u.events) {
          if (this.disposed) return;
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
      case 'discard': {
        const wall = w.walls.get(e.pid);
        const s = this.shownOf(e.pid);
        const at = wall?.takeStaged(e.tile.id);
        s.queue = s.queue.filter((t) => t.id !== e.tile.id);
        if (at) w.burst(at, '#cccccc', 20, 0.4, 0.1, 0.7);
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

  /** True when the local player is about to place something on their wall. */
  private needsMyWall(): boolean {
    const v = this.view;
    const me = this.me();
    if (!v || !me) return false;
    const p = v.players.find((x) => x.id === me);
    if (!p) return false;
    if (v.phase.kind === 'setup') return !!p.starter;
    if (v.phase.kind === 'acquire') return !!p.task || v.phase.order[v.phase.next] === me;
    return false;
  }

  /** Turns to the table unless the person is steering the camera themselves (then the next update retries). */
  private goTable(ms: number) {
    if (!this.autoCam || this.world.userBusy() || this.needsMyWall()) return;
    this.lastNeed = 'table';
    void this.world.viewTable(ms);
  }

  private camera(v: GameView) {
    const me = this.me();
    if (!this.autoCam || v.phase.kind === 'over') return;
    const need = this.needsMyWall() && me ? `wall:${me}` : 'table';
    if (need === this.lastNeed) return;
    if (this.world.userBusy()) return;
    this.lastNeed = need;
    if (need === 'table') void this.world.viewTable();
    else if (me) void this.world.viewWall(me, true);
  }

  private viewName(): string {
    const v = this.world.view;
    return v.kind === 'wall' ? v.pid : v.kind;
  }

  private refreshHud() {
    if (this.view) this.hud.render(this.view, this.me(), this.viewName());
  }

  private measureInsets() {
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
    if (!first && !this.world.userBusy() && this.world.view.kind !== 'free') this.world.refreshView(450);
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
    this.hud.render(v, me, this.viewName());
    this.hud.setDocked(this.needsMyWall());
    this.prompts.render(v, me);
    this.measureInsets();
    this.camera(v);
    this.refreshHud();
    if (v.phase.kind === 'over' && !this.ceremony.started) void this.ceremony.play(v, me);
  }
}
