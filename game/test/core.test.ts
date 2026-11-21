import { describe, expect, it } from "vitest";
import { seamBetween } from "../src/core/colors";
import {
  buyLevels, buyTube, buyUpgrade, catchUp, currentLayer, easelDone, hang, levelCost, openSlot, place, ringStats,
  seams, sell, startPainting, tap, tick, tinCap, upgradeTin,
} from "../src/core/game";
import { newGame, type GameState } from "../src/core/state";

const fund = (s: GameState, coins = 1e12) => { s.coins = coins; return s; };

describe("seams", () => {
  it("blends two primaries into the secondary between them", () => {
    expect(seamBetween("red", "yellow")).toEqual({ kind: "blend", color: "orange" });
    expect(seamBetween("yellow", "blue")).toEqual({ kind: "blend", color: "green" });
    expect(seamBetween("blue", "red")).toEqual({ kind: "blend", color: "violet" });
  });
  it("blends a primary and its neighbouring secondary into a paint color", () => {
    expect(seamBetween("blue", "green")).toEqual({ kind: "blend", color: "teal" });
    expect(seamBetween("red", "orange")).toEqual({ kind: "blend", color: "vermilion" });
  });
  it("makes opposites contrast and leaves other pairs alone", () => {
    expect(seamBetween("red", "green").kind).toBe("contrast");
    expect(seamBetween("orange", "green").kind).toBe("none");
  });
});

describe("rings and tin", () => {
  it("grinds one red per 2-second turn, triple on the 12th", () => {
    const s = newGame(0);
    s.easel = null;
    s.painted = 99; // no tutorial painting drawing from the tin
    tick(s, 22);
    expect(s.pigment.red).toBe(11);
    tick(s, 2);
    expect(s.pigment.red).toBe(14);
  });

  it("spills paint past the tin cap, and a bigger tin holds more", () => {
    const s = fund(newGame(0));
    s.painted = 99;
    tick(s, 1000);
    expect(s.pigment.red).toBe(100);
    expect(s.stats.spilled).toBeGreaterThan(0);
    expect(upgradeTin(s, "red")).toBe(true);
    expect(tinCap(s, "red")).toBe(200);
  });

  it("advances every ring by a second on a tap", () => {
    const s = newGame(0);
    s.painted = 99;
    tap(s, 0);
    tap(s, 0);
    expect(s.pigment.red).toBe(1);
  });

  it("prices ring levels in coins and doubles speed at level 25", () => {
    const s = fund(newGame(0));
    expect(Object.keys(levelCost(s, 0, 0)!)).toEqual(["coins"]);
    const before = ringStats(s, 0, 0)!.turn;
    buyLevels(s, 0, 0, 24);
    expect(ringStats(s, 0, 0)!.turn).toBeCloseTo(before / 2);
  });
});

describe("easel", () => {
  it("paints the first tutorial apple from red in the tin, then sells it and gives a yellow tube", () => {
    const s = newGame(0);
    tick(s, 0.1);
    expect(s.easel?.comp.title).toBe("First Apple");
    expect(currentLayer(s.easel)?.color).toBe("red");
    tick(s, 60);
    expect(easelDone(s.easel)).toBe(true);
    const price = sell(s);
    expect(price).toBe(25);
    expect(s.coins).toBe(25);
    expect(s.owned).toContain("yellow");
    expect(s.easel?.comp.title).toBe("Lemon Light");
  });

  it("waits on a missing color instead of skipping it", () => {
    const s = newGame(0);
    s.painted = 3;
    s.owned.push("yellow");
    expect(startPainting(s, { bg: "sky", pieces: ["apple"], title: "t" })).toBe(true);
    tick(s, 30);
    expect(currentLayer(s.easel)?.color).toBe("blue");
    expect(s.easel!.layers[1].done).toBe(0);
  });

  it("hangs a painting, which boosts the colors in it", () => {
    const s = newGame(0);
    const before = ringStats(s, 0, 0)!.pay;
    tick(s, 60);
    expect(hang(s)).toBe(true);
    expect(ringStats(s, 0, 0)!.pay).toBeCloseTo(before * 1.1);
  });

  it("the Apprentice repeats and sells the last composition", () => {
    const s = fund(newGame(0), 0);
    s.painted = 3;
    s.workshop.apprentice = 1;
    startPainting(s, { bg: "paper", pieces: ["apple"], title: "Apples" });
    tick(s, 600);
    expect(s.stats.sold).toBeGreaterThan(3);
    expect(s.coins).toBeGreaterThan(0);
  });
});

describe("colors and rings", () => {
  it("buys tubes and rings with coins, and red beside yellow discovers orange", () => {
    const s = fund(newGame(0));
    s.painted = 99;
    expect(buyTube(s, "yellow")).toBe(true);
    expect(openSlot(s, 0)).toBe(true);
    place(s, 0, 1, "yellow");
    expect(seams(s, 0).map((x) => x.color)).toEqual(["orange"]);
    tick(s, 3600);
    expect(s.owned).toContain("orange");
  });

  it("Rim Runner speeds up only the outer ring", () => {
    const s = fund(newGame(0));
    s.painted = 5;
    buyTube(s, "yellow");
    openSlot(s, 0);
    place(s, 0, 1, "yellow");
    const rim = ringStats(s, 0, 0)!.turn;
    const inner = ringStats(s, 0, 1)!.turn;
    expect(buyUpgrade(s, "rim-runner")).toBe(true);
    expect(ringStats(s, 0, 0)!.turn).toBeCloseTo(rim / 1.1);
    expect(ringStats(s, 0, 1)!.turn).toBeCloseTo(inner);
  });
});

describe("offline", () => {
  it("runs the wheels and easel at half speed, capped at two hours", () => {
    const s = newGame(0);
    const res = catchUp(s, 10 * 3600 * 1000);
    expect(res.seconds).toBe(7200);
    expect(easelDone(s.easel)).toBe(true); // the first apple finished while away
  });
  it("ignores short gaps", () => {
    expect(catchUp(newGame(0), 10_000).seconds).toBe(0);
  });
});
