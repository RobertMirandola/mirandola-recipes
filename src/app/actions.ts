"use server";

import { revalidatePath } from "next/cache";
import { reorderRecipes } from "@/lib/recipes";
import { requireSession } from "@/lib/session";

export async function reorderRecipesAction(
  orderedIds: string[],
): Promise<{ error: string | null }> {
  await requireSession("/");
  const result = await reorderRecipes(orderedIds);
  if (!result.ok) {
    return { error: result.problems[0] ?? "That list order could not be saved." };
  }
  revalidatePath("/");
  return { error: null };
}
