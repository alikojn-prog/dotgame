# Handoff: Stakes-First Level Details Pop-up

## Overview
A redesign of the **level-details pop-up** in the Campaign mode of a mobile dice-duel game. The pop-up appears when the player taps a level on the campaign map, and is the last screen before the duel starts. This redesign ("Stakes First") leads with the **prize** — the three earnable stars — then the level identity, the challenge parameters, and a visual explanation of the star economy (**collect 6★ → bank 1 extra dice roll**), ending in the Start CTA.

## About the Design Files
The files in this bundle are **design references created in HTML/JSX** — prototypes showing the intended look, not production code to copy directly. Your task is to **recreate this design in the target codebase's existing environment** (React Native, Flutter, Unity, SwiftUI, etc.) using its established patterns, components, and asset pipeline. If no environment exists yet, choose the most appropriate framework for a mobile game UI and implement the design there.

- `Stakes First Popup.html` — open in a browser to see the exact target design (renders the pop-up in a 402×874 viewport).
- `popup-redesigns.jsx` — the pop-up itself: see the `PopupStakes` component (this is the one to build). `PopupDialog` / `PopupTicket` are sibling explorations, not in scope.
- `helpers.jsx` — design tokens (`COSMIC`), icons (`Star`, `Dice`, `Bolt`, `Chevron`), star-meter components (`BankMeter`), and the campaign data model.
- `direction-modals.jsx` — `GhostMap` (the dimmed backdrop) and shared pieces.
- `direction-a.jsx` — only needed for `StarField` (decorative background dots).

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and copy are final. Recreate pixel-perfectly, substituting your codebase's equivalents only for infrastructure (fonts loading, navigation, state).

## Screens / Views

### Level Details Pop-up (modal)
- **Purpose:** Confirm/start a campaign level. Shows what's at stake (3 stars), the level identity, the challenge parameters, and progress toward the extra-roll reward.
- **Presentation:** Modal dialog centered vertically, horizontal inset 22px from screen edges, over a dimmed campaign map.

#### Backdrop
- The campaign map remains visible underneath, covered by a scrim: `rgba(6,5,18,0.72)` plus ~3px blur (`backdrop-filter: blur(3px)` — use your platform's blur, or a heavier scrim if blur is expensive).
- Tapping the scrim or "Back to map" dismisses the pop-up.

#### Card container
- Width: screen − 44px (22px inset each side). Border-radius **30px**. Padding **30px 24px 24px**.
- Background: vertical gradient `#241B52 → #141031`.
- Border: 1px `rgba(160,140,255,0.16)`.
- Shadow: `0 40px 100px -20px rgba(0,0,0,0.8)`.
- All content center-aligned.

#### Content, top to bottom
1. **Star cluster (the prize)** — three outlined (empty) stars in a fan:
   - Center star 48px; side stars 38px, offset down 8px and rotated ∓10°.
   - Gap between stars: 12px. Outline color `rgba(206,199,240,0.32)`, stroke ≈1.6px, no fill.
   - If the player has previously earned stars on this level, fill that many gold (`#FFC53D`) — earned state replaces the empty outline.
2. **Stakes caption** — `3★ up for grabs` — 12.5px / 700, color `#FFC53D` (gold), letter-spacing 0.5, margin-top 10px.
3. **Level pill** — `LEVEL 1 OF 20` — margin-top 16px. Pill: padding 6px 14px, radius 999, border 1px `rgba(167,139,250,0.55)`, background `rgba(167,139,250,0.10)`, text 12px / 800, letter-spacing 2px, color `#C4ABFF`, no wrapping.
4. **Title** — `First Steps` — 36px / 800, letter-spacing −1px, color `#FFFFFF`, margin-top 10px.
5. **Subtitle** — `Learn the ropes on a small board.` — 15.5px / 500, color `rgba(206,199,240,0.62)`, line-height 1.45, margin-top 4px.
6. **Challenge pills** — horizontal row, centered, wrap allowed, gap 8px, margin-top 18px. Three pills: `10 dots`, `Easy AI`, `You start`.
   - Pill: padding 8px 16px, radius 999, background `rgba(255,255,255,0.05)`, border 1px `rgba(160,140,255,0.16)`, text 14px / 700 white, `white-space: nowrap`.
7. **Star-economy strip** — margin-top 18px. A rounded panel: padding 14px 16px, radius 16, background `rgba(255,255,255,0.03)`, border 1px `rgba(160,140,255,0.16)`. Contents centered in a row, gap 10px:
   - **BankMeter** — 6 star slots, 17px each, gap 6px. Filled slots are gold `#FFC53D` with a soft glow (`drop-shadow(0 0 6px #FFC53Daa)`); empty slots are outline-only `rgba(206,199,240,0.32)`. Fill count = `totalStarsCollected % 6` (0 for a new player).
   - **Chevron** — 13px, color `rgba(206,199,240,0.32)`, pointing right.
   - **Reward chip** — dice icon 15px gold + `+1 roll` 12px / 800 gold; padding 6px 11px, radius 999, background `rgba(255,197,61,0.12)`, border 1px `rgba(255,197,61,0.3)`, no wrapping.
8. **Primary CTA** — `Start duel` — margin-top 20px. Full-width button: padding 17px vertical, radius 999, text 18px / 800, ink `#1A1140` on lavender gradient `linear-gradient(180deg, #CDBBFF, #A78BFA)`. Shadow: `0 14px 38px -8px rgba(167,139,250,0.7), 0 0 24px rgba(167,139,250,0.35)`. Minimum hit target 44px (this is ~58px).
9. **Dismiss link** — `Back to map` — centered, 15.5px / 700, color `rgba(206,199,240,0.62)`, padding 16px top. Full-width tappable.

## Interactions & Behavior
- **Open:** scale-in from 0.94 → 1 with fade, ~240ms ease-out; scrim fades in simultaneously. Optional: stagger the three stars popping in (60ms apart) after the card lands.
- **Dismiss:** "Back to map", scrim tap, and hardware/gesture back all close the modal (reverse of open, ~180ms).
- **Start duel:** pressed state scales button to 0.97; then navigate to the duel scene for this level.
- **Reduced motion:** skip the scale/stagger; use simple fades.
- No loading or error states — all data is local.

## State Management
Render entirely from one level record + global progress:
```ts
level: {
  n: number,            // 1-based level number → "LEVEL {n} OF {total}"
  name: string,         // "First Steps"
  sub: string,          // one-line description
  challenge: string[],  // ["10 dots", "Easy AI", "You start"]
  earnedStars: 0|1|2|3, // fills the star cluster
}
progress: {
  totalStars: number,       // all stars collected in campaign
  bankedRolls: number,      // Math.floor(totalStars / 6)
  meterFill: number,        // totalStars % 6 → BankMeter fill
}
```
The star → roll rule: **every 6 stars collected banks 1 extra dice roll** (spendable mid-duel; not spent on this screen).

## Design Tokens
| Token | Value |
|---|---|
| Card gradient | `#241B52 → #141031` (vertical) |
| Scrim | `rgba(6,5,18,0.72)` + 3px blur |
| Text primary | `#FFFFFF` |
| Text secondary (muted) | `rgba(206,199,240,0.62)` |
| Text tertiary (faint) | `rgba(206,199,240,0.32)` |
| Violet accent | `#A78BFA` · bright `#C4ABFF` |
| Gold (stars/reward) | `#FFC53D` |
| CTA ink | `#1A1140` |
| CTA gradient | `#CDBBFF → #A78BFA` (vertical) |
| Hairline border | `rgba(160,140,255,0.16)` |
| Active border | `rgba(167,139,250,0.55)` |
| Radii | card 30 · panels 16 · pills/CTA 999 |
| Type | Poppins — 800 display, 700 labels, 500 body |

Type scale on this screen: 36 title · 18 CTA · 15.5 subtitle/back-link · 14 pills · 12.5 caption · 12 level pill.

## Assets
- **Font:** Poppins (Google Fonts) — substitute the game's existing display font if one is established.
- **Icons:** star, five-pip die, chevron — drawn as inline SVG in `helpers.jsx`; recreate with your icon system or copy the SVG paths.
- No raster images.

## Files
| File | Contents |
|---|---|
| `Stakes First Popup.html` | Standalone render of the target design — open in a browser |
| `popup-redesigns.jsx` | `PopupStakes` (the spec'd design) + `LavenderCTA`, `PopPill`, `PopBack` |
| `helpers.jsx` | `COSMIC` tokens, `Star`/`Dice`/`Bolt`/`Chevron` icons, `BankMeter`, campaign data |
| `direction-modals.jsx` | `GhostMap` backdrop reference |
| `direction-a.jsx` | `StarField` background dots (decorative) |
