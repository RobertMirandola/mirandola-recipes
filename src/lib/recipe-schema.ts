import { z } from "zod";
import { INGREDIENT_GROUPS, SLOT_PATTERN, type NewRecipe } from "./recipe-model";

const ingredientInputSchema = z.object({
  id: z
    .string()
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, digits, and hyphens.")
    .describe(
      "Short unique slug for this ingredient, such as 'chicken' or 'olive-oil'. Steps reference it as {chicken}.",
    ),
  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe(
      "Ingredient name including any prep, without the amount. Example: 'boneless chicken thighs'.",
    ),
  quantity: z
    .number()
    .positive()
    .nullish()
    .describe(
      "Numeric amount for the base number of meals, as a decimal (0.5, 1.5, 0.33). Omit or null for 'to taste' items.",
    ),
  unit: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .describe(
      "Unit for the quantity: lb, oz, g, kg, ml, l, tsp, tbsp, cup, clove, can. Omit or null for items counted whole, such as 2 eggs.",
    ),
  group: z
    .enum(INGREDIENT_GROUPS)
    .describe("Shopping section the ingredient is listed under."),
});

/** Shape accepted by the `save_recipe` tool and `POST /api/recipes`. */
export const recipeInputSchema = z.object({
  title: z.string().trim().min(1).max(140).describe("Recipe name."),
  baseServings: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("How many meals (servings) the listed quantities make."),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .describe("Optional one or two sentence description or tip."),
  category: z
    .string()
    .trim()
    .max(40)
    .optional()
    .describe(
      "Optional main protein or style, one or two words: chicken, beef, pork, seafood, vegetarian. Reuse a category that list_recipes already shows when one fits.",
    ),
  ingredients: z.array(ingredientInputSchema).min(1).max(100),
  steps: z
    .array(z.string().trim().min(1).max(1500))
    .min(1)
    .max(60)
    .describe(
      "Ordered instructions. Write each measurement as a slot holding the ingredient id, never as a typed number: 'Season the {chicken} chicken, then sear in the {olive-oil} olive oil.' The slot is replaced with the scaled amount and unit, so follow it with the ingredient name. Times and temperatures stay as plain text.",
    ),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Checks the rules that span fields (unique ingredient ids, step slots that
 * point at real ingredients) and returns the recipe in its stored form.
 */
export function normalizeRecipe(
  input: RecipeInput,
): { ok: true; recipe: NewRecipe } | { ok: false; problems: string[] } {
  const problems: string[] = [];

  const ids = new Set<string>();
  for (const ingredient of input.ingredients) {
    if (ids.has(ingredient.id)) {
      problems.push(
        `Ingredient id "${ingredient.id}" is used more than once. Each ingredient needs its own id.`,
      );
    }
    ids.add(ingredient.id);
  }

  input.steps.forEach((step, index) => {
    for (const match of step.matchAll(SLOT_PATTERN)) {
      if (!ids.has(match[1])) {
        problems.push(
          `Step ${index + 1} uses the slot ${match[0]}, which matches no ingredient id. Ingredient ids: ${[...ids].join(", ")}.`,
        );
      }
    }
  });

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    recipe: {
      title: input.title,
      baseServings: input.baseServings,
      note: blankToNull(input.note),
      category: blankToNull(input.category)?.toLowerCase().replace(/\s+/g, " ") ?? null,
      ingredients: input.ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        quantity: ingredient.quantity ?? null,
        unit: blankToNull(ingredient.unit),
        group: ingredient.group,
      })),
      steps: input.steps,
    },
  };
}
