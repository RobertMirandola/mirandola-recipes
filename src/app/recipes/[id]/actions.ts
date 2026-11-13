"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteRecipe } from "@/lib/recipes";
import { requireSession } from "@/lib/session";

export async function deleteRecipeAction(id: string): Promise<void> {
  await requireSession("/");
  await deleteRecipe(id);
  revalidatePath("/");
  redirect("/");
}
