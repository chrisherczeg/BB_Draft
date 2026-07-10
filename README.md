# Big Brother Draft

A live, real-time **Big Brother snake draft**. Participants join with a display name, one
person creates a session and becomes the leader, and everyone drafts from 17 face-down cards
(16 Season 28 houseguests + 1 Mystery Player). Each turn is 60 seconds; picking a card flips
it to reveal the houseguest to everyone in real time.

## How it works

- **Create / join** — The first player creates a session and gets a 4-letter code to share.
  Others join with that code. Max **16 drafters**.
- **Start** — Only the leader can start. Starting **randomizes the snake draft order** and
  **locks the session** (no one else can join).
- **Draft** — On your turn you have **60 seconds** to pick any face-down card. It flips to
  reveal a random houseguest for everyone. If your timer runs out, the server **auto-picks a
  random remaining card** for you.
- **Snake order** — Round 1 goes in order, round 2 reverses, and so on until all 17 cards are
  gone. With fewer than 17 drafters, some people get more than one houseguest ("luck of the draw").
- **Mystery Player** — The mystery card reveals as "Mystery Player". Who it actually becomes
  (the first houseguest eliminated in the real show) is resolved offline.

## Tech stack

- **Server**: Node.js + Express + Socket.IO (in-memory sessions; server is the source of truth
  for state and the turn timer).
- **Client**: React + Vite.
- **Real-time on Azure**: optional [Azure Web PubSub for Socket.IO](https://learn.microsoft.com/azure/azure-web-pubsub/socketio-overview).

## Run locally

```bash
npm run install:all   # install root + server + client deps
npm run dev           # starts server (:3001) and Vite client (:5173)
```

Open http://localhost:5173 in a few browser tabs/windows to simulate multiple drafters.

Production-style run (server serves the built client):

```bash
npm run build         # build the React client into client/dist
npm start             # server on :3001 serves API + client + /assets
```

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | Server port |
| `TURN_SECONDS` | `60` | Seconds per pick (lower it to test the auto-pick timer) |
| `WEBPUBSUB_CONNECTION_STRING` | _unset_ | Enables Azure Web PubSub for Socket.IO |
| `WEBPUBSUB_HUB` | `bbdraft` | Web PubSub hub name |

When `WEBPUBSUB_CONNECTION_STRING` is not set, the server uses plain Socket.IO — no Azure
resource is needed for local development.

## Deploy to Azure (free tier)

> **Why Web PubSub?** Azure App Service **Free (F1)** caps WebSocket connections at **5**,
> which is too few for 16 drafters. **Azure Web PubSub for Socket.IO** (Free tier: **20
> concurrent connections**, 20,000 messages/day) offloads the connections while keeping the
> same Socket.IO code, so the F1 cap no longer applies.

1. **Create a Web PubSub (Free) resource** and copy its connection string:
   ```bash
   az webpubsub create -g <rg> -n <wps-name> --sku Free_F1 --unit-count 1
   az webpubsub key show -g <rg> -n <wps-name> --query primaryConnectionString -o tsv
   ```
2. **Create an App Service (Free F1, Linux/Node)** and set app settings:
   ```bash
   az webapp config appsettings set -g <rg> -n <app-name> --settings \
     WEBPUBSUB_CONNECTION_STRING="<connection-string>" \
     WEBPUBSUB_HUB="bbdraft"
   ```
3. **Build and deploy**: run `npm run build`, then deploy the repo (the server serves
   `client/dist` and `/assets`). The server start command is `node server/index.js`
   (or `npm start`).

### Free-tier limits to keep in mind

- **20 concurrent connections total** — 16 drafters plus a handful of spectators fit; heavy
  spectator counts do not.
- App Service **F1 sleeps after ~20 min idle** (cold start on first load) and has a
  **60 CPU-minute/day** quota — fine for a single live draft event.
- **Sessions are in-memory** — if the App Service process recycles, active sessions are lost.

## Project structure

```
assets/                 # houseguest images (served at /assets)
server/
  index.js              # Express + Socket.IO bootstrap, static serving, optional Web PubSub
  sessionStore.js       # in-memory sessions + snake draft engine + turn timers
  data/roster.js        # the 17 draftable cards (data-driven; swap images/names here)
client/
  src/
    App.jsx             # socket wiring + screen routing + reconnect
    socket.js           # socket.io-client singleton
    screens/            # Home, Lobby, DraftBoard, Complete
    styles.css
```

## Notes

- `assets/survivor-50-rick-devens-header.avif` is a Survivor image sitting among the BB
  houseguests — likely a placeholder. Swap it (and any name) in `server/data/roster.js`.
