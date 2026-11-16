import { listRecipes } from "@/lib/recipes";
import { requireSession } from "@/lib/session";
import { RecipeBrowser } from "./recipe-browser";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireSession("/");

  const recipes = await listRecipes();
  const categories = [
    ...new Set(recipes.flatMap((recipe) => (recipe.category ? [recipe.category] : []))),
  ].sort();

  const requested = (await searchParams).category;
  const activeCategory = requested && categories.includes(requested) ? requested : null;
  const shown = activeCategory
    ? recipes.filter((recipe) => recipe.category === activeCategory)
    : recipes;

  return (
    <main className="mx-auto min-h-dvh max-w-180 px-6 pt-16 pb-24 sm:px-12">
      <header className="mb-8">
        <div aria-hidden="true" className="mb-2 text-7xl leading-none">
          🍲
        </div>
        <h1 className="text-[40px] leading-[1.2] font-bold tracking-tight">Mirandola Recipes</h1>
        {recipes.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {recipes.length === 1 ? "1 recipe" : `${recipes.length} recipes`}
          </p>
        )}
      </header>

      {recipes.length === 0 ? (
        <p className="max-w-md text-base leading-relaxed text-muted">
          No recipes yet. Finish a recipe in ChatGPT, then tell it to save the recipe to
          mirandola-recipes. It will show up here.
        </p>
      ) : (
        <RecipeBrowser
          recipes={shown.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            baseServings: recipe.baseServings,
            category: recipe.category,
            favorite: recipe.favorite,
            searchText: recipe.searchText,
          }))}
          catalog={recipes.map((recipe) => ({
            id: recipe.id,
            favorite: recipe.favorite,
            sortOrder: recipe.sortOrder,
          }))}
          categories={categories}
          activeCategory={activeCategory}
        />
      )}
    </main>
  );
}
