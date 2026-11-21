import { describe, expect, it } from "vitest";
import { seamBetween } from "../src/core/colors";
import { SLOTS } from "../src/core/data";
import {
  buyColor, buyLevels, buyUpgrade, catchUp, levelCost, openSlot, paint, place, ringStats, seams, tap, tick,
} from "../src/core/game";
import { newGame, type GameState } from "../src/core/state";

const rich = (s: GameState, n = 1e9) => {
  for (const c of Object.keys(s.pigment) as (keyof GameState["pigment"])[]) s.pigment[c] = n;
  return s;
};

describe("seams", () => {
  it("blends two primaries into the secondary between them", () => {
    expect(seamBetween("red", "yellow")).toEqual({ kind: "blend", color: "orange" });
    expect(seamBetween("yellow", "blue")).toEqual({ kind: "blend", color: "green" });
    expect(seamBetween("blue", "red")).toEqual({ kind: "blend", color: "violet" });
  });
  it("blends a primary and its neighbouring secondary into a paint color", () => {
    expect(seamBetween("blue", "green")).toEqual({ kind: "blend", color: "teal" });
    expect(seamBetween("red", "orange")).toEqual({ kind: "blend", color: "vermilion" });
    expect(seamBetween("violet", "red")).toEqual({ kind: "blend", color: "magenta" });
  });
  it("makes opposites contrast and leaves other pairs alone", () => {
    expect(seamBetween("red", "green").kind).toBe("contrast");
    expect(seamBetween("orange", "green").kind).toBe("none");
    expect(seamBetween("red", "red").kind).toBe("none");
  });
});

describe("rings", () => {
  it("pays the rim once per 2-second turn, triple on the 12th", () => {
    const s = newGame(0);
    tick(s, 22);
    expect(s.pigment.red).toBe(11);
    tick(s, 2);
    expect(s.pigment.red).toBe(12 + 2); // 12th turn chimes for 3
  });

  it("gives the same result in one long step as in many short ones", () => {
    const a = newGame(0);
    const b = newGame(0);
    tick(a, 600);
    for (let i = 0; i < 6000; i++) tick(b, 0.1);
    expect(a.pigment.red).toBeCloseTo(b.pigment.red, 6);
  });

  it("advances every ring by a second on a tap", () => {
    const s = newGame(0);
    tap(s, 0);
    tap(s, 0);
    expect(s.pigment.red).toBe(1);
  });

  it("doubles speed at level 25", () => {
    const s = rich(newGame(0));
    const before = ringStats(s, 0, 0)!.turn;
    buyLevels(s, 0, 0, 24);
    expect(ringStats(s, 0, 0)!.turn).toBeCloseTo(before / 2);
  });

  it("prices bulk levels as the sum of single levels", () => {
    const s = rich(newGame(0));
    const ten = levelCost(s, 0, 0, 10)!.red!;
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += levelCost(s, 0, 0, 1)!.red!;
      buyLevels(s, 0, 0, 1);
    }
    expect(Math.abs(ten - sum)).toBeLessThanOrEqual(10);
  });
});

describe("blending and discovery", () => {
  it("trickles orange from red beside yellow, then lets you place it", () => {
    const s = rich(newGame(0), 1e6);
    s.pigment.orange = 0;
    buyColor(s, "yellow");
    openSlot(s, 0);
    place(s, 0, 1, "yellow");
    expect(seams(s, 0).map((x) => x.color)).toEqual(["orange"]);
    expect(place(s, 0, 1, "orange")).toBe(false);
    tick(s, 3600);
    expect(s.pigment.orange).toBeGreaterThan(25);
    expect(s.owned).toContain("orange");
  });
});

describe("offline", () => {
  it("pays half rate, capped at two hours", () => {
    const s = newGame(0);
    const res = catchUp(s, 10 * 3600 * 1000);
    expect(res.seconds).toBe(7200);
    const online = newGame(0);
    tick(online, 7200);
    expect(s.pigment.red).toBeCloseTo(online.pigment.red * 0.5, 0);
  });
  it("ignores short gaps", () => {
    const s = newGame(0);
    expect(catchUp(s, 10_000).seconds).toBe(0);
  });
});

describe("workshop and paintings", () => {
  it("Rim Runner speeds up only the outer ring", () => {
    const s = rich(newGame(0));
    buyColor(s, "yellow");
    openSlot(s, 0);
    place(s, 0, 1, "yellow");
    const rim = ringStats(s, 0, 0)!.turn;
    const inner = ringStats(s, 0, 1)!.turn;
    expect(buyUpgrade(s, "rim-runner")).toBe(true);
    expect(ringStats(s, 0, 0)!.turn).toBeCloseTo(rim / 1.1);
    expect(ringStats(s, 0, 1)!.turn).toBeCloseTo(inner);
  });
  it("hangs a painting and moves to the next goal", () => {
    const s = rich(newGame(0));
    expect(paint(s)).toBe(true);
    expect(s.hung).toEqual(["p1"]);
    expect(s.painting).toBe(1);
  });
  it("has a turn time for every slot", () => {
    expect(SLOTS).toHaveLength(6);
  });
});
