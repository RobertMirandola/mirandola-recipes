"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recipeInputSchema } from "@/lib/recipe-schema";
import { deleteRecipe, updateRecipe } from "@/lib/recipes";
import { requireSession } from "@/lib/session";

export async function deleteRecipeAction(id: string): Promise<void> {
  await requireSession("/");
  await deleteRecipe(id);
  revalidatePath("/");
  redirect("/");
}

export type UpdateRecipeState = { error: string | null };

export async function updateRecipeAction(
  _state: UpdateRecipeState,
  formData: FormData,
): Promise<UpdateRecipeState> {
  await requireSession("/");
  const id = String(formData.get("id") ?? "");
  let body: unknown;
  try {
    body = JSON.parse(String(formData.get("recipe") ?? ""));
  } catch {
    return { error: "That recipe could not be read. Try saving again." };
  }

  const parsed = recipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .slice(0, 3)
        .map((issue) => issue.message)
        .join(" "),
    };
  }

  const result = await updateRecipe(id, parsed.data);
  if (!result.ok) {
    return { error: result.problems.join(" ") };
  }

  revalidatePath("/");
  revalidatePath(`/recipes/${result.recipe.id}`);
  redirect(`/recipes/${result.recipe.id}`);
}
