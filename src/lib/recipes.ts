import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { recipes } from "@/db/schema";
import type { NewRecipe, Recipe } from "./recipe-model";
import {
  applyRecipePatch,
  pickRecipeMatch,
  recipeToInput,
  titleKey,
  type RecipePatch,
} from "./recipe-match";
import { normalizeRecipe, type RecipeInput } from "./recipe-schema";

export type RecipeSummary = Pick<
  Recipe,
  "id" | "title" | "category" | "baseServings" | "createdAt"
>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Newest first. */
export async function listRecipes(): Promise<RecipeSummary[]> {
  const db = await getDb();
  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      category: recipes.category,
      baseServings: recipes.baseServings,
      createdAt: recipes.createdAt,
    })
    .from(recipes)
    .orderBy(desc(recipes.createdAt));
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  if (!UUID_PATTERN.test(id)) {
    return null;
  }
  const db = await getDb();
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
  return recipe ?? null;
}

export type SaveRecipeResult =
  | { ok: true; recipe: RecipeSummary; updated: boolean }
  | { ok: false; problems: string[] };

const summaryColumns = {
  id: recipes.id,
  title: recipes.title,
  category: recipes.category,
  baseServings: recipes.baseServings,
  createdAt: recipes.createdAt,
};

async function loadRecipes(): Promise<Recipe[]> {
  const db = await getDb();
  return db.select().from(recipes).orderBy(desc(recipes.createdAt));
}

async function replaceRecipe(id: string, recipe: NewRecipe): Promise<RecipeSummary | null> {
  const db = await getDb();
  const [saved] = await db
    .update(recipes)
    .set(recipe)
    .where(eq(recipes.id, id))
    .returning(summaryColumns);
  return saved ?? null;
}

function titleTaken(existing: Recipe[], title: string, exceptId?: string): string | null {
  const key = titleKey(title);
  const other = existing.find((recipe) => recipe.id !== exceptId && titleKey(recipe.title) === key);
  return other ? other.title : null;
}

/**
 * Saves a recipe. A title that already exists, ignoring case and spacing,
 * updates that recipe instead of storing a second copy.
 */
export async function saveRecipe(input: RecipeInput): Promise<SaveRecipeResult> {
  const normalized = normalizeRecipe(input);
  if (!normalized.ok) {
    return normalized;
  }
  const existing = await loadRecipes();
  const sameTitle = existing.filter(
    (recipe) => titleKey(recipe.title) === titleKey(normalized.recipe.title),
  );
  if (sameTitle.length > 1) {
    return {
      ok: false,
      problems: [
        `More than one recipe is named "${normalized.recipe.title}". Rename one of them in the app before saving again.`,
      ],
    };
  }
  if (sameTitle.length === 1) {
    const saved = await replaceRecipe(sameTitle[0].id, normalized.recipe);
    if (!saved) {
      return { ok: false, problems: ["That recipe could not be updated."] };
    }
    return { ok: true, recipe: saved, updated: true };
  }

  const db = await getDb();
  const [saved] = await db.insert(recipes).values(normalized.recipe).returning(summaryColumns);
  return { ok: true, recipe: saved, updated: false };
}

/** Replaces one recipe, found by its id. Used by the edit form. */
export async function updateRecipe(id: string, input: RecipeInput): Promise<SaveRecipeResult> {
  if (!UUID_PATTERN.test(id)) {
    return { ok: false, problems: ["That recipe could not be found."] };
  }
  const normalized = normalizeRecipe(input);
  if (!normalized.ok) {
    return normalized;
  }
  const existing = await loadRecipes();
  if (!existing.some((recipe) => recipe.id === id)) {
    return { ok: false, problems: ["That recipe could not be found."] };
  }
  const taken = titleTaken(existing, normalized.recipe.title, id);
  if (taken) {
    return { ok: false, problems: [`Another recipe is already named "${taken}".`] };
  }
  const saved = await replaceRecipe(id, normalized.recipe);
  if (!saved) {
    return { ok: false, problems: ["That recipe could not be updated."] };
  }
  return { ok: true, recipe: saved, updated: true };
}

/**
 * Finds one recipe by id or by title, then changes only the fields on the patch.
 * A partial title is enough when it matches a single recipe.
 */
export async function updateRecipeMatch(
  query: { id?: string; title?: string },
  patch: RecipePatch,
): Promise<SaveRecipeResult> {
  const existing = await loadRecipes();
  const target = query.id
    ? existing.find((recipe) => recipe.id === query.id)
    : undefined;
  if (query.id && !target) {
    return { ok: false, problems: ["That recipe could not be found."] };
  }
  const picked = target
    ? { ok: true as const, recipe: target }
    : pickRecipeMatch(existing, query.title ?? "");
  if (!picked.ok) {
    return picked;
  }

  const parsed = normalizeRecipe(applyRecipePatch(recipeToInput(picked.recipe), patch));
  if (!parsed.ok) {
    return parsed;
  }
  const taken = titleTaken(existing, parsed.recipe.title, picked.recipe.id);
  if (taken) {
    return { ok: false, problems: [`Another recipe is already named "${taken}".`] };
  }
  const saved = await replaceRecipe(picked.recipe.id, parsed.recipe);
  if (!saved) {
    return { ok: false, problems: ["That recipe could not be updated."] };
  }
  return { ok: true, recipe: saved, updated: true };
}

/** One recipe, found the same way update_recipe finds it, including its ingredients and steps. */
export async function findRecipe(query: { id?: string; title?: string }): Promise<
  { ok: true; recipe: Recipe } | { ok: false; problems: string[] }
> {
  if (query.id) {
    const recipe = await getRecipe(query.id);
    return recipe
      ? { ok: true, recipe }
      : { ok: false, problems: ["That recipe could not be found."] };
  }
  const picked = pickRecipeMatch(await loadRecipes(), query.title ?? "");
  return picked.ok ? { ok: true, recipe: picked.recipe } : picked;
}

export async function deleteRecipe(id: string): Promise<void> {
  if (!UUID_PATTERN.test(id)) {
    return;
  }
  const db = await getDb();
  await db.delete(recipes).where(eq(recipes.id, id));
}
