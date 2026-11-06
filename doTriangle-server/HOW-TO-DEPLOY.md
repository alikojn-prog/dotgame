# doTriangle multiplayer server — deploy guide

This folder is a [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) Worker.
It runs on **your own Cloudflare account** (free plan is fine). Each game room is a Durable Object.

> History: until Oct 2026 this ran on hosted PartyKit (`dotriangle.alikojn-prog.partykit.dev`).
> PartyKit shut its hosted platform down on 23 Oct 2026, so it was migrated here.

## Deploy

In Terminal:

```
cd "path/to/doTriangle-server"   # drag the folder into Terminal
npm install                      # first time / after dependency changes
npx wrangler login               # first time only — opens the browser
npx wrangler deploy
```

The server is served at **`party.dotriangle.com`** (custom domain in `wrangler.jsonc`), plus a
backup `dotriangle-server.<your-subdomain>.workers.dev` URL that the deploy prints.

The game reads the host from `PARTYKIT_HOST` in `triangle-duel.html` / `index.html`:

```
var PARTYKIT_HOST = "party.dotriangle.com";
```

No `https://`, no trailing slash. Rooms are reached at `wss://<host>/parties/main/<CODE>`.

## Test locally

```
npx wrangler dev        # serves at localhost:8787
```

Temporarily set `PARTYKIT_HOST = "localhost:8787"` and open the game in two browser windows.

## Updating the server later

Edit `src/server.ts`, then `npx wrangler deploy`. Same URL each time.
Remember: game rules (e.g. `triAngleOK`) are duplicated in the web client and iOS app — keep them in sync.

## Troubleshooting

- Visit https://party.dotriangle.com — it should say `doTriangle server OK`.
- Logs: Cloudflare dashboard → Workers & Pages → dotriangle-server → Logs, or `npx wrangler tail`.
