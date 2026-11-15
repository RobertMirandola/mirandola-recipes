import { describe, expect, it } from "vitest";
import { matchesRecipeSearch, recipeSearchText } from "./recipe-search";

const pesto = recipeSearchText({
  title: "Pesto Chicken Orzo",
  category: "chicken",
  note: "Stir pesto in off heat.",
  ingredients: [{ name: "fresh spinach" }, { name: "dry orzo" }],
  steps: ["Simmer until the orzo is tender."],
});

describe("recipe search", () => {
  it("matches a title, ingredient, or step without caring about case", () => {
    expect(matchesRecipeSearch(pesto, "ORZO")).toBe(true);
    expect(matchesRecipeSearch(pesto, "spinach")).toBe(true);
    expect(matchesRecipeSearch(pesto, "simmer")).toBe(true);
  });

  it("requires every word", () => {
    expect(matchesRecipeSearch(pesto, "chicken spinach")).toBe(true);
    expect(matchesRecipeSearch(pesto, "beef orzo")).toBe(false);
  });

  it("matches everything when the query is blank", () => {
    expect(matchesRecipeSearch(pesto, "   ")).toBe(true);
  });
});
