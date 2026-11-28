# Lonesome Dove / Christmas — DRAFT, not wired up

A mockup, not a shipped theme. `index.html` does not load this and there is
no theme switch yet. Nothing here affects the live app.

## Why it isn't live

The organizer asked to see it before deploying. The token refactor it needs
landed on 2026-11-27 (`--on-gold` and friends); the remaining piece is a
`club.theme` column plus `body[data-theme]`, deliberately deferred until
after the January meeting so a purely cosmetic change doesn't risk a run of
meetings that have all gone cleanly.

## To look at it

    python -m http.server 8420
    # then, in a scratch copy only — never index.html:
    #   insert  <link rel="stylesheet" href="themes/lonesome-dove/theme.css">
    #   straight after the closing </style>

To reach the voting screens without opening a phase on the live meeting, add
this just before the IIFE's closing `})();` **in the scratch copy**:

    window.__pv = { get STORE(){return STORE}, render, M, book };

then from the console:

    __pv.M().phase = 'approval'; __pv.render();

## What the colours are

Sampled from the organizer's own artwork, not invented:

| role | value |
|---|---|
| page | `#1B0F0B` warm brown |
| app background | `#10220F` near-black green |
| card | `#1B361D` forest green |
| gold | `#E2B977` |
| body text | `#EFEDE4` |
| red accent | `#5E1D1C` |

Contrast is *better* than the live light palette: gold heading on green is
7.39:1 (AAA) where gold on cream is 2.57:1 and fails. The selected-card
border goes from 2.87:1 to 7.19:1.

## Known work remaining

- 37 selector overrides in `theme.css`. Most exist only because the base CSS
  lacked roles; after the 2026-11-27 refactor many collapse into tokens, and
  whichever still need a selector mean a role is still missing from the base.
  **A theme should set tokens and nothing else.** Fix the base instead.
- The header is a real image file (88KB). Shipping means serving it from
  here, not inlining it as a data URI.
- The logo is navy artwork drawn for a light background and disappears on
  dark green. This draft hides it and uses the photograph, where the logo is
  already on a lit sign. A light-background logo variant would be the other
  way.
- Christmas has a short season and the club skips December. Needs the switch
  before it goes anywhere near the live site.
