// Types and constants shared by server and browser code. Keep this file free
// of imports so the browser bundle stays small.

export const INGREDIENT_GROUPS = [
  "Produce",
  "Protein",
  "Dairy",
  "Pantry",
  "Spices",
  "Other",
] as const;

export type IngredientGroup = (typeof INGREDIENT_GROUPS)[number];

export type Ingredient = {
  id: string;
  name: string;
  /** Amount for the recipe's base number of meals. null means "to taste". */
  quantity: number | null;
  unit: string | null;
  group: IngredientGroup;
};

export type Recipe = {
  id: string;
  title: string;
  baseServings: number;
  note: string | null;
  category: string | null;
  ingredients: Ingredient[];
  /** Step text. `{ingredient-id}` is replaced by that ingredient's scaled amount. */
  steps: string[];
  createdAt: Date;
};

export type NewRecipe = Omit<Recipe, "id" | "createdAt">;

/** Matches any `{...}` slot in a step. The capture is the ingredient id. */
export const SLOT_PATTERN = /\{([^{}]*)\}/g;
