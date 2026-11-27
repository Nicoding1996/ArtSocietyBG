import { BOT_NAMES, PLAYER_COLORS } from '../shared/content';
import { botDecide } from '../shared/bot';
import { applyAction, createGame, viewFor, waitingOn } from '../shared/engine';
import { makeRng } from '../shared/rng';
import { HATS, type GameState, type RoomView, type ServerMessage } from '../shared/types';
import { Audio } from './audio';
import { GameScreen } from './game';
import { Net } from './net';
import { World } from './three/world';
import { ChatPanel } from './ui/chat';
import { el } from './ui/dom';
import { renderHome } from './ui/home';
import { icon } from './ui/icons';
import { LobbyView } from './ui/lobby';
import { closeModal, initOverlays, showHelp, toast } from './ui/overlays';

const NAME_KEY = 'artsociety.name';

/** A salon half-way through an evening, played out by bots, for the home and lobby backdrop. */
function demoState(): GameState {
  const { state } = createGame({
    seed: 20240611,
    players: [0, 1, 2, 3].map((i) => ({ id: `demo${i}`, name: BOT_NAMES[i], color: PLAYER_COLORS[i], hat: HATS[i], isBot: true })),
  });
  const r = makeRng(7);
  for (let guard = 0; guard < 4000 && state.phase.kind !== 'over' && state.round < 9; guard++) {
    const waiting = waitingOn(state);
    const pid = waiting[Math.floor(r() * waiting.length)];
    const a = pid ? botDecide(viewFor(state, pid), pid, r) : null;
    if (!a || !applyAction(state, pid, a).ok) break;
  }
  return state;
}

export class App {
  private world: World;
  private net = new Net();
  private audio = new Audio();
  private chat = new ChatPanel(true);
  private screenEl = el('div', 'screen');
  private status = el('div', 'net-status');
  private lobby: LobbyView | null = null;
  private game: GameScreen | null = null;
  private room: RoomView | null = null;
  private me: string | null = null;
  /** The server PC's network addresses, for invite links when this page was opened on localhost. */
  private lan: string[] = [];
  private screen: 'home' | 'lobby' | 'game' | null = null;
  private demo: GameState | null = null;

  constructor(ui: HTMLElement) {
    const labels = el('div', 'labels');
    ui.append(labels, this.screenEl, this.status);
    initOverlays(ui);
    this.world = new World(document.getElementById('scene') as HTMLCanvasElement, labels);
    this.chat.onSend = (text) => this.net.send({ t: 'chat', text });
    this.chat.onReact = (emoji) => this.net.send({ t: 'react', emoji });
    // Browsers only allow sound after a user gesture.
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.net.onStatus((s) => {
      this.status.className = `net-status ${s}`;
      this.status.textContent = s === 'open' ? '' : s === 'connecting' ? 'Connecting to the salon\u2026' : 'Connection lost \u2014 reconnecting\u2026';
    });
    this.net.on((m) => this.handle(m));
    this.showHome();
    this.net.connect();
  }

  private versionWarning() {
    if (document.querySelector('.version-warning')) return;
    const box = el(
      'div',
      'version-warning',
      `<span><b>The game server is running a different version of the game than this page.</b> Parts of the game will not work properly. On the PC that runs the server, stop it and run <code>npm start</code> again, then reload this page.</span>`,
    );
    const close = el('button', 'vw-close', icon('close'));
    close.title = 'Hide this message';
    close.addEventListener('click', () => box.remove());
    box.appendChild(close);
    this.status.after(box);
  }

  /** Shows the bots' half-finished salon behind the home and lobby screens. */
  private showDemo() {
    void this.world.ready.then(() => {
      if (this.screen === 'game') return;
      this.demo ??= demoState();
      const d = this.demo;
      this.world.setSeats(
        d.players.map((p) => ({ id: p.id, name: p.name, color: p.color, hat: p.hat })),
        null,
      );
      for (const p of d.players) {
        const wall = this.world.walls.get(p.id);
        wall?.syncWall(p.wall);
        wall?.setAssistant(p.assistant);
        wall?.setExcess(p.excess);
        wall?.setStaging([]);
      }
      this.world.table.setPrestige(d.prestige);
      this.world.table.setMuseum(d.museum);
      this.world.table.setSupply(d.supply.length);
      this.world.table.clearLots();
      for (const p of d.players) this.world.table.setStack(p.id, p.stack.length, p.stack[p.stack.length - 1], false);
      void this.world.table.moveGavel(null, this.world.sideOf(d.players[d.auctioneer].id));
      this.world.setDemo(true);
    });
  }

  private handle(m: ServerMessage) {
    switch (m.t) {
      case 'welcome':
        this.lan = m.lan ?? [];
        // A server left running on older code than this page (or newer) misreads parts of the game,
        // so say so plainly. In development the server restarts on every change, so no check there.
        if (!import.meta.env.DEV && m.build !== __SHARED_HASH__) this.versionWarning();
        break;
      case 'room': {
        this.room = m.room;
        this.me = m.you;
        this.net.room = m.room.code;
        history.replaceState(null, '', `?room=${m.room.code}`);
        if (m.room.status === 'lobby') this.showLobby();
        else if (this.screen !== 'game') this.showGame();
        this.game?.roomChanged(m.room);
        break;
      }
      case 'game':
        if (this.screen !== 'game') {
          this.showGame();
          if (this.room) this.game!.roomChanged(this.room);
        }
        this.game!.receive(m.view, m.events);
        break;
      case 'chat':
        this.chat.addChat({ pid: m.pid, name: m.name, color: m.color, text: m.text, at: this.chat.stamp() });
        if (m.pid !== this.me) this.audio.click();
        break;
      case 'react':
        this.game?.react(m.pid, m.emoji);
        break;
      case 'error':
        if (this.game) this.game.rejected(m.message);
        else toast(m.message, 'error');
        break;
      case 'idle': {
        toast('You were away, so the autopilot is playing for you. Click anywhere to take over.', 'info', 8000);
        const back = () => {
          this.net.send({ t: 'back' });
          window.removeEventListener('pointerdown', back);
          window.removeEventListener('keydown', back);
        };
        window.addEventListener('pointerdown', back);
        window.addEventListener('keydown', back);
        break;
      }
      case 'left':
        this.net.room = null;
        this.room = null;
        history.replaceState(null, '', location.pathname);
        this.showHome();
        break;
    }
  }

  private clearScreen() {
    this.game?.dispose();
    this.game = null;
    this.lobby = null;
    this.screenEl.innerHTML = '';
    closeModal();
  }

  private showHome() {
    if (this.screen !== 'home') this.clearScreen();
    const wasGame = this.screen === 'game';
    this.screen = 'home';
    if (wasGame || !this.demo) this.showDemo();
    else this.world.setDemo(true);
    const code = (new URLSearchParams(location.search).get('room') ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    const wrap = el('div', 'home');
    this.screenEl.appendChild(wrap);
    renderHome(wrap, localStorage.getItem(NAME_KEY) ?? '', code, {
      onCreate: (name) => {
        localStorage.setItem(NAME_KEY, name);
        this.audio.unlock();
        this.net.send({ t: 'create', name });
      },
      onJoin: (name, c) => {
        localStorage.setItem(NAME_KEY, name);
        this.audio.unlock();
        this.net.send({ t: 'join', code: c, name });
      },
      onHelp: () => showHelp(),
    });
  }

  private showLobby() {
    if (!this.room || !this.me) return;
    if (this.screen !== 'lobby') {
      const wasGame = this.screen === 'game';
      this.clearScreen();
      this.screen = 'lobby';
      if (wasGame || !this.demo) this.showDemo();
      else this.world.setDemo(true);
      this.lobby = new LobbyView(
        (msg) => this.net.send(msg),
        () => this.leave(),
        () => showHelp(),
        this.chat,
      );
      this.screenEl.appendChild(this.lobby.root);
    }
    this.lobby!.render(this.room, this.me, this.lan);
  }

  private showGame() {
    this.clearScreen();
    this.screen = 'game';
    this.world.setDemo(false);
    this.world.table.clearLots();
    this.game = new GameScreen(
      this.world,
      this.net,
      this.audio,
      this.chat,
      () => this.me,
      () => !!this.room && this.room.hostId === this.me,
      () => this.leave(),
    );
    this.screenEl.appendChild(this.game.root);
  }

  private leave() {
    this.net.send({ t: 'leave' });
  }
}
