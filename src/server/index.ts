import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { guarded } from './guard';
import { RoomManager, cleanName, type Conn } from './rooms';
import { sharedSourceHash } from './sourceHash';
import type { ClientMessage, ServerMessage } from '../shared/types';

const PORT = Number(process.env.PORT) || 3000;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../dist/client');
// The shared code this process loaded; the page compares it with the code it was built from.
const BUILD = sharedSourceHash(path.resolve(HERE, '../shared'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

/** True for a regular file. Never throws: a file can vanish or be locked while the client is rebuilt. */
function isFile(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  let url: URL;
  try {
    // Some request paths, such as "//", are not valid URLs and make the parser throw.
    url = new URL(req.url ?? '/', 'http://localhost');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request.');
    return;
  }
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
    return;
  }
  if (!existsSync(ROOT)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('The client is not built yet. Run "npm start" (or "npm run dev" and open http://localhost:5173).');
    return;
  }
  let rel: string;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  let file = path.join(ROOT, path.normalize(rel));
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!isFile(file)) file = path.join(ROOT, 'index.html');
  const ext = path.extname(file).toLowerCase();
  const immutable = file.includes(`${path.sep}assets${path.sep}`);
  const headers = {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (req.method === 'HEAD') {
    res.writeHead(200, headers).end();
    return;
  }
  // The headers go out once the file is open. While "vite build" rewrites dist/, a file can be missing
  // or locked for a moment: that fails this one request instead of taking the server and its games down.
  const stream = createReadStream(file);
  stream.once('error', () => {
    if (res.headersSent) return;
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '2' });
    res.end('The game files are being updated. Reload the page in a moment.');
  });
  stream.once('open', () => {
    res.writeHead(200, headers);
    pipeline(stream, res, () => {});
  });
}

const server = http.createServer(serveStatic);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });
const rooms = new RoomManager();

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

/** Virtual adapters (WSL, Hyper-V, VirtualBox, VMware, Docker) that friends on the same Wi-Fi cannot reach. */
const VIRTUAL_ADAPTER = /vEthernet|WSL|Hyper-V|VirtualBox|VMware|vmnet|vboxnet|docker|virbr|veth|^br-/i;

/** This PC's IPv4 addresses on the local network, skipping virtual adapters unless there is nothing else. */
function lanAddresses(): string[] {
  const all = Object.entries(os.networkInterfaces()).flatMap(([name, list]) =>
    (list ?? []).filter((i) => i.family === 'IPv4' && !i.internal).map((i) => ({ name, address: i.address })),
  );
  const real = all.filter((i) => !VIRTUAL_ADAPTER.test(i.name));
  return (real.length ? real : all).map((i) => i.address);
}

wss.on('connection', (ws) => {
  const conn: Conn = { ws, token: null, room: null, pid: null, recent: [] };
  let alive = true;
  let budget = 40;
  const refill = setInterval(() => (budget = 40), 1000);
  const ping = setInterval(() => {
    if (!alive) return ws.terminate();
    alive = false;
    ws.ping();
  }, 25_000);
  ws.on('pong', () => (alive = true));

  // The network addresses let a host who opened localhost hand out an invite link that other PCs can reach.
  send(ws, { t: 'welcome', serverTime: Date.now(), lan: lanAddresses(), build: BUILD });

  ws.on('message', (data) => {
    if (--budget < 0) return; // flood protection
    let msg: ClientMessage;
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') return;
    // A message that runs into a bug gets an error back, and the server and its other games carry on.
    if (!guarded(`message "${msg.t.slice(0, 24)}"`, () => onMessage(conn, msg))) {
      send(ws, { t: 'error', message: 'Something went wrong on the server. Please try that again.' });
    }
  });

  ws.on('close', () => {
    clearInterval(ping);
    clearInterval(refill);
    guarded('disconnect', () => conn.room?.detach(conn));
  });
  ws.on('error', () => ws.terminate());
});

function onMessage(conn: Conn, msg: ClientMessage) {
  const ws = conn.ws;
  if (msg.t === 'hello') {
    if (typeof msg.token !== 'string' || !TOKEN_RE.test(msg.token)) return send(ws, { t: 'error', message: 'Bad session token.' });
    conn.token = msg.token;
    if (typeof msg.room === 'string') {
      const room = rooms.get(msg.room);
      const seat = room?.seatByToken(msg.token);
      if (room && seat) room.attach(conn, seat);
      // The remembered room is gone (server restarted or the seat expired).
      else send(ws, { t: 'left' });
    }
    return;
  }
  if (!conn.token) return send(ws, { t: 'error', message: 'Say hello first.' });

  if (msg.t === 'create' || msg.t === 'join') {
    if (conn.room) conn.room.leave(conn);
    let room;
    if (msg.t === 'create') room = rooms.create();
    else {
      room = typeof msg.code === 'string' ? rooms.get(msg.code.trim()) : undefined;
      if (!room) return send(ws, { t: 'error', message: 'No room with that code. Check the code and try again.' });
      const existing = room.seatByToken(conn.token);
      if (existing) return room.attach(conn, existing);
    }
    const seat = room.addHuman(conn, cleanName(msg.name));
    if (typeof seat === 'string') {
      if (msg.t === 'create') rooms.remove(room);
      return send(ws, { t: 'error', message: seat });
    }
    return;
  }
  if (msg.t === 'leave') {
    conn.room?.leave(conn);
    send(ws, { t: 'left' });
    return;
  }
  if (!conn.room) return send(ws, { t: 'error', message: 'Join a room first.' });
  conn.room.handle(conn, msg);
}

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddresses().map((a) => `http://${a}:${PORT}`);
  console.log('\n  🎨  Art Society server is running');
  console.log(`      On this PC:      http://localhost:${PORT}`);
  for (const url of lan) console.log(`      On your network: ${url}`);
  console.log('      Over the internet: see "Playing with friends on other PCs" in README.md.\n');
});
