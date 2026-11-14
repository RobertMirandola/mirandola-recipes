import type { Recipe } from "./recipe-model";
import type { RecipeInput } from "./recipe-schema";

/** Lowercase title with collapsed spaces, for finding a recipe by name. */
export function titleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pickRecipeMatch<T extends { title: string }>(
  recipes: T[],
  query: string,
): { ok: true; recipe: T } | { ok: false; problems: string[] } {
  const key = titleKey(query);
  if (!key) {
    return { ok: false, problems: ["Say which recipe to change."] };
  }

  const exact = recipes.filter((recipe) => titleKey(recipe.title) === key);
  const matches =
    exact.length > 0
      ? exact
      : recipes.filter((recipe) => titleKey(recipe.title).includes(key));

  if (matches.length === 1) {
    return { ok: true, recipe: matches[0] };
  }
  if (matches.length === 0) {
    return { ok: false, problems: [`No saved recipe matches "${query.trim()}".`] };
  }
  return {
    ok: false,
    problems: [
      `"${query.trim()}" matches more than one recipe: ${matches.map((recipe) => recipe.title).join(", ")}. Use the full title.`,
    ],
  };
}

export type RecipePatch = {
  title?: string;
  baseServings?: number;
  note?: string | null;
  category?: string | null;
  ingredients?: RecipeInput["ingredients"];
  steps?: string[];
};

export function recipeToInput(recipe: Recipe): RecipeInput {
  return {
    title: recipe.title,
    baseServings: recipe.baseServings,
    note: recipe.note ?? undefined,
    category: recipe.category ?? undefined,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      group: ingredient.group,
    })),
    steps: recipe.steps,
  };
}

/** Copies the current recipe and replaces only the fields present on the patch. */
export function applyRecipePatch(current: RecipeInput, patch: RecipePatch): RecipeInput {
  return {
    title: patch.title ?? current.title,
    baseServings: patch.baseServings ?? current.baseServings,
    note: patch.note === undefined ? current.note : (patch.note ?? undefined),
    category: patch.category === undefined ? current.category : (patch.category ?? undefined),
    ingredients: patch.ingredients ?? current.ingredients,
    steps: patch.steps ?? current.steps,
  };
}
