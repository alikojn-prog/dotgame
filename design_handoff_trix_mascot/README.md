# Handoff: Trix the doTriangle Mascot — website integration

## Overview
**Trix** is the official mascot of the **doTriangle** web app. This package gives you everything
needed to drop Trix into the live site (`index.html`, the vanilla-JS single-file PWA) and make it
**react to gameplay** — looking battle-ready during a match, celebrating wins, and curious on the
home screen.

This README is written so an AI coding assistant (e.g. Claude Code / Cowork) can implement it
end-to-end **without having seen the design conversation**. Follow it top to bottom.

## What's in this bundle
| File | What it is | How to use it |
|---|---|---|
| `trix.js` | The production component. Self-contained, **zero dependencies**, injects its own `<style>` once. | Copy into the site and load with a `<script>` tag. This is real, shippable code — not a mock. |
| `mascot-trix-v2.svg` | The static master artwork (no animation/moods). | Reference / fallback only. Prefer `trix.js`, which renders the same character with live moods. |

> Unlike a typical design handoff, `trix.js` is **finished, framework-free code you can ship as-is**.
> The work is *integration* (mounting it and wiring moods to game events), not rebuilding the art.

## Fidelity
**High-fidelity / production-ready.** Exact colors, gradients, proportions and animations are baked
into `trix.js`. Do not re-draw the character. Render it through the component so all four moods,
the blink loop, the float, and the reactor pulse work.

---

## The Trix component API

Load it once, anywhere after the elements you'll mount into exist:

```html
<script src="trix.js"></script>
```

Then mount and control:

```js
// host is any block element; Trix fills 100% width, height auto.
var trix = Trix.mount(host, { mood: "idle" });

trix.setMood("idle");     // "idle" | "battle" | "happy" | "curious"
trix.pulse();             // one-shot reactor burst (use on wins / big moments)
trix.getMood();           // -> current mood string
trix.el;                  // the live <svg> node, if you need to size/animate it
```

**Mounting rules**
- The SVG scales to the **width** of its host (`width:100%;height:auto`), viewBox `360×440`
  (portrait, ~0.82 aspect). Size Trix by constraining the host's width.
- `Trix.mount()` sets `host.innerHTML`, so give it an empty container.
- Multiple instances are safe — each gets unique gradient IDs. (If you keep both a home and an
  in-game Trix, mount two separate hosts.)
- Honors `prefers-reduced-motion`: the float + blink stop automatically.

**The four moods**
| Mood | Look | When to use |
|---|---|---|
| `idle` | Gentle float, periodic blink, cyan eyes, calm cyan reactor | Default / resting. Menus. |
| `curious` | Head tilt, one eye widened, thought-spark | Home screen, setup/mode-select — "what'll we play?" |
| `battle` | Furrowed pink brow, narrowed angled eyes, **reactor turns magenta**, blink stops | During an active match (roll-off + turns + drawing) |
| `happy` | Squinted happy eyes, smile, blush | On a win / celebratory moments |

---

## Where Trix lives in the site (exact integration points)

All line numbers refer to the current `index.html`.

### 1. Home screen — `curious`
The home view (`<div class="view show" id="v-home">`, ~line 728) has a logo mark:

```html
<div class="logomark" id="home-logo"></div>   <!-- ~line 730, filled at ~line 1250 -->
```

**Option A (recommended): Trix becomes the hero above the wordmark.** Add a dedicated host just
inside `.home-stack`, above `#home-logo`, and keep the small triangle logo where it is:

```html
<div class="home-stack">
  <div class="trix-host" id="home-trix" style="width:200px;margin:0 auto;"></div>
  <div class="logomark" id="home-logo"></div>
  <div class="wordmark">do<span class="t">Triangle</span></div>
  ...
```

Then near the existing `$("home-logo").innerHTML=logoSVG(88);` line (~1250):

```js
$("home-logo").innerHTML = logoSVG(88);
var homeTrix = Trix.mount($("home-trix"), { mood: "curious" });
```

Keep `homeTrix` reachable (e.g. on a small module-scope var) so `showView` can re-assert its mood.

### 2. Setup / mode-select — `curious`
`#v-setup` (~line 775) is the "Select Mode" screen. Optional: mount a **second, smaller** Trix at
the top of `.view-inner`, or simply reuse the home instance's mood. Curious fits here too.

### 3. Centralize mood per view — `showView()`
`showView(id)` (~line 1211) is the single switchboard for top-level views. Set Trix's mood here so
it always matches the screen:

```js
function showView(id){
  VIEWS.forEach(function(v){$(v).classList.toggle("show", v===id);});
  $("stage").classList.remove("show");
  hideOverlay("ov-rolloff"); hideOverlay("ov-levelintro"); $("gameover").classList.remove("show");
  $("campresult").classList.remove("show");
  $("sheet").classList.remove("show"); $("confetti").classList.remove("show");
  if(id==="v-howto") fitHowto();

  // --- Trix mood follows the screen ---
  if (window.homeTrix) {
    homeTrix.setMood(id === "v-setup" || id === "v-home" ? "curious" : "idle");
  }
}
```

### 4. In a live game — `battle`
`showGame()` (~line 1234) is called when a match starts (board view). If you mount an in-game Trix
(e.g. a small one beside the score/HUD), set it to `battle` here:

```js
function showGame(){
  VIEWS.forEach(function(v){$(v).classList.remove("show");});
  $("stage").classList.add("show");
  _bannerShown=false;
  if (window.gameTrix) gameTrix.setMood("battle");
}
```

If you only keep one Trix instance, switch its mood to `battle` here instead.

### 5. Win / game-over — `happy` + `pulse()`
`showGameOver(winnerIdx, iWin)` (~line 2286) already knows whether the local player won via `iWin`.
Add a reaction at the end of that function:

```js
function showGameOver(winnerIdx, iWin){
  // ...existing body...
  if (window.gameTrix || window.homeTrix) {
    var t = window.gameTrix || window.homeTrix;
    t.setMood(iWin ? "happy" : "idle");
    if (iWin) t.pulse();        // reactor burst on a win
  }
}
```

`resolveGame()` (~line 2326) and the online path `onlineEndGame()` (~line 3461) both call
`showGameOver`, so this one hook covers CPU, pass-&-play, and online.

### 6. Optional flourishes
- **Roll-off win**: call `trix.pulse()` when the roll-off resolves (`resolveRolloff`, ~line 2143).
- **Each successful triangle closed**: a quick `trix.pulse()` is a nice touch but optional — don't
  over-fire it.

---

## Load order / where to add the script tag
`index.html` is a single file with all JS in one inline `<script>` at the bottom. Two options:

1. **Keep `trix.js` external** (recommended): copy `trix.js` next to `index.html`, then add
   `<script src="trix.js"></script>` **before** the main inline script so `window.Trix` exists when
   the app code runs. Also add it to the service worker precache list in `sw.js` and to the build's
   shipped assets so the PWA caches it offline.
2. **Inline it**: paste the contents of the `trix.js` IIFE above the main app script. No load-order
   concerns, one fewer request.

> Because the app initializes views immediately on load, make sure `Trix` is defined **before** the
> code that calls `Trix.mount(...)` runs.

---

## Design tokens (already consistent with the site)
Trix is drawn in the doTriangle **Nebula** palette, so it matches `index.html`'s `:root` tokens:

| Token | Hex | Role in Trix |
|---|---|---|
| `--p1` cyan | `#36E0E6` | eyes, reactor (idle), accents |
| `--p2` magenta | `#FF5FB0` | brow/visor rim, reactor (battle), blush, ring pod |
| `--accent` purple | `#B69BFF` | pearl shell gradient family |
| background | `#060414 → #1B1147` | same nebula radial the app already uses |

No new fonts or colors are introduced.

## Assets
- `trix.js` — the component (renders Trix entirely in inline SVG; no external image requests).
- `mascot-trix-v2.svg` — static master art, for promo/marketing or as a no-JS fallback.
- A visual side-by-side of mascot directions lives in the project as **`Mascot Options.html`**
  (reference only — not needed to ship).

## Acceptance checklist
- [ ] `trix.js` loaded before the app's main script (or inlined); `window.Trix` is defined.
- [ ] Trix renders on the **home** screen and looks `curious`.
- [ ] Entering a match flips Trix to `battle` (reactor goes magenta, brow furrows).
- [ ] Winning shows `happy` + a one-shot reactor `pulse()`; losing returns to a calm mood.
- [ ] Mood is driven centrally from `showView()` / `showGame()` / `showGameOver()` — not scattered.
- [ ] `prefers-reduced-motion` users see a still Trix (verify float + blink stop).
- [ ] `trix.js` is added to `sw.js` precache so it works offline.
