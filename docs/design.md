# Colortime — Game Design Document

> Exported from the [live document](https://claude.ai/artifact/CwqGtXJiBPhv61rEJ5qCVR), which is the version to edit.

Nov 21, 2026 · @Elad

## Summary

Colortime is a cozy idle game where clock-like color wheels fill ring by ring, pay out pigment, and fund paintings the player composes from layered transparent cards.

The player starts with one wheel and one red ring. Each full turn of a ring pays pigment. Pigment buys more rings, closer to the center, slower and richer. Colors mix into new colors, wheels multiply into a Studio, and pigment becomes paintings that hang in a Gallery and boost everything.

The design rests on four pillars:

- **The wheel is the build.** Which color sits in which ring, and which colors share a wheel, decides what the wheel is good at. Real color theory (complementary, analogous, triad) is the synergy system.
- **Three clocks, three rhythms.** Outer rings turn in seconds, middle rings in minutes, the hub in hours. The same wheel rewards a ten-second glance, a five-minute session and a return after lunch.
- **Pigment has a purpose.** Numbers going up end in something the player made: a unique, nameable, shareable painting.
- **Generous by default.** No forced ads, ever. Ads are an offer the player accepts; spending buys time, comfort and beauty, not a win.

| Decision | Choice |
| --- | --- |
| Platform | iOS and Android, portrait, one-thumb play |
| Audience | Idle players who want calm and craft; fans of aesthetic games such as I Love Hue |
| Session shape | 1 to 5 minutes, 4 to 8 times a day |
| Core differentiator | Color theory as the build system, plus player-made layered paintings |
| Monetization | Rewarded ads only, ad-free pass, time skips, season pass, skins, painting collections |
| Content horizon at launch | 4 to 6 weeks before the second prestige layer runs out |

*Diagram: core loop · wheels, pigment, three sinks. See the [live document](https://claude.ai/artifact/CwqGtXJiBPhv61rEJ5qCVR).*

Everything the player buys, paints or resets for feeds back into faster wheels; that return arrow is the whole game.

## Market and positioning

The market favours exactly the model asked for: opt-in rewarded ads plus in-app purchases, with purchases carrying most of the revenue in rich countries.

### What the data says

Most figures below come from vendor blogs and secondhand report summaries. Treat them as direction, not as targets to bank on.

| Finding | Figure | Source |
| --- | --- | --- |
| Hybrid games out-earn ad-only games | Hybrid-casual ARPDAU $0.15 to $0.50, against $0.01 to $0.05 for ads-only casual | [Playio ARPDAU benchmarks](https://blog.playio.co/arpdau-benchmarks-mobile-games) |
| Purchases dominate in the best markets | IAP is 77 to 90% of revenue in the US, Canada, South Korea and Japan; ads are 55 to 70% in India, Indonesia and Brazil | [Sensor Tower via GameDev Reports](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization) |
| Rewarded video pays best per view | US average eCPM $16.49 on Android and $19.63 on iOS; interstitials about $10, banners about $1.20 | [Playio rewarded benchmarks](https://blog.playio.co/rewarded-ad-benchmarks-2026) |
| Players finish ads they chose | Completion above 95%, against 60 to 70% for forced formats | [Playio rewarded benchmarks](https://blog.playio.co/rewarded-ad-benchmarks-2026) |
| The median game retains almost nobody | Median D7 just under 4%, D30 0.7 to 0.8%; top 10% reach about 40% D1 and 11 to 12% D7 | [GameAnalytics 2026 via GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game) |
| Idle starts strong on day one | Idle titles typically open at 40 to 70% D1 | [AppMagic on idle games](https://appmagic.rocks/blog/idle-steam-games-2026) |
| Mobile idle revenue is flat, not growing | Peaked in 2022, back to 2022 levels by mid-2023 | [AppMagic on idle games](https://appmagic.rocks/blog/idle-steam-games-2026) |
| Hits are still possible | Gold and Goblins passed $163M in IAP; Idle Lumber Empire passed $113M | [AppMagic on idle games](https://appmagic.rocks/blog/idle-steam-games-2026) |

### What this means for Colortime

- **Build for purchases, use ads as a second payment method.** An ad-only Colortime would earn a tenth as much per player.
- **Day 7 and day 30 decide the business.** Idle games win on long retention, so the Studio, paintings and prestige must be visible goals by day two.
- **A flat genre rewards a fresh theme.** Most mobile idle games are tycoons about mines, factories and shops. A calm, abstract, beautiful one has little direct competition.
- **The recent wave is cozy.** Small, good-looking idle games such as Rusty's Retirement and Cast n Chill sold hundreds of thousands of copies on Steam in 2025. That taste exists on phones too.

### Reference games and what to borrow

| Game | Borrow | Leave |
| --- | --- | --- |
| AdVenture Capitalist | Generators with rising cycle times, milestone doublings, managers, square-root prestige | Flat theme, upgrade-list screens |
| Idle Miner Tycoon | Many sites, each with its own manager and progress | Manager gacha |
| Egg, Inc. | Polish, a two-hour offline cap raised by upgrades, timed contracts | Slow prestige curve |
| Cookie Clicker | The golden cookie: a random, tappable windfall | Desktop-style clicking load |
| I Love Hue | Proof that pure color sells as an aesthetic | Puzzle structure |
| Canvas, the board game | Layered transparent cards scored against goals | Its art, names, icons and scoring cards |

The one-line store pitch: build clocks made of color, mix a palette, and paint a gallery that is only yours.

## The wheel

A wheel is a clock face of up to six concentric rings; each ring holds one color and pays pigment every time its arc completes a turn.

*Diagram: wheel anatomy · six ring slots. See the [live document](https://claude.ai/artifact/CwqGtXJiBPhv61rEJ5qCVR).*

The ring colors here only tell the slots apart; in the game each slot shows whichever pigment the player placed in it.

### How a ring behaves

- **Fill.** The arc sweeps clockwise from 12 o'clock. On a full turn it pays its yield in pigment of its color, flashes and restarts.
- **Tap.** A tap anywhere on the wheel advances every ring by one second. It matters a lot for the rim and barely at the hub, so active play helps early and fades naturally.
- **Chime.** Every 12th turn of a ring chimes and pays triple. Chimes are the hook for later bonuses, card drops and sound design.
- **Flow.** Once a ring turns faster than 0.25 seconds it becomes a solid glowing band and pays per second. This keeps late-game wheels calm instead of strobing.

### Ring slots

The slot decides rhythm and payout; the color placed in it decides which pigment comes out. Inner slots pay more per second but in rarer, larger lumps.

| Slot | Position | Base turn | Yield multiplier | Pigment per second at level 1 | Role |
| --- | --- | --- | --- | --- | --- |
| 1 | Rim | 2 s | x1 | 0.5 | Tapping, instant feedback |
| 2 |  | 8 s | x8 | 1 | First purchase goal |
| 3 |  | 40 s | x80 | 2 | In-session payoffs |
| 4 |  | 4 min | x960 | 4 | End-of-session payoffs |
| 5 |  | 30 min | x14,400 | 8 | Return-later payoffs |
| 6 | Hub | 4 h | x230,400 | 16 | Daily rhythm, offline value |

These are starting values for the balance simulator, not final tuning.

### What the player buys on a ring

- **Levels** raise yield per turn. Cost grows exponentially per level; buy x1, x10 or max.
- **Milestones** at levels 25, 50, 100, 200 and every 100 after double the ring's speed. Once a ring is in Flow, milestones double yield instead.
- **Slots** open inward one at a time. Each new slot costs roughly twelve times the last.
- **Recolor** moves a color to a different slot for free. Levels belong to the slot, so experiments are never punished.

### The first ten minutes

1. Second 0: one wheel, one red rim ring, already turning. No tutorial text before the first payout.
2. Second 10: first level bought. Second 60: slot 2 opens and Yellow is placed.
3. Minute 3: Blue arrives in slot 3. The wheel now shows three rhythms at once.
4. Minute 5: the first mix. Red and Yellow unlock Orange, and the Palette screen opens.
5. Minute 8: the first Apprentice is hired, and the game explains offline earnings.
6. Minute 10: the first sketch card drops from a chime, teasing the easel.

## Colors and mixing

Colors unlock in tiers around the painter's red-yellow-blue wheel; each new color is a new pigment to earn and a new ring to place.

| Tier | Colors | Unlocked by | Arrives |
| --- | --- | --- | --- |
| Primary | Red, Yellow, Blue | Red is free; Yellow and Blue are bought with earlier primaries | Minutes 0 to 3 |
| Secondary | Orange, Green, Violet | Mixing two primaries | Minutes 5 to 30 |
| Tertiary | Vermilion, Amber, Chartreuse, Teal, Indigo, Magenta | Mixing a primary with a neighbouring secondary | Days 1 to 3 |
| Neutral | White, Black | First and third prestige | Days 2 to 7 |
| Tints and shades | 12 tints such as Pink, 12 shades such as Navy | Mixing any hue with White or Black | Weeks 1 to 3 |
| Lustres | Gold, Silver, Iridescent | Later Movements | Month 2 onward |

### Mixing rules

- A mix is a one-time recipe: pay both parent pigments once and the child color joins the Palette for good.
- A mixed ring does not consume its parents while it runs. Its levels are paid for in parent pigments instead.
- So every earlier color stays useful, and nobody has to babysit a conversion chain.
- A cost never asks for more than two pigments. The header bar shows only the pigments the current screen needs.
- The Palette Knife swaps ten of any pigment for one of a neighbouring color. It is a deliberately poor rate that prevents dead ends.

### Harmony: the build system

The set of hues on one wheel forms a harmony, and the harmony decides what that wheel is good at. Only the strongest active harmony applies, and it grows with the number of rings that take part.

| Harmony | Rule on the wheel | Bonus | Plays as |
| --- | --- | --- | --- |
| Monochrome | One hue with its tints and shades | Up to +100% speed | A fast specialist that floods one pigment |
| Analogous | Three or more neighbouring hues | Up to +60% yield | The steady all-rounder |
| Complementary | Two opposite hues, such as Red and Green | Chimes pay x6 instead of x3 | Bursty; rewards tapping and chime upgrades |
| Triad | Three evenly spaced hues | Levels on this wheel cost 25% less | The cheap scaler for new wheels |
| Spectrum | Six different hues, every slot filled | The wheel also produces Light | The late-game utility wheel |

Harmony is why a second and third wheel are interesting. One wheel cannot be fast, bursty and cheap at once, so players specialise wheels and argue about builds.

Every color also carries a glyph and a name, so the game never depends on telling hues apart.

## The Studio

The Studio is a wall of up to twelve wheels, each started from an empty frame and specialised by the player.

### Growing the wall

- Wheel 2 unlocks near the end of the first session, paid in two secondary colors.
- Wheels 3 to 6 unlock through the first two weeks with escalating pigment costs.
- Wheels 7 to 12 come from prestige upgrades and Movements, so the wall keeps growing for months.
- A new wheel always starts empty. Blueprints save a layout and reapply it in one tap, which matters after every reset.

### Frames

The frame is chosen when a wheel is built and gives it a personality. Changing a frame later costs pigment, not real money.

| Frame | Trait | Suits |
| --- | --- | --- |
| Clock | Balanced; chimes every 12 turns | The default |
| Metronome | Taps count five times | Active players, Complementary builds |
| Sundial | Double offline earnings, no tap bonus | Players who check in twice a day |
| Gear | +15% speed for each neighbouring Gear | Wall-layout puzzles |
| Hourglass | Banks up to 20 turns, then releases them in one tap | Short, satisfying sessions |
| Rose Window | Harmony bonus is 50% stronger | Late-game specialists |

### Hands

Each wheel has one to three hand slots. Hands are equipment earned from achievements, commissions and events, never sold for money.

- **Second hand:** rim and slot 2 turn 25% faster.
- **Minute hand:** milestones arrive 10% sooner on this wheel.
- **Hour hand:** the hub ring pays double.
- **Gilded hand:** chimes have a small chance to drop a sketch card.

### Focus and Spotlight

- Tapping a wheel on the wall zooms into it. The focused wheel runs at double speed while it is on screen.
- The wall view shows every wheel turning in miniature, with chimes rippling across it. This is the screenshot that sells the game.
- Spotlight, a prestige unlock, pins the focus bonus to one wheel for four hours while the player is away.
- Neighbouring wheels with the same harmony resonate for +10% each, which makes wall placement a light puzzle.

### What a late-game wall looks like

| Wheel | Build | Produces |
| --- | --- | --- |
| Workhorses, 4 to 6 wheels | Monochrome or Analogous, Clock or Gear | Bulk pigment for levels |
| Burst wheel | Complementary, Metronome | Chime rewards and sketch cards |
| Night wheel | Analogous, Sundial | Offline income |
| Prism | Spectrum, Rose Window | Light, for Gallery expansion |
| Commission wheel | Rebuilt as needed | The exact pigments today's painting needs |

## Paintings and the Gallery

A painting is one opaque ground plus three transparent layer cards, paid for in pigment, scored by critics and hung for a permanent bonus.

### From set paintings to your own

The first paintings are fixed so they can teach; after that the player composes freely from a background and two or three pieces.

| Stage | Paintings | What the player decides | What it teaches |
| --- | --- | --- | --- |
| Set | 1 to 5 | Nothing: each painting names its pieces and its pigments | One new idea each: a first blend, a second wheel, moving a color, a research unlock, hanging |
| Guided | 6 to 12 | One piece is open, chosen from two or three options | That pieces change the picture, the cost and the bonus |
| Free | 13 onward | Everything: one background plus two or three pieces from the binder | Composition, critics, and building wheels for a plan of your own |

- In the free stage the player pins a composition as the goal. The main screen then tracks the pigments those exact pieces need.
- The third piece slot opens later, through the Gallery tree. Two pieces keep early paintings cheap and readable.
- Set paintings are the same for everyone. Free paintings are unique, carry the player's title and signature, and are the ones worth sharing.
- A suggested composition is always offered, so a player who only wants to idle is never stuck choosing.

### Making a painting

1. **Collect cards.** Sketch cards drop from chimes, daily commissions, the season pass and events. There are four kinds: Ground, Subject, Detail and Light.
2. **Compose on the easel.** Pick one card of each kind. The preview updates live, and the three transparent layers can be reordered.
3. **Read the motif strip.** Each card shows one or two motifs in five positions along its bottom edge. An upper layer hides the motif beneath it, so order changes the result.
4. **Please the critics.** Three critics are active each week. Each has a rule, such as one of every motif, pairs only, or no more than three visible.
5. **Pay in pigment.** Each card lists its cost in one or two colors. A heron subject might cost Teal and White.
6. **Sign it.** The game builds a title from the cards' name fragments. The player can rename it.

### What a painting gives

- **Renown**, from critic stars. Renown buys Gallery rooms and hooks.
- **A hung bonus.** Each painting grants a buff set by its cards, such as +15% Teal yield or richer chimes.
- **Room sets.** Each Gallery room has a theme. Filling it with matching paintings adds a set bonus.
- **Collector orders.** Collectors ask for a painting with given motifs and pay in rare pigment or cards.
- **A shareable image.** One tap exports the framed, signed painting. This is the game's organic marketing.

Hooks are limited: three at first, about thirty in a full Gallery. Choosing what hangs is a build decision, like choosing a harmony.

### Why it fits the wheels

Paintings close the loop. Each card wants specific pigments, so tomorrow's painting changes which colors today's wheels should make. That keeps players rebuilding wheels instead of leaving one optimal layout running forever.

### Launch content

| Card kind | Count | Notes |
| --- | --- | --- |
| Ground | 12 | Opaque washes, skies, walls |
| Subject | 24 | The focal figure or object |
| Detail | 24 | Foreground and framing elements |
| Light | 12 | Atmosphere, weather, glow |

That is 82,944 possible paintings before layer order, from 72 pieces of art.

Cards must be drawn on one shared grid with agreed zones so that any combination composes well. This is the largest art cost in the game and needs a style test before production.

The mechanic is inspired by the board game Canvas. Colortime uses its own art, card names, motif icons and critic rules.

## Progression

Progress comes in three layers: upgrades inside a run, a prestige reset called Fresh Canvas, and a larger era change called a Movement.

### Inside a run

| Mechanic | What it does | Borrowed from |
| --- | --- | --- |
| Apprentices | One per wheel. Earns offline for that wheel, then auto-buys levels at higher ranks | AdVenture Capitalist managers |
| Milestones | Speed doublings at set ring levels; a wheel-wide bonus when every ring passes the same mark | AdVenture Capitalist |
| Studies | Achievements. Each gives +1% to all pigment, permanently | Cookie Clicker |
| The Muse | A butterfly crosses the screen every few minutes. Tapping it grants a 30-second x7 rush or a lump of pigment | Cookie Clicker's golden cookie |
| Commissions | Three daily tasks, such as mixing a color or earning 50 chimes, paid in cards and Gold Leaf | Egg, Inc. contracts |
| Collector orders | Timed requests for a painting with given motifs | Idle tycoon order boards |
| Blueprints | Saved wheel layouts, reapplied in one tap | Factory games |

### Fresh Canvas: the first prestige

- The player wipes wheels, levels and pigment and receives Inspiration based on lifetime pigment earned.
- Each point of Inspiration adds 2% to all production. Points can instead be spent in the Technique tree.
- The Technique tree holds the big unlocks: White, Black, wheel slots 7 to 9, Spotlight, longer offline caps and auto-mixing.
- Paintings, cards, the Gallery, hands, frames and cosmetics all survive.
- The first Fresh Canvas should feel right on day two or three. The second run should reach the old peak in under an hour.

### Movements: the second prestige

A Movement resets Inspiration too, pays Legacy, and changes one rule of the game. Each one also reskins the wheels and adds a card collection.

| Movement | Rule change | New content |
| --- | --- | --- |
| Atelier | The starting rules | Primaries to tertiaries |
| Impressionism | Light becomes a pigment; time of day shifts which hues run faster | Sundial frame, outdoor card set |
| Modernism | Rings can be split into two half-rings of different colors | Gear frame, geometric card set |
| Pop | Complementary chimes chain into neighbouring wheels | Lustres, print-style card set |
| Digital | Mixing flips to light: red, green and blue, where all three make White | Pixel card set, screen-glow fills |

Only Atelier and Impressionism need to ship at launch. The rest are the first year of updates.

### What the player is doing, and when

| When | Goal | New systems |
| --- | --- | --- |
| Minutes 0 to 10 | Fill the first wheel with three primaries | Levels, slots, first mix, first Apprentice |
| First session | Mix all three secondaries, open wheel 2 | Harmony, Muse, first painting |
| Day 1 | Fill the first Gallery room | Critics, commissions, frames |
| Days 2 to 3 | First Fresh Canvas | Inspiration, Technique tree, White |
| Week 1 | Four wheels, tertiaries, tints | Hands, collector orders, season pass |
| Weeks 2 to 4 | Six or more specialised wheels, Black, Spectrum wheel | Light, Spotlight, first weekend Exhibition |
| Month 2 onward | First Movement | Legacy, new rule, new collection |

## Upgrade catalogue

Upgrades and skill trees now live in their own document: [Colortime — Upgrades and Skill Trees](https://claude.ai/artifact/TJuBHbQqdNrUXzxv85DAZa). It proposes giving each color group one job (grow, research, paint) and making painting colors come from neighbouring rings, which would replace parts of the mixing and harmony sections above if adopted.

## Economy and balance

Costs grow exponentially while production grows linearly with doublings on top; that gap is what makes every idle game slow down and ask for the next system.

The formulas follow Anthony Pecorella's [The Math of Idle Games, part I](https://gamedeveloper.com/design/the-math-of-idle-games-part-i) and [part III](https://gamedeveloper.com/design/the-math-of-idle-games-part-iii).

### Ring cost and income

The cost of the next level, with base cost b, growth rate g and n levels owned:

```latex
\text{cost}(n) = b \cdot g^{\,n}
```

Buying k levels at once, which the buy-max button needs:

```latex
\text{cost}(n, k) = b \cdot g^{\,n} \cdot \frac{g^{\,k} - 1}{g - 1}
```

Pigment per second from one ring, where M collects every multiplier:

```latex
\text{income} = \frac{\text{level} \times \text{slot yield} \times M}{\text{turn time}}
```

| Parameter | Starting value | Reasoning |
| --- | --- | --- |
| Growth rate, rim ring | 1.07 | AdVenture Capitalist's first generator uses 1.07 |
| Growth rate, hub ring | 1.15 | Inner rings should stall sooner and need multipliers |
| Slot unlock cost | About x12 per slot | Each slot is a session-sized goal |
| Milestone bonus | x2 speed, stacking | Matches the genre's 25 and 50 marks |
| Tap | +1 second on every ring | Strong on the rim, negligible on the hub |
| Chime | x3 on every 12th turn | About +17% income, delivered as a moment |

### Prestige

Inspiration earned from lifetime pigment L, measured in Red-equivalent value:

```latex
\text{Inspiration} = \left\lfloor 150 \sqrt{L / 10^{15}} \right\rfloor
```

This is AdVenture Capitalist's curve. Doubling Inspiration takes about four times the earnings, so each run should last a little longer than the one before. Flatter curves, such as Egg, Inc.'s seventh root, make resets feel unrewarding and are avoided here.

### Offline earnings

```latex
\text{offline} = \min(t, \text{cap}) \times \text{income} \times \text{efficiency}
```

| Stage | Cap | Efficiency |
| --- | --- | --- |
| Wheel without an Apprentice | 0 | 0% |
| First Apprentice | 2 hours | 50% |
| Apprentice ranks and Technique tree | Up to 12 hours | Up to 100% |
| Sundial frame | Same cap | Doubled |

Egg, Inc. also starts at a two-hour cap. A short cap early teaches the habit of returning; raising it later is a felt reward.

### Pacing targets

- A purchase is affordable at least every 15 seconds in the first ten minutes.
- A new system appears about every three minutes in session one, then about one a day in week one.
- A wall, where nothing useful is affordable for ten minutes of play, always has one visible way out: a mix, a painting, a new wheel or a reset.
- No wall is ever placed directly before a purchase offer.

### Tooling

- All balance values live in one data file, not in code.
- A headless simulator plays the game with simple policies and reports the time to each milestone. It runs before any tuning change ships.
- Numbers use a big-number type from day one and display as K, M, B, T, then aa, ab and so on.

## Monetization

Colortime shows no ad the player did not ask for, and sells four things: time, comfort, beauty and collections.

### Rewarded ads

Every placement is a button the player presses. There are no banners and no interstitials.

| Placement | Reward | Limit |
| --- | --- | --- |
| Welcome back | Double the offline earnings just collected | Once per return |
| Golden Hour | x2 all pigment for 4 hours, stackable to 12 | 3 a day |
| Muse's gift | Upgrade a Muse reward from x7 to x21, or double its lump | When a Muse appears |
| Wind the clocks | Skip one hour of production | 3 a day |
| Fresh commission | Reroll one daily commission | 1 a day |
| Daily sketch | One free card | 1 a day |

A hard cap of ten ads per player per day protects both the experience and ad value. The offer button never pulses, covers controls or interrupts a tap.

### Purchases

Gold Leaf is the premium currency. It is also earned in play from Studies, commissions and the season pass.

| Product | Price | What it is |
| --- | --- | --- |
| Patron's Pass | $6.99, once | Every ad reward granted instantly without watching, plus a permanent x2. The flagship purchase |
| Starter set | $1.99, once, offered after the first Fresh Canvas | Gold Leaf, one frame skin, five cards |
| Gold Leaf packs | $1.99 to $49.99 | Spent on time skips, Blueprint slots, Gallery hooks and cosmetics |
| Time skips | Gold Leaf | 1, 4 and 24 hours of production |
| Sketchbook season pass | $5.99 per 30-day season | A free track for everyone and a premium track of cards, skins and Gold Leaf |
| Wheel skins | $0.99 to $3.99, or Gold Leaf | Frames, hands, fill styles such as watercolor, ink, neon and stained glass |
| Studio themes | $2.99 | Wall, lighting and ambient sound |
| Painting collections | $2.99 to $4.99 | A complete themed card set with a matching Gallery frame. Contents are listed in full |
| Gilded Easel | $9.99, once | Permanent x3 pigment, in the manner of AdVenture Capitalist's multipliers |

### Guardrails

- **No paid randomness.** Money buys named, complete sets. Random card drops come only from play. This also avoids loot-box rules and odds-disclosure work.
- **Function is earnable.** Hands, frames, harmonies and colors are never locked to payment. Collections add variety and a set bonus equal to free sets.
- **No pressure timers at walls.** Offers appear at moments of success, such as after a first prestige, not at moments of frustration.
- **Honest prices.** No fake discounts, no countdowns that restart.
- **Players under the age of consent get non-personalised ads** and no purchase prompts beyond the shop screen.

### Revenue sketch

These are planning assumptions to be replaced with soft-launch data, not forecasts.

| Line | Assumption | Per 1,000 daily players |
| --- | --- | --- |
| Rewarded ads | 40% watch, 3 ads each, $10 blended eCPM across countries | About $12 a day |
| Purchases | 2 to 3% of players ever pay, led by the Patron's Pass | $80 to $200 a day at maturity |
| Combined |  | $0.10 to $0.20 per daily player |

That sits in the lower half of the $0.15 to $0.50 range reported for hybrid-casual games, which is the honest place for a first title to plan from.

Selling the ad-free pass removes ad income from the most engaged players. That is the right trade: they become payers, and a pass buyer is the most likely buyer of everything else.

## Retention and live operations

The ring timings are the retention plan: something finishes in seconds, something in minutes, and the hub finishes about when the player would next pick up the phone.

### The daily loop

1. Open: collect offline pigment, optionally doubled.
2. Spend: buy levels, cross a milestone, perhaps open a slot or mix a color.
3. Check commissions and the critics; rebuild one wheel for the pigments a painting needs.
4. Paint or hang something if the pigment is there.
5. Leave with a visible reason to return: a hub ring due in two hours, a collector order due tonight.

### Reasons to return

| Horizon | Hook |
| --- | --- |
| Hours | Hub rings, offline cap, Golden Hour running out |
| Daily | Three commissions, a free sketch, a login calendar with a card on day 7 |
| Weekly | New critics every Monday; a weekend Exhibition |
| Monthly | A Sketchbook season with a theme and a card collection |
| Long term | Fresh Canvas runs, Movements, filling the Gallery |

### Exhibitions

An Exhibition is a 72-hour event on a separate, empty wall with a themed palette, such as an autumn set of five colors. Everyone starts from zero, so new and old players compete fairly. Rewards are cards, a skin and Gold Leaf by milestone, with a leaderboard only for bragging.

### Notifications

- Off until the player accepts an in-game prompt, shown after the first hub ring is bought.
- At most two a day: offline cap reached, and one event or order reminder.
- Each is a plain fact, such as the hub ring on a named wheel being full. No guilt, no streak threats.

### Social, kept light

- Shared painting images carry a small signature and the game's name.
- A visitable Gallery by friend code comes after launch. There are no guilds and no chat at launch.

## Interface, art and sound

The game is played in portrait with one thumb, and the wheel is always the largest thing on screen.

### Screens

| Screen | Reached by | Shows |
| --- | --- | --- |
| Wheel | Default; tap a wheel on the wall | One wheel, its rings, a bottom sheet of ring upgrades |
| Studio | Pinch out or the wall button | Every wheel in miniature, add-wheel slots |
| Palette | Tab | The color tree, mixes available, the Palette Knife |
| Easel | Tab | Card binder, composition, critics |
| Gallery | Tab | Rooms, hung paintings, collector orders |
| Shop | Tab, never a pop-up | Pass, season, skins, collections, Gold Leaf |

- Five tabs at most, in the bottom thumb zone. New tabs appear only when their system unlocks.
- Purchases happen on the wheel itself: tap a ring, and its upgrade sheet slides up. There are no long upgrade lists.
- Each screen carries one highlighted next goal, so the player never wonders what to do.

### Art direction

- Flat, matte paper and gouache. Off-white ground in light mode, deep charcoal in dark mode. The pigments are the only saturated things on screen.
- Rings are drawn as brush strokes with a soft leading edge, not as progress bars.
- Payouts leave the ring as droplets that arc into the header. A chime sends a ripple through the paper.
- Paintings share one illustration style per collection so layers always belong together.
- The app icon is a single wheel with three rings in primaries.

### Sound and touch

- Each slot has a pitch, from a high tick at the rim to a low bell at the hub. A full wheel plays a slow, generative chord.
- Each harmony uses a matching musical interval, so a Complementary wheel sounds different from an Analogous one.
- Haptics mark chimes and milestones with a light tap. Sound and haptics each have an off switch on the first settings row.

### Accessibility

- Every color has a glyph, a name and an optional pattern fill.
- Text scales with the system setting. All targets are at least 44 points.
- A reduced-motion mode replaces droplets and ripples with simple fades.
- Nothing in the game is timed tightly enough to require fast reactions.

## Technology and roadmap

Build the game as a TypeScript web app wrapped for the stores with Capacitor, and reach soft launch in about 23 weeks through five gated phases.

The durations are estimates for one developer working with an AI coding agent and one contract illustrator.

*Diagram: roadmap · 5 phases, 5 gates, then launch. See the [live document](https://claude.ai/artifact/CwqGtXJiBPhv61rEJ5qCVR).*

The diamonds are gates: if one fails, the phase repeats before any later work starts. Paintings come fourth so the wheel must be fun without them.

### Recommended stack

| Layer | Choice | Why |
| --- | --- | --- |
| Game logic | Pure TypeScript core with no rendering | Deterministic, unit-tested, shared by the game and the balance simulator |
| Rendering | PixiJS for wheels and paintings; a light UI framework for sheets and menus | Arcs, blends and transparent layers are what a 2D canvas does best |
| Store wrapper | Capacitor | One codebase for iOS, Android and a web demo |
| Ads | AdMob rewarded, with mediation added after soft launch | Simplest start; rewarded only |
| Purchases | RevenueCat | Receipt validation and both stores without a custom server |
| Analytics | Firebase Analytics and Crashlytics | Free; funnels, retention cohorts, remote config for tuning |
| Saves | Local first, with cloud backup through the platform accounts | Works offline; survives a new phone |
| Numbers | break\_infinity.js or an equivalent | Idle numbers outgrow doubles |

Unity or Godot would also work. They suit this game less: it is mostly interface and vector drawing, and a web build can be tested by anyone with a link from the first week.

### Rules for the code

- The simulation advances by elapsed time, never by frames. Offline progress is the same function called with a long interval.
- All content is data: colors, slots, frames, cards, critics, prices.
- Every tunable value can be changed remotely without a store release.
- Clock changes are detected and capped, with no punishment. Cheating a single-player idle game is not worth fighting hard.

### Numbers to watch in soft launch

| Measure | Pass | Why this bar |
| --- | --- | --- |
| Day 1 retention | 35% | Idle games usually open at 40% or more; 30 to 35% is reported as good across genres |
| Day 7 retention | 12% | About the top 10% of all mobile games |
| Day 30 retention | 4% | Between the reported median and good bands |
| Tutorial completion to first mix | 80% | The first five minutes must not leak |
| Players watching an ad on a given day | 30% | Shows the offers are wanted |
| Payer conversion by day 30 | 2% | Needed for the revenue sketch to hold |

### After launch

- Months 1 to 3: weekly critics, fortnightly Exhibitions, one Sketchbook season a month.
- Month 3: the Modernism Movement and visitable Galleries.
- Months 6 and 9: Pop and Digital.

## Risks and open questions

The largest risk is scope: wheels, mixing, a Studio and paintings are two games' worth of systems, so the phases are ordered to prove the wheel alone first.

| Risk | Why it matters | Answer |
| --- | --- | --- |
| Too many currencies | Twenty or more pigments can read as noise | Two-pigment cost limit, contextual header, Palette Knife, colors arriving slowly |
| Painting art cost | 72 layered cards that must all combine well | Style test of 12 cards before production; one collection at launch |
| An abstract theme is harder to advertise | Tycoon ads show a mine filling with gold; a wheel is subtler | Lead store art with the full Studio wall and finished paintings; test creatives during the prototype |
| Long retention | The median game keeps under 1% of players to day 30 | Three time rhythms, paintings by day one, prestige by day three, measured before global launch |
| Low spend per player | Calm games can under-monetize | Patron's Pass as a clear first purchase; collections for collectors; no reliance on whales |
| Similarity to Canvas | The layering idea is recognisable | Own art, names, icons and rules; legal review before launch |
| Balance at scale | Harmony, frames, hands and Gallery bonuses multiply together | Simulator from phase 0; multipliers add within a category and multiply only across categories |

### Decisions needed

- [ ] Confirm the name. Several coloring apps use Color Time, so check store search and trademarks before buying art.
- [ ] Confirm the stack: TypeScript and Capacitor as recommended, or an engine you already know.
- [ ] Decide who makes the art, and the budget for the first card collection.
- [ ] Choose the painting style for the launch collection.
- [ ] Pick soft-launch countries. A common choice is one cheap English-speaking market plus Canada.
- [ ] Decide whether the web demo is public, for example on itch.io, as an early audience test.

## Sources

- [The Math of Idle Games, part I](https://gamedeveloper.com/design/the-math-of-idle-games-part-i) and [part III](https://gamedeveloper.com/design/the-math-of-idle-games-part-iii), Anthony Pecorella
- [Idle Game Design Principles](https://ericguan.substack.com/p/idle-game-design-principles), Eric Guan
- [GameAnalytics: Mobile and PC Game Benchmarks in 2026](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game), GameDev Reports
- [Sensor Tower: Mobile Game Ad Monetization in 2026](https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization), GameDev Reports
- [Idle Games in 2026](https://appmagic.rocks/blog/idle-steam-games-2026), AppMagic
- [Retention benchmarks 2026](https://blog.playio.co/d1-d7-d30-retention-benchmarks-2026), [rewarded ad benchmarks 2026](https://blog.playio.co/rewarded-ad-benchmarks-2026) and [ARPDAU benchmarks](https://blog.playio.co/arpdau-benchmarks-mobile-games), Playio
