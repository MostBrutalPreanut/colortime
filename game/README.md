# Colortime prototype

A playable web prototype of the core loop: one or more wheels, rings that fill and pay pigment, blends between neighbouring rings, the Workshop, placeholder paintings and offline earnings. Stand-in art; the look follows `docs/mockups/`.

```bash
npm install
npm run dev        # play at http://localhost:5173
npm test           # core rule tests
npm run sim        # balance check: an idle bot plays for 3 hours
npm run sim -- 24 2   # 24 hours, 2 taps per second
```

- `src/core/` is the game itself, with no drawing: colors and blend rules, balance data, state, simulation.
- `src/core/data.ts` holds every tunable number.
- `src/ui/` and `src/main.ts` draw it and handle input.

Testing shortcuts are under **More**: skip an hour, or start over.
