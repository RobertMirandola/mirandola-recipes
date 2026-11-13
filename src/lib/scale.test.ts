import { describe, expect, it } from "vitest";
import type { Ingredient } from "./recipe-model";
import { formatAmount, formatQuantity, formatUnit, renderStep } from "./scale";

function ingredient(overrides: Partial<Ingredient>): Ingredient {
  return { id: "x", name: "x", quantity: 1, unit: null, group: "Other", ...overrides };
}

describe("formatQuantity", () => {
  it("prints whole numbers plainly", () => {
    expect(formatQuantity(3, "lb")).toBe("3");
    expect(formatQuantity(2.99, null)).toBe("3");
  });

  it("prints cooking fractions", () => {
    expect(formatQuantity(1.5, "lb")).toBe("1 1/2");
    expect(formatQuantity(0.5, "cup")).toBe("1/2");
    expect(formatQuantity(0.25, "tsp")).toBe("1/4");
    expect(formatQuantity(0.125, "tsp")).toBe("1/8");
    expect(formatQuantity(2.75, "cup")).toBe("2 3/4");
  });

  it("recognises thirds written as rounded decimals", () => {
    expect(formatQuantity(0.33, "cup")).toBe("1/3");
    expect(formatQuantity(1.67, "cup")).toBe("1 2/3");
    expect(formatQuantity(4 / 3, "cup")).toBe("1 1/3");
  });

  it("rounds awkward amounts to the nearest eighth or third", () => {
    // 4 meals scaled to 5 (x1.25), the case that used to print decimals.
    expect(formatQuantity(0.33 * 1.25, "cup")).toBe("3/8");
    expect(formatQuantity(0.25 * 1.25, "cup")).toBe("1/3");
    expect(formatQuantity(0.5 * 1.25, "cup")).toBe("5/8");
    expect(formatQuantity(1.5 * 1.25, "lb")).toBe("1 7/8");
    expect(formatQuantity(1.6, "lb")).toBe("1 5/8");
    expect(formatQuantity(0.1, "tsp")).toBe("1/8");
    expect(formatQuantity(1.03, "cup")).toBe("1");
    expect(formatQuantity(2.96, null)).toBe("3");
  });

  it("keeps a decimal for amounts too small to be a fraction", () => {
    expect(formatQuantity(0.05, "tsp")).toBe("0.05");
    expect(formatQuantity(0.004, "tsp")).toBe("0.004");
  });

  it("keeps metric units as numbers", () => {
    expect(formatQuantity(750, "g")).toBe("750");
    expect(formatQuantity(187.5, "ml")).toBe("188");
    expect(formatQuantity(2.5, "g")).toBe("2.5");
    expect(formatQuantity(1.25, "kg")).toBe("1.25");
  });
});

describe("formatUnit", () => {
  it("agrees with the quantity for word units", () => {
    expect(formatUnit("cup", 0.5)).toBe("cup");
    expect(formatUnit("cup", 1)).toBe("cup");
    expect(formatUnit("cup", 1.03)).toBe("cup");
    expect(formatUnit("cup", 1.5)).toBe("cups");
    expect(formatUnit("cloves", 1)).toBe("clove");
    expect(formatUnit("leaf", 4)).toBe("leaves");
  });

  it("leaves abbreviations alone", () => {
    expect(formatUnit("tbsp", 3)).toBe("tbsp");
    expect(formatUnit("lb", 2)).toBe("lb");
    expect(formatUnit(null, 2)).toBe("");
  });
});

describe("formatAmount", () => {
  it("scales and joins quantity and unit", () => {
    expect(formatAmount(ingredient({ quantity: 1.5, unit: "lb" }), 2)).toBe("3 lb");
    expect(formatAmount(ingredient({ quantity: 1, unit: "cup" }), 1.5)).toBe("1 1/2 cups");
    expect(formatAmount(ingredient({ quantity: 3, unit: null }), 0.5)).toBe("1 1/2");
  });

  it("has no amount for to-taste ingredients", () => {
    expect(formatAmount(ingredient({ quantity: null }), 2)).toBeNull();
  });
});

describe("renderStep", () => {
  const ingredients = [
    ingredient({ id: "chicken", quantity: 1.5, unit: "lb" }),
    ingredient({ id: "olive-oil", quantity: 2, unit: "tbsp" }),
    ingredient({ id: "salt", quantity: null }),
  ];
  const text = (step: string, factor: number) =>
    renderStep(step, ingredients, factor)
      .map((part) => part.text)
      .join("");

  it("fills slots with scaled amounts", () => {
    expect(text("Season {chicken} chicken, then sear", 1)).toBe(
      "Season 1 1/2 lb chicken, then sear",
    );
    expect(text("Season {chicken} chicken, then sear", 2)).toBe(
      "Season 3 lb chicken, then sear",
    );
  });

  it("marks amounts separately from text", () => {
    expect(renderStep("Heat {olive-oil} olive oil.", ingredients, 1)).toEqual([
      { kind: "text", text: "Heat " },
      { kind: "amount", text: "2 tbsp" },
      { kind: "text", text: " olive oil." },
    ]);
  });

  it("drops slots for to-taste ingredients without leaving gaps", () => {
    expect(text("Season with {salt} salt and serve.", 1)).toBe("Season with salt and serve.");
    expect(text("Add the chicken and {salt}, then stir.", 1)).toBe(
      "Add the chicken and, then stir.",
    );
    expect(text("{salt} Taste and adjust.", 1)).toBe("Taste and adjust.");
  });

  it("returns plain text when there are no slots", () => {
    expect(renderStep("Rest for 5 minutes.", ingredients, 1)).toEqual([
      { kind: "text", text: "Rest for 5 minutes." },
    ]);
  });
});
