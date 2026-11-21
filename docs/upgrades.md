# Colortime — Upgrades and Skill Trees

> Exported from the [live document](https://claude.ai/artifact/TJuBHbQqdNrUXzxv85DAZa), which is the version to edit.

Nov 21, 2026 · @Elad

## The goal, and the three jobs of color

The player's goal is to fill the Gallery with paintings, and every color has exactly one of three jobs on the way there: grow, research or paint.

This is a proposed change to the first design, where every color did a bit of everything. It gives an idle player one sentence to hold on to: primaries grow the wheels, secondaries research new tricks, and blended colors paint.

| Job | Colors | How you get them | What they buy | Where it shows |
| --- | --- | --- | --- | --- |
| Grow | Red, Yellow, Blue | Rings | Ring levels and the Workshop tree | On the wheel |
| Research | Orange, Green, Violet | Rings, once discovered | The Research tree: automation, slots, wheels, offline | Research tab |
| Paint | Teal, Amber, Vermilion and the other blends; later tints and shades | Only from two neighbouring rings blending | Painting cards, nothing else | Easel |
| Reset | White, Black | Fresh Canvas | The Technique tree | After a reset |

What this buys:

- **A clear answer to “what am I doing?”** The main screen always shows the next painting and the pigments it still needs.
- **Not every color opens something.** Painting colors are pure goods. That keeps the trees small and makes paintings feel like the reward.
- **Three resource groups, three trees.** Each tree has its own currency family, so progress in one never starves another.
- **A reason to rearrange wheels.** Painting colors come from which rings sit next to each other, so each new painting is a small layout puzzle.

## Rings: you choose, and it matters

The player chooses which color goes in which ring, and three things make that choice strategic: rhythm, neighbours and triggers.

### How you choose

- A tray of color chips sits under the wheel. Drag a chip onto a ring, or tap a ring and then a chip.
- Swapping is free and instant, and levels stay with the ring slot. Trying a layout never costs anything.
- While a chip is held, the wheel previews the result: the new blends and their rates appear before the drop.
- A saved layout can be reapplied in one tap after a reset.

### Why one ring over another

| Reason | Rule | So the player thinks |
| --- | --- | --- |
| Rhythm | Outer rings turn in seconds and pay little; inner rings turn in minutes or hours and pay the most per second | “The color I need most goes near the hub.” |
| Neighbours | Two rings that touch blend into the color between them, at 20% of the slower ring's output | “I need Teal, so Blue must sit beside Green.” |
| Triggers | Chimes, card drops and tap bonuses fire per turn, so they fire most on outer rings | “My chime color goes on the rim.” |

The three pull against each other. The hub is the best place for output, but a ring there has only one neighbour, so it makes one blend instead of two.

### The blend rule in full

- Red beside Yellow trickles Orange. Yellow beside Blue trickles Green. Red beside Blue trickles Violet.
- A primary beside a secondary trickles the painting color between them: Blue beside Green gives Teal.
- Opposites such as Red and Green do not blend. They contrast instead, and both chime harder.
- A wheel with six rings has five seams, so at most five blends. Which five is the puzzle.
- Blending enough of a secondary discovers it. From then on it can be placed as a ring of its own.
- Painting colors can never be placed as rings. A wheel layout is the recipe for the painting colors it makes.

This replaces the mixing screen and the harmony table as the first thing a player learns. Harmony bonuses can return later as a Research unlock.

## The four trees at a glance

*Diagram: four trees · what pays for each. See the [live document](https://claude.ai/artifact/TJuBHbQqdNrUXzxv85DAZa).*

Painting colors appear in no tree: they buy painting cards, and paintings are what pay Renown. The trees unlock in this order, at about minute 2, minute 30, day 1 and day 3.

## Workshop tree: paid in primaries

The Workshop is the everyday tree: small upgrades bought many times, each rank costing more than the last, with each primary owning one kind of power.

Red buys strength, Yellow buys speed, Blue buys thrift. A player short on one primary feels it as a specific weakness, which tells them which ring to level.

Base costs are placeholders. “Growth” is how much each rank's price multiplies.

### Red branch: strength

| Upgrade | Each rank gives | First cost | Growth | Ranks |
| --- | --- | --- | --- | --- |
| Heavy Stroke | Red rings pay +25%, on every wheel | 100 Red | x1.6 | No limit |
| Thick Paint | Every ring pays +10% | 2K Red | x2.2 | No limit |
| Hub Weight | The innermost ring of each wheel pays +20% | 5K Red | x2.5 | No limit |
| Bold Chime | Chimes pay +0.5x more | 5K Red | x3 | 10 |

### Yellow branch: speed

| Upgrade | Each rank gives | First cost | Growth | Ranks |
| --- | --- | --- | --- | --- |
| Rim Runner | The outer ring of each wheel turns 10% faster | 50 Yellow | x2 | No limit |
| Quick Yellow | Yellow rings turn 10% faster, wherever they sit | 300 Yellow | x1.8 | No limit |
| Light Touch | A tap advances rings 0.5 s more | 1K Yellow | x2.5 | 10 |
| Head Start | Every turn begins 2% filled | 8K Yellow | x3 | 15 |

### Blue branch: thrift

| Upgrade | Each rank gives | First cost | Growth | Ranks |
| --- | --- | --- | --- | --- |
| Thin Coats | Ring levels cost 3% less | 200 Blue | x2.4 | 20 |
| Deep Wells | Offline cap +15 minutes | 500 Blue | x2 | 24 |
| Blue Reserve | Blue rings earn +10% while offline | 1K Blue | x1.8 | No limit |
| Cool Head | Red and Yellow branch upgrades cost 2% less | 10K Blue | x3 | 15 |

### Chords: paid in two primaries

These sit where two branches meet and unlock after ten ranks in each.

| Upgrade | Each rank gives | Paid in | Growth | Ranks |
| --- | --- | --- | --- | --- |
| Wet on Wet | Blends carry +2% more, from 20% up to 40% | Yellow and Blue | x2.5 | 10 |
| Colorfast | After a tap, all rings run 20% faster for 1 s longer | Red and Yellow | x2.2 | 10 |
| Underpainting | Ring milestones arrive 2% sooner | Red and Blue | x3 | 10 |

A ring that already turns faster than four times a second gains yield from speed upgrades instead, so nothing bought is ever wasted.

## Research tree: paid in secondaries

Research is the unlock tree: mostly one-time nodes that add a new capability, each a visible goal the player saves toward.

Orange automates, Green expands, Violet reveals. Nodes are laid out as a real tree, and a locked node shows its price so the player can aim a wheel at it.

### Orange branch: automation

| Node | What it unlocks | Paid in | Type |
| --- | --- | --- | --- |
| Apprentice | A wheel keeps earning while the game is closed | Orange | One per wheel |
| Buy x10 and Max | Bulk level buttons | Orange | Once |
| Auto-Brush | Apprentices buy ring levels on their own | Orange | Once |
| Blueprints | Save a wheel layout and reapply it in one tap | Orange and Green | 3 slots |
| Studio Assistant | One tap rearranges a wheel to make the pigments the next painting needs | Orange and Violet | Once |
| Standing Orders | Workshop upgrades can be queued and bought as pigment arrives | Orange and Violet | Once |

### Green branch: expansion

| Node | What it unlocks | Paid in | Type |
| --- | --- | --- | --- |
| Ring slots 4, 5 and 6 | One more ring inward on every wheel | Green | 3 steps |
| New wheel | Wheels 2 to 6 | Green, then Green and Orange | 5 steps |
| Frames | Metronome, Sundial, Gear and Hourglass wheel types | Green | 4 nodes |
| Long Night | Offline cap +2 hours | Green | 4 steps |
| Wraparound | The hub ring also blends with the rim, adding a sixth seam | Green and Violet | Once |

### Violet branch: insight

| Node | What it unlocks | Paid in | Type |
| --- | --- | --- | --- |
| Blend Preview | Shows blend rates before a chip is dropped | Violet | Once |
| The Muse | A butterfly that brings a short rush when tapped | Violet | Once |
| Contrast | Opposite colors side by side chime for double | Violet | Once |
| Harmony | Whole-wheel bonuses for color schemes such as triads | Violet and Orange | Once |
| Critic's Whisper | Shows which card would raise a painting's score | Violet and Green | Once |
| Lucky Sketch | Chimes drop sketch cards 5% more often | Violet | Repeatable, growth x2.5 |
| Double Dip | A blend has a 3% chance to pay twice | Violet | Repeatable, growth x2.2 |

Each branch ends in a repeatable node. A finished tree still has somewhere to put pigment.

## Gallery tree and Technique tree

Paintings pay Renown and resets pay Inspiration; each has a small permanent tree, so the two long-term actions both have somewhere to lead.

### Gallery tree: paid in Renown

Renown comes only from painting. This tree is the answer to “why paint more?”

| Node | What it gives | Type |
| --- | --- | --- |
| Hooks | One more painting on the wall | Repeatable, growth x1.5 |
| Rooms | A new themed room with its own set bonus | 8 rooms |
| Good Light | Bonuses from hung paintings are 5% stronger | Repeatable, growth x2 |
| Sketch Choice | Card drops offer a pick of two, then three | 2 steps |
| Commission Board | A second, then third, collector order at once | 2 steps |
| Painting colors, tier 2 | Tints and shades become blendable, opening new cards | Once |
| Patron | A visitor who buys duplicate paintings for primaries | Once |

### Technique tree: paid in Inspiration

Inspiration comes only from Fresh Canvas. This tree survives every reset.

| Node | What it gives | Type |
| --- | --- | --- |
| Inspired | All pigment +2% for each unspent point | Passive |
| White, then Black | New rings that tint and shade their neighbours | 2 nodes |
| Primed Canvas | Each run starts with ring slot 2 open, then 3 | 2 steps |
| Old Habits | The Orange research branch is kept through resets | Once |
| Muscle Memory | Workshop ranks cost 10% less each run | Repeatable, growth x2 |
| Wheels 7 to 12 | More room on the Studio wall | 6 steps |
| Spotlight | One wheel keeps its focus bonus while the game is closed | Once |

### What a reset keeps

| Tree | Fresh Canvas | Movement |
| --- | --- | --- |
| Workshop | Wiped | Wiped |
| Research | Wiped, except branches protected by Old Habits | Wiped |
| Gallery | Kept | Kept |
| Technique | Kept | Wiped, paid back as Legacy |

## How repeatable upgrades scale

A repeatable upgrade gives the same small bonus every rank while its price multiplies, so each one stays worth buying for months without ever being the only thing worth buying.

The price of rank r, with first cost b and growth g:

```latex
\text{cost}(r) = b \cdot g^{\,r}
```

| Class | Growth | Used for | Feels like |
| --- | --- | --- | --- |
| Cheap | x1.5 to x1.8 | One color or one ring position, such as Quick Yellow | Bought every session |
| Standard | x2 to x2.5 | Wheel-wide bonuses, such as Thick Paint | Bought every day or two |
| Steep | x3 and up, with a rank cap | Rule-bending effects, such as Head Start | A milestone each time |

Rules that keep the numbers healthy:

- **Add inside, multiply across.** Ranks of one upgrade add up: ten ranks of +10% is +100%. Different upgrades multiply each other.
- **Every tenth rank is a landmark.** Rank 10, 20, 30 and so on doubles that upgrade's total bonus. Players push for the next landmark instead of spreading evenly.
- **Discounts are capped.** Anything that lowers costs has a rank limit, so prices can never reach zero.
- **Speed turns into yield.** Past four turns a second, extra speed is paid out as extra pigment.
- **The cheapest next rank is always shown first.** The Workshop sorts by time-to-afford, so a ten-second visit ends in a purchase.

With uncapped Cheap and Standard upgrades in every branch, the Workshop never runs out. Fresh Canvas wipes it, and regrowing it faster each run is the pleasure of the reset.

## Stranger ideas worth testing

These are the upgrades that change how the game is played, not just how fast; each would be a late node in one of the trees.

| Idea | What happens | Why it is interesting | Tree |
| --- | --- | --- | --- |
| Noon Strike | When every ring on a wheel finishes within the same second, the wheel pays twelvefold | Players tune ring speeds to line up, like setting a clock | Workshop chord |
| Wraparound | The hub blends with the rim | Turns a line of five seams into a loop of six, and reshuffles every layout | Research, Green |
| Ghost Ring | A seam with enough blend upgrades becomes a thin ring of its own | A painting color briefly behaves like a real ring | Research, Violet |
| Pentimento | Painting over a hung picture keeps a quarter of the old bonus | Old paintings are never wasted; walls gain history | Gallery |
| Series | Five paintings of one subject on different grounds earn a mastery star | A reason to repaint, and a collection inside the collection | Gallery |
| Limited Palette | Start a run with only two primaries for extra Inspiration | A challenge mode in the manner of Antimatter Dimensions | Technique |
| Color of the Day | One hue runs double each real weekday | A light reason to open the game and rearrange | Research, Violet |
| Slow Dry | A finished painting left four hours before hanging earns bonus Renown | A calm return hook with no penalty for skipping | Gallery |
| Gear Train | A wheel's chimes push its neighbour's rim forward | Makes position on the Studio wall matter | Research, Green |
| Studio Assistant | One tap lays out a wheel for the next painting | The late-game answer to rearranging twelve wheels by hand | Research, Orange |

Noon Strike, Wraparound and Pentimento are the three I would prototype first. Each is one rule, easy to explain, and changes decisions.

## Open questions

- [ ] Is “primaries grow, secondaries research, blends paint” the split to build on? It changes the main design document.
- [ ] Should painting colors be blend-only, or should a few be placeable as rings late in the game?
- [ ] Is 20% the right starting blend rate? Too low and painting stalls; too high and layout stops mattering.
- [ ] Does Research reset on Fresh Canvas? Wiping it gives resets weight; keeping it is kinder.
- [ ] How many Workshop upgrades are visible at once on a phone: three, or a scrolling list?
- [ ] Does the first painting need only primaries and one blend, so it lands inside ten minutes?

The matching screens are in the [game mockups](https://claude.ai/artifact/RqAHkyBWPu7e4zKSS5BMyH), and the wider design is in the [design document](https://claude.ai/artifact/CwqGtXJiBPhv61rEJ5qCVR).
