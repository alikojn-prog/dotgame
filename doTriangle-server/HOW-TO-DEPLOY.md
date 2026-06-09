# doTriangle multiplayer server — deploy guide

This folder is a [PartyKit](https://docs.partykit.io) server. When deployed, it runs on Cloudflare's edge network and hosts every game room as a tiny stateful object. Free tier covers thousands of rooms.

## What you need

- A **Cloudflare account** (free — sign up at https://dash.cloudflare.com/sign-up).
- **Node.js** installed (the LTS version is fine — same Node you used for the iOS build).

You don't need a credit card. The free tier handles the kind of traffic you'll see.

## Deploy (first time)

In Terminal:

```
cd "path/to/doTriangle-server"      # drag the folder into Terminal to get the path
npm install                         # one-time
npx partykit login                  # opens your browser to log in to Cloudflare
npx partykit deploy                 # uploads the server
```

The deploy command prints a URL like:

```
https://dotriangle.YOUR-USERNAME.partykit.dev
```

Copy `dotriangle.YOUR-USERNAME.partykit.dev` (without the `https://`). That's your **PartyKit host**.

## Tell the game where the server lives

Open `triangle-duel.html` and find this line near the top of the `<script>` block:

```
var PARTYKIT_HOST = "dotriangle.YOUR-USERNAME.partykit.dev";
```

Replace it with the URL the deploy command gave you. Save the file. Re-copy `triangle-duel.html` into `doTriangle/www/index.html` if you've already set up the iOS app, and run `npx cap sync` again.

## Test it locally before deploying (optional)

You can run the server on your own Mac while testing:

```
npx partykit dev
```

This serves at `localhost:1999`. Temporarily set `PARTYKIT_HOST = "localhost:1999"` in the game file. Open the game in two browser windows (or one browser + one phone on the same Wi-Fi using your Mac's local IP), one creates a room, the other joins.

## Updating the server later

If you change `src/server.ts`, just re-run:

```
npx partykit deploy
```

It's the same URL each time; you don't need to update the game.

## Cost

Free tier: 100,000 requests/day, more than enough for hundreds of concurrent games. After that it's pennies per million requests. You'll never accidentally rack up a bill on this game.

## What if it stops working?

- Check the Cloudflare status page (https://www.cloudflarestatus.com).
- Re-run `npx partykit deploy` — Cloudflare occasionally needs a fresh deploy.
- Check that `PARTYKIT_HOST` in the game matches the deployed URL exactly (no `https://` prefix, no trailing slash).
- Open the browser console (View → Developer → JavaScript Console) and look for WebSocket errors.

## How it works

Each game room is a [Durable Object](https://developers.cloudflare.com/durable-objects/) — a tiny stateful instance that lives at the edge near players, handles the WebSocket connection from both phones, validates moves (rolls, lines, no-crossing rules), and broadcasts the resulting state. The server file is `src/server.ts`. Both players connect to the same room ID (the 6-character code), so they end up in the same Durable Object.
