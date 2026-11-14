import Link from "next/link";
import { listRecipes } from "@/lib/recipes";
import { requireSession } from "@/lib/session";
import { RecipeList } from "./recipe-list";

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
    <main className="mx-auto min-h-dvh max-w-[720px] px-6 pt-16 pb-24 sm:px-12">
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

      {categories.length > 0 && (
        <nav aria-label="Filter by category" className="mb-3 flex flex-wrap gap-1">
          <CategoryChip href="/" label="All" active={activeCategory === null} />
          {categories.map((category) => (
            <CategoryChip
              key={category}
              href={`/?category=${encodeURIComponent(category)}`}
              label={category}
              active={activeCategory === category}
            />
          ))}
        </nav>
      )}

      {recipes.length === 0 ? (
        <p className="max-w-md text-base leading-relaxed text-muted">
          No recipes yet. Finish a recipe in ChatGPT, then tell it to save the recipe to
          mirandola-recipes. It will show up here.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-base text-muted">No recipes in this category.</p>
      ) : (
        <RecipeList
          recipes={shown.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            baseServings: recipe.baseServings,
            category: recipe.category,
            favorite: recipe.favorite,
          }))}
          catalog={recipes.map((recipe) => ({
            id: recipe.id,
            favorite: recipe.favorite,
            sortOrder: recipe.sortOrder,
          }))}
        />
      )}
    </main>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded px-3 text-sm capitalize ${
        active ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover"
      }`}
    >
      {label}
    </Link>
  );
}
