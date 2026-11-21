# Economy: the painter's studio

This replaces the parts of `design.md` and `upgrades.md` where paint colors were spent on upgrades. The prototype in `game/` follows this.

## The chain

**Wheels grind paint → the tin stores it → the easel paints your chosen picture from the tin → you sell it for coins or hang it → coins buy tools.**

| Step | What it is | What the player does |
| --- | --- | --- |
| Wheels | Each ring grinds one color; neighbouring rings blend new colors along their seam | Choose what each ring grinds, level rings, open rings, build wheels |
| Tin | One capped well per color. Paint that doesn't fit spills and is lost | Widen the wells of colors you want to save up |
| Easel | Paints one layer at a time, drawing that layer's color from the tin. Waits if the color runs out | Choose the painting: a background and up to two pieces |
| Painting | A finished piece | Sell it for coins, or hang it for a permanent bonus |
| Coins | What a painter earns | Ring levels, new rings, tubes, tin wells, wheels, Workshop tools |

Two rules keep it readable:

- **Paint is only ever used for painting** (and later for Research "color studies"). It is never a price for a tool.
- **Coins only come from selling paintings.** Wheels never make coins directly.

## Where colors come from

| Colors | Source |
| --- | --- |
| Red | You start with it |
| Yellow, blue | A tube: the first two teaching paintings pay one each, or buy them at the art shop for coins |
| Orange, green, violet | Mixed where two primaries' rings touch, then usable in a ring of their own |
| Teal, amber, vermilion, chartreuse, indigo, magenta | Mixed where a primary's ring touches its neighbouring secondary. Only used for painting |

## Painting

- **Teaching paintings (the first three):** set compositions that each teach one thing. First Apple teaches the easel and selling, and pays a yellow tube. Lemon Light makes you open ring 2 and grind yellow, and pays a blue tube. Kite Day needs blue, so you swap a ring's color.
- **After that, you compose:** pick a background (Bare paper, Warm wash, Blue sky, Dawn, Meadow, Dusk, Open sea) and up to two pieces (Apple, Kite, Pumpkin, Heron, Moon…). Each part lists the colors it needs before you commit.
- **Price** = paint used × color value (primaries 1, mixed 3, paint colors 8) × a variety bonus (+30% per extra color, +25% per piece). Richer paintings pay much more than repeating one simple one.
- **Sell or hang:** selling pays coins now. Hanging uses one of three hooks and makes every color in the painting grind 10% faster for good.
- **Paint this next** queues your next painting while the current one finishes.

## The tin

- Every color has its own well, starting at 100.
- Each upgrade doubles that color's well, for coins (25, then ×2.6 each time).
- Full wells show a red outline and the wheel shows "full" instead of a number, which is the hint to widen it, spend that color, or grind something else.

## Workshop (coins)

| Group | Upgrades |
| --- | --- |
| Easel | Wide Brush (paint faster), Good Frames (sell for more), Apprentice (repeats and sells your last painting, the main idle tool), Bigger Canvas (3× the paint, 4× the price) |
| Wheels | Rim Runner, Heavy Stroke, Quick Yellow, Thin Coats, Light Touch, Thick Paint, Wet on Wet, Deep Wells, Bold Chime, Head Start |

## Open questions

- Research tree: paid in mixed colors as "color studies", as in `upgrades.md`, or folded into the Workshop?
- Should the tin cap also limit offline earnings, as a reason to widen wells before a long break? It does now.
- Sale prices are flat; a market or commission board could make some paintings worth more on some days.
- The bot reaches wheel 3 in about 30 minutes; the long game needs the Fresh Canvas reset layer.
