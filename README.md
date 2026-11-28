# Art Society: fan-made 3D edition

A browser version of the board game *Art Society* (Mitch Wallace, Mighty Boards, 2023) for 2–4 players, each on their own PC. You are collectors furnishing your drawing-room walls: win paintings at auction, hang them with taste, and watch the museum decide which kinds of painting are in fashion. The evening ends with the Gala, which reveals the museum's verdict, scores every wall act by act and crowns the winner on a podium.

The salon, table and walls are 3D. Every painting is generated in the browser in the manner of a famous style or picture (water lilies, poppy fields, wheat under a swirling sky, Mount Fuji, the great wave, café terraces, rainy boulevards, Cubist portraits and still lifes, and more), so the game ships with no image files. Music and sound effects are synthesised too. Bots can fill empty seats.

## Quick start

Requires [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
npm start
```

Open <http://localhost:3000>, enter a name and click **Create a room**. Add bots or send friends the invite link from the lobby, then start the game.

## Playing with friends on other PCs

The PC that runs `npm start` is the host. Everyone else only needs a browser.

**Same Wi-Fi or LAN.** The server prints addresses like `http://192.168.1.20:3000` under "On your network". If you opened the game on `localhost`, the lobby's invite link already uses that address, so friends can open it as it is. The first time, Windows asks whether Node.js may accept connections. Allow it on private networks.

**Over the internet.** Pick one of these:

- **Cloudflare quick tunnel** (free, no account): install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/), run `cloudflared tunnel --url http://localhost:3000` next to `npm start`, and open the `https://….trycloudflare.com` link it prints. Create the room from that page, and the lobby's invite link will point at the tunnel.
- **ngrok**: run `ngrok http 3000` and use the forwarding URL the same way.
- **Host it** on any Node host with WebSocket support (Render, Railway, Fly.io, a VPS). Use the build command `npm install && npm run build` and the start command `npm run serve`. The server reads the `PORT` environment variable.

Seats survive page reloads and short disconnects. A player who closes the tab gets their seat back by opening the game again in the same browser. By default the game waits for anyone who drops out; the host can click **Let a bot play** on that player's card, and the player gets the seat back when they return. The host can instead switch on **Autopilot for away players** in the lobby: then a bot plays for anyone disconnected for 20 seconds or sitting on a decision for 2 minutes, until they are back. A player who leaves the game is always replaced by a bot. With no human connected the table pauses, and an empty room closes after 30 minutes.

When you are the only person at the table (everyone else is a bot, or away), Esc pauses the game: the bots wait until you resume. Switching to another tab pauses it too, and coming back resumes it. With other players at the table, Esc opens the same menu without pausing. If it becomes your turn while the game is in a background tab, the tab's title says "Your turn" and a chime plays (when sound is on).

## How to play

**Setup.** Each player hangs a starting painting so that it covers one of the two stars on their wall. Everyone holds bid cards 1 to 20 and gets one gold starting card (1 to 4) at random. The lowest starting card takes the gavel.

**Each round**

1. **The auctioneer** picks one painting more than there are players, choosing by size only. The paintings are then turned over.
2. **Everyone bids at once** with one of their cards. Each card is used once per game. On a tie, compare the next card down in each tied player's stack, with the starting card at the bottom.
3. **Highest bid chooses first**, then the next, and each player hangs their painting straight away. The round ends once everyone has pressed **Done**.
4. **The museum** receives the painting nobody took, and its type gains prestige equal to its value. Two markers never share a space: a marker that would land on another steps back to the nearest free space.
5. The gavel passes to the auctioneer's left.

**Hanging**

- A tile must fit inside the grid and touch another tile along an edge. Tiles are never turned.
- **Until you press Done for the round**, you may move the tiles you hung this round. Tiles from earlier rounds stay put, and so do the paintings in a frame match that earned decor, so the decor stays earned. A move never earns decor, and every tile must still touch the rest of the wall. While a painting from a museum swap waits to be hung, nothing moves.
- **Same frame** as a neighbour: take decor worth up to the number of matching neighbours. With 4 or more matches you may take several decor tiles that add up to that number. Decor earned in the round you complete your wall is not taken.
- **Same type** touching: a faux pas. Every painting involved scores no type points.
- Your **assistant** holds one tile for later. A tile still on the assistant at the end scores nothing.
- **Doesn't fit?** Give it to the assistant, swap it for a same-type museum painting that fits, or store it as **excess** (−2 at the end, and you take a 1-point decor tile).
- **Decor sold out?** While choosing decor, you may swap 2 or 3 decor tiles in a line on your wall for one longer tile that covers the same spaces. The short tiles go back to the supply, and your points stay the same. For example, three candle sconces in a row become one curio shelf, and the 1-point sconces can be taken again. If nothing can be swapped, you go without.

**The end.** When a wall is full, someone stores a second excess painting, or the bid cards run out, the round finishes and the evening ends.

**Scoring**

- The four types are ranked by prestige and pay ×5, ×4, ×3 and ×2. Types still at 0 prestige all pay ×2.
- Each painting scores its type's multiplier, unless it is in a faux pas.
- Decor scores the points printed on it.
- +3 for each painting of the top type that reaches into the eyeline band, even one in a faux pas.
- +5 for a full wall, −2 for each uncovered corner, −2 for each excess painting.
- Ties go to the player with the most bid-card value left in hand. If that is equal too, the win is shared.

The **How to play** button in the top bar shows the same rules in the game.

**Controls.** Point at your wall to preview a spot, click to pin it, then click again or press **Hang here**. Esc unpins (and otherwise opens the menu). When you hold the gavel, you choose sizes beside your wall: each size shows whether it fits there and, with dots in the players' colours, who else has room for it. Point at a size to see it on your wall, with every place it could hang lit up; the last size you chose stays lit up and follows the pointer over your wall. While bidding, and when it is your pick, click a painting on offer to try it on your wall before you commit; **Back to the table** puts it away. Drag to look around, scroll to zoom, and click any painting to look closer. The top bar switches between the table, your wall and **Galleries** (every wall side by side, with dots showing who has room for each painting on offer), and has toggles for camera follow, sound and music.

**Other players' walls.** Each player card shows their wall in miniature; rest the pointer on it for a large view, click it to go there. Keys: **1**–**4** a player's wall, **T** the table, **M** your wall, **G** the galleries.

**The museum.** Click a type in the museum panel (or a museum pile on the table) to see every painting the museum holds and which ones would fit your wall. When a painting on offer has no room on your wall, its card says where it could go: your assistant, a swap with the museum, or excess. Click it to list the museum paintings you could swap it for, and click one of those to try it on your wall. When you do swap, you try the museum painting on your wall first, then **Swap and hang here** swaps and hangs it in one step.

### Rule choices to know about

The rulebook leaves a few cases open. This version follows the rulebook wording, and each choice is easy to change in `src/shared/engine.ts`:

- The assistant may take a painting even if it would fit on the wall. (An unofficial FAQ says a painting that fits must be hung.)
- A painting may be stored as excess while the assistant is empty. (The same FAQ says the assistant must be used first.)
- As a safety net, the game also ends when the supply holds fewer paintings than one auction needs. The rulebook has no such rule.

## Development

```bash
npm run dev        # Vite on http://localhost:5173 (hot reload) + game server on :3000
npm test           # rules-engine tests (with full bot games at every table size), room tests (pausing, away players, autopilot errors) and the turn alert
npm run sim        # balance report for 2-4 players: rounds, end reasons, scores, ties, seat win share
npm run typecheck
```

- `npm run sim -- 50` plays 50 games per table size instead of the default 300.
- `/?gallery` shows every painting scene in several sizes, which helps when tuning the art generators. `/?gallery=7` uses a different seed.
- `/?gallery&theme=avatar` shows the Avatar theme's subjects instead (add `&scene=oasis` for one), and `/?gallery&theme=avatar&game=3` deals one game's paintings and shows them with their titles, so you can check that no subject repeats.
- `ART_SOCIETY_FAST=1 npm run serve` makes bots act almost at once and shortens the idle timers, which speeds up testing.
- The game's numbers (wall size, eyeline rows, bid cards, multipliers, bonuses and penalties, decor supply) live in `RULES` in `src/shared/content.ts`. Run `npm test` and `npm run sim` after changing them.

### Project layout

```
src/shared/   rules engine, wall geometry, scoring, paintings and decor, bot AI (used by server and browser)
src/server/   HTTP + WebSocket server, rooms, reconnects, autopilot
src/client/
  art/        procedural painting generators, one file per style
  three/      the 3D salon: room, auction table and museum board, gallery walls, frames, decor, podium
  ui/         home, lobby, HUD, action prompts, overlays and the Gala ceremony
  game.ts     turns server events into animations, then shows the new state
scripts/      bot game runner and balance simulator
tests/        engine tests
backup/       the earlier version with its own original rules
```

The server is authoritative. Clients send intentions such as "bid 7" or "hang here". The server checks them against the rules, updates the game and sends each player a view with other players' secrets removed: bid cards stay hidden until everyone has bid, and nobody sees another player's hand.

## Credits and fair use

This is an unofficial, fan-made adaptation for private games among friends. *Art Society* is designed by Mitch Wallace and published by Mighty Boards; this project is not affiliated with or endorsed by them. The rules above are summarised in our own words, and all art is generated by the program, so no artwork or text from the published game is included. Please don't sell or publish it. If you enjoy it, buy the board game.
