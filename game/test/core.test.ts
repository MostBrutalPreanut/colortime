import { describe, expect, it } from "vitest";
import { COLORS } from "../src/core/data";
import {
  accept, buyBoost, buyLevels, buyStudio, catchUp, easelDone, fillOffers, hang, hireApprentice, missingParent, sell,
  tapAll, tapRow, tick, tinCap, turnTime, unlockRow, upgradeTin,
} from "../src/core/game";
import { newGame, type GameState } from "../src/core/state";

const rich = (coins = 1e12) => { const s = newGame(0); s.coins = coins; return s; };
const skipLessons = (s: GameState) => { s.painted = 3; s.offers = []; return s; };

describe("rows", () => {
  it("only delivers paint when a turn completes", () => {
    const s = newGame(0);
    expect(tapRow(s, "red")).toBe(true);
    tick(s, 1.4);
    expect(s.pigment.red).toBe(0);
    tick(s, 0.2);
    expect(s.pigment.red).toBe(1);
  });

  it("does nothing without a tap until the apprentice is hired", () => {
    const s = rich();
    tick(s, 60);
    expect(s.pigment.red).toBe(0);
    hireApprentice(s, "red");
    tick(s, 15);
    expect(s.pigment.red).toBe(10);
  });

  it("can't start a turn twice", () => {
    const s = newGame(0);
    expect(tapRow(s, "red")).toBe(true);
    expect(tapRow(s, "red")).toBe(false);
  });

  it("makes every higher tier slower", () => {
    const s = rich();
    const t = (c: string) => turnTime(s, c as never);
    expect(t("red")).toBeLessThan(t("orange"));
    expect(t("orange")).toBeLessThan(t("vermilion"));
  });

  it("halves the turn at level 25", () => {
    const s = rich();
    const before = turnTime(s, "red");
    s.buy = 10;
    buyLevels(s, "red"); buyLevels(s, "red"); buyLevels(s, "red"); // 10, 20, 30
    expect(s.rows.red.level).toBe(30);
    expect(turnTime(s, "red")).toBeCloseTo(before / 2);
  });

  it("spills paint past the tin cap", () => {
    const s = rich();
    hireApprentice(s, "red");
    tick(s, 600);
    expect(s.pigment.red).toBe(tinCap(s, "red"));
    expect(s.stats.spilled).toBeGreaterThan(0);
    upgradeTin(s, "red");
    expect(tinCap(s, "red")).toBe(2 * 50);
  });
});

describe("mixing", () => {
  it("needs both parents unlocked, takes them at the start of the turn, and waits without them", () => {
    const s = rich();
    expect(unlockRow(s, "orange")).toBe(false);
    unlockRow(s, "yellow");
    expect(unlockRow(s, "orange")).toBe(true);
    expect(missingParent(s, "orange")).toBe("red");
    expect(tapRow(s, "orange")).toBe(false);
    s.pigment.red = 5; s.pigment.yellow = 5;
    expect(tapRow(s, "orange")).toBe(true);
    expect(s.pigment.red).toBe(4);
    expect(s.pigment.yellow).toBe(4);
    tick(s, 8);
    expect(s.pigment.orange).toBe(1);
  });

  it("boosts double output without taking more parent paint", () => {
    const s = rich();
    unlockRow(s, "yellow"); unlockRow(s, "orange");
    buyBoost(s, "orange");
    s.pigment.red = 5; s.pigment.yellow = 5;
    tapRow(s, "orange");
    tick(s, 8);
    expect(s.pigment.orange).toBe(2);
    expect(s.pigment.red).toBe(4);
  });

  it("keeps mixing while parents last when offline-long spans run in bulk", () => {
    const s = rich();
    unlockRow(s, "yellow"); unlockRow(s, "orange");
    for (const c of ["red", "yellow", "orange"] as const) { hireApprentice(s, c); upgradeTin(s, c); }
    tick(s, 3600);
    expect(s.pigment.orange).toBeGreaterThan(50);
  });
});

describe("commissions", () => {
  it("starts with a fixed apple lesson that red alone can paint", () => {
    const s = newGame(0);
    fillOffers(s);
    expect(s.offers).toHaveLength(1);
    expect(s.offers[0].title).toBe("Apple");
    accept(s, s.offers[0].id);
    for (let i = 0; i < 8; i++) { tapAll(s); tick(s, 1.5); }
    expect(easelDone(s.easel)).toBe(true);
    expect(sell(s)).toBeGreaterThan(0);
    expect(s.offers[0].title).toBe("Lemon");
  });

  it("offers three commissions after the lessons, using only colors you have", () => {
    const s = skipLessons(rich());
    unlockRow(s, "yellow"); unlockRow(s, "blue");
    fillOffers(s);
    expect(s.offers).toHaveLength(3);
    for (const o of s.offers) for (const l of o.layers) expect(s.rows[l.color].unlocked).toBe(true);
  });

  it("can't hang until the Gallery Wall is bought", () => {
    const s = newGame(0);
    fillOffers(s);
    accept(s, s.offers[0].id);
    s.pigment.red = 50;
    tick(s, 0.1);
    expect(hang(s)).toBe(false);
  });

  it("never strands the player: an unpaintable, unaffordable board gets an apple", () => {
    const s = newGame(0);
    s.painted = 1; // the lemon lesson, which needs yellow
    fillOffers(s);
    expect(s.offers.map((o) => o.title)).toContain("Apple");
  });

  it("hangs a painting, which speeds up its colors", () => {
    const s = rich();
    s.painted = 4;
    buyStudio(s, "gallery");
    s.painted = 0;
    fillOffers(s);
    accept(s, s.offers[0].id);
    s.pigment.red = 50;
    tick(s, 0.1);
    const before = turnTime(s, "red");
    expect(hang(s)).toBe(true);
    expect(turnTime(s, "red")).toBeCloseTo(before / 1.1);
  });

  it("the Art Agent sells and takes new work by itself", () => {
    const s = skipLessons(rich());
    s.painted = 6;
    buyStudio(s, "agent");
    hireApprentice(s, "red");
    upgradeTin(s, "red"); upgradeTin(s, "red");
    tick(s, 600);
    expect(s.stats.sold).toBeGreaterThan(3);
  });
});

describe("offline", () => {
  it("runs hired rows at half speed for up to two hours", () => {
    const s = rich();
    hireApprentice(s, "red");
    const r = catchUp(s, 10 * 3600 * 1000);
    expect(r.seconds).toBe(7200);
    expect(s.pigment.red).toBe(tinCap(s, "red"));
  });
  it("has twelve colors in three tiers", () => {
    expect(COLORS).toHaveLength(12);
  });
});
