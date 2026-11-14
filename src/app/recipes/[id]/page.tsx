import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import { hasSession, requireSession } from "@/lib/session";
import { RecipeView } from "./recipe-view";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!(await hasSession())) {
    return {};
  }
  const recipe = await getRecipe((await params).id);
  return recipe ? { title: recipe.title } : {};
}

export default async function RecipePage({ params }: Props) {
  const { id } = await params;
  await requireSession(`/recipes/${id}`);

  const recipe = await getRecipe(id);
  if (!recipe) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-dvh max-w-180 px-6 pt-8 pb-24 sm:px-12">
      <Link href="/" className="-mx-1 inline-block rounded px-1 py-0.5 text-sm text-muted hover:bg-hover">
        ← Recipes
      </Link>
      <RecipeView
        recipe={{
          id: recipe.id,
          title: recipe.title,
          note: recipe.note,
          category: recipe.category,
          baseServings: recipe.baseServings,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }}
      />
    </main>
  );
}
