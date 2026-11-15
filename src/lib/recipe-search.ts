type SearchableRecipe = {
  title: string;
  category?: string | null;
  note?: string | null;
  ingredients?: readonly { name: string }[];
  steps?: readonly string[];
};

/** Text used to find a recipe by name, category, note, ingredient, or step. */
export function recipeSearchText(recipe: SearchableRecipe): string {
  return [
    recipe.title,
    recipe.category,
    recipe.note,
    ...(recipe.ingredients ?? []).map((ingredient) => ingredient.name),
    ...(recipe.steps ?? []),
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join("\n")
    .toLowerCase();
}

/** Every word in the query must appear. A blank query matches everything. */
export function matchesRecipeSearch(searchText: string, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => searchText.includes(term));
}
