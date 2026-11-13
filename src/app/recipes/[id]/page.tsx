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
    <main className="mx-auto max-w-2xl px-5 pt-6 pb-16">
      <Link href="/" className="inline-block py-2 font-medium text-accent">
        ‹ All recipes
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
