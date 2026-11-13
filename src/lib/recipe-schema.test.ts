import { describe, expect, it } from "vitest";
import { normalizeRecipe, recipeInputSchema, type RecipeInput } from "./recipe-schema";

const valid: RecipeInput = {
  title: "Skillet chicken",
  baseServings: 4,
  category: "  Chicken ",
  ingredients: [
    { id: "chicken", name: "chicken thighs", quantity: 1.5, unit: "lb", group: "Protein" },
    { id: "salt", name: "kosher salt", group: "Spices" },
  ],
  steps: ["Season the {chicken} chicken with {salt} salt.", "Sear for 6 minutes."],
};

describe("recipeInputSchema", () => {
  it("accepts a well-formed recipe", () => {
    expect(recipeInputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects ingredient ids that are not slugs", () => {
    const input = {
      ...valid,
      ingredients: [{ ...valid.ingredients[0], id: "Chicken Thighs" }],
    };
    expect(recipeInputSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an unknown ingredient group", () => {
    const input = {
      ...valid,
      ingredients: [{ ...valid.ingredients[0], group: "Meat" }],
    };
    expect(recipeInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("normalizeRecipe", () => {
  it("fills in nulls and tidies the category", () => {
    const result = normalizeRecipe(valid);
    expect(result).toMatchObject({
      ok: true,
      recipe: {
        note: null,
        category: "chicken",
        ingredients: [
          { id: "chicken", quantity: 1.5, unit: "lb" },
          { id: "salt", quantity: null, unit: null },
        ],
      },
    });
  });

  it("reports a step slot that matches no ingredient", () => {
    const result = normalizeRecipe({ ...valid, steps: ["Melt the {butter} butter."] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems).toHaveLength(1);
      expect(result.problems[0]).toContain("{butter}");
      expect(result.problems[0]).toContain("Step 1");
    }
  });

  it("reports duplicate ingredient ids", () => {
    const result = normalizeRecipe({
      ...valid,
      ingredients: [valid.ingredients[0], valid.ingredients[0]],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems[0]).toContain('"chicken"');
    }
  });
});
