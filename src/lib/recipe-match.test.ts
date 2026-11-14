import { describe, expect, it } from "vitest";
import type { RecipeInput } from "./recipe-schema";
import { applyRecipePatch, pickRecipeMatch } from "./recipe-match";

const recipes = [
  { title: "Pesto Chicken Orzo" },
  { title: "One-Pot Creamy Cajun Chicken Pasta" },
];

describe("pickRecipeMatch", () => {
  it("matches a title without caring about case or extra spaces", () => {
    const match = pickRecipeMatch(recipes, "  pesto   chicken orzo ");
    expect(match.ok && match.recipe.title).toBe("Pesto Chicken Orzo");
  });

  it("matches a unique part of a title", () => {
    const match = pickRecipeMatch(recipes, "orzo");
    expect(match.ok && match.recipe.title).toBe("Pesto Chicken Orzo");
  });

  it("refuses a word that belongs to more than one recipe", () => {
    const match = pickRecipeMatch(recipes, "chicken");
    expect(match.ok).toBe(false);
    if (!match.ok) {
      expect(match.problems[0]).toContain("Pesto Chicken Orzo");
      expect(match.problems[0]).toContain("Cajun");
    }
  });
});

describe("applyRecipePatch", () => {
  const current: RecipeInput = {
    title: "Pesto Chicken Orzo",
    baseServings: 5,
    note: "Creamy.",
    category: "chicken",
    ingredients: [{ id: "orzo", name: "orzo", quantity: 2, unit: "cup", group: "Pantry" }],
    steps: ["Simmer the {orzo} orzo."],
  };

  it("changes the base meal count and leaves the rest", () => {
    expect(applyRecipePatch(current, { baseServings: 4 })).toMatchObject({
      title: "Pesto Chicken Orzo",
      baseServings: 4,
      note: "Creamy.",
      steps: current.steps,
    });
  });

  it("clears the note when the patch sends null", () => {
    expect(applyRecipePatch(current, { note: null }).note).toBeUndefined();
  });
});
