# Economy: the painter's studio

This replaces the parts of `design.md` and `upgrades.md` where paint colors were spent on upgrades. The prototype in `game/` follows this.

## The chain

**Each color is a fixed row that makes paint in turns → paint lands in its tin well when a turn completes → the easel takes paint from the tin for the commission you accepted → sell it for coins or hang it → coins buy levels, rows, apprentices, wells and boosts.**

There is nothing to configure. The only question is what to buy next, as in AdVenture Capitalist.

| Piece | How it works |
| --- | --- |
| Color rows | Red, yellow, blue, then mixes, then paints: twelve fixed rows in three tiers. Tap a row's dial to run one turn; each higher tier turns slower |
| Mixing | A mix takes its two parent colors from the tin at the start of every turn (orange takes red and yellow). If a parent is short, the row waits and says which one |
| Paint arrives on completion | Nothing trickles in early. The tin, and the painting, only change when a turn finishes |
| Tin | One well per color, 50 to start. Paint that doesn't fit spills. "Well ×2" appears on a full row |
| Apprentices | One per row, hired from the row. Keeps that row turning by itself, including offline |
| Boosts | "×2" on the row: doubles output without taking more parent paint |
| Commissions | Three offers at a time (the first three are fixed lessons). Tap one to put it on the easel; the easel takes paint for it as it arrives. Swap an offer with ↻ |
| Sell or hang | Sell for coins, or hang (three hooks): the painting's colors turn 10% faster for good |
| Studio | Good Frames, Oiled Wheels, Art Agent (sells and takes the best commission for you), Bigger Canvas, Deep Wells |

## The main screen

Everything is on one screen, with no scrolling: coins and the buy toggle (×1, ×10, ×100, Max), the easel strip (the current painting and what it still needs, or the three offers), the color wheel (one ring per unlocked color; tap it to start every idle row), tier tabs, and up to six color rows. Each row carries its own buy button and one contextual action (Hire, Well ×2 or ×2 boost). A one-line coach under the wheel says what to do next.

## Why it changed

The ring-placement version asked players to configure wheels, and it was not always clear what to do. Fixed rows keep color theory in the recipes (orange = red + yellow) while the decisions become simple purchases. Mixing still creates an economy: commissions that want a lot of orange mean red and yellow must keep up.
