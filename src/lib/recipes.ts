import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { recipes } from "@/db/schema";
import type { Recipe } from "./recipe-model";
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
  | { ok: true; recipe: RecipeSummary }
  | { ok: false; problems: string[] };

/** The one write path, shared by the MCP tool and the HTTP API. */
export async function saveRecipe(input: RecipeInput): Promise<SaveRecipeResult> {
  const normalized = normalizeRecipe(input);
  if (!normalized.ok) {
    return normalized;
  }
  const db = await getDb();
  const [saved] = await db.insert(recipes).values(normalized.recipe).returning({
    id: recipes.id,
    title: recipes.title,
    category: recipes.category,
    baseServings: recipes.baseServings,
    createdAt: recipes.createdAt,
  });
  return { ok: true, recipe: saved };
}

export async function deleteRecipe(id: string): Promise<void> {
  if (!UUID_PATTERN.test(id)) {
    return;
  }
  const db = await getDb();
  await db.delete(recipes).where(eq(recipes.id, id));
}
