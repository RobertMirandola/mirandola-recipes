import { describe, expect, it } from "vitest";
import {
  applyVisibleOrder,
  clampDragTarget,
  clampPointerDelta,
  dragShift,
  dragTargetIndex,
  moveItem,
  withFavorite,
} from "./recipe-order";

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

describe("withFavorite", () => {
  const recipes = [
    { id: "a", favorite: true, sortOrder: 0 },
    { id: "b", favorite: false, sortOrder: 1 },
    { id: "c", favorite: false, sortOrder: 2 },
  ];

  it("pins a recipe above the unpinned ones and keeps the existing order", () => {
    expect(withFavorite(recipes, "c", true).map((recipe) => recipe.id)).toEqual(["a", "c", "b"]);
  });

  it("returns an unpinned recipe to its saved place", () => {
    const pinned = [
      { id: "c", favorite: true, sortOrder: 2 },
      { id: "a", favorite: false, sortOrder: 0 },
      { id: "b", favorite: false, sortOrder: 1 },
    ];
    expect(withFavorite(pinned, "c", false).map((recipe) => recipe.id)).toEqual(["a", "b", "c"]);
  });
});

describe("clampDragTarget", () => {
  const favorites = [true, true, false, false];

  it("does not drag a pinned recipe into the other group", () => {
    expect(clampDragTarget(favorites, 0, 3)).toBe(1);
  });

  it("does not drag an unpinned recipe into the pinned group", () => {
    expect(clampDragTarget(favorites, 3, 0)).toBe(2);
  });
});

describe("clampPointerDelta", () => {
  it("keeps the row inside its section", () => {
    expect(clampPointerDelta(100, 80, 100, 260, 400)).toBe(80);
    expect(clampPointerDelta(180, 80, 100, 260, -200)).toBe(-80);
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
