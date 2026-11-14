import { describe, expect, it } from "vitest";
import { applyVisibleOrder, dragShift, dragTargetIndex, moveItem } from "./recipe-order";

describe("moveItem", () => {
  it("moves an item down", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("moves an item up", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });
});

describe("drag motion", () => {
  const mids = [40, 120, 200];

  it("follows the pointer past the next row", () => {
    expect(dragTargetIndex(mids, 0, 80, 100)).toBe(1);
  });

  it("keeps the dragged row on the pointer and slides the neighbor up", () => {
    expect(dragShift(0, 0, 1, 80, 100, true)).toBe(100);
    expect(dragShift(1, 0, 1, 80, 100, false)).toBe(-80);
    expect(dragShift(2, 0, 1, 80, 100, false)).toBe(0);
  });
});

describe("applyVisibleOrder", () => {
  it("keeps hidden recipes in place", () => {
    expect(applyVisibleOrder(["a", "b", "c"], ["a", "c"], ["c", "a"])).toEqual(["c", "b", "a"]);
  });

  it("rejects a list that drops a visible recipe", () => {
    expect(applyVisibleOrder(["a", "b"], ["a", "b"], ["a"])).toBeNull();
  });
});
