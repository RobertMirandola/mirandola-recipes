"use server";

import { revalidatePath } from "next/cache";
import { reorderRecipes, setRecipeFavorite } from "@/lib/recipes";
import { requireSession } from "@/lib/session";

export async function reorderRecipesAction(
  orderedIds: string[],
  favoriteIds: string[],
): Promise<{ error: string | null }> {
  await requireSession("/");
  const result = await reorderRecipes(orderedIds, favoriteIds);
  if (!result.ok) {
    return { error: result.problems[0] ?? "That list order could not be saved." };
  }
  revalidatePath("/");
  return { error: null };
}

export async function setFavoriteAction(
  id: string,
  favorite: boolean,
): Promise<{ error: string | null }> {
  await requireSession("/");
  const result = await setRecipeFavorite(id, favorite);
  if (!result.ok) {
    return { error: result.problems[0] ?? "That recipe could not be pinned." };
  }
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  return { error: null };
}
