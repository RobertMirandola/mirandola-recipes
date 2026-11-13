import Link from "next/link";
import { listRecipes } from "@/lib/recipes";
import { requireSession } from "@/lib/session";

function mealsLabel(count: number): string {
  return count === 1 ? "1 meal" : `${count} meals`;
}

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
    <main className="mx-auto max-w-2xl px-5 pt-10 pb-16">
      <header className="mb-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Mirandola Recipes</h1>
        {recipes.length > 0 && (
          <p className="mt-1 text-muted">
            {recipes.length === 1 ? "1 recipe" : `${recipes.length} recipes`}
          </p>
        )}
      </header>

      {categories.length > 0 && (
        <nav aria-label="Filter by category" className="mb-5 flex flex-wrap gap-2">
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
        <div className="rounded-2xl border border-line bg-surface px-6 py-10 text-center">
          <h2 className="font-serif text-2xl font-semibold">No recipes yet</h2>
          <p className="mx-auto mt-3 max-w-sm text-lg text-muted">
            Finish a recipe in ChatGPT, then tell it to save the recipe to mirandola-recipes.
            It will show up here.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((recipe) => (
            <li key={recipe.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/recipes/${recipe.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent-soft"
              >
                <span>
                  <span className="block font-serif text-xl font-semibold">{recipe.title}</span>
                  <span className="mt-0.5 block text-muted">
                    {mealsLabel(recipe.baseServings)}
                    {recipe.category && (
                      <>
                        {" · "}
                        <span className="capitalize">{recipe.category}</span>
                      </>
                    )}
                  </span>
                </span>
                <span aria-hidden="true" className="text-2xl text-muted">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-4 py-2 font-medium capitalize ${
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-surface hover:bg-accent-soft"
      }`}
    >
      {label}
    </Link>
  );
}
