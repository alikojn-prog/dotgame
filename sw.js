/* doTriangle service worker — offline cache for the whole game.
   Bump CACHE version whenever you ship a new build. */
var CACHE = "dotriangle-v10";
var ASSETS = [
  "index.html",
  "triangle-duel.html",
  "manifest.webmanifest",
  "icon-180.png", "icon-192.png", "icon-512.png",
  "Sounds/Click.mp3",
  "Sounds/main1.mp3", "Sounds/main2.mp3", "Sounds/Main3.mp3",
  "Sounds/Dice/Dice.mp3",
  "Sounds/Triangle/Single.mp3", "Sounds/Triangle/Double.mp3",
  "Sounds/Win/Win1.mp3",
  "Sounds/Loss/Loss1.mp3"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // add files one by one so a single 404 doesn't break the install
      return Promise.all(ASSETS.map(function (a) { return c.add(a).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Stale-while-revalidate: serve from cache instantly, refresh in the background.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // fonts/CDN: let the browser handle it
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fetched = fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || fetched;
    })
  );
});
